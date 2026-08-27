import { SearchOpts, PageSrc, TranslationObj, FoodSearchTableCols, SearchAtts, DataCols } from "./constants.js";
import { Translation } from "./tools.js";
import { Model } from "./backend.js";
import { SearchByFoodPage } from "./pages/searchByFood.js";
import { SearchByNutrientPage } from "./pages/searchByNutrient.js";
import { CompareByNutrient } from "./pages/compareByNutrient.js";
import { CompareByFood } from "./pages/compareByFood.js";



class App {
    constructor(model) {
        this.model = model;
        this.searchPages = {
            [SearchOpts.SearchByFood]: new SearchByFoodPage(model, this),
            [SearchOpts.SearchByNutrient]: new SearchByNutrientPage(model, this),
            [SearchOpts.CompareNutrients]: new CompareByNutrient(model, this),
            [SearchOpts.CompareFoods]: new CompareByFood(model, this)
        }

        this.htmlElements = {};
    }

    // init(page): Initializes the entire app
    async init(page = undefined) {
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadSearchPage(page);
    }

    updateHTMLElements() {
        const elements = this.htmlElements;

        elements.legendAccordion = d3.select("#legend-accordion");
        elements.instructionsAccordion = d3.select("#about-tool-details");
    }

    // updateStaticText: Updates text for static elements when the main page loads
    updateStaticText() {
        d3.select("#searchByFoodTab").html(Translation.translate("SearchByFood"));
        d3.select("#searchByNutrientTab").html(Translation.translate("SearchByNutrient"));
        d3.select("#compareNutrientsTab").html(Translation.translate("CompareByNutrient"));
        d3.select("#compareFoodsTab").html(Translation.translate("CompareByFoods"));

        d3.select("#legendTitle").html(Translation.translate("LegendTitle"));
        d3.select("#legendContent p").html(Translation.translate("LegendText"));

        d3.select("#closeInstructionsText").html(Translation.translate("CloseInstructions"));
        d3.select("#closeLegendText").html(Translation.translate("CloseLegend"));
    }

    setupListeners() {
        this.setupSearchTab();
        const elements = this.htmlElements;

        d3.select("#closeInstructions").on("click", () => {
            elements.instructionsAccordion.attr("open", null);
        });

        d3.select("#closeLegend").on("click", () => {
            elements.legendAccordion.attr("open", null);
        });
    }

    setupSearchTab() {
        const self = this;
        d3.selectAll(".searchTab")
            .on("click", function(data) {
                let selectedPageSelect = d3.select(this);
                const activePageSelect = d3.select(".searchTab.active");

                self.setSelectedSearch(selectedPageSelect, activePageSelect, data, (selectedOpt, data) => {
                    const searchOpt = data;
                    if (searchOpt) {
                        self.model.searchOpt = searchOpt;
                        self.loadSearchPage();
                    }
                });
            });

        const activePageSelect = d3.select(`.searchTab[value="${this.model.searchOpt}"]`);
        this.setSearchTabActive(activePageSelect);
    }

    // setSearchTabActive(element): Makes some option to be selected
    setSearchTabActive(element) {
        element.classed("active", true);
        element.attr("aria-selected", true); // for assessibility
    }

    // setSearchTabInactive(element): Makes some option to be unselected
    setSearchTabInactive(element) {
        element.classed("active", false);
        element.attr("aria-selected", false); // for assessibility
    }

    // setSelectedSearch(selectedOpt, activeOpt, data, onSelected): Sets the selected option to be
    //  active and disables the previous selected option
    setSelectedSearch(selectedOpt, activeOpt, data, onSelected) {
        if (data === undefined) {
            data = selectedOpt.attr("value");
        }

        this.setSearchTabInactive(activeOpt);
        this.setSearchTabActive(selectedOpt);
        onSelected(selectedOpt, data);
    }

    // Loads the selected search page for the app
    loadSearchPage(searchOpt = undefined) {
        const self = this;
        if (searchOpt === undefined) {
            searchOpt = self.model.searchOpt;
        }

        $("#searchPage").load(PageSrc[searchOpt], function() {
            if (searchOpt == SearchOpts.SearchByFood || searchOpt == SearchOpts.SearchByNutrient || searchOpt == SearchOpts.CompareNutrients || searchOpt == SearchOpts.CompareFoods) {
                self.searchPages[searchOpt].loadPage();
            }
        });
    }
}


//////////
// MAIN //
//////////

Translation.register(TranslationObj);

// load in the view for the application
window.addEventListener("load", () => {
    let model = new Model();
    let app = new App(model);

    Promise.all([model.load()]).then(() => {
        app.init(SearchOpts.SearchByFood);
    });
});