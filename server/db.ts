import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ActivityBlock,
  InsertActivityBlock,
  InsertProfessional,
  InsertRequester,
  activityBlocks,
  activityTypes,
  professionals,
  requesters,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as mockDb from "./mock-db";

let _db: ReturnType<typeof drizzle> | null = null;
let _useMockDb = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  
  // If no database is configured, use mock database
  if (!_db && !_useMockDb) {
    console.log("[Database] Using mock in-memory database for development");
    mockDb.initMockDatabase();
    _useMockDb = true;
  }
  
  return _db;
}

function isUsingMockDb() {
  return _useMockDb || !_db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  
  // For mock database, just store in memory
  if (isUsingMockDb()) {
    // Mock implementation - just log it
    console.log("[Mock DB] Upserting user:", user.openId, user.name);
    return;
  }
  
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

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

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  if (isUsingMockDb()) {
    // Mock implementation - return a mock user
    return {
      id: 1,
      openId,
      name: "Dev User",
      email: "dev@example.com",
      loginMethod: "mock",
      role: openId.includes("admin") ? "admin" : "user",
      lastSignedIn: new Date(),
    } as any;
  }
  
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Professionals ────────────────────────────────────────────────────────────

export async function getAllProfessionals() {
  if (isUsingMockDb()) {
    return mockDb.getProfessionals().sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
  }
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionals).where(eq(professionals.active, true)).orderBy(asc(professionals.columnOrder));
}

export async function getProfessionalById(id: number) {
  if (isUsingMockDb()) {
    return mockDb.getProfessionalById(id);
  }
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
  return result[0];
}

export async function createProfessional(data: InsertProfessional) {
  if (isUsingMockDb()) {
    return mockDb.addProfessional(data);
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(professionals).values(data);
  return result;
}

export async function updateProfessional(id: number, data: Partial<InsertProfessional>) {
  if (isUsingMockDb()) {
    mockDb.updateProfessional(id, data);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(professionals).set(data).where(eq(professionals.id, id));
}

export async function deleteProfessional(id: number) {
  if (isUsingMockDb()) {
    mockDb.deleteProfessional(id);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(professionals).set({ active: false }).where(eq(professionals.id, id));
}

export async function seedProfessionals() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(professionals).limit(1);
  if (existing.length > 0) return;

  const defaultProfessionals = [
    { name: "Ana Silva",         color: "#00D9FF", group: "principal" },
    { name: "Bruno Costa",       color: "#7C3AED", group: "principal" },
    { name: "Carla Mendes",      color: "#0EA5E9", group: "principal" },
    { name: "Diego Rocha",       color: "#06B6D4", group: "principal" },
    { name: "Elena Ferreira",    color: "#A855F7", group: "principal" },
    { name: "Felipe Santos",     color: "#EC4899", group: "principal" },
    { name: "Gabriela Lima",     color: "#001F3F", group: "principal" },
    { name: "Henrique Oliveira", color: "#0369A1", group: "principal" },
    { name: "Isabela Martins",   color: "#6366F1", group: "principal" },
    { name: "João Pereira",      color: "#14B8A6", group: "principal" },
    { name: "Karen Souza",       color: "#D946EF", group: "principal" },
    { name: "Lucas Alves",       color: "#0891B2", group: "secundario" },
    { name: "Mariana Nunes",     color: "#8B5CF6", group: "secundario" },
  ];

  for (let i = 0; i < defaultProfessionals.length; i++) {
    const p = defaultProfessionals[i];
    await db.insert(professionals).values({
      name: p.name,
      columnOrder: i + 1,
      color: p.color,
      active: true,
      groupLabel: p.group,
    });
  }
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export async function getAllActivityTypes() {
  if (isUsingMockDb()) {
    return mockDb.getActivityTypes().sort((a, b) => a.name.localeCompare(b.name));
  }
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityTypes).orderBy(asc(activityTypes.name));
}

export async function seedActivityTypes() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(activityTypes).limit(1);
  if (existing.length > 0) return;

  const types = [
    { name: "Animação", color: "#00D9FF" },
    { name: "Edição", color: "#7C3AED" },
    { name: "Sonorização", color: "#0EA5E9" },
    { name: "Locução", color: "#06B6D4" },
    { name: "Tratamento de Imagens", color: "#A855F7" },
    { name: "Design", color: "#EC4899" },
    { name: "Reunião", color: "#001F3F" },
    { name: "Backup", color: "#0369A1" },
    { name: "Pesquisa", color: "#6366F1" },
    { name: "Presencial", color: "#14B8A6" },
    { name: "Almoço", color: "#D946EF" },
  ];

  for (const t of types) {
    await db.insert(activityTypes).values(t);
  }
}

// ─── Requesters ─────────────────────────────────────────────────────────────

export async function getAllRequesters() {
  if (isUsingMockDb()) {
    return mockDb.getRequesters().sort((a, b) => a.name.localeCompare(b.name));
  }
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requesters).where(eq(requesters.active, true)).orderBy(asc(requesters.name));
}

export async function createRequester(name: string) {
  if (isUsingMockDb()) {
    mockDb.addRequester({ name, active: true });
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(requesters).values({ name, active: true });
}

export async function deleteRequester(id: number) {
  if (isUsingMockDb()) {
    mockDb.deleteRequester(id);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(requesters).set({ active: false }).where(eq(requesters.id, id));
}

export async function seedRequesters() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(requesters).limit(1);
  if (existing.length > 0) return;
  const defaults = ["Bruno", "Anna", "Gabi", "Lucas", "Mirian", "Allan", "Phill"];
  for (const name of defaults) {
    await db.insert(requesters).values({ name, active: true });
  }
}

// ─── Activity Blocks ──────────────────────────────────────────────────────────

/** Calculate normal and overtime minutes.
 * Normal hours: 08:00–19:00 (up to 8h = 480 min per professional per day).
 * We simplify: normal = minutes within 10:00–19:00 window, overtime = rest.
 * Per requirements: overtime faixas are 07:00–10:00 and 19:00–23:00.
 */
export function calcDurations(startTime: string, endTime: string) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const start = toMin(startTime);
  const end = toMin(endTime);
  const total = end - start;

  // Overtime windows: 07:00–10:00 (420–600) and 19:00–23:00 (1140–1380)
  const OT1_START = 7 * 60;   // 420
  const OT1_END = 10 * 60;    // 600
  const OT2_START = 19 * 60;  // 1140
  const OT2_END = 23 * 60;    // 1380

  let overtimeMin = 0;

  // Overlap with first overtime window
  const ot1Overlap = Math.max(0, Math.min(end, OT1_END) - Math.max(start, OT1_START));
  overtimeMin += ot1Overlap;

  // Overlap with second overtime window
  const ot2Overlap = Math.max(0, Math.min(end, OT2_END) - Math.max(start, OT2_START));
  overtimeMin += ot2Overlap;

  const normalMin = total - overtimeMin;

  return {
    durationTotalMin: total,
    durationNormalMin: Math.max(0, normalMin),
    durationOvertimeMin: Math.max(0, overtimeMin),
  };
}

export async function getBlocksByDate(date: string) {
  if (isUsingMockDb()) {
    return mockDb.getBlocksByDate(date);
  }
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityBlocks)
    .where(eq(activityBlocks.date, date))
    .orderBy(asc(activityBlocks.startTime));
}

export async function getBlocksByDateAndProfessional(date: string, professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityBlocks)
    .where(and(eq(activityBlocks.date, date), eq(activityBlocks.professionalId, professionalId)))
    .orderBy(asc(activityBlocks.startTime));
}

export async function createBlock(data: InsertActivityBlock) {
  if (isUsingMockDb()) {
    const durations = calcDurations(data.startTime, data.endTime);
    return mockDb.addBlock({ ...data, ...durations });
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const durations = calcDurations(data.startTime, data.endTime);
  const result = await db.insert(activityBlocks).values({ ...data, ...durations });
  return result;
}

export async function updateBlock(id: number, data: Partial<InsertActivityBlock>) {
  const updates: Partial<InsertActivityBlock> & Record<string, unknown> = { ...data };
  if (data.startTime && data.endTime) {
    const durations = calcDurations(data.startTime, data.endTime);
    Object.assign(updates, durations);
  }
  
  if (isUsingMockDb()) {
    mockDb.updateBlock(id, updates);
    return;
  }
  
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(activityBlocks).set(updates).where(eq(activityBlocks.id, id));
}

export async function deleteBlock(id: number) {
  if (isUsingMockDb()) {
    mockDb.deleteBlock(id);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(activityBlocks).where(eq(activityBlocks.id, id));
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getMonthlyReport(year: number, month: number, professionalId?: number) {
  if (isUsingMockDb()) {
    const rows = mockDb.getMonthlyReport(year, month, professionalId);
    return rows.map(row => ({
      professionalId: row.professionalId,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      activityTypeId: row.activityTypeId,
      description: row.description,
      durationTotalMin: row.durationTotalMin,
      durationNormalMin: row.durationNormalMin,
      durationOvertimeMin: row.durationOvertimeMin,
    }));
  }
  
  const db = await getDb();
  if (!db) return [];

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const conditions = [
    gte(activityBlocks.date, startDate),
    lte(activityBlocks.date, endDate),
  ];
  if (professionalId) {
    conditions.push(eq(activityBlocks.professionalId, professionalId));
  }

  const rows = await db
    .select({
      professionalId: activityBlocks.professionalId,
      date: activityBlocks.date,
      startTime: activityBlocks.startTime,
      endTime: activityBlocks.endTime,
      activityTypeId: activityBlocks.activityTypeId,
      description: activityBlocks.description,
      durationTotalMin: activityBlocks.durationTotalMin,
      durationNormalMin: activityBlocks.durationNormalMin,
      durationOvertimeMin: activityBlocks.durationOvertimeMin,
    })
    .from(activityBlocks)
    .where(and(...conditions))
    .orderBy(asc(activityBlocks.date), asc(activityBlocks.startTime));

  return rows;
}
