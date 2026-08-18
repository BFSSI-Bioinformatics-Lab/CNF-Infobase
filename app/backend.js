import { SearchOpts, SearchAtts, DataCols, TableCols, HiddenMeasureCodes, DefaultMeasureCode, MeasureTypeCodes, NutrientStatAtts, NutrientTableCols, NutrientTableExtraCols, DefaultMeasureTypeCode, RAMeasureTypeCode, HighlightedNutrientCodes } from "./constants.js";
import { Translation, TableTools, TextTools, SetTools, ListTools } from "./tools.js";


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
        this.foodNameTable;
        this.measureConvTable;
        this.nutrientTable;
        this.nutrientNameTable;

        this.searchResultData;
        this.searchedNutrientData;
        this.webSearchedNutrientTable;
        this.csvSearchedAllNutrientTable;

        this.highlightedNutrientNames = new Set();
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
                [SearchAtts.Nutrient]: [],
                [SearchAtts.FilterHelper]: ""
            },
            [SearchOpts.CompareFoods]: {
                [SearchAtts.FoodName]: []
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
            },
            [SearchOpts.CompareFoods]: {
                [SearchAtts.FoodName]: []
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
        
        const result = foodDescription.toLowerCase().split(",");
        let resultLen = result.length;
        let i = 0;

        while (i < resultLen) {
            const keywords = result[i].trim().split(" ");
            const keywordsLen = keywords.length;

            result.splice(i, 1, ...keywords);

            i += keywordsLen;
            resultLen += keywordsLen - 1;
        }

        return result;
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

    static getMeasureWeigthConvId(foodCode, measureTypeCode, measureCode) {
        return `${foodCode}_${measureTypeCode}_${measureCode}`;
    }

    static getMeasureWeightConvIdFromRow(measureWeightConvRow) {
        return Model.getMeasureWeigthConvId(measureWeightConvRow[DataCols.FoodCode], measureWeightConvRow[DataCols.MeasureTypeCode], measureWeightConvRow[DataCols.MeasureCode]);
    }

    addIndexVal(row, rowInd, indices, getIndexVal) {
        const indexVal = getIndexVal(row);
        const indexBucket = indices[indexVal];

        if (indexBucket === undefined) {
            indices[indexVal] = new Set([rowInd]);
        } else {
            indexBucket.add(rowInd);
        }
    }

    async loadMeasureConvTable(measureWeightConvTable, measureTypeTable, measureNameTable) {
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

        const indices = {
            [DataCols.FoodCode]: foodCodeIndex, 
            [DataCols.MeasureTypeCode]: measureTypeCodeIndex,
            [DataCols.MeasureCode]: measureCodeIndex
        };

        this.measureConvTable.indices = indices;

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

        const indices = {[DataCols.FoodCode]: foodCodeIndex, [DataCols.NutrientCode]: nutrientCodeIndex};
        this.nutrientTable.indices = indices;

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

        const indices = {[DataCols.NutrientCode]: nutrientCodeIndex};
        this.nutrientNameTable.indices = indices;

        const nutrientTableData = this.nutrientNameTable.data;
        const nutrientTableDataLen = nutrientTableData.length;
        
        for (let i = 0; i < nutrientTableDataLen; ++i) {
            const row = nutrientTableData[i];
            this.addIndexVal(row, i, nutrientCodeIndex, getNutrientCodeVal);
        }
    }

    static getNutrientName(nutrientWithUnit) {
        const openBracketInd = nutrientWithUnit.lastIndexOf("(");
        if (openBracketInd == -1) return nutrientWithUnit;

        let result = nutrientWithUnit.slice(0, openBracketInd);
        result = result.trim();
        return result;
    }

    async loadNutrientTable(nutrientAmtTable, nutrientNameTable, nutrientSrcTable, nutrientGroupTable) {
        // add the nutrient group ordering
        const nutrientGroupData = nutrientGroupTable.data;
        let currentNutrientGroupInd = 0;

        this.nutrientNameTable = nutrientNameTable;
        this.nutrientNameTable = TableTools.dataLeftJoinById(this.nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);

        // update which nutrients should be bolded in the nutrient table and
        //  modify the nutrient names column with the updated nutrient names
        const nutrientNameCol = Translation.getDataCol(DataCols.NutrientName);
        const nutrientNameWithUnitCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);

        for (const row of this.nutrientNameTable.data) {
            const nutrientCode = row[DataCols.NutrientCode];
            row[nutrientNameCol] = Model.getNutrientName(row[nutrientNameWithUnitCol]);

            if (HighlightedNutrientCodes.has(nutrientCode)) {
                const nutrientNameWithUnit = row[Translation.getDataCol(DataCols.NutrientNameWithUnit)]
                this.highlightedNutrientNames.add(nutrientNameWithUnit);
            }
        }

        let nutrients = this.getNutrients();
        nutrients.sort((a, b) => a.text.localeCompare(b.text));

        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.Nutrient] = nutrients;
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.Nutrient] = structuredClone(nutrients);

        // join the different parts of the nutrients
        nutrientNameTable = TableTools.dataLeftJoinById(nutrientNameTable, nutrientGroupTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(nutrientAmtTable, nutrientNameTable, DataCols.NutrientCode, DataCols.NutrientCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, nutrientSrcTable, DataCols.NutrientSrcCode, DataCols.NutrientSrcCode);
        this.nutrientTable = TableTools.dataLeftJoinById(this.nutrientTable, this.foodTable, DataCols.FoodCode, DataCols.FoodCode);

        const nutrientTableData = this.nutrientTable.data;

        // setup the indices
        this.setupNutrientTableIndices();
        this.setupNutrientNameTableIndices();
    }

    // load(): Initial load of all the required data
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

    getRowById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined || rowInds.size == 0) return;
        return table.data[SetTools.getFirst(rowInds)];
    }

    getRowsById(table, indexName, id) {
        const rowInds = table.indices[indexName][id];
        if (rowInds === undefined) return;
        return [...rowInds].map((ind) => table.data[ind]);
    }

    getRowsByIds(table, indexName, ids) {
        const indices = table.indices[indexName];
        ids = new Set(ids);
        let result = new Set();

        for (const id of ids) {
            const rowInds = indices[id];
            if (rowInds === undefined) continue;
            SetTools.union(result, rowInds);
        }

        return [...result].map((ind) => table.data[ind]);
    }

    getRowsByManyIds(table, indexData) {
        let result = null;

        for (const indexName in indexData) {
            const currentResult = new Set();
            const indices = table.indices[indexName];
            let ids = new Set(indexData[indexName]);

            for (const id of ids) {
                const rowInds = indices[id];
                if (rowInds === undefined) continue;

                SetTools.union(currentResult, rowInds);
            }

            result = (result === null) ? currentResult : SetTools.intersection(result, currentResult);
        }

        return [...result].map((ind) => table.data[ind]);
    }

    findAllExactKeywords(tokens, ahoCorasickDFA) {
        let foundKeywords = {};
        let uniqueCount = 0;
        let foundKeywordData = null;
        let tokenInd = 0;

        for (const token of tokens) {
            foundKeywordData = TextTools.findExactKeyword(token, ahoCorasickDFA);
            if (foundKeywordData === null) {
                tokenInd += token.length;
                continue;
            }

            const keyword = foundKeywordData.keyword;
            if (foundKeywords[keyword] === undefined) {
                foundKeywords[keyword] = tokenInd;
                uniqueCount++;
            }

            if (uniqueCount == ahoCorasickDFA.keywordCount) {
                const minKeywordInd = Math.min(...Object.values(foundKeywords));
                return minKeywordInd;
            }

            tokenInd += token.length;
        }

        return -1;
    }

    findCloseMatchKeywords(tokens, ahoCorasickDFA) {
        let foundKeywords = {};
        let closeMatchKeywords = {};
        let foundKeywordsCount = 0;
        let closeMatchKeywordsCount = 0;
        let uniqueCount = 0;
        let foundKeywordData = null;
        let keyword = null;
        let tokenInd = 0;

        for (const token of tokens) {
            foundKeywordData = TextTools.findPrefixedKeyword(token, ahoCorasickDFA);

            if (foundKeywordData === null) {
                tokenInd += token.length;
                continue;
            }

            const keyword = foundKeywordData.keyword;
            if (foundKeywordData.isExact) {
                if (closeMatchKeywords[keyword] !== undefined) {
                    foundKeywords[keyword] = tokenInd;
                    delete closeMatchKeywords[keyword];
                    
                    foundKeywordsCount++;
                    closeMatchKeywordsCount--;

                } else if (foundKeywords[keyword] === undefined) {
                    foundKeywords[keyword] = tokenInd;
                    uniqueCount++;
                    foundKeywordsCount++;
                }
            } else {
                if (foundKeywords[keyword] === undefined && closeMatchKeywords[keyword] === undefined) {
                    closeMatchKeywords[keyword] = tokenInd;
                    uniqueCount++;
                    closeMatchKeywordsCount++;
                }
            }

            if (uniqueCount == ahoCorasickDFA.keywordCount) {
                return {exactMatches: foundKeywords, prefixedMatches: closeMatchKeywords, exactMatchCount: foundKeywordsCount, prefixedMatchCount: closeMatchKeywordsCount};
            }

            tokenInd += token.length;
        }

        return {exactMatches: foundKeywords, prefixedMatches: closeMatchKeywords, exactMatchCount: foundKeywordsCount, prefixedMatchCount: closeMatchKeywordsCount};
    }

    findCloseFood(foodRow, foodNameAhoCorasickDFA) {
        let matchData = this.findCloseMatchKeywords(foodRow[Translation.getDataCol(TableCols.FoodDescriptionTokens)], foodNameAhoCorasickDFA);
        if ($.isEmptyObject(matchData.exactMatches) && $.isEmptyObject(matchData.prefixedMatches)) {
            matchData = this.findCloseMatchKeywords(foodRow[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)], foodNameAhoCorasickDFA);
        }

        return matchData;
    }

    findExactFood(foodRow, foodNameAhoCorasickDFA) {
        let foundFoodNameKeywordInd = this.findAllExactKeywords(foodRow[Translation.getDataCol(TableCols.FoodDescriptionTokens)], foodNameAhoCorasickDFA);

        if (foundFoodNameKeywordInd == -1) {
            foundFoodNameKeywordInd = this.findAllExactKeywords(foodRow[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)], foodNameAhoCorasickDFA);
        }

        return foundFoodNameKeywordInd;
    }

    filterFoodNameSelections(foodName, foodNameSelections) {
        let foodNameKeywords = Array.from(new Set(foodName.trim().split(/\s+/)));
        foodNameKeywords = foodNameKeywords.map((keyword) => keyword.toLowerCase());

        let foodNameAhoCorasickDFA = TextTools.buildAhoCorasickDFA(foodNameKeywords);

        let result = foodNameSelections.filter((selection) => {
            const foodRow = this.getRowById(this.foodTable, DataCols.FoodCode, selection.value);

            let matchData = this.findCloseFood(foodRow, foodNameAhoCorasickDFA);
            if ($.isEmptyObject(matchData.exactMatches) && $.isEmptyObject(matchData.prefixedMatches)) {
                selection.exactMatchCount = 0;
                selection.prefixedMatchCount = 0;
                selection.startInd = Infinity;
                return false;
            }

            selection.exactMatchCount = matchData.exactMatchCount;
            selection.prefixedMatchCount = matchData.prefixedMatchCount;
            selection.startInd = Math.min(...Object.values(matchData.exactMatches), ...Object.values(matchData.prefixedMatches));
            return true;
        });

        // Sort by:
        //  1. # of exact matches (Descending)
        //  2. # of prefix matches (Descending)
        //  3. The starting keyword of the first match (Ascending)
        //  4. The name (Alphabetical order)
        result.sort((a, b) => {
            return (
                b.exactMatchCount - a.exactMatchCount ||
                b.prefixedMatchCount - a.prefixedMatchCount ||
                a.startInd - b.startInd ||
                a.text.localeCompare(b.text)
            );
        });

        return result;
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
                let foundFoodNameKeywordInd = this.findExactFood(row, foodNameAhoCorasickDFA);
                if (foundFoodNameKeywordInd == -1) return false;
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
        const nutrientCodeIsEmpty = nutrientCode == "";

        if (nutrientCodeIsEmpty) return [];

        if (foodCode != "") {
            result = this.getRowsById(this.nutrientTable, DataCols.FoodCode, foodCode);
            if (result === undefined) return [];
        }

        if (foodGroupCode != "") {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        result = result.filter((row) => row[DataCols.NutrientCode] == nutrientCode);
        return result;
    }

    filterCompareNutrientTable(nutrientCodes, foodGroupCode) {
        let result = this.nutrientTable.data;
        const foodGroupEmpty = foodGroupCode == "";
        const nutrientCodesEmpty = nutrientCodes.length <= 0;

        if (!foodGroupEmpty) {
            result = result.filter((row) => row[DataCols.FoodGroupCode] == foodGroupCode);
        }

        if (!nutrientCodesEmpty) {
            nutrientCodes = new Set(nutrientCodes);
            result = result.filter((row) => nutrientCodes.has(row[DataCols.NutrientCode]));
        }

        if (foodGroupEmpty && nutrientCodesEmpty) {
            return [];
        }

        return result;
    }

    filterCompareFoodTable(foodCodes) {
        let result = this.nutrientTable.data;
        const foodCodesEmpty = foodCodes.length <= 0;

        if (!foodCodesEmpty) {
            foodCodes = new Set(foodCodes);
            result = result.filter((row) => foodCodes.has(row[DataCols.FoodCode]));
        } else {
            return [];
        }

        return result;
    }

    // getFoodSearchTableData(searchOpt): Retrieves the food search data for the searched inputs 
    getFoodSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        const result = this.filterFoodSearchTable(inputs[SearchAtts.FoodName], "", inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
        this.searchResultData = this.getSearchCSVDownload(searchOpt, {data: result});
        return result;
    }

    // getFoodSearchSelectedData(searchOpt): Retrieves the food search data for the selected foods
    getFoodSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        return this.filterFoodSearchTable("", "", "", selectedFoods[0]);
    }

    formatNutrientSearchTable(nutrientSearchTable) {
        for (const row of nutrientSearchTable) {
            const nutrientDecimalPlace = row[DataCols.NutrientDecimalPlace];
            row[TableCols.WeightView] = Translation.translateNum(row[DataCols.NutrientAmount], nutrientDecimalPlace);

            const conversionRate = row[DataCols.MeasureWeight];
            const nutrientAmount = row[DataCols.NutrientAmount] * conversionRate / 100;
            row[TableCols.NutrientAmountView] = Translation.translateNum(nutrientAmount, nutrientDecimalPlace);
        }
    }

    getDefaultNutrientSearchNutrientData() {
        const nutrientAmountName = Translation.translate("SearchTableCols.DefaultNutrientAmount");

        return {
            [Translation.getDataCol(DataCols.NutrientName)]: nutrientAmountName,
            [DataCols.NutrientUnitShort]: Translation.translate("SearchTableCols.DefaultNutrientUnit"),
            [DataCols.NutrientCode]: "",
            [Translation.getDataCol(DataCols.NutrientNameWithUnit)]: nutrientAmountName
        };
    }

    getNutrientSearchNutrientData(nutrientCode) {
        if (nutrientCode == "") return this.getDefaultNutrientSearchNutrientData();

        const result = this.getRowById(this.nutrientNameTable, DataCols.NutrientCode, nutrientCode);
        if (result === undefined) return this.getDefaultNutrientSearchNutrientData();
        return result;
    }

    // getNutrientSearchTableData(searchOpt): Retrieves the nutrient search data for the searched inputs
    getNutrientSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        const nutrientCode = inputs[SearchAtts.Nutrient];
        let result = this.filterNutrientSearchTable(nutrientCode, inputs[SearchAtts.FoodGroup], "");

        const foodCodes = new Set(result.map((row) => row[DataCols.FoodCode]));
        const measureWeightConv = this.getFoodsRAMeasureWeightConv(foodCodes);

        result = TableTools.leftJoinById(result, measureWeightConv, DataCols.FoodCode);

        this.formatNutrientSearchTable(result);
        this.searchResultData = this.getSearchCSVDownload(searchOpt, {data: result});

        const nutrientData = this.getNutrientSearchNutrientData(nutrientCode);
        return {data: result, nutrientData};
    }

    // getNutrientSearchSelectedData(searchOpt): Retrieves the nutrient search data for the selected food
    getNutrientSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        const inputs = this.searchInputs[searchOpt];

        const nutrientCode = inputs[SearchAtts.Nutrient];
        const nutrientData = this.getNutrientSearchNutrientData(nutrientCode);

        if (selectedFoods === undefined || selectedFoods.length == 0) return {data: [], nutrientData};

        const selectedFood = selectedFoods[0];

        let result = this.filterNutrientSearchTable(nutrientCode, "", selectedFood);
        const measureWeightConv = this.getFoodsRAMeasureWeightConv([selectedFood]);
        result = TableTools.leftJoinById(result, measureWeightConv, DataCols.FoodCode, DataCols.FoodCode);

        this.formatNutrientSearchTable(result);
        return {data: result, nutrientData};
    }

    // getCompareFoodTableData(searchOpt): Retrieves the search data for the compare by foods page
    getCompareFoodTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        let result = this.filterCompareFoodTable(inputs[SearchAtts.FoodName]);

        // get the data for the foods
        const foodCodes = inputs[SearchAtts.FoodName];
        const foodNameData = this.getRowsByIds(this.foodNameTable, DataCols.FoodCode, foodCodes);
        const foodColNames = {};

        if (result.length == 0) {
            result = {data: [], foodNames: foodNameData};
            this.searchResultData = this.getSearchCSVDownload(searchOpt, result);
            return result;
        };

        for (const foodCode of foodCodes) {
            foodColNames[foodCode] = Model.getCompareFoodAmtColName(foodCode);
        }

        // group the data by nutrient
        const groupedResult = d3.nest()
            .key((row) => row[DataCols.NutrientCode])
            .key((row) => row[DataCols.FoodCode])
            .object(result);

        result.length = 0;
        const nutrientNameCol = Translation.getDataCol(DataCols.NutrientNameWithUnit);
        const nutrientGroupNameCol = Translation.getDataCol(DataCols.NutrientGroup);

        for (const foodCode in groupedResult) {
            const currentFoodData = groupedResult[foodCode];
            const currentFoods = Object.keys(currentFoodData);
            const nutrientRow = currentFoodData[currentFoods[0]][0];
            let rowError = false;

            const row = {
                [DataCols.NutrientCode]: nutrientRow[DataCols.FoodCode],
                [nutrientNameCol]: nutrientRow[nutrientNameCol],
                [nutrientGroupNameCol]: nutrientRow[nutrientGroupNameCol],
                [DataCols.NutrientOrder]: nutrientRow[DataCols.NutrientOrder]
            };

            for (const foodCode of foodCodes) {
                const foodColName = foodColNames[foodCode];
                const foodRows = currentFoodData[foodCode];

                if (foodRows == undefined) {
                    row[foodColName] = Translation.translateNum("");
                    continue;
                }

                const foodRow = foodRows[0];
                const foodDecimalPlace = foodRow[DataCols.NutrientDecimalPlace];
                row[foodColName] = Translation.translateNum(foodRow[DataCols.NutrientAmount], foodDecimalPlace);
            }

            if (rowError) continue;
            result.push(row);
        }

        result = {data: result, foodNames: foodNameData};
        this.searchResultData = this.getSearchCSVDownload(searchOpt, result);
        return result;
    }

    // getCompareNutrientTableData(searchOpt): Retrieves the search data for the compare by nutrient page
    getCompareNutrientTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        let result = this.filterCompareNutrientTable(inputs[SearchAtts.Nutrient], inputs[SearchAtts.FoodGroup]);

        // get the data for the nutrients
        const nutrientCodes = inputs[SearchAtts.Nutrient];
        const nutrientNameData = this.getRowsByIds(this.nutrientNameTable, DataCols.NutrientCode, nutrientCodes);
        const nutrientColNames = {};

        if (result.length == 0) {
            result = {data: [], nutrientNames: nutrientNameData};
            this.searchResultData = this.getSearchCSVDownload(searchOpt, result);
            return result;
        };

        for (const nutrientCode of nutrientCodes) {
            nutrientColNames[nutrientCode] = Model.getCompareNutrientAmtColName(nutrientCode);
        }

        // group the data by food
        const groupedResult = d3.nest()
            .key((row) => row[DataCols.FoodCode])
            .key((row) => row[DataCols.NutrientCode])
            .object(result);

        result.length = 0;
        const foodDescriptionCol = Translation.getDataCol(DataCols.FoodDescription);
        const foodAltDescriptionCol = Translation.getDataCol(DataCols.FoodAltDescription);
        const foodGroupCol = Translation.getDataCol(DataCols.FoodGroupDescription);

        for (const foodCode in groupedResult) {
            const currentNutrientData = groupedResult[foodCode];
            const currentNutrients = Object.keys(currentNutrientData);
            const foodRow = currentNutrientData[currentNutrients[0]][0];
            let rowError = false;

            const row = {
                [DataCols.FoodCode]: foodRow[DataCols.FoodCode],
                [foodGroupCol]: foodRow[foodGroupCol],
                [foodDescriptionCol]: foodRow[foodDescriptionCol],
                [foodAltDescriptionCol]: foodRow[foodAltDescriptionCol]
            };

            for (const nutrientCode of nutrientCodes) {
                const nutrientAmtColName = nutrientColNames[nutrientCode];
                const nutrientRows = currentNutrientData[nutrientCode];
                if (nutrientRows == undefined) {
                    rowError = true;
                    break;
                }

                const nutrientRow = nutrientRows[0];
                const nutrientDecimalPlace = nutrientRow[DataCols.NutrientDecimalPlace];
                row[nutrientAmtColName] = Translation.translateNum(nutrientRow[DataCols.NutrientAmount], nutrientDecimalPlace);
            }

            if (rowError) continue;
            result.push(row);
        }

        result = {data: result, nutrientNames: nutrientNameData};
        this.searchResultData = this.getSearchCSVDownload(searchOpt, result);
        return result;
    }

    static getConvertedNutrientColName(ind) {
        return `${TableCols.ConvertedNutrientAmount}${ind}`;
    }

    static getCompareNutrientAmtColName(nutrientCode) {
        return `${TableCols.CompareNutrient}${nutrientCode}`;
    }

    static getCompareFoodAmtColName(foodCode) {
        return `${TableCols.CompareFood}${foodCode}`;
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

            row[TableCols.FoodCodeView] = Number(row[DataCols.FoodCode]);
            row[TableCols.NutrientAmountView] = Translation.translateNum(row[DataCols.NutrientAmount], nutrientDecimalPlace);
            row[TableCols.NutrientNoOfObservationsView] = Translation.translateNum(row[DataCols.NutrientNoOfObservations], 0);
            row[TableCols.NutrientStdErrView] = Translation.translateNum(row[DataCols.NutrientStdErr], nutrientDecimalPlace);

            for (const convCol of convColNames) {
                row[convCol] = Translation.translateNum(row[convCol], nutrientDecimalPlace);
            }
        }

        return nutrientTable;
    }

    // add100gMeasureWeightConv(measureWeightConv) add in a dummy measure for the default 100g of edible portions
    add100gMeasureWeightConv(measureWeightConv, foodCode = null, toEnd = false) {
        const result = {
            [DataCols.MeasureCode]: DefaultMeasureCode,
            [DataCols.MeasureTypeCode]: DefaultMeasureTypeCode,
            [Translation.getDataCol(DataCols.MeasureDescription)]: Translation.translate("FoodNutrientStats.DefaultNutrientMeasure"),
            [TableCols.MeasureWeightConvId]: Model.getMeasureWeigthConvId(DataCols.FoodCode, MeasureTypeCodes.Default, DefaultMeasureCode),
            [DataCols.MeasureWeight]: 100
        }

        if (foodCode !== null) {
            result[DataCols.FoodCode] = foodCode;
        }
        
        if (toEnd) {
            measureWeightConv.push(result);
        } else {
            measureWeightConv.unshift(result);  
        }
    }

    getFoodMeasureWeightConv(foodCode, measureCodes = null) {
        let measureWeightConv = this.getRowsById(this.measureConvTable, DataCols.FoodCode, foodCode);
        if (measureWeightConv == undefined) return;

        this.add100gMeasureWeightConv(measureWeightConv);
        if (measureCodes !== null) {
            measureWeightConv = measureWeightConv.filter((row) => measureCodes.has(row[DataCols.MeasureCode]));
        }

        const result = {};
        for (const conv of measureWeightConv) {
            const measureName = conv[Translation.getDataCol(DataCols.MeasureDescription)];
            const currentConv = result[measureName];

            if (currentConv == undefined || currentConv[DataCols.MeasureTypeCode] != RAMeasureTypeCode) {
                result[measureName] = conv;
            }
        }

        return Object.values(result);
    }

    getFoodsRAMeasureWeightConv(foodCodes, addDefaultOnNoFound = true) {
        let measureWeightConv = this.getRowsByManyIds(this.measureConvTable, {[DataCols.MeasureTypeCode]: [RAMeasureTypeCode], [DataCols.FoodCode]: foodCodes});
        if (measureWeightConv == undefined) return;

        let temper = this.getRowsByIds(this.measureConvTable, DataCols.FoodCode, foodCodes);
        temper = temper.filter((row) => row[DataCols.MeasureTypeCode] == RAMeasureTypeCode);

        if (!addDefaultOnNoFound) return measureWeightConv;

        const seen = new Set();
        const duplicates = measureWeightConv.filter(item => {
            const id = `${item[DataCols.FoodCode]}_${item[DataCols.MeasureTypeCode]}`;

            if (seen.has(id)) {
                return true;
            }
            seen.add(id);
            return false;
        });

        const foundRAFoodCodes = new Set(measureWeightConv.map((row) => row[DataCols.FoodCode]));
        const missingFoodCodes = new Set(foodCodes);
        SetTools.difference([missingFoodCodes, foundRAFoodCodes]);

        for (const foodCode of missingFoodCodes) {
            this.add100gMeasureWeightConv(measureWeightConv, foodCode, true);
        }

        return measureWeightConv;
    }

    getSearchCSVDownload(searchOpt, searchTable) {
        let translations = Translation.translate(`SearchTableCols`,{ returnObjects: true });
        translations = translations[searchOpt];
        if (translations === undefined) return null;

        let tableAtts = [];
        let tableColDisplay = [];

        for (const tableCol in translations) {
            tableAtts.push(Translation.getDataCol(tableCol));
            tableColDisplay.push(translations[tableCol]);
        }

        if (searchOpt == SearchOpts.CompareNutrients) {
            const nutrientNameData = searchTable.nutrientNames;
            for (const nutrientNameDatum of nutrientNameData) {
                const nutrientCode = nutrientNameDatum[DataCols.NutrientCode];
                const nutrientName = nutrientNameDatum[Translation.getDataCol(DataCols.NutrientNameWithUnit)];

                const dataCol = Model.getCompareNutrientAmtColName(nutrientCode);
                tableAtts.push(dataCol);
                tableColDisplay.push(nutrientName);
            }
        } else if (searchOpt == SearchOpts.CompareFoods) {
            const foodNameData = searchTable.foodNames;
            for (const foodNameDatum of foodNameData) {
                const foodCode = foodNameDatum[DataCols.FoodCode];
                const foodName = foodNameDatum[Translation.getDataCol(DataCols.FoodDescription)];

                const dataCol = Model.getCompareFoodAmtColName(foodCode);
                const colName = Translation.translate("SearchTableCols.FoodName", {foodName, foodCode});

                tableAtts.push(dataCol);
                tableColDisplay.push(colName);
            }
        }

        const headerRow = [];
        let result = [headerRow];

        for (const display of tableColDisplay) {
            headerRow.push(display);
        }

        const tableData = searchTable.data;

        // sort nutrients by their nutrient order
        if (searchOpt == SearchOpts.CompareFoods) {
            tableData.sort((rowA, rowB) => rowA[DataCols.NutrientOrder] - rowB[DataCols.NutrientOrder]);
        }

        for (const row of tableData) {
            const currentRow = [];

            for (const tableAtt of tableAtts) {
                currentRow.push(row[tableAtt]);
            }

            result.push(currentRow);
        }

        result = TableTools.createCSVContent(result);
        return result;
    }

    getNutrientCSVDownload(food, webSearchedNutrientTable, measureWeightConv, nutrientStatsInputs = null) {
        let result = [];

        // retrieve the table columns and their translations
        const nutrientColTranslations = Translation.translate("FoodNutrientStats.TableCols", { returnObjects: true });

        let nutrientTableCols = NutrientTableCols;
        if (nutrientStatsInputs !== null) {
            nutrientTableCols = nutrientTableCols.filter((tableCol) => {
                const isExtraCol = NutrientTableExtraCols.has(tableCol);
                return ((isExtraCol && this.showFoodNutrientsExtraCols(nutrientStatsInputs)) || !isExtraCol);
            });
        }

        const tableAtts = nutrientTableCols.map((col) => Translation.getDataCol(col));
        const tableColDisplay = nutrientTableCols.map((col) => nutrientColTranslations[col]);

        const measureTableAtts = [];
        const measureColDisplay = [];
        let defaultMeasureTableAtt = null;
        let defaultMeasureColDisplay = null;
        const measureConvLen = measureWeightConv.length;

        for (let i = 0; i < measureConvLen; ++i) {
            const measureConv = measureWeightConv[i];
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) continue;

            const dataCol = Model.getConvertedNutrientColName(i);
            const currentMeasureDisplay = Translation.translate("FoodNutrientStats.ConvertedMeasureCol", {
                measureName: Translation.translateNum(measureConv[Translation.getDataCol(TableCols.MeasureDescription)]), 
                convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)
            });

            const measureCode = measureConv[DataCols.MeasureCode];
            if (measureCode == DefaultMeasureCode) {
                defaultMeasureTableAtt = dataCol;
                defaultMeasureColDisplay = currentMeasureDisplay;
            } else {
                measureTableAtts.push(dataCol);
                measureColDisplay.push(currentMeasureDisplay);
            }
        }

        if (defaultMeasureTableAtt !== null) {
            tableAtts.splice(1, 0, defaultMeasureTableAtt);
        }

        if (defaultMeasureColDisplay !== null) {
            tableColDisplay.splice(1, 0, defaultMeasureColDisplay);
        }

        tableAtts.push(...measureTableAtts);
        tableColDisplay.push(...measureColDisplay);

        const tableAttsLen = tableAtts.length;

        // header of the CSV
        for (let i = 0; i < 4; ++i) {
            result.push(Array(tableAttsLen).fill(null));
        }

        result[0][0] = Translation.translate("SiteName");
        result[1][0] = food[Translation.getDataCol(TableCols.FoodDescription)];
        result[2][0] = Translation.translate("FoodNutrientStats.SubTitle", { foodCode: food[DataCols.FoodCode] });

        // sort nutrient by their nutrient order
        webSearchedNutrientTable.sort((rowA, rowB) => rowA[DataCols.NutrientOrder] - rowB[DataCols.NutrientOrder]);

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

    // getFoodNutrientStats(foodCode, searchOpt): Retrives the nutrient data for the selected foods
    getFoodNutrientStats(foodCode, searchOpt) {
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        let measureWeightConv = this.getFoodMeasureWeightConv(foodCode);
        if (measureWeightConv == undefined) return;

        const nutrients = this.getRowsById(this.nutrientTable, DataCols.FoodCode, foodCode);
        if (nutrients == undefined) return;

        // set the default selected nutrient
        if (searchOpt == SearchOpts.SearchByNutrient) {
            const selectedMeasureCodes = this.nutrientStatsInputs[searchOpt][NutrientStatAtts.MeasureCodesSelected];
            selectedMeasureCodes.clear();

            let raMeasureCodes = measureWeightConv.filter((conv) => conv[DataCols.MeasureTypeCode] == RAMeasureTypeCode);
            if (raMeasureCodes.length == 0) {
                selectedMeasureCodes.add(DefaultMeasureCode);
            } else {
                selectedMeasureCodes.add(raMeasureCodes[0][DataCols.MeasureCode]);
            }
        }
        
        // format the data
        this.webSearchedNutrientTable = this.convertNutrientAmounts(nutrients, measureWeightConv);
        this.webSearchedNutrientTable = this.formatNutrientTable(this.webSearchedNutrientTable, measureWeightConv.length);

        this.csvSearchedAllNutrientTable = this.getNutrientCSVDownload(food, this.webSearchedNutrientTable, measureWeightConv);

        this.searchedNutrientData = {measureWeightConv, food, nutrients};
        return this.searchedNutrientData;
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

    getNutrients() {
        let result = this.nutrientNameTable.data.map((row) => { return {text: row[Translation.getDataCol(DataCols.NutrientNameWithUnit)], value: row[DataCols.NutrientCode]}});
        return result;
    }

    showFoodNutrientsExtraColsFromSearchOpt(searchOpt) {
        const nutrientStatInputs = this.nutrientStatsInputs[searchOpt];
        if (nutrientStatInputs == undefined) return false;

        return this.showFoodNutrientsExtraCols(nutrientStatInputs);
    }

    showFoodNutrientsExtraCols(nutrientStatInputs) {
        if (nutrientStatInputs == undefined) return false;

        const showExtraColsOverride = nutrientStatInputs[NutrientStatAtts.ShowExtraDetails];
        if (showExtraColsOverride !== null) {
            return showExtraColsOverride;
        }

        const measureCodesSelected = nutrientStatInputs[NutrientStatAtts.MeasureCodesSelected];
        return (measureCodesSelected.size == 0 || (measureCodesSelected.size == 1 && SetTools.getFirst(measureCodesSelected) == DefaultMeasureCode)); 
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

    // downloadSearchCSV(): Downloads the CSV for the search table
    downloadSearchCSV() {
        const csvFileName = Translation.translate("CSVDownload.SearchFileName");
        TableTools.downloadCSV({csvContent: this.searchResultData, fileName: csvFileName});
    }

    // downloadAllNutrientCSV(searchOpt): Downloads the CSV for all the serving sizes in the nutrient table
    downloadAllNutrientCSV(searchOpt) {
        const selectedFoodCodes = this.selectedFoodCodes[searchOpt];
        if (selectedFoodCodes === undefined ||  selectedFoodCodes.length == 0) return;

        const foodCode = selectedFoodCodes[0];
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        const foodName = food[Translation.getDataCol(DataCols.FoodDescription)];
        const csvFileName = Translation.translate("CSVDownload.AllNutrientFileName", {foodName});
        
        TableTools.downloadCSV({csvContent: this.csvSearchedAllNutrientTable, fileName: csvFileName});
    }

    // downloadNutrientCSV(searchOpt): Downloads the CSV for the selected serving sizes in the nutrient table
    downloadNutrientCSV(searchOpt) {
        const selectedFoodCodes = this.selectedFoodCodes[searchOpt];
        if (selectedFoodCodes === undefined ||  selectedFoodCodes.length == 0) return;

        const nutrientStatsInputs = this.nutrientStatsInputs[searchOpt];
        if (nutrientStatsInputs === undefined) return;

        const measureCodesSelected = nutrientStatsInputs[NutrientStatAtts.MeasureCodesSelected];
        if (measureCodesSelected == undefined) return;

        const foodCode = selectedFoodCodes[0];
        let food = this.getRowById(this.foodTable, DataCols.FoodCode, foodCode);
        if (food == undefined) return;

        const foodName = food[Translation.getDataCol(DataCols.FoodDescription)];
        const csvFileName = Translation.translate("CSVDownload.NutrientFileName", {foodName});

        let measureWeightConv = this.getFoodMeasureWeightConv(foodCode, measureCodesSelected);

        const nutrientStatInputs = this.nutrientStatsInputs[searchOpt];
        const csvTable = this.getNutrientCSVDownload(food, this.webSearchedNutrientTable, measureWeightConv, nutrientStatInputs);
        TableTools.downloadCSV({csvContent: csvTable, fileName: csvFileName});
    }
}