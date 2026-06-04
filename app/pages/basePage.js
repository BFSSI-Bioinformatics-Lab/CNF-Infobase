import { SearchOpts, SearchAtts, FoodSearchTableCols, DataCols } from "../constants.js";
import { Translation } from "../tools.js";


// BasePage: Base Class for a particular page in the app
export class BasePage {
    constructor(model, app) {
        this.model = model;
        this.app = app;
    }

    // loadPage(): Loads the page into the app
    loadPage() {

    }

    // updateTable(data, selector): Updates the data in the table
    // Note:
    // - based off Jquery's Datatables: https://datatables.net/
    updateTable(selector, columnInfo, data) {
        let dataTable;
        if (DataTable.isDataTable(selector)) {
            dataTable = $(selector).DataTable();
        } else {
            const dataTableTranslations = Translation.translate("dataTable", { returnObjects: true });
            dataTable = $(selector).DataTable({
                language: dataTableTranslations,
                columns: columnInfo,
                scrollCollapse: true,
                scrollX: true,
                scrollY: '400px'
            });
        }

        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
        return dataTable;
    }

    addCheckbox(checkboxLst, checkLstName, checkboxVal, checkboxId, checkboxText) {
        const checkboxContainer = checkboxLst.append("li");
        checkboxContainer.classed("checkbox", true);

        const checkboxInput = checkboxContainer.append("input");
        checkboxInput.attr("type", "checkbox");
        checkboxInput.attr("id", checkboxId);
        checkboxInput.attr("name", checkLstName);
        checkboxInput.data(checkboxVal);

        const checkboxLabel = checkboxContainer.append("label");
        checkboxLabel.attr("for", checkboxId);
        checkboxLabel.html(checkboxText);
    }
}


export class BaseSearchPage extends BasePage {
    constructor(model, app, searchOpt) {
        super(model, app);
        this.htmlNames = {
            foodSelected: "foodSelected",
            servingSizeInput: "servingSizeInput",
            servingSizeOpt: "servingSizeOpt"
        }

        this.htmlSelectors = {
            foodSearchTable: '#foodSearchTable'
        }

        this.htmlElements = {};
        this.searchOpt = searchOpt;
    }

    // updateHtmlElements(): Updates the common HTML elements for the search page
    updateHTMLElements() {
        const elements = {
            searchButton: d3.select("#searchButton"),
            foodResultCard: d3.select("#foodResultCard"),
            servingSizeCheckList: d3.select(".servingSizeContainer")
        };

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {

    }

    // setupListeners(): Setups all the initial listeners
    setupListeners() {

    }

    loadPageInputs() {

    }

    setupSearchTable() {
        const dataTable = this.updateSearchTable(this.model.foodSelected[this.searchOpt]);
        if (dataTable === undefined) return;

        const self = this;

        $(`${this.htmlSelectors.foodSearchTable} tbody`).on('click', 'tr', function () {
            const rowData = dataTable.row(this).data();
            if (rowData === undefined) return;

            const foodCode = rowData[DataCols.FoodCode];
            self.model.selectedFoodCodes[self.searchOpt] = [foodCode];

            const foodSelected = !self.model.foodSelected[self.searchOpt];
            self.model.foodSelected[self.searchOpt] = foodSelected;
            
            self.updateSearchTable(foodSelected);
            self.showFoodNutrientStats(foodCode);
        });
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
            const translations = Translation.translate("SearchTableCols",{ returnObjects: true });
            const tableColInfo = FoodSearchTableCols.map((tableAtt) => {
                return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt)};
            });

            const dataTable = this.updateTable(this.htmlSelectors.foodSearchTable, tableColInfo, tableData);
            return dataTable;
        }
    }

    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        inputs[SearchAtts.FoodName] = elements.foodNameInput.property("value");
        inputs[SearchAtts.FoodGroup] = elements.foodGroupInput.property("value");
        inputs[SearchAtts.FoodCode] = elements.foodCodeInput.property("value");

        this.updateSearchTable();
    }

    // showFoodNutrientStats(foodCode): Shows the stats of a particular foods' nutrients
    showFoodNutrientStats(foodCode) {
        const foodResultCard = this.htmlElements.foodResultCard;
        const stats = this.model.getFoodNutrientStats(foodCode);

        if (stats == undefined) {
            foodResultCard.classed("d-none", true);
            return;
        }

        foodResultCard.classed("d-none", false);
        foodResultCard.select(".cardHeader .card-title").html(stats.food[Translation.getDataCol(DataCols.FoodDescription)]);
        foodResultCard.select(".cardHeader .card-subtitle").html(Translation.translate("FoodNutrientStats.SubTitle", { foodCode: foodCode }));
        foodResultCard.select(".cardDetails .card-title").html(Translation.translate("FoodNutrientStats.ServingTitle"));

        const servingSizeCheckList = this.htmlElements.servingSizeCheckList;
        servingSizeCheckList.selectAll("*").remove();

        for (const measureConv of stats.measureWeightConv) {
            const checkboxId = `${this.htmlNames.servingSizeOpt}_${measureConv[DataCols.FoodCode]}_${measureConv[DataCols.MeasureTypeCode]}_${measureConv[DataCols.MeasureCode]}`;
            const checkboxText = Translation.translate("FoodNutrientStats.ServingSizeOption", 
                                                       {measureName: Translation.translateNum(measureConv[Translation.getDataCol(DataCols.MeasureDescription)]), 
                                                        convertedMeasure: Translation.translateNum(measureConv[DataCols.MeasureWeight], undefined)});

            this.addCheckbox(servingSizeCheckList, this.htmlNames.servingSizeInput, measureConv, checkboxId, checkboxText);
        }
    }

    loadPage() {
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadPageInputs();
        this.setupSearchTable();
    }
}