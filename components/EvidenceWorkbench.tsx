'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
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
  CheckCircleOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  FactCheckOutlined,
  FindInPageOutlined,
  FlashOnOutlined,
  MenuOutlined,
  MoreHorizOutlined,
  NotificationsNoneOutlined,
  ReplayOutlined,
  RuleOutlined,
  ScienceOutlined,
  TaskAltOutlined,
  WarningAmberOutlined
} from '@mui/icons-material';
import { fetchEvidence } from '@/lib/api';
import { useCarbonStore, effectiveRevision, snapshotFor } from '@/lib/store';

const drawerWidth = 232;

type View = 'overview' | 'verify' | 'issuance';

export default function EvidenceWorkbench({ initialView }: { initialView: View }) {
  const [view] = useState<View>(initialView);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recordFilter, setRecordFilter] = useState('全部');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [batchSelection, setBatchSelection] = useState<string[]>([]);
  const [batchReason, setBatchReason] = useState('批量确认补发读数');

  const { data, isLoading } = useQuery({ queryKey: ['carbon-api'], queryFn: fetchEvidence });
  const store = useCarbonStore();
  const selected = store.records.find((record) => record.id === store.selectedRecordId) ?? store.records[0];
  const visibleRecords = useMemo(() => recordFilter === '全部' ? store.records : store.records.filter((record) => record.status === recordFilter), [recordFilter, store.records]);

  // 补发读数自动入账：按编号 + 版本匹配，保留两边值
  useEffect(() => {
    if (data?.snapshots?.length && !store.snapshotIngested) {
      store.ingestSnapshots(data.snapshots);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.snapshots, store.snapshotIngested]);

  useEffect(() => {
    if (batchSelection.length === 0) setBatchSelection(store.records.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.records.length]);

  const totalReduction = store.records.reduce((total, record) => total + record.activity * record.factor / (record.unit === 'kWh' ? 1000 : record.unit === 'L' ? 1000 : 1), 0);
  const openFindings = store.findings.filter((item) => item.status !== '已关闭');
  const conflictFindings = store.findings.filter((f) => f.type === '对账冲突' && f.status !== '已关闭');
  const staleFindings = store.findings.filter((f) => f.stale && f.status !== '已关闭');
  const pendingReview = store.findings.filter((f) => f.pendingReview && f.status !== '已关闭');
  const hasStaleChecks = store.issuanceChecks.some((c) => c.stale);
  const allChecksChecked = store.issuanceChecks.every((c) => c.checked);
  const canSubmit = allChecksChecked && openFindings.length === 0 && conflictFindings.length === 0 && !hasStaleChecks;

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
          <Tooltip title="待复核项"><Badge badgeContent={pendingReview.length + conflictFindings.length} color="warning"><IconButton color="inherit"><NotificationsNoneOutlined /></IconButton></Badge></Tooltip>
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
              <Typography variant="body2" color="text.secondary" mt={.5}>{view === 'overview' ? '活动数据与正式快照按编号、版本对账，保留两边值及换算依据。' : view === 'verify' ? '修订提交先到生效、后到留作冲突；批量写入可按批次恢复。' : '冲突未清或检查失效时挡住签发，失效来源与待复核项可追溯。'}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<CloudUploadOutlined />} onClick={() => data?.snapshots && store.ingestSnapshots(data.snapshots)}>导入补发读数</Button>
              <Button variant="contained" startIcon={<TaskAltOutlined />} disabled={view !== 'issuance' || !canSubmit}>提交签发准备</Button>
            </Stack>
          </Stack>
          {isLoading && <LinearProgress />}

          {!store.snapshotIngested && !isLoading && (
            <Alert severity="info" sx={{ mb: 2 }} action={<Button size="small" onClick={() => data?.snapshots && store.ingestSnapshots(data.snapshots)}>立即入账</Button>}>
              补发读数尚未入账。正式证据快照将按编号与版本匹配本地修订，保留两边值及换算依据，冲突写进发现项。
            </Alert>
          )}
          {conflictFindings.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }} icon={<WarningAmberOutlined />}>
              当前有 {conflictFindings.length} 项对账冲突未清（{conflictFindings.map((f) => f.recordId).join('、')}），签发提交将被挡住。请在「证据与抽样核验」中复核并关闭冲突项。
            </Alert>
          )}

          {view === 'overview' && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.4, mb: 2 }}>
                {[
                  { label: '减排量', value: data?.summary.reduction.toLocaleString() ?? '18,426', unit: 'tCO₂e', note: '较上期 +6.4%' },
                  { label: '证据完整度', value: `${data?.summary.evidenceRate ?? 92}%`, unit: '', note: '5 份证据待补充' },
                  { label: '开放发现项', value: `${openFindings.length}`, unit: '项', note: `${conflictFindings.length} 项对账冲突` },
                  { label: '待复核项', value: `${pendingReview.length}`, unit: '项', note: `${staleFindings.length} 项失效重算` }
                ].map((item) => <Card elevation={0} variant="outlined" key={item.label}><CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}><Typography variant="caption" color="text.secondary">{item.label}</Typography><Stack direction="row" alignItems="baseline" spacing={.6} mt={.5}><Typography variant="h5" fontWeight={850}>{item.value}</Typography><Typography fontSize={12} color="text.secondary">{item.unit}</Typography></Stack><Typography fontSize={11} color="text.secondary" mt={.7}>{item.note}</Typography></CardContent></Card>)}
              </Box>

              <Card elevation={0} variant="outlined" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.6 }}>
                  <Box><Typography fontWeight={800} fontSize={14}>对账链：正式快照 × 现场修订</Typography><Typography fontSize={11} color="text.secondary">按编号与版本匹配，保留两边值及换算依据，不用快照盖掉现场内容</Typography></Box>
                  <Chip size="small" label={`${store.snapshots.length} 份快照`} variant="outlined" />
                </Stack>
                <Divider />
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 1080 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1.4fr 1.4fr 1.6fr .8fr', gap: 1, px: 1.7, py: 1, bgcolor: '#f7f9f8', color: 'text.secondary', fontSize: 11, fontWeight: 750 }}>
                      <span>数据来源</span><span>正式快照（编号 / 版本 / 值）</span><span>现场修订（版本 / 值 / 修订人）</span><span>换算依据</span><span>匹配状态</span>
                    </Box>
                    {store.records.map((record) => {
                      const snap = snapshotFor(store.snapshots, record.id);
                      const local = effectiveRevision(store.revisions, record.id);
                      const match = !snap ? '无快照' : !local ? '仅快照' : local.value === snap.activity ? '一致' : '冲突';
                      return (
                        <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1.4fr 1.4fr 1.6fr .8fr', gap: 1, px: 1.7, py: 1.25, borderTop: '1px solid #e8ecea', bgcolor: match === '冲突' ? '#fdf3f1' : 'white' }}>
                          <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · {record.owner}</Typography></Box>
                          <Box>
                            {snap ? (<><Typography fontSize={11.5} fontWeight={700}>{snap.id}</Typography><Typography fontSize={11}>V{snap.version} · {snap.activity.toLocaleString()} {snap.unit}</Typography></>) : <Typography fontSize={11} color="text.secondary">—</Typography>}
                          </Box>
                          <Box>
                            {local ? (<><Typography fontSize={11.5} fontWeight={700}>V{local.baseVersion} · {local.value.toLocaleString()} {local.unit}</Typography><Typography fontSize={10} color="text.secondary">{local.actor} · {local.reason}</Typography></>) : <Typography fontSize={11} color="text.secondary">无本地修订</Typography>}
                          </Box>
                          <Typography fontSize={10.5} color="text.secondary">{snap?.conversionBasis ?? '—'}</Typography>
                          <Box><Chip size="small" label={match} color={match === '一致' ? 'success' : match === '冲突' ? 'error' : 'default'} variant={match === '一致' ? 'filled' : 'outlined'} /></Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Card>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.55fr) minmax(300px, .7fr)' }, gap: 1.5 }}>
                <Card elevation={0} variant="outlined">
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.6 }}>
                    <Box><Typography fontWeight={800} fontSize={14}>活动数据与计算链</Typography><Typography fontSize={11} color="text.secondary">选择记录查看公式、来源证据和修订版本</Typography></Box>
                    <Tabs value={recordFilter} onChange={(_, value) => setRecordFilter(value)} variant="scrollable"><Tab value="全部" label="全部" /><Tab value="待核验" label="待核验" /><Tab value="需补证" label="需补证" /><Tab value="已核验" label="已核验" /></Tabs>
                  </Stack>
                  <Divider />
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 840 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1.7fr .9fr .8fr 1fr .7fr .7fr', gap: 1, px: 1.7, py: 1, bgcolor: '#f7f9f8', color: 'text.secondary', fontSize: 11, fontWeight: 750 }}>
                        <span>数据来源</span><span>活动数据</span><span>排放因子</span><span>时间范围</span><span>证据</span><span>状态</span>
                      </Box>
                      {visibleRecords.map((record) => (
                        <Box key={record.id} role="button" tabIndex={0} onClick={() => store.selectRecord(record.id)} sx={{ display: 'grid', gridTemplateColumns: '1.7fr .9fr .8fr 1fr .7fr .7fr', gap: 1, px: 1.7, py: 1.25, borderTop: '1px solid #e8ecea', cursor: 'pointer', bgcolor: selected.id === record.id ? '#eff7f3' : 'white', '&:hover': { bgcolor: '#f6faf8' } }}>
                          <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · {record.owner} · V{record.revision}</Typography></Box>
                          <Box><Typography fontSize={12}>{record.activity.toLocaleString()} {record.unit}</Typography><Typography fontSize={10} color={record.anomaly > 5 ? 'secondary.main' : 'text.secondary'}>异常 {record.anomaly > 0 ? '+' : ''}{record.anomaly}%</Typography></Box>
                          <Typography fontSize={12}>{record.factor} <small>{record.factorUnit}</small></Typography>
                          <Typography fontSize={11}>{record.timeRange}</Typography>
                          <Typography fontSize={12}>{record.evidenceCount} 项</Typography>
                          <Chip size="small" label={record.status} color={record.status === '已核验' ? 'success' : record.status === '需补证' ? 'warning' : 'default'} variant={record.status === '已核验' ? 'filled' : 'outlined'} />
                        </Box>
                      ))}
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
                  </Box><Stack direction="row" spacing={1} mt={1.5}><Button size="small" variant="outlined" onClick={() => { setCorrectionOpen(true); setCorrectionValue(String(selected.activity)); }}>修订数据</Button><Button size="small">查看证据</Button></Stack></CardContent></Card>
                  <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14} mb={1.2}>待复核项与失效来源</Typography>
                    {pendingReview.length === 0 && staleFindings.length === 0 && <Typography fontSize={11} color="text.secondary">无待复核项。活动数据更新后，相关发现项与签发检查将在此显示失效来源。</Typography>}
                    {[...pendingReview, ...staleFindings].slice(0, 5).map((finding) => (
                      <Box key={finding.id} sx={{ py: 1, borderTop: '1px solid #edf0ef' }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Alert severity={finding.type === '对账冲突' ? 'error' : 'warning'} sx={{ p: .2, '& .MuiAlert-icon': { mr: .3, fontSize: 17 } }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography fontSize={12} fontWeight={700}>{finding.title}</Typography>
                            <Typography fontSize={10} color="text.secondary" mt={.3}>{finding.assignee} · {finding.due}</Typography>
                            {finding.stale && finding.staleReason && <Chip size="small" icon={<ReplayOutlined />} label={`失效来源：${finding.staleReason}`} color="warning" variant="outlined" sx={{ mt: .6, height: 20, fontSize: 10 }} />}
                            {finding.type === '对账冲突' && <Button size="small" sx={{ mt: .5, minWidth: 0, fontSize: 11 }} onClick={() => store.resolveConflict(finding.id)}>关闭冲突</Button>}
                            {finding.stale && <Button size="small" sx={{ mt: .5, ml: .5, minWidth: 0, fontSize: 11 }} onClick={() => store.recomputeFinding(finding.id)}>重算</Button>}
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </CardContent></Card>
                </Stack>
              </Box>
            </>
          )}

          {view === 'verify' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 360px' }, gap: 1.5 }}>
              <Stack spacing={1.5}>
                <Card elevation={0} variant="outlined">
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ p: 1.6 }}>
                    <Box><Typography fontWeight={800} fontSize={14}>证据矩阵与抽样任务</Typography><Typography fontSize={11} color="text.secondary">已抽取 {store.sampledIds.length} 条高价值记录；修订先到生效、后到留作冲突</Typography></Box>
                    <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => useCarbonStore.setState((state) => ({ sampledIds: store.records.filter((item) => Math.abs(item.anomaly) > 5).map((item) => item.id) }))}>按异常抽样</Button><Button variant="contained" onClick={store.batchVerify}>批量核验</Button></Stack>
                  </Stack><Divider />
                  {store.records.map((record) => {
                    const local = effectiveRevision(store.revisions, record.id);
                    const snap = snapshotFor(store.snapshots, record.id);
                    const conflict = snap && local && local.value !== snap.activity;
                    return (
                      <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '22px minmax(210px, 1.3fr) .8fr .8fr .8fr auto' }, alignItems: 'center', gap: 1.2, px: 1.6, py: 1.3, borderTop: '1px solid #edf0ef', bgcolor: conflict ? '#fdf3f1' : 'white' }}>
                        <input type="checkbox" checked={store.sampledIds.includes(record.id)} onChange={() => store.toggleSample(record.id)} aria-label={`抽样 ${record.id}`} />
                        <Box><Typography fontSize={12.5} fontWeight={700}>{record.source}</Typography><Typography fontSize={10} color="text.secondary">{record.id} · 证据 {record.evidenceCount} 份 {local ? `· 现场 V${local.baseVersion}` : ''}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">来源</Typography><Typography fontSize={11}>原始计量记录</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">单位</Typography><Typography fontSize={11}>{record.unit} / {record.factorUnit}</Typography></Box>
                        <Box><Typography variant="caption" color="text.secondary">快照 / 现场</Typography><Typography fontSize={11} color={conflict ? 'error.main' : 'text.primary'}>{snap ? `${snap.activity.toLocaleString()} / ${local?.value.toLocaleString() ?? '—'}` : '—'}</Typography></Box>
                        <Stack direction="row" spacing={.7}><Button size="small" variant="outlined" onClick={() => store.startCorrection(record.id)}>复核</Button><Button size="small" variant="outlined" disabled={record.status === '需补证'} onClick={() => store.verifyRecord(record.id)}>通过</Button><Tooltip title="模拟两名核验员同时提交：先到生效，后到留作冲突"><Button size="small" variant="text" color="secondary" startIcon={<FlashOnOutlined />} onClick={() => store.simulateConcurrentSubmit(record.id)}>并发</Button></Tooltip></Stack>
                      </Box>
                    );
                  })}
                </Card>

                <Card elevation={0} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={800} fontSize={14}>批量写入与失败恢复</Typography>
                    <Typography fontSize={11} color="text.secondary" mb={1.2}>按批次号推进，失败后按已完成编号恢复，已确认记录不重复写入。</Typography>
                    <Stack direction="row" spacing={1} mb={1.2}>
                      <TextField size="small" label="批次原因" value={batchReason} onChange={(e) => setBatchReason(e.target.value)} sx={{ flex: 1 }} />
                      <Button variant="contained" startIcon={<CloudUploadOutlined />} onClick={() => store.runBatch(batchSelection, '批量写入岗', batchReason)} disabled={batchSelection.length === 0}>批量写入</Button>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, mb: 1.2 }}>
                      {store.records.map((r) => (
                        <Chip key={r.id} size="small" label={r.id} color={batchSelection.includes(r.id) ? 'primary' : 'default'} variant={batchSelection.includes(r.id) ? 'filled' : 'outlined'} onClick={() => setBatchSelection((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id])} />
                      ))}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    {store.batches.length === 0 && <Typography fontSize={11} color="text.secondary">暂无批次。点击「批量写入」开始。</Typography>}
                    {store.batches.slice().reverse().map((batch) => (
                      <Box key={batch.batchNo} sx={{ py: 1, borderTop: '1px solid #edf0ef' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontSize={12} fontWeight={700}>{batch.batchNo}</Typography>
                          <Chip size="small" label={batch.status === '已完成' ? '已完成' : `进行中 · 失败于 ${batch.failedId}`} color={batch.status === '已完成' ? 'success' : 'warning'} />
                        </Stack>
                        <Typography fontSize={10.5} color="text.secondary" mt={.4}>已完成 {batch.completedIds.length} / {batch.recordIds.length}：{batch.completedIds.join('、') || '—'}</Typography>
                        {batch.status === '进行中' && <Button size="small" variant="outlined" startIcon={<ReplayOutlined />} sx={{ mt: .6 }} onClick={() => store.resumeBatch(batch.batchNo)}>恢复批次</Button>}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Stack>

              <Stack spacing={1.5}>
                <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14} mb={1.3}>发现项闭环</Typography>{store.findings.map((finding) => (
                  <Box key={finding.id} sx={{ borderTop: '1px solid #edf0ef', py: 1.2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography fontSize={12} fontWeight={700}>{finding.title}</Typography>
                      <Stack direction="row" spacing={.5}><Chip size="small" label={finding.status} color={finding.status === '已关闭' ? 'success' : finding.status === '补证中' ? 'warning' : 'error'} />{finding.stale && <Chip size="small" label="失效" color="warning" variant="outlined" />}</Stack>
                    </Stack>
                    <Typography fontSize={10.5} color="text.secondary" mt={.5}>{finding.detail}</Typography>
                    {finding.stale && finding.staleReason && <Chip size="small" icon={<ReplayOutlined />} label={`失效来源：${finding.staleReason}`} color="warning" variant="outlined" sx={{ mt: .6, height: 20, fontSize: 10 }} />}
                    <Stack direction="row" spacing={.7} mt={1}><Button size="small" disabled={finding.status === '已关闭'} onClick={() => store.requestEvidence(finding.id)}>发起补证</Button><Button size="small" disabled={finding.status === '已关闭'} onClick={() => store.closeFinding(finding.id)}>关闭</Button>{finding.type === '对账冲突' && finding.status !== '已关闭' && <Button size="small" color="error" onClick={() => store.resolveConflict(finding.id)}>关闭冲突</Button>}{finding.stale && <Button size="small" color="warning" onClick={() => store.recomputeFinding(finding.id)}>重算</Button>}</Stack>
                  </Box>
                ))}</CardContent></Card>
                <Alert severity="info">任何数据修订都会生成新版本，原始提交和计算链不会被覆盖。冲突项未关闭前，签发提交将被挡住。</Alert>
              </Stack>
            </Box>
          )}

          {view === 'issuance' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 380px' }, gap: 1.5 }}>
              <Card elevation={0} variant="outlined">
                <CardContent>
                  <Typography fontWeight={800} fontSize={14}>签发前完整性检查</Typography>
                  <Typography fontSize={11} color="text.secondary" mb={1.5}>所有门禁项必须确认，开放发现项必须关闭；冲突未清或检查失效时挡住签发。</Typography>
                  {store.issuanceChecks.map((item) => (
                    <Box key={item.id} component="label" sx={{ display: 'flex', gap: 1.3, alignItems: 'flex-start', borderTop: '1px solid #edf0ef', py: 1.5, cursor: 'pointer', bgcolor: item.stale ? '#fdf6ec' : 'transparent' }}>
                      <input type="checkbox" checked={item.checked} onChange={() => store.toggleCheck(item.id)} />
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><Typography fontSize={12.5} fontWeight={700}>{item.title}</Typography>{item.stale && <Chip size="small" icon={<ReplayOutlined />} label="失效" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}</Stack>
                        <Typography fontSize={10.5} color="text.secondary" mt={.4}>{item.detail}</Typography>
                        {item.stale && item.invalidatedBy && <Chip size="small" label={`失效来源：${item.invalidatedBy}`} color="warning" variant="outlined" sx={{ mt: .6, height: 20, fontSize: 10 }} />}
                        {item.stale && <Button size="small" color="warning" sx={{ mt: .5, minWidth: 0, fontSize: 11 }} onClick={() => store.recomputeCheck(item.id)}>重算</Button>}
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
              <Stack spacing={1.5}>
                <Card elevation={0} variant="outlined"><CardContent><Typography fontWeight={800} fontSize={14}>签发就绪度</Typography><Stack direction="row" alignItems="baseline" spacing={1} mt={1}><Typography variant="h4" fontWeight={850}>{Math.round((store.issuanceChecks.filter((c) => c.checked).length / store.issuanceChecks.length) * 70 + (openFindings.length === 0 ? 30 : 0))}%</Typography><Typography fontSize={11} color="text.secondary">完成度</Typography></Stack><LinearProgress variant="determinate" value={(store.issuanceChecks.filter((c) => c.checked).length / store.issuanceChecks.length) * 100} sx={{ height: 7, borderRadius: 3, mt: 1 }} /><Typography fontSize={11} color="text.secondary" mt={1.2}>还有 {openFindings.length} 个开放发现项、{conflictFindings.length} 项冲突、{store.issuanceChecks.filter((c) => c.stale).length} 项失效检查。</Typography></CardContent></Card>
                <Card elevation={0} variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between"><Typography fontWeight={800} fontSize={14}>待复核项</Typography><Chip size="small" label={pendingReview.length + conflictFindings.length} color="warning" /></Stack>
                  {pendingReview.length === 0 && conflictFindings.length === 0 && <Typography fontSize={11} color="text.secondary" mt={1}>无待复核项。</Typography>}
                  {[...conflictFindings, ...pendingReview].map((finding) => (
                    <Box key={finding.id} sx={{ borderTop: '1px solid #edf0ef', py: 1.2 }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <WarningAmberOutlined color={finding.type === '对账冲突' ? 'error' : 'warning'} sx={{ fontSize: 18, mt: .2 }} />
                        <Box><Typography fontSize={12} fontWeight={700}>{finding.title}</Typography><Typography fontSize={10.5} color="text.secondary" mt={.3}>{finding.detail}</Typography>{finding.stale && finding.staleReason && <Chip size="small" label={`失效来源：${finding.staleReason}`} color="warning" variant="outlined" sx={{ mt: .6, height: 20, fontSize: 10 }} />}</Box>
                      </Stack>
                    </Box>
                  ))}
                </CardContent></Card>
                <Alert severity={canSubmit ? 'success' : 'warning'} icon={canSubmit ? <CheckCircleOutlined /> : <WarningAmberOutlined />}>{canSubmit ? '全部门禁已完成，冲突已清，可提交签发准备。' : '冲突未清或检查失效，签发提交被挡住。请先完成复核与重算。'}</Alert>
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
            <Typography variant="body2" color="text.secondary" mt={.5}>当前值 {selected.activity.toLocaleString()} {selected.unit}。修订将生成 V{selected.revision + 1}，原始版本保持不变；相关发现项与签发检查将失效重算。</Typography>
            <TextField fullWidth size="small" label={`修订值 / ${selected.unit}`} value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} margin="normal" />
            <TextField fullWidth size="small" label="修订原因" multiline rows={3} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} margin="normal" />
            {!correctionReason.trim() && <Alert severity="warning">必须填写修订原因。</Alert>}
            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}><Button onClick={() => setCorrectionOpen(false)}>取消</Button><Button variant="contained" disabled={!correctionReason.trim() || !Number(correctionValue)} onClick={() => { store.submitRevision(selected.id, Number(correctionValue), correctionReason, '沈楠'); setCorrectionOpen(false); setCorrectionReason(''); }}>生成新版本</Button></Stack>
          </CardContent></Card>
        </Box>
      )}
    </Box>
  );
}
