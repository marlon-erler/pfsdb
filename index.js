import Fs from "fs/promises";
import Path from "path";
import Colors from "colors";
import Md5 from "md5";
export class Util {
  static getDirectoryPath(filePath) {
    return [...filePath].splice(0, filePath.length - 1);
  }
  static logFileSystemActivity(message, detail) {
    console.log(Colors.magenta(message), Colors.bold(detail));
  }
  static logEntryActivity(message) {
    console.log(Colors.cyan(message));
  }
  static logEntryValueActivity(entryId, fieldName, verb, values) {
    this.logEntryActivity(`${entryId}, field ${fieldName}: ${verb} ${values.length == 1 ? "value" : `${values.length} values:`} ${values.join(", ")}`);
  }
  static logSuccess(message, detail) {
    console.log(Colors.green(message), Colors.bold(detail));
  }
  static generateValueKey(value) {
    return Md5(value);
  }
}
export class Database {
  basePath;
  constructor(basePath) {
    this.basePath = basePath;
  }
  // Paths
  getFileSystemPath(path) {
    return Path.join(this.basePath, ...path);
  }
  // Directories
  async createDirectoryOrFail(directoryPath) {
    const joinedPath = this.getFileSystemPath(directoryPath);
    Util.logFileSystemActivity("creating directory at", joinedPath);
    await Fs.mkdir(joinedPath, { recursive: true });
    Util.logSuccess("created directory at", joinedPath);
  }
  async createParentDirectoryForFileOrFail(filePath) {
    const directoryPath = Util.getDirectoryPath(filePath);
    await this.createDirectoryOrFail(directoryPath);
  }
  async createBaseDirectoryOrFail() {
    await this.createDirectoryOrFail([]);
  }
  async readDirectoryOrFail(directoryPath) {
    const joinedPath = this.getFileSystemPath(directoryPath);
    Util.logFileSystemActivity("reading directory at", joinedPath);
    return await Fs.readdir(joinedPath);
  }
  // Files
  async writeFileOrFail(filePath, content) {
    await this.createParentDirectoryForFileOrFail(filePath);
    const joinedPath = this.getFileSystemPath(filePath);
    Util.logFileSystemActivity("writing file at", joinedPath);
    await Fs.writeFile(joinedPath, content);
    Util.logSuccess("wrote file at", joinedPath);
  }
  async readFileOrFail(filePath) {
    const joinedPath = this.getFileSystemPath(filePath);
    Util.logFileSystemActivity("reading file at", joinedPath);
    return await Fs.readFile(joinedPath, { encoding: "utf8" });
  }
  async deleteObjectOrFail(filePath) {
    const joinedPath = this.getFileSystemPath(filePath);
    Util.logFileSystemActivity("deleting object at", joinedPath);
    await Fs.rm(joinedPath, { recursive: true });
    Util.logSuccess("deleted object at", joinedPath);
  }
}
export class Table {
  name;
  database;
  constructor(name, database) {
    this.name = name;
    this.database = database;
  }
  // Paths
  get basePath() {
    return [this.name];
  }
  get fieldContainerPath() {
    return [...this.basePath, "fields"];
  }
  get entryContainerPath() {
    return [...this.basePath, "entries"];
  }
  // fields
  getPathForField(fieldName) {
    return [...this.fieldContainerPath, fieldName];
  }
  getValuePathForField(fieldName, fieldValue) {
    const fieldPath = this.getPathForField(fieldName);
    const valueKey = Util.generateValueKey(fieldValue);
    return [...fieldPath, valueKey];
  }
  getEntryPathForFieldValue(fieldName, fieldValue, entryId) {
    const fieldValuePath = this.getValuePathForField(fieldName, fieldValue);
    return [...fieldValuePath, entryId];
  }
  // entries
  getPathForEntry(entryId) {
    return [...this.entryContainerPath, entryId];
  }
  getFieldPathForEntry(entryId, fieldName) {
    const entryPath = this.getPathForEntry(entryId);
    return [...entryPath, fieldName];
  }
  getFieldValuePathForEntry(entryId, fieldName, fieldValue) {
    const fieldPath = this.getFieldPathForEntry(entryId, fieldName);
    const valueKey = Util.generateValueKey(fieldValue);
    return [...fieldPath, valueKey];
  }
  // Entries
  // load
  async getAllEntries() {
    try {
      return await this.database.readDirectoryOrFail(this.entryContainerPath);
    } catch {
      return [];
    }
  }
  async getEntriesByFieldValue(fieldName, possibleFieldValues) {
    const allMatchingEntryIds = [];
    for (const possibleValue of possibleFieldValues) {
      try {
        const valuePath = this.getValuePathForField(fieldName, possibleValue);
        const matchingEntryIds = await this.database.readDirectoryOrFail(valuePath);
        allMatchingEntryIds.push(...matchingEntryIds);
      } catch {
      }
    }
    return allMatchingEntryIds;
  }
  async getFieldsOfEntry(entryId) {
    try {
      const entryPath = this.getPathForEntry(entryId);
      const unsortedFields = await this.database.readDirectoryOrFail(entryPath);
      return unsortedFields.sort();
    } catch {
      return [];
    }
  }
  async getValuesForField(entryId, fieldName) {
    try {
      const directoryPath = this.getFieldPathForEntry(entryId, fieldName);
      const valueKeys = await this.database.readDirectoryOrFail(directoryPath);
      const values = [];
      for (const key of valueKeys) {
        try {
          const valuePath = [...directoryPath, key];
          const value = await this.database.readFileOrFail(valuePath);
          values.push(value);
        } catch {
        }
      }
      return values.sort();
    } catch {
      return [];
    }
  }
  // edit
  async removeEntry(entryId) {
    Util.logEntryActivity(`removing entry ${entryId}`);
    try {
      const fields = await this.getFieldsOfEntry(entryId);
      for (const fieldName of fields) {
        await this.clearFieldValuesForEntry(entryId, fieldName);
      }
    } catch {
    }
    try {
      const entryPath = this.getPathForEntry(entryId);
      await this.database.deleteObjectOrFail(entryPath);
    } catch {
    }
  }
  async clearFieldValuesForEntry(entryId, fieldName) {
    const fieldValues = await this.getValuesForField(entryId, fieldName);
    await this.removeFieldValuesFromEntry(entryId, fieldName, fieldValues);
  }
  async removeFieldValuesFromEntry(entryId, fieldName, valuesToRemove) {
    Util.logEntryValueActivity(entryId, fieldName, "removing", valuesToRemove);
    for (const fieldValue of valuesToRemove) {
      try {
        const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
        await this.database.deleteObjectOrFail(pathInField);
      } catch {
      }
      try {
        const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
        await this.database.deleteObjectOrFail(pathInEntry);
      } catch {
      }
    }
  }
  async addFieldValuesToEntry(entryId, fieldName, valuesToAdd) {
    Util.logEntryValueActivity(entryId, fieldName, "adding", valuesToAdd);
    for (const fieldValue of valuesToAdd) {
      try {
        const pathInField = this.getEntryPathForFieldValue(fieldName, fieldValue, entryId);
        await this.database.writeFileOrFail(pathInField, "");
      } catch {
      }
      try {
        const pathInEntry = this.getFieldValuePathForEntry(entryId, fieldName, fieldValue);
        await this.database.writeFileOrFail(pathInEntry, fieldValue);
      } catch {
      }
    }
  }
  async setFieldValuesForEntry(entryId, fieldName, newFieldValues) {
    this.clearFieldValuesForEntry(entryId, fieldName);
    this.addFieldValuesToEntry(entryId, fieldName, newFieldValues);
  }
}
