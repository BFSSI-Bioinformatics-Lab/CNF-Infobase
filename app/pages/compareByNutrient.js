import { SearchOpts, SearchAtts } from "../constants.js";
import { Translation } from "../tools.js";
import { BasePage } from "./basePage.js";


export class CompareByNutrient extends BasePage {
    constructor(model, app) {
        super(model, app);
        this.searchOpt = SearchOpts.CompareNutrients;

        this.htmlSelectors = {
            foodGroupInput: "#foodGroupInput",
            nutrientInput: "#nutrientInput"
        }

        this.htmlElements = {};
        this.maxNutrientsCount = 3;
    }

    updateHTMLElements() {
        const elements = {
            searchButton: d3.select("#searchButton"),
            resetSearchButton: d3.select("#resetButton"),
            foodGroupInputContainer: d3.select("#foodGroupInputContainer"),
            multiNutrientInputContainer: d3.select("#nutrientInputContainer"),
            searchTable = $(this.htmlSelectors.foodSearchTable)
        };

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));

        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.multiNutrientInputContainer.select("label").html(Translation.translate("MultiNutrientInputTitle"));

        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));
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

    }

    // clearSearch(): Clears the search inputs of the page
    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.syncInputs();
    }

    // submitSearch(): Submits the search inputs to retrieve the search results in the search table
    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        const foodGroups = $(this.htmlSelectors.foodGroupInput).selectpicker('val');
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        const nutrients = elements.nutrientInput.getValue(true);
        console.log(nutrients);
        inputs[SearchAtts.Nutrient] = (nutrients.length == 0) ? [] : nutrients;

        inputs[SearchAtts.FilterHelper] = this.searchTable.search();
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

    // updateSearchTable(selectFood, searchTxt): Updates the search table
    updateSearchTable(searchTxt = null) {
        const tableData = this.model.getCompareNutrientTableData();
        let searchTable = this.htmlElements.searchTable;
        if (tableData === undefined) return;

        const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
        
        let tableColInfo = [];
        for (const tableAtt of NutrientSearchTableCols) {
            tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
        }

        const nutrientNameData = tableData.nutrientNames;
        for (const nutrientName of nutrientNameData) {
            const colName = 

            tableColInfo.push({title: });
        }

        const dataTable = this.updateTable({selector: this.htmlSelectors.foodSearchTable, columnInfo: tableColInfo, data: tableData, searchTxt: (searchTxt !== null) ? searchTxt : undefined});
        return dataTable;
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        $(this.htmlSelectors.foodGroupInput).selectpicker('val', [inputs[SearchAtts.FoodGroup]]);

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
                                   inputs: new Set([inputs[SearchAtts.FoodGroup]]),
                                   noneSelectedText: Translation.translate("NoneSelected")});


        elements.nutrientInput = this.setupAutoCompleteSelect({elementSelector: this.htmlSelectors.nutrientInput, 
                                                               selections: selections[SearchAtts.Nutrient], 
                                                               inputs: new Set([inputs[SearchAtts.Nutrient]]),
                                                               maxItemCount: this.maxNutrientsCount,
                                                               maxItemText: (maxItemCount) => Translation.translate("multiselectAutoComplete.maxItemText", {maxItemCount: this.maxNutrientsCount}),
                                                               placeholder: Translation.translate("MultiNutrientPlaceholder"),
                                                               noResultsText: Translation.translate("multiselectAutoComplete.noResultsText")});

        this.syncInputs();
    }

    loadPage() {
        super.loadPage();
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadPageInputs();
    }
}