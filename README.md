# pfsdb
Plain File-System-Based Database

Usage
---
```TypeScript
// initialize database
const database = new Database("path/to/database/directory");

// create tables
const table1 = new Table("table-1", database);
const table2 = new Table("table-2", database);

// write data
await table1.addFieldValuesToEntry("john-doe", "name", ["John Doe"]);
await table1.addFieldValuesToEntry("john-doe", "age", ["42"]);
await table1.addFieldValuesToEntry("john-doe", "records", ["record1", "record2"]);

// delete data
await table1.removeFieldValuesFromEntry("john-doe", "records", ["record2"]);
await table1.clearFieldValuesForEntry("john-doe", "records");
await table1.removeEntry("john-doe");

// find entries
const allEntryIds: string[] = await table1.getAllEntries();
const filteredEntryIds: string[] = await table1.getEntriesByFieldValue("name", ["John Doe", "Jane Doe"]);

// get data
const name: string[]  = await table.getValuesForField("john-doe", "name");
```
