import { Model } from "../backend.js";
import { SearchOpts, SearchAtts, FoodSearchTableCols, NutrientTableCols, TableCols, DataCols, MeasureTypeCodes, KeyboardCodes, DefaultMeasureCode, NutrientTableExtraCols, NutrientStatAtts, DefaultMeasureTypeCode } from "../constants.js";
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
    updateTable({selector, columnInfo, data, dataTableAtts = {}, destroyExisting = false, searchTxt, order = null, columnNameUpdates = null} = {}) {
        let dataTable;

        const dataTableTranslations = Translation.translate("dataTable", { returnObjects: true });
        const fullAttributes = DictTools.combine([{
            language: dataTableTranslations,
            columns: columnInfo,
            scrollCollapse: true,
            scrollX: true,
            scrollY: '400px',
            pageLength: 100,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, Translation.translate("dataTableAllOptions")]]
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

        if (columnNameUpdates !== null) {
            dataTable.columns().every(function(index) {
                const newName = columnNameUpdates[index];
                
                if (newName !== undefined) {
                    const header = $(this.header());
                    const title = header.find('.dt-column-title');

                    if (title.length) {
                        title.text(newName);
                    } else {
                        // Fallback if the title isn't wrapped by DataTables
                        header.contents()
                            .filter(function() {
                                return this.nodeType === Node.TEXT_NODE;
                            })
                            .remove();

                        header.prepend(document.createTextNode(newName));
                    }
                }
            });
        }

        if (searchTxt !== undefined) {
            dataTable.search(searchTxt);
        }

        dataTable.rows.add(data);

        if (order !== null) {
            dataTable.order(order);
        }

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

    // updateDropdownSelect(dropdownSelector, selections, input, onChange): Update the selections for the dropdown select widget
    updateDropdownSelect({dropdownSelector, selections, input, onChange = undefined, noneOption = null} = {}) {
        let dropdown = d3.select(dropdownSelector);

        const selectionIsArr = Array.isArray(selections);
        const orderedSelections = selectionIsArr ? selections : Array.from(selections);

        if (selectionIsArr) {
            orderedSelections.sort((a, b) => a.text.localeCompare(b.text));
        } else {
            orderedSelections.sort();
        }

        dropdown.html("")
            .selectAll("option")
            .data(orderedSelections)
            .enter()
            .append("option")
            .attr("value", (d) => selectionIsArr ? d.value : null)
            .text((d) => selectionIsArr ? d.text : d);

        if (noneOption !== null) {
            dropdown.append("option")
                .attr("value", (d) => noneOption.value)
                .text((d) => noneOption.text)
                .property("disabled", true)
                .property("hidden", true);
        }
        
        if (onChange !== undefined) {
            dropdown.on("change", function (val, ind) {
                onChange(val);
            });
        }
    }

    // updateMultiSelect(dropdownSelector, selections, inputs, onChange, translations): Updates the selections for the multi-select dropdown select widget
    updateMultiSelect({dropdownSelector, selections, inputs, onChange = undefined, noneSelectedText = ""} = {}) {
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

    setupAutoCompleteSelect({elementSelector, selections, inputs, onChange = undefined, maxItemCount = undefined, 
                             maxItemText = undefined, placeholder = undefined, noResultsText = undefined, selectAtts = {}, searchFunc = null,
                             sort = true} = {}) {
        const element = d3.select(elementSelector);
        const hasPlaceholder = placeholder !== undefined;

        let choicesOpts = {
            removeItemButton: true,
            searchEnabled: true,
            searchChoices: true,
            placeholder: hasPlaceholder,
            placeholderValue: hasPlaceholder ? placeholder : "",
            itemSelectText: "",
            shouldSort: sort,
            allowHTML: true
        };

        if (maxItemCount !== undefined) {
            choicesOpts.maxItemCount = maxItemCount;
        }

        if (maxItemText !== undefined) {
            choicesOpts.maxItemText = maxItemText;
        }

        if (noResultsText !== undefined) {
            choicesOpts.noResultsText = noResultsText;
        }

        choicesOpts = DictTools.combine([choicesOpts, selectAtts]);
        const result = new Choices(element.node(), choicesOpts);

        result.setChoices(selections, 'value', 'text', true);

        if (!Array.isArray(inputs)) {
            inputs = Array.from(inputs);
        }

        result.removeActiveItems();
        result.setChoiceByValue(inputs);

        if (searchFunc !== null) {
            result._searchChoices = function(searchTerm) {
                const cleanTerm = (searchTerm || '').toLowerCase().trim();

                if (cleanTerm === '') {
                    result._isSearching = false;
                    result._currentValue = '';

                    result._store.dispatch({
                        type: 'ACTIVATE_CHOICES',
                        active: true
                    });

                    return selections.length;
                }

                const filteredResults = searchFunc(searchTerm, selections);
                const results = filteredResults
                    .map((filteredChoice, index) => {
                        const choice = result._store.choices.find(
                            existingChoice =>
                                result.config.valueComparer(
                                    existingChoice.value,
                                    filteredChoice.value
                                )
                        );

                        if (!choice) {
                            return null;
                        }

                        return {
                            item: choice,
                            score: index
                        };
                    })
                    .filter(resultItem => resultItem !== null);

                result._isSearching = true;
                result._currentValue = cleanTerm;
                result._highlightPosition = 0;

                result._store.dispatch({
                    type: 'FILTER_CHOICES',
                    results
                });

                return results.length;
            };
        }

        element.on('change', function () {
            if (onChange !== undefined) {
                const currentSelections = result.getValue(true);
                onChange(currentSelections);
            }
        });

        return result;
    }

    scrollToElement(nodeElement) {
        nodeElement.scrollIntoView({ 
            behavior: "smooth",
            block: "start"
        });
    }
}


// BaseSearchPage: Base class to search foods based on some inputs
export class BaseSearchPage extends BasePage {
    constructor(model, app, searchOpt) {
        super(model, app);
        this.htmlNames = {
            foodSelected: "foodSelected",
            servingSizeInput: "servingSizeInput",
            servingSizeOpt: "servingSizeOpt",
            portionValCell: "nutrientPortionValCell",
            highlightedNutrientCell: "highlightedNutrientCell"
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
            searchContainer: d3.select("#searchSection"),
            searchButton: d3.select("#searchButton"),
            resetSearchButton: d3.select("#resetButton"),
            searchTableTitle: d3.select("#searchResultTitle"),

            foodResultContainer: d3.select(".foodResultContainer"),
            foodResultCard: d3.select("#foodResultCard"),
            searchCSVDownloadBtn: d3.select("#searchCSVDownload"),
            servingSizeCheckList: d3.select(".servingSizeContainer ul"),
            refuseListContainer: d3.select(".servingRefuseContainer"),

            nutrientStatsDownloadBtn: d3.select("#nutrientCSVDownload"),
            nutrientStatCSVDownloadAllBtn: d3.select("#allNutrientCSVDownload"),
            nutrientTableTitle: d3.select("#nutrientTableTitle"),
            
            legendAccordion: d3.select("#legend-accordion"),
            instructionsAccordion: d3.select("#about-tool-details")
        };

        elements.refuseList = elements.refuseListContainer.select("ul");
        elements.instructionsText = elements.instructionsAccordion.select("div p");

        elements.legendAccordion.attr("open", null)
        elements.instructionsAccordion.attr("open", null)

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {
        d3.select("#foodSearchInstructions").html(Translation.translate("SearchTableInstructions"));

        this.htmlElements.searchTableTitle.html(Translation.translate("SearchTableTitle"));

        this.htmlElements.foodResultCard.select(".cardDetails .card-title").html(Translation.translate("FoodNutrientStats.ServingTitle"));
        this.htmlElements.refuseListContainer.select("h5").html(Translation.translate("FoodNutrientStats.ServingRefuseTitle"));
        this.htmlElements.searchCSVDownloadBtn.html(Translation.translate("CSVDownload.DownloadSearchButtonTitle"))

        this.htmlElements.nutrientStatCSVDownloadAllBtn.html(Translation.translate("CSVDownload.DownloadAllNutrientButtonTitle"));
        this.htmlElements.nutrientStatsDownloadBtn.html(Translation.translate("CSVDownload.DownloadNutrientButtonTitle"));

        d3.select("#about-tool-details summary h2").html(Translation.translate("InstructionsTitle"));

        d3.selectAll(".toTopBtnText").each((data, ind, nodes) => {
            const textNode = d3.select(nodes[ind]);
            textNode.html(Translation.translate("BackToTop")); 
        });
    }

    // setupListeners(): Setups all the initial listeners
    setupListeners() {
        const elements = this.htmlElements;
        const self = this;

        elements.searchButton.on("click", () => { 
            this.model.clearSelectedFoods(this.searchOpt);
            this.htmlElements.searchTable.removeClass(this.htmlNames.foodSelected);
            this.submitSearch(); 
        });

        elements.resetSearchButton.on("click", () => {
            this.clearSearch();
        });

        elements.nutrientStatsDownloadBtn.on("click", () => {
            this.model.downloadNutrientCSV(this.searchOpt);
        });

        elements.nutrientStatCSVDownloadAllBtn.on("click", () => {
            this.model.downloadAllNutrientCSV(this.searchOpt);
        });

        elements.searchCSVDownloadBtn.on("click", () => {
            this.model.downloadSearchCSV();
        });
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

            if (!foodSelected) return;

            self.model.clearNutrientStatsInputs(self.searchOpt);
            self.showFoodNutrientStats(foodCode);
        });

        this.searchTable.on('search.dt', function() {
            self.model.searchInputs[self.searchOpt][SearchAtts.FilterHelper] = self.searchTable.search();
        });
    }

    // updateSearchTable(selectFood, searchTxt, resetSort): Updates the search table
    updateSearchTable(selectFood = false, searchTxt = null, resetSort = false) {

    }

    // clearSearch(): Clears the search inputs of the page
    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.model.clearSelectedFoods(this.searchOpt);
        this.syncInputs();
        this.hideFoodNutrientStats();

        this.updateSearchTable(false, "", true);
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
        this.scrollToElement(this.htmlElements.searchContainer.node());
        const inputs = this.model.searchInputs[this.searchOpt]; 
        this.updateSearchTable(false, inputs[SearchAtts.FilterHelper]);
    }

    // updateNutrientTable(visibleMeasureCodes): Updates the nutrient table
    updateNutrientTable(visibleMeasureCodes) {
        const translations = Translation.translate("FoodNutrientStats.TableCols", { returnObjects: true });

        let tableColInfo = [{data: DataCols.NutrientOrder, visible: false}];
        tableColInfo.push(...NutrientTableCols.map((tableAtt) => {
            const isExtraCol = NutrientTableExtraCols.has(tableAtt);

            const visible = ((isExtraCol && this.model.showFoodNutrientsExtraColsFromSearchOpt(this.searchOpt)) || 
                             !isExtraCol);

            return {title: translations[tableAtt], data: Translation.getDataCol(tableAtt), name: tableAtt, orderable: false, visible };
        }));

        const measureWeightConv = this.model.searchedNutrientData.measureWeightConv;
        const measureConvLen = measureWeightConv.length;

        if (visibleMeasureCodes == undefined) {
            visibleMeasureCodes = new Set();
        }

        const measureTableColInfo = [];
        for (const measureConv of measureWeightConv) {
            const measureTypeCode = measureConv[DataCols.MeasureTypeCode];

            if (measureTypeCode == MeasureTypeCodes.Refuse) continue;

            const measureColTitle = Translation.translate((measureTypeCode == DefaultMeasureTypeCode) ? "FoodNutrientStats.ConvertedMeasureColWithoutConversion" : "FoodNutrientStats.ConvertedMeasureCol", {
                measureName: Translation.translateNum(measureConv[Translation.getDataCol(TableCols.MeasureDescription)]), 
                convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)
            });

            const measureCode = measureConv[DataCols.MeasureCode];
            const measureVisible = visibleMeasureCodes.has(measureCode);
            const measureConvId = measureConv[TableCols.MeasureWeightConvId];

            const dataCol = Model.getConvertedNutrientColName(measureConvId);
            measureTableColInfo.push({title: measureColTitle, data: dataCol, name: dataCol, visible: measureVisible, orderable: false});
        }

        tableColInfo.splice(2, 0, ...measureTableColInfo);

        const dataTable = this.updateTable({
            selector: this.htmlSelectors.nutrientTable, 
            columnInfo: tableColInfo, 
            data: this.model.webSearchedNutrientTable, 
            dataTableAtts: {scrollY: '800px',
                pageLength: -1,
                orderFixed: {
                    pre: [0, 'asc'] // Fix the order for the nutrients
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
                },
                columnDefs: [
                    {
                        targets: 1,
                        createdCell: (td, cellData, rowData, row, col) => {
                            if (!this.model.highlightedNutrientNames.has(cellData)) return;
                            $(td).addClass(this.htmlNames.highlightedNutrientCell);
                        }
                    }
                ]
            }, 
            destroyExisting: true});
        return dataTable;
    }

    // updateNutrientTableConvCols(dataTable, ind, show): Updates the nutrient table to hide/show certain portion serving columns
    updateNutrientTableConvCols(dataTable, ind, show, updateDatable = false) {
        const colName = Model.getConvertedNutrientColName(ind);
        dataTable.column(`${colName}:name`).visible(show); 
        if (!updateDatable) return;

        if (dataTable.rowGroup) {
            dataTable.rowGroup().draw();
        }

        dataTable.columns.adjust().draw(false); 
    }

    // updateNutrientTableExtraCols(dataTable, show): Updates the nutrient table to hide/show the extra detail columns
    updateNutrientTableExtraCols(dataTable, show, updateDatable = false) {
        for (const tableAtt of NutrientTableExtraCols) {
            dataTable.column(`${tableAtt}:name`).visible(show); 
        }

        if (!updateDatable) return;

        if (dataTable.rowGroup) {
            dataTable.rowGroup().draw();
        }

        dataTable.columns.adjust().draw(false); 
    }

    // addServingCheckbox(measureConv, measureConvInd, isChecked): Adds the checkbox for the serving portions
    addServingCheckbox(measureConv, measureConvId, isChecked) {
        const measureCode = measureConv[TableCols.MeasureCode];
        const checkboxId = `${this.htmlNames.servingSizeOpt}_${measureConv[TableCols.FoodCode]}_${measureConv[TableCols.MeasureTypeCode]}_${measureCode}`;
        const checkboxText = Translation.translate("FoodNutrientStats.ServingSizeOption", 
                                                    {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)], 
                                                    convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], undefined)});

        this.addCheckbox({checkboxLst: this.htmlElements.servingSizeCheckList, 
                          checkLstName: this.htmlNames.servingSizeInput, 
                          checkboxVal: [{measureConvId: measureConvId, measureConv}], 
                          checkboxId, 
                          checkboxText, 
                          isChecked});
    }

    // addRefuseListItem(measureConv): Adds a list item to the refused serving portions
    addRefuseListItem(measureConv) {
        const text = Translation.translate("FoodNutrientStats.ServingRefuseListItem", 
                                           {measureName: measureConv[Translation.getDataCol(TableCols.MeasureDescription)],
                                            convertedMeasure: Translation.translateNum(measureConv[TableCols.MeasureWeight], 0)});

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
        const stats = this.model.getFoodNutrientStats(foodCode, this.searchOpt);
        const statsEmpty = stats === undefined;

        foodResultContainer.classed("d-none", statsEmpty);
        if (statsEmpty) return;

        const foodResultCard = this.htmlElements.foodResultCard;
        const foodStats = stats.food;

        const foodName = foodStats[Translation.getDataCol(TableCols.FoodDescription)];
        const altFoodName = foodStats[Translation.getDataCol(TableCols.FoodDescription, true)];
        const foodSource = foodStats[Translation.getDataCol(TableCols.FoodSourceDescription)];

        foodResultCard.select(".cardHeader #nutrientCardTitle").html(foodName);
        foodResultCard.select(".cardHeader #nutrientCardAltTitle").html(altFoodName);
        foodResultCard.select(".cardHeader #nutrientCardFoodCode").html(Translation.translate("FoodNutrientStats.SubTitle", { foodCode: foodCode }));
        foodResultCard.select(".cardHeader #nutrientCardSourceText").html(Translation.translate("FoodNutrientStats.SourceSubTitle", {foodSource: foodSource}));
        
        this.htmlElements.nutrientTableTitle.html(Translation.translate("FoodNutrientStats.NutrientTableTitle", { foodName, foodCode }));

        this.htmlElements.servingSizeCheckList.selectAll("*").remove();
        this.htmlElements.refuseList.selectAll("*").remove();

        const measureWeightConv = stats.measureWeightConv;
        let hasRefuse = false;

        const measureCodesSelected = this.model.nutrientStatsInputs[this.searchOpt][NutrientStatAtts.MeasureCodesSelected];

        // add the checkboxes for the serving sizes
        for (const measureConv of measureWeightConv) {
            if (measureConv[DataCols.MeasureTypeCode] == MeasureTypeCodes.Refuse) {
                this.addRefuseListItem(measureConv);
                
                if (!hasRefuse) {
                    hasRefuse = true;
                }
            } else {
                const measureCode = measureConv[TableCols.MeasureCode];
                const measureConvId = measureConv[TableCols.MeasureWeightConvId];

                const isChecked = measureCodesSelected.has(measureCode);
                this.addServingCheckbox(measureConv, measureConvId, isChecked);
            }
        }

        this.htmlElements.refuseListContainer.classed("d-none", !hasRefuse);

        const visibleMeasureCodes = this.model.nutrientStatsInputs[this.searchOpt][NutrientStatAtts.MeasureCodesSelected];
        const dataTable = this.updateNutrientTable(visibleMeasureCodes);

        // when the user selects some serving size checkbox
        this.htmlElements.servingSizeCheckList.selectAll("input[type=checkbox]").on("change", function(measureConvData) {
            const measureConvId = measureConvData.measureConvId;
            const measureConv = measureConvData.measureConv;
            const measureCode = measureConv[TableCols.MeasureCode];

            const nutrientStatsInputs = self.model.nutrientStatsInputs[self.searchOpt];

            const measureCodesSelected = nutrientStatsInputs[NutrientStatAtts.MeasureCodesSelected];
            if (this.checked) {
                measureCodesSelected.add(measureCode);
            } else {
                measureCodesSelected.delete(measureCode);
            }

            nutrientStatsInputs[NutrientStatAtts.ShowExtraDetails] = null;
            nutrientStatsInputs[NutrientStatAtts.ShowUnit] = null;

            let showExtraDetails = self.model.showFoodNutrientsExtraColsFromSearchOpt(self.searchOpt);

            self.updateNutrientTableConvCols(dataTable, measureConvId, this.checked);
            self.updateNutrientTableExtraCols(dataTable, showExtraDetails);

            if (dataTable.rowGroup) {
                dataTable.rowGroup().draw();
            }

            dataTable.columns.adjust().draw(false); 
        });

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


// BaseComparePage: 
export class BaseComparePage extends BasePage {
    constructor(model, app, searchOpt) {
        super(model, app);
        this.searchOpt = searchOpt;

        this.htmlNames = {
            highlightedNutrientCell: "highlightedNutrientCell"
        }

        this.htmlSelectors = {
            foodSearchTable: '#foodSearchTable'
        }

        this.htmlElements = {};
        this.searchTable;
    }

    updateHTMLElements() {
        const elements = {
            searchContainer: d3.select("#searchSection"),
            searchButton: d3.select("#searchButton"),
            resetSearchButton: d3.select("#resetButton"),
            searchTable: $(this.htmlSelectors.foodSearchTable),
            searchCSVDownloadBtn: d3.select("#searchCSVDownload"),
            searchTableTitle: d3.select("#searchResultTitle"),

            legendAccordion: d3.select("#legend-accordion"),
            instructionsAccordion: d3.select("#about-tool-details")
        };

        elements.instructionsText = elements.instructionsAccordion.select("div p");

        elements.legendAccordion.attr("open", null)
        elements.instructionsAccordion.attr("open", null)

        this.htmlElements = elements;
    }

    // updateStaticText: Updates text for the search page
    updateStaticText() {
        const elements = this.htmlElements;

        d3.select("#searchTitle").html(Translation.translate("SearchCriteriaTitle"));
        elements.searchTableTitle.html(Translation.translate("SearchTableTitle"));
        elements.searchCSVDownloadBtn.html(Translation.translate("CSVDownload.DownloadSearchButtonTitle"))

        elements.searchButton.attr("value", Translation.translate("FoodSearchButton"));
        elements.resetSearchButton.html(Translation.translate("FoodSearchResetButton"));

        d3.select("#about-tool-details summary h2").html(Translation.translate("InstructionsTitle"));

        d3.selectAll(".toTopBtnText").each((data, ind, nodes) => {
            const textNode = d3.select(nodes[ind]);
            textNode.html(Translation.translate("BackToTop")); 
        });
    }

    // setupListeners(): Setups all the initial listeners
    setupListeners() {
        const elements = this.htmlElements;

        elements.searchButton.on("click", () => { 
            this.submitSearch();
        });

        elements.resetSearchButton.on("click", () => {
            this.clearSearch();
        });

        elements.searchCSVDownloadBtn.on("click", () => {
            this.model.downloadSearchCSV();
        });
    }

    // clearSearch(): Clears the search inputs of the page
    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.syncInputs();
        this.updateSearchTable("", true);
    }

    // getInputs(): Retrieves the values of the input widgets to the backend
    getInputs() {

    }

    // submitSearch(): Submits the search inputs to retrieve the search results in the search table
    submitSearch() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.scrollToElement(elements.searchContainer.node());
        this.getInputs();

        inputs[SearchAtts.FilterHelper] = this.searchTable.search();
        this.updateSearchTable(inputs[SearchAtts.FilterHelper]);
    }

    // setupSearchTable(): Setup the search table
    setupSearchTable() {
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.searchTable = this.updateSearchTable(inputs[SearchAtts.FilterHelper]);
        if (this.searchTable === undefined) return;

        const self = this;

        this.searchTable.on('search.dt', function() {
            self.model.searchInputs[self.searchOpt][SearchAtts.FilterHelper] = self.searchTable.search();
        });
    }

    // updateSearchTable(selectFood, resetSort): Updates the search table
    updateSearchTable(searchTxt = null, resetSort = false) {

    }

    syncInputs() {

    }

    loadPageInputs() {

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