import { SearchOpts, SearchAtts, DataCols } from "./constants.js";
import { Translation, TableTools } from "./tools.js";


export class Model {
    constructor() {
        this.searchOpt = SearchOpts.SearchByFood;
        this.searchInputs = this.initSearchInputs();
        this.selectedFoodCodes = {};
        this.foodSelected = {
            [SearchOpts.SearchByFood]: false,
            [SearchOpts.SearchByNutrient]: false
        };

        this.foodTable;
        this.measureConvTable;
    }

    initSearchInputs() {
        return {
            [SearchOpts.SearchByFood]: {
                [SearchAtts.FoodName]: "",
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.FoodCode]: ""
            }
        };
    }

    // loadCSV(file): Loads the table and its columns from a CSV file
    async loadCSV(file) {
        const data = await d3.csv(file);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        return {data, columns};
    }

    assertFoodCodeIndUnique(index, val) {
        if (index[val] !== undefined) {
            throw new TypeError("Food Code is not unique!");
        }
    }

    loadFoodTable(foodNameTable, foodGroupTable) {
        this.foodTable = TableTools.dataLeftJoinById(foodNameTable, foodGroupTable, DataCols.FoodGroupCode, DataCols.FoodGroupCode);
        const foodTableData = this.foodTable.data;
        
        const foodCodeIndex = {};
        const foodTableIndices = {[DataCols.FoodCode]: foodCodeIndex};
        this.foodTable.indices = foodTableIndices;

        const foodTableLen = foodTableData.length;
        for (let i = 0; i < foodTableLen; ++i) {
            const row = foodTableData[i];
            const indexVal = row[DataCols.FoodCode]
            this.assertFoodCodeIndUnique(foodCodeIndex, indexVal);
            foodCodeIndex[indexVal] = [i];
        }
    }

    loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable) {
        this.measureConvTable = TableTools.dataLeftJoinById(measureWeightConvTable, measureTypeTable, DataCols.MeasureTypeCode, DataCols.MeasureTypeCode);
        this.measureConvTable = TableTools.dataLeftJoinById(this.measureConvTable, measureNameTable, DataCols.MeasureCode, DataCols.MeasureCode);
        const measureConvTableData = this.measureConvTable.data;

        const foodCodeIndex = {};
        const indices = {[DataCols.FoodCode]: foodCodeIndex};
        this.measureConvTable.indices = indices;

        const measureWeightConvTableLen = measureConvTableData.length;

        for (let i = 0; i < measureWeightConvTableLen; ++i) {
            const row = measureConvTableData[i];
            const foodIndexVal = row[DataCols.FoodCode];
            const currentFoodCodeInd = foodCodeIndex[foodIndexVal];
            
            if (currentFoodCodeInd === undefined) {
                foodCodeIndex[foodIndexVal] = [i];
            } else {
                foodCodeIndex[foodIndexVal].push(i);
            }
        }
    }

    // load(): Initial load of all the required data
    async load() {
        await Promise.all([this.loadCSV(`data/Food_Name.csv`), 
                           this.loadCSV(`data/CNF_Food_Group.csv`), 
                           this.loadCSV(`data/Measure_Type.csv`),
                           this.loadCSV(`data/Measure_Name.csv`),
                           this.loadCSV(`data/Measure_Weight_Conversion.csv`)])
            .then(([foodNameTable, foodGroupTable, measureTypeTable, measureNameTable, measureWeightConvTable]) => {
                this.loadFoodTable(foodNameTable, foodGroupTable);
                this.loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable);
        });
    }

    getRowById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined) return;
        return table.data[rowInds[0]];
    }

    getRowsById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined) return;
        return rowInds.map((ind) => table.data[ind]);
    }

    filterFoodSearchTable(foodName, foodGroup, foodCode) {
        let result = this.foodTable.data;

        if (foodCode != "") {
            const row = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
            if (row === undefined) return [];
            result = [row];
        }

        if (foodName == "" && foodGroup == "") return result;
        
        return result.filter((row) => {
            if (foodName != "" && !row[Translation.getDataCol(DataCols.FoodDescription)].includes(foodName)) {
                return false;
            }

            if (foodGroup != "" && !row[Translation.getDataCol(DataCols.FoodGroupDescription)].includes(foodGroup)) {
                return false;
            }

            return true;
        });
    }

    // getFoodSearchTableData(searchOpt): Retrieves the data for the searched foods 
    getFoodSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        return this.filterFoodSearchTable(inputs[SearchAtts.FoodName], inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
    }

    // getFoodSearchSelectedData(searchOpt): Retrieves the data for the selected foods
    getFoodSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        return this.filterFoodSearchTable("", "", selectedFoods[0]);
    }

    // getFoodNutrientStats(): Retrives the nutrient data for the selected foods
    getFoodNutrientStats(foodCode) {
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        const measureWeightConv = this.getRowsById(this.measureConvTable, DataCols.FoodCode, foodCode);
        if (measureWeightConv == undefined) return;

        return {measureWeightConv, food};
    }
}