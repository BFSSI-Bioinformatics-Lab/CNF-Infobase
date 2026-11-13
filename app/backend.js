import { SearchOpts, SearchAtts, DataCols, TableCols, HiddenMeasureCodes, DefaultMeasureCode, MeasureTypeCodes, NutrientStatAtts, NutrientTableCols, NutrientTableExtraCols, DefaultMeasureTypeCode, RAMeasureTypeCode, HighlightedNutrientCodes, DataSources } from "./constants.js";
import { Translation, TableTools, TextTools, SetTools, ListTools, EnvTools } from "./tools.js";
import { FileDataLoader } from "./dataLoaders/fileDataLoader.js";
import { APIDataLoader } from "./dataLoaders/apiDataLoader.js";


// Model: The backend of the app
// Note:
// - The tables are retrieved through the data loader ('dataLoader'), which is some subclass of BaseDataLoader:
//   * FileDataLoader: retrieves the data from the CSV files
//   * APIDataLoader: retrieves the data from the backend API
//
// - If no data loader is given, the data loader is chosen in 'load' by 'DataSource' in env.js. The CSV files are used
//   if env.js is not provided or 'DataSource' is not set. If the data cannot be loaded from the API, the CSV files are used instead
export class Model {
    constructor(DataLoaderClass = null) {
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

        this.dataLoader = (DataLoaderClass === null) ? undefined : new DataLoaderClass(this);

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

    static getMeasureWeigthConvId(foodCode, measureTypeCode, measureCode) {
        return `${foodCode}_${measureTypeCode}_${measureCode}`;
    }

    static getMeasureWeightConvIdFromRow(measureWeightConvRow) {
        return Model.getMeasureWeigthConvId(measureWeightConvRow[DataCols.FoodCode], measureWeightConvRow[DataCols.MeasureTypeCode], measureWeightConvRow[DataCols.MeasureCode]);
    }

    static getNutrientName(nutrientWithUnit) {
        const openBracketInd = nutrientWithUnit.lastIndexOf("(");
        if (openBracketInd == -1) return nutrientWithUnit;

        let result = nutrientWithUnit.slice(0, openBracketInd);
        result = result.trim();
        return result;
    }

    // getDefaultDataLoaderClass(): Retrieves the data loader set by 'DataSource' in env.js
    //  (FileDataLoader if env.js is not provided or 'DataSource' is not set)
    static async getDefaultDataLoaderClass() {
        const env = await EnvTools.load();
        return (env.DataSource == DataSources.API) ? APIDataLoader : FileDataLoader;
    }

    // load(): Initial load of all the required data
    // Note: If the data cannot be loaded from the API (eg. the API is down), the data is loaded from the CSV files instead
    async load() {
        if (this.dataLoader === undefined) {
            const DataLoaderClass = await Model.getDefaultDataLoaderClass();
            this.dataLoader = new DataLoaderClass(this);
        }

        try {
            await this.loadData();
        } catch (error) {
            if (this.dataLoader instanceof FileDataLoader) throw error;

            console.warn("Unable to load the data from the API. Loading the data from the CSV files instead.", error);
            this.dataLoader = new FileDataLoader(this);
            await this.loadData();
        }
    }

    // loadData(): Loads the data needed at startup from the data loader
    async loadData() {
        await this.dataLoader.load();

        const [foodGroups, foodNames, nutrients, highlightedNutrientNames] = await Promise.all([
            this.dataLoader.getFoodGroups(),
            this.dataLoader.getFoodNames(),
            this.dataLoader.getNutrients(),
            this.dataLoader.getHighlightedNutrientNames()
        ]);

        // setup the selections for the dropdowns
        this.searchSelections[SearchOpts.SearchByFood][SearchAtts.FoodGroup] = foodGroups;
        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.FoodGroup] = structuredClone(foodGroups);
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.FoodGroup] = structuredClone(foodGroups);
        this.searchSelections[SearchOpts.CompareFoods][SearchAtts.FoodName] = foodNames;

        this.searchSelections[SearchOpts.SearchByNutrient][SearchAtts.Nutrient] = nutrients;
        this.searchSelections[SearchOpts.CompareNutrients][SearchAtts.Nutrient] = structuredClone(nutrients);

        this.highlightedNutrientNames = highlightedNutrientNames;
    }

    // findAllKeywords(tokens, ahoCorasick): Checks if 'tokens' contains all the keywords from 'ahoCorasickDFA'
    //  and retrieves the starting index of the first keyword found. Otherwise will return -1 if not all the
    //  keywords are found in 'tokens'
    findAllKeywords(tokens, ahoCorasickDFA) {
        let foundKeywords = {};
        let uniqueCount = 0;
        let foundKeywordData = null;
        let tokenInd = 0;

        for (const token of tokens) {
            foundKeywordData = TextTools.findKeyword(token, ahoCorasickDFA);
            if (foundKeywordData === null) {
                tokenInd += token.length;
                continue;
            }

            const keyword = foundKeywordData.keyword;
            if (foundKeywords[keyword] === undefined) {
                foundKeywords[keyword] = tokenInd + foundKeywordData.start;
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

    // findCloseMatchKeywords(tokens, ahoCorasick): Checks if 'tokens' has keywords that prefix matches any of the keywords from 'ahoCorasickDFA'
    // and keeps track of how many keywords in 'tokens' are exact matches/prefix matches 
    findCloseMatchKeywords(tokens, ahoCorasickDFA) {
        let foundKeywords = {};
        let closeMatchKeywords = {};
        let foundKeywordsCount = 0;
        let closeMatchKeywordsCount = 0;
        let uniqueCount = 0;
        let foundKeywordData = null;
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

    // findCloseFood(foodrow, foodNameAhoCorasickDFA): Finds food names that closely match to the keywords in 'foodnameAhocorasickDFA'
    findCloseFood(foodRow, foodNameAhoCorasickDFA) {
        let matchData = this.findCloseMatchKeywords(foodRow[Translation.getDataCol(TableCols.FoodDescriptionTokens)], foodNameAhoCorasickDFA);
        if ($.isEmptyObject(matchData.exactMatches) && $.isEmptyObject(matchData.prefixedMatches)) {
            matchData = this.findCloseMatchKeywords(foodRow[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)], foodNameAhoCorasickDFA);
        }

        return matchData;
    }

    // findContainsFood(foodRow, foodNameAhoCorasickDFA): Finds the food names that all contains the keywords in 'foodnameAhoCorasickDFA'
    findContainsFood(foodRow, foodNameAhoCorasickDFA) {
        let foundFoodNameKeywordInd = this.findAllKeywords(foodRow[Translation.getDataCol(TableCols.FoodDescriptionTokens)], foodNameAhoCorasickDFA);

        if (foundFoodNameKeywordInd == -1) {
            foundFoodNameKeywordInd = this.findAllKeywords(foodRow[Translation.getDataCol(TableCols.FoodAltDescriptionTokens)], foodNameAhoCorasickDFA);
        }

        return foundFoodNameKeywordInd;
    }

    async filterFoodNameSelections(foodName, foodNameSelections) {
        let foodNameKeywords = new Set(this.dataLoader.tokenizeFoodDescription(foodName));
        foodNameKeywords.delete(""); // The AhoCorasick library we are using does not accept the empty strings

        foodNameKeywords = Array.from(foodNameKeywords);
        foodNameKeywords = foodNameKeywords.map((keyword) => keyword.toLowerCase());

        let foodNameAhoCorasickDFA = TextTools.buildAhoCorasickDFA(foodNameKeywords);

        const foodRows = await Promise.all(foodNameSelections.map((selection) => this.dataLoader.getFoodByCode(selection.value)));

        let result = foodNameSelections.filter((selection, selectionInd) => {
            const foodRow = foodRows[selectionInd];

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

    async filterFoodSearchTable(foodName, foodAltName, foodGroupCode, foodCode) {
        let result = await this.dataLoader.filterFoodSearchTableByCodes(foodGroupCode, foodCode);

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
                let foundFoodNameKeywordInd = this.findContainsFood(row, foodNameAhoCorasickDFA);
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

    // getFoodSearchTableData(searchOpt): Retrieves the food search data for the searched inputs 
    async getFoodSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        const result = await this.filterFoodSearchTable(inputs[SearchAtts.FoodName], "", inputs[SearchAtts.FoodGroup], inputs[SearchAtts.FoodCode]);
        this.searchResultData = this.getSearchCSVDownload(searchOpt, {data: result});
        return result;
    }

    // getFoodSearchSelectedData(searchOpt): Retrieves the food search data for the selected foods
    async getFoodSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        if (selectedFoods === undefined || selectedFoods.length == 0) return [];

        return await this.filterFoodSearchTable("", "", "", selectedFoods[0]);
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

    async getNutrientSearchNutrientData(nutrientCode) {
        if (nutrientCode == "") return this.getDefaultNutrientSearchNutrientData();

        const result = await this.dataLoader.getNutrientByCode(nutrientCode);
        if (result === undefined) return this.getDefaultNutrientSearchNutrientData();
        return result;
    }

    // getNutrientSearchTableData(searchOpt): Retrieves the nutrient search data for the searched inputs
    async getNutrientSearchTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        const nutrientCode = inputs[SearchAtts.Nutrient];
        let result = await this.dataLoader.filterNutrientSearchTable(nutrientCode, inputs[SearchAtts.FoodGroup], "");

        const foodCodes = new Set(result.map((row) => row[DataCols.FoodCode]));
        const measureWeightConv = await this.getFoodsRAMeasureWeightConv(foodCodes);

        result = TableTools.leftJoinById(result, measureWeightConv, DataCols.FoodCode);

        this.formatNutrientSearchTable(result);
        this.searchResultData = this.getSearchCSVDownload(searchOpt, {data: result}, false);

        const nutrientData = await this.getNutrientSearchNutrientData(nutrientCode);
        return {data: result, nutrientData};
    }

    // getNutrientSearchSelectedData(searchOpt): Retrieves the nutrient search data for the selected food
    async getNutrientSearchSelectedData(searchOpt) {
        const selectedFoods = this.selectedFoodCodes[searchOpt];
        const inputs = this.searchInputs[searchOpt];

        const nutrientCode = inputs[SearchAtts.Nutrient];
        const nutrientData = await this.getNutrientSearchNutrientData(nutrientCode);

        if (selectedFoods === undefined || selectedFoods.length == 0) return {data: [], nutrientData};

        const selectedFood = selectedFoods[0];

        let result = await this.dataLoader.filterNutrientSearchTable(nutrientCode, "", selectedFood);
        const measureWeightConv = await this.getFoodsRAMeasureWeightConv([selectedFood]);
        result = TableTools.leftJoinById(result, measureWeightConv, DataCols.FoodCode, DataCols.FoodCode);

        this.formatNutrientSearchTable(result);
        return {data: result, nutrientData};
    }

    // getCompareFoodTableData(searchOpt): Retrieves the search data for the compare by foods page
    async getCompareFoodTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        let result = await this.dataLoader.filterCompareFoodTable(inputs[SearchAtts.FoodName]);

        // get the data for the foods
        const foodCodes = inputs[SearchAtts.FoodName];
        const foodNameData = await this.dataLoader.getFoodNamesByCodes(foodCodes);
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
    async getCompareNutrientTableData(searchOpt) {
        const inputs = this.searchInputs[searchOpt];
        let result = await this.dataLoader.filterCompareNutrientTable(inputs[SearchAtts.Nutrient], inputs[SearchAtts.FoodGroup]);

        // get the data for the nutrients
        const nutrientCodes = inputs[SearchAtts.Nutrient];
        const nutrientNameData = await this.dataLoader.getNutrientNamesByCodes(nutrientCodes);
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

    static getConvertedNutrientColName(convertedNutrientId) {
        return `${TableCols.ConvertedNutrientAmount}${convertedNutrientId}`;
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
            const measureWeightConvId = row[TableCols.MeasureWeightConvId];
            tableColNames[measureWeightConvId] = Model.getConvertedNutrientColName(measureWeightConvId);
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

    formatNutrientTable(nutrientTable, measureWeightConv) {
        const convColNames = [];
        for (const row of measureWeightConv) {
            convColNames.push(Model.getConvertedNutrientColName(row[TableCols.MeasureWeightConvId]));
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

    async getFoodsRAMeasureWeightConv(foodCodes, addDefaultOnNoFound = true) {
        let measureWeightConv = await this.dataLoader.getRAMeasureWeightConvByFoodCodes(foodCodes);
        if (measureWeightConv == undefined) return;

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

    getSearchCSVDownload(searchOpt, searchTable, toStr = true) {
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

        const tableAttsLen = tableAtts.length;
        let result = [];

        // header of the CSV
        for (let i = 0; i < 2; ++i) {
            result.push(Array(tableAttsLen).fill(null));
        }

        result[0][0] = Translation.translate("SiteName");

        // table heading
        const tableHeading = [];
        result.push(tableHeading);

        for (const display of tableColDisplay) {
            tableHeading.push(display);
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

        // footer of the CSV
        const footer = [];
        for (let i = 0; i < 2; ++i) {
            footer.push(Array(tableAttsLen).fill(null));
        }

        const today = new Date().toLocaleDateString('en-CA');
        footer[1][0] = Translation.translate("CSVDownload.Date", {date: today});

        result.push(...footer);

        if (toStr) {
            result = TableTools.createCSVContent(result);
        }

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

        for (const measureConv of measureWeightConv) {
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) continue;
            
            const measureConvId = measureConv[TableCols.MeasureWeightConvId];
            const dataCol = Model.getConvertedNutrientColName(measureConvId);
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
    async getFoodNutrientStats(foodCode, searchOpt) {
        let food = await this.dataLoader.getFoodByCode(foodCode);
        if (food == undefined) return;

        let measureWeightConv = await this.dataLoader.getFoodMeasureWeightConv(foodCode);
        if (measureWeightConv == undefined) return;

        const nutrients = await this.dataLoader.getNutrientsByFoodCode(foodCode);
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
        this.webSearchedNutrientTable = this.formatNutrientTable(this.webSearchedNutrientTable, measureWeightConv);

        this.csvSearchedAllNutrientTable = this.getNutrientCSVDownload(food, this.webSearchedNutrientTable, measureWeightConv);

        this.searchedNutrientData = {measureWeightConv, food, nutrients};
        return this.searchedNutrientData;
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
    downloadSearchCSV(searchOpt) {
        if (searchOpt == SearchOpts.SearchByNutrient) {
            this.searchResultData = TableTools.createCSVContent(this.searchResultData);
        }

        const csvFileName = Translation.translate("CSVDownload.SearchFileName");
        TableTools.downloadCSV({csvContent: this.searchResultData, fileName: csvFileName});
    }

    // downloadAllNutrientCSV(searchOpt): Downloads the CSV for all the serving sizes in the nutrient table
    async downloadAllNutrientCSV(searchOpt) {
        const selectedFoodCodes = this.selectedFoodCodes[searchOpt];
        if (selectedFoodCodes === undefined ||  selectedFoodCodes.length == 0) return;

        const foodCode = selectedFoodCodes[0];
        let food = await this.dataLoader.getFoodByCode(foodCode);
        if (food == undefined) return;

        const foodName = food[Translation.getDataCol(DataCols.FoodDescription)];
        const csvFileName = Translation.translate("CSVDownload.AllNutrientFileName", {foodName});
        
        TableTools.downloadCSV({csvContent: this.csvSearchedAllNutrientTable, fileName: csvFileName});
    }

    // downloadNutrientCSV(searchOpt): Downloads the CSV for the selected serving sizes in the nutrient table
    async downloadNutrientCSV(searchOpt) {
        const selectedFoodCodes = this.selectedFoodCodes[searchOpt];
        if (selectedFoodCodes === undefined ||  selectedFoodCodes.length == 0) return;

        const nutrientStatsInputs = this.nutrientStatsInputs[searchOpt];
        if (nutrientStatsInputs === undefined) return;

        const measureCodesSelected = nutrientStatsInputs[NutrientStatAtts.MeasureCodesSelected];
        if (measureCodesSelected == undefined) return;

        const foodCode = selectedFoodCodes[0];
        let food = await this.dataLoader.getFoodByCode(foodCode);
        if (food == undefined) return;

        const foodName = food[Translation.getDataCol(DataCols.FoodDescription)];
        const csvFileName = Translation.translate("CSVDownload.NutrientFileName", {foodName});

        let measureWeightConv = await this.dataLoader.getFoodMeasureWeightConv(foodCode, measureCodesSelected);

        const nutrientStatInputs = this.nutrientStatsInputs[searchOpt];
        const csvTable = this.getNutrientCSVDownload(food, this.webSearchedNutrientTable, measureWeightConv, nutrientStatInputs);
        TableTools.downloadCSV({csvContent: csvTable, fileName: csvFileName});
    }
}