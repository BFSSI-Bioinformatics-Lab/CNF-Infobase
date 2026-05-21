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


// ================= ENGLISH TRANSLATIONS =======================

const LangEN = {
    translation: {
        SearchByFood: "Search by Food",
        SearchByNutrient: "Search by Nutrient",
        CompareByNutrient:"Compare by Nutrient",

        InstructionsTitle: "Instructions",
        InstructionsText: `The food search is case- and accent-insensitive, and keywords used can represent complete or partial words. 
        Keywords will be matched in any order against any part of food descriptions. If more than one keyword is used, they may be separated by a space or any of the operators 
        'and', 'or', or 'not'. A space is equivalent to the operator 'and'. In all cases, keywords are searched both as whole words and partial words, 
        which means that a singular keyword will also find the corresponding plural forms, and prefixed forms. 
        Examples: a) 'fish' will also find 'Crayfish', b) 'apple raw' (or 'apple and raw') will find all the foods having both keywords anywhere in their description, 
        but also: 'Pineapple, raw', c) 'apple or raw' will find any food having either or both keywords anywhere in the description, while 'apple 
        not raw' will find all instances of 'apple' except where 'raw' is also present anywhere in the description.

        Alternatively, you can search by the unique four digit Canadian Nutrient File (CNF) food code.`
    }
}

// ==============================================================
// ============== FRENCH TRANSLATIONS ===========================

const REMPLACER_MOI = "REMPLACER MOI"
const REMPLACER_MOI_AVEC_ARGUMENTS = `${REMPLACER_MOI} - les arguments du texte: `;


const LangFR = {
    translation: {
        SearchByFood: "Recherche par Aliment",
        SearchByNutrient: "Recherche par Éléments Nutritifs",
        CompareByNutrient: REMPLACER_MOI,

        InstructionsTitle: "Instructions",
        InstructionsText: REMPLACER_MOI
    }
}

// ==============================================================


// translations for certain text used in the project
export const TranslationObj = {
    en: LangEN,
    fr: LangFR,
}