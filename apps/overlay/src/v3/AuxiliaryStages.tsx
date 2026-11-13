import React from 'react';
import type { PublicLeaderboardEntry, PublicSnapshot } from '@quiz/contracts';
import { BrandHeader, McKelly } from './ArenaStage';
import { ArenaBackdrop } from './ArenaBackdrop';
import { shortName } from './arenaLogic';
import './arena.css';

function FullLeaderboardRow({ entry, index }: { entry: PublicLeaderboardEntry; index: number }) {
  return <li className={`v3-full-row v3-full-rank-${entry.rank <= 3 ? entry.rank : 'n'}`} data-testid="leaderboard-row" style={{ '--row-index': index } as React.CSSProperties}>
    <span className="v3-full-rank">{entry.rank}</span>
    <span className="v3-full-name">
      <span className="v3-full-name-text player-name" title={entry.safeDisplayName}>{shortName(entry.safeDisplayName, 16)}</span>
      {(entry.top1Streak ?? 0) >= 2 && <b className="v3-top1-badge" data-testid="top1-badge" title={`Top 1 liên tiếp ${entry.top1Streak} lần`}>x{entry.top1Streak}</b>}
      {entry.tied && <small>ĐỒNG HẠNG</small>}
    </span>
    <span className="v3-full-score">{entry.score.toLocaleString('vi-VN')}<small>điểm</small></span>
  </li>;
}

export function LeaderboardStage({ snapshot }: { snapshot: PublicSnapshot }) {
  const entries = snapshot.leaderboard?.entries ?? [];
  return <div className="v3-stage v3-aux-stage" data-scene={snapshot.scene}>
    <ArenaBackdrop arena questionBackground showFlags={false} />
    <BrandHeader snapshot={snapshot} />
    <section className="v3-leaderboard-full" data-layer="leaderboard-full" data-testid="v3-top10-large">
      <header className="v3-full-heading">
        <span className="eyebrow">BXH TRỰC TIẾP</span>
        <h1>TOP <b>10</b></h1>
        <span className="v3-full-round">SAU CÂU {String((snapshot.round?.questionIndex ?? 0) + 1).padStart(2, '0')}</span>
      </header>
      <ol className="v3-full-list">{entries.slice(0, 10).map((entry, index) => <FullLeaderboardRow key={entry.playerId} entry={entry} index={index} />)}</ol>
      {entries.length === 0 && <p className="v3-full-empty">Chưa có người chơi</p>}
      <p className="v3-full-footnote">TÍCH LŨY ĐIỂM · TIẾP TỤC CHIẾN ĐẤU</p>
    </section>
    <div className="v3-top10-guide" data-testid="top10-guide">
      <McKelly snapshot={snapshot} bubbleOverride="BXH trực tiếp! Cùng xem ai đang dẫn đầu và bám sát Top 10 nhé." />
    </div>
  </div>;
}

function FullTimer({ snapshot, remainingMs }: { snapshot: PublicSnapshot; remainingMs: number }) {
  const totalMs = snapshot.timer?.durationMs ?? 0;
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const circumference = 2 * Math.PI * 78;
  const seconds = Math.ceil(remainingMs / 1_000);
  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return <div className="v3-aux-timer" data-testid="timer">
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <circle className="v3-aux-timer-track" cx="90" cy="90" r="78" />
      <circle className="v3-aux-timer-value" cx="90" cy="90" r="78" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)} />
    </svg>
    <strong>{label}</strong>
    <small>ĐẾN VÒNG TIẾP THEO</small>
  </div>;
}

export function IntermissionStage({ snapshot, remainingMs }: { snapshot: PublicSnapshot; remainingMs: number }) {
  return <div className="v3-stage v3-aux-stage" data-scene={snapshot.scene}>
    <ArenaBackdrop arena questionBackground showFlags={false} />
    <BrandHeader snapshot={snapshot} />
    <section className="v3-intermission" data-layer="intermission" data-testid="intermission-message">
      <span className="v3-scene-kicker">HẾT VÒNG {snapshot.round?.roundNumber ?? 1}</span>
      <div className="v3-intermission-emblem" aria-hidden="true"><svg viewBox="0 0 120 60"><path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" /></svg></div>
      <h1>NGHỈ GIỮA<br /><span>VÒNG ĐẤU</span></h1>
      <p>Hãy sẵn sàng cho chặng tiếp theo</p>
      <FullTimer snapshot={snapshot} remainingMs={remainingMs} />
    </section>
  </div>;
}

export function ConnectionLostStage({ snapshot }: { snapshot: PublicSnapshot }) {
  const failed = snapshot.state === 'ERROR';
  return <div className="v3-stage v3-aux-stage" data-scene={snapshot.scene}>
    <ArenaBackdrop arena questionBackground showFlags={false} />
    <BrandHeader snapshot={snapshot} />
    <section className="v3-connection-lost" data-layer="connection-lost" data-testid="connection-lost-message">
      <div className="v3-connection-emblem" aria-hidden="true"><span /><i /></div>
      <span className="v3-scene-kicker">KẾT NỐI GIÁN ĐOẠN</span>
      <h1>{failed ? 'TẠM DỪNG KỸ THUẬT' : 'ĐANG TẠM DỪNG'}</h1>
      <p>Mất kết nối nguồn bình luận.<br />Trò chơi đã tạm dừng để bảo toàn kết quả.</p>
      <div className="v3-connection-status"><span className="v3-connection-dot" />Đang chờ nguồn LIVE kết nối lại</div>
    </section>
  </div>;
}

export const V3_AUX_SCENES = new Set(['INTERIM_TOP10', 'INTERMISSION', 'CONNECTION_LOST']);
