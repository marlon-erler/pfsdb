import Path from "path";
import Fs from "fs";
import { Util, Database, Table } from "./index";

function logStep(stepName: string) {
    console.log(`
###
# Current step: ${stepName}
###`
    )
}

function ok() {
    console.log("passed");
}

function assert(a: any, b: any) {
    console.log("comparing plain values:", a, b);

    if (a != b)
	throw `${a} does not match ${b}`;

    ok();
}

function assertArrays(a: any[], b: any[]) {
    console.log("comparing arrays:", a, b);

    if (a.length != b.length) 
	throw "array sizes do not mach"

    for (let i = 0; i < a.length; i++) {
	const aItem = a[i];
	const bItem = b[i];

	if (aItem == bItem) 
	    continue;

	throw `${aItem} does not match ${bItem} (index ${i}`;
    }

    ok();
}

console.log("setting variables...");
const TEST_DIR = "test";
const DB_BASE = Path.join(TEST_DIR, "base");

console.log("preparing...");
if (Fs.existsSync(TEST_DIR))
    Fs.rmSync(TEST_DIR, { recursive: true });
Fs.mkdirSync(TEST_DIR, { recursive: true })

console.log("starting test...");

/////
logStep("generate directory path");
{
    const filePath = ["a", "b", "c"];
    const control = ["a", "b"];
    const result = Util.getDirectoryPath(filePath);
    assertArrays(control, result);
}

/////
logStep("database basic");
{
    const database = new Database(DB_BASE);

    console.log("checking base path...");
    assert(DB_BASE, database.basePath);

    console.log("checking getFileSystemPath...");
    const inputPath = ["a", "b", "c"];
    const control = Path.join(DB_BASE, ...inputPath);
    const result = database.getFileSystemPath(inputPath);
    assert(control, result);
}

/////
logStep("file system operations");
{
    const database = new Database(DB_BASE);

    // setup
    const directoryPath = ["a"];
    const realDirectoryPath = database.getFileSystemPath(directoryPath);

    const filePath = [...directoryPath, "file1"];
    const filePathB = [...directoryPath, "file2"];

    const fileContent = "hello, world!";

    // test
    console.log("creating directory...");
    await database.createDirectoryOrFail(directoryPath);

    console.log("writing files...");
    await database.writeFileOrFail(filePath, fileContent);
    await database.writeFileOrFail(filePathB, fileContent);

    console.log("reading directory...");
    const readDirControl = Fs.readdirSync(realDirectoryPath);
    const readDirResult = await database.readDirectoryOrFail(directoryPath);
    assertArrays(readDirControl, readDirResult);

    console.log("reading file...");
    const readFileResult = await database.readFileOrFail(filePath);
    assert(fileContent, readFileResult);

    console.log("deleting file...");
    await database.deleteObjectOrFail(filePath);
    assertArrays(["file2"], await database.readDirectoryOrFail(directoryPath));
}

/////
logStep("table basic");
{
    // setup
    const TABLE_NAME = "table";
    const FIELD_NAME = "field";
    const VALUE_NAME = "value";
    const ENTRY_ID = "entry-id";

    // test
    const database = new Database(DB_BASE);
    const table = new Table(TABLE_NAME, database);

    console.log("checking base path...");
    assertArrays([TABLE_NAME], table.basePath);

    console.log("checking field container path...");
    assertArrays(table.fieldContainerPath, [TABLE_NAME, "fields"]);

    console.log("checking entry container path...");
    assertArrays(table.entryContainerPath, [TABLE_NAME, "entries"]);

    console.log("checking specific field path...");
    // @ts-expect-error 
    assertArrays(table.getPathForField(FIELD_NAME), [TABLE_NAME, "fields", FIELD_NAME]);

    console.log("checking specific field value path...");
    // @ts-expect-error 
    assertArrays(table.getValuePathForField(FIELD_NAME, VALUE_NAME), [TABLE_NAME, "fields", FIELD_NAME, VALUE_NAME]);

    console.log("checking specific entry path in field...");
    // @ts-expect-error 
    assertArrays(table.getEntryPathForFieldValue(FIELD_NAME, VALUE_NAME, ENTRY_ID), [TABLE_NAME, "fields", FIELD_NAME, VALUE_NAME, ENTRY_ID]);

    console.log("checking specific entry path...");
    // @ts-expect-error 
    assertArrays(table.getPathForEntry(ENTRY_ID), [TABLE_NAME, "entries", ENTRY_ID]);

    console.log("checking specific field path in entry...");
    // @ts-expect-error 
    assertArrays(table.getFieldPathForEntry(ENTRY_ID, FIELD_NAME), [TABLE_NAME, "entries", ENTRY_ID, FIELD_NAME]);

    console.log("checking specific field value path in entry...");
    // @ts-expect-error 
    assertArrays(table.getFieldValuePathForEntry(ENTRY_ID, FIELD_NAME, VALUE_NAME), [TABLE_NAME, "entries", ENTRY_ID, FIELD_NAME, VALUE_NAME]);
}

/////
logStep("core");
{
    const database = new Database(DB_BASE);

    async function testTable(tableName: string) {
	const table = new Table(tableName, database);

	async function testEntry(suffix: string) {
	    const entryId = `entry-${suffix}`;

	    console.log("adding values to fields...");
	    await table.addFieldValuesToEntry(entryId, "a", ["a", "b", "c"]);
	    await table.addFieldValuesToEntry(entryId, "a", ["c", "d"]);
	    await table.addFieldValuesToEntry(entryId, "b", ["1", "2"]);

	    console.log("getting fields...");
	    const fields = await table.getFieldsOfEntry(entryId);
	    assertArrays(fields, ["a", "b"]);

	    console.log("getting values...");
	    const aValues = await table.getValuesForField(entryId, "a");
	    const bValues = await table.getValuesForField(entryId, "b");
	    assertArrays(aValues, ["a", "b", "c", "d"]);
	    assertArrays(bValues, ["1", "2"]);

	    console.log("deleting values...");
	    await table.removeFieldValuesFromEntry(entryId, "a", ["a", "b"]);
	    const removeControl = await table.getValuesForField(entryId, "a");
	    assertArrays(removeControl, ["c"]);

	    console.log("clearing values...");
	    await table.clearFieldValuesForEntry(entryId, "b");
	    const clearControl = await table.getValuesForField(entryId, "b");
	    assertArrays(clearControl, []);
	}

	await testEntry("1");
	await testEntry("2");

	console.log("getting entries...");
	const entries = await table.getAllEntries();
	assertArrays(entries, ["entry-1", "entry-2"]);
    }

    await testTable("A");
    await testTable("B");
}
