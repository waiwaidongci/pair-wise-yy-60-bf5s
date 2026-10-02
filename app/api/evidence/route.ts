import { NextResponse } from 'next/server';
import { evidenceResponseSchema } from '@/lib/schema';

const data = {
  project: {
    id: 'CN-ER-2026-041',
    name: '临港工业园区能效提升项目',
    methodology: 'CMS-052-V01',
    vintage: '2026 监测年度',
    verifier: '华碳认证 · 核验组 B'
  },
  summary: {
    period: '2026 年第三监测期',
    reduction: 18426,
    evidenceRate: 92,
    openFindings: 3,
    sampled: 18
  },
  records: [
    { id: 'ACT-0318', source: '电表 E-17 / 四号压缩机组', activity: 428650, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 4, anomaly: 2.3, owner: '项目现场 O2', status: '复核中', revision: 3 },
    { id: 'ACT-0321', source: '蒸汽流量计 ST-04', activity: 2038.4, unit: 'GJ', factor: 0.1100, factorUnit: 'tCO2/GJ', timeRange: '2026-07-01 至 07-31', evidenceCount: 3, anomaly: 0, owner: '能源中心', status: '已核验', revision: 2 },
    { id: 'ACT-0325', source: '柴油消耗台账 / 应急泵', activity: 1846, unit: 'L', factor: 2.6800, factorUnit: 'kgCO2/L', timeRange: '2026-07-01 至 07-31', evidenceCount: 2, anomaly: 8.6, owner: '设备保障部', status: '需补证', revision: 4 },
    { id: 'ACT-0331', source: '光伏逆变器阵列 PV-2', activity: 182460, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', evidenceCount: 5, anomaly: -1.2, owner: '新能源运维', status: '已核验', revision: 1 },
    { id: 'ACT-0337', source: '天然气流量计 NG-02', activity: 62.8, unit: 'kNm3', factor: 2.1622, factorUnit: 'tCO2/kNm3', timeRange: '2026-07-01 至 07-31', evidenceCount: 1, anomaly: 12.4, owner: '热力站', status: '待核验', revision: 1 }
  ],
  // 正式证据快照：按编号 + 版本匹配，携带换算依据。补发读数后由此进入对账链。
  snapshots: [
    { id: 'SNP-ACT-0318-V4', recordId: 'ACT-0318', version: 4, activity: 431200, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', conversionBasis: '电表 E-17 结算读数 × 倍率 1.0（较 V3 上调 2550 kWh）', capturedAt: '2026-10-02T09:10:00+08:00' },
    { id: 'SNP-ACT-0321-V2', recordId: 'ACT-0321', version: 2, activity: 2038.4, unit: 'GJ', factor: 0.1100, factorUnit: 'tCO2/GJ', timeRange: '2026-07-01 至 07-31', conversionBasis: '蒸汽流量计 ST-04 累计读数，单位 GJ', capturedAt: '2026-10-02T09:10:00+08:00' },
    { id: 'SNP-ACT-0325-V4', recordId: 'ACT-0325', version: 4, activity: 1846, unit: 'L', factor: 2.6800, factorUnit: 'kgCO2/L', timeRange: '2026-07-01 至 07-31', conversionBasis: '柴油消耗台账 1846 L，密度 0.845 kg/L 折算', capturedAt: '2026-10-02T09:10:00+08:00' },
    { id: 'SNP-ACT-0331-V1', recordId: 'ACT-0331', version: 1, activity: 182460, unit: 'kWh', factor: 0.5568, factorUnit: 'tCO2/MWh', timeRange: '2026-07-01 至 07-31', conversionBasis: '光伏逆变器阵列 PV-2 发电量，上网电量结算单', capturedAt: '2026-10-02T09:10:00+08:00' },
    { id: 'SNP-ACT-0337-V1', recordId: 'ACT-0337', version: 1, activity: 62.8, unit: 'kNm3', factor: 2.1622, factorUnit: 'tCO2/kNm3', timeRange: '2026-07-01 至 07-31', conversionBasis: '天然气流量计 NG-02 工况流量 × 压缩系数换算', capturedAt: '2026-10-02T09:10:00+08:00' }
  ]
};

export async function GET() {
  return NextResponse.json(evidenceResponseSchema.parse(data));
}

export async function POST(request: Request) {
  const body = await request.json() as { recordId?: string; value?: number; reason?: string };
  return NextResponse.json({
    accepted: Boolean(body.recordId && body.reason && typeof body.value === 'number'),
    revision: 5,
    recordedAt: new Date().toISOString()
  });
}
