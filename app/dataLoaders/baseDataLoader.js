export class BaseDataLoader {
    constructor(backend) {
        this.backend = backend;
    }

    // load(): Load any necessary data at startup
    async load() {

    }

    // tokenizeFoodDescription(foodDescription): Split the food description name into different tokens
    tokenizeFoodDescription(foodDescription) {
        if (foodDescription === "") return [];
        
        const result = foodDescription.toLowerCase().split(",");
        let resultLen = result.length;
        let i = 0;

        while (i < resultLen) {
            const keywords = result[i].trim().split(" ");
            const keywordsLen = keywords.length;

            result.splice(i, 1, ...keywords);

            i += keywordsLen;
            resultLen += keywordsLen - 1;
        }

        return result;
    }

    // addIndexVal(row, rowInd, indices, getIndexVal): Adds an index key to some table's indices
    addIndexVal(row, rowInd, indices, getIndexVal) {
        const indexVal = getIndexVal(row);
        const indexBucket = indices[indexVal];

        if (indexBucket === undefined) {
            indices[indexVal] = new Set([rowInd]);
        } else {
            indexBucket.add(rowInd);
        }
    }
};