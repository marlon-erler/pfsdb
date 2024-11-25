import Fs from "fs/promises";
import Path from "path";

export class Util {
    static getDirectoryPath(filePath: string[]): string[] {}
}

export class Database {
    basePath: string;

    constructor(basePath: string) {
	this.basePath = basePath;
    }

    joinPath(path: string[]): string {
	return Path.join(this.basePath, ...path);
    }

    async createDirectoryOrFail(directoryPath: string[]): Promise<void> {
	const joinedPath = this.joinPath(directoryPath);
	await Fs.mkdir(joinedPath, { recursive: true });
    }
    async createBaseDirectoryOrFail(): Promise<void> {
	await this.createDirectoryOrFail([]);
    }
    async createDirectoryForFileOrFail(filePath: string[]): Promise<void> {
	const directoryPath = Util.getDirectoryPath(filePath);
	this.createDirectoryOrFail(directoryPath);
    }

    async writeFileOrFail(filePath: string[], content: string): Promise<void> {
	this.createDirectoryForFileOrFail(filePath);
	
	const joinedPath = this.joinPath(filePath);
	await Fs.writeFile(joinedPath, content);
    }
    async readFileOrFail(filePath: string[]): Promise<string> {
	const joinedPath = this.joinPath(filePath);
	return await Fs.readFile(joinedPath, { encoding: "utf8" });
    }
    async deleteFileOrFail(filePath: string[]): Promise<void> {
	const joinedPath = this.joinPath(filePath);
	await Fs.rm(joinedPath);
    }
    async readDirectoryOrFail(directoryPath: string[]): Promise<string[]> {
	const joinedPath = this.joinPath(directoryPath);
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

    get basePath(): string[] {
	return [this.name];
    }
    get fieldContainerPath(): string[] {
	return [...this.basePath, "fields"];
    }
    get entryContainerPath(): string[] {
	return [...this.basePath, "entries"];
    }

    getFieldPath(fieldName: string): string[] {
	return [...this.fieldContainerPath, fieldName];
    }
    getValuePathForField(fieldName: string, fieldValue: string): string[] {
	const fieldPath = this.getFieldPath(fieldName);
	return [...fieldPath, fieldValue];
    }
    getEntryPathForFieldValue(fieldName: string, fieldValue: string, entryId: string): string[] {
	const fieldValuePath = this.getValuePathForField(fieldName, fieldValue);
	return [...fieldValuePath, entryId];
    }

    getEntryPath(entryId: string): string[] {
	return [...this.entryContainerPath, entryId];
    }
    getFieldPathForEntry(entryId: string, fieldName: string): string[] {
	const entryPath = this.getEntryPath(entryId);
	return [...entryPath, fieldName];
    }
    getFieldValuePathForEntry(entryId: string, fieldName: string, fieldValue: string): string[] {
	const fieldPath = this.getFieldPathForEntry(entryId, fieldName);
	return [...fieldPath, fieldValue];
    }

    async addEntryToFieldValue(fieldName: string, fieldValue: string, entryId: string): Promise<void> {
	const targetPath = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
	this.database.writeFileOrFail(targetPath, "");
    }
    async removeEntryFromFieldValue(fieldName: string, oldFieldValue: string, entryId: string): Promise<void> {
	const targetPath = this.getEntryPathForFieldValue(fieldName, oldFieldValue, entryId);
	this.database.deleteFileOrFail(targetPath);
    }
    async replaceFieldValueForEntry(fieldName: string, oldFieldValue: string, newFieldValue: string, entryId: string): Promise<void> {
	this.removeEntryFromFieldValue(fieldName, oldFieldValue, entryId);
	this.addEntryToFieldValue(fieldName, newFieldValue, entryId);
    }

    async loadAllEntries(): Promise<Entry[]> {
	const entryIds = await this.database.readDirectoryOrFail(this.entryContainerPath);
	return entryIds.map(id => new Entry(id, this));
    }
    async loadEntryById(entryId: string): Promise<Entry> {
	return new Entry(entryId, this);
    }
    async loadEntriesByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<Entry[]> {
	const allMatchingEntryIds = [] as string[];
	for (const possibleValue of possibleFieldValues) {
	    const valuePath = this.getValuePathForField(fieldName, possibleValue);
	    const matchingEntryIds = await this.database.readDirectoryOrFail(valuePath);
	    allMatchingEntryIds.push(...matchingEntryIds);
	}
	return allMatchingEntryIds.map(id => new Entry(id, this));
    }

    async removeEntry(entry: Entry): Promise<void> {
	// delete from fields
	const fields = await entry.getFields();
	for (const fieldName of fields) {
	    this.clearFieldValuesForEntry(entry, fieldName);
	}

	// delete entry
	this.database.deleteFileOrFail(entry.path);
    }
    async clearFieldValuesForEntry(entry: Entry, fieldName: string): Promise<void> {
	const fieldValues = await entry.getFieldValues(fieldName);
	for (const fieldValue of fieldValues) {
	    this.removeEntryFromFieldValue(fieldName, fieldValue, entry.id);
	}
    }
    async removeFieldValuesFromEntry(entryId: string, fieldName: string, valuesToRemove: string[]): Promise<void> {
	for (const fieldValue of valuesToRemove) {
	    const valuePath = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
	    this.database.deleteFileOrFail(valuePath);
	}
    }
    async addFieldValuesToEntry(entryId: string, fieldName: string, valuesToAdd: string[]): Promise<void> {
	for (const fieldValue of valuesToAdd) {
	    const valuePath = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
	    this.database.writeFileOrFail(valuePath, "");
	}
    }
}

export class Entry {
    id: string;
    table: Table;

    constructor(id: string, table: Table) {
	this.id = id;
	this.table = table;
    }

    get path(): string[] {
	return this.table.getEntryPath(this.id);
    }
    get database(): Database {
	return this.table.database;
    }

    async getFields(): Promise<string[]> {
	return await this.database.readDirectoryOrFail(this.path);
    }
    async getFieldValues(fieldName: string): Promise<string[]> {
	const directoryPath = this.table.getFieldPathForEntry(this.id, fieldName);
	return await this.database.readDirectoryOrFail(directoryPath);
    }
}
