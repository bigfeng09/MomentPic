import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Database = InstanceType<typeof DatabaseSync>;

export const openDatabase = (dbPath: string): Database => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA temp_store = MEMORY;");
  return db;
};
