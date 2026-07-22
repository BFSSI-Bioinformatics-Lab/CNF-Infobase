import { SearchOpts, SearchAtts, DataCols, CompNutrientSearchTableCols } from "../constants.js";
import { Translation } from "../tools.js";
import { BasePage } from "./basePage.js";
import { Model } from "../backend.js";


export class CompareByNutrient extends BasePage {
    constructor(model, app) {
        super(model, app);
        this.searchOpt = SearchOpts.CompareNutrients;

        this.htmlSelectors = {
            foodGroupInput: "#foodGroupInput",
            nutrientInput: "#nutrientInput",
            foodSearchTable: '#foodSearchTable'
        }

        this.htmlElements = {};
        this.maxNutrientsCount = 3;
        this.searchTable;
    }

    updateHTMLElements() {
        const elements = {
            searchContainer: d3.select("#searchSection"),
            searchButton: d3.select("#searchButton"),
            resetSearchButton: d3.select("#resetButton"),
            foodGroupInputContainer: d3.select("#foodGroupInputContainer"),
            multiNutrientInputContainer: d3.select("#nutrientInputContainer"),
            foodGroupInput: d3.select(this.htmlSelectors.foodGroupInput),
            searchTable: $(this.htmlSelectors.foodSearchTable),
            searchCSVDownloadBtn: d3.select("#searchCSVDownload"),
        };

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));
        d3.select("#searchResultTitle").html(Translation.translate("SearchTableTitle"));
        elements.searchCSVDownloadBtn.html(Translation.translate("CSVDownload.DownloadSearchButtonTitle"))

        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.multiNutrientInputContainer.select("label").html(Translation.translate("MultiNutrientInputTitle"));

        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));

        d3.selectAll(".toTopBtnText").each((data, ind, nodes) => {
            const textNode = d3.select(nodes[ind]);
            textNode.html(Translation.translate("BackToTop")); 
        });
    }

    // setupListeners(): Setups all the initial listeners
    setupListeners() {
        const elements = this.htmlElements;

        elements.searchButton.on("click", () => { 
            this.submitSearch();
        });

        elements.resetSearchButton.on("click", () => {
            this.clearSearch();
        });

        elements.searchCSVDownloadBtn.on("click", () => {
            this.model.downloadSearchCSV();
        });
    }

    // clearSearch(): Clears the search inputs of the page
    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.syncInputs();
        this.updateSearchTable("", true);
    }

    // submitSearch(): Submits the search inputs to retrieve the search results in the search table
    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.scrollToElement(elements.searchContainer.node());

        const foodGroups = [elements.foodGroupInput.property("value")];
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        const nutrients = elements.nutrientInput.getValue(true);
        inputs[SearchAtts.Nutrient] = (nutrients.length == 0) ? [] : nutrients;

        inputs[SearchAtts.FilterHelper] = this.searchTable.search();
        this.updateSearchTable(inputs[SearchAtts.FilterHelper]);
    }

    // setupSearchTable(): Setup the search table
    setupSearchTable() {
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.searchTable = this.updateSearchTable(inputs[SearchAtts.FilterHelper]);
        if (this.searchTable === undefined) return;

        const self = this;

        this.searchTable.on('search.dt', function() {
            self.model.searchInputs[self.searchOpt][SearchAtts.FilterHelper] = self.searchTable.search();
        });
    }

    // updateSearchTable(selectFood, resetSort): Updates the search table
    updateSearchTable(searchTxt = null, resetSort = false) {
        const tableData = this.model.getCompareNutrientTableData(this.searchOpt);
        let searchTable = this.htmlElements.searchTable;
        if (tableData === undefined) return;

        const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
        
        let tableColInfo = [];
        for (const tableAtt of CompNutrientSearchTableCols) {
            tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
        }

        const nutrientNameData = tableData.nutrientNames;
        for (const nutrientNameDatum of nutrientNameData) {
            const nutrientCode = nutrientNameDatum[DataCols.NutrientCode];
            const nutrientName = nutrientNameDatum[Translation.getDataCol(DataCols.NutrientName)];

            const dataCol = Model.getCompareNutrientAmtColName(nutrientCode);
            const colName = Translation.translate("SearchTableCols.ElementNutrientAmount", { returnObjects: true, element: nutrientName});

            tableColInfo.push({title: colName, data: dataCol});
        }

        const dataTable = this.updateTable({selector: this.htmlSelectors.foodSearchTable, 
                                            columnInfo: tableColInfo, 
                                            data: tableData.data, 
                                            searchTxt: (searchTxt !== null) ? searchTxt : undefined, 
                                            destroyExisting: true,
                                            order: (resetSort) ? [] : null});
        return dataTable;
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        elements.foodGroupInput.property("value", inputs[SearchAtts.FoodGroup]);

        elements.nutrientInput.removeActiveItems();
        elements.nutrientInput.setChoiceByValue(inputs[SearchAtts.Nutrient]);
    }

    loadPageInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];
        const selections = this.model.searchSelections[this.searchOpt];

        // add in the food groups and nutrient dropdowns
        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.foodGroupInput, 
                                selections: selections[SearchAtts.FoodGroup], 
                                inputs: new Set([inputs[SearchAtts.FoodGroup]])});


        elements.nutrientInput = this.setupAutoCompleteSelect({elementSelector: this.htmlSelectors.nutrientInput, 
                                                               selections: selections[SearchAtts.Nutrient], 
                                                               inputs: new Set([inputs[SearchAtts.Nutrient]]),
                                                               maxItemCount: this.maxNutrientsCount,
                                                               maxItemText: (maxItemCount) => Translation.translate("multiselectAutoComplete.maxItemText", {maxItemCount: this.maxNutrientsCount}),
                                                               placeholder: Translation.translate("MultiNutrientPlaceholder"),
                                                               noResultsText: Translation.translate("multiselectAutoComplete.noResultsText")});

        this.clearSearch();
    }

    loadPage() {
        super.loadPage();
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadPageInputs();
        this.setupSearchTable();
    }
}