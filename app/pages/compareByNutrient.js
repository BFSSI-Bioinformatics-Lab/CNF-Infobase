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
            multiNutrientInputContainer: d3.select("#nutrientInputContainer")
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

    setupListeners() {
        const elements = this.htmlElements;

        elements.searchButton.on("click", () => { 

        });

        elements.resetSearchButton.on("click", () => {

        });

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