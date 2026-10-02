import { z } from 'zod';

export const evidenceResponseSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    methodology: z.string(),
    vintage: z.string(),
    verifier: z.string()
  }),
  summary: z.object({
    period: z.string(),
    reduction: z.number(),
    evidenceRate: z.number(),
    openFindings: z.number(),
    sampled: z.number()
  }),
  records: z.array(z.object({
    id: z.string(),
    source: z.string(),
    activity: z.number(),
    unit: z.string(),
    factor: z.number(),
    factorUnit: z.string(),
    timeRange: z.string(),
    evidenceCount: z.number(),
    anomaly: z.number(),
    owner: z.string(),
    status: z.enum(['待核验', '复核中', '已核验', '需补证']),
    revision: z.number()
  }))
});

export const snapshotSchema = z.object({
  id: z.string(),
  recordId: z.string(),
  revision: z.number(),
  activity: z.number(),
  unit: z.string(),
  conversionNote: z.string(),
  batchId: z.string(),
  issuer: z.string(),
  issuedAt: z.string()
});

export const snapshotResponseSchema = z.object({
  batchId: z.string(),
  snapshots: z.array(snapshotSchema)
});

export const batchResultSchema = z.object({
  batchId: z.string(),
  confirmed: z.array(z.string()),
  skipped: z.array(z.string()),
  failed: z.array(z.string())
});

export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>;
export type SnapshotResponse = z.infer<typeof snapshotResponseSchema>;
export type BatchResult = z.infer<typeof batchResultSchema>;
