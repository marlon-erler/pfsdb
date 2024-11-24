export class Util {
  static getDirectoryPath(filePath) {
  }
}
export class Database {
  basePath;
  constructor(basePath) {
  }
  ensureDirectory(directoryPath) {
  }
  ensureBaseDirectory() {
  }
  async writeFile(filePath, content) {
  }
  async readFile(filePath) {
  }
  async deleteFile(filePath) {
  }
  async listFiles(directoryPath) {
  }
}
export class Table {
  name;
  database;
  constructor(name, database) {
  }
  async addEntryToFieldValue(fieldName, fieldValue, entryId) {
  }
  async removeEntryFromFieldValue(fieldName, oldFieldValue, entryId) {
  }
  async replaceFieldValueForEntry(fieldName, oldFieldValue, newFieldValue, entryId) {
  }
  async loadAllEntries() {
  }
  async loadEntryById(entryId) {
  }
  async loadEntriesByFieldValue(fieldName, possibleFieldValues) {
  }
  async removeEntry() {
  }
  async clearFieldValuesForEntry(entryId, fieldName) {
  }
  async removeFieldValuesFromEntry(entryId, fieldName, valuesToRemove) {
  }
  async addFieldValuesToEntry(entryId, fieldName, valuesToAdd) {
  }
}
export class Entry {
  id;
  table;
  constructor(table) {
  }
  async getFieldValues(fieldName) {
  }
}
