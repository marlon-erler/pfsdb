import Path from "path";
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

console.log("starting test...");
const DB_BASE = "test";

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

    assert(DB_BASE, database.basePath);
    
    const inputPath = ["a", "b", "c"];
    const control = Path.join(DB_BASE, ...inputPath);
    const result = database.getFileSystemPath(inputPath);
    assert(control, result);
}

/////
logStep("file system operations");
{
    const database = new Database(DB_BASE);
}
