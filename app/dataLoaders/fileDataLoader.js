import { BaseDataLoader } from "./baseDataLoader.js";
import { DataCols, TableCols } from "../constants.js";
import { DictTools, LazyTable } from "../tools.js";


// The CSV files of the data
const CSVFiles = {
    FoodName: "data/Food_Name.csv",
    FoodGroup: "data/CNF_Food_Group.csv",
    FoodSource: "data/Food_Source.csv",
    NutrientAmount: "data/Nutrient_Amount.csv",
    NutrientName: "data/Nutrient_Name.csv",
    NutrientGroup: "data/Nutrients and grouping_CNF_2026.csv",
    NutrientSource: "data/Nutrient_Source.csv",

    // the reference amount (RA) measures come after the other measures
    MeasureName: ["data/Measure_Name.csv", "data/Measure_Name_RA for Health Infobase.csv"],
    MeasureWeightConv: ["data/Measure_Weight_Conversion.csv", "data/Measure_Weight_Conversion_RA for Health Infobase.csv"]
};


// FileDataLoader: Retrieves the data from the CSV files
export class FileDataLoader extends BaseDataLoader {
    constructor(backend) {
        super(backend);

        // the request that reads and indexes the nutrient amounts, so that they are only read once
        this._nutrientAmountTableRequest;

        this._foodGroupTable = this.createCSVTable(CSVFiles.FoodGroup, [DataCols.FoodGroupCode]);
        this._foodSourceTable = this.createCSVTable(CSVFiles.FoodSource, [DataCols.FoodSourceCode]);
        this._nutrientSourceTable = this.createCSVTable(CSVFiles.NutrientSource, [DataCols.NutrientSrcCode]);

        this._foodTable = new LazyTable(this,
            [DataCols.FoodCode],
            (row) => row[DataCols.FoodCode],
            async (keyCol, keys) => this.setupFoodRows(await this.filterCSVRows(CSVFiles.FoodName, keyCol, keys)));

        // the nutrient names, joined with the nutrient groups
        this._nutrientNameTable = new LazyTable(this,
            [DataCols.NutrientCode],
            (row) => row[DataCols.NutrientCode],
            async (keyCol, keys) => {
                const [nutrientNames, nutrientGroups] = await Promise.all([this.filterCSVRows(CSVFiles.NutrientName, keyCol, keys),
                                                                          this.getCSVRows(CSVFiles.NutrientGroup)]);

                const nutrientGroupTable = this.createIndexedTable(nutrientGroups, [DataCols.NutrientCode]);
                const rows = nutrientNames.map((row) => DictTools.combine([row, this.getRowById(nutrientGroupTable, DataCols.NutrientCode, row[DataCols.NutrientCode]) ?? {}]));
                return this.setupNutrientNameRows(rows);
            });

        // the nutrient amounts, joined with the foods, nutrient names and nutrient sources
        this._nutrientTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.NutrientCode, DataCols.FoodGroupCode],
            (row) => `${row[DataCols.FoodCode]}_${row[DataCols.NutrientCode]}`,
            async (keyCol, keys) => {
                const nutrientAmountTable = await this.getNutrientAmountTable();
                return await this.joinNutrientAmountRows(this.getRowsByIds(nutrientAmountTable, keyCol, keys));
            });

        // the measure names (the RA measure names come after the other measure names)
        this._measureNameTable = this.createCSVTable(CSVFiles.MeasureName, [DataCols.MeasureCode]);

        // the measure weight conversions (with their measure names), including the RA measures
        const measureConvTable = new LazyTable(this,
            [DataCols.FoodCode, DataCols.MeasureTypeCode],
            (row) => row[TableCols.MeasureWeightConvId],
            async (keyCol, keys) => this.setupMeasureConvRows(await this.addMeasureNames(await this.filterCSVRows(CSVFiles.MeasureWeightConv, keyCol, keys))));

        this._measureConvTables = [measureConvTable];
        this._raMeasureConvTable = measureConvTable;
    }

    // load(): Starts reading the nutrient amounts in the background, once the browser is idle after the app starts
    //  (the other tables are only read the first time they are needed)
    async load() {
        const readNutrientAmounts = () => this.getNutrientAmountTable().catch(() => {});

        if (window.requestIdleCallback) {
            window.requestIdleCallback(readNutrientAmounts, {timeout: 3000});
        } else {
            setTimeout(readNutrientAmounts, 1000);
        }
    }

    // getNutrientAmountTable(): Retrieves all the nutrient amounts (not joined with the other tables),
    //  with an index on the food code and the nutrient code
    async getNutrientAmountTable() {
        if (this._nutrientAmountTableRequest === undefined) {
            this._nutrientAmountTableRequest = this.getCSVRows(CSVFiles.NutrientAmount)
                .then((rows) => this.createIndexedTable(rows, [DataCols.FoodCode, DataCols.NutrientCode]))
                .catch((error) => {
                    this._nutrientAmountTableRequest = undefined;
                    throw error;
                });
        }

        return await this._nutrientAmountTableRequest;
    }

    // addMeasureNames(rows): Adds the measure names to the measure weight conversions
    async addMeasureNames(rows) {
        await this._measureNameTable.load(DataCols.MeasureCode, rows.map((row) => row[DataCols.MeasureCode]));

        const measureNameTable = this._measureNameTable.table;
        return rows.map((row) => DictTools.combine([row, this.getRowById(measureNameTable, DataCols.MeasureCode, row[DataCols.MeasureCode]) ?? {}]));
    }
}
