import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCoachSchema, insertStudentSchema, insertSystemSettingsSchema } from "@shared/schema";
import type { CoachPaymentSummary, PaymentBreakdownItem } from "@shared/schema";
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize system settings
  await storage.initializeSettings();

  // ============ SYSTEM SETTINGS ============
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const validated = insertSystemSettingsSchema.parse(req.body);
      const updated = await storage.updateSettings(validated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(400).json({ message: error.message || "Failed to update settings" });
    }
  });

  // ============ COACHES ============
  app.get("/api/coaches", async (_req, res) => {
    try {
      const coaches = await storage.getAllCoaches();
      res.json(coaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.get("/api/coaches/:id", async (req, res) => {
    try {
      const coach = await storage.getCoach(req.params.id);
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }
      res.json(coach);
    } catch (error) {
      console.error("Error fetching coach:", error);
      res.status(500).json({ message: "Failed to fetch coach" });
    }
  });

  app.post("/api/coaches", async (req, res) => {
    try {
      const validated = insertCoachSchema.parse(req.body);
      const coach = await storage.createCoach(validated);
      res.json(coach);
    } catch (error: any) {
      console.error("Error creating coach:", error);
      res.status(400).json({ message: error.message || "Failed to create coach" });
    }
  });

  app.put("/api/coaches/:id", async (req, res) => {
    try {
      const validated = insertCoachSchema.partial().parse(req.body);
      const coach = await storage.updateCoach(req.params.id, validated);
      res.json(coach);
    } catch (error: any) {
      console.error("Error updating coach:", error);
      res.status(400).json({ message: error.message || "Failed to update coach" });
    }
  });

  app.delete("/api/coaches/:id", async (req, res) => {
    try {
      await storage.archiveCoach(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving coach:", error);
      res.status(500).json({ message: "Failed to archive coach" });
    }
  });

  // ============ STUDENTS ============
  app.get("/api/students", async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const validated = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validated);
      res.json(student);
    } catch (error: any) {
      console.error("Error creating student:", error);
      res.status(400).json({ message: error.message || "Failed to create student" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const validated = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(req.params.id, validated);
      res.json(student);
    } catch (error: any) {
      console.error("Error updating student:", error);
      res.status(400).json({ message: error.message || "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      await storage.archiveStudent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving student:", error);
      res.status(500).json({ message: "Failed to archive student" });
    }
  });

  // ============ DASHBOARD STATS ============
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const coaches = await storage.getAllCoaches();
      const students = await storage.getAllStudents();
      const settings = await storage.getSettings();

      const activeCoaches = coaches.length;
      const activeStudents = students.length;

      // Calculate expected monthly payment (simplified - current active students)
      const monthlyFee = parseFloat(settings.coachMonthlyFee);
      const expectedMonthlyPayment = (activeStudents * monthlyFee).toFixed(2);

      // Commission is simplified - assuming packages paid upfront
      // This is approximate based on average package length
      const avgPackageMonths = students.length > 0 
        ? students.reduce((sum, s) => sum + s.packageMonths, 0) / students.length 
        : 3;
      const totalStudentRevenue = activeStudents * monthlyFee * avgPackageMonths;
      const totalCoachPayment = activeStudents * monthlyFee * avgPackageMonths;
      const commission = (totalStudentRevenue - totalCoachPayment).toFixed(2);

      res.json({
        activeCoaches,
        activeStudents,
        expectedMonthlyPayment,
        medkampusCommission: commission,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ============ RENEWAL ALERTS ============
  app.get("/api/dashboard/renewal-alerts", async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      const today = new Date();

      const alerts = students.map((student) => {
        const endDate = parseISO(student.packageEndDate);
        const daysRemaining = differenceInDays(endDate, today);

        let status: "expiring" | "expired";
        if (daysRemaining < 0) {
          status = "expired";
        } else {
          status = "expiring";
        }

        return {
          student,
          daysRemaining,
          status,
        };
      });

      // Filter: expiring (0-7 days) and expired (negative days)
      const filtered = alerts.filter(
        (a) => (a.daysRemaining >= 0 && a.daysRemaining <= 7) || a.daysRemaining < 0
      );

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching renewal alerts:", error);
      res.status(500).json({ message: "Failed to fetch renewal alerts" });
    }
  });

  // Helper function to safely calculate payment date
  function calculatePaymentDate(year: number, month: number, day: number): Date {
    // Create date with the target month
    const date = new Date(year, month, 1);
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    // Use the lesser of payment day or last day of month
    const actualDay = Math.min(day, lastDay);
    date.setDate(actualDay);
    return date;
  }

  // ============ PAYMENT CALCULATIONS ============
  app.get("/api/payments/current-month", async (_req, res) => {
    try {
      const coaches = await storage.getAllCoaches();
      const settings = await storage.getSettings();
      const monthlyFee = parseFloat(settings.coachMonthlyFee);
      const paymentDay = settings.globalPaymentDay;

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // Find the UPCOMING or CURRENT payment date (next payment day >= today)
      // This represents the payment we're currently accumulating for
      let currentPaymentDate = calculatePaymentDate(currentYear, currentMonth, paymentDay);
      
      // If this month's payment day has already passed, move to next month
      if (currentPaymentDate < today) {
        currentPaymentDate = calculatePaymentDate(currentYear, currentMonth + 1, paymentDay);
      }

      // Previous payment date is one month before currentPaymentDate
      // Derive from currentPaymentDate to handle year boundaries correctly
      const payYear = currentPaymentDate.getFullYear();
      const payMonth = currentPaymentDate.getMonth();
      const prevYear = payMonth === 0 ? payYear - 1 : payYear;
      const prevMonth = payMonth === 0 ? 11 : payMonth - 1;
      const prevPaymentDate = calculatePaymentDate(prevYear, prevMonth, paymentDay);

      // Cycle runs from day AFTER previous payment to current/upcoming payment day
      const cycleStart = new Date(prevPaymentDate);
      cycleStart.setDate(cycleStart.getDate() + 1);
      const cycleEnd = currentPaymentDate;

      // Collect all students from all coaches
      const allStudents: Array<{ student: Student; currentCoachId: string }> = [];
      for (const coach of coaches) {
        const activeStudents = coach.students?.filter((s) => s.isActive === 1) || [];
        activeStudents.forEach(student => {
          allStudents.push({ student, currentCoachId: coach.id });
        });
      }

      // Build payment summaries by coach
      const coachPayments = new Map<string, { 
        coachName: string; 
        breakdown: PaymentBreakdownItem[]; 
        totalAmount: number 
      }>();

      // Initialize all coaches
      for (const coach of coaches) {
        coachPayments.set(coach.id, {
          coachName: `${coach.firstName} ${coach.lastName}`,
          breakdown: [],
          totalAmount: 0,
        });
      }

      // Process each student
      for (const { student, currentCoachId } of allStudents) {
        const studentStart = parseISO(student.packageStartDate);
        const studentEnd = parseISO(student.packageEndDate);

        // Determine the actual work period for this student within the cycle
        const workStart = studentStart > cycleStart ? studentStart : cycleStart;
        const workEnd = studentEnd < cycleEnd ? studentEnd : cycleEnd;

        // Skip if student wasn't active during this cycle
        if (workStart > workEnd) {
          continue;
        }

        // Get transfer history for this student (all transfers, sorted oldest first)
        const allTransfers = await storage.getStudentTransferHistory(student.id);
        const sortedTransfers = [...allTransfers].sort((a, b) => 
          parseISO(a.transferDate).getTime() - parseISO(b.transferDate).getTime()
        );
        
        // Find the coach at the start of the student's work period
        // If there are transfers before workStart, use the most recent one's newCoachId
        // Otherwise, find the original coach (oldCoachId from first transfer or currentCoachId if no transfers)
        const transfersBeforeWorkStart = sortedTransfers.filter(t => 
          parseISO(t.transferDate) < workStart
        );
        
        let coachAtWorkStart: string;
        if (transfersBeforeWorkStart.length > 0) {
          // Use the most recent transfer before workStart
          coachAtWorkStart = transfersBeforeWorkStart[transfersBeforeWorkStart.length - 1].newCoachId;
        } else if (sortedTransfers.length > 0) {
          // No transfers before workStart, but there are transfers
          // The first transfer's oldCoachId is the original coach
          coachAtWorkStart = sortedTransfers[0].oldCoachId;
        } else {
          // No transfers at all - student stayed with current coach
          coachAtWorkStart = currentCoachId;
        }
        
        // Filter transfers that occurred during the student's work period
        const relevantTransfers = sortedTransfers
          .filter(t => {
            const tDate = parseISO(t.transferDate);
            return tDate >= workStart && tDate <= workEnd;
          });

        // Build periods: each period has a coach and date range
        const periods: Array<{ coachId: string; start: Date; end: Date }> = [];

        if (relevantTransfers.length === 0) {
          // No transfers during the student's work period - stayed with same coach
          periods.push({
            coachId: coachAtWorkStart,
            start: workStart,
            end: workEnd,
          });
        } else {
          // Student had coach changes during the work period
          // First period: from work start to first transfer
          const firstTransfer = relevantTransfers[0];
          const firstTransferDate = parseISO(firstTransfer.transferDate);
          
          if (workStart < firstTransferDate) {
            const dayBeforeTransfer = new Date(firstTransferDate);
            dayBeforeTransfer.setDate(dayBeforeTransfer.getDate() - 1);
            
            periods.push({
              coachId: coachAtWorkStart,
              start: workStart,
              end: dayBeforeTransfer < workEnd ? dayBeforeTransfer : workEnd,
            });
          }

          // Middle periods: between transfers
          for (let i = 0; i < relevantTransfers.length - 1; i++) {
            const currentTransfer = relevantTransfers[i];
            const nextTransfer = relevantTransfers[i + 1];
            const currentTransferDate = parseISO(currentTransfer.transferDate);
            const nextTransferDate = parseISO(nextTransfer.transferDate);
            
            const dayBeforeNext = new Date(nextTransferDate);
            dayBeforeNext.setDate(dayBeforeNext.getDate() - 1);
            
            if (currentTransferDate <= dayBeforeNext && currentTransferDate <= studentEnd) {
              periods.push({
                coachId: currentTransfer.newCoachId,
                start: currentTransferDate,
                end: dayBeforeNext < studentEnd ? dayBeforeNext : studentEnd,
              });
            }
          }

          // Last period: from last transfer to work end
          const lastTransfer = relevantTransfers[relevantTransfers.length - 1];
          const lastTransferDate = parseISO(lastTransfer.transferDate);
          
          if (lastTransferDate <= workEnd) {
            periods.push({
              coachId: lastTransfer.newCoachId,
              start: lastTransferDate,
              end: workEnd,
            });
          }
        }

        // Calculate payment for each period
        const dailyFee = monthlyFee / 30;
        
        for (const period of periods) {
          if (period.start <= period.end) {
            const daysWorked = differenceInDays(period.end, period.start) + 1;
            const amount = dailyFee * daysWorked;

            const coachData = coachPayments.get(period.coachId);
            if (coachData) {
              coachData.breakdown.push({
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                amount: amount.toFixed(2),
                daysWorked,
              });
              coachData.totalAmount += amount;
            }
          }
        }
      }

      // Build final summaries
      const summaries: CoachPaymentSummary[] = [];
      for (const [coachId, data] of coachPayments.entries()) {
        if (data.breakdown.length > 0) {
          summaries.push({
            coachId,
            coachName: data.coachName,
            activeStudentCount: data.breakdown.length,
            totalAmount: data.totalAmount.toFixed(2),
            breakdown: data.breakdown,
          });
        }
      }

      res.json(summaries);
    } catch (error) {
      console.error("Error calculating payments:", error);
      res.status(500).json({ message: "Failed to calculate payments" });
    }
  });

  // Save current month payments as records
  app.post("/api/payments/save", async (req, res) => {
    try {
      const { paymentDate, summaries } = req.body;

      if (!paymentDate || !summaries || !Array.isArray(summaries)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const savedRecords = [];
      for (const summary of summaries) {
        const record = await storage.createPaymentRecord({
          coachId: summary.coachId,
          paymentDate,
          totalAmount: summary.totalAmount,
          studentCount: summary.activeStudentCount,
          breakdown: summary.breakdown,
          status: "pending",
        });
        savedRecords.push(record);
      }

      res.json(savedRecords);
    } catch (error) {
      console.error("Error saving payment records:", error);
      res.status(500).json({ message: "Failed to save payment records" });
    }
  });

  // Mark payment as paid
  app.put("/api/payments/:id/mark-paid", async (req, res) => {
    try {
      const { id } = req.params;
      const { paidBy, notes } = req.body;

      const record = await storage.markPaymentAsPaid(id, paidBy, notes);
      res.json(record);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      res.status(500).json({ message: "Failed to mark payment as paid" });
    }
  });

  // Get all payment history
  app.get("/api/payments/history", async (_req, res) => {
    try {
      const records = await storage.getAllPaymentRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // ============ COACH TRANSFERS ============
  // Transfer student to new coach
  app.post("/api/students/:id/transfer-coach", async (req, res) => {
    try {
      const { id } = req.params;
      const { newCoachId, transferDate, notes } = req.body;

      if (!newCoachId || !transferDate) {
        return res.status(400).json({ message: "newCoachId and transferDate are required" });
      }

      const transfer = await storage.transferStudentCoach(id, newCoachId, transferDate, notes);
      res.json(transfer);
    } catch (error) {
      console.error("Error transferring student coach:", error);
      res.status(500).json({ message: "Failed to transfer student coach" });
    }
  });

  // Get student transfer history
  app.get("/api/students/:id/transfer-history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getStudentTransferHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      res.status(500).json({ message: "Failed to fetch transfer history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
