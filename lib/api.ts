import ky, { HTTPError } from 'ky';
import { batchResultSchema, evidenceResponseSchema, snapshotResponseSchema, type BatchResult } from './schema';

const client = ky.create({ timeout: 10_000, retry: { limit: 1 } });

export async function fetchEvidence() {
  const payload = await client.get('/api/evidence').json<unknown>();
  return evidenceResponseSchema.parse(payload);
}

export async function fetchSnapshotBatch() {
  const payload = await client.get('/api/snapshots').json<unknown>();
  return snapshotResponseSchema.parse(payload);
}

export type BatchItemPayload = {
  recordId: string;
  revision: number;
  activity: number;
  reason: string;
  actor: string;
};

export type BatchSubmission =
  | { ok: true; result: BatchResult }
  | { ok: false; partial: BatchResult | null };

export async function submitRevisionBatch(payload: { batchId: string; resume: boolean; items: BatchItemPayload[] }): Promise<BatchSubmission> {
  try {
    // 批次写入不重试：部分失败由客户端按批次号恢复，避免已确认记录重复写入
    const body = await client.post('/api/evidence', { json: payload, retry: { limit: 0 } }).json<unknown>();
    return { ok: true, result: batchResultSchema.parse(body) };
  } catch (error) {
    if (error instanceof HTTPError) {
      const body = await error.response.json().catch(() => null);
      const parsed = batchResultSchema.safeParse(body);
      if (parsed.success) return { ok: false, partial: parsed.data };
    }
    return { ok: false, partial: null };
  }
}
