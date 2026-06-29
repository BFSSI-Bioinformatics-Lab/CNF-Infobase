import { SearchOpts, SearchAtts, NutrientSearchTableCols } from "../constants.js";
import { Translation } from "../tools.js";
import { BaseSearchPage } from "./basePage.js";



export class SearchByNutrientPage extends BaseSearchPage {
    constructor(model, app) {
        super(model, app, SearchOpts.SearchByNutrient);

        this.htmlSelectors.foodGroupInput = "#foodGroupInput";
        this.htmlSelectors.nutrientInput = "#nutrientInput";
    }

    updateHTMLElements() {
        super.updateHTMLElements();
        const elements = this.htmlElements;

        elements.foodGroupInputContainer = d3.select("#foodGroupInputContainer");
        elements.nutrientInputContainer = d3.select("#nutrientInputContainer");
    }

    updateStaticText() {
        super.updateStaticText();
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));

        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.nutrientInputContainer.select("label").html(Translation.translate("NutrientInputTitle"))

        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));
    }

    updateSearchTable(selectFood = false) {
        const tableData = (selectFood) ? this.model.getNutrientSearchSelectedData(this.searchOpt) : this.model.getNutrientSearchTableData(this.searchOpt);

        let searchTable = this.htmlElements.searchTable;
        if (searchTable === undefined) {
            this.htmlElements.searchTable = $(this.htmlSelectors.foodSearchTable);
            searchTable = this.htmlElements.searchTable;
        }

        searchTable.toggleClass(this.htmlNames.foodSelected, selectFood);

        if (tableData !== undefined) {
            const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
            
            let tableColInfo = [];
            for (const tableAtt of NutrientSearchTableCols) {
                tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
            }

            const dataTable = this.updateTable(this.htmlSelectors.foodSearchTable, tableColInfo, tableData);
            return dataTable;
        }
    }

    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        const foodGroups = $(this.htmlSelectors.foodGroupInput).selectpicker('val');
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        const nutrients = $(this.htmlSelectors.nutrientInput).selectpicker('val');
        inputs[SearchAtts.Nutrient] = (nutrients.length == 0) ? "" : nutrients;

        super.submitSearch();
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        $(this.htmlSelectors.foodGroupInput).selectpicker('val', [inputs[SearchAtts.FoodGroup]]);
        $(this.htmlSelectors.nutrientInput).selectpicker('val', [inputs[SearchAtts.Nutrient]]);
    }

    loadPageInputs() {
        const inputs = this.model.searchInputs[this.searchOpt];
        const selections = this.model.searchSelections[this.searchOpt];

        // add in the food groups and nutrient dropdowns
        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.foodGroupInput, 
                                   selections: selections[SearchAtts.FoodGroup], 
                                   inputs: new Set([inputs[SearchAtts.FoodGroup]]),
                                   noneSelectedText: Translation.translate("NoneSelected")});

        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.nutrientInput, 
                                   selections: selections[SearchAtts.Nutrient], 
                                   inputs: new Set([inputs[SearchAtts.Nutrient]]),
                                   noneSelectedText: Translation.translate("NoneSelected")});

        this.syncInputs();

        const selectedFoodCodes = this.model.selectedFoodCodes[this.searchOpt];
        if (selectedFoodCodes === undefined || selectedFoodCodes.length == 0) return;

        this.showFoodNutrientStats(selectedFoodCodes[0]);
    }
}