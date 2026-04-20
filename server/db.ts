import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { int, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import {
  InsertUser,
  users,
  userProfiles,
  InsertUserProfile,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

const passwordRecoveriesTable = mysqlTable("passwordRecoveries", {
  id: int("id").autoincrement().primaryKey(),
  contactMethod: mysqlEnum("contactMethod", ["phone", "email"]).notNull(),
  contact: varchar("contact", { length: 255 }).notNull(),
  temporaryPassword: varchar("temporaryPassword", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

let _db: ReturnType<typeof drizzle> | null = null;
let passwordRecoveryTableReady = false;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function ensurePasswordRecoveriesTable() {
  const db = await getDb();
  if (!db) {
    return null;
  }

  if (!passwordRecoveryTableReady) {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS passwordRecoveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contactMethod ENUM('phone', 'email') NOT NULL,
        contact VARCHAR(255) NOT NULL,
        temporaryPassword VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX passwordRecoveries_contact_idx (contactMethod, contact)
      )
    `);
    passwordRecoveryTableReady = true;
  }

  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user profile: database not available");
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(userProfiles).values(profile);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create user profile:", error);
    throw error;
  }
}

export async function getUserProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user profile: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user profile:", error);
    throw error;
  }
}

export async function saveTemporaryRecoveryPassword(args: {
  contactMethod: "phone" | "email";
  contact: string;
  temporaryPassword: string;
}) {
  const db = await ensurePasswordRecoveriesTable();
  if (!db) {
    console.warn("[Database] Cannot save password recovery: database not available");
    return null;
  }

  const normalizedContact = args.contact.trim().toLowerCase();

  try {
    const existing = await db
      .select()
      .from(passwordRecoveriesTable)
      .where(
        and(
          eq(passwordRecoveriesTable.contactMethod, args.contactMethod),
          eq(passwordRecoveriesTable.contact, normalizedContact)
        )
      )
      .orderBy(desc(passwordRecoveriesTable.updatedAt))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(passwordRecoveriesTable)
        .set({
          temporaryPassword: args.temporaryPassword,
          updatedAt: new Date(),
        })
        .where(eq(passwordRecoveriesTable.id, existing[0].id));
    } else {
      await db.insert(passwordRecoveriesTable).values({
        contactMethod: args.contactMethod,
        contact: normalizedContact,
        temporaryPassword: args.temporaryPassword,
      });
    }

    return args.temporaryPassword;
  } catch (error) {
    console.error("[Database] Failed to save password recovery:", error);
    throw error;
  }
}

export async function getTemporaryRecoveryPassword(contactMethod: "phone" | "email", contact: string) {
  const db = await ensurePasswordRecoveriesTable();
  if (!db) {
    console.warn("[Database] Cannot get password recovery: database not available");
    return null;
  }

  try {
    const rows = await db
      .select()
      .from(passwordRecoveriesTable)
      .where(
        and(
          eq(passwordRecoveriesTable.contactMethod, contactMethod),
          eq(passwordRecoveriesTable.contact, contact.trim().toLowerCase())
        )
      )
      .orderBy(desc(passwordRecoveriesTable.updatedAt))
      .limit(1);

    return rows[0]?.temporaryPassword ?? null;
  } catch (error) {
    console.error("[Database] Failed to get password recovery:", error);
    throw error;
  }
}
