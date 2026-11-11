import React, { useState } from 'react';
import type { AudienceSeatView, LeaderboardEntry, PublicSnapshot } from '@quiz/contracts';
import { characterHue, shortName, splitBubble } from './arenaLogic';
import './arena.css';

/**
 * Bố cục V3 "Storm Arena" theo ảnh mẫu người dùng duyệt (11/11): header, BXH Top 10 trái, khung câu hỏi + đồng hồ + 4 đáp án,
 * MC Kelly + bong bóng hướng dẫn, khán giả 7×5. Mọi chữ/điểm là lớp DOM độc lập (không ghép vào ảnh nền).
 * Chưa có asset tách lớp (logo, nền bão, chibi quay lưng) → vẽ bằng CSS / hình giữ chỗ.
 */

const ASSET_BASE = '/assets';

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Header({ snapshot }: { snapshot: PublicSnapshot }) {
  const round = snapshot.round;
  return (
    <header className="v3-header" data-layer="brand-header">
      <div className="v3-logo-storm" aria-label="Storm Arena">
        <span>STORM</span>
        <span>ARENA</span>
      </div>
      <div className="v3-title">
        <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
        <div className="v3-title-main">
          <span>BÁ VƯƠNG</span>
          <span>ĐẠI CHIẾN</span>
        </div>
        <div className="v3-title-ribbon">ĐẤU TRƯỜNG BÃO TỐ</div>
      </div>
      <div className="v3-round-badge">
        <b>{round ? `VÒNG ${round.roundNumber}` : 'SẮP BẮT ĐẦU'}</b>
        <span>
          <i className="v3-people" aria-hidden="true" /> {snapshot.participantCount.toLocaleString('vi-VN')} Đang chơi
        </span>
      </div>
    </header>
  );
}

function Top10({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="v3-top10" data-layer="leaderboard" data-testid="v3-top10">
      <div className="v3-top10-title">
        <small>BXH TRỰC TIẾP</small>
        <b>TOP 10</b>
      </div>
      <ol>
        {entries.slice(0, 10).map((e) => (
          <li key={e.playerId} className={`v3-rank-${e.rank <= 3 ? e.rank : 'n'}`} data-testid="leaderboard-row">
            <span className="v3-rank">{e.rank}</span>
            <span className="v3-name">{e.displayName}</span>
            <span className="v3-score">{e.score.toLocaleString('vi-VN')}</span>
          </li>
        ))}
        {entries.length === 0 && <li className="v3-empty">Chưa có người chơi</li>}
      </ol>
    </section>
  );
}

function Timer({ ms, totalMs, running }: { ms: number; totalMs: number; running: boolean }) {
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, ms / totalMs)) : 0;
  const C = 2 * Math.PI * 58;
  return (
    <div className={`v3-timer ${ms <= 5_000 && running ? 'is-urgent' : ''}`} data-testid="timer">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="v3-timer-track" cx="70" cy="70" r="58" />
        <circle className="v3-timer-arc" cx="70" cy="70" r="58" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <b>{formatTime(ms)}</b>
    </div>
  );
}

function QuestionBoard({ snapshot, remainingMs }: { snapshot: PublicSnapshot; remainingMs: number }) {
  const q = snapshot.question;
  const reveal = snapshot.reveal;
  const isLobby = snapshot.scene === 'LOBBY';
  const isPrepare = snapshot.state === 'PREPARE';
  const optionsVisible = !!q?.optionsVisible && !isPrepare;
  const totalAnswers = reveal ? Object.values(reveal.optionCounts).reduce((a, b) => a + b, 0) : 0;
  return (
    <section className="v3-board" data-layer="quiz-hud">
      <div className="v3-board-tab">{isLobby ? 'SẮP BẮT ĐẦU' : `CÂU HỎI ${(snapshot.round?.questionIndex ?? 0) + 1}`}</div>
      {snapshot.timer && !isLobby && <Timer ms={remainingMs} totalMs={snapshot.timer.durationMs} running={snapshot.timer.running} />}
      <div className="v3-question" data-testid="question-prompt">
        {isLobby ? (
          <>Bình luận <em>A, B, C</em> hoặc <em>D</em> để trả lời câu hỏi về Free Fire!</>
        ) : (
          q?.prompt ?? 'Đang chờ câu hỏi…'
        )}
      </div>
      {!isLobby && (
        <div className={`v3-options ${reveal ? 'is-revealed' : ''}`} data-testid="option-list">
          {(['A', 'B', 'C', 'D'] as const).map((id) => {
            const opt = optionsVisible ? q?.options.find((o) => o.id === id) : undefined;
            const correct = !!reveal && reveal.correctOptionId === id;
            const count = reveal?.optionCounts[id] ?? 0;
            return (
              <div
                key={id}
                className={`v3-option ${opt ? '' : 'is-hidden'} ${correct ? 'is-correct' : ''} ${reveal && !correct ? 'is-dim' : ''}`}
                data-testid={`option-${id}`}
              >
                <span className="v3-letter">{id}</span>
                <span className="v3-option-text">{opt?.text ?? ''}</span>
                {reveal && (
                  <span className="v3-option-count">{totalAnswers ? Math.round((count / totalAnswers) * 100) : 0}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!isLobby && !reveal && optionsVisible && (
        <div className="v3-answer-count" data-testid="answer-count">
          <b>{snapshot.answerCount.toLocaleString('vi-VN')}</b> câu trả lời
        </div>
      )}
      {q?.isDemo && <div className="v3-demo" data-testid="demo-badge">DEMO</div>}
    </section>
  );
}

function McKelly({ snapshot }: { snapshot: PublicSnapshot }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <section className={`v3-mc v3-mc-${snapshot.mc.state}`} data-layer="kelly">
      <div className="v3-mc-figure">
        {imgOk ? (
          <img src={`${ASSET_BASE}/mc/kelly.png`} alt="" onError={() => setImgOk(false)} draggable={false} />
        ) : (
          <div className="v3-mc-placeholder">MC</div>
        )}
      </div>
      <div className="v3-mc-plate">
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
        MC KELLY
      </div>
      <div className="v3-bubble" data-testid="mc-bubble">
        <i className="v3-bolt" aria-hidden="true" />
        <p>
          {splitBubble(snapshot.mc.bubble).map((part, i) =>
            part.hl ? <em key={i}>{part.text}</em> : <React.Fragment key={i}>{part.text}</React.Fragment>,
          )}
        </p>
      </div>
    </section>
  );
}

/** Kéo toạ độ ghế của server (chân hàng sau ~1105 → hàng trước ~1825) xuống vùng khán giả theo ảnh mẫu (1190 → 1880), để hàng sau không chạm MC. */
const seatY = (y: number) => AUDIENCE_TOP_Y + ((y - 1105) * (AUDIENCE_FRONT_Y - AUDIENCE_TOP_Y)) / (1825 - 1105);
const AUDIENCE_TOP_Y = 1190;
const AUDIENCE_FRONT_Y = 1880;

function SeatChibi({ characterId, hue }: { characterId: string; hue: number }) {
  const [ok, setOk] = useState(true);
  return ok ? (
    <div className="v3-chibi-img" aria-hidden="true">
      <img src={`${ASSET_BASE}/chibi/${characterId}.png`} alt="" draggable={false} onError={() => setOk(false)} />
    </div>
  ) : (
    <div className="v3-chibi" aria-hidden="true" style={{ ['--hue' as string]: hue }}>
      <span className="v3-chibi-hair" />
      <span className="v3-chibi-body" />
    </div>
  );
}

function Seat({ seat }: { seat: AudienceSeatView }) {
  const o = seat.occupant;
  const hue = o ? characterHue(o.characterId) : 0;
  return (
    <div
      className={`v3-seat ${o ? '' : 'is-empty'} ${o?.pinned ? 'is-pinned' : ''} ${o?.result === 'correct' ? 'is-correct' : ''}`}
      style={{
        left: seat.x,
        top: seatY(seat.y),
        zIndex: 10 + Math.round(seat.depth),
        ['--s' as string]: seat.scale,
        ['--hue' as string]: hue,
      }}
      data-testid="audience-seat"
    >
      {o && <SeatChibi characterId={o.characterId} hue={hue} />}
      <div className="v3-seat-back" aria-hidden="true">
        <svg viewBox="0 0 120 60">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
      </div>
    </div>
  );
}

function Audience({ snapshot }: { snapshot: PublicSnapshot }) {
  const a = snapshot.audience;
  const rows = a
    ? [...new Map(a.seats.map((s) => [s.rowIndex, seatY(s.y)])).entries()].map(([row, y]) => ({ row, y }))
    : [];
  return (
    <section className="v3-audience" data-layer="audience-seats">
      <div className="v3-tiers" aria-hidden="true" />
      {rows.map((r) => (
        <span key={r.row} className="v3-step" aria-hidden="true" style={{ top: r.y + 4, ['--r' as string]: r.row }} />
      ))}
      {a?.seats.map((s) => <Seat key={s.slotId} seat={s} />)}
      {/* Lớp bảng tên riêng (V3 §3 audience-nametags) — luôn trên mọi nhân vật, không bị hàng trước che */}
      <div className="v3-nametags" data-layer="audience-nametags">
        {a?.seats.map((s) =>
          s.occupant ? (
            <div
              key={s.slotId}
              className={`v3-seat-name ${s.occupant.pinned ? 'is-pinned' : ''}`}
              style={{ left: s.x, top: seatY(s.y), ['--s' as string]: s.scale }}
            >
              {shortName(s.occupant.displayName, 13)}
            </div>
          ) : null,
        )}
      </div>
      {a && a.queued > 0 && <div className="v3-queue">+{a.queued.toLocaleString('vi-VN')} người đang chờ chỗ</div>}
    </section>
  );
}

export function ArenaStage({ snapshot, remainingMs }: { snapshot: PublicSnapshot; remainingMs: number }) {
  return (
    <div className="v3-stage" data-scene={snapshot.scene}>
      <div className="v3-bg" data-layer="background-storm" aria-hidden="true">
        <span className="v3-storm" />
        <span className="v3-bolt-l" />
        <span className="v3-bolt-r" />
        <span className="v3-lights" />
      </div>
      <Header snapshot={snapshot} />
      <Top10 entries={snapshot.leaderboard?.entries ?? []} />
      <QuestionBoard snapshot={snapshot} remainingMs={remainingMs} />
      <McKelly snapshot={snapshot} />
      <Audience snapshot={snapshot} />
    </div>
  );
}

export const V3_SCENES = new Set(['LOBBY', 'QUESTION', 'REVEAL']);
