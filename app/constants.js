// Different Search options in the App
export const SearchOpts = {
    SearchByFood: "Search by Food",
    SearchByNutrient: "Search By Nutrient",
    CompareNutrients: "Compare Nutrients",
    CompareFoods: "Compare Foods"
}

// File locations for each page
export const PageSrc = {
    [SearchOpts.SearchByFood]: "./templates/searchByFood.html",
    [SearchOpts.SearchByNutrient]: "./templates/searchByNutrient.html",
    [SearchOpts.CompareNutrients]: "./templates/compareByNutrient.html",
    [SearchOpts.CompareFoods]: "./templates/compareByFood.html"
};

// Different columns in the raw data
// Note: Copy the exact column name from the CSV files without the language code
export const DataCols = {
    FoodCode: "Food_Code",
    FoodDescription: "Food_Description_",
    FoodAltDescription: "Alternate_Description_",
    FoodGroupCode: "CNF_Food_Group_Code",
    FoodGroupDescription: "CNF_Food_Group_Description_",
    FoodSourceCode: "Food_Source_Code",
    FoodSourceDescription: "Food_Source_Description_",
    MeasureTypeCode: "Measure_Type_Code",
    MeasureCode: "Measure_Code",
    MeasureDescription: "Measure_Description_and_Unit_",
    MeasureWeight: "Measure_Weight_Conversion",
    NutrientCode: "Nutrient_Code",
    NutrientSrcCode: "Nutrient_Source_Code",
    NutrientName: "Nutrient_Name_",
    NutrientUnit: "Nutrient_Unit",
    NutrientUnitShort: "Nutrient unit",
    NutrientNameWithUnit: "Nutrient (unit)_",
    NutrientShortUnit: "Nutrient unit",
    NutrientAmount: "Nutrient_Amount",
    NutrientNoOfObservations: "Observations",
    NutrientStdErr: "STD_Error",
    NutrientDataSrc: "Nutrient_Source_Description_",
    NutrientDecimalPlace: "Nutrient_Decimals",
    NutrientGroup: "Nutrient_Group_",
    NutrientOrder: "Display order for web tool (do not publish this info)"
}

// columns used in the table in the app
export const TableCols = {...DataCols,
    ConvertedNutrientAmount: "Nutrient_Converted_",
    CompareNutrient: "Nutrient_Compare_",
    CompareFood: "Food_Compare_",
    MeasureWeightConvId: "Meausre_Weight_Conversion_Id",
    FoodNameOrder: "Food Name Order",
    FoodAltNameOrder: "Food Alt Name Order",
    FoodDescriptionTokens: "Food_Description_Tokens_",
    FoodAltDescriptionTokens: "Food_Alt_Description_Tokens_",

    FoodCodeView: "Food_Code_View",
    WeightView: "Weight_View",
    NutrientAmountView: "Nutrient_Amount_View",
    NutrientNoOfObservationsView: "Observations_View",
    NutrientStdErrView: "STD_Error_View"
};

// Columns with translations
export const LangDataCols= new Set([DataCols.FoodDescription, DataCols.FoodGroupDescription, DataCols.MeasureDescription,
    DataCols.NutrientName, DataCols.NutrientDataSrc, DataCols.FoodAltDescription, DataCols.NutrientGroup, 
    TableCols.FoodDescriptionTokens, TableCols.FoodAltDescriptionTokens,
    DataCols.NutrientNameWithUnit, DataCols.FoodSourceDescription
]);

// Measure codes to filter out in the app
export const HiddenMeasureCodes = new Set([
    "750" // Total Refuse
]);

export const DefaultMeasureCode = 0; // Special Measure Code for 100g of Edible portions (the default measurement)
export const DefaultMeasureTypeCode = 0; // Special Measure Type Code for 100g of Edible portions (the default measurement)
export const RAMeasureTypeCode = 24; // Measure Type Code for RA portions

// Some specific needed Measure Type Codes
export const MeasureTypeCodes = {
    Default: 0,
    Refuse: 3
};

// Specific nutrient codes that are bolded/highlighted
export const HighlightedNutrientCodes = new Set([
    "605", // Trans Fatty Acids
    "606", // Saturated Fatty Acids
    "645", // Monounsaturated Fatty Acids,Total
    "646", // Polyunsaturated Fatty Acids,Total
    "693", // Total Trans-Monoenoic Fatty Acids
    "695", // Total Trans-Polyenoic Fatty Acids
    "636"  // Total plant sterol
]);

// The columns to display in the "Search By Food" search table
export const FoodSearchTableCols = [
    DataCols.FoodCode,
    DataCols.FoodGroupDescription,
    DataCols.FoodDescription
];

// The columns to display in the "Search By Nutrient" table
export const NutrientSearchTableCols = [
    DataCols.FoodCode,
    DataCols.FoodGroupDescription,
    DataCols.FoodDescription,
    DataCols.MeasureDescription,
    TableCols.NutrientAmountView,
    TableCols.WeightView
];

// The columns to display in the "Compare by Nutrients" search table
export const CompNutrientSearchTableCols = [
    DataCols.FoodCode,
    DataCols.FoodDescription,
    DataCols.FoodGroupDescription
];

// The columns to display in the "Compare by Foods" search table
export const CompFoodSearchTableCols = [
    DataCols.NutrientNameWithUnit
];

// The columns to display in the Nutrient table
export const NutrientTableCols = [
    DataCols.NutrientNameWithUnit,
    TableCols.NutrientNoOfObservationsView,
    TableCols.NutrientStdErrView,
    DataCols.NutrientDataSrc
]

// The extra columns in the Nutrient table that the user can choose to display
export const NutrientTableExtraCols = new Set([
    TableCols.NutrientNoOfObservationsView,
    TableCols.NutrientStdErrView,
    DataCols.NutrientDataSrc
]);

// Different attributes used to search some food/nutrient
export const SearchAtts = {
    FoodName: "food name",
    FoodAltName: "food alternative name",
    FoodGroup: "food group",
    FoodCode: "food code",
    Nutrient: "nutrient",
    FilterHelper: "filter helper" // The text input on top of the search table, provided by Jquery Datatable
}

// Different attributes used in the nutrient stats
export const NutrientStatAtts = {
    MeasureCodesSelected: "measure codes selected",
    ShowUnit: "show unit",
    ShowExtraDetails: "show extra details"
};

// Keyboard codes when the user enters a key
export const KeyboardCodes = {
    Enter: 13
}


// ================= ENGLISH TRANSLATIONS =======================

const LangEN = {
    translation: {
        Number: "{{num, number}}",
        AltLangCode: "fr",

        SiteName: "Canadian Nutrient File (CNF) 2026",

        SearchByFood: "Search by Food",
        SearchByNutrient: "Search by Nutrient",
        CompareByNutrient:"Compare by Nutrient",
        CompareByFoods: "Compare by Foods",

        InstructionsTitle: "Instructions",
        InstructionsText: {
            [SearchOpts.SearchByFood]: `
            <p class="mrgn-tp-lg">
                You can combine search criteria to narrow your results. For example, use Food Name, CNF Food Group, and Food Code together.
            </p>

            <h3>Search by Food Name</h3>
            <p>Use this search when you know all or part of a food name.</p>
            <ul>
                <li>Enter one or more keywords.</li>
                <li>
                    Searches include whole words and partial words.

                    <ul>
                        <li>Singular and plural forms may be found.</li>
                        <li>Foods containing the keyword may also be found (for example, <i>fish</i> may return <i>Fish</i> and <i>Crayfish</i>).</li>
                    </ul>
                </li>
                <li>Searches are not case-sensitive. For example, <i>apple</i>, <i>Apple</i>, and <i>APPLE</i> return the same results.</li>
            </ul>

            <h3>Search by CNF Food Group</h3>
            <p>Use this search to find foods within one of the 23 CNF food groups.</p>
            <ul>
                <li>Select a food group from the list.</li>
                <li>View all foods in that group.</li>
            </ul>

            <h3>Search by Food Code</h3>
            <p>Use this search when you know the exact CNF food code.</p>
            <ul>
                <li>Enter a valid CNF food code.</li>
                <li>The matching food will be displayed.</li>
            </ul>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Tip</strong>
                <p>After your results are displayed, use the search box above the results table to quickly filter the list.</p>
                <div class="mrgn-tp-lg">
                    <strong>Example:</strong> <span>If your search returns many foods containing <i>apple</i>, type <i>raw</i> in the table search box to show only results containing that word.</span>
                </div>
            </div>`,

            [SearchOpts.SearchByNutrient]: `
            <p class="mrgn-tp-lg">Use this search to find foods based on a nutrient. You can combine Nutrient and CNF Food Group to narrow your results.</p>

            <h3>Search by Nutrient</h3>
            <p>Use this search to explore foods based on a selected nutrient:</p>
            <ul>
                <li>Enter a nutrient name or select one from the dropdown list.</li>
                <li>Results display foods and their nutrient values for a pre-determined serving size.</li>
            </ul>

            <h3>Filter by CNF Food Group</h3>
            <p>The CNF Food Group cannot be used on its own in this search. It is available only as a filter after selecting a nutrient.</p>
            <ul>
                <li>Select a food group to narrow the results.</li>
                <li>View foods within the selected group.</li>
            </ul>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Tip</strong>
                <p>After your results are displayed, use the search box above the results table to quickly filter the list.</p>
                <div class="mrgn-tp-lg">
                    <strong>Example 1:</strong> <span>When viewing foods for <i>Protein</i>, type <i>chicken</i> to display only foods containing that word.</span>
                    <br>
                    <strong>Example 2:</strong> <span>After selecting <i>Dairy and Egg Products</i>, type <i>cheese</i> to display only foods containing that word.</span>
                </div>
            </div>`,

            [SearchOpts.CompareFoods]: `
            <p class="mrgn-tp-lg">Use this search to compare the nutrient content of up to three foods.</p>
            <ul>
                <li>Enter a food name or select a food from the dropdown list.</li>
                <li>Select up to three foods.</li>
                <li>Run the comparison.</li>
                <li>Review the nutrient values displayed side by side.</li>
            </ul>
            <p class="mrgn-tp-lg">Nutrient values are displayed per 100 g edible portion.</p>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Tip</strong>
                <p>After your results are displayed, use the search box above the results table to quickly filter the list.</p>
            </div>`
        },

        LegendTitle: "Legend",
        LegendText: `
        <dl class="legendDescriptionList">
            <dt class="mrgn-tp-sm legendTerm">%:</dt>
            <dd class="legendDescription">percent</dd>

            <dt class="mrgn-tp-sm legendTerm">μg:</dt>
            <dd class="legendDescription">microgram</dd>

            <dt class="mrgn-tp-sm legendTerm">CNF:</dt>
            <dd class="legendDescription">Canadian Nutrient File</dd>

            <dt class="mrgn-tp-sm legendTerm">cm:</dt>
            <dd class="legendDescription">centimetre</dd>

            <dt class="mrgn-tp-sm legendTerm">dm:</dt>
            <dd class="legendDescription">diameter</dd>

            <dt class="mrgn-tp-sm legendTerm">g:</dt>
            <dd class="legendDescription">gram</dd>

            <dt class="mrgn-tp-sm legendTerm">IU:</dt>
            <dd class="legendDescription">International Unit</dd>

            <dt class="mrgn-tp-sm legendTerm">kCal:</dt>
            <dd class="legendDescription">kilocalories</dd>

            <dt class="mrgn-tp-sm legendTerm">kJ:</dt>
            <dd class="legendDescription">kilojoules</dd>

            <dt class="mrgn-tp-sm legendTerm">l:</dt>
            <dd class="legendDescription">litre</dd>

            <dt class="mrgn-tp-sm legendTerm">mg:</dt>
            <dd class="legendDescription">milligram</dd>

            <dt class="mrgn-tp-sm legendTerm">ml:</dt>
            <dd class="legendDescription">millilitre</dd>

            <dt class="mrgn-tp-sm legendTerm">mm:</dt>
            <dd class="legendDescription">millimetre</dd>

            <dt class="mrgn-tp-sm legendTerm">NE:</dt>
            <dd class="legendDescription">Niacin Equivalent</dd>
        </dl>`,

        BackToTop: "Back to top",
        CloseInstructions: "Close Instructions",
        CloseLegend: "Close Legend",

        SearchCriteriaTitle: "Search Criteria",
        SearchTableTitle: "Search Results",
        NutrientSearchTableTitle: "Search Results - {{ nutrientName }}",
        CompareSearchTableTitle: "Search Results: Comparison is presented per 100g of edible portion of food",
        FoodNameInputTitle: "Food Name",
        FoodAltNameInputTitle: "Food Common Name",
        FoodGroupInputTitle: "CNF Food Group",
        FoodCodeInputTitle: "Food Code",
        NutrientInputTitle: "Nutrient",
        MultiNutrientPlaceholder: "Search and select nutrients",
        MultiFoodsPlaceholder: "Search and select foods",
        MultiNutrientInputTitle: "Nutrients",
        MultiFoodInputTitle: "Foods",

        FoodSearchButton: "Search",
        FoodSearchResetButton: "Reset",

        NoneSelected: "None Selected",
        SelectAll: "Select All",
        DeselectAll: "Deselect All",

        SearchTableInstructions: "Please select (click) on the food item you are interested",
        SearchTableCols: {
            [SearchOpts.SearchByFood]: {
                [DataCols.FoodCode]: "Food Code",
                [DataCols.FoodGroupDescription]: "Food Group",
                [DataCols.FoodDescription]: "Food Name",
            },

            [SearchOpts.SearchByNutrient]: {
                [DataCols.FoodCode]: "Food Code",
                [DataCols.FoodGroupDescription]: "Food Group",
                [DataCols.FoodDescription]: "Food Name",
                [DataCols.MeasureDescription]: "Portion",
                [TableCols.WeightView]: "{{ nutrient }} {{ unit }} (per 100 g)",
                [TableCols.NutrientAmountView]: "{{ nutrient }} {{ unit }} (per portion)"
            },
            [SearchOpts.CompareNutrients]: {
                [DataCols.FoodCode]: "Food Code",
                [DataCols.FoodGroupDescription]: "Food Group",
                [DataCols.FoodDescription]: "Food Name"
            },
            [SearchOpts.CompareFoods]: {
                [DataCols.NutrientNameWithUnit]: "Nutrient Name",
                [DataCols.NutrientGroup]: "Nutrient Group"
            },

            DefaultNutrientAmount: "Nutrient Amount",
            DefaultNutrientUnit: "g",
            FoodName: "{{ foodCode }} - {{ foodName }}"
        },

        FoodNutrientStats: {
            SubTitle: `Food Code: {{ foodCode }}`,
            SourceSubTitle: `Source: {{ foodSource }}`,
            ServingTitle: `Available Serving Size(s)`,
            ServingRefuseTitle: `Refuse`,
            ServingSizeOption: `{{ measureName }} = {{ convertedMeasure }} g`,
            ServingRefuseListItem: `{{ measureName }} {{ convertedMeasure }} %`,
            NutrientTableTitle: `List of nutrient data of {{ foodCode }} - {{ foodName }}`,
            DefaultNutrientMeasure: `Value per 100 g of edible portion`,

            TableCols: {
                [DataCols.NutrientNameWithUnit]: `Nutrient Name`,
                [DataCols.NutrientShortUnit]: `Unit`,
                [TableCols.NutrientNoOfObservationsView]: `Number of obser­vations`,
                [TableCols.NutrientStdErrView]: `Standard error`,
                [DataCols.NutrientDataSrc]: `Data source`
            },

            ConvertedMeasureCol: `{{ measureName }} / {{ convertedMeasure }} g`,
            ConvertedMeasureColWithoutConversion: `{{ measureName }}`,

            ShowUnits: "Show Units",
            ShowExtraDetails: "Show Extra Details"
        },

        CSVDownload: {
            DownloadSearchButtonTitle: "Download filtered data",
            DownloadNutrientButtonTitle: "Download displayed data",
            DownloadAllNutrientButtonTitle: "Download all data",
            SearchFileName: `Search Profile`,
            AllNutrientFileName: `Nutrient Profile - {{ foodName }}`,
            NutrientFileName: `Nutrient Profile - {{ foodName }}`,
            Date: `Date: {{ date }}`
        },

        multiselectAutoComplete: {
            canOnlySelectOne: "Only one item can be selected",
            maxItemText: "Only {{ maxItemCount }} items can be selected",
            noResultsText: "No results"
        },

        dataTableAllOptions: "all",

        // reference: https://datatables.net/plug-ins/i18n/English.html
        // note:
        //  For some reason the CDN link provided in the documentation causes
        //  some errors with the datatables, so we copied the content of the
        //  translation JSON file here
        dataTable: {
            "emptyTable": "No data available in table",
            "info": "Showing _START_ to _END_ of _TOTAL_ entries",
            "infoEmpty": "Showing 0 to 0 of 0 entries",
            "infoFiltered": "(filtered from _MAX_ total entries)",
            "infoThousands": ",",
            "lengthMenu": "Show _MENU_ entries",
            "loadingRecords": "Loading...",
            "processing": "Processing...",
            "search": "Search:",
            "zeroRecords": "No matching records found",
            "thousands": ",",
            "paginate": {
                "first": "First",
                "last": "Last",
                "next": "Next",
                "previous": "Previous"
            },
            "aria": {
                "sortAscending": ": activate to sort column ascending",
                "sortDescending": ": activate to sort column descending"
            },
            "autoFill": {
                "cancel": "Cancel",
                "fill": "Fill all cells with <i>%d</i>",
                "fillHorizontal": "Fill cells horizontally",
                "fillVertical": "Fill cells vertically"
            },
            "buttons": {
                "collection": "Collection <span class='ui-button-icon-primary ui-icon ui-icon-triangle-1-s'/>",
                "colvis": "Column Visibility",
                "colvisRestore": "Restore visibility",
                "copy": "Copy",
                "copyKeys": "Press ctrl or u2318 + C to copy the table data to your system clipboard.<br><br>To cancel, click this message or press escape.",
                "copySuccess": {
                    "1": "Copied 1 row to clipboard",
                    "_": "Copied %d rows to clipboard"
                },
                "copyTitle": "Copy to Clipboard",
                "csv": "CSV",
                "excel": "Excel",
                "pageLength": {
                    "-1": "Show all rows",
                    "_": "Show %d rows"
                },
                "pdf": "PDF",
                "print": "Print",
                "updateState": "Update",
                "stateRestore": "State %d",
                "savedStates": "Saved States",
                "renameState": "Rename",
                "removeState": "Remove",
                "removeAllStates": "Remove All States",
                "createState": "Create State"
            },
            "searchBuilder": {
                "add": "Add Condition",
                "button": {
                    "0": "Search Builder",
                    "_": "Search Builder (%d)"
                },
                "clearAll": "Clear All",
                "condition": "Condition",
                "conditions": {
                    "date": {
                        "after": "After",
                        "before": "Before",
                        "between": "Between",
                        "empty": "Empty",
                        "equals": "Equals",
                        "not": "Not",
                        "notBetween": "Not Between",
                        "notEmpty": "Not Empty"
                    },
                    "number": {
                        "between": "Between",
                        "empty": "Empty",
                        "equals": "Equals",
                        "gt": "Greater Than",
                        "gte": "Greater Than Equal To",
                        "lt": "Less Than",
                        "lte": "Less Than Equal To",
                        "not": "Not",
                        "notBetween": "Not Between",
                        "notEmpty": "Not Empty"
                    },
                    "string": {
                        "contains": "Contains",
                        "empty": "Empty",
                        "endsWith": "Ends With",
                        "equals": "Equals",
                        "not": "Not",
                        "notEmpty": "Not Empty",
                        "startsWith": "Starts With",
                        "notContains": "Does Not Contain",
                        "notStartsWith": "Does Not Start With",
                        "notEndsWith": "Does Not End With"
                    },
                    "array": {
                        "without": "Without",
                        "notEmpty": "Not Empty",
                        "not": "Not",
                        "contains": "Contains",
                        "empty": "Empty",
                        "equals": "Equals"
                    }
                },
                "data": "Data",
                "deleteTitle": "Delete filtering rule",
                "leftTitle": "Outdent Criteria",
                "logicAnd": "And",
                "logicOr": "Or",
                "rightTitle": "Indent Criteria",
                "title": {
                    "0": "Search Builder",
                    "_": "Search Builder (%d)"
                },
                "value": "Value"
            },
            "searchPanes": {
                "clearMessage": "Clear All",
                "collapse": {
                    "0": "SearchPanes",
                    "_": "SearchPanes (%d)"
                },
                "count": "{total}",
                "countFiltered": "{shown} ({total})",
                "emptyPanes": "No SearchPanes",
                "loadMessage": "Loading SearchPanes",
                "title": "Filters Active - %d",
                "showMessage": "Show All",
                "collapseMessage": "Collapse All"
            },
            "select": {
                "cells": {
                    "1": "1 cell selected",
                    "_": "%d cells selected"
                },
                "columns": {
                    "1": "1 column selected",
                    "_": "%d columns selected"
                },
                "rows": {
                    "1": "1 row selected",
                    "_": "%d rows selected"
                }
            },
            "datetime": {
                "previous": "Previous",
                "next": "Next",
                "hours": "Hour",
                "minutes": "Minute",
                "seconds": "Second",
                "unknown": "-",
                "amPm": [
                    "am",
                    "pm"
                ],
                "weekdays": [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat"
                ],
                "months": [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December"
                ]
            },
            "editor": {
                "close": "Close",
                "create": {
                    "button": "New",
                    "title": "Create new entry",
                    "submit": "Create"
                },
                "edit": {
                    "button": "Edit",
                    "title": "Edit Entry",
                    "submit": "Update"
                },
                "remove": {
                    "button": "Delete",
                    "title": "Delete",
                    "submit": "Delete",
                    "confirm": {
                        "1": "Are you sure you wish to delete 1 row?",
                        "_": "Are you sure you wish to delete %d rows?"
                    }
                },
                "error": {
                    "system": "A system error has occurred (<a target=\"\\\" rel=\"nofollow\" href=\"\\\">More information</a>)."
                },
                "multi": {
                    "title": "Multiple Values",
                    "info": "The selected items contain different values for this input. To edit and set all items for this input to the same value, click or tap here, otherwise they will retain their individual values.",
                    "restore": "Undo Changes",
                    "noMulti": "This input can be edited individually, but not part of a group. "
                }
            },
            "stateRestore": {
                "renameTitle": "Rename State",
                "renameLabel": "New Name for %s:",
                "renameButton": "Rename",
                "removeTitle": "Remove State",
                "removeSubmit": "Remove",
                "removeJoiner": " and ",
                "removeError": "Failed to remove state.",
                "removeConfirm": "Are you sure you want to remove %s?",
                "emptyStates": "No saved states",
                "emptyError": "Name cannot be empty.",
                "duplicateError": "A state with this name already exists.",
                "creationModal": {
                    "toggleLabel": "Includes:",
                    "title": "Create New State",
                    "select": "Select",
                    "searchBuilder": "SearchBuilder",
                    "search": "Search",
                    "scroller": "Scroll Position",
                    "paging": "Paging",
                    "order": "Sorting",
                    "name": "Name:",
                    "columns": {
                        "visible": "Column Visibility",
                        "search": "Column Search"
                    },
                    "button": "Create"
                }
            }
        }
    }
}

// ==============================================================
// ============== FRENCH TRANSLATIONS ===========================

const REMPLACER_MOI = "REMPLACER MOI"
const REMPLACER_MOI_AVEC_ARGUMENTS = `${REMPLACER_MOI} - les arguments du texte: `;


const LangFR = {
    translation: {
        Number: "{{num, number}}",
        AltLangCode: "en",

        SiteName: "Fichier canadien sur les éléments nutritifs (FCÉN) 2026",

        SearchByFood: "Recherche par aliment",
        SearchByNutrient: " Recherche par élément nutritif",
        CompareByNutrient: "Comparer des éléments nutritifs",
        CompareByFoods: "Comparer des aliments",

        InstructionsTitle: "Instructions",
        InstructionsText: {
            [SearchOpts.SearchByFood]: `
            <p class="mrgn-tp-lg">
                Vous pouvez combiner plusieurs critères pour préciser votre recherche. Par exemple, utilisez ensemble le Nom de l’aliment, le Groupe alimentaire du FCÉN et le Code de l’aliment.
            </p>

            <h3>Recherche par nom d’aliment</h3>
            <p>Utilisez cette option si vous connaissez le nom complet ou une partie du nom d’un aliment.</p>
            <ul>
                <li>Entrez un ou plusieurs mots-clés.</li>
                <li>
                    La recherche tient compte des mots complets et des parties de mots.

                    <ul>
                        <li>Les formes singulières et plurielles peuvent être trouvées.</li>
                        <li>Les aliments contenant le mot-clé peuvent également être trouvés. Par exemple, une recherche avec <i>poisson</i> peut aussi trouver <i>espadon-poisson</i> ou d’autres aliments contenant ce mot..</li>
                    </ul>
                </li>
                <li>La recherche ne tient pas compte des majuscules et des minuscules. Par exemple, <i>pomme</i>, <i>Pomme</i> et <i>POMME</i> donnent les mêmes résultats.</li>
            </ul>

            <h3>Recherche par groupe d’aliments du FCÉN</h3>
            <p>Utilisez cette option pour trouver des aliments appartenant à l’un des 23 groupes d’aliments  du FCÉN.</p>
            <ul>
                <li>Sélectionnez un groupe dans la liste.</li>
                <li>Consultez les aliments qui appartiennent à ce groupe.</li>
            </ul>

            <h3>Recherche par code d’aliment</h3>
            <p>Utilisez cette option si vous connaissez le code exact d’un aliment du FCÉN.</p>
            <ul>
                <li>Entrez un code d’aliment valide.</li>
                <li>L’aliment correspondant s’affichera.</li>
            </ul>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Astuce</strong>
                <p>Une fois les résultats affichés, utilisez la boîte de recherche située au-dessus du tableau des résultats pour filtrer rapidement la liste.</p>
                <div class="mrgn-tp-lg">
                    <strong>Exemple :</strong> <span>Si votre recherche retourne plusieurs aliments contenant le mot <i>pomme</i>, saisissez <i>crue</i> dans la boîte de recherche du tableau pour afficher uniquement les résultats contenant ce mot.</span>
                </div>
            </div>`,

            [SearchOpts.SearchByNutrient]: `
            <p class="mrgn-tp-lg">Utilisez cette option pour trouver des aliments en fonction d’un élément nutritif. Vous pouvez aussi utiliser le Groupe d’aliments du FCÉN pour préciser les résultats.</p>

            <h3>Recherche par élément nutritif</h3>
            <p>Use this search to explore foods based on a selected nutrient:</p>
            <ul>
                <li>Entrez le nom d’un élément nutritif ou sélectionnez-en un dans la liste déroulante.</li>
                <li>Les résultats affichent les aliments et leur teneur en élément nutritif selon la portion établie.</li>
            </ul>

            <h3>Filtrer par groupe alimentaire du FCÉN</h3>
            <p>Le Groupe d’aliments du FCÉN ne peut pas être utilisé seul dans cette recherche. Il sert uniquement à filtrer les résultats après la sélection d’un élément nutritif.</p>
            <ul>
                <li>Sélectionnez un groupe alimentaire pour réduire le nombre de résultats.</li>
                <li>Consultez les aliments du groupe sélectionné.</li>
            </ul>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Astuce</strong>
                <p>Une fois les résultats affichés, utilisez la boîte de recherche située au-dessus du tableau des résultats pour filtrer rapidement la liste.</p>
                <div class="mrgn-tp-lg">
                    <strong>Exemple 1 :</strong> <span>Lorsque vous consultez les aliments selon leur teneur en <i>protéines</i>, saisissez <i>poulet</i> pour afficher uniquement les aliments contenant ce mot.</span>
                    <br>
                    <strong>Exemple 2 :</strong> <span>Après avoir sélectionné le groupe <i>Produits laitiers et œufs</i>, saisissez <i>fromage</i> pour afficher uniquement les aliments contenant ce mot.</span>
                </div>
            </div>`,

            [SearchOpts.CompareFoods]: `
            <p class="mrgn-tp-lg">Utilisez cette option pour comparer la teneur en éléments nutritifs d’un maximum de trois aliments.</p>
            <ul>
                <li>Entrez le nom d’un aliment ou sélectionnez-en un dans la liste déroulante.</li>
                <li>Sélectionnez jusqu’à trois aliments.</li>
                <li>Lancez la comparaison.</li>
                <li>Consultez les valeurs nutritives affichées côte à côte.</li>
            </ul>
            <p class="mrgn-tp-lg">Les valeurs nutritives sont présentées pour 100 g de portion comestible.</p>

            <div class="alert alert-info mrgn-tp-lg" role="alert">
                <strong class="mrgn-bttm-md">Tip</strong>
                <p>Une fois les résultats affichés, utilisez la boîte de recherche située au-dessus du tableau des résultats pour filtrer rapidement la liste.</p>
            </div>`
        },

        LegendTitle: "Légende",
        LegendText: `<dl class="legendDescriptionList">
            <dt class="mrgn-tp-sm legendTerm">%:</dt>
            <dd class="legendDescription">pourcentage</dd>

            <dt class="mrgn-tp-sm legendTerm">μg:</dt>
            <dd class="legendDescription">microgramme</dd>

            <dt class="mrgn-tp-sm legendTerm">cm:</dt>
            <dd class="legendDescription">centimètre</dd>

            <dt class="mrgn-tp-sm legendTerm">dm:</dt>
            <dd class="legendDescription">diamètre</dd>

            <dt class="mrgn-tp-sm legendTerm">ÉFA:</dt>
            <dd class="legendDescription">Équivalents de folate alimentaire</dd>

            <dt class="mrgn-tp-sm legendTerm">EN:</dt>
            <dd class="legendDescription">Équivalents de niacine totale</dd>

            <dt class="mrgn-tp-sm legendTerm">FCÉN:</dt>
            <dd class="legendDescription">Fichier canadien sur les éléments nutritifs</dd>

            <dt class="mrgn-tp-sm legendTerm">g:</dt>
            <dd class="legendDescription">gramme</dd>

            <dt class="mrgn-tp-sm legendTerm">kCal:</dt>
            <dd class="legendDescription">kilocalories</dd>

            <dt class="mrgn-tp-sm legendTerm">kJ:</dt>
            <dd class="legendDescription">kilojoules</dd>

            <dt class="mrgn-tp-sm legendTerm">l:</dt>
            <dd class="legendDescription">litre</dd>

            <dt class="mrgn-tp-sm legendTerm">mg:</dt>
            <dd class="legendDescription">milligramme</dd>

            <dt class="mrgn-tp-sm legendTerm">ml:</dt>
            <dd class="legendDescription">millilitre</dd>

            <dt class="mrgn-tp-sm legendTerm">mm:</dt>
            <dd class="legendDescription">millimètre</dd>

            <dt class="mrgn-tp-sm legendTerm">UI:</dt>
            <dd class="legendDescription">Unité internationale</dd>
        </dl>`,

        BackToTop: "Haut de la page",
        CloseInstructions: REMPLACER_MOI,
        CloseLegend: REMPLACER_MOI,

        SearchCriteriaTitle: "Critères de recherche",
        SearchTableTitle: "Résultats de recherche",
        NutrientSearchTableTitle: "Résultats de recherche - {{ nutrientName }}",
        CompareSearchTableTitle: "Résultats de recherche : La comparaison est présentée pour 100 g de portion comestible de l'aliment.",
        FoodNameInputTitle: "Nom de l'Aliment",
        FoodAltNameInputTitle: REMPLACER_MOI,
        FoodGroupInputTitle: "Groupe de l’aliment FCÉN",
        FoodCodeInputTitle: "Code de l’aliment",
        NutrientInputTitle: "Élément nutritif",
        MultiNutrientPlaceholder: "Rechercher et sélectionner les éléments nutritifs",
        MultiFoodsPlaceholder: "Rechercher et sélectionner les aliments",
        MultiNutrientInputTitle: "Éléments nutritifs",
        MultiFoodInputTitle: "Les Aliments",

        FoodSearchButton: "Recherche",
        FoodSearchResetButton: "Réinitialiser",

        NoneSelected: "Aucune Sélectionnée",
        SelectAll: "Tout Sélectionner",
        DeselectAll: "Tout Désélectionner",

        SearchTableInstructions: "Veuillez sélectionner (cliquer sur) l’aliment qui vous intéresse.",

        SearchTableCols: {
            [SearchOpts.SearchByFood]: {
                [DataCols.FoodCode]: "Code de l'aliment",
                [DataCols.FoodGroupDescription]: "Groupe de l'aliment",
                [DataCols.FoodDescription]: "Nom de l'aliment"
            },
            [SearchOpts.SearchByNutrient]: {
                [DataCols.FoodCode]: "Code de l'aliment",
                [DataCols.FoodGroupDescription]: "Groupe de l'aliment",
                [DataCols.FoodDescription]: "Nom de l'aliment",
                [DataCols.MeasureDescription]: "Portion",
                [TableCols.WeightView]: "{{ nutrient }} {{ unit }} (par 100 g)",
                [TableCols.NutrientAmountView]: "{{ nutrient }} {{ unit }} (par portion)"
            },
            [SearchOpts.CompareNutrients]: {
                [DataCols.FoodCode]: "Code de l'aliment",
                [DataCols.FoodGroupDescription]: "Groupe de l'aliment",
                [DataCols.FoodDescription]: "Nom de l'aliment"
            },
            [SearchOpts.CompareFoods]: {
                [DataCols.NutrientNameWithUnit]: "Nom de l'élément nutritif",
                [DataCols.NutrientGroup]: "Groupe de l'élément nutritif"
            },

            DefaultNutrientAmount: "Valeur nutritive",
            DefaultNutrientUnit: "g",
            FoodName: "{{ foodCode }} - {{ foodName }}"
        },

        FoodNutrientStats: {
            SubTitle: `Code de l'aliment: {{ foodCode }}`,
            SourceSubTitle: `Source: {{ foodSource }}`,
            ServingTitle: `Taille(s) de portion disponible(s)`,
            ServingRefuseTitle: `Portion non comestible`,
            ServingSizeOption: `{{ measureName }} = {{ convertedMeasure }} g`,
            ServingRefuseListItem: `{{ measureName }} {{ convertedMeasure }} %`,
            NutrientTableTitle: `Liste des valeurs nutritives pour {{ foodCode }} - {{ foodName }}`,
            DefaultNutrientMeasure: `Valeur pour 100 g de portion comestible`,

            TableCols: {
                [DataCols.NutrientNameWithUnit]: `Nom de l'élément nutritif`,
                [DataCols.NutrientShortUnit]: `Unité`,
                [TableCols.NutrientNoOfObservationsView]: `Nombre d'obser­vations`,
                [TableCols.NutrientStdErrView]: `Écart-type`,
                [DataCols.NutrientDataSrc]: `Source des données`
            },

            ShowUnits: "Afficher les unités ",
            ShowExtraDetails: "Afficher plus de détails"
        },

        CSVDownload: {
            DownloadSearchButtonTitle: "Télécharger les données filtrées",
            DownloadNutrientButtonTitle: "Télécharger les données affichées",
            DownloadAllNutrientButtonTitle: "Télécharger toutes les données",
            SearchFileName: `Profil de recherche`,
            AllNutrientFileName: `Profil nutritionnel - {{ foodName }}`,
            NutrientFileName: `Profil nutritionnel - {{ foodName }}`,
            Date: `Date : {{ date }}`
        },

        multiselectAutoComplete: {
            canOnlySelectOne: "Seulement un élément peut être sélectionné",
            maxItemText: "Seulement {{ maxItemCount }} éléments peuvent être sélectionnés",
            noResultsText: "Aucun résultats"
        },

        dataTableAllOptions: "toutes",

        // references: https://datatables.net/plug-ins/i18n/French.html
        // note:
        //  For some reason the CDN link provided in the documentation causes
        //  some errors with the datatables, so we copied the content of the
        //  translation JSON file here
        dataTable: {
            "emptyTable": "Aucune donnée disponible dans le tableau",
            "loadingRecords": "Chargement...",
            "processing": "Traitement...",
            "select": {
                "rows": {
                    "1": "1 ligne sélectionnée",
                    "_": "%d lignes sélectionnées"
                },
                "cells": {
                    "1": "1 cellule sélectionnée",
                    "_": "%d cellules sélectionnées"
                },
                "columns": {
                    "1": "1 colonne sélectionnée",
                    "_": "%d colonnes sélectionnées"
                }
            },
            "autoFill": {
                "cancel": "Annuler",
                "fill": "Remplir toutes les cellules avec <i>%d</i>",
                "fillHorizontal": "Remplir les cellules horizontalement",
                "fillVertical": "Remplir les cellules verticalement"
            },
            "searchBuilder": {
                "conditions": {
                    "date": {
                        "after": "Après le",
                        "before": "Avant le",
                        "between": "Entre",
                        "empty": "Vide",
                        "not": "Différent de",
                        "notBetween": "Pas entre",
                        "notEmpty": "Non vide",
                        "equals": "Égal à"
                    },
                    "number": {
                        "between": "Entre",
                        "empty": "Vide",
                        "gt": "Supérieur à",
                        "gte": "Supérieur ou égal à",
                        "lt": "Inférieur à",
                        "lte": "Inférieur ou égal à",
                        "not": "Différent de",
                        "notBetween": "Pas entre",
                        "notEmpty": "Non vide",
                        "equals": "Égal à"
                    },
                    "string": {
                        "contains": "Contient",
                        "empty": "Vide",
                        "endsWith": "Se termine par",
                        "not": "Différent de",
                        "notEmpty": "Non vide",
                        "startsWith": "Commence par",
                        "equals": "Égal à",
                        "notContains": "Ne contient pas",
                        "notEndsWith": "Ne termine pas par",
                        "notStartsWith": "Ne commence pas par"
                    },
                    "array": {
                        "empty": "Vide",
                        "contains": "Contient",
                        "not": "Différent de",
                        "notEmpty": "Non vide",
                        "without": "Sans",
                        "equals": "Égal à"
                    }
                },
                "add": "Ajouter une condition",
                "button": {
                    "0": "Recherche avancée",
                    "_": "Recherche avancée (%d)"
                },
                "clearAll": "Effacer tout",
                "condition": "Condition",
                "data": "Donnée",
                "deleteTitle": "Supprimer la règle de filtrage",
                "logicAnd": "Et",
                "logicOr": "Ou",
                "title": {
                    "0": "Recherche avancée",
                    "_": "Recherche avancée (%d)"
                },
                "value": "Valeur",
                "leftTitle": "Désindenter le critère",
                "rightTitle": "Indenter le critère"
            },
            "searchPanes": {
                "clearMessage": "Effacer tout",
                "count": "{total}",
                "title": "Filtres actifs - %d",
                "collapse": {
                    "0": "Volet de recherche",
                    "_": "Volet de recherche (%d)"
                },
                "countFiltered": "{shown} ({total})",
                "emptyPanes": "Pas de volet de recherche",
                "loadMessage": "Chargement du volet de recherche...",
                "collapseMessage": "Réduire tout",
                "showMessage": "Montrer tout"
            },
            "buttons": {
                "collection": "Collection",
                "colvis": "Visibilité colonnes",
                "colvisRestore": "Rétablir visibilité",
                "copy": "Copier",
                "copySuccess": {
                    "1": "1 ligne copiée dans le presse-papier",
                    "_": "%d lignes copiées dans le presse-papier"
                },
                "copyTitle": "Copier dans le presse-papier",
                "csv": "CSV",
                "excel": "Excel",
                "pageLength": {
                    "1": "Afficher 1 ligne",
                    "-1": "Afficher toutes les lignes",
                    "_": "Afficher %d lignes"
                },
                "pdf": "PDF",
                "print": "Imprimer",
                "copyKeys": "Appuyez sur ctrl ou u2318 + C pour copier les données du tableau dans votre presse-papier.",
                "createState": "Créer un état",
                "removeAllStates": "Supprimer tous les états",
                "removeState": "Supprimer",
                "renameState": "Renommer",
                "savedStates": "États sauvegardés",
                "stateRestore": "État %d",
                "updateState": "Mettre à jour"
            },
            "decimal": ",",
            "datetime": {
                "previous": "Précédent",
                "next": "Suivant",
                "hours": "Heures",
                "minutes": "Minutes",
                "seconds": "Secondes",
                "unknown": "-",
                "amPm": [
                    "am",
                    "pm"
                ],
                "months": {
                    "0": "Janvier",
                    "1": "Février",
                    "2": "Mars",
                    "3": "Avril",
                    "4": "Mai",
                    "5": "Juin",
                    "6": "Juillet",
                    "7": "Août",
                    "8": "Septembre",
                    "9": "Octobre",
                    "10": "Novembre",
                    "11": "Décembre"
                },
                "weekdays": [
                    "Dim",
                    "Lun",
                    "Mar",
                    "Mer",
                    "Jeu",
                    "Ven",
                    "Sam"
                ]
            },
            "editor": {
                "close": "Fermer",
                "create": {
                    "title": "Créer une nouvelle entrée",
                    "button": "Nouveau",
                    "submit": "Créer"
                },
                "edit": {
                    "button": "Editer",
                    "title": "Editer Entrée",
                    "submit": "Mettre à jour"
                },
                "remove": {
                    "button": "Supprimer",
                    "title": "Supprimer",
                    "submit": "Supprimer",
                    "confirm": {
                        "1": "Êtes-vous sûr de vouloir supprimer 1 ligne ?",
                        "_": "Êtes-vous sûr de vouloir supprimer %d lignes ?"
                    }
                },
                "multi": {
                    "title": "Valeurs multiples",
                    "info": "Les éléments sélectionnés contiennent différentes valeurs pour cette entrée. Pour modifier et définir tous les éléments de cette entrée à la même valeur, cliquez ou tapez ici, sinon ils conserveront leurs valeurs individuelles.",
                    "restore": "Annuler les modifications",
                    "noMulti": "Ce champ peut être modifié individuellement, mais ne fait pas partie d'un groupe. "
                },
                "error": {
                    "system": "Une erreur système s'est produite (<a target=\"\\\" rel=\"nofollow\" href=\"\\\">Plus d'information</a>)."
                }
            },
            "stateRestore": {
                "removeSubmit": "Supprimer",
                "creationModal": {
                    "button": "Créer",
                    "order": "Tri",
                    "paging": "Pagination",
                    "scroller": "Position du défilement",
                    "search": "Recherche",
                    "select": "Sélection",
                    "columns": {
                        "search": "Recherche par colonne",
                        "visible": "Visibilité des colonnes"
                    },
                    "name": "Nom :",
                    "searchBuilder": "Recherche avancée",
                    "title": "Créer un nouvel état",
                    "toggleLabel": "Inclus :"
                },
                "renameButton": "Renommer",
                "duplicateError": "Il existe déjà un état avec ce nom.",
                "emptyError": "Le nom ne peut pas être vide.",
                "emptyStates": "Aucun état sauvegardé",
                "removeConfirm": "Voulez vous vraiment supprimer %s ?",
                "removeError": "Échec de la suppression de l'état.",
                "removeJoiner": "et",
                "removeTitle": "Supprimer l'état",
                "renameLabel": "Nouveau nom pour %s :",
                "renameTitle": "Renommer l'état"
            },
            "info": "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
            "infoEmpty": "Affichage de 0 à 0 sur 0 entrées",
            "infoFiltered": "(filtrées depuis un total de _MAX_ entrées)",
            "lengthMenu": "Afficher _MENU_ entrées",
            "paginate": {
                "first": "Première",
                "last": "Dernière",
                "next": "Suivante",
                "previous": "Précédente"
            },
            "zeroRecords": "Aucune entrée correspondante trouvée",
            "aria": {
                "sortAscending": " : activer pour trier la colonne par ordre croissant",
                "sortDescending": " : activer pour trier la colonne par ordre décroissant"
            },
            "infoThousands": " ",
            "search": "Rechercher :",
            "thousands": " "
        }
    }
}

// ==============================================================


// translations for certain text used in the project
export const TranslationObj = {
    en: LangEN,
    fr: LangFR,
}