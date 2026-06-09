import { SearchOpts, SearchAtts } from "../constants.js";
import { Translation } from "../tools.js";
import { BaseSearchPage } from "./basePage.js";



export class SearchByFoodPage extends BaseSearchPage {
    constructor(model, app) {
        super(model, app, SearchOpts.SearchByFood);
    }

    updateHTMLElements() {
        super.updateHTMLElements();
        const elements = this.htmlElements;

        elements.foodNameInputContainer = d3.select("#foodNameInputContainer");
        elements.foodGroupInputContainer = d3.select("#foodGroupInputContainer");
        elements.foodCodeInputContainer = d3.select("#foodCodeInputContainer");
        elements.foodNameInput = elements.foodNameInputContainer.select("input");
        elements.foodGroupInput = elements.foodGroupInputContainer.select("input");
        elements.foodCodeInput = elements.foodCodeInputContainer.select("input");
    }

    updateStaticText() {
        super.updateStaticText();
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));

        elements.foodNameInputContainer.select("label").html(Translation.translate("FoodNameInputTitle"));
        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.foodCodeInputContainer.select("label").html(Translation.translate("FoodCodeInputTitle"));
        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
    }

    setupListeners() {
        const elements = this.htmlElements;

        elements.searchButton.on("click", () => { 
            this.htmlElements.searchTable.removeClass(this.htmlNames.foodSelected);
            this.submitSearch(); 
        });
    }

    loadPageInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[SearchOpts.SearchByFood];

        elements.foodNameInput.property("value", inputs[SearchAtts.FoodName]);
        elements.foodGroupInput.property("value", inputs[SearchAtts.FoodGroup]);
        elements.foodCodeInput.property("value", inputs[SearchAtts.FoodCode]);


        const selectedFoodCodes = this.model.selectedFoodCodes[this.searchOpt];
        if (selectedFoodCodes === undefined || selectedFoodCodes.length == 0) return;

        this.showFoodNutrientStats(selectedFoodCodes[0]);
    }
}