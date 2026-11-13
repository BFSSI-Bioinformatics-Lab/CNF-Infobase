import { BaseDataLoader } from "./baseDataLoader.js";
import { DataCols, TableCols, APITableNames, APIDataCols, HighlightedNutrientCodes, RAMeasureTypeCode } from "../constants.js";
import { Translation, ListTools, SQLTools, EnvTools, DictTools } from "../tools.js";
import { Model } from "../backend.js";


// BackendAPIGateway: The API gateway to the backend data
class BackendAPIGateway {
    constructor(apiURL) {
        this.apiURL = apiURL;
    }

    // getData(query): Retrieves the rows for some SQL query
    async getData(query) {
        const url = new URL(`${this.apiURL}/query`);
        url.searchParams.append("q", query);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Unable to fetch data. HTTP Status: ${response.status}`);

        const result = await response.json();
        if (!Array.isArray(result)) throw new Error(`Unable to fetch data. API error: ${result?.error}. Query: ${query}`);

        return result;
    }

    // getTables(): Retrieves the tables
    async getTables() {
        const url = new URL(this.apiURL);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Unable to read table. HTTP Status: ${response.status}`);

        return response.json();
    }
}


// LazyTable: A cached table whose rows are only retrieved the first time they are needed
// Note:
// - The rows are retrieved by the values of some key columns (eg. by food code), then added to the table
// - The table has a hash table index for each key column (see BaseDataLoader.createIndexedTable)
class LazyTable {
    // constructor(loader, keyCols, getRowId, retrieveRows):
    // - loader: the data loader that owns the table
    // - keyCols: the columns that the rows can be retrieved by
    // - getRowId(row): the id of a row, so that the same row is not added twice
    // - retrieveRows(keyCol, keys): retrieves the rows whose 'keyCol' column is one of 'keys'
    //   (if 'keyCol' is null, retrieves all the rows)
    constructor(loader, keyCols, getRowId, retrieveRows) {
        this.loader = loader;
        this.getRowId = getRowId;
        this.retrieveRows = retrieveRows;

        this.table = loader.createIndexedTable([], keyCols);

        // the keys whose rows are all in the table, and the requests that are retrieving the rows of some keys
        this.loadedKeys = Object.fromEntries(keyCols.map((col) => [col, new Set()]));
        this.requests = Object.fromEntries(keyCols.map((col) => [col, new Map()]));

        // the rows in the table by their ids, so that the same row is not added twice
        this.rowsById = new Map();

        // whether all the rows are in the table, and the request that is retrieving all the rows
        this.allLoaded = false;
        this.allRowsRequest;
    }

    // getAllRows(): Retrieves all the rows of the table
    async getAllRows() {
        if (this.allLoaded) return this.table.data;

        if (this.allRowsRequest === undefined) {
            this.allRowsRequest = this.retrieveRows(null, null)
                .then((rows) => {
                    this.addRows(rows);

                    // rebuild the table in the same order as the retrieved rows, since the rows that were retrieved
                    //  by key before are in the order that they were needed
                    const orderedRowIds = new Set(rows.map((row) => this.getRowId(row)));
                    const orderedRows = Array.from(orderedRowIds).map((rowId) => this.rowsById.get(rowId));
                    this.table = this.loader.createIndexedTable(orderedRows, Object.keys(this.table.indices));

                    this.allLoaded = true;
                })
                .finally(() => { this.allRowsRequest = undefined; });
        }

        await this.allRowsRequest;
        return this.table.data;
    }

    // load(keyCol, keys): Retrieves the rows for the keys whose rows are not in the table yet
    async load(keyCol, keys) {
        // all the rows are in the table, or are being retrieved
        if (this.allLoaded) return;
        if (this.allRowsRequest !== undefined) {
            await this.allRowsRequest;
            return;
        }

        const loadedKeys = this.loadedKeys[keyCol];
        const requests = this.requests[keyCol];

        keys = Array.from(new Set(keys));
        const missingKeys = keys.filter((key) => !loadedKeys.has(key) && !requests.has(key));

        if (missingKeys.length > 0) {
            const request = this.retrieveRows(keyCol, missingKeys)
                .then((rows) => {
                    this.addRows(rows);
                    missingKeys.forEach((key) => loadedKeys.add(key));
                })
                .finally(() => missingKeys.forEach((key) => requests.delete(key)));

            missingKeys.forEach((key) => requests.set(key, request));
        }

        // wait for the rows of all the keys, including the rows that other searches are already retrieving
        const pendingRequests = new Set(keys.map((key) => requests.get(key)).filter((request) => request !== undefined));
        await Promise.all(pendingRequests);
    }

    // addRows(rows): Adds the rows that are not already in the table
    addRows(rows) {
        const newRows = rows.filter((row) => {
            const rowId = this.getRowId(row);
            if (this.rowsById.has(rowId)) return false;

            this.rowsById.set(rowId, row);
            return true;
        });

        this.loader.addIndexedRows(this.table, newRows);
    }

    // getRows(keyCol, keys, filters): Retrieves the rows whose 'keyCol' column is one of 'keys', and that also match
    //  the other key columns in 'filters' ({keyCol: values})
    async getRows(keyCol, keys, filters = {}) {
        await this.load(keyCol, keys);
        return this.loader.getRowsByManyIds(this.table, {[keyCol]: keys, ...filters});
    }
}


// APIDataLoader: Retrieves the data from the backend API
// Note:
// - The API does not have all the tables yet, so the following tables still come from the CSV files:
//   * the food groups (CNF_Food_Group.csv)
//   * the food sources (Food_Source.csv)
//   * the measure weight conversions and measure names that are not reference amounts (RA)
//     (Measure_Weight_Conversion.csv and Measure_Name.csv)
//   The API's measure tables only have the RA measures
//
// - The tables are retrieved from the API the first time they are needed, then cached with their indices:
//   * the food table (the food descriptions need to be tokenized for searching)
//   * the nutrient names and the nutrient sources (LazyTables): retrieved by nutrient code / nutrient source code,
//     or all at once (eg. all the nutrient names are needed for the nutrient dropdowns)
//   * the nutrient table (a LazyTable): the whole nutrient table is too big to retrieve (565,409 rows), so its rows are
//     retrieved by food code or by nutrient code, the first time they are needed. The rows are joined
//     with the other cached tables in the browser instead of in the API
//   * the measure weight conversions from the API (a LazyTable): retrieved by food code or by measure type (eg. the RA measures)
//
// - The tables from the CSV files (LazyTables) are also only loaded the first time they are needed: each CSV file
//   is read once, then the rows for the needed keys are added to the table
export class APIDataLoader extends BaseDataLoader {
    // the most foods whose RA measures are retrieved by food code instead of retrieving all the RA measures
    //  (the API's server does not accept URLs with much more than 100 food codes)
    static MaxFoodsForFoodMeasures = 50;

    constructor(backend) {
        super(backend);
        this.api = new BackendAPIGateway(undefined);

        // the requests that read the CSV files, so that each CSV file is only read once
        this._csvRequests = new Map();

        this._csvFoodGroupTable = new LazyTable(this,
            [DataCols.FoodGroupCode],
            (row) => row[DataCols.FoodGroupCode],
            (keyCol, keys) => this.filterCSVRows(`data/CNF_Food_Group.csv`, keyCol, keys));

        this._csvFoodSourceTable = new LazyTable(this,
            [DataCols.FoodSourceCode],
            (row) => row[DataCols.FoodSourceCode],
            (keyCol, keys) => this.filterCSVRows(`data/Food_Source.csv`, keyCol, keys));

        this._csvMeasureNameTable = new LazyTable(this,
            [DataCols.MeasureCode],
            (row) => row[DataCols.MeasureCode],
            (keyCol, keys) => this.filterCSVRows(`data/Measure_Name.csv`, keyCol, keys));

        this._csvMeasureConvTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[TableCols.MeasureWeightConvId],
            async (keyCol, keys) => {
                const rows = await this.filterCSVRows(`data/Measure_Weight_Conversion.csv`, keyCol, keys);
                return this.setupMeasureConvRows(await this.addCSVMeasureNames(rows));
            });

        this._foodTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[DataCols.FoodCode],
            async (keyCol, keys) => {
                const rows = await this.api.getData(
                    `SELECT f.* FROM ${APITableNames.FoodName} f
                     ${SQLTools.sqlWhere((keyCol === null) ? [] : [`f.${keyCol} IN ${SQLTools.sqlList(keys)}`])}`);

                return (await this.addFoodGroupsAndSources(rows)).map((row) => this.setupFoodRow(row));
            });

        this._nutrientNameTable = new LazyTable(this,
            [DataCols.NutrientCode],
            (row) => row[DataCols.NutrientCode],
            (keyCol, keys) => this.queryNutrientNameRows((keyCol === null) ? [] : [`g.${keyCol} IN ${SQLTools.sqlList(keys)}`]));

        this._nutrientSourceTable = new LazyTable(this,
            [DataCols.NutrientSrcCode],
            (row) => row[DataCols.NutrientSrcCode],
            (keyCol, keys) => this.api.getData(
                `SELECT s.* FROM ${APITableNames.NutrientSource} s
                 ${SQLTools.sqlWhere((keyCol === null) ? [] : [`s.${keyCol} IN ${SQLTools.sqlList(keys)}`])}`));

        this._nutrientTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.NutrientCode, DataCols.FoodGroupCode],
            (row) => `${row[DataCols.FoodCode]}_${row[DataCols.NutrientCode]}`,
            (keyCol, keys) => this.queryNutrientAmountRows([`a.${keyCol} IN ${SQLTools.sqlList(keys)}`]));

        this._measureConvTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.MeasureTypeCode],
            (row) => row[TableCols.MeasureWeightConvId],
            (keyCol, keys) => this.queryMeasureConvRows([`w.${keyCol} IN ${SQLTools.sqlList(keys)}`]));
    }

    // load(): Sets the URL of the API (the tables are only loaded the first time they are needed)
    async load() {
        if (this.api.apiURL === undefined) {
            const env = await EnvTools.load();
            this.api.apiURL = env.BackendAPIURL;
        }

        if (!this.api.apiURL) throw new Error("The URL of the API is not set. Set 'BackendAPIURL' in env.js");
    }

    // ----- Building the queries -----

    // selectLangCols(tableAlias, col, apiCol): Selects some column in the language of the page and in the other language
    //  (the other language is needed for things like the food's alternate name). If the column has a different
    //  name in the API ('apiCol'), the column is renamed to the name used by the app ('col')
    selectLangCols(tableAlias, col, apiCol = col) {
        return [false, true].map((altLang) => {
            const appCol = Translation.getDataCol(col, altLang);
            if (apiCol == col) return `${tableAlias}.${appCol}`;

            const langCode = (altLang) ? Translation.getAltLangCode(true) : Translation.getLangCode(true);
            return `${tableAlias}.${apiCol}${langCode} AS "${appCol}"`;
        });
    }

    // selectNutrientGroupCols(tableAlias): Selects the columns from the nutrient grouping table,
    //  renamed to the column names used by the app
    selectNutrientGroupCols(tableAlias) {
        return [
            `${tableAlias}.${DataCols.NutrientCode}`,
            ...this.selectLangCols(tableAlias, DataCols.NutrientGroup),
            ...this.selectLangCols(tableAlias, DataCols.NutrientName),
            ...this.selectLangCols(tableAlias, DataCols.NutrientNameWithUnit, APIDataCols.NutrientNameWithUnit),
            `${tableAlias}.${APIDataCols.NutrientShortUnit} AS "${DataCols.NutrientShortUnit}"`,
            `${tableAlias}.${APIDataCols.NutrientOrder} AS "${DataCols.NutrientOrder}"`
        ];
    }

    // ----- Tables from the CSV files -----

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

    // filterCSVRows(file, keyCol, keys): Retrieves the rows of a CSV file whose 'keyCol' column is one of 'keys'
    //  (all the rows if 'keyCol' is null). Used to retrieve the rows of the LazyTables that come from CSV files
    async filterCSVRows(file, keyCol, keys) {
        const rows = await this.getCSVRows(file);
        if (keyCol === null) return rows;

        keys = new Set(Array.from(keys).map((key) => String(key)));
        return rows.filter((row) => keys.has(String(row[keyCol])));
    }

    // addCSVMeasureNames(rows): Adds the measure names from the CSV file to the measure weight conversions
    async addCSVMeasureNames(rows) {
        await this._csvMeasureNameTable.load(DataCols.MeasureCode, rows.map((row) => row[DataCols.MeasureCode]));

        const measureNameTable = this._csvMeasureNameTable.table;
        return rows.map((row) => DictTools.combine([row, this.getRowById(measureNameTable, DataCols.MeasureCode, row[DataCols.MeasureCode]) ?? {}]));
    }

    // addFoodGroupsAndSources(rows): Adds the food group and food source descriptions from the CSV files to the rows
    async addFoodGroupsAndSources(rows) {
        await Promise.all([
            this._csvFoodGroupTable.load(DataCols.FoodGroupCode, rows.map((row) => row[DataCols.FoodGroupCode])),
            this._csvFoodSourceTable.load(DataCols.FoodSourceCode, rows.map((row) => row[DataCols.FoodSourceCode]))
        ]);

        const foodGroupTable = this._csvFoodGroupTable.table;
        const foodSourceTable = this._csvFoodSourceTable.table;

        return rows.map((row) => DictTools.combine([
            row,
            this.getRowById(foodGroupTable, DataCols.FoodGroupCode, row[DataCols.FoodGroupCode]) ?? {},
            this.getRowById(foodSourceTable, DataCols.FoodSourceCode, row[DataCols.FoodSourceCode]) ?? {}
        ]));
    }

    // setupMeasureConvRows(rows): Adds the ids of the measure weight conversions and removes the duplicate conversions
    setupMeasureConvRows(rows) {
        return ListTools.getUnique(rows, (row) => {
            const result = Model.getMeasureWeightConvIdFromRow(row);
            row[TableCols.MeasureWeightConvId] = result;
            return result;
        });
    }

    // ----- Cached tables from the API -----

    // getFoodTable(): Retrieves the table of all the foods (with its food code index)
    async getFoodTable() {
        await this._foodTable.getAllRows();
        return this._foodTable.table;
    }

    // queryNutrientAmountRows(conditions): Retrieves the nutrient amounts from the API, then joins them
    //  with the nutrient names, nutrient sources and foods in the browser
    async queryNutrientAmountRows(conditions) {
        const rows = await this.api.getData(`SELECT a.* FROM ${APITableNames.NutrientAmount} a ${SQLTools.sqlWhere(conditions)}`);

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

    // getNutrientRows(keyCol, keys, foodGroupCode): Retrieves the rows of the nutrient table for some food codes or nutrient codes
    //  ('keyCol'), only for the foods in the food group (an empty string means to not filter by the food group)
    async getNutrientRows(keyCol, keys, foodGroupCode = "") {
        const filters = (foodGroupCode == "") ? {} : {[DataCols.FoodGroupCode]: [foodGroupCode]};
        return await this._nutrientTable.getRows(keyCol, keys, filters);
    }

    // ----- Queries -----

    // queryMeasureConvRows(conditions): Retrieves the measure weight conversions (with their measure names) from the API
    async queryMeasureConvRows(conditions) {
        const rows = await this.api.getData(
            `SELECT w.*, ${this.selectLangCols("m", DataCols.MeasureDescription).join(", ")}
             FROM ${APITableNames.MeasureWeightConversion} w
             LEFT JOIN ${APITableNames.MeasureName} m ON m.${DataCols.MeasureCode} = w.${DataCols.MeasureCode}
             ${SQLTools.sqlWhere(conditions)}`);

        // some measures only have their names in the CSV file of the measure names (eg. the RA measure 502699)
        const measureDescriptionCol = Translation.getDataCol(DataCols.MeasureDescription);
        const unnamedRows = rows.filter((row) => row[measureDescriptionCol] == null);
        const csvNamedRows = await this.addCSVMeasureNames(unnamedRows);

        let unnamedInd = 0;
        const namedRows = rows.map((row) => (row[measureDescriptionCol] != null) ? row : csvNamedRows[unnamedInd++]);

        return this.setupMeasureConvRows(namedRows);
    }

    // queryNutrientNameRows(conditions): Retrieves the nutrient names (with their nutrient groups) from the API
    async queryNutrientNameRows(conditions) {
        const rows = await this.api.getData(
            `SELECT n.${DataCols.NutrientUnit}, n.${DataCols.NutrientDecimalPlace}, ${this.selectNutrientGroupCols("g").join(", ")}
             FROM ${APITableNames.NutrientAndGrouping} g
             LEFT JOIN ${APITableNames.NutrientName} n ON n.${DataCols.NutrientCode} = g.${DataCols.NutrientCode}
             ${SQLTools.sqlWhere(conditions)}`);

        // the nutrient name is the name with the unit, without the unit
        const nutrientNameCol = Translation.getDataCol(DataCols.NutrientName);
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        for (const row of rows) {
            row[nutrientNameCol] = Model.getNutrientName(row[nutrientNameWithUnitCol]);
        }

        return rows;
    }

    // ----- Selections for the dropdowns -----

    async getFoodGroups() {
        const foodGroups = await this._csvFoodGroupTable.getAllRows();
        let result = foodGroups.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodGroupDescription)], value: row[DataCols.FoodGroupCode]}});
        result.push({text: Translation.translate("NoneSelected"), value: ""});
        return result;
    }

    async getFoodNames() {
        const foodTable = await this.getFoodTable();
        const foodDescriptionCol = Translation.getDataCol(DataCols.FoodDescription);
        return foodTable.data.map((row) => { return {text: row[foodDescriptionCol], value: row[DataCols.FoodCode], exactMatchCount: 0, prefixedMatchCount: 0, startInd: Infinity}});
    }

    async getNutrients() {
        const nutrientNames = await this._nutrientNameTable.getAllRows();
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        const result = nutrientNames.map((row) => { return {text: row[nutrientNameWithUnitCol], value: row[DataCols.NutrientCode]}});

        // sort from the client side to sort properly special characters like "é"
        result.sort((a, b) => a.text.localeCompare(b.text));
        return result;
    }

    async getHighlightedNutrientNames() {
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        const rows = await this._nutrientNameTable.getRows(DataCols.NutrientCode, HighlightedNutrientCodes);
        return new Set(rows.map((row) => row[nutrientNameWithUnitCol]));
    }

    // ----- Foods -----
    // Note: 'filterFoodSearchTableByCodes' comes from BaseDataLoader, since it needs the whole food table (see 'getFoodTable')

    async getFoodByCode(foodCode) {
        const rows = await this._foodTable.getRows(DataCols.FoodCode, [foodCode]);
        return rows[0];
    }

    async getFoodNamesByCodes(foodCodes) {
        return await this._foodTable.getRows(DataCols.FoodCode, foodCodes);
    }

    // ----- Measures -----

    async getMeasureWeightConvByFoodCode(foodCode) {
        const [csvRows, apiRows] = await Promise.all([this._csvMeasureConvTable.getRows(DataCols.FoodCode, [foodCode]),
                                                      this._measureConvTable.getRows(DataCols.FoodCode, [foodCode])]);

        const result = ListTools.getUnique([...csvRows, ...apiRows], (row) => row[TableCols.MeasureWeightConvId]);
        return (result.length == 0) ? undefined : result;
    }

    async getRAMeasureWeightConvByFoodCodes(foodCodes) {
        foodCodes = Array.from(foodCodes);
        const allRALoaded = this._measureConvTable.loadedKeys[DataCols.MeasureTypeCode].has(RAMeasureTypeCode);

        // for a few foods (eg. the food selected in the search table), use the measures of the foods instead of retrieving
        //  all the RA measures, since the measures of the foods are usually already cached by the food's nutrient stats
        //  Note: the number of foods is limited, since the food codes are sent in the URL of the request
        if (!allRALoaded && foodCodes.length <= APIDataLoader.MaxFoodsForFoodMeasures) {
            const rows = await this._measureConvTable.getRows(DataCols.FoodCode, foodCodes);
            return rows.filter((row) => row[DataCols.MeasureTypeCode] == RAMeasureTypeCode);
        }

        return await this._measureConvTable.getRows(DataCols.MeasureTypeCode, [RAMeasureTypeCode], {[DataCols.FoodCode]: foodCodes});
    }

    // ----- Nutrients -----

    async getNutrientByCode(nutrientCode) {
        const rows = await this._nutrientNameTable.getRows(DataCols.NutrientCode, [nutrientCode]);
        return rows[0];
    }

    async getNutrientNamesByCodes(nutrientCodes) {
        return await this._nutrientNameTable.getRows(DataCols.NutrientCode, nutrientCodes);
    }

    async getNutrientsByFoodCode(foodCode) {
        const result = await this.getNutrientRows(DataCols.FoodCode, [foodCode]);
        return (result.length == 0) ? undefined : result;
    }

    async filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode) {
        if (nutrientCode == "") return [];

        // the food's rows are cached when the food is selected, so they are used instead of all the rows of the nutrient
        if (foodCode != "") {
            const foodRows = await this.getNutrientRows(DataCols.FoodCode, [foodCode], foodGroupCode);
            return foodRows.filter((row) => row[DataCols.NutrientCode] == nutrientCode);
        }

        return await this.getNutrientRows(DataCols.NutrientCode, [nutrientCode], foodGroupCode);
    }

    async filterCompareFoodTable(foodCodes) {
        if (foodCodes.length <= 0) return [];
        return await this.getNutrientRows(DataCols.FoodCode, foodCodes);
    }

    async filterCompareNutrientTable(nutrientCodes, foodGroupCode) {
        const foodGroupEmpty = foodGroupCode == "";
        const nutrientCodesEmpty = nutrientCodes.length <= 0;
        if (foodGroupEmpty && nutrientCodesEmpty) return [];

        // with only a food group, the compare table only lists the foods in the food group (no nutrient amounts are shown),
        //  so the foods come from the cached food table instead of retrieving the nutrient amounts of all the foods in the food group
        if (nutrientCodesEmpty) {
            return await this.filterFoodSearchTableByCodes(foodGroupCode, "");
        }

        return await this.getNutrientRows(DataCols.NutrientCode, nutrientCodes, foodGroupCode);
    }
}
