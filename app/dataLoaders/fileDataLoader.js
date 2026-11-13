import { BaseDataLoader } from "./baseDataLoader.js";
import { DataCols, TableCols, RAMeasureTypeCode, HighlightedNutrientCodes } from "../constants.js";
import { Translation, TableTools, ListTools } from "../tools.js";
import { Model } from "../backend.js";


// FileDataLoader: Retrieves the data from the CSV files
export class FileDataLoader extends BaseDataLoader {
    constructor(backend) {
        super(backend);

        this.foodGroupTable;
        this.foodNameTable;
        this.measureConvTable;
        this.nutrientTable;
        this.nutrientNameTable;

        this.highlightedNutrientNames = new Set();
    }

    async load() {
        const [foodNameTable,
               foodGroupTable,
               foodSourceTable,
               measureTypeTable,
               measureNameTable,
               measureWeightConvTable,
               nutrientAmtTable,
               nutrientNameTable,
               nutrientSrcTable,
               nutrientGroupTable,
               raMeasureTypeTable,
               raMeasureNameTable,
               raMeasureWeightConvTable] = await Promise.all([this.loadCSV(`data/Food_Name.csv`),
                           this.loadCSV(`data/CNF_Food_Group.csv`),
                           this.loadCSV(`data/Food_Source.csv`),
                           this.loadCSV(`data/Measure_Type.csv`),
                           this.loadCSV(`data/Measure_Name.csv`),
                           this.loadCSV(`data/Measure_Weight_Conversion.csv`),
                           this.loadCSV(`data/Nutrient_Amount.csv`),
                           this.loadCSV(`data/Nutrient_Name.csv`),
                           this.loadCSV(`data/Nutrient_Source.csv`),
                           this.loadCSV(`data/Nutrients and grouping_CNF_2026.csv`),
                           this.loadCSV(`data/Measure_Type_RA for Health Infobase.csv`),
                           this.loadCSV(`data/Measure_Name_RA for Health Infobase.csv`),
                           this.loadCSV(`data/Measure_Weight_Conversion_RA for Health Infobase.csv`)]);

        // add the reference amount (RA) measures to the other measures
        measureTypeTable.data.push(...(raMeasureTypeTable.data));
        measureNameTable.data.push(...(raMeasureNameTable.data));
        measureWeightConvTable.data.push(...(raMeasureWeightConvTable.data));

        // the food table needs to be loaded before the nutrient table, since the nutrient table joins with the food table
        this.loadFoodTable(foodNameTable, foodGroupTable, foodSourceTable);
        this.loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable);
        this.loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable);
    }

    // ----- Loading the tables -----

    loadFoodTable(foodNameTable, foodGroupTable, foodSourceTable) {
        this.foodGroupTable = foodGroupTable;
        this.foodNameTable = foodNameTable;

        this._foodTable = TableTools.dataLeftJoinById(foodNameTable, foodGroupTable, DataCols.FoodGroupCode, DataCols.FoodGroupCode);
        this._foodTable = TableTools.dataLeftJoinById(this._foodTable, foodSourceTable, DataCols.FoodSourceCode, DataCols.FoodSourceCode);

        this.setupFoodTableIndices(this._foodTable);
        this.setupFoodNameTableIndices();
    }

    setupFoodNameTableIndices() {
        const foodNameTableData = this.foodNameTable.data;
        const foodCodeIndex = {};
        const getFoodCodeVal = (row) => row[DataCols.FoodCode];

        const foodNameTableIndices = {[DataCols.FoodCode]: foodCodeIndex};
        this.foodNameTable.indices = foodNameTableIndices;

        const foodNameTableLen = foodNameTableData.length;
        for (let i = 0; i < foodNameTableLen; ++i) {
            const row = foodNameTableData[i];
            this.addIndexVal(row, i, foodCodeIndex, getFoodCodeVal);
        }
    }

    loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable) {
        this.measureConvTable = TableTools.dataLeftJoinById(measureWeightConvTable, measureTypeTable, DataCols.MeasureTypeCode, DataCols.MeasureTypeCode);
        this.measureConvTable = TableTools.dataLeftJoinById(this.measureConvTable, measureNameTable, DataCols.MeasureCode, DataCols.MeasureCode);

        // there are duplicate rows in the original data that needs to be filtered out
        this.measureConvTable.data = ListTools.getUnique(this.measureConvTable.data, (row) => {
            const result = Model.getMeasureWeightConvIdFromRow(row);
            row[TableCols.MeasureWeightConvId] = result;
            return result;
        });

        const measureConvTableData = this.measureConvTable.data;

        const foodCodeIndex = {};
        const measureTypeCodeIndex = {};
        const measureCodeIndex = {};
        const getFoodCodeVal = (row) => row[DataCols.FoodCode];
        const getMeasureTypeCodeVal = (row) => row[DataCols.MeasureTypeCode];
        const getMeasureCodeVal = (row) => row[DataCols.MeasureCode];

        this.measureConvTable.indices = {
            [DataCols.FoodCode]: foodCodeIndex,
            [DataCols.MeasureTypeCode]: measureTypeCodeIndex,
            [DataCols.MeasureCode]: measureCodeIndex
        };

        const measureWeightConvTableLen = measureConvTableData.length;
        for (let i = 0; i < measureWeightConvTableLen; ++i) {
            const row = measureConvTableData[i];
            this.addIndexVal(row, i, foodCodeIndex, getFoodCodeVal);
            this.addIndexVal(row, i, measureTypeCodeIndex, getMeasureTypeCodeVal);
            this.addIndexVal(row, i, measureCodeIndex, getMeasureCodeVal);
        }
    }

    setupNutrientTableIndices() {
        const foodCodeIndex = {};
        const getFoodCodeVal = (row) => row[DataCols.FoodCode];

        const nutrientCodeIndex = {};
        const getNutrientCodeVal = (row) => row[DataCols.NutrientCode];

        this.nutrientTable.indices = {[DataCols.FoodCode]: foodCodeIndex, [DataCols.NutrientCode]: nutrientCodeIndex};

        const nutrientTableData = this.nutrientTable.data;
        const nutrientTableDataLen = nutrientTableData.length;

        for (let i = 0; i < nutrientTableDataLen; ++i) {
            const row = nutrientTableData[i];
            this.addIndexVal(row, i, foodCodeIndex, getFoodCodeVal);
            this.addIndexVal(row, i, nutrientCodeIndex, getNutrientCodeVal);
        }
    }

    setupNutrientNameTableIndices() {
        const nutrientCodeIndex = {};
        const getNutrientCodeVal = (row) => row[DataCols.NutrientCode];

        this.nutrientNameTable.indices = {[DataCols.NutrientCode]: nutrientCodeIndex};

        const nutrientTableData = this.nutrientNameTable.data;
        const nutrientTableDataLen = nutrientTableData.length;

        for (let i = 0; i < nutrientTableDataLen; ++i) {
            const row = nutrientTableData[i];
            this.addIndexVal(row, i, nutrientCodeIndex, getNutrientCodeVal);
        }
    }

    loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable) {
        this.nutrientNameTable = TableTools.dataLeftJoinById(nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);

        // update which nutrients should be bolded in the nutrient table and
        //  modify the nutrient names column with the updated nutrient names
        const nutrientNameCol = Translation.getDataCol(DataCols.NutrientName);
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);

        for (const row of this.nutrientNameTable.data) {
            const nutrientCode = row[DataCols.NutrientCode];
            row[nutrientNameCol] = Model.getNutrientName(row[nutrientNameWithUnitCol]);

            if (HighlightedNutrientCodes.has(nutrientCode)) {
                this.highlightedNutrientNames.add(row[nutrientNameWithUnitCol]);
            }
        }

        // join the different parts of the nutrients
        nutrientNameTable = TableTools.dataLeftJoinById(nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(nutrientAmtTable, nutrientNameTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, nutrientSrcTable, DataCols.NutrientSrcCode, DataCols.NutrientSrcCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, this._foodTable, DataCols.FoodCode, DataCols.FoodCode);

        this.setupNutrientTableIndices();
        this.setupNutrientNameTableIndices();
    }

    // ----- Selections for the dropdowns -----

    async getFoodGroups() {
        let result = this.foodGroupTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodGroupDescription)], value: row[DataCols.FoodGroupCode]}});
        result.push({text: Translation.translate("NoneSelected"), value: ""});
        return result;
    }

    async getFoodNames() {
        return this.foodNameTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodDescription)], value: row[DataCols.FoodCode], exactMatchCount: 0, prefixedMatchCount: 0, startInd: Infinity}});
    }

    async getNutrients() {
        const result = this.nutrientNameTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.NutrientNameWithUnit)], value: row[DataCols.NutrientCode]}});
        result.sort((a, b) => a.text.localeCompare(b.text));
        return result;
    }

    async getHighlightedNutrientNames() {
        return this.highlightedNutrientNames;
    }

    // ----- Foods -----

    async getFoodNamesByCodes(foodCodes) {
        return this.getRowsByIds(this.foodNameTable, DataCols.FoodCode, foodCodes);
    }

    // ----- Measures -----

    async getMeasureWeightConvByFoodCode(foodCode) {
        return this.getRowsById(this.measureConvTable, DataCols.FoodCode, foodCode);
    }

    async getRAMeasureWeightConvByFoodCodes(foodCodes) {
        return this.getRowsByManyIds(this.measureConvTable, {[DataCols.MeasureTypeCode]: [RAMeasureTypeCode], [DataCols.FoodCode]: foodCodes});
    }

    // ----- Nutrients -----

    async getNutrientByCode(nutrientCode) {
        return this.getRowById(this.nutrientNameTable, DataCols.NutrientCode, nutrientCode);
    }

    async getNutrientNamesByCodes(nutrientCodes) {
        return this.getRowsByIds(this.nutrientNameTable, DataCols.NutrientCode, nutrientCodes);
    }

    async getNutrientsByFoodCode(foodCode) {
        return this.getRowsById(this.nutrientTable, DataCols.FoodCode, foodCode);
    }

    async filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode) {
        let result = this.nutrientTable.data;
        if (nutrientCode == "") return [];

        if (foodCode != "") {
            result = this.getRowsById(this.nutrientTable, DataCols.FoodCode, foodCode);
            if (result === undefined) return [];
        }

        if (foodGroupCode != "") {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        return result.filter((row) => row[DataCols.NutrientCode] == nutrientCode);
    }

    async filterCompareFoodTable(foodCodes) {
        if (foodCodes.length <= 0) return [];

        foodCodes = new Set(foodCodes);
        return this.nutrientTable.data.filter((row) => foodCodes.has(row[DataCols.FoodCode]));
    }

    async filterCompareNutrientTable(nutrientCodes, foodGroupCode) {
        let result = this.nutrientTable.data;
        const foodGroupEmpty = foodGroupCode == "";
        const nutrientCodesEmpty = nutrientCodes.length <= 0;

        if (foodGroupEmpty && nutrientCodesEmpty) return [];

        if (!foodGroupEmpty) {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        if (!nutrientCodesEmpty) {
            nutrientCodes = new Set(nutrientCodes);
            result = result.filter((row) => nutrientCodes.has(row[DataCols.NutrientCode]));
        }

        return result;
    }
}
