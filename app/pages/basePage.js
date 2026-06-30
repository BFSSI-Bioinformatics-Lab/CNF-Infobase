import { Model } from "../backend.js";
import { SearchOpts, SearchAtts, FoodSearchTableCols, NutrientTableCols, TableCols, DataCols, MeasureTypeCodes, KeyboardCodes, DefaultMeasureCode } from "../constants.js";
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
    updateTable({selector, columnInfo, data, dataTableAtts = {}, destroyExisting = false, searchTxt} = {}) {
        let dataTable;

        const dataTableTranslations = Translation.translate("dataTable", { returnObjects: true });
        const fullAttributes = DictTools.combine([{
            language: dataTableTranslations,
            columns: columnInfo,
            scrollCollapse: true,
            scrollX: true,
            scrollY: '400px',
            pageLength: 100,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
        }, dataTableAtts]);

        if (DataTable.isDataTable(selector)) {
            dataTable = $(selector).DataTable();

            if (destroyExisting) {
                dataTable.destroy();
                $(selector).empty();
                dataTable = $(selector).DataTable(fullAttributes);
            }
        } else {
            dataTable = $(selector).DataTable(fullAttributes);
        }

        dataTable.clear();
        if (searchTxt !== undefined) {
            dataTable.search(searchTxt);
        }

        dataTable.rows.add(data);
        dataTable.draw();
        return dataTable;
    }

    // addCheckbox(checkboxLst, checkLstName, checkboxVal, checkboxId, checkboxText, isChecked): 
    //  Adds a checkbox to some container
    addCheckbox({checkboxLst, checkLstName, checkboxVal, checkboxId, checkboxText = "", isChecked = false} = {}) {
        const checkboxContainer = checkboxLst.append("li");
        checkboxContainer.classed("checkbox", true);

        const checkboxInput = checkboxContainer.append("input");
        checkboxInput.attr("type", "checkbox");
        checkboxInput.attr("id", checkboxId);
        checkboxInput.attr("name", checkLstName);
        checkboxInput.property("checked", isChecked);
        checkboxInput.data(checkboxVal);

        const checkboxLabel = checkboxContainer.append("label");
        checkboxLabel.attr("for", checkboxId);
        checkboxLabel.html(checkboxText);
    }

    // updateDropdownSelect(dropdownSelector, selections, inputs, onChange, translations): Updates the selections for the dropdown select widget
    updateDropdownSelect({dropdownSelector, selections, inputs, onChange = undefined, noneSelectedText = ""} = {}) {
        // destroy the select picker, so that when adding the new selections
        //  to the dropdown, the dropdown will not fire extra events
        let dropdown = $(dropdownSelector);
        dropdown.selectpicker('destroy');

        const selectionIsArr = Array.isArray(selections);
        const orderedSelections = selectionIsArr ? selections : Array.from(selections);

        if (selectionIsArr) {
            orderedSelections.sort((a, b) => a.text.localeCompare(b.text));
        } else {
            orderedSelections.sort();
        }

        d3.select(dropdownSelector)
            .html("")
            .selectAll("option")
            .data(orderedSelections)
            .enter()
            .append("option")
            .attr("value", (d) => selectionIsArr ? d.value : null)
            .text((d) => selectionIsArr ? d.text : d);

        dropdown = $(dropdownSelector).selectpicker({
            deselectAllText: Translation.translate("DeselectAll"), 
            selectAllText: Translation.translate("SelectAll"),
            container: 'body',
            noneSelectedText});
        
        if (orderedSelections.length == inputs.size) {
            dropdown.selectpicker('selectAll');
        } else {
            dropdown.selectpicker('val', Array.from(inputs));
        }

        dropdown.on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
            if (onChange !== undefined) {
                onChange(dropdown.val());
            }
        });
    }
}


// BaseSearchPage: Base class for searches foods based on some inputs
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
        this.searchTable;
    }

    // updateHtmlElements(): Updates the common HTML elements for the search page
    updateHTMLElements() {
        const elements = {
            searchButton: d3.select("#searchButton"),
            resetSearchButton: d3.select("#resetButton"),
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
        const elements = this.htmlElements;

        elements.searchButton.on("click", () => { 
            this.model.clearSelectedFoods(this.searchOpt);
            this.htmlElements.searchTable.removeClass(this.htmlNames.foodSelected);
            this.submitSearch(); 
        });

        elements.resetSearchButton.on("click", () => {
            this.clearSearch();
        })
    }

    // loadPageInputs(): Setup any initial inputs for the page
    loadPageInputs() {

    }

    // setupSearchTable(): Setup the search table
    setupSearchTable() {
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.searchTable = this.updateSearchTable(this.model.foodSelected[this.searchOpt], inputs[SearchAtts.FilterHelper]);
        if (this.searchTable === undefined) return;

        const self = this;

        $(`${this.htmlSelectors.foodSearchTable} tbody`).on('click', 'tr', function () {
            const rowData = self.searchTable.row(this).data();
            if (rowData === undefined) return;

            const foodCode = rowData[TableCols.FoodCode];
            self.model.selectedFoodCodes[self.searchOpt] = [foodCode];

            const foodSelected = !self.model.foodSelected[self.searchOpt];
            self.model.foodSelected[self.searchOpt] = foodSelected;
            
            self.updateSearchTable(foodSelected);
            self.showFoodNutrientStats(foodCode);
        });

        this.searchTable.on('search.dt', function() {
            self.model.searchInputs[self.searchOpt][SearchAtts.FilterHelper] = self.searchTable.search();
        });
    }

    // updateSearchTable(selectFood, searchTxt): Updates the search table
    updateSearchTable(selectFood = false, searchTxt = null) {

    }

    // clearSearch(): Clears the search inputs of the page
    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.model.clearSelectedFoods(this.searchOpt);
        this.syncInputs();
        this.hideFoodNutrientStats();

        this.updateSearchTable(false, "");
    }

    // syncInputs: Synchronizes the page's inputs with the inputs the user has previously entered
    syncInputs() {

    }

    // submitSearchKeyboardListener(): Listener to submit the search results when the user uses the keyboard
    submitSearchKeyboardListener() {
        if (d3.event.keyCode != KeyboardCodes.Enter) return;

        d3.event.preventDefault();
        this.submitSearch();
    }
    
    // submitSearch(): Submits the search inputs to retrieve the search results in the search table
    submitSearch() {
        const inputs = this.model.searchInputs[this.searchOpt]; 
        this.updateSearchTable(false, inputs[SearchAtts.FilterHelper]);
    }

    // updateNutrientTable(visibleMeasureCodes): Updates the nutrient table
    updateNutrientTable(visibleMeasureCodes) {
        const translations = Translation.translate("FoodNutrientStats.TableCols", { returnObjects: true });

        let tableColInfo = [{data: TableCols.NutrientGroupOrder, visible: false}];
        tableColInfo.push(...NutrientTableCols.map((tableAtt) => {
            return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt)};
        }));

        const measureWeightConv = this.model.searchedNutrientData.measureWeightConv;
        const measureConvLen = measureWeightConv.length;

        if (visibleMeasureCodes == undefined) {
            visibleMeasureCodes = new Set();
        }

        for (let i = 0; i < measureConvLen; ++i) {
            const measureConv = measureWeightConv[i];
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) continue;

            const measureColTitle = Translation.translate("FoodNutrientStats.ConvertedMeasureCol", {
                measureName: Translation.translateNum(measureConv[Translation.getDataCol(TableCols.MeasureDescription)]), 
                convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)
            });

            const measureCode = measureConv[DataCols.MeasureCode];
            const measureVisible = visibleMeasureCodes.has(measureCode);

            const dataCol = Model.getConvertedNutrientColName(i);
            tableColInfo.push({title: measureColTitle, data: dataCol, name: dataCol, visible: measureVisible});
        }

        const dataTable = this.updateTable({
            selector: this.htmlSelectors.nutrientTable, 
            columnInfo: tableColInfo, 
            data: this.model.webSearchedNutrientTable, 
            dataTableAtts: {scrollY: '800px',
                pageLength: -1,
                order: [[1, 'asc']],
                orderFixed: {
                    pre: [0, 'asc'] // Fix the nutrient group column so when sorting, the nutrients only get sorted in their corresponding sections
                },
                rowGroup: {
                    dataSrc: Translation.getDataCol(TableCols.NutrientGroup),
                    startRender: function (rows, group) {
                        var api = rows.context[0].oInstance.api();
                        var visibleColumnsCount = api.columns(':visible').count();

                        var stickyWrapper = $('<div class="dtrg-sticky-window"/>')
                            .append($('<span class="dtrg-sticky-text"/>').text(group));

                        return $('<tr class="dtrg-group dtrg-start dtrg-level-0"/>')
                            .append(
                                $(`<th colspan="${visibleColumnsCount}" scope="row"/>`)
                                    .append(stickyWrapper)
                            );
                    }
                }
            }, 
            destroyExisting: true});
        return dataTable;
    }

    // updateNutrientTableConvCols(dataTable, ind, show): Updates the nutrient table to hide/show certain portion serving columns
    updateNutrientTableConvCols(dataTable, ind, show) {
        const colName = Model.getConvertedNutrientColName(ind);
        dataTable.column(`${colName}:name`).visible(show); 

        if (dataTable.rowGroup) {
            dataTable.rowGroup().draw();
        }

        dataTable.columns.adjust().draw(false); 
    }

    // addServingCheckbox(measureConv, measureConvInd, isChecked): Adds the checkbox for the serving portions
    addServingCheckbox(measureConv, measureConvInd, isChecked) {
        const measureCode = measureConv[TableCols.MeasureCode];
        const checkboxId = `${this.htmlNames.servingSizeOpt}_${measureConv[TableCols.FoodCode]}_${measureConv[TableCols.MeasureTypeCode]}_${measureCode}`;
        const checkboxText = Translation.translate("FoodNutrientStats.ServingSizeOption", 
                                                    {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)], 
                                                    convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)});
        const isDefaultMeasure = measureCode == DefaultMeasureCode;

        this.addCheckbox({checkboxLst: this.htmlElements.servingSizeCheckList, 
                          checkLstName: this.htmlNames.servingSizeInput, 
                          checkboxVal: [measureConvInd], 
                          checkboxId, 
                          checkboxText, 
                          isChecked: isDefaultMeasure});
    }

    // addRefuseListItem(measureConv): Adds a list item to the refused serving portions
    addRefuseListItem(measureConv) {
        const text = Translation.translate("FoodNutrientStats.ServingRefuseListItem", 
                                           {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)],
                                            convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)});

        this.htmlElements.refuseList.append("li").html(text);
    }

    // hideFoodNutrientStats(): Hides the nutrient stats
    hideFoodNutrientStats() {
        this.htmlElements.foodResultContainer.classed("d-none", true);
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

        const visibleMeasureCodes = new Set([DefaultMeasureCode]);
        const dataTable = this.updateNutrientTable(visibleMeasureCodes);

        this.htmlElements.servingSizeCheckList.selectAll("input[type=checkbox]").on("change", function(measureConvInd) {
            self.updateNutrientTableConvCols(dataTable, measureConvInd, this.checked);
        })

        return dataTable;
    }

    loadPage() {
        super.loadPage();
        this.updateHTMLElements();
        this.updateStaticText();
        this.setupListeners();
        this.loadPageInputs();
        this.setupSearchTable();
    }
}