import { SearchOpts, SearchAtts, DataCols } from "./constants.js";
import { Translation, TableTools } from "./tools.js";


export class Model {
    constructor() {
        this.searchOpt = SearchOpts.SearchByFood;
        this.searchInputs = this.initSearchInputs();
        this.selectedFoodCodes = [];

        this.foodTable;
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

    loadFoodTable(foodNameTable, foodGroupTable) {
        this.foodTable = TableTools.dataLeftJoinById(foodNameTable, foodGroupTable, DataCols.FoodGroupCode, DataCols.FoodGroupCode);
        const foodTableData = this.foodTable.data;
        
        const foodTableIndices = {};
        this.foodTable.indices = foodTableIndices;

        // Food code is a unique index
        const foodCodeIndex = {};
        foodTableIndices.foodCode = foodCodeIndex;
        const foodTableLen = foodTableData.length;

        for (let i = 0; i < foodTableLen; ++i) {
            const row = foodTableData[i];
            const indexVal = row[DataCols.FoodCode]
            if (foodCodeIndex[indexVal] !== undefined) {
                throw new TypeError("Food Code is not unique!");
            }

            foodCodeIndex[indexVal] = i;
        }
    }

    // load(): Initial load of all the required data
    async load() {
        await Promise.all([this.loadCSV(`data/Food_Name.csv`), this.loadCSV(`data/CNF_Food_Group.csv`)])
            .then(([foodNameTable, foodGroupTable]) => {
                this.loadFoodTable(foodNameTable, foodGroupTable);
        });
    }

    filterFoodSearchTable(foodName, foodGroup, foodCode) {
        let result = this.foodTable.data;

        if (foodCode != "") {
            const rowInd = this.foodTable.indices.foodCode[foodCode];
            if (rowInd === undefined) return {};
            result = [this.foodTable.data[rowInd]];
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

    // getFoodSearchTableData(): Retrieves the data for the searched foods 
    getFoodSearchTableData() {
        const inputs = this.searchInputs[SearchOpts.SearchByFood];
        return this.filterFoodSearchTable(inputs[SearchAtts.FoodName], inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
    }

    // getFoodSearchSelectedData(): Retrieves the data for the selected foods
    getFoodSearchSelectedData() {
        if (this.selectedFoodCodes.length == 0) return [];
        return this.filterFoodSearchTable("", "", this.selectedFoodCodes[0]);
    }
}