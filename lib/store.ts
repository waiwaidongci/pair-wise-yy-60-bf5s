import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchSnapshotBatch, submitRevisionBatch } from './api';

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

// 园区补发的正式证据快照：按记录编号 + 版本与现场数据匹配
export type Snapshot = {
  id: string;
  recordId: string;
  revision: number;
  activity: number;
  unit: string;
  conversionNote: string;
  batchId: string;
  issuer: string;
  issuedAt: string;
};

// 核验员本地修订：先到生效，后到内容留作冲突
export type LocalRevision = {
  id: string;
  recordId: string;
  revision: number;
  baseRevision: number;
  activity: number;
  reason: string;
  actor: string;
  submittedAt: string;
  status: '生效' | '冲突';
};

// 冲突两边值与换算依据均保留，不用快照盖掉现场内容
export type ConflictInfo = {
  kind: '快照对账' | '核验员冲突';
  snapshotId?: string;
  officialLabel: string;
  officialValue: number;
  officialUnit: string;
  localLabel: string;
  localValue: number;
  localUnit: string;
  conversionNote: string;
};

export type Finding = {
  id: string;
  recordId: string;
  type: '缺失证据' | '单位不一致' | '时间范围' | '异常波动' | '对账冲突';
  title: string;
  detail: string;
  assignee: string;
  due: string;
  status: '开放' | '补证中' | '待复核' | '已关闭';
  basisRevision: number;
  invalidatedBy?: string;
  conflict?: ConflictInfo;
};

export type IssuanceCheckState = {
  checked: boolean;
  invalidatedBy?: string;
};

export type BatchItem = {
  recordId: string;
  revision: number;
  activity: number;
  reason: string;
  actor: string;
};

export type BatchState = {
  batchId: string;
  items: BatchItem[];
  confirmed: string[];
  skipped: string[];
  failed: string[];
  status: '写入中' | '部分失败' | '已确认';
};

const defaultRecords: CarbonRecord[] = [
  { id: 'ACT-0318', source: '电表 E-17 / 四号压缩机组', activity: 428650, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 4, anomaly: 2.3, owner: '项目现场 O2', status: '复核中', revision: 3 },
  { id: 'ACT-0321', source: '蒸汽流量计 ST-04', activity: 2038.4, unit: 'GJ', factor: 0.1100, factorUnit: 'tCO2/GJ', timeRange: '2026-07-01 至 07-31', evidenceCount: 3, anomaly: 0, owner: '能源中心', status: '已核验', revision: 2 },
  { id: 'ACT-0325', source: '柴油消耗台账 / 应急泵', activity: 1846, unit: 'L', factor: 2.6800, factorUnit: 'kgCO2/L', timeRange: '2026-07-01 至 07-31', evidenceCount: 2, anomaly: 8.6, owner: '设备保障部', status: '需补证', revision: 4 },
  { id: 'ACT-0331', source: '光伏逆变器阵列 PV-2', activity: 182460, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 5, anomaly: -1.2, owner: '新能源运维', status: '已核验', revision: 1 },
  { id: 'ACT-0337', source: '天然气流量计 NG-02', activity: 62.8, unit: 'kNm3', factor: 2.1622, factorUnit: 'tCO2/kNm3', timeRange: '2026-07-01 至 07-31', evidenceCount: 1, anomaly: 12.4, owner: '热力站', status: '待核验', revision: 1 }
];

const defaultFindings: Finding[] = [
  { id: 'F-104', recordId: 'ACT-0337', type: '缺失证据', title: '缺少天然气流量计校验证书', detail: '计量记录已提交，但校准有效期证明不足。', assignee: '热力站 · 韩跃', due: '09-30', status: '开放', basisRevision: 1 },
  { id: 'F-105', recordId: 'ACT-0325', type: '异常波动', title: '柴油消耗较上期上升 18.6%', detail: '项目方尚未说明测试运行时长变化。', assignee: '设备保障部 · 姜婷', due: '10-02', status: '补证中', basisRevision: 4 },
  { id: 'F-106', recordId: 'ACT-0318', type: '单位不一致', title: '原始表单位为 MWh，台账记录为 kWh', detail: '需补充单位换算链并保留原始记录。', assignee: '项目现场 · 徐璐', due: '09-30', status: '开放', basisRevision: 3 }
];

const defaultIssuanceChecks: Record<string, IssuanceCheckState> = {
  evidence: { checked: false },
  calculation: { checked: true },
  revisions: { checked: true },
  methodology: { checked: false }
};

// 活动数据一更新：相关发现项失效待复核，相关签发检查失效重算，并记录失效来源
function invalidateAfterUpdate(
  findings: Finding[],
  issuanceChecks: Record<string, IssuanceCheckState>,
  recordId: string,
  newRevision: number
) {
  const source = `${recordId} 活动数据更新至 V${newRevision}`;
  const nextFindings = findings.map((finding) =>
    finding.recordId === recordId && finding.status !== '已关闭'
      ? { ...finding, status: '待复核' as const, invalidatedBy: source }
      : finding
  );
  const nextChecks: Record<string, IssuanceCheckState> = {};
  for (const [key, check] of Object.entries(issuanceChecks)) {
    nextChecks[key] = (key === 'evidence' || key === 'calculation') && check.checked
      ? { checked: false, invalidatedBy: source }
      : check;
  }
  return { findings: nextFindings, issuanceChecks: nextChecks };
}

const nextFindingId = (findings: Finding[]) =>
  `F-${Math.max(100, ...findings.map((finding) => Number(finding.id.replace(/^F-/, '')) || 0)) + 1}`;

export type ReconState = '待对账' | '吻合' | '冲突' | '偏差已确认';

// 对账链：快照按编号与版本匹配；有未清冲突即为冲突；值与版本一致为吻合；其余为已确认偏差
export function getRecordRecon(record: CarbonRecord, snapshots: Snapshot[], findings: Finding[]) {
  const snapshot = snapshots
    .filter((item) => item.recordId === record.id)
    .sort((a, b) => b.revision - a.revision)[0];
  const openConflict = findings.find(
    (finding) => finding.recordId === record.id && finding.type === '对账冲突' && finding.status !== '已关闭'
  );
  const state: ReconState = !snapshot
    ? '待对账'
    : openConflict
      ? '冲突'
      : snapshot.activity === record.activity && snapshot.revision === record.revision
        ? '吻合'
        : '偏差已确认';
  return { snapshot, openConflict, state };
}

export function getLatestEffectiveRevision(recordId: string, revisions: LocalRevision[]) {
  return revisions
    .filter((item) => item.recordId === recordId && item.status === '生效')
    .sort((a, b) => b.revision - a.revision)[0];
}

type State = {
  records: CarbonRecord[];
  findings: Finding[];
  snapshots: Snapshot[];
  localRevisions: LocalRevision[];
  selectedRecordId: string;
  sampledIds: string[];
  issuanceChecks: Record<string, IssuanceCheckState>;
  pendingSync: BatchItem[];
  batch: BatchState | null;
  batchSeq: number;
  snapshotBatchId: string | null;
  selectRecord: (id: string) => void;
  toggleSample: (id: string) => void;
  startCorrection: (id: string) => void;
  verifyRecord: (id: string) => void;
  batchVerify: () => void;
  requestEvidence: (findingId: string) => void;
  closeFinding: (findingId: string) => void;
  revalidateFinding: (findingId: string) => void;
  toggleIssuanceCheck: (id: string) => void;
  reviseValue: (id: string, value: number, reason: string, actor: string, baseRevision: number) => void;
  simulateConcurrentRevision: (id: string) => void;
  importSnapshots: () => Promise<void>;
  submitBatch: () => Promise<void>;
  recoverBatch: () => Promise<void>;
  resolveConflict: (findingId: string, useOfficial: boolean) => void;
};

export const useCarbonStore = create<State>()(
  persist(
    (set, get) => ({
      records: defaultRecords,
      findings: defaultFindings,
      snapshots: [],
      localRevisions: [],
      selectedRecordId: 'ACT-0318',
      sampledIds: ['ACT-0318', 'ACT-0337'],
      issuanceChecks: defaultIssuanceChecks,
      pendingSync: [],
      batch: null,
      batchSeq: 1,
      snapshotBatchId: null,
      selectRecord: (id) => set({ selectedRecordId: id }),
      toggleSample: (id) => set((state) => ({ sampledIds: state.sampledIds.includes(id) ? state.sampledIds.filter((item) => item !== id) : [...state.sampledIds, id] })),
      startCorrection: (id) => set((state) => ({ records: state.records.map((record) => record.id === id ? { ...record, status: '复核中' } : record) })),
      verifyRecord: (id) => set((state) => ({ records: state.records.map((record) => record.id === id ? { ...record, status: '已核验' } : record) })),
      batchVerify: () => set((state) => ({ records: state.records.map((record) => state.sampledIds.includes(record.id) && record.status !== '需补证' ? { ...record, status: '已核验' } : record) })),
      requestEvidence: (findingId) => set((state) => ({ findings: state.findings.map((finding) => finding.id === findingId ? { ...finding, status: '补证中' } : finding) })),
      closeFinding: (findingId) => set((state) => ({ findings: state.findings.map((finding) => finding.id === findingId ? { ...finding, status: '已关闭' } : finding) })),
      revalidateFinding: (findingId) => set((state) => {
        const finding = state.findings.find((item) => item.id === findingId);
        if (!finding || finding.status !== '待复核') return state;
        const record = state.records.find((item) => item.id === finding.recordId);
        return {
          findings: state.findings.map((item) => item.id === findingId
            ? { ...item, status: '开放' as const, basisRevision: record?.revision ?? item.basisRevision, invalidatedBy: undefined }
            : item)
        };
      }),
      toggleIssuanceCheck: (id) => set((state) => {
        const current = state.issuanceChecks[id] ?? { checked: false };
        return { issuanceChecks: { ...state.issuanceChecks, [id]: { checked: !current.checked, invalidatedBy: undefined } } };
      }),
      reviseValue: (id, value, reason, actor, baseRevision) => set((state) => {
        const record = state.records.find((item) => item.id === id);
        if (!record) return state;
        const submittedAt = new Date().toISOString();

        if (baseRevision < record.revision) {
          // 另一核验员已先行提交生效：后到内容留作冲突，不覆盖现场值
          const lateRevision: LocalRevision = {
            id: `REV-${id}-V${record.revision + 1}-LATE`,
            recordId: id,
            revision: record.revision + 1,
            baseRevision,
            activity: value,
            reason,
            actor,
            submittedAt,
            status: '冲突'
          };
          const conflictFinding: Finding = {
            id: nextFindingId(state.findings),
            recordId: id,
            type: '对账冲突',
            title: `${id} 两名核验员提交冲突`,
            detail: `${actor} 基于 V${baseRevision} 提交 ${value.toLocaleString()} ${record.unit}，但已有核验员先将数据更新至 V${record.revision}。先到内容生效，后到内容留作冲突待裁决。`,
            assignee: '核验组长 · 沈楠',
            due: '10-05',
            status: '开放',
            basisRevision: record.revision,
            conflict: {
              kind: '核验员冲突',
              officialLabel: `先生效修订 V${record.revision}`,
              officialValue: record.activity,
              officialUnit: record.unit,
              localLabel: `后到提交（${actor}）`,
              localValue: value,
              localUnit: record.unit,
              conversionNote: reason
            }
          };
          return {
            localRevisions: [...state.localRevisions, lateRevision],
            findings: [...state.findings, conflictFinding]
          };
        }

        // 先到生效：应用修订并级联失效相关发现项与签发检查
        const newRevision = record.revision + 1;
        const effectiveRevision: LocalRevision = {
          id: `REV-${id}-V${newRevision}`,
          recordId: id,
          revision: newRevision,
          baseRevision,
          activity: value,
          reason,
          actor,
          submittedAt,
          status: '生效'
        };
        const invalidated = invalidateAfterUpdate(state.findings, state.issuanceChecks, id, newRevision);
        return {
          records: state.records.map((item) => item.id === id ? { ...item, activity: value, revision: newRevision, status: '复核中' as const } : item),
          localRevisions: [...state.localRevisions, effectiveRevision],
          pendingSync: [...state.pendingSync, { recordId: id, revision: newRevision, activity: value, reason, actor }],
          findings: invalidated.findings,
          issuanceChecks: invalidated.issuanceChecks
        };
      }),
      simulateConcurrentRevision: (id) => set((state) => {
        const record = state.records.find((item) => item.id === id);
        if (!record) return state;
        const actor = '韩跃';
        const reason = '并发提交模拟：另一核验员先行完成修订';
        const value = Math.round(record.activity * 1.01 * 100) / 100;
        const newRevision = record.revision + 1;
        const invalidated = invalidateAfterUpdate(state.findings, state.issuanceChecks, id, newRevision);
        return {
          records: state.records.map((item) => item.id === id ? { ...item, activity: value, revision: newRevision, status: '复核中' as const } : item),
          localRevisions: [...state.localRevisions, { id: `REV-${id}-V${newRevision}`, recordId: id, revision: newRevision, baseRevision: record.revision, activity: value, reason, actor, submittedAt: new Date().toISOString(), status: '生效' as const }],
          pendingSync: [...state.pendingSync, { recordId: id, revision: newRevision, activity: value, reason, actor }],
          findings: invalidated.findings,
          issuanceChecks: invalidated.issuanceChecks
        };
      }),
      importSnapshots: async () => {
        const payload = await fetchSnapshotBatch();
        set((state) => {
          const incoming = payload.snapshots.filter((snap) => !state.snapshots.some((existing) => existing.id === snap.id));
          if (incoming.length === 0) return { snapshotBatchId: payload.batchId };
          const newFindings: Finding[] = [];
          let findingSeq = Math.max(100, ...state.findings.map((finding) => Number(finding.id.replace(/^F-/, '')) || 0));
          for (const snap of incoming) {
            const record = state.records.find((item) => item.id === snap.recordId);
            if (!record) continue;
            const matched = snap.revision === record.revision && snap.activity === record.activity;
            const alreadyFiled = state.findings.some((finding) =>
              finding.recordId === snap.recordId && finding.type === '对账冲突' && finding.status !== '已关闭' && finding.conflict?.snapshotId === snap.id
            );
            if (matched || alreadyFiled) continue;
            // 本地修订存在：两边值及换算依据均保留，冲突写进发现项，不用快照盖掉现场内容
            findingSeq += 1;
            newFindings.push({
              id: `F-${findingSeq}`,
              recordId: snap.recordId,
              type: '对账冲突',
              title: `${snap.recordId} 快照与现场值不一致`,
              detail: `园区补发快照 ${snap.id}（V${snap.revision}）为 ${snap.activity.toLocaleString()} ${snap.unit}，现场 V${record.revision} 为 ${record.activity.toLocaleString()} ${record.unit}。两边值与换算依据均保留，快照未覆盖现场内容。`,
              assignee: `${record.owner} · 待分配`,
              due: '10-06',
              status: '开放',
              basisRevision: record.revision,
              conflict: {
                kind: '快照对账',
                snapshotId: snap.id,
                officialLabel: `园区快照 ${snap.id} · V${snap.revision}`,
                officialValue: snap.activity,
                officialUnit: snap.unit,
                localLabel: `现场修订 V${record.revision}`,
                localValue: record.activity,
                localUnit: record.unit,
                conversionNote: snap.conversionNote
              }
            });
          }
          return {
            snapshots: [...state.snapshots, ...incoming],
            findings: [...state.findings, ...newFindings],
            snapshotBatchId: payload.batchId
          };
        });
      },
      submitBatch: async () => {
        const { pendingSync, batchSeq } = get();
        if (pendingSync.length === 0) return;
        const batchId = `BATCH-QR-${String(batchSeq).padStart(3, '0')}`;
        const items = pendingSync;
        set((state) => ({
          pendingSync: [],
          batchSeq: state.batchSeq + 1,
          batch: { batchId, items, confirmed: [], skipped: [], failed: [], status: '写入中' }
        }));
        const submission = await submitRevisionBatch({ batchId, resume: false, items });
        set((state) => {
          if (!state.batch || state.batch.batchId !== batchId) return state;
          if (submission.ok) {
            return { batch: { ...state.batch, confirmed: submission.result.confirmed, skipped: submission.result.skipped, failed: [], status: '已确认' } };
          }
          if (submission.partial) {
            return { batch: { ...state.batch, confirmed: submission.partial.confirmed, skipped: submission.partial.skipped, failed: submission.partial.failed, status: '部分失败' } };
          }
          return { batch: { ...state.batch, failed: items.map((item) => item.recordId), status: '部分失败' } };
        });
      },
      recoverBatch: async () => {
        const { batch } = get();
        if (!batch || batch.status === '已确认') return;
        // 按批次号恢复：服务端按已完成编号跳过，已确认记录不重复
        const submission = await submitRevisionBatch({ batchId: batch.batchId, resume: true, items: batch.items });
        if (!submission.ok && !submission.partial) return;
        const result = submission.ok ? submission.result : submission.partial;
        if (!result) return;
        set((state) => {
          if (!state.batch || state.batch.batchId !== batch.batchId) return state;
          const confirmed = Array.from(new Set([...state.batch.confirmed, ...result.confirmed]));
          return { batch: { ...state.batch, confirmed, skipped: result.skipped, failed: result.failed, status: result.failed.length === 0 ? '已确认' : '部分失败' } };
        });
      },
      resolveConflict: (findingId, useOfficial) => set((state) => {
        const finding = state.findings.find((item) => item.id === findingId);
        if (!finding || !finding.conflict || finding.status === '已关闭') return state;
        const record = state.records.find((item) => item.id === finding.recordId);
        if (!record) return state;
        const conflict = finding.conflict;
        const resolution = useOfficial ? `裁决：采用${conflict.officialLabel}` : `裁决：采用${conflict.localLabel}`;
        const closedFindings = state.findings.map((item) => item.id === findingId
          ? { ...item, status: '已关闭' as const, detail: `${item.detail} ${resolution}。` }
          : item);

        // 快照对账采用快照值、核验员冲突采用后到值时，需把另一侧值落为新的活动数据版本
        const shouldApply = (conflict.kind === '快照对账' && useOfficial) || (conflict.kind === '核验员冲突' && !useOfficial);
        if (!shouldApply) return { findings: closedFindings };

        const appliedValue = conflict.kind === '快照对账' ? conflict.officialValue : conflict.localValue;
        const newRevision = record.revision + 1;
        const reason = `对账冲突 ${finding.id} 裁决落值`;
        const invalidated = invalidateAfterUpdate(closedFindings, state.issuanceChecks, record.id, newRevision);
        return {
          records: state.records.map((item) => item.id === record.id ? { ...item, activity: appliedValue, revision: newRevision, status: '复核中' as const } : item),
          localRevisions: [...state.localRevisions, { id: `REV-${record.id}-V${newRevision}`, recordId: record.id, revision: newRevision, baseRevision: record.revision, activity: appliedValue, reason, actor: '核验组长 · 沈楠', submittedAt: new Date().toISOString(), status: '生效' as const }],
          pendingSync: [...state.pendingSync, { recordId: record.id, revision: newRevision, activity: appliedValue, reason, actor: '核验组长 · 沈楠' }],
          findings: invalidated.findings,
          issuanceChecks: invalidated.issuanceChecks
        };
      })
    }),
    { name: 'yy60-carbon-recon' }
  )
);
