import { DataCols, TableCols, RAMeasureTypeCode, HighlightedNutrientCodes } from "../constants.js";
import { Translation, SetTools, ListTools, DictTools, LazyTable } from "../tools.js";
import { Model } from "../backend.js";


// BaseDataLoader: Base class to retrieve data from the backend
export class BaseDataLoader {
    static MaxFoodsForFoodMeasures = 50;

    constructor(backend) {
        this.backend = backend;

        // the requests that read the CSV files, so that each CSV file is only read once
        this._csvRequests = new Map();

        // protected: the tables, created by the subclasses (see the notes above)
        this._foodTable;
        this._foodGroupTable;
        this._foodSourceTable;
        this._nutrientNameTable;
        this._nutrientSourceTable;
        this._nutrientTable;
        this._measureConvTables = [];
        this._raMeasureConvTable;
    }

    // load(): Load any necessary data at startup
    async load() {

    }

    // tokenizeFoodDescription(foodDescription): Split the food description name into different tokens
    tokenizeFoodDescription(foodDescription) {
        if (foodDescription === "") return [];

        const result = foodDescription.toLowerCase().split(",");
        let resultLen = result.length;
        let i = 0;

        while (i < resultLen) {
            const keywords = result[i].trim().split(" ");
            const keywordsLen = keywords.length;

            result.splice(i, 1, ...keywords);

            i += keywordsLen;
            resultLen += keywordsLen - 1;
        }

        return result;
    }

    // ----- Indices of the tables -----

    // addIndexVal(row, rowInd, indices, getIndexVal): Adds an index key to some table's indices
    addIndexVal(row, rowInd, indices, getIndexVal) {
        const indexVal = getIndexVal(row);
        const indexBucket = indices[indexVal];

        if (indexBucket === undefined) {
            indices[indexVal] = new Set([rowInd]);
        } else {
            indexBucket.add(rowInd);
        }
    }

    // createIndexedTable(data, indexCols): Creates a table with a hash table index ({value: Set of row indices})
    //  for each column in 'indexCols'
    createIndexedTable(data, indexCols) {
        const table = {data: [], columns: (data.length > 0) ? Object.keys(data[0]) : [], indices: {}};
        for (const col of indexCols) {
            table.indices[col] = {};
        }

        this.addIndexedRows(table, data);
        return table;
    }

    // addIndexedRows(table, rows): Adds rows to a table created by 'createIndexedTable' and updates its indices
    addIndexedRows(table, rows) {
        for (const row of rows) {
            const rowInd = table.data.length;
            table.data.push(row);

            for (const col in table.indices) {
                this.addIndexVal(row, rowInd, table.indices[col], (indexedRow) => indexedRow[col]);
            }
        }
    }

    // ----- Retrieving rows from the indices of the tables -----

    getRowById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined || rowInds.size == 0) return;
        return table.data[SetTools.getFirst(rowInds)];
    }

    getRowsById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined) return;
        return [...rowInds].map((ind) => table.data[ind]);
    }

    getRowsByIds(table, indexName, ids) {
        const indices = table.indices[indexName];
        ids = new Set(ids);
        let result = new Set();

        for (const id of ids) {
            const rowInds = indices[id];
            if (rowInds === undefined) continue;
            SetTools.union(result, rowInds);
        }

        return [...result].map((ind) => table.data[ind]);
    }

    getRowsByManyIds(table, indexData) {
        let result = null;

        for (const indexName in indexData) {
            const currentResult = new Set();
            const indices = table.indices[indexName];
            let ids = new Set(indexData[indexName]);

            for (const id of ids) {
                const rowInds = indices[id];
                if (rowInds === undefined) continue;

                SetTools.union(currentResult, rowInds);
            }

            result = (result === null) ? currentResult : SetTools.intersection(result, currentResult);
        }

        return [...result].map((ind) => table.data[ind]);
    }

    // ----- CSV files -----

    // loadCSV(file): Loads the table and its columns from a CSV file
    async loadCSV(file) {
        const data = await d3.csv(file);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        return {data, columns};
    }

    // getCSVRows(file): Retrieves the rows of a CSV file. The CSV file is only read the first time it is needed
    async getCSVRows(file) {
        if (!this._csvRequests.has(file)) {
            const request = this.loadCSV(file)
                .then((table) => table.data)
                .catch((error) => {
                    this._csvRequests.delete(file);
                    throw error;
                });

            this._csvRequests.set(file, request);
        }

        return await this._csvRequests.get(file);
    }

    // filterCSVRows(files, keyCol, keys): Retrieves the rows of some CSV files whose 'keyCol' column is one of 'keys'
    //  (all the rows if 'keyCol' is null). The rows are in the order of the files
    async filterCSVRows(files, keyCol, keys) {
        files = Array.isArray(files) ? files : [files];
        const rows = (await Promise.all(files.map((file) => this.getCSVRows(file)))).flat();
        if (keyCol === null) return rows;

        keys = new Set(Array.from(keys).map((key) => String(key)));
        return rows.filter((row) => keys.has(String(row[keyCol])));
    }

    // createCSVTable(files, keyCols, getRowId): Creates a LazyTable whose rows come from some CSV files
    createCSVTable(files, keyCols, getRowId = (row) => row[keyCols[0]]) {
        return new LazyTable(this, keyCols, getRowId, (keyCol, keys) => this.filterCSVRows(files, keyCol, keys));
    }

    // ----- Setting up the rows of the tables -----

    // setupFoodRow(row): Sets up a row of the food table for searching (the search orders and the tokenized food descriptions)
    setupFoodRow(row) {
        row[TableCols.FoodNameOrder] = Infinity;
        row[TableCols.FoodAltNameOrder] = Infinity;

        // tokenize the food descriptions for searching
        row[Translation.getDataCol(TableCols.FoodDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodDescription)]);
        row[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodAltDescription)]);
        return row;
    }

    // setupFoodRows(rows): Adds the food groups and food sources to the rows of the foods, then sets up the rows for searching
    async setupFoodRows(rows) {
        await Promise.all([
            this._foodGroupTable.load(DataCols.FoodGroupCode, rows.map((row) => row[DataCols.FoodGroupCode])),
            this._foodSourceTable.load(DataCols.FoodSourceCode, rows.map((row) => row[DataCols.FoodSourceCode]))
        ]);

        const foodGroupTable = this._foodGroupTable.table;
        const foodSourceTable = this._foodSourceTable.table;

        return rows.map((row) => this.setupFoodRow(DictTools.combine([
            row,
            this.getRowById(foodGroupTable, DataCols.FoodGroupCode, row[DataCols.FoodGroupCode]) ?? {},
            this.getRowById(foodSourceTable, DataCols.FoodSourceCode, row[DataCols.FoodSourceCode]) ?? {}
        ])));
    }

    // setupNutrientNameRows(rows): Sets the nutrient name (without the unit) of the nutrient name rows
    setupNutrientNameRows(rows) {
        const nutrientNameCol = Translation.getDataCol(DataCols.NutrientName);
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);

        for (const row of rows) {
            row[nutrientNameCol] = Model.getNutrientName(row[nutrientNameWithUnitCol]);
        }

        return rows;
    }

    // setupMeasureConvRows(rows): Adds the ids of the measure weight conversions and removes the duplicate conversions
    setupMeasureConvRows(rows) {
        return ListTools.getUnique(rows, (row) => {
            const result = Model.getMeasureWeightConvIdFromRow(row);
            row[TableCols.MeasureWeightConvId] = result;
            return result;
        });
    }

    // joinNutrientAmountRows(rows): Joins the nutrient amounts with the nutrient names, nutrient sources and foods
    async joinNutrientAmountRows(rows) {
        // retrieve the foods, nutrient names and nutrient sources of the rows that are not cached yet
        await Promise.all([
            this._foodTable.load(DataCols.FoodCode, rows.map((row) => row[DataCols.FoodCode])),
            this._nutrientNameTable.load(DataCols.NutrientCode, rows.map((row) => row[DataCols.NutrientCode])),
            this._nutrientSourceTable.load(DataCols.NutrientSrcCode, rows.map((row) => row[DataCols.NutrientSrcCode]))
        ]);

        const foodTable = this._foodTable.table;
        const nutrientNameTable = this._nutrientNameTable.table;
        const nutrientSourceTable = this._nutrientSourceTable.table;

        return rows.map((row) => DictTools.combine([
            row,
            this.getRowById(nutrientNameTable, DataCols.NutrientCode, row[DataCols.NutrientCode]) ?? {},
            this.getRowById(nutrientSourceTable, DataCols.NutrientSrcCode, row[DataCols.NutrientSrcCode]) ?? {},
            this.getRowById(foodTable, DataCols.FoodCode, row[DataCols.FoodCode]) ?? {}
        ]));
    }

    // ----- Selections for the dropdowns -----

    // getFoodGroups(): Retrieves the food group selections ({text, value})
    async getFoodGroups() {
        const foodGroups = await this._foodGroupTable.getAllRows();
        let result = foodGroups.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodGroupDescription)], value: row[DataCols.FoodGroupCode]}});
        result.push({text: Translation.translate("NoneSelected"), value: ""});
        return result;
    }

    // getFoodNames(): Retrieves the food name selections ({text, value, ...})
    async getFoodNames() {
        const foodTable = await this.getFoodTable();
        const foodDescriptionCol = Translation.getDataCol(DataCols.FoodDescription);
        return foodTable.data.map((row) => { return {text: row[foodDescriptionCol], value: row[DataCols.FoodCode], exactMatchCount: 0, prefixedMatchCount: 0, startInd: Infinity}});
    }

    // getNutrients(): Retrieves the nutrient selections ({text, value}), sorted by their name
    async getNutrients() {
        const nutrientNames = await this._nutrientNameTable.getAllRows();
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        const result = nutrientNames.map((row) => { return {text: row[nutrientNameWithUnitCol], value: row[DataCols.NutrientCode]}});

        // sort from the client side to sort properly special characters like "é"
        result.sort((a, b) => a.text.localeCompare(b.text));
        return result;
    }

    // getHighlightedNutrientNames(): Retrieves the names (with units) of the nutrients to highlight in the tables
    async getHighlightedNutrientNames() {
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        const rows = await this._nutrientNameTable.getRows(DataCols.NutrientCode, HighlightedNutrientCodes);
        return new Set(rows.map((row) => row[nutrientNameWithUnitCol]));
    }

    // ----- Foods -----

    // getFoodTable(): Retrieves the table of all the foods (with its food code index)
    // Note: The whole food table is needed for searching the foods by their names (the food descriptions are tokenized)
    async getFoodTable() {
        await this._foodTable.getAllRows();
        return this._foodTable.table;
    }

    // getFoodByCode(foodCode): Retrieves the food with the food code. Returns undefined if the food is not found
    async getFoodByCode(foodCode) {
        const rows = await this._foodTable.getRows(DataCols.FoodCode, [foodCode]);
        return rows[0];
    }

    // getFoodNamesByCodes(foodCodes): Retrieves the food names for the food codes
    async getFoodNamesByCodes(foodCodes) {
        return await this._foodTable.getRows(DataCols.FoodCode, foodCodes);
    }

    // filterFoodSearchTableByCodes(foodGroupCode, foodCode): Retrieves the foods that match the food group code and the food code
    //  (an empty string for a code means to not filter by that code)
    async filterFoodSearchTableByCodes(foodGroupCode, foodCode) {
        const foodTable = await this.getFoodTable();
        let result = foodTable.data;

        if (foodCode != "") {
            const row = this.getRowById(foodTable, DataCols.FoodCode, foodCode);
            if (row === undefined) return [];
            result = [row];
        }

        if (foodGroupCode != "") {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        return result;
    }

    // ----- Measures -----

    // getMeasureWeightConvByFoodCode(foodCode): Retrieves the measure weight conversions for the food.
    //  Returns undefined if the food has no conversions
    async getMeasureWeightConvByFoodCode(foodCode) {
        const rowLists = await Promise.all(this._measureConvTables.map((table) => table.getRows(DataCols.FoodCode, [foodCode])));

        const result = ListTools.getUnique(rowLists.flat(), (row) => row[TableCols.MeasureWeightConvId]);
        return (result.length == 0) ? undefined : result;
    }

    // getRAMeasureWeightConvByFoodCodes(foodCodes): Retrieves the reference amount (RA) measure weight conversions for the foods
    async getRAMeasureWeightConvByFoodCodes(foodCodes) {
        foodCodes = Array.from(foodCodes);
        const allRALoaded = this._raMeasureConvTable.loadedKeys[DataCols.MeasureTypeCode].has(RAMeasureTypeCode);

        // for a few foods (eg. the food selected in the search table), use the measures of the foods instead of retrieving
        //  all the RA measures, since the measures of the foods are usually already cached by the food's nutrient stats
        if (!allRALoaded && foodCodes.length <= BaseDataLoader.MaxFoodsForFoodMeasures) {
            const rows = await this._raMeasureConvTable.getRows(DataCols.FoodCode, foodCodes);
            return rows.filter((row) => row[DataCols.MeasureTypeCode] == RAMeasureTypeCode);
        }

        return await this._raMeasureConvTable.getRows(DataCols.MeasureTypeCode, [RAMeasureTypeCode], {[DataCols.FoodCode]: foodCodes});
    }

    // getFoodMeasureWeightConv(foodCode, measureCodes): Retrieves the measure weight conversions for the food, including
    //  the default 100g measure. If 'measureCodes' is given, only the conversions for those measures are kept.
    //  For measures with the same name, the reference amount (RA) conversion is kept
    async getFoodMeasureWeightConv(foodCode, measureCodes = null) {
        let measureWeightConv = await this.getMeasureWeightConvByFoodCode(foodCode);
        if (measureWeightConv == undefined) return;

        measureWeightConv = [...measureWeightConv];
        this.backend.add100gMeasureWeightConv(measureWeightConv);
        if (measureCodes !== null) {
            measureWeightConv = measureWeightConv.filter((row) => measureCodes.has(row[DataCols.MeasureCode]));
        }

        const result = {};
        for (const conv of measureWeightConv) {
            const measureName = conv[Translation.getDataCol(DataCols.MeasureDescription)];
            const currentConv = result[measureName];

            if (currentConv == undefined || currentConv[DataCols.MeasureTypeCode] != RAMeasureTypeCode) {
                result[measureName] = conv;
            }
        }

        return Object.values(result);
    }

    // ----- Nutrients -----

    // getNutrientByCode(nutrientCode): Retrieves the nutrient name data for the nutrient code. Returns undefined if not found
    async getNutrientByCode(nutrientCode) {
        const rows = await this._nutrientNameTable.getRows(DataCols.NutrientCode, [nutrientCode]);
        return rows[0];
    }

    // getNutrientNamesByCodes(nutrientCodes): Retrieves the nutrient name data for the nutrient codes
    async getNutrientNamesByCodes(nutrientCodes) {
        return await this._nutrientNameTable.getRows(DataCols.NutrientCode, nutrientCodes);
    }

    // getNutrientRows(keyCol, keys, foodGroupCode): Retrieves the rows of the nutrient table for some food codes or nutrient codes
    //  ('keyCol'), only for the foods in the food group (an empty string means to not filter by the food group)
    async getNutrientRows(keyCol, keys, foodGroupCode = "") {
        const filters = (foodGroupCode == "") ? {} : {[DataCols.FoodGroupCode]: [foodGroupCode]};
        return await this._nutrientTable.getRows(keyCol, keys, filters);
    }

    // getNutrientsByFoodCode(foodCode): Retrieves the nutrient amounts for the food. Returns undefined if not found
    async getNutrientsByFoodCode(foodCode) {
        const result = await this.getNutrientRows(DataCols.FoodCode, [foodCode]);
        return (result.length == 0) ? undefined : result;
    }

    // filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode): Retrieves the nutrient amounts of a nutrient,
    //  for the foods in the food group/with the food code (an empty string means to not filter by that code)
    async filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode) {
        if (nutrientCode == "") return [];

        // the food's rows are cached when the food is selected, so they are used instead of all the rows of the nutrient
        if (foodCode != "") {
            const foodRows = await this.getNutrientRows(DataCols.FoodCode, [foodCode], foodGroupCode);
            return foodRows.filter((row) => row[DataCols.NutrientCode] == nutrientCode);
        }

        return await this.getNutrientRows(DataCols.NutrientCode, [nutrientCode], foodGroupCode);
    }

    // filterCompareFoodTable(foodCodes): Retrieves the nutrient amounts for the foods
    async filterCompareFoodTable(foodCodes) {
        if (foodCodes.length <= 0) return [];
        return await this.getNutrientRows(DataCols.FoodCode, foodCodes);
    }

    // filterCompareNutrientTable(nutrientCodes, foodGroupCode): Retrieves the nutrient amounts for the nutrients,
    //  for the foods in the food group
    async filterCompareNutrientTable(nutrientCodes, foodGroupCode) {
        const foodGroupEmpty = foodGroupCode == "";
        const nutrientCodesEmpty = nutrientCodes.length <= 0;
        if (foodGroupEmpty && nutrientCodesEmpty) return [];

        // with only a food group, the compare table only lists the foods in the food group (no nutrient amounts are shown),
        //  so the foods come from the food table instead of the nutrient amounts of all the foods in the food group
        if (nutrientCodesEmpty) {
            return await this.filterFoodSearchTableByCodes(foodGroupCode, "");
        }

        return await this.getNutrientRows(DataCols.NutrientCode, nutrientCodes, foodGroupCode);
    }
};
