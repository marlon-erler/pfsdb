import Fs from "fs/promises";
import Path from "path";

export class Util {
    static getDirectoryPath(filePath: string[]): string[] {
	return [...filePath].splice(0, filePath.length - 1);
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

    // Uirectories
    private async createDirectoryOrFail(directoryPath: string[]): Promise<void> {
	const joinedPath = this.getFileSystemPath(directoryPath);
	await Fs.mkdir(joinedPath, { recursive: true });
    }
    private async createParentDirectoryForFileOrFail(filePath: string[]): Promise<void> {
	const directoryPath = Util.getDirectoryPath(filePath);
	this.createDirectoryOrFail(directoryPath);
    }
    async createBaseDirectoryOrFail(): Promise<void> {
	await this.createDirectoryOrFail([]);
    }

    // Files
    async writeFileOrFail(filePath: string[], content: string): Promise<void> {
	this.createParentDirectoryForFileOrFail(filePath);
	
	const joinedPath = this.getFileSystemPath(filePath);
	await Fs.writeFile(joinedPath, content);
    }
    async readFileOrFail(filePath: string[]): Promise<string> {
	const joinedPath = this.getFileSystemPath(filePath);
	return await Fs.readFile(joinedPath, { encoding: "utf8" });
    }
    async deleteObjectOrFail(filePath: string[]): Promise<void> {
	const joinedPath = this.getFileSystemPath(filePath);
	await Fs.rm(joinedPath, { recursive: true });
    }
    async readDirectoryOrFail(directoryPath: string[]): Promise<string[]> {
	await this.createDirectoryOrFail(directoryPath);

	const joinedPath = this.getFileSystemPath(directoryPath);
	return await Fs.readdir(joinedPath);
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
	return await this.database.readDirectoryOrFail(this.entryContainerPath);
    }
    async getEntriesByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<string[]> {
	const allMatchingEntryIds = [] as string[];
	for (const possibleValue of possibleFieldValues) {
	    const valuePath = this.getValuePathForField(fieldName, possibleValue);
	    const matchingEntryIds = await this.database.readDirectoryOrFail(valuePath);
	    allMatchingEntryIds.push(...matchingEntryIds);
	}
	return allMatchingEntryIds;
    }

    async getFieldsOfEntry(entryId: string): Promise<string[]> {
	return await this.database.readDirectoryOrFail(this.getPathForEntry(entryId));
    }
    async getValuesForField(entryId: string, fieldName: string): Promise<string[]> {
	const directoryPath = this.getFieldPathForEntry(entryId, fieldName);
	return await this.database.readDirectoryOrFail(directoryPath);
    }

    // edit
    async removeEntry(entryId: string): Promise<void> {
	// delete from fields
	const fields = await this.getFieldsOfEntry(entryId);
	for (const fieldName of fields) {
	    this.clearFieldValuesForEntry(entryId, fieldName);
	}

	// delete entry
	const entryPath = this.getPathForEntry(entryId);
	this.database.deleteObjectOrFail(entryPath);
    }
    async clearFieldValuesForEntry(entryId: string, fieldName: string): Promise<void> {
	const fieldValues = await this.getValuesForField(entryId, fieldName);
	this.removeFieldValuesFromEntry(entryId, fieldName, fieldValues);
    }
    async removeFieldValuesFromEntry(entryId: string, fieldName: string, valuesToRemove: string[]): Promise<void> {
	for (const fieldValue of valuesToRemove) {
	    // field
	    const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
	    this.database.deleteObjectOrFail(pathInField);

	    // entry
	    const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
	    this.database.deleteObjectOrFail(pathInEntry);
	}
    }
    async addFieldValuesToEntry(entryId: string, fieldName: string, valuesToAdd: string[]): Promise<void> {
	for (const fieldValue of valuesToAdd) {
	    // field
	    const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
	    this.database.writeFileOrFail(pathInField, "");

	    // entry
	    const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
	    this.database.writeFileOrFail(pathInEntry, "");
	}
    }
}
