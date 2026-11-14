import { useEffect, useMemo, useState } from 'react';
import type { AdminNameRoster, AdminNameRosterPlayer, NameModerationAuditEntry, NameModerationDataSource, NameModerationPolicyDataSource, NameModerationSettingsResponse, NameRisk, NameRuleGroup } from './nameModerationData';
import { createDemoNameRoster, demoNameModerationDataSource, demoNameModerationPolicyDataSource, moderatedNameOnLive } from './nameModerationData';

type Risk = NameRisk;
type RuleCategory = NameRuleGroup;
type RuleMatch = 'word' | 'substring';
type ModerationPlayer = {
  playerId: string;
  matchedRuleIds: string[];
  originalName: string;
  safeDisplayName: string;
  liveName: string;
  displayAction: 'SAFE_NAME' | 'ALIAS' | 'PARTIAL_MASK';
  risk: Risk;
  reasonCategory: string | null;
  reason: string;
  lastSeenAtMs: number | null;
  hidden: boolean;
  reviewAllowed: boolean;
  rank: number | null;
  score: number;
  source: 'TOP10' | 'AUDIENCE';
  positionLabel: string;
};
type ManualRule = { id: string; term: string; category: RuleCategory; match: RuleMatch; severity: 'PARTIAL' | 'HIGH' };
type AuditItem = { id: number | string; atMs: number; action: string; subject: string };

const categoryLabels: Record<RuleCategory | 'MANUAL', string> = {
  PROFANITY: 'Ngôn từ tục', NSFW_SEXUAL: 'Nội dung tình dục', HATE_SPEECH: 'Ngôn từ thù ghét',
  ILLEGAL_HARMFUL: 'Nội dung nguy hiểm', IMPERSONATION: 'Giả mạo', MANUAL: 'Ẩn tay',
};
const riskLabels: Record<Risk, string> = {
  NONE: 'Bình thường giữ nguyên', REVIEW: 'Cần xem', PARTIAL: 'Che một phần', HIGH: 'Mức cao', MANUAL_HIDE: 'Đã ẩn tay',
};

function displayTime(atMs: number | null) {
  if (!atMs) return '—';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(atMs);
}

function playerRows(roster: AdminNameRoster): ModerationPlayer[] {
  return roster.players.map((entry: AdminNameRosterPlayer) => {
    const safeDisplayName = moderatedNameOnLive(entry);
    const reasonCategory = entry.matchedRuleGroups[0] ?? (entry.risk === 'MANUAL_HIDE' ? 'MANUAL' : null);
    const reason = entry.matchedRuleGroups.map((group) => categoryLabels[group]).join(' · ') || (entry.risk === 'NONE' ? 'Chưa có cảnh báo.' : 'Người vận hành đã ẩn tên thủ công.');
    return {
      playerId: entry.playerId,
      matchedRuleIds: entry.matchedRuleIds,
      originalName: entry.rawDisplayName,
      safeDisplayName,
      liveName: safeDisplayName,
      displayAction: entry.displayAction,
      risk: entry.risk,
      reasonCategory,
      reason,
      lastSeenAtMs: entry.checkedAt,
      hidden: entry.hidden,
      reviewAllowed: entry.reviewAllowed,
      rank: entry.rank,
      score: entry.score,
      source: entry.rank !== null ? 'TOP10' as const : 'AUDIENCE' as const,
      positionLabel: entry.rank !== null ? `Top 10 · hạng ${entry.rank}` : entry.seat ? `Khán đài · ghế ${entry.seat.slotId}` : 'Đang chờ vào sân',
    };
  });
}

const auditActionLabels: Record<string, string> = {
  PLAYERS_HIDDEN: 'Ẩn tên', PLAYERS_RESTORED: 'Cho hiện tên', REVIEW_ALLOWED: 'Cho phép hiện',
  REVIEW_ALLOW_REMOVED: 'Gỡ cho phép hiện', CUSTOM_RULE_ADDED: 'Thêm quy tắc chặn',
  SCOPED_EXCEPTION_ADDED: 'Thêm ngoại lệ', OFFICIAL_ACCOUNT_VERIFIED: 'Xác minh tài khoản',
  NAMES_RECHECKED: 'Kiểm tra lại tên', POLICY_UPDATED: 'Cập nhật chính sách',
};

function apiAuditItem(entry: NameModerationAuditEntry): AuditItem {
  const actor = entry.actor.toLocaleLowerCase('vi-VN') === 'operator' ? 'Người vận hành' : entry.actor;
  const subject = [actor, entry.targetCount ? `${entry.targetCount} người chơi` : '', entry.ruleId ? `Quy tắc ${entry.ruleId}` : ''].filter(Boolean).join(' · ');
  return { id: entry.id, atMs: entry.at, action: auditActionLabels[entry.action] ?? entry.action, subject };
}

function settingsRules(settings: NameModerationSettingsResponse): ManualRule[] {
  return settings.rules.filter((rule) => rule.source === 'CUSTOM').map((rule) => ({
    id: rule.id, term: rule.term, category: rule.group, match: rule.match, severity: rule.severity,
  }));
}

export function NameModerationPage({ isMock, dataSource = isMock ? demoNameModerationDataSource : null, policyDataSource = isMock ? demoNameModerationPolicyDataSource : null }: { overlayUrl: string; isMock: boolean; dataSource?: NameModerationDataSource | null; policyDataSource?: NameModerationPolicyDataSource | null }) {
  const [roster, setRoster] = useState<AdminNameRoster>(() => isMock ? createDemoNameRoster() : { players: [], policyVersion: 0, playerNameSpeech: 'UNSUPPORTED' });
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | Risk>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [reviewPermissions, setReviewPermissions] = useState<Record<string, boolean>>({});
  const [rules, setRules] = useState<ManualRule[]>(() => isMock ? [
    { id: 'rule-impersonation-01', term: 'Admin Bão Tố', category: 'IMPERSONATION', match: 'substring', severity: 'HIGH' },
  ] : []);
  const [exceptions, setExceptions] = useState<string[]>(() => isMock ? ['Đội Gió Xanh'] : []);
  const [protectedEntities, setProtectedEntities] = useState<string[]>([]);
  const [policyLoading, setPolicyLoading] = useState(!isMock && Boolean(policyDataSource));
  const [exceptionPlayerId, setExceptionPlayerId] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [exceptionText, setExceptionText] = useState('');
  const [ruleCategory, setRuleCategory] = useState<RuleCategory>('PROFANITY');
  const [ruleMatch, setRuleMatch] = useState<RuleMatch>('word');
  const [ruleSeverity, setRuleSeverity] = useState<'PARTIAL' | 'HIGH'>('HIGH');
  const [audit, setAudit] = useState<AuditItem[]>(() => isMock ? [
    { id: 1, atMs: Date.now() - 28_000, action: 'Ẩn tên', subject: 'Mây Xanh 24' },
    { id: 2, atMs: Date.now() - 94_000, action: 'Thêm ngoại lệ', subject: 'Đội Gió Xanh' },
    { id: 3, atMs: Date.now() - 205_000, action: 'Thêm từ chặn', subject: 'Admin Bão Tố' },
  ] : []);
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewScene, setPreviewScene] = useState<'top10' | 'victory'>('top10');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!dataSource) return;
    let active = true;
    void dataSource.loadRoster().then((nextRoster) => {
      if (active) { setRoster(nextRoster); setApiError(''); }
    }).catch((cause: unknown) => {
      if (active && !isMock) setApiError(cause instanceof Error ? cause.message : 'Không tải được roster quản trị.');
    });
    const unsubscribe = dataSource.subscribe((nextRoster) => {
      if (active) { setRoster(nextRoster); setApiError(''); }
    }, (cause) => {
      if (active && !isMock) setApiError(cause.message);
    });
    return () => { active = false; unsubscribe(); };
  }, [dataSource, isMock]);

  useEffect(() => {
    if (!policyDataSource || isMock) return;
    let active = true;
    setPolicyLoading(true);
    void loadPolicyAndAudit().catch((cause: unknown) => {
      if (active) setApiError(cause instanceof Error ? cause.message : 'Không tải được chính sách và lịch sử kiểm duyệt tên.');
    }).finally(() => { if (active) setPolicyLoading(false); });
    return () => { active = false; };
  }, [policyDataSource, isMock]);

  const rows = useMemo(() => playerRows(roster).map((row) => {
    const key = row.playerId;
    const hasOverride = Object.prototype.hasOwnProperty.call(visibility, key);
    const hidden = hasOverride ? (visibility[key] ?? row.hidden) : row.hidden;
    const sourceEntry = roster.players.find((entry) => entry.playerId === row.playerId);
    const reviewAllowed = reviewPermissions[key] ?? row.reviewAllowed;
    const hiddenAlias = sourceEntry && sourceEntry.displayAction === 'SAFE_NAME'
      ? `Người chơi ${String(Number(sourceEntry.playerId.match(/(\d+)$/u)?.[1] ?? '0')).padStart(2, '0')}`
      : sourceEntry?.safeDisplayName ?? row.safeDisplayName;
    const liveName = reviewAllowed && row.risk === 'REVIEW' && !hidden ? row.originalName
      : !hasOverride ? row.safeDisplayName : hidden ? hiddenAlias : row.originalName;
    const risk = hidden && hasOverride ? 'MANUAL_HIDE' as const
      : hasOverride && !hidden && row.risk === 'MANUAL_HIDE' ? 'NONE' as const : row.risk;
    const displayAction = liveName === row.originalName ? 'SAFE_NAME' as const
      : row.risk === 'PARTIAL' && !hidden ? 'PARTIAL_MASK' as const : 'ALIAS' as const;
    return { ...row, hidden, reviewAllowed, safeDisplayName: liveName, liveName, displayAction,
      risk };
  }), [roster, visibility, reviewPermissions]);
  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    const matchesQuery = !query || `${row.originalName} ${row.liveName}`.toLocaleLowerCase('vi-VN').includes(query);
    return matchesQuery && (riskFilter === 'ALL' || row.risk === riskFilter);
  });
  const warningCount = rows.filter((row) => row.risk !== 'NONE').length;
  const hiddenCount = rows.filter((row) => row.hidden || row.displayAction !== 'SAFE_NAME' && (
    row.risk === 'HIGH' || row.risk === 'REVIEW' && !row.reviewAllowed
  )).length;
  const rankedRows = rows.filter((row) => row.rank !== null)
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  const previewTop10 = (rankedRows.length ? rankedRows : rows).slice(0, 10);
  const previewTop3 = previewTop10.slice(0, 3);
  const canChangeDemo = isMock && Boolean(dataSource);
  const canChangeVisibility = canChangeDemo || Boolean(dataSource?.setVisibility);
  const canAllowReview = canChangeDemo || Boolean(dataSource?.setReviewAllowed);
  const canRecheck = canChangeDemo || Boolean(dataSource?.recheck);
  const canAddRule = canChangeDemo || Boolean(policyDataSource?.addRule);
  const canAddException = canChangeDemo || Boolean(policyDataSource?.addException);
  const canChangePolicy = canChangeDemo || Boolean(policyDataSource?.updatePolicy);
  const exceptionCandidates = rows.filter((row) => row.matchedRuleIds.length > 0);
  const exceptionPlayer = exceptionCandidates.find((row) => row.playerId === exceptionPlayerId) ?? exceptionCandidates.find((row) => selected.includes(row.playerId)) ?? exceptionCandidates[0];

  function addAudit(action: string, subject: string) {
    setAudit((items) => [{ id: Date.now() + Math.random(), atMs: Date.now(), action, subject }, ...items].slice(0, 12));
    setNow(Date.now());
  }

  async function loadPolicyAndAudit() {
    if (!policyDataSource) return;
    const [settings, auditResponse] = await Promise.all([policyDataSource.loadPolicy(), policyDataSource.loadAudit()]);
    setRules(settingsRules(settings));
    setExceptions(settings.whitelist.map((entry) => entry.value));
    setProtectedEntities(settings.protectedEntities.map((entity) => entity.label));
    setAudit(auditResponse.entries.map(apiAuditItem));
  }

  async function refreshAfterMutation(message: string) {
    if (dataSource && !isMock) {
      try {
        setRoster(await dataSource.loadRoster());
        setApiError('');
      } catch (cause) {
        setApiError(cause instanceof Error ? cause.message : 'Thao tác đã gửi nhưng không tải lại được roster.');
      }
    }
    if (policyDataSource && !isMock) {
      try { await loadPolicyAndAudit(); }
      catch (cause) { setApiError(cause instanceof Error ? cause.message : 'Không tải lại được chính sách và lịch sử.'); }
    }
    setNotice(message);
  }

  async function removeRule(rule: ManualRule) {
    if (!canChangePolicy || busy) return;
    if (!isMock && policyDataSource?.updatePolicy) {
      setBusy(true);
      setApiError('');
      try {
        const settings = await policyDataSource.loadPolicy();
        const whitelist = settings.whitelist.map((entry) => ({ ...entry, ruleIds: entry.ruleIds.filter((id) => id !== rule.id) }))
          .filter((entry) => entry.ruleIds.length > 0);
        await policyDataSource.updatePolicy({
          rules: settings.rules.filter((entry) => entry.id !== rule.id), whitelist,
          hiddenPlayerIds: settings.hiddenPlayerIds, allowedReviewPlayerIds: settings.allowedReviewPlayerIds,
          verifiedOfficialAccounts: settings.verifiedOfficialAccounts,
        });
        await loadPolicyAndAudit();
        setNotice(`Đã gỡ quy tắc “${rule.term}” khỏi LIVE.`);
      } catch (cause) { setApiError(cause instanceof Error ? cause.message : 'Không thể gỡ quy tắc chặn.'); }
      finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    setRules((value) => value.filter((item) => item.id !== rule.id));
    addAudit('Gỡ quy tắc chặn', rule.term);
  }

  async function removeException(term: string) {
    if (!canChangePolicy || busy) return;
    if (!isMock && policyDataSource?.updatePolicy) {
      setBusy(true);
      setApiError('');
      try {
        const settings = await policyDataSource.loadPolicy();
        await policyDataSource.updatePolicy({
          rules: settings.rules, whitelist: settings.whitelist.filter((entry) => entry.value !== term),
          hiddenPlayerIds: settings.hiddenPlayerIds, allowedReviewPlayerIds: settings.allowedReviewPlayerIds,
          verifiedOfficialAccounts: settings.verifiedOfficialAccounts,
        });
        await loadPolicyAndAudit();
        setNotice(`Đã gỡ ngoại lệ “${term}” khỏi LIVE.`);
      } catch (cause) { setApiError(cause instanceof Error ? cause.message : 'Không thể gỡ ngoại lệ.'); }
      finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    setExceptions((value) => value.filter((item) => item !== term));
    addAudit('Gỡ ngoại lệ', term);
  }

  async function setPlayerHidden(row: ModerationPlayer, hidden: boolean) {
    if (!canChangeVisibility || busy) return;
    if (!isMock && dataSource?.setVisibility) {
      setBusy(true);
      setApiError('');
      try {
        await dataSource.setVisibility([row.playerId], hidden);
        setSelected((value) => value.filter((id) => id !== row.playerId));
        await refreshAfterMutation(hidden ? 'Đã ẩn tên trên LIVE.' : 'Đã cho hiện tên trên LIVE.');
      } catch (cause) {
        setApiError(cause instanceof Error ? cause.message : 'Không thể cập nhật hiển thị tên.');
      } finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    setVisibility((value) => ({ ...value, [row.playerId]: hidden }));
    setSelected((value) => value.filter((id) => id !== row.playerId));
    addAudit(hidden ? 'Ẩn tên' : 'Cho hiện tên', row.originalName);
    setNotice(hidden ? `LIVE sẽ dùng tên an toàn cho ${row.originalName}. (DEMO)` : `Đã cho hiện ${row.originalName}. (DEMO)`);
  }

  async function setSelectedVisibility(hidden: boolean) {
    const changed = rows.filter((row) => selected.includes(row.playerId));
    if (!canChangeVisibility || !changed.length || busy) return;
    if (!isMock && dataSource?.setVisibility) {
      setBusy(true);
      setApiError('');
      try {
        await dataSource.setVisibility(changed.map((row) => row.playerId), hidden);
        setSelected([]);
        await refreshAfterMutation(`${hidden ? 'Đã ẩn' : 'Đã cho hiện'} ${changed.length} tên trên LIVE.`);
      } catch (cause) {
        setApiError(cause instanceof Error ? cause.message : 'Không thể cập nhật hiển thị tên.');
      } finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    setVisibility((value) => Object.fromEntries([...Object.entries(value), ...changed.map((row) => [row.playerId, hidden])]));
    for (const row of changed) addAudit(hidden ? 'Ẩn tên' : 'Cho hiện tên', row.originalName);
    setSelected([]);
    setNotice(`${hidden ? 'Đã ẩn' : 'Đã cho hiện'} ${changed.length} tên trong dữ liệu DEMO.`);
  }

  async function addBlockedRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = ruleText.trim();
    if (!canAddRule || busy || !term || /[<>]/u.test(term) || rules.some((rule) => rule.term.toLocaleLowerCase('vi-VN') === term.toLocaleLowerCase('vi-VN'))) return;
    if (!isMock && policyDataSource?.addRule) {
      setBusy(true);
      setApiError('');
      try {
        await policyDataSource.addRule({ term, aliases: [], match: ruleMatch, group: ruleCategory, severity: ruleSeverity });
        await loadPolicyAndAudit();
        setRuleText('');
        setNotice('Đã thêm quy tắc do người vận hành tạo lên LIVE.');
      } catch (cause) {
        setApiError(cause instanceof Error ? cause.message : 'Không thể thêm quy tắc chặn.');
      } finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    const id = `demo-rule-${Date.now()}`;
    setRules((value) => [...value, { id, term, category: ruleCategory, match: ruleMatch, severity: ruleSeverity }]);
    addAudit('Thêm quy tắc chặn', term);
    setRuleText('');
    setNotice(`Đã thêm quy tắc DEMO cho “${term}”.`);
  }

  async function addException(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = exceptionText.trim();
    const ruleIds = exceptionPlayer?.matchedRuleIds ?? [];
    if (!canAddException || busy || !term || /[<>]/u.test(term) || !ruleIds.length || exceptions.some((item) => item.toLocaleLowerCase('vi-VN') === term.toLocaleLowerCase('vi-VN'))) return;
    if (!isMock && policyDataSource?.addException) {
      setBusy(true);
      setApiError('');
      try {
        await policyDataSource.addException({ value: term, ruleIds });
        await loadPolicyAndAudit();
        setExceptionText('');
        setNotice('Đã thêm ngoại lệ lên LIVE.');
      } catch (cause) {
        setApiError(cause instanceof Error ? cause.message : 'Không thể thêm ngoại lệ.');
      } finally { setBusy(false); }
      return;
    }
    if (!canChangeDemo) return;
    setExceptions((value) => [...value, term]);
    addAudit('Thêm ngoại lệ', term);
    setExceptionText('');
    setNotice(`Đã thêm ngoại lệ DEMO “${term}”.`);
  }

  function recheckAll() {
    if (!canRecheck || busy) return;
    if (!isMock && dataSource?.recheck) {
      setBusy(true);
      setApiError('');
      void dataSource.recheck().then(async () => {
        await refreshAfterMutation('Đã yêu cầu kiểm tra lại toàn bộ người chơi trên LIVE.');
      }).catch((cause: unknown) => {
        setApiError(cause instanceof Error ? cause.message : 'Không thể kiểm tra lại roster.');
      }).finally(() => setBusy(false));
      return;
    }
    if (!canChangeDemo) return;
    addAudit('Kiểm tra lại toàn bộ', `${rows.length} tên`);
    setNotice(`Đã gửi yêu cầu kiểm tra lại ${rows.length} tên trong dữ liệu DEMO.`);
  }

  function allowReview(rowsToAllow: ModerationPlayer[]) {
    const changed = rowsToAllow.filter((row) => row.risk === 'REVIEW' && !row.reviewAllowed);
    if (!canAllowReview || !changed.length || busy) return;
    if (!isMock && dataSource?.setReviewAllowed) {
      setBusy(true);
      setApiError('');
      void dataSource.setReviewAllowed(changed.map((row) => row.playerId), true).then(async () => {
        setSelected((value) => value.filter((id) => !changed.some((row) => row.playerId === id)));
        await refreshAfterMutation(`Đã cho phép hiện ${changed.length} tên cần xem trên LIVE.`);
      }).catch((cause: unknown) => {
        setApiError(cause instanceof Error ? cause.message : 'Không thể cập nhật quyền cho phép hiện tên.');
      }).finally(() => setBusy(false));
      return;
    }
    if (!canChangeDemo) return;
    setReviewPermissions((value) => ({ ...value, ...Object.fromEntries(changed.map((row) => [row.playerId, true])) }));
    for (const row of changed) addAudit('Cho phép hiện', row.originalName);
    setSelected((value) => value.filter((id) => !changed.some((row) => row.playerId === id)));
    setNotice(`Đã cho phép hiện ${changed.length} tên cần xem trong dữ liệu DEMO.`);
  }

  const audienceTotal = roster.players.length;
  const selectedActionable = rows.filter((row) => selected.includes(row.playerId)).length;

  return <section className="name-moderation-page" data-testid="name-moderation-page">
    <section className="name-moderation-heading">
      <div><span className="eyebrow">AN TOÀN DANH TÍNH · ĐIỀU PHỐI LIVE</span><h1>Kiểm duyệt tên</h1><p>Người vận hành quyết định tên nào được ẩn hoặc xuất hiện trên các phần Storm Arena tự hiển thị.</p></div>
      <span className={`moderation-mode ${isMock ? 'is-demo' : ''}`}>{isMock ? 'MOCK · DỮ LIỆU DEMO' : 'LIVE · API QUẢN TRỊ'}</span>
    </section>

    <section className="name-voice-notice" role="note" data-testid="name-voice-notice">
      <span aria-hidden="true">◌</span><b>Đọc tên người chơi: Chưa hỗ trợ trong phiên bản này</b>
      <small>Không có tuỳ chọn bật đọc tên. Bộ kiểm duyệt chỉ tác động lên tên hiển thị trong giao diện Storm Arena.</small>
    </section>
    {!isMock && <div className="moderation-api-notice" role="status">Roster quản trị dùng API riêng, tách khỏi snapshot công khai. Thay đổi tên sẽ được đồng bộ ngay tới overlay sau khi server xác nhận.</div>}
    {apiError && <div className="alert alert-error moderation-notice" role="alert">Không đồng bộ được API moderation: {apiError}</div>}
    {notice && <div className="alert alert-success moderation-notice" role="status">{notice}</div>}

    <section className="moderation-metrics" aria-label="Tổng quan kiểm duyệt">
      <div><span>CẦN XEM</span><b data-testid="moderation-warning-count">{warningCount}</b><small>cảnh báo hoặc đã ẩn tay</small></div>
      <div><span>ĐANG ẨN TRÊN LIVE</span><b data-testid="moderation-hidden-count">{hiddenCount}</b><small>mức cao, cần xem chưa cho phép hoặc ẩn tay</small></div>
      <div><span>NGƯỜI ĐANG CHƠI</span><b>{audienceTotal.toLocaleString('vi-VN')}</b><small>Top 10 và khán đài</small></div>
      <div><span>ĐỒNG BỘ</span><b className="moderation-live-dot">{isMock ? 'MOCK' : 'LIVE'}</b><small>{new Date(now).toLocaleTimeString('vi-VN')}</small></div>
    </section>

    <section className="panel moderation-list-panel">
      <div className="panel-title moderation-panel-title"><div><span className="eyebrow">DANH SÁCH NGƯỜI CHƠI</span><h2>Tên cần xem và tên đang có mặt trên LIVE</h2></div><button type="button" className="secondary-button" onClick={recheckAll} disabled={!canRecheck || busy}>Kiểm tra lại toàn bộ</button></div>
      <p className="moderation-helper">Tên gốc chỉ hiển thị cho người vận hành. Tên ở cột LIVE là tên an toàn dùng trên Top 10, khán đài và Victory.</p>
      <div className="moderation-toolbar">
        <label className="moderation-search">Tìm người chơi<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên gốc hoặc tên trên LIVE" aria-label="Tìm theo tên" /></label>
        <label className="moderation-filter">Mức cảnh báo<select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'ALL' | Risk)} aria-label="Lọc mức cảnh báo"><option value="ALL">Tất cả mức</option><option value="REVIEW">Cần xem</option><option value="PARTIAL">Che một phần</option><option value="HIGH">Mức cao</option><option value="MANUAL_HIDE">Đã ẩn tay</option><option value="NONE">Bình thường giữ nguyên</option></select></label>
        <div className="moderation-bulk-actions"><button className="danger-button" type="button" disabled={!canChangeVisibility || busy || selectedActionable === 0} onClick={() => void setSelectedVisibility(true)}>Ẩn đã chọn</button><button className="secondary-button" type="button" disabled={!canChangeVisibility || busy || selectedActionable === 0} onClick={() => void setSelectedVisibility(false)}>Cho hiện đã chọn</button><button className="secondary-button" type="button" disabled={!canAllowReview || busy || !rows.some((row) => selected.includes(row.playerId) && row.risk === 'REVIEW' && !row.reviewAllowed)} onClick={() => allowReview(rows.filter((row) => selected.includes(row.playerId)))}>Cho phép hiện</button></div>
      </div>
      <div className="moderation-table-wrap">
        <table className="moderation-table">
          <thead><tr><th><span className="sr-only">Chọn</span></th><th>Tên gốc · quản trị</th><th>Tên trên LIVE</th><th>Mức / nhóm lý do</th><th>Thời gian</th><th>Thao tác</th></tr></thead>
          <tbody>{filteredRows.map((row) => {
            const key = row.playerId;
            const disabled = !canChangeVisibility || busy;
            return <tr key={key} data-testid="moderation-player-row" data-risk={row.risk} data-hidden={row.hidden}>
              <td><input type="checkbox" aria-label={`Chọn ${row.originalName}`} checked={selected.includes(row.playerId)} disabled={disabled} onChange={(event) => setSelected((value) => event.target.checked ? [...new Set([...value, row.playerId])] : value.filter((id) => id !== row.playerId))} /></td>
              <td><b className="moderation-raw-name">{row.originalName}</b><small>{row.positionLabel}</small></td>
              <td><span className={`moderation-live-name ${row.hidden ? 'is-hidden' : ''}`} title={row.safeDisplayName}>{row.safeDisplayName}</span><small>{row.hidden ? 'Đã ẩn tay · đang dùng tên thay thế' : row.displayAction === 'PARTIAL_MASK' ? 'Đã che một phần theo quy tắc' : row.displayAction === 'ALIAS' ? 'Đang dùng tên thay thế theo quy tắc' : 'Đang hiển thị'}</small></td>
              <td><span className={`risk-badge risk-${row.risk.toLowerCase()}`}>{riskLabels[row.risk]}</span><small>{row.reasonCategory ? categoryLabels[row.reasonCategory as keyof typeof categoryLabels] ?? row.reasonCategory : row.reason}</small></td>
              <td><time>{row.lastSeenAtMs ? displayTime(row.lastSeenAtMs) : '—'}</time></td>
              <td><div className="moderation-row-actions"><button className={row.hidden ? 'secondary-button' : 'moderation-hide-button'} type="button" disabled={disabled} onClick={() => void setPlayerHidden(row, !row.hidden)}>{row.hidden ? 'Cho hiện' : 'Ẩn'}</button>{row.risk === 'REVIEW' && <button className="secondary-button" type="button" disabled={!canAllowReview || busy || row.reviewAllowed} onClick={() => allowReview([row])}>{row.reviewAllowed ? 'Đã cho phép' : 'Cho phép hiện'}</button>}</div></td>
            </tr>;
          })}</tbody>
        </table>
        {!filteredRows.length && <div className="moderation-empty" role="status">Không có tên phù hợp với bộ lọc.</div>}
      </div>
    </section>

    <div className="moderation-lower-grid">
      <section className="panel moderation-rules-panel">
        <div className="panel-title"><div><span className="eyebrow">CHÍNH SÁCH</span><h2>Từ chặn và ngoại lệ</h2></div><button type="button" className="secondary-button" onClick={() => { addAudit('Rà soát thực thể bảo vệ', 'Danh mục tổ chức'); setNotice('Đã mở yêu cầu rà soát thực thể được bảo vệ trong dữ liệu DEMO.'); }} disabled={!canChangeDemo}>Rà soát thực thể bảo vệ</button></div>
        {!isMock && <p className="moderation-helper">Bộ từ mặc định (SYSTEM) không hiển thị trong API này; danh sách dưới đây chỉ gồm quy tắc người vận hành tự thêm.</p>}
        {!isMock && policyLoading && <p className="moderation-helper" role="status">Đang tải chính sách kiểm duyệt…</p>}
        {!isMock && !policyLoading && protectedEntities.length > 0 && <p className="moderation-helper">Thực thể được bảo vệ: {protectedEntities.join(' · ')}</p>}
        <form className="moderation-rule-form" onSubmit={addBlockedRule}>
          <label>Từ / cụm từ cần chặn<input value={ruleText} onChange={(event) => setRuleText(event.target.value)} maxLength={64} placeholder="Nhập cụm từ · tối đa 64 ký tự" disabled={!canAddRule || busy} /></label>
          <label>Nhóm<select value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value as RuleCategory)} disabled={!canAddRule || busy}>{Object.entries(categoryLabels).filter(([key]) => key !== 'MANUAL').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Mức xử lý<select value={ruleSeverity} onChange={(event) => setRuleSeverity(event.target.value as 'PARTIAL' | 'HIGH')} disabled={!canAddRule || busy}><option value="PARTIAL">Che một phần</option><option value="HIGH">Ẩn bằng tên thay thế</option></select></label>
          <label>Khớp<select value={ruleMatch} onChange={(event) => setRuleMatch(event.target.value as RuleMatch)} disabled={!canAddRule || busy}><option value="word">Cả từ</option><option value="substring">Trong cụm</option></select></label>
          <button className="primary-button" type="submit" disabled={!canAddRule || busy || !ruleText.trim()}>Thêm từ chặn</button>
        </form>
        <div className="moderation-rule-list" aria-label="Từ chặn hiện tại">{rules.map((rule) => <div className="moderation-rule-chip" key={rule.id}><span><b>{rule.term}</b><small>{categoryLabels[rule.category]} · {rule.match === 'word' ? 'cả từ' : 'trong cụm'} · {rule.severity === 'PARTIAL' ? 'che một phần' : 'tên thay thế'}</small></span><button type="button" aria-label={`Xoá quy tắc chặn ${rule.term}`} disabled={!canChangePolicy || busy} onClick={() => void removeRule(rule)}>×</button></div>)}</div>
        {!isMock && !policyLoading && rules.length === 0 && <p className="moderation-helper">Chưa có quy tắc do người vận hành tự thêm.</p>}
        <form className="moderation-exception-form" onSubmit={addException}><label>Thêm ngoại lệ<input value={exceptionText} onChange={(event) => setExceptionText(event.target.value)} maxLength={80} placeholder="Tên / cụm từ được cho phép" disabled={!canAddException || busy} /></label><label>Người chơi có quy tắc áp dụng<select aria-label="Người chơi có quy tắc áp dụng" value={exceptionPlayer?.playerId ?? ''} onChange={(event) => setExceptionPlayerId(event.target.value)} disabled={!canAddException || busy || !exceptionCandidates.length}><option value="">Chọn người chơi</option>{exceptionCandidates.map((row) => <option key={row.playerId} value={row.playerId}>{row.originalName} · {row.matchedRuleIds.length} quy tắc</option>)}</select></label><button className="secondary-button" type="submit" disabled={!canAddException || busy || !exceptionText.trim() || !exceptionPlayer?.matchedRuleIds.length}>Thêm ngoại lệ</button></form>
        <div className="moderation-rule-list" aria-label="Ngoại lệ hiện tại">{exceptions.map((term) => <div className="moderation-rule-chip is-exception" key={term}><span><b>{term}</b><small>Ngoại lệ người vận hành</small></span><button type="button" aria-label={`Xoá ngoại lệ ${term}`} disabled={!canChangePolicy || busy} onClick={() => void removeException(term)}>×</button></div>)}</div>
      </section>

      <section className="panel moderation-preview-panel">
        <div className="panel-title"><div><span className="eyebrow">XEM TRƯỚC</span><h2>Tên an toàn trên LIVE</h2></div><label className="moderation-scene-select"><span>Cảnh</span><select aria-label="Cảnh xem trước" value={previewScene} onChange={(event) => setPreviewScene(event.target.value as 'top10' | 'victory')}><option value="top10">Top 10</option><option value="victory">Victory · Top 3</option></select></label></div>
        <p className="moderation-helper">Bản xem trước chữ lấy trực tiếp từ tên an toàn trong roster, không nhúng một overlay mẫu khác.</p>
        <div className={`moderation-preview-frame preview-${previewScene}`} data-testid={`moderation-preview-${previewScene}`}>
          <b className="moderation-preview-title">{previewScene === 'top10' ? 'BẢNG XẾP HẠNG · TOP 10' : 'VICTORY · TOP 3'}</b>
          <ol className="moderation-preview-rows">{(previewScene === 'top10' ? previewTop10 : previewTop3).map((row, index) => <li key={row.playerId}><b>{previewScene === 'top10' ? row.rank ?? index + 1 : index + 1}</b><span title={row.safeDisplayName}>{row.safeDisplayName}</span>{previewScene === 'top10' && <small>{row.score.toLocaleString('vi-VN')}</small>}</li>)}</ol>
          {!previewTop10.length && <p className="moderation-preview-empty">Chưa có người chơi trong bảng.</p>}
        </div>
      </section>

      <section className="panel moderation-history-panel">
        <div className="panel-title"><div><span className="eyebrow">LỊCH SỬ</span><h2>Lịch sử thao tác</h2></div><span className="muted">{audit.length} mục gần nhất</span></div>
        {!isMock && <p className="moderation-helper">Hiển thị tối đa 6 mục mới nhất; API tải tối đa 100 mục và chưa cung cấp trang tiếp theo hoặc tổng số.</p>}
        <ol className="moderation-history" data-testid="moderation-history">{audit.slice(0, 6).map((item) => <li key={item.id}><span className="history-marker" /><div><b>{item.action}</b><small>{item.subject}</small></div><time>{displayTime(item.atMs)}</time></li>)}</ol>
      </section>
    </div>
  </section>;
}
