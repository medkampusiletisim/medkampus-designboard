import {
  coaches,
  students,
  systemSettings,
  paymentRecords,
  coachTransfers,
  type Coach,
  type InsertCoach,
  type Student,
  type InsertStudent,
  type StudentWithCoach,
  type CoachWithStudents,
  type SystemSettings,
  type InsertSystemSettings,
  type PaymentRecord,
  type InsertPaymentRecord,
  type CoachTransfer,
  type InsertCoachTransfer,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { addMonths, format, differenceInDays, parseISO } from "date-fns";

export interface IStorage {
  // System Settings
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: InsertSystemSettings): Promise<SystemSettings>;
  initializeSettings(): Promise<void>;

  // Coaches
  getAllCoaches(): Promise<CoachWithStudents[]>;
  getCoach(id: string): Promise<CoachWithStudents | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  archiveCoach(id: string): Promise<void>;

  // Students
  getAllStudents(): Promise<StudentWithCoach[]>;
  getStudent(id: string): Promise<StudentWithCoach | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  archiveStudent(id: string): Promise<void>;

  // Payment Records
  createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord>;
  getPaymentRecordsByCoach(coachId: string): Promise<PaymentRecord[]>;
  getAllPaymentRecords(): Promise<PaymentRecord[]>;
  markPaymentAsPaid(id: string, paidBy?: string, notes?: string): Promise<PaymentRecord>;
  getPaymentRecord(id: string): Promise<PaymentRecord | undefined>;

  // Coach Transfers
  createCoachTransfer(transfer: InsertCoachTransfer): Promise<CoachTransfer>;
  getStudentTransferHistory(studentId: string): Promise<CoachTransfer[]>;
  transferStudentCoach(studentId: string, newCoachId: string, transferDate: string, notes?: string): Promise<CoachTransfer>;
}

export class DatabaseStorage implements IStorage {
  // System Settings
  async getSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      await this.initializeSettings();
      const [newSettings] = await db.select().from(systemSettings).limit(1);
      return newSettings;
    }
    return settings;
  }

  async updateSettings(
    settingsData: InsertSystemSettings
  ): Promise<SystemSettings> {
    const existing = await this.getSettings();
    const [updated] = await db
      .update(systemSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, existing.id))
      .returning();
    return updated;
  }

  async initializeSettings(): Promise<void> {
    await db.insert(systemSettings).values({
      coachMonthlyFee: "1100.00",
      globalPaymentDay: 28,
    }).onConflictDoNothing();
  }

  // Coaches
  async getAllCoaches(): Promise<CoachWithStudents[]> {
    const allCoaches = await db.query.coaches.findMany({
      where: eq(coaches.isActive, 1),
      with: {
        students: {
          where: eq(students.isActive, 1),
        },
      },
      orderBy: (coaches, { asc }) => [asc(coaches.firstName)],
    });
    return allCoaches;
  }

  async getCoach(id: string): Promise<CoachWithStudents | undefined> {
    const coach = await db.query.coaches.findFirst({
      where: and(eq(coaches.id, id), eq(coaches.isActive, 1)),
      with: {
        students: {
          where: eq(students.isActive, 1),
        },
      },
    });
    return coach;
  }

  async createCoach(coachData: InsertCoach): Promise<Coach> {
    const [coach] = await db
      .insert(coaches)
      .values({
        ...coachData,
        isActive: 1,
      })
      .returning();
    return coach;
  }

  async updateCoach(
    id: string,
    coachData: Partial<InsertCoach>
  ): Promise<Coach> {
    const [updated] = await db
      .update(coaches)
      .set({
        ...coachData,
        updatedAt: new Date(),
      })
      .where(eq(coaches.id, id))
      .returning();
    return updated;
  }

  async archiveCoach(id: string): Promise<void> {
    await db
      .update(coaches)
      .set({
        isActive: 0,
        updatedAt: new Date(),
      })
      .where(eq(coaches.id, id));
  }

  // Students
  async getAllStudents(): Promise<StudentWithCoach[]> {
    const allStudents = await db.query.students.findMany({
      where: eq(students.isActive, 1),
      with: {
        coach: true,
      },
      orderBy: (students, { desc }) => [desc(students.createdAt)],
    });
    return allStudents;
  }

  async getStudent(id: string): Promise<StudentWithCoach | undefined> {
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, id), eq(students.isActive, 1)),
      with: {
        coach: true,
      },
    });
    return student;
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    // Calculate package end date
    const startDate = new Date(studentData.packageStartDate);
    const endDate = addMonths(startDate, studentData.packageMonths);
    const packageEndDate = format(endDate, "yyyy-MM-dd");

    const [student] = await db
      .insert(students)
      .values({
        ...studentData,
        packageEndDate,
        isActive: 1,
      })
      .returning();
    return student;
  }

  async updateStudent(
    id: string,
    studentData: Partial<InsertStudent>
  ): Promise<Student> {
    // Recalculate end date if start date or package months changed
    let packageEndDate: string | undefined;
    if (studentData.packageStartDate || studentData.packageMonths !== undefined) {
      const existing = await db.query.students.findFirst({
        where: eq(students.id, id),
      });
      if (!existing) throw new Error("Student not found");

      const startDate = new Date(
        studentData.packageStartDate || existing.packageStartDate
      );
      const months =
        studentData.packageMonths !== undefined
          ? studentData.packageMonths
          : existing.packageMonths;
      const endDate = addMonths(startDate, months);
      packageEndDate = format(endDate, "yyyy-MM-dd");
    }

    const [updated] = await db
      .update(students)
      .set({
        ...studentData,
        ...(packageEndDate ? { packageEndDate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async archiveStudent(id: string): Promise<void> {
    await db
      .update(students)
      .set({
        isActive: 0,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id));
  }

  // Payment Records
  async createPaymentRecord(
    record: InsertPaymentRecord
  ): Promise<PaymentRecord> {
    const [paymentRecord] = await db
      .insert(paymentRecords)
      .values(record)
      .returning();
    return paymentRecord;
  }

  async getPaymentRecordsByCoach(coachId: string): Promise<PaymentRecord[]> {
    const records = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.coachId, coachId))
      .orderBy(sql`${paymentRecords.paymentDate} DESC`);
    return records;
  }

  async getAllPaymentRecords(): Promise<PaymentRecord[]> {
    const records = await db
      .select()
      .from(paymentRecords)
      .orderBy(sql`${paymentRecords.paymentDate} DESC, ${paymentRecords.createdAt} DESC`);
    return records;
  }

  async markPaymentAsPaid(
    id: string,
    paidBy?: string,
    notes?: string
  ): Promise<PaymentRecord> {
    const [updated] = await db
      .update(paymentRecords)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidBy,
        notes,
      })
      .where(eq(paymentRecords.id, id))
      .returning();
    return updated;
  }

  async getPaymentRecord(id: string): Promise<PaymentRecord | undefined> {
    const [record] = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.id, id))
      .limit(1);
    return record;
  }

  // Coach Transfers
  async createCoachTransfer(transfer: InsertCoachTransfer): Promise<CoachTransfer> {
    const [coachTransfer] = await db
      .insert(coachTransfers)
      .values(transfer)
      .returning();
    return coachTransfer;
  }

  async getStudentTransferHistory(studentId: string): Promise<CoachTransfer[]> {
    const transfers = await db
      .select()
      .from(coachTransfers)
      .where(eq(coachTransfers.studentId, studentId))
      .orderBy(sql`${coachTransfers.transferDate} DESC`);
    return transfers;
  }

  async transferStudentCoach(
    studentId: string,
    newCoachId: string,
    transferDate: string,
    notes?: string
  ): Promise<CoachTransfer> {
    // Get current student data
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      throw new Error("Student not found");
    }

    const oldCoachId = student.coachId;

    // Create transfer record
    const [transfer] = await db
      .insert(coachTransfers)
      .values({
        studentId,
        oldCoachId,
        newCoachId,
        transferDate,
        notes,
      })
      .returning();

    // Update student's current coach
    await db
      .update(students)
      .set({
        coachId: newCoachId,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    return transfer;
  }
}

export const storage = new DatabaseStorage();
