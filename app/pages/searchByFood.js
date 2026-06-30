import { SearchOpts, SearchAtts, TableCols, FoodSearchTableCols, KeyboardCodes } from "../constants.js";
import { Translation } from "../tools.js";
import { BaseSearchPage } from "./basePage.js";



export class SearchByFoodPage extends BaseSearchPage {
    constructor(model, app) {
        super(model, app, SearchOpts.SearchByFood);
        this.htmlSelectors.foodGroupInput = "#foodGroupInput";
    }

    updateHTMLElements() {
        super.updateHTMLElements();
        const elements = this.htmlElements;

        elements.foodNameInputContainer = d3.select("#foodNameInputContainer");
        elements.foodAltNameInputContainer = d3.select("#foodAltNameInputContainer");
        elements.foodGroupInputContainer = d3.select("#foodGroupInputContainer");
        elements.foodCodeInputContainer = d3.select("#foodCodeInputContainer");

        elements.foodNameInput = elements.foodNameInputContainer.select("input");
        elements.foodAltNameInput = elements.foodAltNameInputContainer.select("input");
        elements.foodCodeInput = elements.foodCodeInputContainer.select("input");
    }

    updateStaticText() {
        super.updateStaticText();
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));

        elements.foodNameInputContainer.select("label").html(Translation.translate("FoodNameInputTitle"));
        elements.foodAltNameInputContainer.select("label").html(Translation.translate("FoodAltNameInputTitle"));
        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.foodCodeInputContainer.select("label").html(Translation.translate("FoodCodeInputTitle"));
        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));
    }

    setupListeners() {
        super.setupListeners();

        const elements = this.htmlElements;
        elements.foodNameInput.on("keydown", () => {this.submitSearchKeyboardListener()});
        elements.foodAltNameInput.on("keydown", () => {this.submitSearchKeyboardListener()});
        elements.foodCodeInput.on("keydown", () => {this.submitSearchKeyboardListener()});
    }

    updateSearchTable(selectFood = false) {
        const tableData = (selectFood) ? this.model.getFoodSearchSelectedData(this.searchOpt) : this.model.getFoodSearchTableData(this.searchOpt);

        let searchTable = this.htmlElements.searchTable;
        if (searchTable === undefined) {
            this.htmlElements.searchTable = $(this.htmlSelectors.foodSearchTable);
            searchTable = this.htmlElements.searchTable;
        }

        searchTable.toggleClass(this.htmlNames.foodSelected, selectFood);

        if (tableData !== undefined) {
            const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
            
            let tableColInfo = [{data: TableCols.FoodNameOrder, visible: false},
                                {data: TableCols.FoodAltNameOrder, visible: false}
            ];

            for (const tableAtt of FoodSearchTableCols) {
                tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
            }

            const dataTable = this.updateTable(this.htmlSelectors.foodSearchTable, tableColInfo, tableData,  
                {orderFixed: {
                    pre: [
                        [0, "asc"],
                        [1, "asc"]
                    ]
                }});
            return dataTable;
        }
    }

    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        inputs[SearchAtts.FoodName] = elements.foodNameInput.property("value");
        inputs[SearchAtts.FoodAltName] = elements.foodAltNameInput.property("value");
        inputs[SearchAtts.FoodCode] = elements.foodCodeInput.property("value");

        const foodGroups = $(this.htmlSelectors.foodGroupInput).selectpicker('val');
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        super.submitSearch();
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        elements.foodNameInput.property("value", inputs[SearchAtts.FoodName]);
        elements.foodAltNameInput.property("value", inputs[SearchAtts.FoodAltName]);
        $(this.htmlSelectors.foodGroupInput).selectpicker('val', [inputs[SearchAtts.FoodGroup]]);
        elements.foodCodeInput.property("value", inputs[SearchAtts.FoodCode]);
    }

    loadPageInputs() {
        const inputs = this.model.searchInputs[this.searchOpt];
        const selections = this.model.searchSelections[this.searchOpt];

        // add in the food groups
        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.foodGroupInput, 
                                   selections: selections[SearchAtts.FoodGroup], 
                                   inputs: new Set([inputs[SearchAtts.FoodGroup]]),
                                   noneSelectedText: Translation.translate("NoneSelected")});

        this.syncInputs();

        const selectedFoodCodes = this.model.selectedFoodCodes[this.searchOpt];
        if (selectedFoodCodes === undefined || selectedFoodCodes.length == 0) return;

        this.showFoodNutrientStats(selectedFoodCodes[0]);
    }
}