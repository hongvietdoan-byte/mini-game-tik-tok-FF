import React, { useState } from 'react';
import type { AudienceSeatView, PublicLeaderboardEntry, PublicSnapshot } from '@quiz/contracts';
import { shortName, splitBubble, truncateGraphemeText } from './arenaLogic';
import { BrandMark } from './BrandMark';
import { McSequence } from './mc/mc-sequence-player';
import { ArenaBackdrop } from './ArenaBackdrop';
import './arena.css';

/**
 * Bố cục V3 "Storm Arena" theo ảnh mẫu người dùng duyệt (11/11): header, BXH Top 10 trái, khung câu hỏi + đồng hồ + 4 đáp án,
 * MC Kelly + bong bóng hướng dẫn, khán giả 7×5. Mọi chữ/điểm là lớp DOM độc lập (không ghép vào ảnh nền).
 * Kelly và chibi lấy từ asset bank local; logo, khung động, ghế và hiệu ứng sân khấu được dựng bằng CSS/SVG.
 */

const ASSET_BASE = '/assets';

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function BrandHeader({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <header className="v3-header" data-layer="brand-header">
      <div className="v3-event-mark" data-testid="event-mark" aria-label="Storm Arena">
        <span>STORM</span>
        <b>ARENA</b>
      </div>
      <BrandMark ribbon="ĐẤU TRƯỜNG BÃO TỐ" wide />
      <div className="v3-round-card" data-testid="round-card">
        <b>VÒNG {snapshot.round?.roundNumber ?? 1}</b>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a3 3 0 1 0-2.8-4 4 4 0 0 1 0 8A3 3 0 0 0 16 11ZM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 1.7-6 3.8V20h12v-2.2C14 15.7 11.3 14 8 14Zm8 .2c-.4 0-.8 0-1.2.1 1.3.9 2.2 2.1 2.2 3.5V20h5v-2.2c0-2.1-2.7-3.8-6-3.8Z" /></svg>
          {snapshot.participantCount.toLocaleString('vi-VN')} ĐANG CHƠI
        </span>
      </div>
    </header>
  );
}

function Top10({ entries }: { entries: PublicLeaderboardEntry[] }) {
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
            <span className="v3-name">
              <span className="v3-name-text player-name" title={e.safeDisplayName}>{shortName(e.safeDisplayName, 16)}</span>
              {(e.top1Streak ?? 0) >= 2 && (
                <b className="v3-top1-badge" data-testid="top1-badge" title={`Top 1 liên tiếp ${e.top1Streak} lần`}>
                  x{e.top1Streak}
                </b>
              )}
            </span>
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

/** Câu hỏi dài giữ sàn 24px; câu vượt 160 ký tự thuộc ngưỡng rút gọn nội dung. */
function promptSize(prompt: string | undefined) {
  const n = prompt?.length ?? 0;
  return n > 160 ? 'is-xlong' : n > 110 ? 'is-long' : '';
}

/** Đáp án dài giữ sàn 20px; nội dung trên 45 ký tự được đội nội dung rút gọn. */
function optionSize(text: string | undefined) {
  const n = text?.length ?? 0;
  return n > 45 ? 'is-xlong' : n > 30 ? 'is-long' : '';
}

function QuestionBoard({ snapshot, remainingMs, debug }: { snapshot: PublicSnapshot; remainingMs: number; debug: boolean }) {
  const q = snapshot.question;
  const reveal = snapshot.reveal;
  const promptClass = promptSize(q?.prompt);
  const promptText = truncateGraphemeText(q?.prompt ?? 'Đang chờ câu hỏi…', 160, true);
  const isLobby = snapshot.scene === 'LOBBY';
  const isPrepare = snapshot.state === 'PREPARE';
  const isReading = snapshot.state === 'READING';
  const optionsVisible = !!q?.optionsVisible && !isPrepare;
  const hasLongOption = !!q?.options.some((option) => option.text.length > 45);
  const hasLongLabel = !!q?.options.some((option) => option.text.length > 30);
  const totalAnswers = reveal ? Object.values(reveal.optionCounts).reduce((a, b) => a + b, 0) : 0;
  return (
    <section className="v3-board" data-layer="quiz-hud">
      <div className="v3-board-tab" data-testid="question-tab">{isLobby ? 'CHÀO MỪNG' : `CÂU HỎI ${(snapshot.round?.questionIndex ?? 0) + 1}`}</div>
      {snapshot.timer && !isLobby && !isReading && <Timer ms={remainingMs} totalMs={snapshot.timer.durationMs} running={snapshot.timer.running} />}
      {isReading && <div className="v3-reading-status" data-testid="reading-status">MC ĐANG ĐỌC</div>}
      <div className={`v3-question ${promptClass}`} data-testid="question-prompt">
        {isLobby ? (
          <>SẮP BẮT ĐẦU</>
        ) : (
          promptText
        )}
      </div>
      {!isLobby && (
        <div className={`v3-options ${reveal ? 'is-revealed' : ''} ${hasLongOption ? 'has-long-option' : ''} ${hasLongLabel ? 'has-long-label' : ''}`} data-testid="option-list">
          {(['A', 'B', 'C', 'D'] as const).map((id) => {
            const opt = optionsVisible ? q?.options.find((o) => o.id === id) : undefined;
            const correct = !!reveal && reveal.correctOptionId === id;
            const count = reveal?.optionCounts[id] ?? 0;
            const share = totalAnswers ? count / totalAnswers : 0;
            return (
              <div
                key={id}
                className={`v3-option ${opt ? '' : 'is-hidden'} ${correct ? 'is-correct' : ''} ${reveal && !correct ? 'is-dim' : ''}`}
                data-testid={`option-${id}`}
                style={{ '--answer-share': `${share * 100}%` } as React.CSSProperties}
              >
                <span className="v3-letter">{id}</span>
                <span className={`v3-option-text ${optionSize(opt?.text)}`}>{opt ? truncateGraphemeText(opt.text, 45, true) : ''}</span>
                {reveal && (
                  <span className="v3-option-count">{totalAnswers ? Math.round((count / totalAnswers) * 100) : 0}%</span>
                )}
                {reveal && <span className="v3-option-meter" aria-hidden="true"><i /></span>}
              </div>
            );
          })}
        </div>
      )}
      {!isLobby && !isReading && !reveal && optionsVisible && (
        <div className="v3-answer-count" data-testid="answer-count">
          <b>{snapshot.answerCount.toLocaleString('vi-VN')}</b> câu trả lời
        </div>
      )}
      {q?.isDemo && debug && <div className="v3-demo" data-testid="demo-badge">DEMO</div>}
    </section>
  );
}

export function McKelly({ snapshot, bubbleOverride }: { snapshot: PublicSnapshot; bubbleOverride?: string }) {
  const bubble = (bubbleOverride ?? '').replace(
    /^Bình luận A, B, C hoặc D để tham gia\.?$/,
    'Trả lời bằng cách\ncomment A, B, C hoặc D\nđể tham gia ngay!',
  );
  return (
    <section className={`v3-mc v3-mc-${snapshot.mc.state}`} data-layer="kelly">
      <div className="v3-mc-figure">
        <McSequence state={snapshot.mc.state} />
      </div>
      <div className="v3-mc-plate">
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
        MC KELLY
      </div>
      {bubbleOverride !== undefined && <div className="v3-bubble" data-testid="mc-bubble">
        <p>
          {splitBubble(bubble).map((part, i) =>
            part.hl ? <em key={i}>{part.text}</em> : <React.Fragment key={i}>{part.text}</React.Fragment>,
          )}
        </p>
      </div>}
    </section>
  );
}

export function McCelebration() {
  return (
    <div className="v3-mc-portrait v3-mc-celebrate" data-testid="mc-celebration" aria-hidden="true">
      <div className="v3-mc-figure"><McSequence state="celebrate" /></div>
    </div>
  );
}

/** Dành lối cho bảng câu hỏi và MC: trong màn câu hỏi dồn hàng ghế vào vùng 1330–1860. */
const seatY = (y: number, compactQuestion = false) => {
  const top = compactQuestion ? 1330 : AUDIENCE_TOP_Y;
  const front = compactQuestion ? 1860 : AUDIENCE_FRONT_Y;
  return top + ((y - 1105) * (front - top)) / (1825 - 1105);
};
const AUDIENCE_TOP_Y = 1190;
const AUDIENCE_FRONT_Y = 1880;

function SeatChibi({ characterId }: { characterId: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className="v3-chibi-img" aria-hidden="true">
      <img src={`${ASSET_BASE}/chibi/${characterId}.png`} alt="" width={92} height={104} loading="lazy" decoding="async" draggable={false} onError={() => setOk(false)} />
    </div>
  );
}

type SeatProps = { seat: AudienceSeatView; compactQuestion: boolean };

function sameSeat(previous: SeatProps, next: SeatProps) {
  const a = previous.seat;
  const b = next.seat;
  const left = a.occupant;
  const right = b.occupant;
  const sameOccupant = left === right || (!!left && !!right &&
    left.safeDisplayName === right.safeDisplayName &&
    left.characterId === right.characterId &&
    left.pinned === right.pinned &&
    left.result === right.result);
  return previous.compactQuestion === next.compactQuestion && a.slotId === b.slotId && a.x === b.x && a.y === b.y && a.scale === b.scale && a.depth === b.depth && a.rowIndex === b.rowIndex && sameOccupant;
}

const Seat = React.memo(function Seat({ seat, compactQuestion }: SeatProps) {
  const o = seat.occupant;
  return (
    <div
      className={`v3-seat ${o ? '' : 'is-empty'} ${o?.pinned ? 'is-pinned' : ''} ${o?.result === 'correct' ? 'is-correct' : ''}`}
      style={{
        left: seat.x,
        top: seatY(seat.y, compactQuestion),
        zIndex: 10 + Math.round(seat.depth),
        ['--s' as string]: seat.scale,
      }}
      data-testid="audience-seat"
    >
      {o && <SeatChibi characterId={o.characterId} />}
      <div className="v3-seat-back" aria-hidden="true">
        <svg viewBox="0 0 120 60">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
      </div>
    </div>
  );
}, sameSeat);

const SeatName = React.memo(function SeatName({ seat, compactQuestion }: SeatProps) {
  const occupant = seat.occupant;
  if (!occupant) return null;
  return <div className={`v3-seat-name ${occupant.pinned ? 'is-pinned' : ''}`} style={{ left: seat.x, top: seatY(seat.y, compactQuestion), ['--s' as string]: seat.scale }}>
    {shortName(occupant.safeDisplayName, 13)}
  </div>;
}, sameSeat);

function Audience({ snapshot }: { snapshot: PublicSnapshot }) {
  const a = snapshot.audience;
  const compactQuestion = snapshot.scene === 'LOBBY' || snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const rows = a
    ? [...new Map(a.seats.map((s) => [s.rowIndex, seatY(s.y, compactQuestion)])).entries()].map(([row, y]) => ({ row, y }))
    : [];
  return (
    <section className="v3-audience" data-layer="audience-seats">
      <div className="v3-tiers" aria-hidden="true" />
      {rows.map((r) => (
        <span key={r.row} className="v3-step" aria-hidden="true" style={{ top: r.y + 4, ['--r' as string]: r.row }} />
      ))}
      {a?.seats.map((s) => <Seat key={s.slotId} seat={s} compactQuestion={compactQuestion} />)}
      {/* Lớp bảng tên riêng (V3 §3 audience-nametags) — luôn trên mọi nhân vật, không bị hàng trước che */}
      <div className="v3-nametags" data-layer="audience-nametags">
        {a?.seats.map((s) => <SeatName key={s.slotId} seat={s} compactQuestion={compactQuestion} />)}
      </div>
      {a && a.queued > 0 && <div className="v3-queue">+{a.queued.toLocaleString('vi-VN')} người đang chờ chỗ</div>}
    </section>
  );
}

export function ArenaStage({ snapshot, remainingMs, debug = false }: { snapshot: PublicSnapshot; remainingMs: number; debug?: boolean }) {
  const questionBackground = snapshot.scene === 'LOBBY' || snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const questionBubble = snapshot.scene === 'LOBBY'
    ? 'CHÀO MỪNG ĐẾN VỚI ĐẤU TRƯỜNG BÃO TỐ!'
    : questionBackground ? snapshot.mc.bubble : undefined;
  const hasLongPrompt = promptSize(snapshot.question?.prompt) === 'is-xlong';
  const hasLongOptions = snapshot.question?.options.some((option) => option.text.length > 45) ?? false;
  const stageClasses = ['v3-stage', questionBackground && 'v3-stage--question-user', hasLongPrompt && 'has-long-prompt', hasLongOptions && 'has-long-options'].filter(Boolean).join(' ');
  return (
    <div className={stageClasses} data-scene={snapshot.scene}>
      <ArenaBackdrop arena questionBackground={questionBackground} showFlags={!questionBackground} />
      <div className="v3-env-wrap" data-layer="arena-geometry" aria-hidden="true">
        <svg className="v3-arena-environment" viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <defs>
            <linearGradient id="arena-steel" x1="0" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#303e9e" />
              <stop offset="0.48" stopColor="#151841" />
              <stop offset="1" stopColor="#080c29" />
            </linearGradient>
            <linearGradient id="arena-neon" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#19bfff" />
              <stop offset="0.48" stopColor="#8754ff" />
              <stop offset="1" stopColor="#ff43e9" />
            </linearGradient>
            <radialGradient id="arena-core">
              <stop offset="0" stopColor="#9c6cff" stopOpacity="0.2" />
              <stop offset="0.68" stopColor="#1634ff" stopOpacity="0.08" />
              <stop offset="1" stopColor="#08102e" stopOpacity="0" />
            </radialGradient>
            <filter id="arena-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="arena-lamp-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="arena-crowd" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="6" r="2" fill="#d8ccff" opacity=".62" />
              <circle cx="15" cy="13" r="2.5" fill="#64dfff" opacity=".42" />
              <circle cx="4" cy="19" r="1.5" fill="#ff68ec" opacity=".58" />
            </pattern>
            <pattern id="arena-lamp-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect x="3" y="3" width="10" height="10" rx="2" fill="#e9fbff" />
            </pattern>
            <clipPath id="arena-left-stand-clip"><path d="M0 664 310 798v330H0z" /></clipPath>
            <clipPath id="arena-right-stand-clip"><path d="m1080 664-310 134v330h310z" /></clipPath>
          </defs>
          <ellipse cx="540" cy="190" rx="650" ry="410" fill="url(#arena-core)" />
          <g className="v3-env-arc" fill="none" stroke="url(#arena-neon)">
            <path d="M18 274Q540 72 1062 274" strokeWidth="3" strokeDasharray="3 16" />
            <path d="M30 293Q540 112 1050 293" strokeWidth="1.5" strokeDasharray="2 20" />
          </g>
          <g className="v3-env-vortex" fill="none" stroke="url(#arena-neon)" filter="url(#arena-glow)">
            <path d="M-90 150C90-75 388-89 566 33s167 272-2 337S173 415 124 267 264 30 438 80s190 186 73 260" />
            <path d="M-26 260C104 26 390-2 562 108s142 216-10 278S256 388 227 265s119-193 250-142 120 116 75 166" />
            <path d="M108 28C292-54 490-15 587 91" />
          </g>
          <g className="v3-env-lightning" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#arena-glow)">
            <path d="M76-18 26 98l71-22-43 126 100-154-63 18 46-84" />
            <path d="m1004-12 50 112-75-21 53 130-103-151 66 17-47-82" />
            <path d="M12 420 54 500l-32-2 72 72-32-88 26 5-51-67" />
            <path d="m1068 410-42 82 32-2-73 76 33-91-28 7 50-72" />
            <path d="M-40 56 52 112 24 139l121 46-40 31 132 31" />
            <path d="m1120 54-92 57 28 28-121 46 40 31-132 31" />
            <path d="M-25 245 91 292 58 319l137 40-42 36 111 28" />
            <path d="m1105 243-116 49 33 27-137 40 42 36-111 28" />
            <path d="M-30 574 67 612 36 640l122 47-42 35 87 33" />
            <path d="m1110 572-97 40 31 28-122 47 42 35-87 33" />
            <path d="M202-22 260 32l-24 26 75 42-28 25 83 28" />
            <path d="m878-23-57 56 24 26-75 42 28 25-83 28" />
          </g>
          <g className="v3-env-truss" fill="none" stroke="url(#arena-neon)" strokeLinejoin="round">
            <path d="M-28 737 126 837 219 1030M1108 737 954 837 861 1030" />
            <path d="m-4 813 155 40-90 85 130 25M1084 813l-155 40 90 85-130 25" />
            <path d="M36 704 125 774 90 850M1044 704l-89 70 35 76" />
            <path d="M0 1004 196 932M1080 1004 884 932" />
          </g>
          <g className="v3-env-stands">
            <path d="M0 664 310 798v346H0zM1080 664 770 798v346h310z" fill="url(#arena-steel)" />
            <rect x="0" y="714" width="320" height="402" fill="url(#arena-crowd)" clipPath="url(#arena-left-stand-clip)" />
            <rect x="760" y="714" width="320" height="402" fill="url(#arena-crowd)" clipPath="url(#arena-right-stand-clip)" />
            <path d="M0 755 286 862M0 844 286 950M0 933 286 1038M1080 755 794 862M1080 844 794 950M1080 933 794 1038" fill="none" stroke="url(#arena-neon)" strokeWidth="3" />
          </g>
          <g className="v3-env-floodlights" filter="url(#arena-lamp-glow)">
            <rect x="104" y="794" width="76" height="126" rx="8" fill="#162253" stroke="#a8ecff" strokeWidth="4" />
            <rect x="112" y="802" width="60" height="108" fill="url(#arena-lamp-grid)" />
            <rect x="900" y="794" width="76" height="126" rx="8" fill="#162253" stroke="#a8ecff" strokeWidth="4" />
            <rect x="908" y="802" width="60" height="108" fill="url(#arena-lamp-grid)" />
          </g>
          <g className="v3-env-banner" stroke="url(#arena-neon)" strokeLinejoin="round">
            <path d="M18 807h82v27l-7 13v115l-34 28-34-28V847l-7-13z" fill="url(#arena-steel)" />
            <path d="M998 807h64v27l-7 13v115l-25 28-25-28V847l-7-13z" fill="url(#arena-steel)" />
            <path d="m35 892 7-23 13 14 5-32 7 32 13-14 7 23zM42 900h39m930-8 7-23 13 14 5-32 7 32 13-14 7 23zM1009 900h39" fill="none" stroke="#ff58e8" strokeWidth="5" />
            <path d="M40 910h34M1014 910h32" fill="none" stroke="#8cc8fb" />
          </g>
          <path className="v3-env-stage" d="m0 1032 183-72h714l183 72v84H0z" fill="url(#arena-steel)" />
          <path className="v3-env-stage-edge" d="M0 1034h1080M26 1104h1028" fill="none" stroke="url(#arena-neon)" />
          <path className="v3-env-floor" d="m0 1118 140 60h800l140-60v802H0z" fill="url(#arena-steel)" />
          <g className="v3-env-floor-rails" fill="none" stroke="url(#arena-neon)">
            <path d="M-60 1198Q540 1278 1140 1198M-60 1320Q540 1400 1140 1320M-60 1450Q540 1530 1140 1450M-60 1590Q540 1670 1140 1590M-60 1738Q540 1818 1140 1738M-60 1884Q540 1964 1140 1884" />
            <path d="M0 1142 185 1220v700M1080 1142l-185 78v700" />
          </g>
        </svg>
      </div>
      <BrandHeader snapshot={snapshot} />
      <Top10 entries={snapshot.leaderboard?.entries ?? []} />
      <QuestionBoard snapshot={snapshot} remainingMs={remainingMs} debug={debug} />
      <McKelly snapshot={snapshot} bubbleOverride={questionBubble} />
      <Audience snapshot={snapshot} />
    </div>
  );
}

export const V3_SCENES = new Set(['LOBBY', 'QUESTION', 'REVEAL']);
