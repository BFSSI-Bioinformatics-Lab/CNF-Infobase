import { SearchOpts, PageSrc, TranslationObj, FoodSearchTableCols } from "./constants.js";
import { Translation } from "./tools.js";
import { Model } from "./backend.js";



class App {
    constructor(model) {
        this.model = model;
    }

    // init(page): Initializes the entire app
    async init(page = undefined) {
        this.updateStaticText();
        this.setupListeners();
        this.loadSearchPage(page);
    }

    // UpdateStaticText: Updates text for static elements when the page loads
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

        $("#searchPage").load(PageSrc[searchOpt], function() { self.updateSearchPage(searchOpt) });
    }

    updateSearchPage(searchOpt = undefined) {
        if (searchOpt == SearchOpts.SearchByFood) {
            this.updateSearchByFoodPage();
        }
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

    updateSearchByFoodPage() {
        const tableData = this.model.getFoodSearchTableData();

        if (tableData !== undefined) {
            const translations = Translation.translate("SearchTableCols",{ returnObjects: true });
            const tableColInfo = FoodSearchTableCols.map((tableAtt) => {
                return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt)};
            });

            this.updateTable('#foodSearchTable', tableColInfo, tableData);
        }
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