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

export class GenericTable<E extends GenericEntry> {
    name: string;
    database: Database;

    constructor(name: string, database: Database) {}

    async addField(fieldName: string): Promise<void> {}

    async loadAll(): Promise<E> {}
    async loadById(entryId: string): Promise<E> {}
    async loadByFieldValue(fieldName: string, possibleFieldValues: string[]): Promise<E[]> {}

    async updateEntry(entryId: string, fieldValues: [string, string]): Promise<void> {}
    async removeEntry(): Promise<void> {}
}

export type GenericEntry = {[key: string]: string|string[]}
