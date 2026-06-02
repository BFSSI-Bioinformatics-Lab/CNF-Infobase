import { SearchOpts, PageSrc, TranslationObj, FoodSearchTableCols, SearchAtts } from "./constants.js";
import { Translation } from "./tools.js";
import { Model } from "./backend.js";



class App {
    constructor(model) {
        this.model = model;
        this.htmlElements = {
            [SearchOpts.SearchByFood]: {}
        };
    }

    // init(page): Initializes the entire app
    async init(page = undefined) {
        this.updateStaticText();
        this.setupListeners();
        this.loadSearchPage(page);
    }

    // updateSearchByFoodHtmlElements(): Updates the common HTML elements for the "Search By Food" page
    updateSearchByFoodHtmlElements() {
        const elements = {
            foodNameInputContainer: d3.select("#foodNameInputContainer"),
            foodGroupInputContainer: d3.select("#foodGroupInputContainer"),
            foodCodeInputContainer: d3.select("#foodCodeInputContainer"),
            searchButton: d3.select("#searchButton")
        }

        elements.foodNameInput = elements.foodNameInputContainer.select("input");
        elements.foodGroupInput = elements.foodGroupInputContainer.select("input");
        elements.foodCodeInput = elements.foodCodeInputContainer.select("input");

        this.htmlElements[SearchOpts.SearchByFood] = elements;
    }

    // updateStaticText: Updates text for static elements when the main page loads
    updateStaticText() {
        d3.select("#searchByFoodTab").html(Translation.translate("SearchByFood"));
        d3.select("#searchByNutrientTab").html(Translation.translate("SearchByNutrient"));
        d3.select("#compareNutrientsTab").html(Translation.translate("CompareByNutrient"));

        d3.select("#about-tool-details summary h2").html(Translation.translate("InstructionsTitle"));
        d3.select("#about-tool-details div p").html(Translation.translate("InstructionsText"));
    }

    // updateSearchByFoodStaticText: Updates text for the "Search by Food" page
    updateSearchByFoodStaticText() {
        const elements = this.htmlElements[SearchOpts.SearchByFood];

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));
        elements.foodNameInputContainer.select("label").html(Translation.translate("FoodNameInputTitle"));
        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.foodCodeInputContainer.select("label").html(Translation.translate("FoodCodeInputTitle"));
        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
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

    setupSearchByFoodListeners() {
        const elements = this.htmlElements[SearchOpts.SearchByFood];

        elements.searchButton.on("click", () => { this.searchByFoodSubmitSearch(); });
    }

    // Loads the selected search page for the app
    loadSearchPage(searchOpt = undefined) {
        const self = this;
        if (searchOpt === undefined) {
            searchOpt = self.model.searchOpt;
        }

        $("#searchPage").load(PageSrc[searchOpt], function() { 
            if (searchOpt == SearchOpts.SearchByFood) {
                self.loadSearchByFoodPage();
            }
        });
    }

    // loadSearchByFoodPage(): Loads the page for searching by food
    loadSearchByFoodPage() {
        this.updateSearchByFoodHtmlElements();
        this.updateSearchByFoodStaticText();
        this.setupSearchByFoodListeners();
        this.updateSearchByFoodTable();
    }

    // updateTable(data, selector): Updates the data in the table
    // Note:
    // - based off Jquery's Datatables: https://datatables.net/
    updateTable(selector, columnInfo, data) {
        let dataTable;
        if (DataTable.isDataTable(selector)) {
            dataTable = $(selector).DataTable();
            dataTable.destroy();
        }

        const dataTableTranslations = Translation.translate("dataTable", { returnObjects: true });
        dataTable = $(selector).DataTable({
            language: dataTableTranslations,
            columns: columnInfo,
            scrollCollapse: true,
            scrollX: true,
            scrollY: '300px'
        });

        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
    }

    updateSearchByFoodTable() {
        const tableData = this.model.getFoodSearchTableData();

        if (tableData !== undefined) {
            const translations = Translation.translate("SearchTableCols",{ returnObjects: true });
            const tableColInfo = FoodSearchTableCols.map((tableAtt) => {
                return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt)};
            });

            this.updateTable('#foodSearchTable', tableColInfo, tableData);
        }
    }

    searchByFoodSubmitSearch() {
        const elements = this.htmlElements[SearchOpts.SearchByFood];
        const inputs = this.model.searchInputs[SearchOpts.SearchByFood]; 

        inputs[SearchAtts.FoodName] = elements.foodNameInput.property("value");
        inputs[SearchAtts.FoodGroup] = elements.foodGroupInput.property("value");
        inputs[SearchAtts.FoodCode] = elements.foodCodeInput.property("value");

        this.updateSearchByFoodTable();
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