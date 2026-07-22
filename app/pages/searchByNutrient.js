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

        elements.foodGroupInput = d3.select(this.htmlSelectors.foodGroupInput);
        elements.nutrientInput = d3.select(this.htmlSelectors.nutrientInput);

        elements.searchTable = $(this.htmlSelectors.foodSearchTable);
    }

    updateStaticText() {
        super.updateStaticText();
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));
        d3.select("#searchResultTitle").html(Translation.translate("SearchTableTitle"));

        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.nutrientInputContainer.select("label").html(Translation.translate("NutrientInputTitle"))

        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));
    }

    updateSearchTable(selectFood = false, searchTxt = null, resetSort = false) {
        const tableData = (selectFood) ? this.model.getNutrientSearchSelectedData(this.searchOpt) : this.model.getNutrientSearchTableData(this.searchOpt);
        let searchTable = this.htmlElements.searchTable;

        searchTable.toggleClass(this.htmlNames.foodSelected, selectFood);
        if (tableData === undefined) return;

        const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
        
        let tableColInfo = [];
        for (const tableAtt of NutrientSearchTableCols) {
            tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
        }

        const dataTable = this.updateTable({selector: this.htmlSelectors.foodSearchTable, columnInfo: tableColInfo, data: tableData, searchTxt: (searchTxt !== null) ? searchTxt : undefined, order: (resetSort) ? [] : null});
        return dataTable;
    }

    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        const foodGroups = [elements.foodGroupInput.property("value")];
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        const nutrients = [elements.nutrientInput.property("value")]
        inputs[SearchAtts.Nutrient] = (nutrients.length == 0) ? "" : nutrients;

        inputs[SearchAtts.FilterHelper] = this.searchTable.search();

        super.submitSearch();
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        elements.foodGroupInput.property("value", inputs[SearchAtts.FoodGroup]);
        elements.nutrientInput.property("value", inputs[SearchAtts.Nutrient]);
    }

    loadPageInputs() {
        const inputs = this.model.searchInputs[this.searchOpt];
        const selections = this.model.searchSelections[this.searchOpt];
        const elements = this.htmlElements;

        // add in the food groups and nutrient dropdowns
        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.foodGroupInput, 
                                   selections: selections[SearchAtts.FoodGroup], 
                                   inputs: new Set([inputs[SearchAtts.FoodGroup]])});

        this.updateDropdownSelect({dropdownSelector: this.htmlSelectors.nutrientInput, 
                                selections: selections[SearchAtts.Nutrient], 
                                inputs: new Set([inputs[SearchAtts.Nutrient]])});

        this.clearSearch();

        const selectedFoodCodes = this.model.selectedFoodCodes[this.searchOpt];
        if (selectedFoodCodes === undefined || selectedFoodCodes.length == 0) return;

        this.showFoodNutrientStats(selectedFoodCodes[0]);
    }
}