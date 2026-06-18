import { Model } from "../backend.js";
import { SearchOpts, SearchAtts, FoodSearchTableCols, NutrientTableCols, TableCols, DataCols, MeasureTypeCodes } from "../constants.js";
import { DictTools, Translation } from "../tools.js";


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
    updateTable(selector, columnInfo, data, dataTableAtts = {}) {
        let dataTable;
        if (DataTable.isDataTable(selector)) {
            dataTable = $(selector).DataTable();
        } else {
            const dataTableTranslations = Translation.translate("dataTable", { returnObjects: true });
            dataTableAtts = DictTools.combine([{
                language: dataTableTranslations,
                columns: columnInfo,
                scrollCollapse: true,
                scrollX: true,
                scrollY: '400px',
                pageLength: 100,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
            }, dataTableAtts]);

            dataTable = $(selector).DataTable(dataTableAtts);
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
            foodSearchTable: '#foodSearchTable',
            nutrientTable: '#nutrientTable'
        }

        this.htmlElements = {};
        this.searchOpt = searchOpt;
    }

    // updateHtmlElements(): Updates the common HTML elements for the search page
    updateHTMLElements() {
        const elements = {
            searchButton: d3.select("#searchButton"),
            foodResultContainer: d3.select(".foodResultContainer"),
            foodResultCard: d3.select("#foodResultCard"),
            servingSizeCheckList: d3.select(".servingSizeContainer"),
            refuseListContainer: d3.select(".servingRefuseContainer")
        };

        elements.refuseList = elements.refuseListContainer.select("ul")

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {
        d3.select("#nutrientTableTitle").html(Translation.translate("FoodNutrientStats.NutrientTableTitle"));
        d3.select("#foodSearchInstructions").html(Translation.translate("SearchTableInstructions"));

        this.htmlElements.foodResultCard.select(".cardDetails .card-title").html(Translation.translate("FoodNutrientStats.ServingTitle"));
        this.htmlElements.refuseListContainer.select("h5").html(Translation.translate("FoodNutrientStats.ServingRefuseTitle"));
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

            const foodCode = rowData[TableCols.FoodCode];
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
        this.updateSearchTable();
    }

    updateNutrientTable() {
        const translations = Translation.translate("FoodNutrientStats.TableCols", { returnObjects: true });

        let tableColInfo = [{data: TableCols.NutrientGroup, visible: false}];
        tableColInfo.push(...NutrientTableCols.map((tableAtt) => {
            return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt)};
        }));

        const measureWeightConv = this.model.searchedNutrientData.measureWeightConv;
        const measureConvLen = measureWeightConv.length;

        for (let i = 0; i < measureConvLen; ++i) {
            const measureConv = measureWeightConv[i];
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) continue;

            const measureColTitle = Translation.translate("FoodNutrientStats.ConvertedMeasureCol", {
                measureName: Translation.translateNum(measureConv[Translation.getDataCol(TableCols.MeasureDescription)]), 
                convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)
            });

            const dataCol = Model.getConvertedNutrientColName(i);
            tableColInfo.push({title: measureColTitle, data: dataCol, name: dataCol, visible: false});
        }

        const dataTable = this.updateTable(this.htmlSelectors.nutrientTable, tableColInfo, this.model.webSearchedNutrientTable, 
            {scrollY: '1000px',
             pageLength: -1,
             order: [[1, 'asc']],
             orderFixed: {
                pre: [0, 'asc'] // Fix the nutrient group column so when soring, the nutrients only get sorted in their corresponding sections
            },
            rowGroup: {
                dataSrc: TableCols.NutrientGroup
            }
        });
        return dataTable;
    }

    updateNutrientTableConvCols(dataTable, ind, show) {
        const colName = Model.getConvertedNutrientColName(ind);
        dataTable.column(`${colName}:name`).visible(show); 
        dataTable.columns.adjust().draw(false); 
    }

    addServingCheckbox(measureConv, measureConvInd) {
        const checkboxId = `${this.htmlNames.servingSizeOpt}_${measureConv[TableCols.FoodCode]}_${measureConv[TableCols.MeasureTypeCode]}_${measureConv[TableCols.MeasureCode]}`;
        const checkboxText = Translation.translate("FoodNutrientStats.ServingSizeOption", 
                                                    {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)], 
                                                    convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)});

        this.addCheckbox(this.htmlElements.servingSizeCheckList, this.htmlNames.servingSizeInput, [measureConvInd], checkboxId, checkboxText);
    }

    addRefuseListItem(measureConv) {
        const text = Translation.translate("FoodNutrientStats.ServingRefuseListItem", 
                                           {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)],
                                            convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)});

        this.htmlElements.refuseList.append("li").html(text);
    }

    // showFoodNutrientStats(foodCode): Shows the stats of a particular foods' nutrients
    showFoodNutrientStats(foodCode) {
        const self = this;

        const foodResultContainer = this.htmlElements.foodResultContainer;
        const stats = this.model.getFoodNutrientStats(foodCode);
        const statsEmpty = stats === undefined;

        foodResultContainer.classed("d-none", statsEmpty);
        if (statsEmpty) return;

        const foodResultCard = this.htmlElements.foodResultCard;
        foodResultCard.select(".cardHeader .card-title").html(stats.food[Translation.getDataCol(TableCols.FoodDescription)]);
        foodResultCard.select(".cardHeader .card-subtitle").html(Translation.translate("FoodNutrientStats.SubTitle", { foodCode: foodCode }));

        this.htmlElements.servingSizeCheckList.selectAll("*").remove();
        this.htmlElements.refuseList.selectAll("*").remove();

        const measureWeightConv = stats.measureWeightConv;
        const measureConvLen = measureWeightConv.length;
        let hasRefuse = false;

        // add the checkboxes for the serving sizes
        for (let i = 0; i < measureConvLen; ++i) {
            const measureConv = measureWeightConv[i];
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) {
                this.addRefuseListItem(measureConv);
                
                if (!hasRefuse) {
                    hasRefuse = true;
                }
            } else {
                this.addServingCheckbox(measureConv, i);
            }
        }

        this.htmlElements.refuseListContainer.classed("d-none", !hasRefuse);

        const dataTable = this.updateNutrientTable(stats);

        this.htmlElements.servingSizeCheckList.selectAll("input[type=checkbox]").on("change", function(measureConvInd) {
            self.updateNutrientTableConvCols(dataTable, measureConvInd, this.checked);
        })

        return dataTable;
    }

    loadPage() {
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadPageInputs();
        this.setupSearchTable();
    }
}