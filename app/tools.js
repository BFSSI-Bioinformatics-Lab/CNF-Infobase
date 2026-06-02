/////////////////////////////////////////////////////////////////////
//                                                                 //
// Purpose: Defines the helper functions used in the app           //
//                                                                 //
//                                                                 //
/////////////////////////////////////////////////////////////////////

import { DataCols, LangDataCols } from "./constants.js";



// Translation: Helper class for doing translations
export class Translation {
    static register(resources){
        i18next.use(i18nextBrowserLanguageDetector).init({
            fallbackLng: "en",
            detection: {
                order: ['querystring', 'htmlTag', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'path', 'subdomain'],
            },
            resources: resources
        })
        i18next.changeLanguage();
    }
    
    // Note:
    // For some food groups with special characters like "Fruits & Vegetables", we want the title to be displayed as "Fruits & Vegetables" instead of "Fruits &amp; Vegatables"
    //  After passing in the food group into the i18next library, the library encoded the food group to be "Fruits &amp; Vegatables"
    // So all the special characters got encoded to their corresponding HTML Entities (eg. &lt; , &gt; , &quot;)
    //
    // So we need to decode back the encoded string with HTML entities to turn back "Fruits &amp; Vegetables" to "Fruits & Vegetables"
    static translate(key, args){
        const result = i18next.t(key, args);

        if (typeof result !== 'string') return result;
        return he.decode(result);
    }

    // translateNumStr(numStr, decimalPlaces): Translate a number to its correct
    //  numeric represented string for different languages
    // eg. '1.2' -> '1,2' in French
    //
    // Note:
    //  See https://www.i18next.com/translation-function/formatting for more formatting
    static translateNum(numStr, decimalPlaces = 1) {
        let num = Number(numStr);
        if (Number.isNaN(num)) return numStr;

        let translateArgs = {num}
        if (decimalPlaces) {
            translateArgs["minimumFractionDigits"] = decimalPlaces;
            translateArgs["maximumFractionDigits"] = decimalPlaces;
        }

        return this.translate("Number", translateArgs);
    }

    // getLangCode(uppercase): Retrieves the language code
    static getLangCode(uppercase = false) {
        const result = i18next.language;
        return (uppercase) ? result.toUpperCase() : result;
    }

    // getDataCol(col): Retrieves the name of the column in the raw data
    static getDataCol(col) {
        return (LangDataCols.has(col)) ? `${col}${this.getLangCode(true)}` : col;
    }
}


// DictTools: Helper class for dictionaries
export class DictTools {
    // combine(dics): Combines multiple dictionaries toghether
    static combine(dicts) {
        return Object.assign({}, ...dicts);
    }
}


// TableTools: Helper class for doing tabular operations
export class TableTools {

    // leftJoinById(srcTable, refTable, srcIdCol, refIdCol, joinedRefCols): Performs a left-join where
    //  the join condition is based on some id
    static leftJoinById(srcTable, refTable, srcIdCol, refIdCol = undefined, joinedRefCols = undefined) {
        if (refIdCol === undefined) {
            refIdCol = srcIdCol;
        }

        refTable = d3.nest()
            .key(d => d[refIdCol])
            .object(refTable);

        return srcTable.map(srcRow => {
            const idVal = srcRow[srcIdCol];
            let refRow = refTable[idVal];
            refRow = (refRow === undefined) ? {} : refRow[0];

            if (joinedRefCols === undefined) {
                return DictTools.combine([srcRow, refRow]);
            }
            
            for (refCol in joinedRefCols) {
                const newRefCol = joinedRefCols[refCol];
                srcRow[newRefCol] = refRow[refCol];
            }

            return srcRow;
        });
    }

    // dataLeftJoinById(srcTable, refTable, srcIdCol, refIdCol, joinedRefCols): Performs a left-join where
    //  the join condition is based on some id for an object containing both table columns and table data
    static dataLeftJoinById(srcTable, refTable, srcIdCol, refIdCol = undefined, joinedRefCols = undefined) {
        const data = this.leftJoinById(srcTable.data, refTable.data, srcIdCol, refIdCol, joinedRefCols);
        let columns = new Set([...srcTable.columns, ...refTable.columns]);
        columns = Array.from(columns);
        return {data, columns};
    }
}