import { db } from "./db";

export type Role = "user" | "contributor" | "admin";

export type User = {
  id: string;
  username: string;
  password_hash: string;
  recovery_hash: string;
  avatar_path: string | null;
  bio: string | null;
  role: Role;
  created_at: number;
};

export type PublicUser = Pick<
  User,
  "id" | "username" | "avatar_path" | "bio" | "role" | "created_at"
>;

export function getUserById(id: string): User | undefined {
  return db().prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | User
    | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  return db().prepare(`SELECT * FROM users WHERE username = ?`).get(username) as
    | User
    | undefined;
}

export function countUsers(): number {
  return (db().prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number })
    .n;
}

export function insertUser(u: User): void {
  db()
    .prepare(
      `INSERT INTO users
       (id, username, password_hash, recovery_hash, avatar_path, bio, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      u.id,
      u.username,
      u.password_hash,
      u.recovery_hash,
      u.avatar_path,
      u.bio,
      u.role,
      u.created_at,
    );
}

/**
 * Atomic: insert a user with role='admin' only if the table is empty.
 * Returns the role actually assigned. Uses a single transaction so two
 * concurrent first-user signups can't both win admin.
 */
export function insertFirstOrUserAtomic(
  u: Omit<User, "role">,
): "admin" | "user" {
  const tx = db().transaction(() => {
    const n = (db().prepare(`SELECT COUNT(*) AS n FROM users`).get() as {
      n: number;
    }).n;
    const role: Role = n === 0 ? "admin" : "user";
    db()
      .prepare(
        `INSERT INTO users
         (id, username, password_hash, recovery_hash, avatar_path, bio, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        u.id,
        u.username,
        u.password_hash,
        u.recovery_hash,
        u.avatar_path,
        u.bio,
        role,
        u.created_at,
      );
    return role;
  });
  return tx() as "admin" | "user";
}

export function updateUserAvatar(id: string, avatarPath: string | null): void {
  db().prepare(`UPDATE users SET avatar_path = ? WHERE id = ?`).run(avatarPath, id);
}

export function updateUserBio(id: string, bio: string | null): void {
  db().prepare(`UPDATE users SET bio = ? WHERE id = ?`).run(bio, id);
}

export function updateUserPassword(id: string, passwordHash: string): void {
  db()
    .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
    .run(passwordHash, id);
}

export function setUserRole(id: string, role: Role): void {
  db().prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, id);
}

export function listUsers(): PublicUser[] {
  return db()
    .prepare(
      `SELECT id, username, avatar_path, bio, role, created_at
       FROM users ORDER BY created_at DESC`,
    )
    .all() as PublicUser[];
}

export function toPublic(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username,
    avatar_path: u.avatar_path,
    bio: u.bio,
    role: u.role,
    created_at: u.created_at,
  };
}

export function listAvatarUserIds(): Set<string> {
  const rows = db()
    .prepare(
      `SELECT id FROM users WHERE avatar_path IS NOT NULL`,
    )
    .all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}
