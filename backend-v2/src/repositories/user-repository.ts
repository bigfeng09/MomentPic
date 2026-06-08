import type { Database } from "../db/connection.js";
import { hashPassword, normalizeUsername } from "../lib/auth.js";
import type { UserRole } from "../types/domain.js";

export interface UserRow {
  username: string;
  password_hash: string;
  role: UserRole;
  password_reset_required: number;
  created_at: string;
  updated_at: string;
}

export interface UserDto {
  username: string;
  role: UserRole;
  passwordResetRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

const toUserDto = (row: UserRow): UserDto => ({
  username: row.username,
  role: row.role,
  passwordResetRequired: Boolean(row.password_reset_required),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class UserRepository {
  constructor(private readonly db: Database) {}

  findByUsername(username: string): UserRow | undefined {
    return this.db
      .prepare("SELECT username, password_hash, role, password_reset_required, created_at, updated_at FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;
  }

  list(): UserDto[] {
    const rows = this.db
      .prepare("SELECT username, password_hash, role, password_reset_required, created_at, updated_at FROM users ORDER BY username ASC")
      .all() as unknown as UserRow[];
    return rows.map(toUserDto);
  }

  upsert(usernameInput: unknown, password: string, roleInput: unknown): UserDto {
    const username = normalizeUsername(usernameInput);
    const role: UserRole = roleInput === "admin" ? "admin" : "user";
    if (!username || !password) throw new Error("username and password required");
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    this.db
      .prepare(
        `INSERT INTO users (username, password_hash, role, password_reset_required, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)
         ON CONFLICT(username) DO UPDATE SET
           password_hash = excluded.password_hash,
           role = excluded.role,
           password_reset_required = 0,
           updated_at = excluded.updated_at`
      )
      .run(username, passwordHash, role, now, now);
    const row = this.findByUsername(username);
    if (!row) throw new Error("user upsert failed");
    return toUserDto(row);
  }

  update(oldUsernameInput: unknown, nextUsernameInput: unknown, password: string, roleInput: unknown, adminUsername: string): UserDto {
    const oldUsername = normalizeUsername(oldUsernameInput);
    const nextUsername = normalizeUsername(nextUsernameInput ?? oldUsername);
    const role: UserRole = roleInput === "admin" ? "admin" : "user";
    if (!oldUsername || !nextUsername || !password) throw new Error("username and password required");
    if (oldUsername === adminUsername && nextUsername !== adminUsername) throw new Error("cannot rename admin");
    const existing = this.findByUsername(oldUsername);
    if (!existing) throw new Error("user not found");
    if (oldUsername !== nextUsername && this.findByUsername(nextUsername)) throw new Error("target user exists");

    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    this.db.exec("BEGIN;");
    try {
      if (oldUsername !== nextUsername) {
        this.db
          .prepare("UPDATE users SET username = ?, password_hash = ?, role = ?, password_reset_required = 0, updated_at = ? WHERE username = ?")
          .run(nextUsername, passwordHash, role, now, oldUsername);
        this.db.prepare("UPDATE shared_albums SET username = ?, updated_at = ? WHERE username = ?").run(nextUsername, now, oldUsername);
        this.db.prepare("UPDATE favorite_albums SET username = ?, updated_at = ? WHERE username = ?").run(nextUsername, now, oldUsername);
      } else {
        this.db
          .prepare("UPDATE users SET password_hash = ?, role = ?, password_reset_required = 0, updated_at = ? WHERE username = ?")
          .run(passwordHash, role, now, oldUsername);
      }
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }

    const row = this.findByUsername(nextUsername);
    if (!row) throw new Error("user update failed");
    return toUserDto(row);
  }

  delete(usernameInput: unknown, adminUsername: string): void {
    const username = normalizeUsername(usernameInput);
    if (!username) throw new Error("username required");
    if (username === adminUsername) throw new Error("cannot delete admin");
    this.db.prepare("DELETE FROM users WHERE username = ?").run(username);
  }
}
