import { DataCols, TableCols, RAMeasureTypeCode } from "../constants.js";
import { Translation, SetTools } from "../tools.js";


// BaseDataLoader: The interface for retrieving the data used by the backend
// Note:
// - All the data retrieval functions are async, so that the data can come from either the CSV files or the API
export class BaseDataLoader {
    constructor(backend) {
        this.backend = backend;

        // protected: the table of all the foods (with their food groups and food sources)
        this._foodTable;
    }

    // getFoodTable(): Retrieves the table of all the foods
    async getFoodTable() {
        return this._foodTable;
    }

    // load(): Load any necessary data at startup
    async load() {

    }

    // notImplemented(funcName): Throws an error for a function that the subclass needs to implement
    notImplemented(funcName) {
        throw new Error(`${this.constructor.name}.${funcName} is not implemented`);
    }

    // loadCSV(file): Loads the table and its columns from a CSV file
    async loadCSV(file) {
        const data = await d3.csv(file);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        return {data, columns};
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

    assertFoodCodeIndUnique(index, val) {
        if (index[val] !== undefined) {
            throw new TypeError("Food Code is not unique!");
        }
    }

    // setupFoodRow(row): Sets up a row of the food table for searching (the search orders and the tokenized food descriptions)
    setupFoodRow(row) {
        row[TableCols.FoodNameOrder] = Infinity;
        row[TableCols.FoodAltNameOrder] = Infinity;

        // tokenize the food descriptions for searching
        row[Translation.getDataCol(TableCols.FoodDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodDescription)]);
        row[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodAltDescription)]);
        return row;
    }

    // setupFoodTableIndices(foodTable): Sets up the food code index of the food table
    //  and tokenizes the food descriptions for searching
    setupFoodTableIndices(foodTable) {
        const foodTableData = foodTable.data;

        const foodCodeIndex = {};
        foodTable.indices = {[DataCols.FoodCode]: foodCodeIndex};

        const foodTableLen = foodTableData.length;
        for (let i = 0; i < foodTableLen; ++i) {
            const row = foodTableData[i];
            const indexVal = row[DataCols.FoodCode]
            this.assertFoodCodeIndUnique(foodCodeIndex, indexVal);
            foodCodeIndex[indexVal] = new Set([i]);

            this.setupFoodRow(row);
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

    // ----- Selections for the dropdowns -----

    // getFoodGroups(): Retrieves the food group selections ({text, value})
    async getFoodGroups() {
        this.notImplemented("getFoodGroups");
    }

    // getFoodNames(): Retrieves the food name selections ({text, value, ...})
    async getFoodNames() {
        this.notImplemented("getFoodNames");
    }

    // getNutrients(): Retrieves the nutrient selections ({text, value}), sorted by their name
    async getNutrients() {
        this.notImplemented("getNutrients");
    }

    // getHighlightedNutrientNames(): Retrieves the names (with units) of the nutrients to highlight in the tables
    async getHighlightedNutrientNames() {
        this.notImplemented("getHighlightedNutrientNames");
    }

    // ----- Foods -----
    // Note: These functions use the food table, since the food table has the tokenized food descriptions needed for searching

    // getFoodByCode(foodCode): Retrieves the food with the food code. Returns undefined if the food is not found
    async getFoodByCode(foodCode) {
        const foodTable = await this.getFoodTable();
        return this.getRowById(foodTable, DataCols.FoodCode, foodCode);
    }

    // getFoodNamesByCodes(foodCodes): Retrieves the food names for the food codes
    async getFoodNamesByCodes(foodCodes) {
        const foodTable = await this.getFoodTable();
        return this.getRowsByIds(foodTable, DataCols.FoodCode, foodCodes);
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
        this.notImplemented("getMeasureWeightConvByFoodCode");
    }

    // getRAMeasureWeightConvByFoodCodes(foodCodes): Retrieves the reference amount (RA) measure weight conversions for the foods
    async getRAMeasureWeightConvByFoodCodes(foodCodes) {
        this.notImplemented("getRAMeasureWeightConvByFoodCodes");
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
        this.notImplemented("getNutrientByCode");
    }

    // getNutrientNamesByCodes(nutrientCodes): Retrieves the nutrient name data for the nutrient codes
    async getNutrientNamesByCodes(nutrientCodes) {
        this.notImplemented("getNutrientNamesByCodes");
    }

    // getNutrientsByFoodCode(foodCode): Retrieves the nutrient amounts for the food. Returns undefined if not found
    async getNutrientsByFoodCode(foodCode) {
        this.notImplemented("getNutrientsByFoodCode");
    }

    // filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode): Retrieves the nutrient amounts of a nutrient,
    //  for the foods in the food group/with the food code (an empty string means to not filter by that code)
    async filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode) {
        this.notImplemented("filterNutrientSearchTable");
    }

    // filterCompareFoodTable(foodCodes): Retrieves the nutrient amounts for the foods
    async filterCompareFoodTable(foodCodes) {
        this.notImplemented("filterCompareFoodTable");
    }

    // filterCompareNutrientTable(nutrientCodes, foodGroupCode): Retrieves the nutrient amounts for the nutrients,
    //  for the foods in the food group
    async filterCompareNutrientTable(nutrientCodes, foodGroupCode) {
        this.notImplemented("filterCompareNutrientTable");
    }
};
