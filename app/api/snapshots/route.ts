import { NextResponse } from 'next/server';
import { snapshotResponseSchema } from '@/lib/schema';

// 园区补发读数后形成的正式证据快照批次，按记录编号与版本与现场数据对账
const data = {
  batchId: 'BATCH-YQ-2026Q3-02',
  snapshots: [
    { id: 'SNAP-0318-V3', recordId: 'ACT-0318', revision: 3, activity: 428650, unit: 'kWh', conversionNote: '园区结算电表读数，与现场台账同源，无需换算', batchId: 'BATCH-YQ-2026Q3-02', issuer: '园区能源管理科', issuedAt: '2026-10-02T09:30:00+08:00' },
    { id: 'SNAP-0321-V2', recordId: 'ACT-0321', revision: 2, activity: 2038.4, unit: 'GJ', conversionNote: '蒸汽热量按焓值折算，与现场口径一致', batchId: 'BATCH-YQ-2026Q3-02', issuer: '园区能源管理科', issuedAt: '2026-10-02T09:30:00+08:00' },
    { id: 'SNAP-0325-V4', recordId: 'ACT-0325', revision: 4, activity: 1902, unit: 'L', conversionNote: '按加油机累计读数补发，密度 0.84 kg/L 换算复核', batchId: 'BATCH-YQ-2026Q3-02', issuer: '园区能源管理科', issuedAt: '2026-10-02T09:30:00+08:00' },
    { id: 'SNAP-0331-V2', recordId: 'ACT-0331', revision: 2, activity: 181205, unit: 'kWh', conversionNote: '逆变器交流侧读数，含 0.7% 线损修正', batchId: 'BATCH-YQ-2026Q3-02', issuer: '园区能源管理科', issuedAt: '2026-10-02T09:30:00+08:00' },
    { id: 'SNAP-0337-V1', recordId: 'ACT-0337', revision: 1, activity: 62.8, unit: 'kNm3', conversionNote: '标况流量直接采用，与现场口径一致', batchId: 'BATCH-YQ-2026Q3-02', issuer: '园区能源管理科', issuedAt: '2026-10-02T09:30:00+08:00' }
  ]
};

export async function GET() {
  return NextResponse.json(snapshotResponseSchema.parse(data));
}
