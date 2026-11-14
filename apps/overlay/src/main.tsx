import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { McStateSchema, type PublicLeaderboardEntry, type PublicPodiumSlot, type PublicSnapshot } from '@quiz/contracts';
import { interpolateRemainingMs, leaderboardPages, podiumLeftToRight } from './overlayLogic';
import { useSnapshot } from './net/useSnapshot';
import { MOCK_SCENES } from './mock/snapshots';
import { ArenaStage, V3_SCENES } from './v3/ArenaStage';
import { V3_VICTORY_SCENES, VictoryStage } from './v3/Victory';
import { ConnectionLostStage, IntermissionStage, LeaderboardStage, V3_AUX_SCENES } from './v3/AuxiliaryStages';
import { AudioFxLayer } from './v3/AudioFxLayer';
import { overlayFitFromSearch, overlayRoleFromSearch, overlayStageScale } from './overlayRole';
import { publicPlayerName } from './publicPlayerName';
import { HudConfigProvider, useLiveHudConfig } from './hudConfig';
import type { AudioEngineState } from './audio/audio-engine';
import './style.css';

function useStageScale(fit: 'contain' | 'cover') {
  const [scale, setScale] = useState(() => overlayStageScale(window.innerWidth, window.innerHeight, fit));
  useEffect(() => {
    const resize = () => {
      setScale(overlayStageScale(window.innerWidth, window.innerHeight, fit));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [fit]);
  return scale;
}

function formatTime(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function useTimer(snapshot: PublicSnapshot, serverTimeMs: number, clockOffsetMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let frame = 0;
    const tick = () => { setNow(Date.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [snapshot.stateVersion, snapshot.timer?.remainingMs, snapshot.timer?.running, serverTimeMs]);
  if (!snapshot.timer) return 0;
  return interpolateRemainingMs(snapshot.timer.remainingMs, snapshot.timer.running, now + clockOffsetMs - serverTimeMs);
}

function Leaderboard({ entries, compact = false, allowLegacyNames }: { entries: PublicLeaderboardEntry[]; compact?: boolean; allowLegacyNames: boolean }) {
  return <div className={`leaderboard ${compact ? 'leaderboard-compact' : ''}`}>
    {entries.map((entry) => <div className="leaderboard-row" data-testid="leaderboard-row" key={entry.playerId}>
      <span className="rank">{entry.rank}</span>
      {(() => { const name = publicPlayerName(entry, `Người chơi ${entry.rank}`, allowLegacyNames); return <span className="player-name" title={name}>{name}{entry.tied && <small>ĐỒNG HẠNG</small>}</span>; })()}
      <span className="score">{entry.score.toLocaleString('vi-VN')}<small>điểm</small></span>
    </div>)}
  </div>;
}

function Podium({ slots, tied, allowLegacyNames }: { slots: PublicPodiumSlot[]; tied: boolean; allowLegacyNames: boolean }) {
  return <div className="podium-row">
    {podiumLeftToRight(slots).map((slot) => <div className={`podium-card place-${slot.place}`} data-testid={`podium-slot-${slot.place}`} data-place={slot.place} key={slot.place}>
      <div className="avatar-silhouette" aria-hidden="true"><span /></div>
      <div className="nameplate">
        {slot.entries.map((entry, index) => <div className="podium-name" key={entry.playerId}>{publicPlayerName(entry, `Người chơi hạng ${slot.rank}${slot.entries.length > 1 ? ` · ${index + 1}` : ''}`, allowLegacyNames)}</div>)}
        <b>{slot.entries.map((entry) => entry.score.toLocaleString('vi-VN')).join(' · ')} điểm</b>
        {(slot.tied || (tied && slot.entries.length > 1)) && <strong className="tie-label">ĐỒNG HẠNG</strong>}
      </div>
      <div className="podium-base"><small>{slot.place}</small></div>
    </div>)}
  </div>;
}

function SceneContent({ snapshot, remainingMs, allowLegacyNames }: { snapshot: PublicSnapshot; remainingMs: number; allowLegacyNames: boolean }) {
  const { scene } = snapshot;
  const [page, setPage] = useState(0);
  const entries = snapshot.leaderboard?.entries ?? [];
  const reveal = snapshot.reveal;
  const pages = useMemo(() => leaderboardPages(entries, 5), [entries]);
  useEffect(() => {
    if (scene !== 'INTERIM_TOP10' || pages.length < 2) return;
    const timer = window.setInterval(() => setPage((value) => (value + 1) % pages.length), 2_000);
    return () => window.clearInterval(timer);
  }, [scene, pages.length]);

  if (scene === 'LOBBY') return <section className="lobby-panel">
    <div className="eyebrow">ĐẤU TRƯỜNG TRỰC TIẾP</div>
    <h1>BÁ VƯƠNG<br /><span>ĐẠI CHIẾN</span></h1>
    <p className="instruction">Bình luận <b>A, B, C hoặc D</b><br />để trả lời câu hỏi</p>
    <div className="participant-pill"><i /> {snapshot.participantCount} chiến binh tham gia</div>
  </section>;

  if (scene === 'QUESTION' || scene === 'REVEAL') {
    const isPrepare = snapshot.state === 'PREPARE';
    const canReveal = scene === 'REVEAL' && reveal !== null;
    const optionsVisible = snapshot.question?.optionsVisible === true && !isPrepare;
    const optionIds = ['A', 'B', 'C', 'D'] as const;
    return <section className={`question-scene ${canReveal ? 'question-scene-reveal' : ''}`}>
      <div className="question-meta">
        <span>CÂU HỎI {((snapshot.round?.questionIndex ?? 0) + 1).toString().padStart(2, '0')}<i>/{snapshot.round?.questionCount ?? 15}</i></span>
        <span className={isPrepare ? 'prepare-status' : canReveal ? 'reveal-status' : 'live-dot'}>{isPrepare ? 'CHUẨN BỊ' : canReveal ? 'ĐÃ KHÓA · KẾT QUẢ' : 'ĐANG DIỄN RA'}</span>
      </div>
      <div className="question-card"><p data-testid="question-prompt">{snapshot.question?.prompt ?? 'Đang chờ câu hỏi…'}</p></div>
      <Timer ms={remainingMs} />
      <div className="option-list" data-testid="option-list">
        {optionsVisible
          ? snapshot.question?.options.map((option) => <div className={`option-card ${canReveal && reveal?.correctOptionId === option.id ? 'is-correct' : ''}`} data-testid={`option-${option.id}`} key={option.id}>
            <span className="option-letter">{option.id}</span><span>{option.text}</span>{canReveal && reveal?.correctOptionId === option.id && <b className="checkmark">✓</b>}
          </div>)
          : optionIds.map((id) => <div className="option-card option-placeholder" data-testid={`option-${id}`} aria-hidden="true" key={id}><span className="option-letter">{id}</span></div>)}
      </div>
      <div className="answer-count" data-testid="answer-count"><span className="people-icon">◉</span><b>{snapshot.answerCount}</b> người đã trả lời</div>
      {canReveal && <>
        <div className="distribution"><div className="section-label">PHÂN BỐ LỰA CHỌN</div>
          <div className="distribution-bars">{(['A', 'B', 'C', 'D'] as const).map((id) => {
            const total = Object.values(reveal.optionCounts).reduce((sum, count) => sum + count, 0) || 1;
            return <div key={id} className={`distribution-item ${reveal.correctOptionId === id ? 'is-correct' : ''}`}><span>{id}</span><i style={{ height: `${Math.max(8, reveal.optionCounts[id] / total * 80)}px` }} /><b>{reveal.optionCounts[id]}</b></div>;
          })}</div>
        </div>
        <p className="explanation">{reveal.explanation}</p>
        <div className="reveal-top10" data-testid="reveal-top10">
          <div className="section-label">BẢNG XẾP HẠNG NHANH · TOP 10</div>
          <Leaderboard entries={entries.slice(0, 10)} compact allowLegacyNames={allowLegacyNames} />
        </div>
      </>}
    </section>;
  }

  if (scene === 'INTERIM_TOP10') return <section className="top10-scene">
    <div className="eyebrow">BẢNG XẾP HẠNG</div><h2>TOP <span>10</span></h2>
    <p className="round-caption">SAU CÂU {((snapshot.round?.questionIndex ?? 0) + 1).toString().padStart(2, '0')}</p>
    <Leaderboard entries={pages[page] ?? []} allowLegacyNames={allowLegacyNames} />
    {pages.length > 1 && <div className="page-indicator">{page + 1} / {pages.length}</div>}
  </section>;

  if (scene === 'ROUND_WINNER') return <section className="winner-scene">
    <div className="eyebrow">VÒNG {snapshot.round?.roundNumber ?? 1}</div><h2>KẾT THÚC<br /><span>VÒNG ĐẤU</span></h2>
    <Leaderboard entries={entries.slice(0, 3)} compact allowLegacyNames={allowLegacyNames} />
  </section>;

  if (scene === 'VICTORY') return <section className="victory-scene">
    <div className="eyebrow">VINH DANH NHÀ VÔ ĐỊCH</div><h2>VINH QUANG<br /><span>THUỘC VỀ</span></h2>
    {snapshot.podium && <Podium slots={snapshot.podium.slots} tied={snapshot.podium.tieAcrossCutoff} allowLegacyNames={allowLegacyNames} />}
  </section>;

  if (scene === 'INTERMISSION') return <section className="intermission-scene">
    <div className="eyebrow">HẾT VÒNG {snapshot.round?.roundNumber ?? 1}</div><h2>NGHỈ GIỮA<br /><span>VÒNG</span></h2><Timer ms={remainingMs} />
    <p>Hãy sẵn sàng cho chặng tiếp theo</p>
  </section>;

  return <section className="connection-scene"><div className="connection-icon">!</div>
    <div className="eyebrow">KẾT NỐI GIÁN ĐOẠN</div>
    <h2>{snapshot.state === 'ERROR' ? 'TẠM DỪNG KỸ THUẬT' : 'ĐANG TẠM DỪNG'}</h2>
    <p>Mất kết nối nguồn bình luận<br />Trò chơi đang tạm dừng</p>
  </section>;
}

function Timer({ ms }: { ms: number }) {
  return <div className="timer" data-testid="timer"><span className="timer-ring" /><strong>{formatTime(ms)}</strong><small>THỜI GIAN</small></div>;
}

function queryPixelOverride(query: URLSearchParams, key: string, fallback: number, max: number) {
  const raw = query.get(key);
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  return Math.min(max, Number(raw));
}

function TikTokHudSimulator({ debug }: { debug: boolean }) {
  return <div className="tiktok-hud" data-testid="tiktok-hud" aria-label="Mô phỏng giao diện TikTok LIVE">
    <div className="tiktok-hud-status" data-testid="tiktok-status-bar" aria-label="Thanh trạng thái điện thoại">
      <b>9:41</b><span>▮▮▮　◉　▰</span>
    </div>
    <div className="tiktok-hud-host" data-testid="tiktok-live-info">
      <i className="tiktok-hud-host-avatar" aria-hidden="true">K</i>
      <span className="tiktok-hud-host-copy"><b>FFVN.Kelly</b><small>♥ 1,2M lượt thích</small></span>
      <span className="tiktok-hud-follow">+ Follow</span>
    </div>
    <div className="tiktok-hud-viewers" data-testid="tiktok-viewers" aria-label="Người xem và quà tặng hàng đầu">
      <span className="tiktok-hud-viewer-avatars"><i>K</i><i>H</i><i>S</i></span>
      <b>6,5K</b><span className="tiktok-hud-collapse">⌄</span><span className="tiktok-hud-close">×</span>
    </div>
    <div className="tiktok-hud-chips" data-testid="tiktok-live-chips">
      <span>♛ Bảng xếp hạng chơi game</span><span>Khám phá</span>
    </div>
    <div className="tiktok-hud-event-banner" data-testid="tiktok-event-banner">
      <small>LIVE EVENT</small><b>LIVE FEST 2026</b><span>Đấu trường bão tố</span>
    </div>
    <section className="tiktok-hud-comments" data-testid="tiktok-comments" aria-label="Bình luận mẫu">
      <p><i>H</i><span><small><b>Hồ Anh Tuấn</b><em>▲9</em></small><strong>Bão tố hôm nay đẹp quá 💜</strong></span></p>
      <p><i>M</i><span><small><b>Mai Linh</b><em>▲12</em></small><strong>Đang chờ vòng tiếp theo!</strong></span></p>
      <p className="tiktok-hud-join"><b>StormKing đã tham gia</b></p>
      <p><i>C</i><span><small><b>Choco.M</b><em>▲7</em></small><strong>Kelly ơi mình mới vào nè</strong></span></p>
      <p className="tiktok-hud-join"><b>thảo cute đã tham gia</b></p>
    </section>
    <div className="tiktok-hud-gift-toast" data-testid="tiktok-gift-toast"><b>🌹</b> FFVN.Kelly đã gửi Hoa hồng <strong>x1</strong></div>
    <div className="tiktok-hud-share-float" data-testid="tiktok-share-float" aria-hidden="true">↗</div>
    <div className="tiktok-hud-hearts" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i></div>
    <div className="tiktok-hud-comment-bar" data-testid="tiktok-comment-bar">
      <span className="tiktok-hud-game-icon" aria-hidden="true">♟</span>
      <span className="tiktok-hud-input">Nhập… <b>☺</b></span>
      <span className="tiktok-hud-guest" aria-hidden="true">▣</span>
      <span className="tiktok-hud-rose" aria-hidden="true">🌹</span>
      <span className="tiktok-hud-gift" aria-hidden="true">🎁</span>
      <span className="tiktok-hud-share" aria-hidden="true">↗<small>12</small></span>
    </div>
    {debug && <span className="tiktok-hud-demo-label" data-testid="tiktok-hud-demo-label">HUD mô phỏng</span>}
  </div>;
}

function App() {
  const query = new URLSearchParams(location.search);
  const hud = query.get('hud') === '1';
  const overlayRole = overlayRoleFromSearch(location.search);
  const fit = overlayFitFromSearch(location.search, overlayRole);
  const scale = useStageScale(fit);
  const requestedMock = query.get('mock');
  const allowLegacyNames = requestedMock === 'cycle' || (requestedMock !== null && MOCK_SCENES.includes(requestedMock));
  const requestedMcState = McStateSchema.safeParse(query.get('mc')).data;
  const requestedCycleMs = Number(query.get('cycleMs'));
  const cycleIntervalMs = Number.isFinite(requestedCycleMs) && requestedCycleMs >= 100 && requestedCycleMs <= 10_000 ? requestedCycleMs : 3_000;
  const fxLow = query.get('fx') === 'low';
  const [audioState, setAudioState] = useState<AudioEngineState>('disabled');
  const [cycleScene, setCycleScene] = useState('lobby');
  const mockScene = requestedMock === 'cycle' ? cycleScene : requestedMock;
  const { snapshot: networkSnapshot, connection, serverTimeMs, clockOffsetMs } = useSnapshot(mockScene, overlayRole, audioState, requestedMcState);
  const hudConfig = useLiveHudConfig(networkSnapshot?.hudVersion, mockScene !== null);
  useEffect(() => {
    if (requestedMock !== 'cycle') return;
    const available = MOCK_SCENES.filter((scene) => scene !== 'paused');
    const timer = window.setInterval(() => setCycleScene((current) => {
      const index = available.indexOf(current);
      return available[(index + 1) % available.length] ?? 'lobby';
    }), cycleIntervalMs);
    return () => window.clearInterval(timer);
  }, [requestedMock, cycleIntervalMs]);
  useEffect(() => {
    if (overlayRole !== 'program' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('quiz-overlay-audio-status');
    channel.postMessage({ type: 'OVERLAY_AUDIO_STATUS', role: overlayRole, audioState, updatedAtMs: Date.now() });
    channel.close();
  }, [overlayRole, audioState]);
  const snapshot = networkSnapshot;
  const debug = query.get('debug') === '1';
  const remainingMs = useTimer(snapshot ?? ({ timer: null } as PublicSnapshot), serverTimeMs, clockOffsetMs);
  const guides = debug && (query.get('guides') === '1' || hud);
  const safeZone = snapshot ? {
    ...snapshot.safeZone,
    top: queryPixelOverride(query, 'safeTop', snapshot.safeZone.top, 1920),
    right: queryPixelOverride(query, 'safeRight', snapshot.safeZone.right, 1080),
    bottom: queryPixelOverride(query, 'safeBottom', snapshot.safeZone.bottom, 1920),
    left: queryPixelOverride(query, 'safeLeft', snapshot.safeZone.left, 1080),
    rightFromY: queryPixelOverride(query, 'safeRightFromY', snapshot.safeZone.rightFromY ?? 0, 1920),
  } : undefined;

  return <HudConfigProvider config={hudConfig}><main className={`viewport viewport-${overlayRole}`} data-fit={fit} data-role={overlayRole}>
    {snapshot ? <div id="stage" className={fxLow ? 'fx-low' : undefined} data-testid="stage" data-scene={snapshot.scene} data-state={snapshot.state} data-fx-level={fxLow ? 'low' : 'full'} style={{
      transform: `translate(-50%, -50%) scale(${scale})`,
      '--safe-top': `${safeZone!.top}px`,
      '--safe-bottom': `${safeZone!.bottom}px`,
      '--safe-left': `${safeZone!.left}px`,
      '--safe-right': `${safeZone!.right}px`,
      '--safe-right-from-y': `${safeZone!.rightFromY ?? 0}px`,
    } as React.CSSProperties}>
      {V3_SCENES.has(snapshot.scene) ? <ArenaStage snapshot={snapshot} remainingMs={remainingMs} debug={debug} allowLegacyNames={allowLegacyNames} /> : V3_VICTORY_SCENES.has(snapshot.scene) ? <VictoryStage snapshot={snapshot} allowLegacyNames={allowLegacyNames} /> : V3_AUX_SCENES.has(snapshot.scene) ? snapshot.scene === 'INTERIM_TOP10' ? <LeaderboardStage snapshot={snapshot} allowLegacyNames={allowLegacyNames} /> : snapshot.scene === 'INTERMISSION' ? <IntermissionStage snapshot={snapshot} remainingMs={remainingMs} /> : <ConnectionLostStage snapshot={snapshot} /> : <>
        <div className="arena-glow" aria-hidden="true" />
        <div className="brand-lockup"><span className="brand-mark">BV</span><span>BÁ VƯƠNG <b>ĐẠI CHIẾN</b></span></div>
        {snapshot.mc.bubble.trim() && <aside className="mc-bubble" data-testid="mc-bubble" aria-label={`MC Kelly: ${snapshot.mc.bubble}`}><small>MC KELLY · {snapshot.mc.state.toUpperCase()}</small><span>{snapshot.mc.bubble}</span></aside>}
        <div className="scene-content"><SceneContent snapshot={snapshot} remainingMs={remainingMs} allowLegacyNames={allowLegacyNames} /></div>
        {snapshot.question?.isDemo && <div className="demo-badge" data-testid="demo-badge">DEMO</div>}
      </>}
      {guides && safeZone && <>
        <div className="safe-zone-guides" data-testid="safe-zone-guides" style={{ inset: `${safeZone.top}px 0px ${safeZone.bottom}px ${safeZone.left}px` }} />
        <div className="safe-zone-right-band" aria-hidden="true" style={{ top: `${Math.max(safeZone.top, safeZone.rightFromY ?? 0)}px`, bottom: `${safeZone.bottom}px`, width: `${safeZone.right}px` }} />
      </>}
      {hud && <TikTokHudSimulator debug={debug} />}
      {snapshot.paused && <div className="paused-overlay"><b>TẠM DỪNG</b></div>}
    </div> : <div className="waiting-card"><div className="brand-mark">BV</div><h1>ĐANG KẾT NỐI</h1><p>{connection === 'reconnecting' ? 'Đang thử kết nối lại…' : 'Đang chờ phiên LIVE'}</p></div>}
    {snapshot && <AudioFxLayer snapshot={snapshot} remainingMs={remainingMs} onAudioStateChange={setAudioState} />}
  </main></HudConfigProvider>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
