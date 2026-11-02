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

        if ($.fn.dataTable.isDataTable(selector)) {
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
        this.addUnsortedOrderStep(dataTable);
        return dataTable;
    }

    // addUnsortedOrderStep(dataTable): Makes clicking the header of a column that is already sorted
    //  in its last direction remove the sorting, instead of going back to the first direction
    // Note:
    // - DataTables 1.10 (used by WET) only cycles between ascending and descending, while
    //   DataTables 2 also goes back to unsorted
    // - Shift + click is left to DataTables, for sorting by multiple columns
    addUnsortedOrderStep(dataTable) {
        const settings = dataTable.settings()[0];
        const columnSettings = settings.aoColumns;

        dataTable.columns().every(function(colIndex) {
            const header = this.header();
            if (header.dataset.unsortedOrderStep) return;
            header.dataset.unsortedOrderStep = "true";

            const onSortAction = (event) => {
                if (event.shiftKey || (event.type == "keypress" && event.which != KeyboardCodes.Enter)) return;

                const order = dataTable.order();
                const orderSequence = columnSettings[colIndex].asSorting;
                const lastDirection = orderSequence[orderSequence.length - 1];
                if (order.length != 1 || order[0][0] != colIndex || order[0][1] != lastDirection) return;

                // run before the DataTables listener on the header and stop it from sorting again
                event.stopImmediatePropagation();

                // DataTables 1.10 breaks ties in the sorting by using the current position of the rows,
                //  so put the rows back in their original order to not keep the previous sorting
                settings.aiDisplayMaster.sort((a, b) => a - b);
                dataTable.order([]).draw();
            };

            header.addEventListener("click", onSortAction, true);
            header.addEventListener("keypress", onSortAction, true);
        });
    }

    // getGroupRowsDrawCallback(dataSrc): Creates a 'drawCallback' for a datatable that inserts a row
    //  before each group of rows, where the group's name is repeated in every visible column
    // Note:
    // - used instead of the RowGroup extension, which is not available for the DataTables version used by WET
    getGroupRowsDrawCallback(dataSrc) {
        return function() {
            const api = this.api();
            const visibleColumnsCount = api.columns(':visible').count();
            let lastGroup = null;

            api.rows({page: 'current'}).every(function() {
                const group = this.data()[dataSrc];
                if (group === lastGroup) return;
                lastGroup = group;

                const groupRow = $('<tr class="groupRow"/>');
                for (let i = 0; i < visibleColumnsCount; i++) {
                    groupRow.append($('<th scope="row"/>').text(group));
                }

                $(this.node()).before(groupRow);
            });
        };
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
    updateDropdownSelect({dropdownSelector, selections, input, onChange = undefined, noneOption = null, sortCmpFunc = null} = {}) {
        let dropdown = d3.select(dropdownSelector);

        const selectionIsArr = Array.isArray(selections);
        const orderedSelections = selectionIsArr ? selections : Array.from(selections);

        if (selectionIsArr && sortCmpFunc === null) {
            orderedSelections.sort((a, b) => a.text.localeCompare(b.text));
        } else if (sortCmpFunc !== null) {
            orderedSelections.sort(sortCmpFunc);
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

    // fixMultiSelectKeys(): Fixes the keyboard controls inside the menu of a multi-select dropdown
    static fixMultiSelectKeys() {
        if (BasePage.multiSelectKeysFixed) return;
        BasePage.multiSelectKeysFixed = true;

        const handledKeys = new Set(["Escape", "ArrowUp", "ArrowDown", "Tab", "Enter"]);
        const selectpickerKeySelector = '.bootstrap-select [role="listbox"], .bootstrap-select .bs-searchbox input';

        // runs bootstrap-select's own key handler for a key event on one of the parts of the menu that it listens to
        const runSelectpickerKeydown = (keyTarget, selectpickerEvent) => {
            selectpickerEvent.currentTarget = keyTarget;
            $.fn.selectpicker.Constructor.prototype.keydown.call(keyTarget, selectpickerEvent);
        };

        // moves the focus to the highlighted option
        // Note:
        // - bootstrap-select only draws the options around the scroll position of the list, and draws the other options
        //   once the list scrolls (on the 'scroll' event, which the browser fires later). Its 'scroll' handler is run right away,
        //   so that the highlighted option is drawn before focusing it
        // - the focus does not scroll the list, since bootstrap-select already scrolled it, and an extra scroll would
        //   redraw the options again and lose the focus
        const focusHighlightedOption = (menuContainer) => {
            const listbox = menuContainer.querySelector('[role="listbox"]');
            if (listbox !== null) $(listbox).triggerHandler("scroll");

            const highlightedOption = menuContainer.querySelector("li.active > a");
            if (highlightedOption !== null) highlightedOption.focus({preventScroll: true});
        };

        // moves the focus into the list of options, highlighting an option if none is
        const focusList = (menuContainer, listbox) => {
            if (menuContainer.querySelector("li.active") === null) {
                runSelectpickerKeydown(listbox, $.Event("keydown", {which: 40, keyCode: 40, key: "ArrowDown"}));
            }

            focusHighlightedOption(menuContainer);
        };

        window.addEventListener("keydown", (event) => {
            if (!handledKeys.has(event.key) || !(event.target instanceof Element)) return;

            // TAB from the button of an open dropdown moves into its menu, since the menu is at the end of the <body>
            //  and the browser would otherwise skip it
            const dropdownButton = event.target.closest('.bootstrap-select > button[aria-owns^="bs-select-"]');
            if (event.key === "Tab" && !event.shiftKey && dropdownButton !== null && dropdownButton.getAttribute("aria-expanded") === "true") {
                const buttonMenuInner = document.getElementById(dropdownButton.getAttribute("aria-owns"));
                const buttonMenuContainer = (buttonMenuInner === null) ? null : buttonMenuInner.closest(".bs-container");
                if (buttonMenuContainer === null) return;

                event.preventDefault();
                event.stopPropagation();

                const firstControl = buttonMenuContainer.querySelector(".bs-searchbox input, .bs-actionsbox button");
                if (firstControl !== null) {
                    firstControl.focus();
                } else {
                    focusList(buttonMenuContainer, buttonMenuInner);
                }
                return;
            }

            const menuContainer = event.target.closest(".bs-container");
            const menuInner = (menuContainer === null) ? null : menuContainer.querySelector("[id^='bs-select-']");
            if (menuInner === null) return;

            const listbox = menuContainer.querySelector('[role="listbox"]');
            const onOption = listbox !== null && listbox.contains(event.target);

            // ENTER is only changed in the list of options; elsewhere bootstrap-select handles it as usual
            if (event.key === "Enter" && !onOption) return;

            event.stopPropagation();

            const button = document.querySelector(`button[aria-owns="${menuInner.id}"]`);
            const menu = menuContainer.querySelector(":scope > .dropdown-menu");
            const highlightedOption = menuContainer.querySelector("li.active");

            if (event.key === "Tab") {
                if (button === null) return;

                const menuControls = Array.from(menuContainer.querySelectorAll(".bs-searchbox input, .bs-actionsbox button"));
                const lastControl = menuControls[menuControls.length - 1];

                // TAB/SHIFT + TAB in the list of options moves to the next/previous option, until it gets past
                //  the last option or before the first option
                const selectpicker = (menu === null) ? undefined : $(menu).data("this");
                if (onOption && selectpicker !== undefined) {
                    const optionPos = selectpicker.selectpicker.current.data.findIndex((option) => option.index === selectpicker.activeIndex);
                    const canHighlight = selectpicker.selectpicker.view.canHighlight;
                    const atEnd = (optionPos !== -1) && (event.shiftKey ? optionPos <= canHighlight.indexOf(true) : optionPos >= canHighlight.lastIndexOf(true));

                    if (!atEnd) {
                        event.preventDefault();
                        const arrowKey = event.shiftKey ? {which: 38, keyCode: 38, key: "ArrowUp"} : {which: 40, keyCode: 40, key: "ArrowDown"};
                        runSelectpickerKeydown(listbox, $.Event("keydown", arrowKey));
                        focusHighlightedOption(menuContainer);
                        return;
                    }
                }

                // SHIFT + TAB from the first option moves back to the last control above the list
                if (event.shiftKey && onOption && lastControl !== undefined) {
                    event.preventDefault();
                    lastControl.focus();
                    return;
                }

                // TAB from the last control moves into the list of options, highlighting an option if none is
                if (!event.shiftKey && event.target === lastControl && listbox !== null) {
                    event.preventDefault();
                    focusList(menuContainer, listbox);
                    return;
                }

                const leaveForward = !event.shiftKey && onOption;
                const leaveBackward = event.shiftKey && event.target === menuControls[0];
                if (!leaveForward && !leaveBackward) return;

                event.preventDefault();

                const dropdown = button.closest(".bootstrap-select");
                BasePage.closeMultiSelect(button);

                const nextElement = leaveForward ? BasePage.getNextFocusable(dropdown) : null;
                (nextElement === null ? button : nextElement).focus();
                return;
            }

            if (event.key === "Escape" && menu !== null && (onOption || highlightedOption !== null)) {
                event.preventDefault();

                const selectpicker = $(menu).data("this");
                if (highlightedOption !== null && selectpicker !== undefined) {
                    selectpicker.defocusItem(highlightedOption);
                    selectpicker.activeIndex = undefined;
                }

                menu.setAttribute("tabindex", "-1");
                menu.focus();
                return;
            }

            // the parts of the menu that bootstrap-select listens to (the search box and the list of options)
            const keyTarget = event.target.closest(selectpickerKeySelector);
            if (keyTarget !== null) {
                runSelectpickerKeydown(keyTarget, $.event.fix(event));
                if (onOption) focusHighlightedOption(menuContainer);
                return;
            }

            // other parts of the menu (e.g. the menu itself or the select all buttons): ESC closes the dropdown
            if (event.key !== "Escape" || button === null) return;

            event.preventDefault();
            BasePage.closeMultiSelect(button);
            button.focus();
        }, true);
    }

    // closeMultiSelect(button): Closes the menu of a multi-select dropdown, given the dropdown's button
    // Note:
    // - bootstrap-select's 'close' checks whether the dropdown is open from a class on the dropdown, which is not set
    //   when the menu is moved to the <body>, so the button's 'aria-expanded' is checked instead
    static closeMultiSelect(button) {
        if (button.getAttribute("aria-expanded") !== "true") return;
        $(button).closest(".bootstrap-select").find("select").selectpicker("toggle");
    }

    // getNextFocusable(element): Retrieves the first element after 'element' (and outside of it) that TAB can move the focus to
    static getNextFocusable(element) {
        const focusables = document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]");

        for (const focusable of focusables) {
            if (focusable.disabled || focusable.tabIndex < 0 || focusable.getClientRects().length == 0) continue;
            if (element.contains(focusable) || focusable.closest(".bs-container") !== null) continue;
            if (element.compareDocumentPosition(focusable) & Node.DOCUMENT_POSITION_FOLLOWING) return focusable;
        }

        return null;
    }

    // setMultiSelectSearch(dropdown, selections, searchFunc): Replaces the search of a multi-select dropdown with searchFunc
    static setMultiSelectSearch(dropdown, selections, searchFunc) {
        const selectpicker = dropdown.data("selectpicker");
        if (selectpicker === undefined) return;

        const optionsByValue = new Map(Array.from(dropdown[0].options).map((option) => [option.value, option]));

        selectpicker.$searchbox.on("input propertychange", () => {
            const searchTerm = selectpicker.$searchbox[0].value;
            if (!searchTerm) return;

            const mainData = selectpicker.selectpicker.main.data;
            const mainElements = selectpicker.selectpicker.main.elements;
            const results = [];

            for (const selection of searchFunc(searchTerm, selections)) {
                const option = optionsByValue.get(String(selection.value));
                if (option !== undefined && mainData[option.liIndex] !== undefined) results.push(mainData[option.liIndex]);
            }

            selectpicker.selectpicker.search.data = results;
            selectpicker.selectpicker.search.elements = results.map((result) => mainElements[result.index]);

            selectpicker.activeIndex = undefined;
            selectpicker.noScroll = true;
            selectpicker.$menuInner.scrollTop(0);
            selectpicker.createView(true);

            // show the message for no results, the same way as bootstrap-select
            const optionList = selectpicker.$menuInner[0].firstChild;
            optionList.querySelectorAll(".no-results").forEach((noResults) => noResults.remove());

            if (results.length == 0) {
                const noResults = document.createElement("li");
                noResults.className = "no-results";
                noResults.textContent = selectpicker.options.noneResultsText.replace("{0}", `"${searchTerm}"`);
                optionList.appendChild(noResults);
            }
        });
    }

    // updateMultiSelect(dropdownSelector, selections, inputs, onChange, translations, searchFunc, maxOptions, maxOptionsText):
    //  Updates the selections for the multi-select dropdown select widget
    // Note:
    // - maxOptions is the most options that can be selected, and maxOptionsText is the message shown when the limit is reached.
    //   bootstrap-select's select all button does not follow this limit, so the button is hidden when there is a limit
    updateMultiSelect({dropdownSelector, selections, inputs, onChange = undefined, noneSelectedText = "", searchFunc = null,
                       maxOptions = undefined, maxOptionsText = undefined} = {}) {
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

        const selectpickerOpts = {
            deselectAllText: Translation.translate("DeselectAll"),
            selectAllText: Translation.translate("SelectAll"),
            container: 'body',
            noneSelectedText
        };

        if (maxOptions !== undefined) {
            selectpickerOpts.maxOptions = maxOptions;
        }

        if (maxOptionsText !== undefined) {
            selectpickerOpts.maxOptionsText = () => [maxOptionsText, maxOptionsText];
        }

        dropdown = $(dropdownSelector).selectpicker(selectpickerOpts);

        const selectpicker = dropdown.data("selectpicker");
        if (maxOptions !== undefined && selectpicker !== undefined) {
            selectpicker.$menu.find(".bs-select-all").addClass("d-none");

            // when the limit is reached, bootstrap-select unselects the clicked <option> but its own fix for the
            //  option's tick does not work in this version (it passes an index instead of the option's data),
            //  so remove the tick from any option that is shown as selected but whose <option> is not selected
            dropdown.on("maxReached.bs.select", () => {
                setTimeout(() => {
                    for (const optionData of selectpicker.selectpicker.main.data) {
                        if (optionData.selected && optionData.option && !optionData.option.selected) {
                            selectpicker.setSelected(optionData, false);
                        }
                    }
                }, 20);
            });
        }

        if (searchFunc !== null && selectionIsArr) {
            BasePage.setMultiSelectSearch(dropdown, orderedSelections, searchFunc);
        }

        BasePage.fixMultiSelectKeys();

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
            highlightedNutrientCell: "highlightedNutrientCell",
            searchTableActionBtn: "searchTableActionBtn",
            searchTableOptSelected: "searchTableOptSelected"
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

        d3.select("#legendTitle").html(Translation.translate("LegendTitle"));
        d3.select("#legendContent p").html(Translation.translate("LegendText"));
        d3.select("#closeLegendText").html(Translation.translate("CloseLegend"));

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
            this.model.downloadSearchCSV(this.searchOpt);
        });

        d3.select("#closeLegend").on("click", () => {
            elements.legendAccordion.attr("open", null);
        });
    }

    // loadPageInputs(): Setup any initial inputs for the page
    loadPageInputs() {

    }

    // buildDropdownLstCompare(noneOption): Builds the compare function for the dropdown so that
    //  the "none" option appears at the top of the list
    buildDropdownLstCompare(noneOption = null) {
        if (noneOption === null) return (a, b) => a.text.localeCompare(b.text);

        return (a, b) => {
            if (a.text == noneOption) {
                return -1;
            } else if (b.text == noneOption) {
                return 1;
            }

            return a.text.localeCompare(b.text);
        };
    }

    buildSearchTableSelectBtn() {
        return `<button type="button" class="btn btn-primary searchTableActionBtn" aria-label="${Translation.translate("SearchTableInspect")}"><i class="fa fa-search"></i></button>`;
    }

    setupSearchTableSelect(optSelected = false) {
        const self = this;

        const selectBtns = d3.selectAll(`.${this.htmlNames.searchTableActionBtn}`);

        if (optSelected) {
            selectBtns.classed("btn-primary", false)
                .classed("btn-danger", true)
                .attr("aria-label", Translation.translate("SearchTableClose"))
                .html(null)
                .append("i")
                .classed("fa", true)
                .classed("fa-times", true);
        }

        // listen on the table instead of the buttons, so that the buttons in rows that are not drawn yet
        //  (rows on other pages or rows shown after sorting) also work
        const selectBtnSelector = `.${this.htmlNames.searchTableActionBtn}`;
        $(this.htmlSelectors.foodSearchTable).off("click", selectBtnSelector).on("click", selectBtnSelector, function() {
            const row = this.closest("tr");
            const rowData = self.searchTable.row(row).data();
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
    }

    // setupSearchTable(): Setup the search table
    setupSearchTable() {
        const inputs = this.model.searchInputs[this.searchOpt]; 

        this.searchTable = this.updateSearchTable(this.model.foodSelected[this.searchOpt], inputs[SearchAtts.FilterHelper]);
        if (this.searchTable === undefined) return;

        const self = this;

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
                drawCallback: this.getGroupRowsDrawCallback(Translation.getDataCol(TableCols.NutrientGroup)),
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

        dataTable.columns.adjust().draw(false); 
    }

    // updateNutrientTableExtraCols(dataTable, show): Updates the nutrient table to hide/show the extra detail columns
    updateNutrientTableExtraCols(dataTable, show, updateDatable = false) {
        for (const tableAtt of NutrientTableExtraCols) {
            dataTable.column(`${tableAtt}:name`).visible(show); 
        }

        if (!updateDatable) return;

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

        d3.select("#legendTitle").html(Translation.translate("LegendTitle"));
        d3.select("#legendContent p").html(Translation.translate("LegendText"));
        d3.select("#closeLegendText").html(Translation.translate("CloseLegend"));

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
            this.model.downloadSearchCSV(this.searchOpt);
        });

        d3.select("#closeLegend").on("click", () => {
            elements.legendAccordion.attr("open", null);
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