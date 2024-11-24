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

    private joinPath(path: string[]): string {
	return Path.join(this.basePath, ...path);
    }
    private async createDirectoryOrFail(directoryPath: string[]): Promise<void> {
	const joinedPath = this.joinPath(directoryPath);
	await Fs.mkdir(joinedPath, { recursive: true });
    }
    private async createBaseDirectoryOrFail(): Promise<void> {
	await this.createDirectoryOrFail([]);
    }
    private async createDirectoryForFileOrFail(filePath: string[]): Promise<void> {
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
    async listFilesOrFail(directoryPath: string[]): Promise<string[]> {
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

    private getFieldPath(fieldName: string): string[] {
	return [...this.basePath, "fields", fieldName];
    }
    private getFieldValuePath(fieldName: string, fieldValue: string): string[] {
	const fieldPath = this.getFieldPath(fieldName);
	return [...fieldPath, fieldValue];
    }
    private getFieldValuePathForEntry(fieldName: string, fieldValue: string, entryId: string): string[] {
	const fieldValuePath = this.getFieldValuePath(fieldName, fieldValue);
	return [...fieldValuePath, entryId];
    }

    private getEntryPath(entryId: string): string[] {
	return [...this.basePath, "entries", entryId];
    }
    private getEntryFieldPath(entryId: string, fieldName: string): string[] {
	const entryPath = this.getEntryPath(entryId);
	return [...entryPath, fieldName];
    }

    private async addEntryToFieldValue(fieldName: string, fieldValue: string, entryId: string): Promise<void> {
	const targetPath = this.getFieldValuePathForEntry(fieldName, fieldValue, entryId);
	this.database.writeFileOrFail(targetPath, "");
    }
    private async removeEntryFromFieldValue(fieldName: string, oldFieldValue: string, entryId: string): Promise<void> {
	const targetPath = this.getFieldValuePathForEntry(fieldName, fieldValue, entryId);
	this.database.deleteFileOrFail(targetPath);
    }
    private async replaceFieldValueForEntry(fieldName: string, oldFieldValue: string, newFieldValue: string, entryId: string): Promise<void> {
	this.removeEntryFromFieldValue(fieldName, oldFieldValue, entryId);
	this.addEntryToFieldValue(fieldName, newFieldValue, entryId);
    }

    async loadAllEntries(): Promise<Entry[]> {}
    async loadEntryById(entryId: string): Promise<Entry> {}
    async loadEntriesByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<Entry[]> {}

    async removeEntry(): Promise<void> {}
    async clearFieldValuesForEntry(entryId: string, fieldName: string): Promise<void> {}
    async removeFieldValuesFromEntry(entryId: string, fieldName: string, valuesToRemove: string[]): Promise<void> {}
    async addFieldValuesToEntry(entryId: string, fieldName: string, valuesToAdd: string[]): Promise<void> {}
}

export class Entry {
    id: string;
    table: Table;

    constructor(table: Table) {}

    async getFieldValues(fieldName: string): Promise<string[]> {}
}
