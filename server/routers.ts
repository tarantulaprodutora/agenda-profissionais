import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllProfessionals,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  seedProfessionals,
  getAllActivityTypes,
  seedActivityTypes,
  getAllRequesters,
  createRequester,
  deleteRequester,
  seedRequesters,
  getBlocksByDate,
  createBlock,
  updateBlock,
  deleteBlock,
  getMonthlyReport,
  calcDurations,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Professionals ──────────────────────────────────────────────────────────
  professionals: router({
    list: publicProcedure.query(async () => {
      await seedProfessionals();
      return getAllProfessionals();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          columnOrder: z.number().int().min(1).max(20),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createProfessional({ ...input, active: true });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int(),
          name: z.string().min(1).max(128).optional(),
          columnOrder: z.number().int().min(1).max(20).optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProfessional(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await deleteProfessional(input.id);
        return { success: true };
      }),
  }),

  // ─── Activity Types ─────────────────────────────────────────────────────────
  activityTypes: router({
    list: publicProcedure.query(async () => {
      await seedActivityTypes();
      return getAllActivityTypes();
    }),
  }),

  // ─── Requesters ─────────────────────────────────────────────────────────────
  requesters: router({
    list: publicProcedure.query(async () => {
      await seedRequesters();
      return getAllRequesters();
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        await createRequester(input.name);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await deleteRequester(input.id);
        return { success: true };
      }),
  }),

  // ─── Activity Blocks ────────────────────────────────────────────────────────
  blocks: router({
    byDate: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getBlocksByDate(input.date);
      }),

    create: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int(),
          activityTypeId: z.number().int().optional(),
          requesterId: z.number().int(),
          jobNumber: z.string().min(1).max(64),
          jobName: z.string().min(1).max(256),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
          description: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const toMin = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        if (toMin(input.startTime) >= toMin(input.endTime)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time" });
        }

        const existing = await getBlocksByDate(input.date);
        const hasOverlap = existing.some((b) => {
          if (b.professionalId !== input.professionalId) return false;
          const bStart = toMin(b.startTime);
          const bEnd = toMin(b.endTime);
          const newStart = toMin(input.startTime);
          const newEnd = toMin(input.endTime);
          return newStart < bEnd && newEnd > bStart;
        });

        if (hasOverlap) {
          throw new TRPCError({ code: "CONFLICT", message: "Block overlaps with an existing block" });
        }

        await createBlock({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          professionalId: z.number().int().optional(),
          activityTypeId: z.number().int().optional().nullable(),
          requesterId: z.number().int().optional().nullable(),
          jobNumber: z.string().min(1).max(64).optional(),
          jobName: z.string().min(1).max(256).optional(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          description: z.string().optional().nullable(),
          color: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        if (data.startTime && data.endTime) {
          const toMin = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
          };
          if (toMin(data.startTime) >= toMin(data.endTime)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time" });
          }
        }

        await updateBlock(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await deleteBlock(input.id);
        return { success: true };
      }),

    calcDurations: publicProcedure
      .input(
        z.object({
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .query(({ input }) => {
        return calcDurations(input.startTime, input.endTime);
      }),
  }),

  // ─── Reports ────────────────────────────────────────────────────────────────
  reports: router({
    monthly: adminProcedure
      .input(
        z.object({
          year: z.number().int().min(2020).max(2100),
          month: z.number().int().min(1).max(12),
          professionalId: z.number().int().optional(),
        })
      )
      .query(async ({ input }) => {
        const rows = await getMonthlyReport(input.year, input.month, input.professionalId);
        const profs = await getAllProfessionals();
        const types = await getAllActivityTypes();

        const summary: Record<
          number,
          {
            professionalId: number;
            professionalName: string;
            totalMin: number;
            normalMin: number;
            overtimeMin: number;
            byType: Record<number, { typeId: number; typeName: string; totalMin: number }>;
            entries: typeof rows;
          }
        > = {};

        for (const row of rows) {
          if (!summary[row.professionalId]) {
            const prof = profs.find((p) => p.id === row.professionalId);
            summary[row.professionalId] = {
              professionalId: row.professionalId,
              professionalName: prof?.name ?? `Prof. ${row.professionalId}`,
              totalMin: 0,
              normalMin: 0,
              overtimeMin: 0,
              byType: {},
              entries: [],
            };
          }

          const s = summary[row.professionalId];
          s.totalMin += row.durationTotalMin;
          s.normalMin += row.durationNormalMin;
          s.overtimeMin += row.durationOvertimeMin;
          s.entries.push(row);

          if (row.activityTypeId) {
            if (!s.byType[row.activityTypeId]) {
              const type = types.find((t) => t.id === row.activityTypeId);
              s.byType[row.activityTypeId] = {
                typeId: row.activityTypeId,
                typeName: type?.name ?? "Desconhecido",
                totalMin: 0,
              };
            }
            s.byType[row.activityTypeId].totalMin += row.durationTotalMin;
          }
        }

        return {
          rows,
          summary: Object.values(summary),
          professionals: profs,
          activityTypes: types,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
