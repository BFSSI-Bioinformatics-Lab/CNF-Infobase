import { BaseDataLoader } from "./baseDataLoader.js";
import { DataCols, LangDataCols, TableCols, APITableNames, APIDataCols } from "../constants.js";
import { Translation, SQLTools, EnvTools, LazyTable } from "../tools.js";


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
// - The whole nutrient table is too big to retrieve (565,409 rows), so its rows are retrieved by food code or by
//   nutrient code. The rows are joined with the other tables in the browser instead of in the API
export class APIDataLoader extends BaseDataLoader {
    constructor(backend) {
        super(backend);
        this.api = new BackendAPIGateway(undefined);

        this._foodGroupTable = this.createAPITable(APITableNames.FoodGroup, [DataCols.FoodGroupCode]);
        this._foodSourceTable = this.createAPITable(APITableNames.FoodSource, [DataCols.FoodSourceCode]);
        this._nutrientSourceTable = this.createAPITable(APITableNames.NutrientSource, [DataCols.NutrientSrcCode]);

        this._foodTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[DataCols.FoodCode],
            async (keyCol, keys) => this.setupFoodRows(await this.queryTable(APITableNames.FoodName, keyCol, keys)));

        this._nutrientNameTable = new LazyTable(this,
            [DataCols.NutrientCode],
            (row) => row[DataCols.NutrientCode],
            (keyCol, keys) => this.queryNutrientNameRows(keyCol, keys));

        // the food group is only an index, to filter the cached rows by the food group (the rows are not retrieved by the food group)
        this._nutrientTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.NutrientCode, DataCols.FoodGroupCode],
            (row) => `${row[DataCols.FoodCode]}_${row[DataCols.NutrientCode]}`,
            async (keyCol, keys) => this.joinNutrientAmountRows(await this.queryTable(APITableNames.NutrientAmount, keyCol, keys)));

        // the measure names (the names of the RA measures come after the other measure names)
        this._measureNameTable = new LazyTable(this,
            [DataCols.MeasureCode],
            (row) => row[DataCols.MeasureCode],
            async (keyCol, keys) => {
                const [measureNames, raMeasureNames] = await Promise.all([this.queryTable(APITableNames.MeasureName, keyCol, keys),
                                                                         this.queryTable(APITableNames.MeasureNameRA, keyCol, keys)]);
                return [...measureNames, ...raMeasureNames];
            });

        // the measure weight conversions (with their measure names): the reference amount (RA) measures are in their own table
        const measureConvTable = this.createMeasureConvTable(APITableNames.MeasureWeightConversion);
        const raMeasureConvTable = this.createMeasureConvTable(APITableNames.MeasureWeightConversionRA);

        this._measureConvTables = [measureConvTable, raMeasureConvTable];
        this._raMeasureConvTable = raMeasureConvTable;
    }

    // load(): Sets the URL of the API (the tables are only loaded the first time they are needed)
    async load() {
        if (this.api.apiURL === undefined) {
            const env = await EnvTools.load();
            this.api.apiURL = env.BackendAPIURL;
        }

        if (!this.api.apiURL) throw new Error("The URL of the API is not set. Set 'BackendAPIURL' in env.js");
    }

    // ----- Queries -----

    // queryTable(tableName, keyCol, keys): Retrieves the rows of an API table whose 'keyCol' column is one of 'keys'
    //  (all the rows if 'keyCol' is null)
    async queryTable(tableName, keyCol, keys) {
        const conditions = (keyCol === null) ? [] : [`t.${keyCol} IN ${SQLTools.sqlList(keys)}`];
        return await this.api.getData(`SELECT t.* FROM ${tableName} t ${SQLTools.sqlWhere(conditions)}`);
    }

    // createAPITable(tableName, keyCols): Creates a LazyTable whose rows come from an API table
    createAPITable(tableName, keyCols) {
        return new LazyTable(this, keyCols, (row) => row[keyCols[0]], (keyCol, keys) => this.queryTable(tableName, keyCol, keys));
    }

    // createMeasureConvTable(tableName): Creates a LazyTable of the measure weight conversions (with their measure names)
    //  from an API table
    createMeasureConvTable(tableName) {
        return new LazyTable(this,
            [DataCols.FoodCode, DataCols.MeasureTypeCode],
            (row) => row[TableCols.MeasureWeightConvId],
            async (keyCol, keys) => this.setupMeasureConvRows(await this.addMeasureNames(await this.queryTable(tableName, keyCol, keys))));
    }

    // renameAPICols(rows): Renames the columns from the API that are named differently from the columns used by the app
    //  (see 'APIDataCols')
    renameAPICols(rows) {
        const langCodes = [Translation.getLangCode(true), Translation.getAltLangCode(true)];
        const renames = [];

        for (const colKey in APIDataCols) {
            const apiCol = APIDataCols[colKey];
            const appCol = DataCols[colKey];

            if (LangDataCols.has(appCol)) {
                langCodes.forEach((langCode) => renames.push([`${apiCol}${langCode}`, `${appCol}${langCode}`]));
            } else {
                renames.push([apiCol, appCol]);
            }
        }

        for (const row of rows) {
            for (const [apiCol, appCol] of renames) {
                if (!(apiCol in row)) continue;
                row[appCol] = row[apiCol];
                delete row[apiCol];
            }
        }

        return rows;
    }

    // queryNutrientNameRows(keyCol, keys): Retrieves the nutrient names (with their nutrient groups) from the API
    async queryNutrientNameRows(keyCol, keys) {
        const conditions = (keyCol === null) ? [] : [`g.${keyCol} IN ${SQLTools.sqlList(keys)}`];
        const rows = await this.api.getData(
            `SELECT n.${DataCols.NutrientUnit}, n.${DataCols.NutrientDecimalPlace}, g.*
             FROM ${APITableNames.NutrientAndGrouping} g
             LEFT JOIN ${APITableNames.NutrientName} n ON n.${DataCols.NutrientCode} = g.${DataCols.NutrientCode}
             ${SQLTools.sqlWhere(conditions)}`);

        return this.setupNutrientNameRows(this.renameAPICols(rows));
    }
}
