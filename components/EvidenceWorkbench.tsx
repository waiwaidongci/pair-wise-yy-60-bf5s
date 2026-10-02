'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AccountTreeOutlined,
  AssessmentOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  FactCheckOutlined,
  FindInPageOutlined,
  MenuOutlined,
  MoreHorizOutlined,
  NotificationsNoneOutlined,
  ReplayOutlined,
  ScienceOutlined,
  TaskAltOutlined
} from '@mui/icons-material';
import { fetchEvidence } from '@/lib/api';
import { getLatestEffectiveRevision, getRecordRecon, useCarbonStore, type ReconState } from '@/lib/store';

const drawerWidth = 232;

type View = 'overview' | 'verify' | 'issuance';

const reconChipColor: Record<ReconState, 'success' | 'error' | 'warning' | 'default'> = {
  吻合: 'success',
  冲突: 'error',
  偏差已确认: 'warning',
  待对账: 'default'
};

const findingChipColor = (status: string) =>
  status === '已关闭' ? 'success' as const : status === '开放' ? 'error' as const : 'warning' as const;

export default function EvidenceWorkbench({ initialView }: { initialView: View }) {
  const [view] = useState<View>(initialView);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recordFilter, setRecordFilter] = useState('全部');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionActor, setCorrectionActor] = useState('沈楠');
  const [correctionBase, setCorrectionBase] = useState(0);
  const [correctionConcurrent, setCorrectionConcurrent] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['carbon-api'], queryFn: fetchEvidence });
  const store = useCarbonStore();
  const selected = store.records.find((record) => record.id === store.selectedRecordId) ?? store.records[0];
  const visibleRecords = useMemo(() => recordFilter === '全部' ? store.records : store.records.filter((record) => record.status === recordFilter), [recordFilter, store.records]);
  const reconByRecord = useMemo(() => new Map(store.records.map((record) => [record.id, getRecordRecon(record, store.snapshots, store.findings)])), [store.records, store.snapshots, store.findings]);
  const totalReduction = store.records.reduce((total, record) => total + record.activity * record.factor / (record.unit === 'kWh' ? 1000 : record.unit === 'L' ? 1000 : 1), 0);
  const openFindings = store.findings.filter((item) => item.status !== '已关闭');
  const openConflicts = store.findings.filter((item) => item.type === '对账冲突' && item.status !== '已关闭');
  const pendingReview = store.findings.filter((item) => item.status === '待复核');
  const allIssuanceChecked = Object.values(store.issuanceChecks).every((check) => check.checked);
  const batchPending = store.batch !== null && store.batch.status !== '已确认';
  const issuanceReady = allIssuanceChecked && openFindings.length === 0 && !batchPending && store.pendingSync.length === 0;
  const selectedRecon = reconByRecord.get(selected.id);
  const selectedRevision = getLatestEffectiveRevision(selected.id, store.localRevisions);

  const nav = [
    { id: 'overview', label: '监测期总览', href: '/', icon: DashboardOutlined },
    { id: 'verify', label: '证据与抽样核验', href: '/verify', icon: FindInPageOutlined },
    { id: 'issuance', label: '签发准备', href: '/issuance', icon: AssessmentOutlined }
  ];

  const navDrawer = (
    <Box sx={{ width: drawerWidth, bgcolor: '#f8faf9', height: '100%' }}>
      <Box sx={{ p: 2.2, pt: 3 }}>
        <Typography variant="overline" color="text.secondary">当前项目</Typography>
        <Typography fontWeight={800} fontSize={13} mt={.5}>{data?.project.name ?? '临港工业园区能效提升项目'}</Typography>
        <Typography variant="caption" color="text.secondary">{data?.project.id ?? 'CN-ER-2026-041'}</Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1.2 }}>
        {nav.map(({ id, label, href, icon: Icon }) => (
          <ListItemButton key={id} component={Link} href={href} selected={view === id} sx={{ borderRadius: 1, mb: .4, '&.Mui-selected': { bgcolor: '#e4f1ec', color: '#12664f' } }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><Icon fontSize="small" /></ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: view === id ? 750 : 500 }} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ p: 2, mt: 2 }}>
        <Box sx={{ p: 1.3, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}><ScienceOutlined color="primary" fontSize="small" /><Typography fontSize={12} fontWeight={750}>核验状态</Typography></Stack>
          <LinearProgress variant="determinate" value={78} sx={{ height: 5, borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>78% 证据已完成初审</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#173a31', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <Toolbar sx={{ minHeight: '62px !important', gap: 1.4 }}>
          <IconButton color="inherit" sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen(true)}><MenuOutlined /></IconButton>
          <Box sx={{ width: 36, height: 36, borderRadius: 1, border: '1px solid #80b6a6', display: 'grid', placeItems: 'center' }}>
            <AccountTreeOutlined fontSize="small" />
          </Box>
          <Box>
            <Typography fontSize={15} fontWeight={800}>碳减排项目监测核验</Typography>
            <Typography fontSize={10} color="#a9c5bc">MRV Evidence & Issuance Readiness</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          {openConflicts.length > 0 && <Chip size="small" label={`${openConflicts.length} 项对账冲突`} sx={{ color: '#ffc4b8', borderColor: '#b0573f', bgcolor: 'rgba(255,255,255,.05)' }} variant="outlined" />}
          <Chip size="small" label={`${openFindings.length} 项发现开放`} sx={{ color: '#ffdda7', borderColor: '#a87935', bgcolor: 'rgba(255,255,255,.05)' }} variant="outlined" />
          <IconButton color="inherit"><NotificationsNoneOutlined /></IconButton>
          <Avatar sx={{ width: 30, height: 30, bgcolor: '#e1a45d', fontSize: 12 }}>沈</Avatar>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, pt: '62px', boxSizing: 'border-box', borderRightColor: '#dce4e0' } }}>{navDrawer}</Drawer>
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, pt: '62px' } }}>{navDrawer}</Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, bgcolor: '#f2f5f3', pt: '62px' }}>
        <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1640, mx: 'auto' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={2.4}>
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={750}>CN-ER-2026-041 / {data?.summary.period ?? '第三监测期'}</Typography>
              <Typography variant="h5" fontWeight={850} mt={.3}>{view === 'overview' ? '监测期总览' : view === 'verify' ? '证据与抽样核验' : '签发准备'}</Typography>
              <Typography variant="body2" color="text.secondary" mt={.5}>{view === 'overview' ? '汇总活动数据、排放因子、证据完整度和异常波动。' : view === 'verify' ? '快照按编号与版本对账，逐项核对来源、单位、时间范围，并保留修订链。' : '关闭发现项、清完对账冲突并完成签发前完整性门禁。'}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<CloudUploadOutlined />}>导入监测数据</Button>
              <Button variant="contained" startIcon={<TaskAltOutlined />} disabled={view !== 'issuance' || !issuanceReady}>提交签发准备</Button>
            </Stack>
          </Stack>
          {isLoading && <LinearProgress />}

          {view === 'overview' && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.4, mb: 2 }}>
                {[
                  { label: '减排量', value: data?.summary.reduction.toLocaleString() ?? '18,426', unit: 'tCO₂e', note: '较上期 +6.4%' },
                  { label: '证据完整度', value: `${data?.summary.evidenceRate ?? 92}%`, unit: '', note: '5 份证据待补充' },
                  { label: '开放发现项', value: `${openFindings.length}`, unit: '项', note: `${openConflicts.length} 项对账冲突 · ${pendingReview.length} 项待复核` },
                  { label: '抽样任务', value: `${store.sampledIds.length} / 18`, unit: '', note: '完成率 67%' }
                ].map((item) => <Card elevation={0} variant="outlined" key={item.label}><CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}><Typography variant="caption" color="text.secondary">{item.label}</Typography><Stack direction="row" alignItems="baseline" spacing={.6} mt={.5}><Typography variant="h5" fontWeight={850}>{item.value}</Typography><Typography fontSize={12} color="text.secondary">{item.unit}</Typography></Stack><Typography fontSize={11} color="text.secondary" mt={.7}>{item.note}</Typography></CardContent></Card>)}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.55fr) minmax(300px, .7fr)' }, gap: 1.5 }}>
                <Card elevation={0} variant="outlined">
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.6 }}>
                    <Box><Typography fontWeight={800} fontSize={14}>活动数据与计算链</Typography><Typography fontSize={11} color="text.secondary">选择记录查看公式、来源证据、快照对账和修订版本</Typography></Box>
                    <Tabs value={recordFilter} onChange={(_, value) => setRecordFilter(value)} variant="scrollable"><Tab value="全部" label="全部" /><Tab value="待核验" label="待核验" /><Tab value="需补证" label="需补证" /><Tab value="已核验" label="已核验" /></Tabs>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 920 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1.6fr .9fr .8fr 1fr .6fr .7fr .7fr', gap: 1, px: 1.7, py: 1, bgcolor: '#f7f9f8', color: 'text.secondary', fontSize: 11, fontWeight: 750 }}>
                        <span>数据来源</span><span>活动数据</span><span>排放因子</span><span>时间范围</span><span>证据</span><span>对账</span><span>状态</span>
                      </Box>
                      {visibleRecords.map((record) => {
                        const recon = reconByRecord.get(record.id);
                        return (
                          <Box key={record.id} role="button" tabIndex={0} onClick={() => store.selectRecord(record.id)} sx={{ display: 'grid', gridTemplateColumns: '1.6fr .9fr .8fr 1fr .6fr .7fr .7fr', gap: 1, px: 1.7, py: 1.25, borderTop: '1px solid #e8ecea', cursor: 'pointer', bgcolor: selected.id === record.id ? '#eff7f3' : 'white', '&:hover': { bgcolor: '#f6faf8' } }}>
                            <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · {record.owner} · V{record.revision}</Typography></Box>
                            <Box><Typography fontSize={12}>{record.activity.toLocaleString()} {record.unit}</Typography><Typography fontSize={10} color={record.anomaly > 5 ? 'secondary.main' : 'text.secondary'}>异常 {record.anomaly > 0 ? '+' : ''}{record.anomaly}%</Typography></Box>
                            <Typography fontSize={12}>{record.factor} <small>{record.factorUnit}</small></Typography>
                            <Typography fontSize={11}>{record.timeRange}</Typography>
                            <Typography fontSize={12}>{record.evidenceCount} 项</Typography>
                            <Box><Chip size="small" label={recon?.state ?? '待对账'} color={reconChipColor[recon?.state ?? '待对账']} variant={recon?.state === '吻合' ? 'filled' : 'outlined'} /></Box>
                            <Chip size="small" label={record.status} color={record.status === '已核验' ? 'success' : record.status === '需补证' ? 'warning' : 'default'} variant={record.status === '已核验' ? 'filled' : 'outlined'} />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Card>
                <Stack spacing={1.5}>
                  <Card elevation={0} variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={800} fontSize={14}>计算链展开</Typography><Chip size="small" label={selected.id} /></Stack><Box sx={{ mt: 1.5, p: 1.3, bgcolor: '#f4f7f5', fontFamily: 'monospace', borderRadius: 1, fontSize: 11 }}>
                    <Box>活动数据 = {selected.activity.toLocaleString()} {selected.unit}</Box>
                    <Box mt={.6}>排放因子 = {selected.factor} {selected.factorUnit}</Box>
                    <Box mt={.6}>换算系数 = 0.001</Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ color: '#14644f', fontWeight: 800 }}>减排量 = {(selected.activity * selected.factor / 1000).toFixed(2)} tCO₂e</Box>
                  </Box>
                    {selectedRecon?.snapshot && (
                      <Box sx={{ mt: 1.2, p: 1.2, border: '1px dashed', borderColor: selectedRecon.state === '冲突' ? 'error.light' : 'divider', borderRadius: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontSize={11} fontWeight={750}>快照对账 · {selectedRecon.snapshot.id}</Typography>
                          <Chip size="small" label={selectedRecon.state} color={reconChipColor[selectedRecon.state]} variant="outlined" />
                        </Stack>
                        <Typography fontSize={11} mt={.6}>快照值 = {selectedRecon.snapshot.activity.toLocaleString()} {selectedRecon.snapshot.unit}（V{selectedRecon.snapshot.revision}）</Typography>
                        <Typography fontSize={11}>现场值 = {selected.activity.toLocaleString()} {selected.unit}（V{selected.revision}）</Typography>
                        <Typography fontSize={10} color="text.secondary" mt={.4}>快照换算依据：{selectedRecon.snapshot.conversionNote}</Typography>
                        {selectedRevision && <Typography fontSize={10} color="text.secondary">本地修订依据：{selectedRevision.reason}（{selectedRevision.actor}）</Typography>}
                        {selectedRecon.state === '冲突' && <Typography fontSize={10} color="error.main" mt={.4}>冲突已写入发现项，快照未覆盖现场内容。</Typography>}
                      </Box>
                    )}
                    <Stack direction="row" spacing={1} mt={1.5}><Button size="small" variant="outlined" onClick={() => { setCorrectionOpen(true); setCorrectionValue(String(selected.activity)); setCorrectionBase(selected.revision); }}>修订数据</Button><Button size="small">查看证据</Button></Stack></CardContent></Card>
                  <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14} mb={1.2}>核验发现项</Typography>{openFindings.slice(0, 3).map((finding) => <Box key={finding.id} sx={{ py: 1, borderTop: '1px solid #edf0ef' }}><Stack direction="row" spacing={1}><Alert severity={finding.status === '待复核' ? 'info' : finding.status === '补证中' ? 'warning' : 'error'} sx={{ p: .2, '& .MuiAlert-icon': { mr: .3, fontSize: 17 } }} /><Box><Typography fontSize={12} fontWeight={700}>{finding.title}</Typography><Typography fontSize={10} color="text.secondary" mt={.3}>{finding.assignee} · {finding.due} · 依据 V{finding.basisRevision}</Typography>{finding.invalidatedBy && <Typography fontSize={10} color="warning.dark" mt={.2}>失效来源：{finding.invalidatedBy}</Typography>}</Box></Stack></Box>)}</CardContent></Card>
                </Stack>
              </Box>
            </>
          )}

          {view === 'verify' && (
            <>
              <Card elevation={0} variant="outlined" sx={{ mb: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ p: 1.6 }}>
                  <Box>
                    <Typography fontWeight={800} fontSize={14}>正式证据快照对账链</Typography>
                    <Typography fontSize={11} color="text.secondary">快照按编号与版本匹配；本地修订存在时两边值与换算依据均保留，冲突写入发现项，不用快照盖掉现场内容。</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {store.snapshotBatchId && <Chip size="small" variant="outlined" label={`快照批次 ${store.snapshotBatchId}`} />}
                    <Button variant="outlined" startIcon={<CloudDownloadOutlined />} onClick={() => store.importSnapshots()}>{store.snapshots.length === 0 ? '接收园区补发快照' : '重新拉取快照'}</Button>
                  </Stack>
                </Stack>
                <Divider />
                {store.snapshots.length === 0 ? (
                  <Typography fontSize={12} color="text.secondary" sx={{ p: 2 }}>尚未接收园区补发读数快照，接收后自动按编号与版本对账。</Typography>
                ) : (
                  store.records.map((record) => {
                    const recon = reconByRecord.get(record.id);
                    if (!recon?.snapshot) return null;
                    return (
                      <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1.6fr auto' }, gap: 1.2, px: 1.6, py: 1.2, borderTop: '1px solid #edf0ef', alignItems: 'center' }}>
                        <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · {recon.snapshot.id}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">快照值</Typography><Typography fontSize={11}>{recon.snapshot.activity.toLocaleString()} {recon.snapshot.unit} · V{recon.snapshot.revision}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">现场值</Typography><Typography fontSize={11}>{record.activity.toLocaleString()} {record.unit} · V{record.revision}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">换算依据</Typography><Typography fontSize={11}>{recon.snapshot.conversionNote}</Typography></Box>
                        <Chip size="small" label={recon.state} color={reconChipColor[recon.state]} variant={recon.state === '吻合' ? 'filled' : 'outlined'} />
                      </Box>
                    );
                  })
                )}
                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ p: 1.6 }}>
                  <Box>
                    <Typography fontSize={12} fontWeight={700}>修订写入正式证据链</Typography>
                    <Typography fontSize={11} color="text.secondary">
                      {store.batch
                        ? `批次 ${store.batch.batchId}：共 ${store.batch.items.length} 条，已确认 ${store.batch.confirmed.length} 条${store.batch.skipped.length > 0 ? `，跳过已确认 ${store.batch.skipped.length} 条（不重复写入）` : ''}${store.batch.failed.length > 0 ? `，失败 ${store.batch.failed.length} 条（${store.batch.failed.join('、')}）` : ''}`
                        : store.pendingSync.length > 0
                          ? `${store.pendingSync.length} 条生效修订待写入（${store.pendingSync.map((item) => item.recordId).join('、')}）`
                          : '暂无待写入修订'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {store.batch && <Chip size="small" color={store.batch.status === '已确认' ? 'success' : store.batch.status === '写入中' ? 'default' : 'error'} label={store.batch.status} />}
                    <Button size="small" variant="contained" disabled={store.pendingSync.length === 0} onClick={() => store.submitBatch()}>写入正式链</Button>
                    {store.batch && store.batch.status === '部分失败' && <Button size="small" variant="outlined" color="error" startIcon={<ReplayOutlined />} onClick={() => store.recoverBatch()}>按批次恢复</Button>}
                  </Stack>
                </Stack>
              </Card>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 340px' }, gap: 1.5 }}>
                <Card elevation={0} variant="outlined">
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ p: 1.6 }}>
                    <Box><Typography fontWeight={800} fontSize={14}>证据矩阵与抽样任务</Typography><Typography fontSize={11} color="text.secondary">已抽取 {store.sampledIds.length} 条高价值记录</Typography></Box>
                    <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => useCarbonStore.setState((state) => ({ sampledIds: store.records.filter((item) => Math.abs(item.anomaly) > 5).map((item) => item.id) }))}>按异常抽样</Button><Button variant="contained" onClick={store.batchVerify}>批量核验</Button></Stack>
                  </Stack><Divider />
                  {store.records.map((record) => (
                    <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '22px minmax(210px, 1.3fr) .8fr .8fr .8fr auto' }, alignItems: 'center', gap: 1.2, px: 1.6, py: 1.3, borderTop: '1px solid #edf0ef' }}>
                      <input type="checkbox" checked={store.sampledIds.includes(record.id)} onChange={() => store.toggleSample(record.id)} aria-label={`抽样 ${record.id}`} />
                      <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · 证据 {record.evidenceCount} 份</Typography></Box>
                      <Box><Typography variant="caption" color="text.secondary">来源</Typography><Typography fontSize={11}>原始计量记录</Typography></Box>
                      <Box><Typography variant="caption" color="text.secondary">单位</Typography><Typography fontSize={11}>{record.unit} / {record.factorUnit}</Typography></Box>
                      <Box><Typography variant="caption" color="text.secondary">时间范围</Typography><Typography fontSize={11}>{record.timeRange.includes('至') ? '已覆盖整期' : '待检查'}</Typography></Box>
                      <Stack direction="row" spacing={.7}><Button size="small" variant="outlined" onClick={() => store.startCorrection(record.id)}>复核</Button><Button size="small" variant="contained" disabled={record.status === '需补证'} onClick={() => store.verifyRecord(record.id)}>通过</Button></Stack>
                    </Box>
                  ))}
                </Card>
                <Stack spacing={1.5}>
                  <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14} mb={1.3}>发现项闭环</Typography>{store.findings.map((finding) => (
                    <Box key={finding.id} sx={{ borderTop: '1px solid #edf0ef', py: 1.2 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}><Typography fontSize={12} fontWeight={700}>{finding.title}</Typography><Chip size="small" label={finding.status} color={findingChipColor(finding.status)} variant={finding.status === '待复核' ? 'outlined' : 'filled'} /></Stack>
                      <Typography fontSize={10.5} color="text.secondary" mt={.5}>{finding.detail}</Typography>
                      <Typography fontSize={10} color="text.secondary" mt={.3}>依据版本 V{finding.basisRevision}{finding.invalidatedBy ? ` · 失效来源：${finding.invalidatedBy}` : ''}</Typography>
                      {finding.conflict && finding.status !== '已关闭' && (
                        <Box sx={{ mt: .8, p: 1, bgcolor: '#fdf6ec', borderRadius: 1, border: '1px solid #f0dfc0' }}>
                          <Typography fontSize={10.5} fontWeight={700}>两边值均保留（{finding.conflict.kind}）</Typography>
                          <Typography fontSize={10.5} mt={.3}>{finding.conflict.officialLabel}：{finding.conflict.officialValue.toLocaleString()} {finding.conflict.officialUnit}</Typography>
                          <Typography fontSize={10.5}>{finding.conflict.localLabel}：{finding.conflict.localValue.toLocaleString()} {finding.conflict.localUnit}</Typography>
                          <Typography fontSize={10} color="text.secondary" mt={.3}>换算依据：{finding.conflict.conversionNote}</Typography>
                          <Stack direction="row" spacing={.7} mt={.8}>
                            <Button size="small" variant="outlined" onClick={() => store.resolveConflict(finding.id, true)}>采用正式侧值</Button>
                            <Button size="small" variant="outlined" onClick={() => store.resolveConflict(finding.id, false)}>采用现场侧值</Button>
                          </Stack>
                        </Box>
                      )}
                      <Stack direction="row" spacing={.7} mt={1}>
                        {finding.status === '待复核'
                          ? <Button size="small" variant="outlined" onClick={() => store.revalidateFinding(finding.id)}>复核确认</Button>
                          : <>
                              <Button size="small" disabled={finding.status === '已关闭'} onClick={() => store.requestEvidence(finding.id)}>发起补证</Button>
                              <Button size="small" disabled={finding.status === '已关闭'} onClick={() => store.closeFinding(finding.id)}>关闭</Button>
                            </>}
                      </Stack>
                    </Box>
                  ))}</CardContent></Card>
                  <Alert severity="info">任何数据修订都会生成新版本，原始提交和计算链不会被覆盖；活动数据更新后相关发现项与签发检查失效重算。</Alert>
                </Stack>
              </Box>
            </>
          )}

          {view === 'issuance' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 380px' }, gap: 1.5 }}>
              <Card elevation={0} variant="outlined">
                <CardContent>
                  <Typography fontWeight={800} fontSize={14}>签发前完整性检查</Typography>
                  <Typography fontSize={11} color="text.secondary" mb={1.5}>所有门禁项必须确认，开放发现项与对账冲突必须清零。</Typography>
                  {[
                    { id: 'evidence', title: '证据与计算链完整', detail: '活动数据、排放因子、来源证据与修订说明可追溯。' },
                    { id: 'calculation', title: '计算过程复核通过', detail: '单位和换算系数一致，关键公式由核验员确认。' },
                    { id: 'revisions', title: '历史修订未覆盖原始数据', detail: '所有数据均有版本号和修订原因。' },
                    { id: 'methodology', title: '方法学与监测计划匹配', detail: `项目采用 ${data?.project.methodology ?? 'CMS-052-V01'}。` }
                  ].map((item) => {
                    const check = store.issuanceChecks[item.id] ?? { checked: false };
                    return (
                      <Box key={item.id} component="label" sx={{ display: 'flex', gap: 1.3, alignItems: 'flex-start', borderTop: '1px solid #edf0ef', py: 1.5, cursor: 'pointer' }}>
                        <input type="checkbox" checked={check.checked} onChange={() => store.toggleIssuanceCheck(item.id)} />
                        <Box>
                          <Stack direction="row" spacing={.8} alignItems="center">
                            <Typography fontSize={12.5} fontWeight={700}>{item.title}</Typography>
                            {!check.checked && check.invalidatedBy && <Chip size="small" color="warning" variant="outlined" label="已失效" />}
                          </Stack>
                          <Typography fontSize={10.5} color="text.secondary" mt={.4}>{item.detail}</Typography>
                          {!check.checked && check.invalidatedBy && <Typography fontSize={10} color="warning.dark" mt={.3}>失效来源：{check.invalidatedBy}，需重新确认</Typography>}
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
              <Stack spacing={1.5}>
                <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14}>签发就绪度</Typography><Stack direction="row" alignItems="baseline" spacing={1} mt={1}><Typography variant="h4" fontWeight={850}>{Math.round(Object.values(store.issuanceChecks).filter((check) => check.checked).length / 4 * 70 + (openFindings.length === 0 ? 30 : 0))}%</Typography><Typography fontSize={11} color="text.secondary">完成度</Typography></Stack><LinearProgress variant="determinate" value={Object.values(store.issuanceChecks).filter((check) => check.checked).length / 4 * 100} sx={{ height: 7, borderRadius: 3, mt: 1 }} /><Typography fontSize={11} color="text.secondary" mt={1.2}>还有 {openFindings.length} 个开放发现项，其中 {openConflicts.length} 项对账冲突。</Typography></CardContent></Card>
                <Card elevation={0} variant="outlined"><CardContent>
                  <Typography fontWeight={800} fontSize={14} mb={1}>待复核与未清冲突</Typography>
                  {openConflicts.length === 0 && pendingReview.length === 0 && <Typography fontSize={11} color="text.secondary">无待复核项，对账链一致。</Typography>}
                  {openConflicts.map((finding) => (
                    <Box key={finding.id} sx={{ borderTop: '1px solid #edf0ef', py: 1 }}>
                      <Stack direction="row" spacing={.8} alignItems="center"><Chip size="small" color="error" label="冲突" /><Typography fontSize={11.5} fontWeight={700}>{finding.title}</Typography></Stack>
                      {finding.conflict && <Typography fontSize={10} color="text.secondary" mt={.4}>{finding.conflict.officialLabel} {finding.conflict.officialValue.toLocaleString()} {finding.conflict.officialUnit} ↔ {finding.conflict.localLabel} {finding.conflict.localValue.toLocaleString()} {finding.conflict.localUnit}</Typography>}
                    </Box>
                  ))}
                  {pendingReview.filter((finding) => finding.type !== '对账冲突').map((finding) => (
                    <Box key={finding.id} sx={{ borderTop: '1px solid #edf0ef', py: 1 }}>
                      <Stack direction="row" spacing={.8} alignItems="center"><Chip size="small" color="warning" variant="outlined" label="待复核" /><Typography fontSize={11.5} fontWeight={700}>{finding.title}</Typography></Stack>
                      {finding.invalidatedBy && <Typography fontSize={10} color="text.secondary" mt={.4}>失效来源：{finding.invalidatedBy}</Typography>}
                    </Box>
                  ))}
                </CardContent></Card>
                <Card elevation={0} variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between"><Typography fontWeight={800} fontSize={14}>版本与核验意见</Typography><IconButton size="small"><MoreHorizOutlined /></IconButton></Stack>{[['V4', '韩跃', '修订柴油活动数据并补充测试运行说明'], ['V3', '沈楠', '要求补充流量计校准证据'], ['V2', '徐璐', '统一电量单位并附原始记录']].map((item) => <Stack key={item[0]} direction="row" spacing={1.2} sx={{ borderTop: '1px solid #edf0ef', py: 1.2 }}><Chip size="small" label={item[0]} /><Box><Typography fontSize={11.5} fontWeight={700}>{item[1]}</Typography><Typography fontSize={10.5} color="text.secondary">{item[2]}</Typography></Box></Stack>)}</CardContent></Card>
                <Alert severity={openConflicts.length > 0 ? 'error' : issuanceReady ? 'success' : 'warning'}>
                  {openConflicts.length > 0
                    ? `存在 ${openConflicts.length} 项未清对账冲突，签发提交已锁定。`
                    : batchPending
                      ? `批次 ${store.batch?.batchId} 写入未完成，请按批次恢复后再提交。`
                      : pendingReview.length > 0
                        ? `有 ${pendingReview.length} 项发现因数据更新失效，待复核确认。`
                        : issuanceReady
                          ? '全部门禁已完成，可提交签发准备。'
                          : '关闭开放发现项并完成所有检查后可提交。'}
                </Alert>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      <Tooltip title="核验记录会写入审计链"><Button sx={{ position: 'fixed', bottom: 18, right: 18, zIndex: 5 }} variant="contained" size="small" startIcon={<FactCheckOutlined />}>操作均留痕</Button></Tooltip>
      {correctionOpen && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 60, bgcolor: 'rgba(15,25,22,.4)', display: 'grid', placeItems: 'center', p: 2 }} onMouseDown={() => setCorrectionOpen(false)}>
          <Card sx={{ width: 'min(520px, 100%)' }} onMouseDown={(event) => event.stopPropagation()}><CardContent sx={{ p: 2.2 }}>
            <Typography variant="h6" fontWeight={800}>修订活动数据</Typography>
            <Typography variant="body2" color="text.secondary" mt={.5}>当前值 {selected.activity.toLocaleString()} {selected.unit}。本次提交基于 V{correctionBase}，生效后生成新版本，原始版本保持不变。</Typography>
            <TextField fullWidth size="small" label={`修订值 / ${selected.unit}`} value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} margin="normal" />
            <TextField fullWidth size="small" label="修订原因（换算依据）" multiline rows={3} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} margin="normal" />
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Typography fontSize={12} color="text.secondary">提交核验员</Typography>
              <Select size="small" value={correctionActor} onChange={(event) => setCorrectionActor(event.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="沈楠">沈楠</MenuItem>
                <MenuItem value="韩跃">韩跃</MenuItem>
                <MenuItem value="徐璐">徐璐</MenuItem>
              </Select>
            </Stack>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={<Checkbox size="small" checked={correctionConcurrent} onChange={(event) => setCorrectionConcurrent(event.target.checked)} />}
              label={<Typography fontSize={12}>模拟与另一核验员并发提交（先到生效，后到内容留作冲突）</Typography>}
            />
            {correctionConcurrent && <Alert severity="info" sx={{ mt: 1 }}>韩跃的修订将先基于 V{correctionBase} 生效，本次提交随后到达，将作为冲突保留并写入发现项。</Alert>}
            {!correctionReason.trim() && <Alert severity="warning" sx={{ mt: 1 }}>必须填写修订原因。</Alert>}
            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}><Button onClick={() => setCorrectionOpen(false)}>取消</Button><Button variant="contained" disabled={!correctionReason.trim() || !Number(correctionValue)} onClick={() => {
              if (correctionConcurrent) store.simulateConcurrentRevision(selected.id);
              store.reviseValue(selected.id, Number(correctionValue), correctionReason, correctionActor, correctionBase);
              setCorrectionOpen(false);
              setCorrectionReason('');
              setCorrectionConcurrent(false);
            }}>生成新版本</Button></Stack>
          </CardContent></Card>
        </Box>
      )}
    </Box>
  );
}
