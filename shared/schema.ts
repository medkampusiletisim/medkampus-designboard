import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  date,
  decimal,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// System settings table - stores global configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachMonthlyFee: decimal("coach_monthly_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("1100.00"),
  globalPaymentDay: integer("global_payment_day").notNull().default(28),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coaches table
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  university: varchar("university", { length: 255 }),
  field: varchar("field", { length: 255 }),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  coachId: varchar("coach_id")
    .references(() => coaches.id)
    .notNull(),
  packageMonths: integer("package_months").notNull(), // 1-6 months
  packageStartDate: date("package_start_date").notNull(),
  packageEndDate: date("package_end_date").notNull(), // Auto-calculated
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coach transfers table - tracks when students change coaches
export const coachTransfers = pgTable("coach_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .references(() => students.id)
    .notNull(),
  oldCoachId: varchar("old_coach_id")
    .references(() => coaches.id)
    .notNull(),
  newCoachId: varchar("new_coach_id")
    .references(() => coaches.id)
    .notNull(),
  transferDate: date("transfer_date").notNull(), // When the transfer happened
  notes: text("notes"), // Optional notes about the transfer
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment records table - stores historical coach payments
export const paymentRecords = pgTable("payment_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id")
    .references(() => coaches.id)
    .notNull(),
  paymentDate: date("payment_date").notNull(), // The global payment day when this was calculated
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  studentCount: integer("student_count").notNull(),
  breakdown: jsonb("breakdown").notNull(), // Array of {studentId, studentName, amount, daysWorked}
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid
  paidAt: timestamp("paid_at"), // When the payment was marked as completed
  paidBy: varchar("paid_by", { length: 255 }), // Who marked it as paid (for future use)
  notes: text("notes"), // Optional payment notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const coachesRelations = relations(coaches, ({ many }) => ({
  students: many(students),
  paymentRecords: many(paymentRecords),
  transfersFrom: many(coachTransfers, { relationName: "oldCoach" }),
  transfersTo: many(coachTransfers, { relationName: "newCoach" }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [students.coachId],
    references: [coaches.id],
  }),
  coachTransfers: many(coachTransfers),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  coach: one(coaches, {
    fields: [paymentRecords.coachId],
    references: [coaches.id],
  }),
}));

export const coachTransfersRelations = relations(coachTransfers, ({ one }) => ({
  student: one(students, {
    fields: [coachTransfers.studentId],
    references: [students.id],
  }),
  oldCoach: one(coaches, {
    fields: [coachTransfers.oldCoachId],
    references: [coaches.id],
    relationName: "oldCoach",
  }),
  newCoach: one(coaches, {
    fields: [coachTransfers.newCoachId],
    references: [coaches.id],
    relationName: "newCoach",
  }),
}));

// Zod schemas for validation
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCoachSchema = createInsertSchema(coaches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSchema = createInsertSchema(students)
  .omit({
    id: true,
    packageEndDate: true, // Auto-calculated
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    packageStartDate: z.string(), // Will be date string from frontend
  });

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
});

export const insertCoachTransferSchema = createInsertSchema(coachTransfers).omit({
  id: true,
  createdAt: true,
}).extend({
  transferDate: z.string(), // Will be date string from frontend
});

// TypeScript types
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;

export type CoachTransfer = typeof coachTransfers.$inferSelect;
export type InsertCoachTransfer = z.infer<typeof insertCoachTransferSchema>;

// Additional types for frontend use
export type StudentWithCoach = Student & {
  coach: Coach;
};

export type CoachWithStudents = Coach & {
  students: Student[];
};

export type PaymentBreakdownItem = {
  studentId: string;
  studentName: string;
  amount: string;
  daysWorked: number;
};

export type CoachPaymentSummary = {
  coachId: string;
  coachName: string;
  activeStudentCount: number;
  totalAmount: string;
  breakdown: PaymentBreakdownItem[];
};

// Package status enum
export type PackageStatus = "active" | "expiring" | "expired";
