import Fs from "fs/promises";
import Path from "path";
import Colors from "colors";
import Md5 from "md5";

export class Util {
    static getDirectoryPath(filePath: string[]): string[] {
	return [...filePath].splice(0, filePath.length - 1);
    }

    static logFileSystemActivity(message: string, detail: string): void {
	console.log(Colors.magenta(message), Colors.bold(detail));
    }
    static logEntryActivity(message: string): void {
	console.log(Colors.cyan(message));
    }
    static logEntryValueActivity(entryId: string, fieldName: string, verb: string, values: string[]): void {
	this.logEntryActivity(`${entryId}, field ${fieldName}: ${verb} ${values.length == 1 ? "value" : `${values.length} values:`} ${values.join(", ")}`)
    }
    static logSuccess(message: string, detail: string): void {
	console.log(Colors.green(message), Colors.bold(detail));
    }

    static generateValueKey(value: string): string {
	return Md5(value);
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
	const joinedPath: string = this.getFileSystemPath(directoryPath);
	Util.logFileSystemActivity("creating directory at", joinedPath);
	await Fs.mkdir(joinedPath, { recursive: true });
	Util.logSuccess("created directory at", joinedPath);
    }
    private async createParentDirectoryForFileOrFail(filePath: string[]): Promise<void> {
	const directoryPath: string[] = Util.getDirectoryPath(filePath);
	await this.createDirectoryOrFail(directoryPath);
    }
    async createBaseDirectoryOrFail(): Promise<void> {
	await this.createDirectoryOrFail([]);
    }
    async readDirectoryOrFail(directoryPath: string[]): Promise<string[]> {
	const joinedPath: string = this.getFileSystemPath(directoryPath);
	Util.logFileSystemActivity("reading directory at", joinedPath);
	const contents = await Fs.readdir(joinedPath)
	return contents.sort();
    }

    // Files
    async writeFileOrFail(filePath: string[], content: string): Promise<void> {
	await this.createParentDirectoryForFileOrFail(filePath);

	const joinedPath: string = this.getFileSystemPath(filePath);
	Util.logFileSystemActivity("writing file at", joinedPath);
	await Fs.writeFile(joinedPath, content);
	Util.logSuccess("wrote file at", joinedPath);
    }
    async readFileOrFail(filePath: string[]): Promise<string> {
	const joinedPath: string = this.getFileSystemPath(filePath);
	Util.logFileSystemActivity("reading file at", joinedPath);
	return await Fs.readFile(joinedPath, { encoding: "utf8" });
    }
    async deleteObjectOrFail(filePath: string[]): Promise<void> {
	const joinedPath: string = this.getFileSystemPath(filePath);
	Util.logFileSystemActivity("deleting object at", joinedPath);
	await Fs.rm(joinedPath, { recursive: true });
	Util.logSuccess("deleted object at", joinedPath);
    }
}

export class Table<F extends string> {
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
    private getPathForField(fieldName: F): string[] {
	return [...this.fieldContainerPath, fieldName];
    }
    private getValuePathForField(fieldName: F, fieldValue: string): string[] {
	const fieldPath: string[] = this.getPathForField(fieldName);
	const valueKey: string = Util.generateValueKey(fieldValue);
	return [...fieldPath, valueKey];
    }
    private getEntryPathForFieldValue(fieldName: F, fieldValue: string, entryId: string): string[] {
	const fieldValuePath: string[] = this.getValuePathForField(fieldName, fieldValue);
	return [...fieldValuePath, entryId];
    }

    // entries
    private getPathForEntry(entryId: string): string[] {
	return [...this.entryContainerPath, entryId];
    }
    private getFieldPathForEntry(entryId: string, fieldName: F): string[] {
	const entryPath: string[] = this.getPathForEntry(entryId);
	return [...entryPath, fieldName];
    }
    private getFieldValuePathForEntry(entryId: string, fieldName: F, fieldValue: string): string[] {
	const fieldPath: string[] = this.getFieldPathForEntry(entryId, fieldName);
	const valueKey: string = Util.generateValueKey(fieldValue);
	return [...fieldPath, valueKey];
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
    async getEntriesByFieldValue(fieldName: F, possibleFieldValues: string[]): Promise<string[]> {
	const allMatchingEntryIds = [] as string[];
	for (const possibleValue of possibleFieldValues) {
	    try {
		const valuePath: string[] = this.getValuePathForField(fieldName, possibleValue);
		const matchingEntryIds: string[] = await this.database.readDirectoryOrFail(valuePath);
		allMatchingEntryIds.push(...matchingEntryIds);
	    } catch {}
	}
	return allMatchingEntryIds.sort();
    }

    async getFieldsOfEntry(entryId: string): Promise<string[]> {
	try {
	    const entryPath: string[] = this.getPathForEntry(entryId);
	    return await this.database.readDirectoryOrFail(entryPath);
	} catch {
	    return [];
	}
    }
    async getValuesForField(entryId: string, fieldName: F): Promise<string[]> {
	try {
	    const directoryPath: string[] = this.getFieldPathForEntry(entryId, fieldName);
	    const valueKeys: string[] = await this.database.readDirectoryOrFail(directoryPath);
	    const values = [] as string[];

	    for (const key of valueKeys) {
		try {
		    const valuePath: string[] = [...directoryPath, key];
		    const value: string = await this.database.readFileOrFail(valuePath);
		    values.push(value);
		} catch {}
	    }

	    return values.sort();
	} catch {
	    return [];
	}
    }

    // edit
    async removeEntry(entryId: string): Promise<void> {
	Util.logEntryActivity(`removing entry ${entryId}`);

	// delete from fields
	try {
	    const fields: string[] = await this.getFieldsOfEntry(entryId);
	    for (const fieldName of fields) {
		await this.clearFieldValuesForEntry(entryId, fieldName as any);
	    }
	} catch {}

	// delete entry
	try {
	    const entryPath: string[] = this.getPathForEntry(entryId);
	    await this.database.deleteObjectOrFail(entryPath);
	} catch {}
    }
    async clearFieldValuesForEntry(entryId: string, fieldName: F): Promise<void> {
	const fieldValues: string[] = await this.getValuesForField(entryId, fieldName);
	await this.removeFieldValuesFromEntry(entryId, fieldName, fieldValues);
    }
    async removeFieldValuesFromEntry(entryId: string, fieldName: F, valuesToRemove: string[]): Promise<void> {
	Util.logEntryValueActivity(entryId, fieldName, "removing", valuesToRemove);
	for (const fieldValue of valuesToRemove) {
	    // field
	    try {
		const pathInField: string[] = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
		await this.database.deleteObjectOrFail(pathInField);
	    } catch {}

	    // entry
	    try {
		const pathInEntry: string[] = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
		await this.database.deleteObjectOrFail(pathInEntry);
	    } catch {}
	}
    }
    async addFieldValuesToEntry(entryId: string, fieldName: F, valuesToAdd: string[]): Promise<void> {
	Util.logEntryValueActivity(entryId, fieldName, "adding", valuesToAdd);
	for (const fieldValue of valuesToAdd) {
	    // field
	    try {
		const pathInField: string[] = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
		await this.database.writeFileOrFail(pathInField, "");
	    } catch {}

	    // entry
	    try {
		const pathInEntry: string[] = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
		await this.database.writeFileOrFail(pathInEntry, fieldValue);
	    } catch {}
	}
    }
    async setFieldValuesForEntry(entryId: string, fieldName: F, newFieldValues: string[]): Promise<void> {
	await this.clearFieldValuesForEntry(entryId, fieldName);
	await this.addFieldValuesToEntry(entryId, fieldName, newFieldValues);
    }
}
