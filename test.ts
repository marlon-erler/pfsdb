import Path from "path";
import Fs from "fs";
import { Util, Database, Table, Entry } from "./index";

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
logStep("database paths");
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
    const realFilePath = database.getFileSystemPath(filePath);

    const filePathB = [...directoryPath, "file2"];
    const realFilePathB = database.getFileSystemPath(filePath);

    const fileContent = "hello, world!";

    // test
    console.log("checking base directory...");
    if (!Fs.existsSync(DB_BASE))
	throw "base directory missing";
    ok();
    
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
    await database.deleteFileOrFail(filePath);
    assertArrays(["file2"], await database.readDirectoryOrFail(directoryPath));
}
