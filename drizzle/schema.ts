import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Professionals table
export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  columnOrder: int("column_order").notNull().default(0),
  color: varchar("color", { length: 32 }).default("#6366f1"),
  active: boolean("active").default(true).notNull(),
  groupLabel: varchar("group_label", { length: 64 }).default("principal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

// Activity types (fixed list with colors)
export const activityTypes = mysqlTable("activity_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  color: varchar("color", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityType = typeof activityTypes.$inferSelect;
export type InsertActivityType = typeof activityTypes.$inferInsert;

// Requesters (solicitantes) — manageable list
export const requesters = mysqlTable("requesters", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Requester = typeof requesters.$inferSelect;
export type InsertRequester = typeof requesters.$inferInsert;

// Activity blocks (the main schedule entries)
export const activityBlocks = mysqlTable(
  "activity_blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    professionalId: int("professional_id").notNull(),
    activityTypeId: int("activity_type_id"),
    requesterId: int("requester_id"),
    jobNumber: varchar("job_number", { length: 64 }),
    jobName: varchar("job_name", { length: 256 }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    startTime: varchar("start_time", { length: 8 }).notNull(), // "HH:MM"
    endTime: varchar("end_time", { length: 8 }).notNull(),     // "HH:MM"
    description: text("description"),
    color: varchar("color", { length: 32 }),
    durationTotalMin: int("duration_total_min").notNull().default(0),
    durationNormalMin: int("duration_normal_min").notNull().default(0),
    durationOvertimeMin: int("duration_overtime_min").notNull().default(0),
    createdBy: int("created_by"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    dateIdx: index("idx_date").on(table.date),
    professionalDateIdx: index("idx_professional_date").on(table.professionalId, table.date),
  })
);

export type ActivityBlock = typeof activityBlocks.$inferSelect;
export type InsertActivityBlock = typeof activityBlocks.$inferInsert;
