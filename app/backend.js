import { SearchOpts, SearchAtts, DataCols, TableCols, HiddenMeasureCodes, DefaultMeasureCode, MeasureTypeCodes } from "./constants.js";
import { Translation, TableTools } from "./tools.js";


export class Model {
    constructor() {
        this.searchOpt = SearchOpts.SearchByFood;
        this.searchSelections = this.initSearchSelections();
        this.searchInputs = this.initSearchInputs();
        this.selectedFoodCodes = {};
        this.foodSelected = {
            [SearchOpts.SearchByFood]: false,
            [SearchOpts.SearchByNutrient]: false
        };

        this.foodTable;
        this.foodGroupTable;
        this.measureConvTable;
        this.nutrientTable;

        this.searchedNutrientData;
        this.webSearchedNutrientTable;
        this.pdfSearchedNutrientTable;
    }

    clearSearchInputs(searchOpt) {
        if (searchOpt == SearchOpts.SearchByFood) {
            this.searchInputs[searchOpt] = {
                [SearchAtts.FoodName]: "",
                [SearchAtts.FoodAltName]: "",
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.FoodCode]: ""
            }
        }
    }

    initSearchInputs() {
        return {
            [SearchOpts.SearchByFood]: {
                [SearchAtts.FoodName]: "",
                [SearchAtts.FoodAltName]: "",
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.FoodCode]: ""
            }
        };
    }

    initSearchSelections() {
        return {
            [SearchOpts.SearchByFood]: {
                [SearchAtts.FoodGroup]: new Set()
            }
        }
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

    async loadFoodTable(foodNameTable, foodGroupTable) {
        this.foodGroupTable = foodGroupTable;
        this.searchSelections[SearchOpts.SearchByFood][SearchAtts.FoodGroup] = this.getFoodGroups();

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

            row[TableCols.FoodNameOrder] = Infinity;
            row[TableCols.FoodGroupOrder] = Infinity;
            row[TableCols.FoodAltNameOrder] = Infinity;
        }
    }

    static getMeasureWeigthConvId(foodCode, measureTypeCode, measureCode) {
        return `${foodCode}_${measureTypeCode}_${measureCode}`;
    }

    static getMeasureWeightConvIdFromRow(measureWeightConvRow) {
        return Model.getMeasureWeigthConvId(measureWeightConvRow[DataCols.FoodCode], measureWeightConvRow[DataCols.MeasureTypeCode], measureWeightConvRow[DataCols.MeasureCode]);
    }

    async loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable) {
        this.measureConvTable = TableTools.dataLeftJoinById(measureWeightConvTable, measureTypeTable, DataCols.MeasureTypeCode, DataCols.MeasureTypeCode);
        this.measureConvTable = TableTools.dataLeftJoinById(this.measureConvTable, measureNameTable, DataCols.MeasureCode, DataCols.MeasureCode);
        const measureConvTableData = this.measureConvTable.data;

        const foodCodeIndex = {};
        const indices = {[DataCols.FoodCode]: foodCodeIndex};
        this.measureConvTable.indices = indices;

        const measureWeightConvTableLen = measureConvTableData.length;

        for (let i = 0; i < measureWeightConvTableLen; ++i) {
            const row = measureConvTableData[i];
            row[TableCols.MeasureWeightConvId] = Model.getMeasureWeightConvIdFromRow(row);

            const foodIndexVal = row[DataCols.FoodCode];
            const currentFoodCodeInd = foodCodeIndex[foodIndexVal];
            
            if (currentFoodCodeInd === undefined) {
                foodCodeIndex[foodIndexVal] = [i];
            } else {
                foodCodeIndex[foodIndexVal].push(i);
            }
        }
    }

    async loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable) {
        // add the order nutrient group ordering
        const nutrientGroupData = nutrientGroupTable.data;
        let currentNutrientGroupInd = 0;
        const nutrientGroupOrder = {};

        for (const row of nutrientGroupData) {
            const nutrientGroup = row[DataCols.NutrientGroup];
            if (nutrientGroupOrder[nutrientGroup] === undefined) {
                nutrientGroupOrder[nutrientGroup] = currentNutrientGroupInd;
                currentNutrientGroupInd++;
            }

            row[TableCols.NutrientGroupOrder] = nutrientGroupOrder[nutrientGroup];
        }

        // join the different parts of the nutrients
        nutrientNameTable = TableTools.dataLeftJoinById(nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(nutrientAmtTable, nutrientNameTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, nutrientSrcTable, DataCols.NutrientSrcCode, DataCols.NutrientSrcCode);
        const nutrientTableData = this.nutrientTable.data;

        const foodCodeIndex = {};
        const indices = {[DataCols.FoodCode]: foodCodeIndex};
        this.nutrientTable.indices = indices;

        const nutrientTableDataLen = nutrientTableData.length;
        
        for (let i = 0; i < nutrientTableDataLen; ++i) {
            const row = nutrientTableData[i];

            const foodIndexVal = row[DataCols.FoodCode];
            const currentFoodCodeInd = foodCodeIndex[foodIndexVal];

            if (currentFoodCodeInd == undefined) {
                foodCodeIndex[foodIndexVal] = [i];
            } else {
                foodCodeIndex[foodIndexVal].push(i);
            }
        }
    }

    // load(): Initial load of all the required data
    async load() {
        const [foodNameTable, 
               foodGroupTable, 
               measureTypeTable, 
               measureNameTable, 
               measureWeightConvTable, 
               nutrientAmtTable, 
               nutrientNameTable, 
               nutrientSrcTable,
               nutrientGroupTable] = await Promise.all([this.loadCSV(`data/Food_Name.csv`), 
                           this.loadCSV(`data/CNF_Food_Group.csv`), 
                           this.loadCSV(`data/Measure_Type.csv`),
                           this.loadCSV(`data/Measure_Name.csv`),
                           this.loadCSV(`data/Measure_Weight_Conversion.csv`),
                           this.loadCSV(`data/Nutrient_Amount.csv`),
                           this.loadCSV(`data/Nutrient_Name.csv`),
                           this.loadCSV(`data/Nutrient_Source.csv`),
                           this.loadCSV(`data/Nutrients and grouping_CNF_2026.csv`)]);

        await Promise.all([this.loadFoodTable(foodNameTable, foodGroupTable),
                           this.loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable),
                           this.loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable)]);
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

    filterFoodSearchTable(foodName, foodAltName, foodGroup, foodCode) {
        let result = this.foodTable.data;

        if (foodCode != "") {
            const row = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
            if (row === undefined) return [];
            result = [row];
        }

        if (foodName == "" && foodGroup == "" && foodAltName == "") return result;

        const foodNamePattern = (foodName != "") ? new RegExp(foodName, "i") : undefined;
        const foodAltNamePattern = (foodAltName != "") ? new RegExp(foodAltName, "i") : undefined;
        const foodGroupPattern = (foodGroup != "") ? new RegExp(foodGroup, "i") : undefined;
        
        result = result.filter((row) => {
            let foodNameIndex = Infinity;
            let foodAltNameIndex = Infinity;
            let foodGroupIndex = Infinity;

            if (foodName != "") {
                foodNameIndex = row[Translation.getDataCol(DataCols.FoodDescription)].search(foodNamePattern);
                if (foodNameIndex == -1) return false;
            }

            if (foodAltName != "") {
                foodAltNameIndex = row[Translation.getDataCol(DataCols.FoodAltDescription)].search(foodAltNamePattern);
                if (foodAltNameIndex == -1) return false;
            }

            if (foodGroup != "") {
                foodGroupIndex = row[Translation.getDataCol(DataCols.FoodGroupDescription)].search(foodGroupPattern);
                if (foodGroupIndex == -1) return false;
            }

            row[TableCols.FoodNameOrder] = foodNameIndex;
            row[TableCols.FoodAltNameOrder] = foodAltNameIndex;
            row[TableCols.FoodGroupOrder] = foodGroupIndex;

            return true;
        });

        return result;
    }

    // getFoodSearchTableData(searchOpt): Retrieves the data for the searched foods 
    getFoodSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        return this.filterFoodSearchTable(inputs[SearchAtts.FoodName], inputs[SearchAtts.FoodAltName], inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
    }

    // getFoodSearchSelectedData(searchOpt): Retrieves the data for the selected foods
    getFoodSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        return this.filterFoodSearchTable("", "", "", selectedFoods[0]);
    }

    static getConvertedNutrientColName(ind) {
        return `${TableCols.ConvertedNutrientAmount}${ind}`
    }

    convertNutrientAmounts(nutrientTable, measureWeightConv) {
        const tableColNames = {};
        const measureWeightConvLen = measureWeightConv.length;
        for (let i = 0; i < measureWeightConvLen; ++i) {
            const row = measureWeightConv[i];
            tableColNames[row[TableCols.MeasureWeightConvId]] = Model.getConvertedNutrientColName(i);
        }

        for (const row of nutrientTable) {
            for (const measureConv of measureWeightConv) {
                const measureConvId = measureConv[TableCols.MeasureWeightConvId];
                const colName = tableColNames[measureConvId];
                const conversionRate = measureConv[DataCols.MeasureWeight];
                row[colName] = row[DataCols.NutrientAmount] * conversionRate / 100;
            }
        }

        return nutrientTable;
    }

    formatNutrientTable(nutrientTable, measureWeightConvLen) {
        const convColNames = [];
        for (let i = 0; i < measureWeightConvLen; ++i) {
            convColNames.push(Model.getConvertedNutrientColName(i));
        }

        for (const row of nutrientTable) {
            const nutrientDecimalPlace = row[DataCols.NutrientDecimalPlace];

            row[DataCols.NutrientAmount] = Translation.translateNum(row[DataCols.NutrientAmount], nutrientDecimalPlace);
            row[DataCols.NutrientNoOfObservations] = Translation.translateNum(row[DataCols.NutrientNoOfObservations], 0);
            row[DataCols.NutrientStdErr] = Translation.translateNum(row[DataCols.NutrientStdErr], nutrientDecimalPlace);

            for (const convCol of convColNames) {
                row[convCol] = Translation.translateNum(row[convCol], nutrientDecimalPlace);
            }
        }

        return nutrientTable;
    }

    getFoodMeasureWeightConv(foodCode) {
        let measureWeightConv = this.getRowsById(this.measureConvTable, DataCols.FoodCode, foodCode);
        if (measureWeightConv == undefined) return;

        // add in a dummy measure for the default 100g of edible portions
        measureWeightConv.unshift({
            [DataCols.MeasureCode]: DefaultMeasureCode,
            [Translation.getDataCol(DataCols.MeasureDescription)]: Translation.translate("FoodNutrientStats.DefaultNutrientMeasure"),
            [TableCols.MeasureWeightConvId]: Model.getMeasureWeigthConvId(DataCols.FoodCode, MeasureTypeCodes.Default, DefaultMeasureCode),
            [DataCols.MeasureWeight]: 100
        });

        return measureWeightConv;
    }

    // getFoodNutrientStats(): Retrives the nutrient data for the selected foods
    getFoodNutrientStats(foodCode) {
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        let measureWeightConv = this.getFoodMeasureWeightConv(foodCode);
        if (measureWeightConv == undefined) return;

        const nutrients = this.getRowsById(this.nutrientTable, DataCols.FoodCode, foodCode);
        if (nutrients == undefined) return;

        this.webSearchedNutrientTable = this.convertNutrientAmounts(nutrients, measureWeightConv);
        this.webSearchedNutrientTable = this.formatNutrientTable(this.webSearchedNutrientTable, measureWeightConv.length);

        this.searchedNutrientData = {measureWeightConv, food, nutrients};
        return this.searchedNutrientData;
    }

    getFoodGroups() {
        let result = this.foodGroupTable.data.map((row) => row[Translation.getDataCol(DataCols.FoodGroupDescription)]);
        return new Set(result);
    }
}