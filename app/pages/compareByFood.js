import { SearchOpts, SearchAtts, DataCols, CompFoodSearchTableCols, TableCols } from "../constants.js";
import { Translation } from "../tools.js";
import { BaseComparePage } from "./basePage.js";
import { Model } from "../backend.js";


export class CompareByFood extends BaseComparePage {
    constructor(model, app) {
        super(model, app, SearchOpts.CompareFoods);

        this.htmlSelectors.foodInput = "#foodInput";
        this.maxFoodsCount = 3;
    }

    updateHTMLElements() {
        super.updateHTMLElements();
        const elements = this.htmlElements;
        elements.multiFoodContainer = d3.select("#foodInputContainer");
    }

    updateStaticText() {
        super.updateStaticText();

        const elements = this.htmlElements;
        elements.multiFoodContainer.select("label").html(Translation.translate("MultiFoodInputTitle"));
        elements.searchTableTitle.html(Translation.translate("CompareSearchTableTitle"));
    }

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

    clearSearch() {
        this.model.clearSearchInputs(this.searchOpt);
        this.syncInputs();
        this.updateSearchTable("", true);
    }

    getInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt]; 

        const foods = elements.foodInput.getValue(true);
        inputs[SearchAtts.FoodName] = (foods.length == 0) ? [] : foods;
    }

    updateSearchTable(searchTxt = null, resetSort = false) {
        const tableData = this.model.getCompareFoodTableData(this.searchOpt);
        let searchTable = this.htmlElements.searchTable;
        if (tableData === undefined) return;

        const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
        
        let tableColInfo = [];
        tableColInfo.push({data: DataCols.NutrientOrder, visible: false});
        for (const tableAtt of CompFoodSearchTableCols) {
            tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt), orderable: false});
        }

        const foodNameData = tableData.foodNames;

        for (const foodNameDatum of foodNameData) {
            const foodCode = foodNameDatum[DataCols.FoodCode];
            const foodName = foodNameDatum[Translation.getDataCol(DataCols.FoodDescription)];

            const dataCol = Model.getCompareFoodAmtColName(foodCode);
            const colName = Translation.translate("SearchTableCols.FoodName", {foodName, foodCode});

            tableColInfo.push({title: colName, data: dataCol, orderable: false});
        }

        const dataTable = this.updateTable({selector: this.htmlSelectors.foodSearchTable, 
                                            columnInfo: tableColInfo, 
                                            data: tableData.data, 
                                            searchTxt: (searchTxt !== null) ? searchTxt : undefined, 
                                            destroyExisting: true,
                                            order: (resetSort) ? [] : null,
                                            dataTableAtts: {
                                                scrollY: '800px',
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
                                                }
                                            }});
        return dataTable;
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        elements.foodInput.removeActiveItems();
        elements.foodInput.setChoiceByValue(inputs[SearchAtts.FoodName]);
    }

    loadPageInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];
        const selections = this.model.searchSelections[this.searchOpt];

        const foodNameSelections = selections[SearchAtts.FoodName];
        elements.foodInput = this.setupAutoCompleteSelect({elementSelector: this.htmlSelectors.foodInput, 
                                                            selections: foodNameSelections, 
                                                            inputs: new Set([inputs[SearchAtts.FoodName]]),
                                                            maxItemCount: this.maxFoodsCount,
                                                            maxItemText: (maxItemCount) => Translation.translate("multiselectAutoComplete.maxItemText", {maxItemCount: this.maxFoodsCount}),
                                                            placeholder: Translation.translate("MultiFoodsPlaceholder"),
                                                            noResultsText: Translation.translate("multiselectAutoComplete.noResultsText"),
                                                            searchFunc: (searchTerm, selections) => this.model.filterFoodNameSelections(searchTerm, selections),
                                                            sort: false,
                                                            selectAtts: {
                                                                searchResultLimit: foodNameSelections.length,
                                                                
                                                                // fuzzy matching engine
                                                                fuseOptions: {
                                                                    threshold: 0.15 // range of 0-1, 0 = exact match
                                                                }
                                                             }});

        this.clearSearch();
    } 
}