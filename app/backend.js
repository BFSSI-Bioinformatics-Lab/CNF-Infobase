import { SearchOpts } from "./constants.js";
import { Translation } from "./tools.js";


export class Model {
    constructor() {
        this.searchOpt = SearchOpts.SearchByFood;

        this.foodNameTable;
    }

    // loadCSV(file): Loads the table and its columns from a CSV file
    async loadCSV(file) {
        const data = await d3.csv(file);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        return {data, columns};
    }

    // load(): Initial load of all the required data
    async load() {
        await Promise.all([this.loadCSV(`data/Food_Name.csv`)])
            .then(([foodNameTable]) => {
                this.foodNameTable = foodNameTable; 
        });
    }

    // getFoodSearchTableData(): Retrieves the data for the searched foods 
    getFoodSearchTableData() {
        return this.foodNameTable.data;
    }
}