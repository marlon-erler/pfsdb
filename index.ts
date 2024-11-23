import Fs from "fs/promises";
import Path from "path";

export class Util {
    static getDirectoryPath(filePath: string[]): string[] {}
}

export class Database {
    basePath: string;

    constructor(basePath: string) {
    }

    private ensureDirectory(directoryPath: string[]): void {}
    private ensureBaseDirectory(): void {}

    async writeFile(filePath: string[], content: string): Promise<void> {}
    async readFile(filePath: string[]): Promise<string> {}
    async deleteFile(filePath: string[]): Promise<void> {}
    async listFiles(directoryPath: string[]): Promise<string[]> {}
}

export class Table {
    name: string;
    database: Database;

    constructor(name: string, database: Database) {}

    private async addEntryToField(fieldName: string, fieldValue: string, entryId: string): Promise<void> {}
    private async removeEntryFromFieldValue(fieldName: string, oldFieldValue: string, entryId: string): Promise<void> {}
    private async updateFieldForEntry(fieldName: string, oldFieldValue: string, newFieldValue: string, entryId: string): Promise<void> {}

    async loadAll(): Promise<Entry[]> {}
    async loadById(entryId: string): Promise<Entry> {}
    async loadByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<Entry[]> {}

    async removeEntry(): Promise<void> {}
    async removeFieldValuesFromEntry(entryId: string, fieldName: string, fieldValuesToRemove: string[]): Promise<void> {}
    async clearFieldValuesForEntry(entryId: string, fieldName: string): Promise<void> {}
    async addFieldValueToEntry(entryId: string, fieldName: string, fieldValuesToAdd: string[]): Promise<void> {}
    async replaceFieldValuesForEntry(entryId: string, fieldName: string, newFieldValues: string[]): Promise<void> {}
}

export class Entry {
    id: string;
    table: Table;

    constructor(table: Table) {}

    async getFieldValues(fieldName: string): Promise<string[]> {}
}
