import { SearchOpts, SearchAtts, DataCols, CompNutrientSearchTableCols } from "../constants.js";
import { Translation } from "../tools.js";
import { BaseComparePage } from "./basePage.js";
import { Model } from "../backend.js";


export class CompareByNutrient extends BaseComparePage {
    constructor(model, app) {
        super(model, app, SearchOpts.CompareNutrients);

        this.htmlSelectors.foodGroupInput = "#foodGroupInput";
        this.htmlSelectors.nutrientInput = "#nutrientInput";
        this.maxNutrientsCount = 3;
    }

    updateHTMLElements() {
        super.updateHTMLElements();
        const elements = this.htmlElements;
        elements.foodGroupInputContainer = d3.select("#foodGroupInputContainer");
        elements.multiNutrientInputContainer = d3.select("#nutrientInputContainer");
        elements.foodGroupInput = d3.select(this.htmlSelectors.foodGroupInput);
    }

    updateStaticText() {
        super.updateStaticText();

        const elements = this.htmlElements;
        elements.foodGroupInputContainer.select("label").html(Translation.translate("FoodGroupInputTitle"));
        elements.multiNutrientInputContainer.select("label").html(Translation.translate("MultiNutrientInputTitle"));
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

        const foodGroups = [elements.foodGroupInput.property("value")];
        inputs[SearchAtts.FoodGroup] = (foodGroups.length == 0) ? "" : foodGroups[0];

        const nutrients = elements.nutrientInput.getValue(true);
        inputs[SearchAtts.Nutrient] = (nutrients.length == 0) ? [] : nutrients;
    }

    // updateSearchTable(selectFood, resetSort): Updates the search table
    updateSearchTable(searchTxt = null, resetSort = false) {
        const tableData = this.model.getCompareNutrientTableData(this.searchOpt);
        let searchTable = this.htmlElements.searchTable;
        if (tableData === undefined) return;

        const translations = Translation.translate(`SearchTableCols.${this.searchOpt}`,{ returnObjects: true });
        
        let tableColInfo = [];
        for (const tableAtt of CompNutrientSearchTableCols) {
            tableColInfo.push({title: translations[tableAtt], data: Translation.getDataCol(tableAtt)});
        }

        const nutrientNameData = tableData.nutrientNames;
        for (const nutrientNameDatum of nutrientNameData) {
            const nutrientCode = nutrientNameDatum[DataCols.NutrientCode];
            const nutrientName = nutrientNameDatum[Translation.getDataCol(DataCols.NutrientName)];

            const dataCol = Model.getCompareNutrientAmtColName(nutrientCode);
            const colName = Translation.translate("SearchTableCols.ElementNutrientAmount", { returnObjects: true, element: nutrientName});

            tableColInfo.push({title: colName, data: dataCol});
        }

        const dataTable = this.updateTable({selector: this.htmlSelectors.foodSearchTable, 
                                            columnInfo: tableColInfo, 
                                            data: tableData.data, 
                                            searchTxt: (searchTxt !== null) ? searchTxt : undefined, 
                                            destroyExisting: true,
                                            order: (resetSort) ? [] : null});
        return dataTable;
    }

    syncInputs() {
        const elements = this.htmlElements;
        const inputs = this.model.searchInputs[this.searchOpt];

        elements.foodGroupInput.property("value", inputs[SearchAtts.FoodGroup]);

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
                                inputs: new Set([inputs[SearchAtts.FoodGroup]])});
        
        const nutrientSelections = selections[SearchAtts.Nutrient];
        elements.nutrientInput = this.setupAutoCompleteSelect({elementSelector: this.htmlSelectors.nutrientInput, 
                                                               selections: nutrientSelections, 
                                                               inputs: new Set([inputs[SearchAtts.Nutrient]]),
                                                               maxItemCount: this.maxNutrientsCount,
                                                               maxItemText: (maxItemCount) => Translation.translate("multiselectAutoComplete.maxItemText", {maxItemCount: this.maxNutrientsCount}),
                                                               placeholder: Translation.translate("MultiNutrientPlaceholder"),
                                                               noResultsText: Translation.translate("multiselectAutoComplete.noResultsText"),
                                                               selectAtts: {
                                                                    searchResultLimit: nutrientSelections.length,

                                                                    // fuzzy matching engine
                                                                    fuseOptions: {
                                                                        threshold: 0.15 // range of 0-1, 0 = exact match
                                                                    }
                                                               }});

        this.clearSearch();
    }
}