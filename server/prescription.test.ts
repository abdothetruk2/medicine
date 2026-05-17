import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock database functions
vi.mock("./db", () => ({
  createPrescription: vi.fn(async (data) => ({
    insertId: 1,
  })),
  updatePrescription: vi.fn(async () => {}),
  getPrescriptionById: vi.fn(async (id) => {
    if (id === 1) {
      return {
        id: 1,
        userId: 1,
        imageUrl: "/manus-storage/test.jpg",
        imageKey: "prescriptions/test.jpg",
        fileName: "prescription.jpg",
        analysisStatus: "completed",
        medications: [
          {
            name: "Aspirin",
            nameArabic: "الأسبرين",
            dosage: "500mg",
            dosageArabic: "500 ملغ",
            frequency: "twice daily",
            frequencyArabic: "مرتين يوميا",
            duration: "7 days",
            durationArabic: "7 أيام",
            confidence: {
              name: 0.95,
              dosage: 0.9,
              frequency: 0.85,
              duration: 0.9,
            },
            notes: "Take with food",
            notesArabic: "تناول مع الطعام",
          },
        ],
        rawAnalysis: '{"medications":[...]}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }),
  getUserPrescriptions: vi.fn(async (userId, limit) => {
    if (userId === 1) {
      return [
        {
          id: 1,
          userId: 1,
          imageUrl: "/manus-storage/test.jpg",
          imageKey: "prescriptions/test.jpg",
          fileName: "prescription.jpg",
          analysisStatus: "completed",
          medications: [],
          rawAnalysis: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
    return [];
  }),
  deletePrescription: vi.fn(async () => {}),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            medications: [
              {
                name: "Aspirin",
                nameArabic: "الأسبرين",
                dosage: "500mg",
                dosageArabic: "500 ملغ",
                frequency: "twice daily",
                frequencyArabic: "مرتين يوميا",
                duration: "7 days",
                durationArabic: "7 أيام",
                confidence: {
                  name: 0.95,
                  dosage: 0.9,
                  frequency: 0.85,
                  duration: 0.9,
                },
                notes: "Take with food",
                notesArabic: "تناول مع الطعام",
              },
            ],
          }),
        },
      },
    ],
  })),
}));

function createAuthContext(userId: number = 1): TrpcContext {
  const user: User = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      get: (key: string) => {
        if (key === "host") return "localhost:3000";
        return null;
      },
    } as any,
    res: {} as any,
  };

  return ctx;
}

describe("prescription router", () => {
  describe("prescription.upload", () => {
    it("should create a prescription record with pending status", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.upload({
        imageUrl: "/manus-storage/test.jpg",
        imageKey: "prescriptions/test.jpg",
        fileName: "prescription.jpg",
      });

      expect(result).toEqual({
        id: 1,
        status: "pending",
      });
    });

    it("should accept relative storage URLs", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.upload({
        imageUrl: "/manus-storage/test.jpg",
        imageKey: "prescriptions/test.jpg",
        fileName: "prescription.jpg",
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should reject untrusted absolute URLs", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.prescription.upload({
          imageUrl: "https://example.com/image.jpg",
          imageKey: "prescriptions/test.jpg",
          fileName: "prescription.jpg",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should reject malformed storage paths", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.prescription.upload({
          imageUrl: "not-a-valid-storage-path",
          imageKey: "prescriptions/test.jpg",
          fileName: "prescription.jpg",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("prescription.getById", () => {
    it("should return a prescription by ID for the owner", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.userId).toBe(1);
      expect(result?.analysisStatus).toBe("completed");
    });

    it("should throw FORBIDDEN error for non-owner", async () => {
      const ctx = createAuthContext(2); // Different user
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.prescription.getById({ id: 1 });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should throw NOT_FOUND error for missing prescription", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.prescription.getById({ id: 999 });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("prescription.history", () => {
    it("should return user's prescription history", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.history({ limit: 50 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.userId).toBe(1);
    });

    it("should respect limit parameter", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.history({ limit: 10 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array for user with no prescriptions", async () => {
      const ctx = createAuthContext(999); // Non-existent user
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.history({ limit: 50 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should enforce max limit of 100", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.prescription.history({ limit: 101 });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("prescription.delete", () => {
    it("should delete a prescription for the owner", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prescription.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw FORBIDDEN error for non-owner", async () => {
      const ctx = createAuthContext(2); // Different user
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.prescription.delete({ id: 1 });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should throw NOT_FOUND error for missing prescription", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.prescription.delete({ id: 999 });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("medication data structure", () => {
    it("should have correct bilingual medication fields", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const prescription = await caller.prescription.getById({ id: 1 });

      expect(prescription?.medications).toBeDefined();
      expect(prescription?.medications?.[0]).toMatchObject({
        name: expect.any(String),
        nameArabic: expect.any(String),
        dosage: expect.any(String),
        dosageArabic: expect.any(String),
        frequency: expect.any(String),
        frequencyArabic: expect.any(String),
        duration: expect.any(String),
        durationArabic: expect.any(String),
        notes: expect.any(String),
        notesArabic: expect.any(String),
      });
    });

    it("should have confidence scores between 0 and 1", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const prescription = await caller.prescription.getById({ id: 1 });
      const med = prescription?.medications?.[0];

      expect(med?.confidence.name).toBeGreaterThanOrEqual(0);
      expect(med?.confidence.name).toBeLessThanOrEqual(1);
      expect(med?.confidence.dosage).toBeGreaterThanOrEqual(0);
      expect(med?.confidence.dosage).toBeLessThanOrEqual(1);
      expect(med?.confidence.frequency).toBeGreaterThanOrEqual(0);
      expect(med?.confidence.frequency).toBeLessThanOrEqual(1);
      expect(med?.confidence.duration).toBeGreaterThanOrEqual(0);
      expect(med?.confidence.duration).toBeLessThanOrEqual(1);
    });
  });
});
