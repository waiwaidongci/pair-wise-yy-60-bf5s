import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RecordStatus = '待核验' | '复核中' | '已核验' | '需补证';
export type CarbonRecord = {
  id: string;
  source: string;
  activity: number;
  unit: string;
  factor: number;
  factorUnit: string;
  timeRange: string;
  evidenceCount: number;
  anomaly: number;
  owner: string;
  status: RecordStatus;
  revision: number;
};

export type FindingType = '缺失证据' | '单位不一致' | '时间范围' | '异常波动' | '对账冲突';
export type Finding = {
  id: string;
  recordId: string;
  type: FindingType;
  title: string;
  detail: string;
  assignee: string;
  due: string;
  status: '开放' | '补证中' | '已关闭';
  stale: boolean;
  staleReason?: string;
  pendingReview: boolean;
  snapshotId?: string;
  localRevisionId?: string;
  conflictRevisionId?: string;
};

// 正式证据快照：按编号 + 版本匹配，携带换算依据
export type Snapshot = {
  id: string;
  recordId: string;
  version: number;
  activity: number;
  unit: string;
  factor: number;
  factorUnit: string;
  timeRange: string;
  conversionBasis: string;
  capturedAt: string;
};

export type RevisionStatus = '已生效' | '冲突' | '已归档';
export type Revision = {
  id: string;
  recordId: string;
  baseSnapshotId: string;
  baseVersion: number;
  value: number;
  unit: string;
  reason: string;
  actor: string;
  submittedAt: string;
  batchNo: string;
  status: RevisionStatus;
  conflictWith?: string;
};

export type IssuanceCheck = {
  id: string;
  title: string;
  detail: string;
  checked: boolean;
  stale: boolean;
  invalidatedBy?: string;
};

export type Batch = {
  batchNo: string;
  recordIds: string[];
  completedIds: string[];
  failedId: string | null;
  status: '进行中' | '已完成';
  actor: string;
  startedAt: string;
};

const defaultRecords: CarbonRecord[] = [
  { id: 'ACT-0318', source: '电表 E-17 / 四号压缩机组', activity: 428650, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 4, anomaly: 2.3, owner: '项目现场 O2', status: '复核中', revision: 3 },
  { id: 'ACT-0321', source: '蒸汽流量计 ST-04', activity: 2038.4, unit: 'GJ', factor: 0.1100, factorUnit: 'tCO2/GJ', timeRange: '2026-07-01 至 07-31', evidenceCount: 3, anomaly: 0, owner: '能源中心', status: '已核验', revision: 2 },
  { id: 'ACT-0325', source: '柴油消耗台账 / 应急泵', activity: 1890, unit: 'L', factor: 2.6800, factorUnit: 'kgCO2/L', timeRange: '2026-07-01 至 07-31', evidenceCount: 2, anomaly: 8.6, owner: '设备保障部', status: '需补证', revision: 5 },
  { id: 'ACT-0331', source: '光伏逆变器阵列 PV-2', activity: 182460, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 5, anomaly: -1.2, owner: '新能源运维', status: '已核验', revision: 1 },
  { id: 'ACT-0337', source: '天然气流量计 NG-02', activity: 62.8, unit: 'kNm3', factor: 2.1622, factorUnit: 'tCO2/kNm3', timeRange: '2026-07-01 至 07-31', evidenceCount: 1, anomaly: 12.4, owner: '热力站', status: '待核验', revision: 1 }
];

const defaultFindings: Finding[] = [
  { id: 'F-104', recordId: 'ACT-0337', type: '缺失证据', title: '缺少天然气流量计校验证书', detail: '计量记录已提交，但校准有效期证明不足。', assignee: '热力站 · 韩跃', due: '09-30', status: '开放', stale: false, pendingReview: false },
  { id: 'F-105', recordId: 'ACT-0325', type: '异常波动', title: '柴油消耗较上期上升 18.6%', detail: '项目方尚未说明测试运行时长变化。', assignee: '设备保障部 · 姜婷', due: '10-02', status: '补证中', stale: false, pendingReview: false },
  { id: 'F-106', recordId: 'ACT-0318', type: '单位不一致', title: '原始表单位为 MWh，台账记录为 kWh', detail: '需补充单位换算链并保留原始记录。', assignee: '项目现场 · 徐璐', due: '09-30', status: '开放', stale: false, pendingReview: false }
];

// 本地修订：已生效版本，作为对账链的现场侧依据
const defaultRevisions: Revision[] = [
  { id: 'REV-0318-3', recordId: 'ACT-0318', baseSnapshotId: 'SNP-ACT-0318-V3', baseVersion: 3, value: 428650, unit: 'kWh', reason: '电表 E-17 结算读数 × 倍率 1.0', actor: '徐璐', submittedAt: '2026-09-28T14:20:00+08:00', batchNo: 'B-SEED', status: '已生效' },
  { id: 'REV-0321-2', recordId: 'ACT-0321', baseSnapshotId: 'SNP-ACT-0321-V2', baseVersion: 2, value: 2038.4, unit: 'GJ', reason: '蒸汽流量计累计读数复核', actor: '沈楠', submittedAt: '2026-09-27T09:00:00+08:00', batchNo: 'B-SEED', status: '已生效' },
  { id: 'REV-0325-5', recordId: 'ACT-0325', baseSnapshotId: 'SNP-ACT-0325-V4', baseVersion: 4, value: 1890, unit: 'L', reason: '测试运行延长 4 小时，柴油消耗上调', actor: '韩跃', submittedAt: '2026-09-29T10:05:00+08:00', batchNo: 'B-SEED', status: '已生效' },
  { id: 'REV-0331-1', recordId: 'ACT-0331', baseSnapshotId: 'SNP-ACT-0331-V1', baseVersion: 1, value: 182460, unit: 'kWh', reason: '光伏结算单确认', actor: '徐璐', submittedAt: '2026-09-26T16:30:00+08:00', batchNo: 'B-SEED', status: '已生效' },
  { id: 'REV-0337-1', recordId: 'ACT-0337', baseSnapshotId: 'SNP-ACT-0337-V1', baseVersion: 1, value: 62.8, unit: 'kNm3', reason: '天然气工况流量换算', actor: '韩跃', submittedAt: '2026-09-25T11:00:00+08:00', batchNo: 'B-SEED', status: '已生效' }
];

const defaultChecks: IssuanceCheck[] = [
  { id: 'evidence', title: '证据与计算链完整', detail: '活动数据、排放因子、来源证据与修订说明可追溯。', checked: false, stale: false },
  { id: 'calculation', title: '计算过程复核通过', detail: '单位和换算系数一致，关键公式由核验员确认。', checked: true, stale: false },
  { id: 'revisions', title: '历史修订未覆盖原始数据', detail: '所有数据均有版本号和修订原因。', checked: true, stale: false },
  { id: 'methodology', title: '方法学与监测计划匹配', detail: '项目采用 CMS-052-V01。', checked: false, stale: false }
];

// 简易字符串哈希，用于批次失败点的确定性选择
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

type State = {
  records: CarbonRecord[];
  findings: Finding[];
  selectedRecordId: string;
  sampledIds: string[];
  snapshots: Snapshot[];
  revisions: Revision[];
  batches: Batch[];
  issuanceChecks: IssuanceCheck[];
  snapshotIngested: boolean;
  selectRecord: (id: string) => void;
  toggleSample: (id: string) => void;
  startCorrection: (id: string) => void;
  verifyRecord: (id: string) => void;
  batchVerify: () => void;
  requestEvidence: (findingId: string) => void;
  closeFinding: (findingId: string) => void;
  toggleCheck: (id: string) => void;
  recomputeFinding: (findingId: string) => void;
  recomputeCheck: (id: string) => void;
  resolveConflict: (findingId: string) => void;
  ingestSnapshots: (snapshots: Snapshot[]) => void;
  submitRevision: (recordId: string, value: number, reason: string, actor: string, opts?: { asConflict?: boolean }) => void;
  simulateConcurrentSubmit: (recordId: string) => void;
  runBatch: (recordIds: string[], actor: string, reason: string) => void;
  resumeBatch: (batchNo: string) => void;
};

// 取记录当前已生效的本地修订
export function effectiveRevision(revisions: Revision[], recordId: string): Revision | undefined {
  return revisions.find((r) => r.recordId === recordId && r.status === '已生效');
}

// 取记录对应的正式快照
export function snapshotFor(snapshots: Snapshot[], recordId: string): Snapshot | undefined {
  return snapshots.find((s) => s.recordId === recordId);
}

export const useCarbonStore = create<State>()(
  persist(
    (set, get) => ({
      records: defaultRecords,
      findings: defaultFindings,
      selectedRecordId: 'ACT-0318',
      sampledIds: ['ACT-0318', 'ACT-0337'],
      snapshots: [],
      revisions: defaultRevisions,
      batches: [],
      issuanceChecks: defaultChecks,
      snapshotIngested: false,

      selectRecord: (id) => set({ selectedRecordId: id }),
      toggleSample: (id) => set((state) => ({ sampledIds: state.sampledIds.includes(id) ? state.sampledIds.filter((item) => item !== id) : [...state.sampledIds, id] })),
      startCorrection: (id) => set((state) => ({ records: state.records.map((record) => record.id === id ? { ...record, status: '复核中' } : record) })),
      verifyRecord: (id) => set((state) => ({ records: state.records.map((record) => record.id === id ? { ...record, status: '已核验' } : record) })),
      batchVerify: () => set((state) => ({ records: state.records.map((record) => state.sampledIds.includes(record.id) && record.status !== '需补证' ? { ...record, status: '已核验' } : record) })),
      requestEvidence: (findingId) => set((state) => ({ findings: state.findings.map((finding) => finding.id === findingId ? { ...finding, status: '补证中' } : finding) })),
      closeFinding: (findingId) => set((state) => ({ findings: state.findings.map((finding) => finding.id === findingId ? { ...finding, status: '已关闭', pendingReview: false } : finding) })),

      toggleCheck: (id) => set((state) => ({
        issuanceChecks: state.issuanceChecks.map((check) => check.id === id ? { ...check, checked: !check.checked } : check)
      })),

      // 失效重算：复核后清除失效标记
      recomputeFinding: (findingId) => set((state) => ({
        findings: state.findings.map((finding) => finding.id === findingId ? { ...finding, stale: false, staleReason: undefined, pendingReview: false } : finding)
      })),
      recomputeCheck: (id) => set((state) => ({
        issuanceChecks: state.issuanceChecks.map((check) => check.id === id ? { ...check, stale: false, invalidatedBy: undefined } : check)
      })),

      // 冲突解决：关闭对账冲突项（需两边值均已复核）
      resolveConflict: (findingId) => set((state) => ({
        findings: state.findings.map((finding) => finding.id === findingId && finding.type === '对账冲突' ? { ...finding, status: '已关闭', pendingReview: false } : finding)
      })),

      // 补发读数入账：按编号 + 版本匹配。本地修订存在则保留两边值及换算依据，
      // 冲突写进发现项，不用快照盖掉现场内容。
      ingestSnapshots: (snapshots) => set((state) => {
        const newFindings = [...state.findings];
        for (const snap of snapshots) {
          const local = effectiveRevision(state.revisions, snap.recordId);
          if (local && local.value !== snap.activity) {
            const exists = newFindings.some((f) => f.type === '对账冲突' && f.snapshotId === snap.id && f.status !== '已关闭');
            if (!exists) {
              newFindings.push({
                id: `F-CONF-${snap.recordId}`,
                recordId: snap.recordId,
                type: '对账冲突',
                title: '补发读数与现场修订不一致',
                detail: `正式快照 ${snap.id} 活动数据 ${snap.activity.toLocaleString()} ${snap.unit}（换算依据：${snap.conversionBasis}）；现场修订 V${local.baseVersion} 为 ${local.value.toLocaleString()} ${local.unit}（${local.actor}：${local.reason}）。两边值均保留，待核验员复核。`,
                assignee: '项目现场 · 徐璐',
                due: '10-03',
                status: '开放',
                stale: false,
                pendingReview: true,
                snapshotId: snap.id,
                localRevisionId: local.id
              });
            }
          }
        }
        return { snapshots, findings: newFindings, snapshotIngested: true };
      }),

      // 提交修订：正常流程 supersede 旧版本；asConflict 时内容留作冲突（先到生效，后到冲突）
      submitRevision: (recordId, value, reason, actor, opts) => set((state) => {
        const record = state.records.find((r) => r.id === recordId);
        const local = effectiveRevision(state.revisions, recordId);
        const snap = snapshotFor(state.snapshots, recordId);
        const batchNo = `B-${Date.now().toString(36).toUpperCase()}`;
        const newRev: Revision = {
          id: `REV-${recordId}-${Date.now()}`,
          recordId,
          baseSnapshotId: local?.baseSnapshotId ?? snap?.id ?? '',
          baseVersion: local?.baseVersion ?? record?.revision ?? 1,
          value,
          unit: record?.unit ?? '',
          reason,
          actor,
          submittedAt: new Date().toISOString(),
          batchNo,
          status: '已生效'
        };

        if (opts?.asConflict) {
          newRev.status = '冲突';
          newRev.conflictWith = local?.id;
          const conflictFinding: Finding = {
            id: `F-CONF-${recordId}-${Date.now()}`,
            recordId,
            type: '对账冲突',
            title: `修订提交冲突：${recordId} 已有生效版本`,
            detail: `${actor} 提交的修订（${value.toLocaleString()} ${record?.unit}）与已生效版本 V${local?.baseVersion}（${local?.value.toLocaleString()} ${local?.unit}，${local?.actor}：${local?.reason}）冲突。先到版本已生效，后到内容留作冲突，待复核。`,
            assignee: actor,
            due: '10-03',
            status: '开放',
            stale: false,
            pendingReview: true,
            conflictRevisionId: newRev.id
          };
          return {
            revisions: [...state.revisions, newRev],
            findings: [...state.findings, conflictFinding]
          };
        }

        // 正常生效：归档旧版本，活动数据更新，相关发现项与签发检查失效重算
        const newFindings = state.findings.map((f) => f.recordId === recordId
          ? { ...f, stale: true, staleReason: `活动数据已更新至 V${(record?.revision ?? 0) + 1}` }
          : f);
        const newChecks = state.issuanceChecks.map((c) => ({
          ...c,
          stale: true,
          invalidatedBy: `${recordId} V${(record?.revision ?? 0) + 1}`
        }));
        const newRevisions = state.revisions.map((r) => r.recordId === recordId && r.status === '已生效' ? { ...r, status: '已归档' as const } : r);
        return {
          revisions: [...newRevisions, newRev],
          records: state.records.map((r) => r.id === recordId ? { ...r, activity: value, revision: r.revision + 1, status: '复核中' as const } : r),
          findings: newFindings,
          issuanceChecks: newChecks
        };
      }),

      // 两名核验员同时提交：先到生效，后到内容留作冲突
      simulateConcurrentSubmit: async (recordId) => {
        const state = get();
        const record = state.records.find((r) => r.id === recordId);
        const snap = snapshotFor(state.snapshots, recordId);
        const base = snap?.activity ?? record?.activity ?? 0;
        const v1 = base;
        const v2 = Math.round(base * 1.02 * 100) / 100;
        // 模拟网络延迟，两人同时点下提交
        await new Promise((resolve) => setTimeout(resolve, 400));
        get().submitRevision(recordId, v1, '并发先到：按补发读数确认', '沈楠');
        await new Promise((resolve) => setTimeout(resolve, 60));
        get().submitRevision(recordId, v2, '并发后到：现场表计有 2% 上浮', '韩跃', { asConflict: true });
      },

      // 批量写入修订：按批次号推进，失败后记录已完成编号，可恢复
      runBatch: (recordIds, actor, reason) => set((state) => {
        const batchNo = `B-${Date.now().toString(36).toUpperCase()}`;
        const failIndex = recordIds.length > 1 ? hashCode(batchNo) % recordIds.length : -1;
        const batch: Batch = {
          batchNo,
          recordIds,
          completedIds: [],
          failedId: null,
          status: '进行中',
          actor,
          startedAt: new Date().toISOString()
        };
        let revisions = [...state.revisions];
        let records = [...state.records];
        let findings = [...state.findings];
        let checks = [...state.issuanceChecks];
        const completedIds: string[] = [];
        let failedId: string | null = null;

        for (let i = 0; i < recordIds.length; i++) {
          const id = recordIds[i];
          // 幂等：本批次已完成或已有批次写入记录的编号不重复写入
          if (completedIds.includes(id)) continue;
          if (revisions.some((r) => r.recordId === id && r.batchNo === batchNo)) {
            completedIds.push(id);
            continue;
          }
          if (i === failIndex) {
            failedId = id;
            break;
          }
          const record = records.find((r) => r.id === id);
          const snap = snapshotFor(state.snapshots, id);
          const value = snap?.activity ?? record?.activity ?? 0;
          const local = effectiveRevision(revisions, id);
          const newRev: Revision = {
            id: `REV-${id}-${Date.now()}-${i}`,
            recordId: id,
            baseSnapshotId: local?.baseSnapshotId ?? snap?.id ?? '',
            baseVersion: local?.baseVersion ?? record?.revision ?? 1,
            value,
            unit: record?.unit ?? '',
            reason,
            actor,
            submittedAt: new Date().toISOString(),
            batchNo,
            status: '已生效'
          };
          revisions = revisions.map((r) => r.recordId === id && r.status === '已生效' ? { ...r, status: '已归档' as const } : r);
          revisions = [...revisions, newRev];
          records = records.map((r) => r.id === id ? { ...r, activity: value, revision: r.revision + 1, status: '复核中' as const } : r);
          findings = findings.map((f) => f.recordId === id ? { ...f, stale: true, staleReason: `活动数据已更新至 V${(record?.revision ?? 0) + 1}` } : f);
          checks = checks.map((c) => ({ ...c, stale: true, invalidatedBy: `${id} V${(record?.revision ?? 0) + 1}` }));
          completedIds.push(id);
        }

        const updatedBatch: Batch = {
          ...batch,
          completedIds,
          failedId,
          status: failedId ? '进行中' : '已完成'
        };
        return {
          batches: [...state.batches, updatedBatch],
          revisions,
          records,
          findings,
          issuanceChecks: checks
        };
      }),

      // 批次恢复：从失败编号继续，已完成编号不重复
      resumeBatch: (batchNo) => set((state) => {
        const batch = state.batches.find((b) => b.batchNo === batchNo);
        if (!batch || batch.status === '已完成') return state;
        let revisions = [...state.revisions];
        let records = [...state.records];
        let findings = [...state.findings];
        let checks = [...state.issuanceChecks];
        const completedIds = [...batch.completedIds];
        let failedId: string | null = null;

        for (const id of batch.recordIds) {
          if (completedIds.includes(id)) continue;
          if (revisions.some((r) => r.recordId === id && r.batchNo === batchNo)) {
            completedIds.push(id);
            continue;
          }
          const record = records.find((r) => r.id === id);
          const snap = snapshotFor(state.snapshots, id);
          const value = snap?.activity ?? record?.activity ?? 0;
          const local = effectiveRevision(revisions, id);
          const newRev: Revision = {
            id: `REV-${id}-${Date.now()}-r`,
            recordId: id,
            baseSnapshotId: local?.baseSnapshotId ?? snap?.id ?? '',
            baseVersion: local?.baseVersion ?? record?.revision ?? 1,
            value,
            unit: record?.unit ?? '',
            reason: `${batch.actor}：批次 ${batchNo} 恢复写入`,
            actor: batch.actor,
            submittedAt: new Date().toISOString(),
            batchNo,
            status: '已生效'
          };
          revisions = revisions.map((r) => r.recordId === id && r.status === '已生效' ? { ...r, status: '已归档' as const } : r);
          revisions = [...revisions, newRev];
          records = records.map((r) => r.id === id ? { ...r, activity: value, revision: r.revision + 1, status: '复核中' as const } : r);
          findings = findings.map((f) => f.recordId === id ? { ...f, stale: true, staleReason: `活动数据已更新至 V${(record?.revision ?? 0) + 1}` } : f);
          checks = checks.map((c) => ({ ...c, stale: true, invalidatedBy: `${id} V${(record?.revision ?? 0) + 1}` }));
          completedIds.push(id);
        }

        const updatedBatch: Batch = {
          ...batch,
          completedIds,
          failedId,
          status: '已完成'
        };
        return {
          batches: state.batches.map((b) => b.batchNo === batchNo ? updatedBatch : b),
          revisions,
          records,
          findings,
          issuanceChecks: checks
        };
      })
    }),
    { name: 'yy60-carbon-evidence-v2' }
  )
);
