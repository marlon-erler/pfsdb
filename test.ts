import Path from "path";
import Fs from "fs";
import Colors from "colors/safe";

import { Util, Database, Table } from "./index";

function log(message: string, ...parts: any[]) {
    logColored("gray", message, ...parts);
}
function logColored(color: string, message: string, ...parts: any[]) {
    console.log(Colors[color].bold(`TEST: ${message}`), ...parts);
}

function logStep(stepName: string) {
    log(`
###
# Current step: ${stepName}
###`
    )
}

function ok() {
    logColored("green", "passed");
}

function assert(a: any, b: any) {
    log("comparing plain values:", a, b);

    if (a != b)
	throw `${a} does not match ${b}`;

    ok();
}

function assertArrays(a: any[], b: any[]) {
    log("comparing arrays:", a, b);

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

log("setting variables...");
const TEST_DIR = "test";
const DB_BASE = Path.join(TEST_DIR, "base");

log("preparing...");
if (Fs.existsSync(TEST_DIR))
    Fs.rmSync(TEST_DIR, { recursive: true });
Fs.mkdirSync(TEST_DIR, { recursive: true })

log("starting test...");

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

    log("checking base path...");
    assert(DB_BASE, database.basePath);

    log("checking getFileSystemPath...");
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
    log("creating directory...");
    await database.createDirectoryOrFail(directoryPath);

    log("writing files...");
    await database.writeFileOrFail(filePath, fileContent);
    await database.writeFileOrFail(filePathB, fileContent);

    log("reading directory...");
    const readDirControl = Fs.readdirSync(realDirectoryPath);
    const readDirResult = await database.readDirectoryOrFail(directoryPath);
    assertArrays(readDirControl, readDirResult);

    log("reading file...");
    const readFileResult = await database.readFileOrFail(filePath);
    assert(fileContent, readFileResult);

    log("deleting file...");
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
    const VALUE_KEY = Util.generateValueKey(VALUE_NAME);
    const ENTRY_ID = "entry-id";

    // test
    const database = new Database(DB_BASE);
    const table = new Table(TABLE_NAME, database);

    log("checking base path...");
    assertArrays([TABLE_NAME], table.basePath);

    log("checking field container path...");
    assertArrays(table.fieldContainerPath, [TABLE_NAME, "fields"]);

    log("checking entry container path...");
    assertArrays(table.entryContainerPath, [TABLE_NAME, "entries"]);

    log("checking specific field path...");
    // @ts-expect-error 
    assertArrays(table.getPathForField(FIELD_NAME), [TABLE_NAME, "fields", FIELD_NAME]);

    log("checking specific field value path...");
    // @ts-expect-error 
    assertArrays(table.getValuePathForField(FIELD_NAME, VALUE_NAME), [TABLE_NAME, "fields", FIELD_NAME, VALUE_KEY]);

    log("checking specific entry path in field...");
    // @ts-expect-error 
    assertArrays(table.getEntryPathForFieldValue(FIELD_NAME, VALUE_NAME, ENTRY_ID), [TABLE_NAME, "fields", FIELD_NAME, VALUE_KEY, ENTRY_ID]);

    log("checking specific entry path...");
    // @ts-expect-error 
    assertArrays(table.getPathForEntry(ENTRY_ID), [TABLE_NAME, "entries", ENTRY_ID]);

    log("checking specific field path in entry...");
    // @ts-expect-error 
    assertArrays(table.getFieldPathForEntry(ENTRY_ID, FIELD_NAME), [TABLE_NAME, "entries", ENTRY_ID, FIELD_NAME]);

    log("checking specific field value path in entry...");
    // @ts-expect-error 
    assertArrays(table.getFieldValuePathForEntry(ENTRY_ID, FIELD_NAME, VALUE_NAME), [TABLE_NAME, "entries", ENTRY_ID, FIELD_NAME, VALUE_KEY]);
}

/////
logStep("core");
{
    const database = new Database(DB_BASE);
    const COMPLEX_VALUE = "value,./;:'[]{}()!@#$%^&*";

    async function testTable(tableName: string) {
	const table = new Table(tableName, database);

	async function testEntry(suffix: string) {
	    const entryId = `entry-${suffix}`;

	    log("adding values to fields...");
	    await table.addFieldValuesToEntry(entryId, "a", ["a", "b", "c"]);
	    await table.addFieldValuesToEntry(entryId, "a", ["c", "d"]);
	    await table.addFieldValuesToEntry(entryId, "b", ["1", "2", COMPLEX_VALUE]);
	    await table.addFieldValuesToEntry(entryId, "id", [suffix]);

	    log("getting fields...");
	    const fields = await table.getFieldsOfEntry(entryId);
	    assertArrays(fields, ["a", "b", "id"]);

	    log("getting values...");
	    const aValues = await table.getValuesForField(entryId, "a");
	    const bValues = await table.getValuesForField(entryId, "b");
	    const unknownValues = await table.getValuesForField(entryId, "x");
	    assertArrays(aValues, ["a", "b", "c", "d"]);
	    assertArrays(bValues, ["1", "2", COMPLEX_VALUE]);
	    assertArrays(unknownValues, []);

	    log("deleting values...");
	    await table.removeFieldValuesFromEntry(entryId, "a", ["a", "b"]);
	    const removeControl = await table.getValuesForField(entryId, "a");
	    assertArrays(removeControl, ["c", "d"]);

	    log("clearing values...");
	    await table.clearFieldValuesForEntry(entryId, "b");
	    const clearControl = await table.getValuesForField(entryId, "b");
	    assertArrays(clearControl, []);

	    log("removing non-existent entry...");
	    await table.removeEntry("x");

	    log("accessing non-existent field...");
	    await table.getValuesForField("x", "x");

	    log("deleting non-existent value...");
	    await table.removeFieldValuesFromEntry("x", "x", ["x"]);
	}

	await testEntry("1");
	await testEntry("2");

	log("getting all entries...");
	const entries = await table.getAllEntries();
	assertArrays(entries, ["entry-1", "entry-2"]);
	
	log("getting entries by field a=a...");
	const matchingEntries1 = await table.getEntriesByFieldValue("a", ["c"])
	assertArrays(matchingEntries1, ["entry-1", "entry-2"]);
	
	log("getting entries by field id=1|2...");
	const matchingEntries2 = await table.getEntriesByFieldValue("id", ["1", "2"])
	assertArrays(matchingEntries2, ["entry-1", "entry-2"]);
	
	log("getting entries by field id=1...");
	const matchingEntries3 = await table.getEntriesByFieldValue("id", ["1"])
	assertArrays(matchingEntries3, ["entry-1"]);
    }

    await testTable("A");
    await testTable("B");
}
