import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createPrescription,
  updatePrescription,
  getPrescriptionById,
  getUserPrescriptions,
  deletePrescription,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";


const trustedStoragePathRegex = /^\/manus-storage\/[A-Za-z0-9._\-/]+$/;

function normalizeAndValidateImageUrl(rawImageUrl: string, req: { protocol?: string; get: (key: string) => string | null | undefined }) {
  if (trustedStoragePathRegex.test(rawImageUrl)) {
    const protocol = req.protocol || "https";
    const host = req.get("host") || "localhost:3000";
    return `${protocol}://${host}${rawImageUrl}`;
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "imageUrl must be a trusted /manus-storage path",
  });
}

// Medication type definition
const MedicationType = z.object({
  name: z.string(),
  nameArabic: z.string(),
  dosage: z.string(),
  dosageArabic: z.string(),
  frequency: z.string(),
  frequencyArabic: z.string(),
  duration: z.string(),
  durationArabic: z.string(),
  confidence: z.object({
    name: z.number().min(0).max(1),
    dosage: z.number().min(0).max(1),
    frequency: z.number().min(0).max(1),
    duration: z.number().min(0).max(1),
  }),
  notes: z.string(),
  notesArabic: z.string(),
});

/**
 * Async function to analyze prescription image using LLM vision
 */
async function analyzePrescriptionAsync(prescriptionId: number, imageUrl: string) {
  try {
    // Call LLM with vision capability to analyze the prescription
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a medical prescription analyzer. Analyze the prescription image and extract medication information.
          
For each medication found, provide:
- name (English)
- nameArabic (Arabic translation)
- dosage (English)
- dosageArabic (Arabic translation)
- frequency (English, e.g., "twice daily")
- frequencyArabic (Arabic translation)
- duration (English, e.g., "7 days")
- durationArabic (Arabic translation)
- notes (any additional notes in English)
- notesArabic (Arabic translation)
- confidence scores (0-1) for each field

Return a valid JSON object with a "medications" array.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this prescription image and extract all medication information.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prescription_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              medications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    nameArabic: { type: "string" },
                    dosage: { type: "string" },
                    dosageArabic: { type: "string" },
                    frequency: { type: "string" },
                    frequencyArabic: { type: "string" },
                    duration: { type: "string" },
                    durationArabic: { type: "string" },
                    notes: { type: "string" },
                    notesArabic: { type: "string" },
                    confidence: {
                      type: "object",
                      properties: {
                        name: { type: "number" },
                        dosage: { type: "number" },
                        frequency: { type: "number" },
                        duration: { type: "number" },
                      },
                      required: ["name", "dosage", "frequency", "duration"],
                    },
                  },
                  required: [
                    "name",
                    "nameArabic",
                    "dosage",
                    "dosageArabic",
                    "frequency",
                    "frequencyArabic",
                    "duration",
                    "durationArabic",
                    "notes",
                    "notesArabic",
                    "confidence",
                  ],
                },
              },
            },
            required: ["medications"],
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("No response from LLM");

    const rawAnalysis = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(rawAnalysis);

    // Validate the response structure
    const medications = parsed.medications.map((med: any) =>
      MedicationType.parse({
        name: med.name || "",
        nameArabic: med.nameArabic || "",
        dosage: med.dosage || "",
        dosageArabic: med.dosageArabic || "",
        frequency: med.frequency || "",
        frequencyArabic: med.frequencyArabic || "",
        duration: med.duration || "",
        durationArabic: med.durationArabic || "",
        notes: med.notes || "",
        notesArabic: med.notesArabic || "",
        confidence: {
          name: Math.min(1, Math.max(0, med.confidence?.name || 0.8)),
          dosage: Math.min(1, Math.max(0, med.confidence?.dosage || 0.8)),
          frequency: Math.min(1, Math.max(0, med.confidence?.frequency || 0.8)),
          duration: Math.min(1, Math.max(0, med.confidence?.duration || 0.8)),
        },
      })
    );

    // Update prescription with completed status
    await updatePrescription(prescriptionId, {
      analysisStatus: "completed",
      medications,
      rawAnalysis,
    });
  } catch (error) {
    console.error("[Prescription Analysis] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update prescription with failed status
    await updatePrescription(prescriptionId, {
      analysisStatus: "failed",
      analysisError: errorMessage,
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  prescription: router({
    /**
     * Upload a prescription image and start analysis
     */
    upload: protectedProcedure
      .input(
        z.object({
          imageUrl: z.string().min(1),
          imageKey: z.string(),
          fileName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Create prescription record with pending status
        const result = await createPrescription({
          userId: ctx.user.id,
          imageUrl: input.imageUrl,
          imageKey: input.imageKey,
          fileName: input.fileName,
          analysisStatus: "pending",
        });

        const prescriptionId = (result as any).insertId;

        const absoluteImageUrl = normalizeAndValidateImageUrl(input.imageUrl, {
          protocol: ctx.req.protocol,
          get: key => ctx.req.get(key),
        });

        // Start async analysis (fire and forget)
        analyzePrescriptionAsync(prescriptionId, absoluteImageUrl).catch(err =>
          console.error("[Async Analysis] Error:", err)
        );

        return {
          id: prescriptionId,
          status: "pending",
        };
      }),

    /**
     * Get a specific prescription by ID (user-scoped)
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const prescription = await getPrescriptionById(input.id);

        if (!prescription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prescription not found" });
        }

        // Ensure user owns this prescription
        if (prescription.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this prescription",
          });
        }

        return prescription;
      }),

    /**
     * Get user's prescription history (paginated)
     */
    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        const prescriptions = await getUserPrescriptions(ctx.user.id, input.limit);
        return prescriptions;
      }),

    /**
     * Delete a prescription (user-scoped)
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const prescription = await getPrescriptionById(input.id);

        if (!prescription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prescription not found" });
        }

        // Ensure user owns this prescription
        if (prescription.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to delete this prescription",
          });
        }

        await deletePrescription(input.id);

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
