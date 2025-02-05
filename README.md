# pfsdb
Plain File-System-Based Database

Usage
---
```TypeScript
// initialize database
const database = new Database("path/to/database/directory");

// define types
enum Entries {
    "name",
    "age",
    "records",
}

// create tables
const table1 = new Table<keyof typeof Entries>("table-1", database);
const table2 = new Table<string>("table-2", database);

// write data
await table1.addFieldValuesToEntry("john-doe", "name", ["John Doe"]); // ["John Doe"]
await table1.addFieldValuesToEntry("john-doe", "age", ["42"]); // ["42"]
await table1.addFieldValuesToEntry("john-doe", "records", ["record1", "record2"]); // ["record1", "record2"]
await table1.addFieldValuesToEntry("john-doe", "records", ["record3"]); // ["record1", "record2", "record3"]

// overwrite data
await table1.setFieldValuesForEntry("john-doe", "records", ["record4", "record5"]); // ["record4", "record5"]

// delete data
await table1.removeFieldValuesFromEntry("john-doe", "records", ["record4"]); // ["record5"]
await table1.clearFieldValuesForEntry("john-doe", "records"); // []
await table1.removeEntry("john-doe");

// find entries
const allEntryIds: string[] = await table1.getAllEntries();
const filteredEntryIds: string[] = await table1.getEntriesByFieldValue("name", ["John Doe", "Jane Doe"]);

// get data
const name: string[]  = await table.getValuesForField("john-doe", "name");
```
