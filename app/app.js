import { SearchOpts, PageSrc, TranslationObj, FoodSearchTableCols, SearchAtts, DataCols } from "./constants.js";
import { Translation } from "./tools.js";
import { Model } from "./backend.js";
import { SearchByFoodPage } from "./pages/searchByFood.js";
import { SearchByNutrientPage } from "./pages/searchByNutrient.js";
import { CompareByNutrient } from "./pages/compareByNutrient.js";



class App {
    constructor(model) {
        this.model = model;
        this.searchPages = {
            [SearchOpts.SearchByFood]: new SearchByFoodPage(model, this),
            [SearchOpts.SearchByNutrient]: new SearchByNutrientPage(model, this),
            [SearchOpts.CompareNutrients]: new CompareByNutrient(model, this)
        }
    }

    // init(page): Initializes the entire app
    async init(page = undefined) {
        this.updateStaticText();
        this.setupListeners();
        this.loadSearchPage(page);
    }

    // updateStaticText: Updates text for static elements when the main page loads
    updateStaticText() {
        d3.select("#searchByFoodTab").html(Translation.translate("SearchByFood"));
        d3.select("#searchByNutrientTab").html(Translation.translate("SearchByNutrient"));
        d3.select("#compareNutrientsTab").html(Translation.translate("CompareByNutrient"));

        d3.select("#about-tool-details summary h2").html(Translation.translate("InstructionsTitle"));
        d3.select("#about-tool-details div p").html(Translation.translate("InstructionsText"));
    }

    setupListeners() {
        this.setupSearchTab();
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
            if (searchOpt == SearchOpts.SearchByFood || searchOpt == SearchOpts.SearchByNutrient || searchOpt == SearchOpts.CompareNutrients) {
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