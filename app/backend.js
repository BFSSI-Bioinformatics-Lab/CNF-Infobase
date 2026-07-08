import { SearchOpts, SearchAtts, DataCols, TableCols, HiddenMeasureCodes, DefaultMeasureCode, MeasureTypeCodes, NutrientStatAtts, NutrientTableCols } from "./constants.js";
import { Translation, TableTools, TextTools } from "./tools.js";


export class Model {
    constructor() {
        this.searchOpt = SearchOpts.SearchByFood;
        this.searchSelections = this.initSearchSelections();
        this.defaultSearchInputs = this.initSearchInputs();
        this.searchInputs = this.initSearchInputs();
        this.selectedFoodCodes = {};
        this.foodSelected = {
            [SearchOpts.SearchByFood]: false,
            [SearchOpts.SearchByNutrient]: false
        };

        this.nutrientStatsInputs = this.initNutrientStatsInputs();
        this.defaultNutrientStatsInputs = this.initNutrientStatsInputs();

        this.foodTable;
        this.foodGroupTable;
        this.measureConvTable;
        this.nutrientTable;
        this.nutrientNameTable;

        this.searchedNutrientData;
        this.webSearchedNutrientTable;
        this.csvSearchedNutrientTable;
    }

    clearSearchInputs(searchOpt) {
        this.searchInputs[searchOpt] = structuredClone(this.defaultSearchInputs[searchOpt]);
    }

    clearNutrientStatsInputs(searchOpt) {
        this.nutrientStatsInputs[searchOpt] = structuredClone(this.defaultNutrientStatsInputs[searchOpt]);
    }

    clearSelectedFoods(searchOpt) {
        if (this.selectedFoodCodes[searchOpt] == undefined) return;

        delete this.selectedFoodCodes[searchOpt];
        this.foodSelected[searchOpt] = false;

        this.clearNutrientStatsInputs(searchOpt);
    }

    initSearchInputs() {
        return {
            [SearchOpts.SearchByFood]: {
                [SearchAtts.FoodName]: "",
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.FoodCode]: "",
                [SearchAtts.FilterHelper]: ""
            },
            [SearchOpts.SearchByNutrient]: {
                [SearchAtts.Nutrient]: "",
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.FilterHelper]: ""
            },
            [SearchOpts.CompareNutrients]: {
                [SearchAtts.FoodGroup]: "",
                [SearchAtts.Nutrient]: []
            }
        };
    }

    initSearchSelections() {
        return {
            [SearchOpts.SearchByFood]: {
                [SearchAtts.FoodGroup]: []
            },
            [SearchOpts.SearchByNutrient]: {
                [SearchAtts.FoodGroup]: [],
                [SearchAtts.Nutrient]: []
            },
            [SearchOpts.CompareNutrients]: {
                [SearchAtts.FoodGroup]: [],
                [SearchAtts.Nutrient]: []
            }
        }
    }

    initNutrientStatsInputs() {
        return {
            [SearchOpts.SearchByFood]: {
                [NutrientStatAtts.MeasureCodesSelected]: new Set([DefaultMeasureCode]),
                [NutrientStatAtts.ShowExtraDetails]: null,
                [NutrientStatAtts.ShowUnit]: null,
            },
            [SearchOpts.SearchByNutrient]: {
                [NutrientStatAtts.MeasureCodesSelected]: new Set([DefaultMeasureCode]),
                [NutrientStatAtts.ShowExtraDetails]: null,
                [NutrientStatAtts.ShowUnit]: null,
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

    // tokenizeFoodDescription(foodDescription): Split the food description name into different tokens
    tokenizeFoodDescription(foodDescription) {
        if (foodDescription === "") return [];
        return foodDescription.toLowerCase().split(" ");
    }

    async loadFoodTable(foodNameTable, foodGroupTable) {
        this.foodGroupTable = foodGroupTable;

        // setup the food group selections
        const foodGroups = this.getFoodGroups();
        this.searchSelections[SearchOpts.SearchByFood][SearchAtts.FoodGroup] = foodGroups;
        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.FoodGroup] = structuredClone(foodGroups);
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.FoodGroup] = structuredClone(foodGroups);

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
            row[TableCols.FoodAltNameOrder] = Infinity;
            
            // tokenize the food descriptions for searching
            row[Translation.getDataCol(TableCols.FoodDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodDescription)]);
            row[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)] = this.tokenizeFoodDescription(row[Translation.getDataCol(DataCols.FoodAltDescription)]);
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
        // add the nutrient group ordering
        const nutrientGroupData = nutrientGroupTable.data;
        let currentNutrientGroupInd = 0;

        this.nutrientNameTable = nutrientNameTable;
        let nutrients = this.getNutrients();
        nutrients.sort((a, b) => a.text.localeCompare(b.text));

        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.Nutrient] = nutrients;
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.Nutrient] = structuredClone(nutrients);

        const defaultNutrient = nutrients[0].value
        this.searchInputs[SearchOpts.SearchByNutrient][SearchAtts.Nutrient] = defaultNutrient;
        this.defaultSearchInputs[SearchOpts.SearchByNutrient][SearchAtts.Nutrient] = defaultNutrient;

        // join the different parts of the nutrients
        nutrientNameTable = TableTools.dataLeftJoinById(nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(nutrientAmtTable, nutrientNameTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, nutrientSrcTable, DataCols.NutrientSrcCode, DataCols.NutrientSrcCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, this.foodTable, DataCols.FoodCode, DataCols.FoodCode);

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

    findAllExactKeywords(tokens, ahoCorasickDFA) {
        let foundKeywords = {};
        let keyword = null;
        let uniqueCount = 0;
        let foundKeywordData = null;
        let tokenLen = 0;

        for (const token of tokens) {
            tokenLen = token.length;
            foundKeywordData = TextTools.findExactKeyword(token, ahoCorasickDFA);
            if (foundKeywordData === null) continue;

            const keyword = foundKeywordData.keyword;
            if (foundKeywords[keyword] === undefined) {
                foundKeywords[keyword] = foundKeywordData.start;
                uniqueCount++;
            }

            if (uniqueCount == ahoCorasickDFA.keywordCount) {
                const minKeywordInd = Math.min(...Object.values(foundKeywords));
                return minKeywordInd;
            }
        }

        return -1;
    }

    filterFoodSearchTable(foodName, foodAltName, foodGroupCode, foodCode) {
        let result = this.foodTable.data;

        if (foodCode != "") {
            const row = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
            if (row === undefined) return [];
            result = [row];
        }

        if (foodGroupCode != "") {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        if (foodName == "" && foodAltName == "") {
            for (const row of result) {
                row[TableCols.FoodNameOrder] = Infinity;
                row[TableCols.FoodAltNameOrder] = Infinity;
                row[TableCols.FoodGroupOrder] = Infinity;
            }

            return result;
        }

        const foodNamePattern = (foodName != "") ? new RegExp(foodName, "i") : undefined;
        const foodAltNamePattern = (foodAltName != "") ? new RegExp(foodAltName, "i") : undefined;

        let foodNameAhoCorasickDFA;
        let foodNameKeywords;
        let foodNameKeywordsLen;

        if (foodName != "") {
            foodNameKeywords = Array.from(new Set(foodName.trim().split(/\s+/)));
            foodNameKeywords = foodNameKeywords.map((keyword) => keyword.toLowerCase());
            foodNameKeywordsLen = foodNameKeywords.length;

            foodNameAhoCorasickDFA = TextTools.buildAhoCorasickDFA(foodNameKeywords);
        }
        
        result = result.filter((row) => {
            let foodNameIndex = Infinity;
            let foodAltNameIndex = Infinity;

            row[TableCols.FoodNameOrder] = Infinity;
            row[TableCols.FoodAltNameOrder] = Infinity;

            if (foodName != "") {
                let foundFoodNameKeywordInd = this.findAllExactKeywords(row[Translation.getDataCol(TableCols.FoodDescriptionTokens)], foodNameAhoCorasickDFA);

                if (foundFoodNameKeywordInd == -1) {
                    foundFoodNameKeywordInd = this.findAllExactKeywords(row[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)], foodNameAhoCorasickDFA);
                    if (foundFoodNameKeywordInd == -1) return false;
                }

                foodNameIndex = foundFoodNameKeywordInd;
            }

            if (foodAltName != "") {
                foodAltNameIndex = row[Translation.getDataCol(DataCols.FoodAltDescription)].search(foodAltNamePattern);
                if (foodAltNameIndex == -1) return false;
            }

            row[TableCols.FoodNameOrder] = foodNameIndex;
            row[TableCols.FoodAltNameOrder] = foodAltNameIndex;

            return true;
        });

        return result;
    }

    filterNutrientSearchTable(nutrientCode, foodGroupCode, foodCode) {
        let result = this.nutrientTable.data;

        if (foodCode != "") {
            const row = this.getRowById(this.nutrientTable, DataCols.FoodCode, foodCode);
            if (row === undefined) return [];
            result = [row];
        }

        if (foodGroupCode != "") {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        if (nutrientCode != "") {
            result = result.filter((row) => row[DataCols.NutrientCode] == nutrientCode);
        }

        return result;
    }

    // getFoodSearchTableData(searchOpt): Retrieves the data for the searched foods 
    getFoodSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        return this.filterFoodSearchTable(inputs[SearchAtts.FoodName], "", inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
    }

    // getFoodSearchSelectedData(searchOpt): Retrieves the data for the selected foods
    getFoodSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        return this.filterFoodSearchTable("", "", "", selectedFoods[0]);
    }

    formatNutrientSearchTable(nutrientSearchTable) {
        for (const row of nutrientSearchTable) {
            const nutrientDecimalPlace = row[DataCols.NutrientDecimalPlace];
            row[DataCols.NutrientAmount] = Translation.translateNum(row[DataCols.NutrientAmount], nutrientDecimalPlace);
        }
    }

    getNutrientSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        let result = this.filterNutrientSearchTable(inputs[SearchAtts.Nutrient], inputs[SearchAtts.FoodGroup], "");
        this.formatNutrientSearchTable(result);
        return result
    }

    getNutrientSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        const inputs = this.searchInputs[searchOpt];
        let result = this.filterNutrientSearchTable("", "", selectedFoods[0]);
        this.formatNutrientSearchTable(result);
        return result;
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

            row[DataCols.FoodCode] = Number(row[DataCols.FoodCode]);
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

    getNutrientCSVDownload(food, webSearchedNutrientTable, measureWeightConv) {
        let result = [];

        // retrieve the table columns and their translations
        const nutrientColTranslations = Translation.translate("FoodNutrientStats.TableCols", { returnObjects: true });
        const tableAtts = NutrientTableCols.map((col) => Translation.getDataCol(col));
        const tableColDisplay = NutrientTableCols.map((col) => nutrientColTranslations[col]);

        const measureTableAtts = [];
        const measureColDisplay = [];
        const measureConvLen = measureWeightConv.length;

        for (let i = 0; i < measureConvLen; ++i) {
            const measureConv = measureWeightConv[i];
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) continue;

            const dataCol = Model.getConvertedNutrientColName(i);
            const currentMeasureDisplay = Translation.translate("FoodNutrientStats.ConvertedMeasureCol", {
                measureName: Translation.translateNum(measureConv[Translation.getDataCol(TableCols.MeasureDescription)]), 
                convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)
            });

            measureTableAtts.push(dataCol);
            measureColDisplay.push(currentMeasureDisplay);
        }

        tableAtts.splice(1, 0, ...measureTableAtts);
        tableColDisplay.splice(1, 0, ...measureColDisplay);

        const tableAttsLen = tableAtts.length;

        // header of the CSV
        for (let i = 0; i < 4; ++i) {
            result.push(Array(tableAttsLen).fill(null));
        }

        result[0][0] = Translation.translate("SiteName");
        result[1][0] = food[Translation.getDataCol(TableCols.FoodDescription)];
        result[2][0] = Translation.translate("FoodNutrientStats.SubTitle", { foodCode: food[DataCols.FoodCode] });

        // table headings
        result.push(tableColDisplay);

        // table data
        let nutrientGroup = "";
        let nutrientRowGroup = [];

        for (const row of webSearchedNutrientTable) {
            const currentCSVRow = [];

            // add a row for the nutrient group
            const currentNutrientGroup = row[Translation.getDataCol(DataCols.NutrientGroup)];
            if (currentNutrientGroup != nutrientGroup) {
                nutrientGroup = currentNutrientGroup;

                nutrientRowGroup = Array(tableAttsLen).fill(null);
                nutrientRowGroup[0] = nutrientGroup;
                result.push(nutrientRowGroup);
            }

            for (const tableAtt of tableAtts) {
                currentCSVRow.push(row[tableAtt]);
            }

            result.push(currentCSVRow);
        }

        // footer of the CSV
        const footer = [];
        for (let i = 0; i < 2; ++i) {
            footer.push(Array(tableAttsLen).fill(null));
        }

        const today = new Date().toLocaleDateString('en-CA');
        footer[1][0] = Translation.translate("CSVDownload.Date", {date: today});

        result.push(...footer);
        result = TableTools.createCSVContent(result);
        return result;
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

        this.csvSearchedNutrientTable = this.getNutrientCSVDownload(food, this.webSearchedNutrientTable, measureWeightConv);

        this.searchedNutrientData = {measureWeightConv, food, nutrients};
        return this.searchedNutrientData;
    }

    getFoodGroups() {
        let result = this.foodGroupTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.FoodGroupDescription)], value: row[DataCols.FoodGroupCode]}});
        return result;
    }

    getNutrients() {
        let result = this.nutrientNameTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.NutrientName)], value: row[DataCols.NutrientCode]}});
        return result;
    }

    showFoodNutrientsExtraCols(searchOpt) {
        const nutrientStatInputs = this.nutrientStatsInputs[searchOpt];
        if (nutrientStatInputs == undefined) return false;

        const showExtraColsOverride = nutrientStatInputs[NutrientStatAtts.ShowExtraDetails];
        if (showExtraColsOverride !== null) {
            return showExtraColsOverride;
        }

        return nutrientStatInputs[NutrientStatAtts.MeasureCodesSelected].size < 2;
    }

    showFoodNutrientsUnitCol(searchOpt) {
        const nutrientStatInputs = this.nutrientStatsInputs[searchOpt];
        if (nutrientStatInputs == undefined) return false;

        const showUnitOverride = nutrientStatInputs[NutrientStatAtts.ShowUnit];
        if (showUnitOverride !== null) {
            return showUnitOverride;
        }

        return nutrientStatInputs[NutrientStatAtts.MeasureCodesSelected].has(DefaultMeasureCode);
    }

    // downloadNutrientCSV(searchOpt): Downloads the CSV for the nutrient table
    downloadNutrientCSV(searchOpt) {
        const selectedFoodCodes = this.selectedFoodCodes[searchOpt];
        if (selectedFoodCodes === undefined ||  selectedFoodCodes.length == 0) return;

        const foodCode = selectedFoodCodes[0];
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        const foodName = food[Translation.getDataCol(DataCols.FoodDescription)];
        const csvFileName = Translation.translate("CSVDownload.FileName", {foodName});
        
        TableTools.downloadCSV({csvContent: this.csvSearchedNutrientTable, fileName: csvFileName});
    }
}