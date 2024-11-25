import Fs from "fs/promises";
import Path from "path";
import Colors from "colors";

export class Util {
    static getDirectoryPath(filePath: string[]): string[] {
	return [...filePath].splice(0, filePath.length - 1);
    }

    static logActivity(message: string, detail: string): void {
	console.log(Colors.magenta(message), Colors.bold(detail));
    }
    static logSuccess(message: string, detail: string): void {
	console.log(Colors.green(message), Colors.bold(detail));
    }
}

export class Database {
    basePath: string;

    constructor(basePath: string) {
	this.basePath = basePath;
    }

    // Paths
    getFileSystemPath(path: string[]): string {
	return Path.join(this.basePath, ...path);
    }

    // Directories
    async createDirectoryOrFail(directoryPath: string[]): Promise<void> {
	const joinedPath = this.getFileSystemPath(directoryPath);
	Util.logActivity("creating directory at", joinedPath);
	await Fs.mkdir(joinedPath, { recursive: true });
	Util.logSuccess("created directory at", joinedPath);
    }
    private async createParentDirectoryForFileOrFail(filePath: string[]): Promise<void> {
	const directoryPath = Util.getDirectoryPath(filePath);
	await this.createDirectoryOrFail(directoryPath);
    }
    async createBaseDirectoryOrFail(): Promise<void> {
	await this.createDirectoryOrFail([]);
    }
    async readDirectoryOrFail(directoryPath: string[]): Promise<string[]> {
	await this.createDirectoryOrFail(directoryPath);

	const joinedPath = this.getFileSystemPath(directoryPath);
	Util.logActivity("reading directory at", joinedPath);
	return await Fs.readdir(joinedPath);
    }

    // Files
    async writeFileOrFail(filePath: string[], content: string): Promise<void> {
	await this.createParentDirectoryForFileOrFail(filePath);

	const joinedPath = this.getFileSystemPath(filePath);
	Util.logActivity("writing file at", joinedPath);
	await Fs.writeFile(joinedPath, content);
	Util.logSuccess("wrote file at", joinedPath);
    }
    async readFileOrFail(filePath: string[]): Promise<string> {
	const joinedPath = this.getFileSystemPath(filePath);
	Util.logActivity("reading file at", joinedPath);
	return await Fs.readFile(joinedPath, { encoding: "utf8" });
    }
    async deleteObjectOrFail(filePath: string[]): Promise<void> {
	const joinedPath = this.getFileSystemPath(filePath);
	Util.logActivity("deleting object at", joinedPath);
	await Fs.rm(joinedPath, { recursive: true });
	Util.logSuccess("deleted object at", joinedPath);
    }
}

export class Table {
    name: string;
    database: Database;

    constructor(name: string, database: Database) {
	this.name = name;
	this.database = database;
    }

    // Paths
    get basePath(): string[] {
	return [this.name];
    }
    get fieldContainerPath(): string[] {
	return [...this.basePath, "fields"];
    }
    get entryContainerPath(): string[] {
	return [...this.basePath, "entries"];
    }

    // fields
    private getPathForField(fieldName: string): string[] {
	return [...this.fieldContainerPath, fieldName];
    }
    private getValuePathForField(fieldName: string, fieldValue: string): string[] {
	const fieldPath = this.getPathForField(fieldName);
	return [...fieldPath, fieldValue];
    }
    private getEntryPathForFieldValue(fieldName: string, fieldValue: string, entryId: string): string[] {
	const fieldValuePath = this.getValuePathForField(fieldName, fieldValue);
	return [...fieldValuePath, entryId];
    }

    // entries
    private getPathForEntry(entryId: string): string[] {
	return [...this.entryContainerPath, entryId];
    }
    private getFieldPathForEntry(entryId: string, fieldName: string): string[] {
	const entryPath = this.getPathForEntry(entryId);
	return [...entryPath, fieldName];
    }
    private getFieldValuePathForEntry(entryId: string, fieldName: string, fieldValue: string): string[] {
	const fieldPath = this.getFieldPathForEntry(entryId, fieldName);
	return [...fieldPath, fieldValue];
    }

    // Entries
    // load
    async getAllEntries(): Promise<string[]> {
	try {
	    return await this.database.readDirectoryOrFail(this.entryContainerPath);
	} catch {
	    return [];
	}
    }
    async getEntriesByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<string[]> {
	const allMatchingEntryIds = [] as string[];
	for (const possibleValue of possibleFieldValues) {
	    try {
		const valuePath = this.getValuePathForField(fieldName, possibleValue);
		const matchingEntryIds = await this.database.readDirectoryOrFail(valuePath);
		allMatchingEntryIds.push(...matchingEntryIds);
	    } catch {}
	}
	return allMatchingEntryIds;
    }

    async getFieldsOfEntry(entryId: string): Promise<string[]> {
	try {
	    const entryPath = this.getPathForEntry(entryId);
	    const unsortedFields = await this.database.readDirectoryOrFail(entryPath);
	    return unsortedFields.sort();
	} catch {
	    return [];
	}
    }
    async getValuesForField(entryId: string, fieldName: string): Promise<string[]> {
	try {
	    const directoryPath = this.getFieldPathForEntry(entryId, fieldName);
	    const unsortedValues = await this.database.readDirectoryOrFail(directoryPath);
	    return unsortedValues.sort();
	} catch {
	    return [];
	}
    }

    // edit
    async removeEntry(entryId: string): Promise<void> {
	// delete from fields
	try {
	    const fields = await this.getFieldsOfEntry(entryId);
	    for (const fieldName of fields) {
		await this.clearFieldValuesForEntry(entryId, fieldName);
	    }
	} catch {}

	// delete entry
	try {
	    const entryPath = this.getPathForEntry(entryId);
	    await this.database.deleteObjectOrFail(entryPath);
	} catch {}
    }
    async clearFieldValuesForEntry(entryId: string, fieldName: string): Promise<void> {
	const fieldValues = await this.getValuesForField(entryId, fieldName);
	await this.removeFieldValuesFromEntry(entryId, fieldName, fieldValues);
    }
    async removeFieldValuesFromEntry(entryId: string, fieldName: string, valuesToRemove: string[]): Promise<void> {
	for (const fieldValue of valuesToRemove) {
	    // field
	    try {
		const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
		await this.database.deleteObjectOrFail(pathInField);
	    } catch {}

	    // entry
	    try {
		const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
		await this.database.deleteObjectOrFail(pathInEntry);
	    } catch {}
	}
    }
    async addFieldValuesToEntry(entryId: string, fieldName: string, valuesToAdd: string[]): Promise<void> {
	for (const fieldValue of valuesToAdd) {
	    // field
	    try {
		const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
		await this.database.writeFileOrFail(pathInField, "");
	    } catch {}

	    // entry
	    try {
		const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
		await this.database.writeFileOrFail(pathInEntry, "");
	    } catch {}
	}
    }
}
