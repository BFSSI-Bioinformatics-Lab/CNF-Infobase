/////////////////////////////////////////////////////////////////////
//                                                                 //
// Purpose: Defines the helper functions used in the app           //
//                                                                 //
//                                                                 //
/////////////////////////////////////////////////////////////////////

import { DataCols, LangDataCols } from "./constants.js";


let ActiveURLObjIds = [];


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
    static translateNum(numStr, decimalPlaces = 1, emptyStr = "-") {
        let num = Number(numStr);
        if (Number.isNaN(num)) return numStr;
        if (numStr === "") return emptyStr;

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

    // getAltLangcode(uppercase): Retrieves the alternative language code
    static getAltLangCode(uppercase = false) {
        const result = Translation.translate("AltLangCode");
        return (uppercase) ? result.toUpperCase() : result;
    }

    // getDataCol(col): Retrieves the name of the column in the raw data
    static getDataCol(col, altLang = false) {
        if (!LangDataCols.has(col)) return col;
        
        const langCode = (altLang) ? this.getAltLangCode(true) : this.getLangCode(true);
        return `${col}${langCode}`;
    }
}


// DictTools: Helper class for dictionaries
export class DictTools {
    // combine(dics): Combines multiple dictionaries toghether
    static combine(dicts) {
        return Object.assign({}, ...dicts);
    }
}


// SetTools: Helper class for setss
//     This class is mostly used to deal with compatibility issues with older browsers
//     since some of Javascript's Set functions are only recently implemented in 2023-2024
export class SetTools {

    // getFirst(set): Retreives the first element from a set
    static getFirst(set) {
        return set.values().next().value;
    }

    // difference(sets, newCopy): Computes the set difference of set1 - set2
    // Note:
    //  If 'newCopy' is set to false, the result for the set difference is stored
    //      at the first set of 'sets'
    static difference(sets, newCopy = false) {
        if (sets.length < 1) return new Set();
        const result = newCopy ? new Set(sets[0]) : sets[0];

        for (let i = 1; i < sets.length; ++i) {
            const currentSet = sets[i];
            for (const element of currentSet) {
                result.delete(element);
            }
        }

        return result;
    }

    // intersection(set1, set2): Computes the set intersection of set1 ∩ set2
    static intersection(set1, set2) { 
        const result = new Set(); 
        for (let element of set2) { 
            if (set1.has(element)) { 
                result.add(element); 
            } 
        } 

        return result; 
    }

    // union(set1, set2, neweCopy): Computes the union of set1 U set2
    static union(set1, set2, newCopy = false) {
        const result = newCopy ? new Set(set1) : set1;
        for (const element of set2) {
            result.add(element);
        }

        return result;
    }

    // filter(set, predicate, newCopy): filters a set
    static filter(set, predicate, newCopy = false) {
        const result = newCopy ? new Set() : set;
        for (const element of set) {
            const inFilter = predicate(element);
            if (newCopy && inFilter) {
                result.add(element);
            } else if (!newCopy && !inFilter) {
                result.delete(element);
            }
        }

        return result;
    }
}


// ListTools: Helper class for Lists
export class ListTools {

    // getUnique(lst, getId): Retrieves the unique elemtns in the list
    static getUnique(lst, getId) {
        const seen = new Set();
        return lst.filter(item => {
            const id = getId(item);

            if (!seen.has(id)) {
                seen.add(id);
                return true;
            }
            return false;
        });
    }
}


// TextTools: Helper class for text
export class TextTools {
    // buildAhoCorasickDFA(keywords): Builds the DFA for AhoCorasick
    static buildAhoCorasickDFA(keywords) {
        const result = new AhoCorasick(keywords);
        result.keywordCount = keywords.length;
        return result;
    }

    // findFirstKeywords(txt, ahoCorasickDFA): Finds the unique keywords within a text
    static findFirstKeywords(txt, ahoCorasickDFA) {
        const result = {};

        const gotoFn = ahoCorasickDFA.gotoFn;
        const failure = ahoCorasickDFA.failure;
        const output = ahoCorasickDFA.output;

        let uniqueCount = 0;
        let currentState = 0;

        for (let i = 0; i < txt.length; i++) {
            const char = txt[i];
            
            // Rollback through failure states safely if the character isn't a valid transition
            while (currentState !== 0 && !(gotoFn[currentState] && char in gotoFn[currentState])) {
                currentState = failure[currentState];
            }
            
            // Advance to the next numerical state position
            if (gotoFn[currentState] && char in gotoFn[currentState]) {
                currentState = gotoFn[currentState][char];
            } else {
                currentState = 0; // Fall back to root state safely if nothing matches
            }
            
            // Extract matching words immediately from the active numerical state
            const matches = output[currentState];
            if (matches && matches.length > 0) {
                for (let j = 0; j < matches.length; j++) {
                    const keyword = matches[j];

                    if (result[keyword] === undefined) {
                        const startIndex = i - keyword.length + 1;
                        result[keyword] = startIndex;
                        uniqueCount++;
                    }
                }

                // 3. Early breakout condition adjusted to use uniqueCount tracking
                if (uniqueCount === ahoCorasickDFA.keywordCount) {
                    break; 
                }
            }
        }
        
        return result;
    }

    static findExactKeyword(txt, ahoCorasickDFA) {
        const foundKeywords = new Set();

        const gotoFn = ahoCorasickDFA.gotoFn;
        const failure = ahoCorasickDFA.failure;
        const output = ahoCorasickDFA.output;
        const txtLen = txt.length;

        let uniqueCount = 0;
        let currentState = 0;

        for (let i = 0; i < txt.length; i++) {
            const char = txt[i];
            
            // Rollback through failure states safely if the character isn't a valid transition
            while (currentState !== 0 && !(gotoFn[currentState] && char in gotoFn[currentState])) {
                currentState = failure[currentState];
            }
            
            // Advance to the next numerical state position
            if (gotoFn[currentState] && char in gotoFn[currentState]) {
                currentState = gotoFn[currentState][char];
            } else {
                currentState = 0; // Fall back to root state safely if nothing matches
            }
            
            // Extract matching words immediately from the active numerical state
            const matches = output[currentState];
            if (matches && matches.length > 0) {
                for (let j = 0; j < matches.length; j++) {
                    const keyword = matches[j];

                    const startIndex = i - keyword.length + 1;
                    const endIndex = i + 1;

                    if (startIndex == 0 && endIndex == txtLen) {
                        return {keyword, start: startIndex, end: endIndex};
                    }

                    foundKeywords.add(keyword);
                }

                // 3. Early breakout condition adjusted to use uniqueCount tracking
                if (foundKeywords.size === ahoCorasickDFA.keywordCount) {
                    return null;
                }
            }
        }
        
        return null;
    }
}


// TableTools: Helper class for doing tabular operations
export class TableTools {
    // createCSVContent(matrix): Creates the string needed for exporting to CSV
    static createCSVContent(matrix) {
        let result = "";
        for (const row of matrix) {
            const colLen = row.length;
            const csvRow = [];

            // clean up the text for each cell
            for (let i = 0; i < colLen; ++i) {
                let cell = row[i];
                if (Number.isNaN(cell) || cell === undefined || cell === null) {
                    cell = "";
                }

                let cleanedText = `${cell}`.replace(/"/g, "'").replace('"', "'");
                cleanedText = `"${cleanedText}"`;
                csvRow.push(cleanedText);
            }

            result += csvRow.join(",") + "\r\n";
        }

        return result;
    }

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

    // downloadCSV(csvConvent): Exports some table as a CSV file
    // Note: For large CSV files, their string content are so big, that they take up
    //  all of the browser's memory and end up not downloading the file.
    //  We want to slowly stream the data download using 'URL.CreateObjectURL'.
    //  https://stackoverflow.com/questions/30167326/unable-to-download-large-data-using-javascript
    //
    // WARNING: Remember to FREE UP the memory of the newly created URL object by calling 'URL.revokeObjectURL'
    //  https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static
    static downloadCSV({csvContent, fileName = "", freePreviousObjects = true, saveNewObjId = true} = {}) {
        if (freePreviousObjects) {
        for (const objId of ActiveURLObjIds) {
            URL.revokeObjectURL(objId);
        }

        ActiveURLObjIds = [];
        }

        const universalBOM = "\uFEFF";

        // creates a temporary link for exporting the table
        const link = document.createElement('a');
        var urlObjId = URL.createObjectURL( new Blob( [universalBOM + csvContent], {type:'text/csv;charset=utf-8'} ) );
        link.setAttribute('href', urlObjId);
        link.setAttribute('download', `${fileName}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (saveNewObjId) {
        ActiveURLObjIds.push(urlObjId);
        }

        return urlObjId;
    }

    /**
     * Download data in CSV format
     *
     * Parameters:
     * - An object that represents downloadable data
     *   - rows: Array of objects, where each object has column titles as keys with corresponding values
     *   - filename: Formatted filename
     */
    static downloadCSVFromData(data, freePreviousObjects = true) {
        const csvContent = d3.csvFormat(data.rows);
        return downloadCSV({csvContent: csvContent, fileName: data.csvFilename, freePreviousObjects: freePreviousObjects});
    }
}