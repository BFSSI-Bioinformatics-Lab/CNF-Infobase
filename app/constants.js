// Different Search options in the App
export const SearchOpts = {
    SearchByFood: "Search by Food",
    SearchByNutrient: "Search By Nutrient",
    CompareNutrients: "Compare Nutrients"
}

// File locations for each page
export const PageSrc = {
    [SearchOpts.SearchByFood]: "./templates/searchByFood.html",
    [SearchOpts.SearchByNutrient]: "./templates/searchByNutrient.html",
    [SearchOpts.CompareNutrients]: "./templates/compareByNutrient.html"
};

// Different columns in the raw data
// Note: Copy the exact column name from the CSV files without the language code
export const DataCols = {
    FoodCode: "Food_Code",
    FoodDescription: "Food_Description_",
    FoodAltDescription: "Alternate_Description_",
    FoodGroupCode: "CNF_Food_Group_Code",
    FoodGroupDescription: "CNF_Food_Group_Description_",
    MeasureTypeCode: "Measure_Type_Code",
    MeasureCode: "Measure_Code",
    MeasureDescription: "Measure_Description_and_Unit_",
    MeasureWeight: "Measure_Weight_Conversion",
    NutrientCode: "Nutrient_Code",
    NutrientSrcCode: "Nutrient_Source_Code",
    NutrientName: "Nutrient_Name_",
    NutrientUnit: "Nutrient_Unit",
    NutrientAmount: "Nutrient_Amount",
    NutrientNoOfObservations: "Observations",
    NutrientStdErr: "STD_Error",
    NutrientDataSrc: "Nutrient_Source_Description_",
    NutrientDecimalPlace: "Nutrient_Decimals",
    NutrientGroup: "Nutrient_Group_"
}

// Columns with translations
export const LangDataCols= new Set([DataCols.FoodDescription, DataCols.FoodGroupDescription, DataCols.MeasureDescription,
    DataCols.NutrientName, DataCols.NutrientDataSrc, DataCols.FoodAltDescription, DataCols.NutrientGroup
]);

// columns used in the table in the app
export const TableCols = {...DataCols,
    ConvertedNutrientAmount: "Nutrient_Converted_",
    MeasureWeightConvId: "Meausre_Weight_Conversion_Id",
    NutrientGroupOrder: "Nutrient_Group_Order",
    FoodNameOrder: "Food Name Order",
    FoodAltNameOrder: "Food Alt Name Order",
};

// Measure codes to filter out in the app
export const HiddenMeasureCodes = new Set([
    "750" // Total Refuse
]);

// Special Measure Code for 100g of Edible portions (the default measurement)
export const DefaultMeasureCode = 0;

// Some specific needed Measure Type Codes
export const MeasureTypeCodes = {
    Default: 0,
    Refuse: 3
};

// The columns to display in the Search By Food table
export const FoodSearchTableCols = [
    DataCols.FoodCode,
    DataCols.FoodGroupDescription,
    DataCols.FoodDescription,
    DataCols.FoodAltDescription
];

// The columns to display in the Search By Nutrient table
export const NutrientSearchTableCols = [
    DataCols.FoodCode,
    DataCols.FoodGroupDescription,
    DataCols.FoodDescription,
    DataCols.NutrientAmount
];

// The columns to display in the Nutrient table
export const NutrientTableCols = [
    DataCols.NutrientName,
    DataCols.NutrientUnit,
    DataCols.NutrientNoOfObservations,
    DataCols.NutrientStdErr,
    DataCols.NutrientDataSrc
]

// Different attributes used to search some food/nutrient
export const SearchAtts = {
    FoodName: "food name",
    FoodAltName: "food alternative name",
    FoodGroup: "food group",
    FoodCode: "food code",
    Nutrient: "nutrient"
}

// Keyboard codes when the user enters a key
export const KeyboardCodes = {
    Enter: 13
}


// ================= ENGLISH TRANSLATIONS =======================

const LangEN = {
    translation: {
        Number: "{{num, number}}",

        SearchByFood: "Search by Food",
        SearchByNutrient: "Search by Nutrient",
        CompareByNutrient:"Compare by Nutrient",

        InstructionsTitle: "Instructions",
        InstructionsText: `
        <p>
            The food search is case- and accent-insensitive, and keywords used can represent complete or partial words. 
            Keywords will be matched in any order against any part of food descriptions. If more than one keyword is used, they may be separated by a space or any of the operators 
            'and', 'or', or 'not'. A space is equivalent to the operator 'and'. In all cases, keywords are searched both as whole words and partial words, 
            which means that a singular keyword will also find the corresponding plural forms, and prefixed forms. 
            Examples: a) 'fish' will also find 'Crayfish', b) 'apple raw' (or 'apple and raw') will find all the foods having both keywords anywhere in their description, 
            but also: 'Pineapple, raw', c) 'apple or raw' will find any food having either or both keywords anywhere in the description, while 'apple 
            not raw' will find all instances of 'apple' except where 'raw' is also present anywhere in the description.
        </p>

        <p class="mrgn-tp-lg">
            Alternatively, you can search by the unique four digit Canadian Nutrient File (CNF) food code.
        </p>`,

        SearchCriteriaTitle: "Search Criteria",
        FoodNameInputTitle: "Food Name",
        FoodAltNameInputTitle: "Food Common Name",
        FoodGroupInputTitle: "Food Group",
        FoodCodeInputTitle: "Food Code",
        NutrientInputTitle: "Nutrient",

        FoodSearchButton: "Food Search",
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
                [DataCols.FoodAltDescription]: "Food Alternative Name"
            },

            [SearchOpts.SearchByNutrient]: {
                [DataCols.FoodCode]: "Food Code",
                [DataCols.FoodGroupDescription]: "Food Group",
                [DataCols.FoodDescription]: "Food Name",
                [DataCols.NutrientAmount]: "Nutrient Amount g"
            }
        },

        FoodNutrientStats: {
            SubTitle: `Food Code: {{ foodCode }}`,
            ServingTitle: `Available Serving Size(s)`,
            ServingRefuseTitle: `Refuse`,
            ServingSizeOption: `{{ measureName }} = {{ convertedMeasure }} g`,
            ServingRefuseListItem: `{{ measureName }} {{ convertedMeasure }} %`,
            NutrientTableTitle: `List of nutrient data`,
            DefaultNutrientMeasure: `Value per 100 g of edible portion`,

            TableCols: {
                [DataCols.NutrientName]: `Nutrient Name`,
                [DataCols.NutrientUnit]: `Unit`,
                [DataCols.NutrientNoOfObservations]: `Number of obser­vations`,
                [DataCols.NutrientStdErr]: `Standard error`,
                [DataCols.NutrientDataSrc]: `Data source`
            },

            ConvertedMeasureCol: `{{ measureName }} / {{ convertedMeasure }} g`
        },

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

        SearchByFood: "Recherche par Aliment",
        SearchByNutrient: "Recherche par Éléments Nutritifs",
        CompareByNutrient: REMPLACER_MOI,

        InstructionsTitle: "Instructions",
        InstructionsText: `
        <p>
            Vous pouvez effectuer une recherche d'aliments avec ou sans accents, en lettres majuscules ou minuscules et avec des mots clés complets ou partiels. 
            Les mots clés seront recherchés peu importe leur ordre, partout dans la description. Un espace laissé entre les mots sera interprété comme l'opérateur « et ». 
            Vous pouvez aussi utiliser les opérateur « ou » et « non » pour préciser la recherche. Les mots clés sont cherchés en tant que mots complets ou mots partiels, 
            ce qui veut dire qu'une recherche au singulier trouvera les mots au pluriel. Exemples : a) pomme trouvera aussi pommes, pommette, b) pomme crue (ou pomme et crue) trouvera aussi 
            tous les aliments qui contiennent ces deux mots dont pomme de terre crue, c) pomme ou crue trouvera les aliments qui contiennent l'un ou l'autre de ces mots ainsi que les deux mots présents dans le nom. 
            Pomme non crue trouvera tous les aliments qui contiennent le mot pomme sauf ceux renfermant le mot crue.
        </p>

        <p class="mrgn-tp-lg">
            Vous pouvez également effectuer une recherche par le code d'aliment du Fichier canadien sur les éléments nutritifs (FCÉN) de 4 chiffres.
        </p>`,

        SearchCriteriaTitle: "Critères de Recherche",
        FoodNameInputTitle: "Nom de l'Aliment",
        FoodAltNameInputTitle: REMPLACER_MOI,
        FoodGroupInputTitle: "Groupe de l'Aliment",
        FoodCodeInputTitle: "Code de l'Aliment",
        NutrientInputTitle: "Élément nutritif",

        FoodSearchButton: "Recherche de l'Aliment",
        FoodSearchResetButton: "Réinitialiser",

        NoneSelected: "Aucune Sélectionnée",
        SelectAll: "Tout Sélectionner",
        DeselectAll: "Tout Désélectionner",

        SearchTableInstructions: REMPLACER_MOI,

        SearchTableCols: {
            [SearchOpts.SearchByFood]: {
                [DataCols.FoodCode]: "Code de l'Aliment",
                [DataCols.FoodGroupDescription]: "Groupe de l'Aliment",
                [DataCols.FoodDescription]: "Nom de l'Aliment",
                [DataCols.FoodAltDescription]: "Nom Alternatif de l'Aliment"
            },
            [SearchOpts.SearchByNutrient]: {
                [DataCols.FoodCode]: "Code de l'Aliment",
                [DataCols.FoodGroupDescription]: "Groupe de l'Aliment",
                [DataCols.FoodDescription]: "Nom de l'Aliment",
                [DataCols.NutrientAmount]: "Valeur nutritive g"
            }
        },

        FoodNutrientStats: {
            SubTitle: `Code de l'Aliment: {{ foodCode }}`,
            ServingTitle: `Taille(s) de Portion Disponible(s)`,
            ServingRefuseTitle: `Portion Non Comestible`,
            ServingSizeOption: `{{ measureName }} = {{ convertedMeasure }} g`,
            ServingRefuseListItem: `{{ measureName }} {{ convertedMeasure }} %`,
            NutrientTableTitle: `Liste des valeurs nutritives`,
            DefaultNutrientMeasure: `Valeur pour 100 g de portion comestible`,

            TableCols: {
                [DataCols.NutrientName]: `Nom de l'élément nutritif`,
                [DataCols.NutrientUnit]: `Unité`,
                [DataCols.NutrientNoOfObservations]: `Nombre d'obser­vations`,
                [DataCols.NutrientStdErr]: `Écart-type`,
                [DataCols.NutrientDataSrc]: `Source des données`
            }
        },

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