import { BaseDataLoader } from "./baseDataLoader.js";
import { Translation, TableTools } from "../tools.js";


export class FileDataLoader extends BaseDataLoader {
    constructor(backend) {
        super(backend);

        this.foodTable;
        this.foodGroupTable;
        this.foodNameTable;
        this.measureConvTable;
        this.nutrientTable;
        this.nutrientNameTable;
    }


    // loadCSV(file): Loads the table and its columns from a CSV file
    async loadCSV(file) {
        const data = await d3.csv(file);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        return {data, columns};
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
               nutrientGroupTable] = await Promise.all([this.loadCSV(`data/Food_Name.csv`), 
                           this.loadCSV(`data/CNF_Food_Group.csv`), 
                           this.loadCSV(`data/Food_Source.csv`),
                           this.loadCSV(`data/Measure_Type.csv`),
                           this.loadCSV(`data/Measure_Name.csv`),
                           this.loadCSV(`data/Measure_Weight_Conversion.csv`),
                           this.loadCSV(`data/Nutrient_Amount.csv`),
                           this.loadCSV(`data/Nutrient_Name.csv`),
                           this.loadCSV(`data/Nutrient_Source.csv`),
                           this.loadCSV(`data/Nutrients and grouping_CNF_2026.csv`)]);

        await Promise.all([this.loadFoodTable(foodNameTable, foodGroupTable, foodSourceTable),
                           this.loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable),
                           this.loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable)]);
    }

    getFoodGroups() {
        let result = this.foodGroupTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodGroupDescription)], value: row[DataCols.FoodGroupCode]}});
        result.push({text: Translation.translate("NoneSelected"), value: ""});
        return result;
    }

    getFoodNames() {
        let result = this.foodNameTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodDescription)], value: row[DataCols.FoodCode], exactMatchCount: 0, prefixedMatchCount: 0, startInd: Infinity}});
        return result;
    }

    async loadFoodTable(foodNameTable, foodGroupTable, foodSourceTable) {
        this.foodGroupTable = foodGroupTable;
        this.foodNameTable = foodNameTable;

        // setup the food group selections
        const foodGroups = this.getFoodGroups();
        this.searchSelections[SearchOpts.SearchByFood][SearchAtts.FoodGroup] = foodGroups;
        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.FoodGroup] = structuredClone(foodGroups);
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.FoodGroup] = structuredClone(foodGroups);

        // setup the food name selections
        const foodNames = this.getFoodNames();
        this.searchSelections[SearchOpts.CompareFoods][SearchAtts.FoodName] = foodNames;

        this.foodTable = TableTools.dataLeftJoinById(foodNameTable, foodGroupTable, DataCols.FoodGroupCode, DataCols.FoodGroupCode);
        this.foodTable = TableTools.dataLeftJoinById(this.foodTable, foodSourceTable, DataCols.FoodSourceCode, DataCols.FoodSourceCode);

        this.setupFoodTableIndices();
        this.setupFoodNameTableIndices();
    }

    setupFoodTableIndices() {
        const foodTableData = this.foodTable.data;
        
        const foodCodeIndex = {};
        const foodTableIndices = {[DataCols.FoodCode]: foodCodeIndex};
        this.foodTable.indices = foodTableIndices;

        const foodTableLen = foodTableData.length;
        for (let i = 0; i < foodTableLen; ++i) {
            const row = foodTableData[i];
            const indexVal = row[DataCols.FoodCode]
            this.assertFoodCodeIndUnique(foodCodeIndex, indexVal);
            foodCodeIndex[indexVal] = new Set([i]);

            row[TableCols.FoodNameOrder] = Infinity;
            row[TableCols.FoodAltNameOrder] = Infinity;
            
            // tokenize the food descriptions for searching
            row[Translation.getDataCol(TableCols.FoodDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodDescription)]);
            row[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodAltDescription)]);
        }
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
}