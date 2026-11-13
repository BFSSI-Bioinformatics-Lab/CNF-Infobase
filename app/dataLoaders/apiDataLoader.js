import { BaseDataLoader } from "./baseDataLoader.js";
import { DataCols, TableCols, APITableNames, APIDataCols } from "../constants.js";
import { Translation, SQLTools, EnvTools, DictTools, LazyTable } from "../tools.js";


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


// APIDataLoader: Retrieves the data from the backend API
// Note:
// - Each table is a LazyTable (see BaseDataLoader), whose rows are only retrieved the first time they are needed
//
// - The API does not have all the tables yet, so the following tables still come from the CSV files:
//   * the food groups (CNF_Food_Group.csv)
//   * the food sources (Food_Source.csv)
//   * the measure weight conversions and measure names that are not reference amounts (RA)
//     (Measure_Weight_Conversion.csv and Measure_Name.csv)
//   The API's measure tables only have the RA measures
//
// - The whole nutrient table is too big to retrieve (565,409 rows), so its rows are retrieved by food code or by
//   nutrient code. The rows are joined with the other tables in the browser instead of in the API
export class APIDataLoader extends BaseDataLoader {
    constructor(backend) {
        super(backend);
        this.api = new BackendAPIGateway(undefined);

        // ----- tables from the CSV files -----

        this._foodGroupTable = this.createCSVTable(`data/CNF_Food_Group.csv`, [DataCols.FoodGroupCode]);
        this._foodSourceTable = this.createCSVTable(`data/Food_Source.csv`, [DataCols.FoodSourceCode]);
        this._csvMeasureNameTable = this.createCSVTable(`data/Measure_Name.csv`, [DataCols.MeasureCode]);

        // the measure weight conversions that are not RA measures (with their measure names)
        const csvMeasureConvTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[TableCols.MeasureWeightConvId],
            async (keyCol, keys) => {
                const rows = await this.filterCSVRows(`data/Measure_Weight_Conversion.csv`, keyCol, keys);
                return this.setupMeasureConvRows(await this.addCSVMeasureNames(rows));
            });

        // ----- tables from the API -----

        this._foodTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[DataCols.FoodCode],
            async (keyCol, keys) => this.setupFoodRows(await this.api.getData(
                `SELECT f.* FROM ${APITableNames.FoodName} f
                 ${SQLTools.sqlWhere((keyCol === null) ? [] : [`f.${keyCol} IN ${SQLTools.sqlList(keys)}`])}`)));

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

        // the food group is only an index, to filter the cached rows by the food group (the rows are not retrieved by the food group)
        this._nutrientTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.NutrientCode, DataCols.FoodGroupCode],
            (row) => `${row[DataCols.FoodCode]}_${row[DataCols.NutrientCode]}`,
            async (keyCol, keys) => this.joinNutrientAmountRows(await this.api.getData(
                `SELECT a.* FROM ${APITableNames.NutrientAmount} a WHERE a.${keyCol} IN ${SQLTools.sqlList(keys)}`)));

        // the RA measure weight conversions (with their measure names)
        const apiMeasureConvTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.MeasureTypeCode],
            (row) => row[TableCols.MeasureWeightConvId],
            (keyCol, keys) => this.queryMeasureConvRows([`w.${keyCol} IN ${SQLTools.sqlList(keys)}`]));

        // the conversions that are not RA measures come before the RA measures
        this._measureConvTables = [csvMeasureConvTable, apiMeasureConvTable];
        this._raMeasureConvTable = apiMeasureConvTable;
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

        return this.setupNutrientNameRows(rows);
    }

    // addCSVMeasureNames(rows): Adds the measure names from the CSV file to the measure weight conversions
    async addCSVMeasureNames(rows) {
        await this._csvMeasureNameTable.load(DataCols.MeasureCode, rows.map((row) => row[DataCols.MeasureCode]));

        const measureNameTable = this._csvMeasureNameTable.table;
        return rows.map((row) => DictTools.combine([row, this.getRowById(measureNameTable, DataCols.MeasureCode, row[DataCols.MeasureCode]) ?? {}]));
    }
}
