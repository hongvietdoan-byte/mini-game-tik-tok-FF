import React, { useState } from 'react';
import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { podiumLeftToRight } from '../overlayLogic';
import { shortName } from './arenaLogic';
import { BrandMark } from './BrandMark';

/**
 * Popup vinh danh Top 3 theo V3 §11: phông cổng năng lượng, CÚP + SÂN KHẤU GỐC ở giữa (không thêm 3 khối bục),
 * 3 chibi đứng trên sàn phía trước sân khấu — Top 1 giữa, Top 2 trái, Top 3 phải — bảng tên trên đầu (nằm trong vùng an toàn),
 * không che thân cúp. Nhân vật = đúng nhân vật đã gán cho người chơi trong vòng. Thiếu asset → khung giữ chỗ.
 * Timeline: 0–1.5 s nền · 1.5–3 s cúp sáng · 3–5 s nhân vật vào · 5–7 s bảng tên.
 */

const ASSET = '/assets';

function Chibi({ entry }: { entry: LeaderboardEntry }) {
  const [ok, setOk] = useState(true);
  return ok && entry.characterId ? (
    <img src={`${ASSET}/chibi/${entry.characterId}.png`} alt="" draggable={false} onError={() => setOk(false)} />
  ) : (
    <div className="v3v-chibi-placeholder" aria-hidden="true" />
  );
}

function Slot({ slot, tieAcross }: { slot: PodiumSlot; tieAcross: boolean }) {
  const lead = slot.entries[0]!;
  const tied = slot.tied || (tieAcross && slot.entries.length > 1);
  return (
    <div className={`v3v-slot v3v-place-${slot.place}`} data-testid={`podium-slot-${slot.place}`} data-place={slot.place}>
      <div className="v3v-figure">
        <Chibi entry={lead} />
        <span className="v3v-shadow" aria-hidden="true" />
      </div>
      <div className={`v3v-nameplate nameplate${tied ? ' is-tied' : ''}`} data-testid="podium-nameplate">
        <svg className="v3v-laurel v3v-laurel-left" viewBox="0 0 64 92" aria-hidden="true">
          <path d="M55 87C25 72 12 46 17 9M45 72C29 73 20 67 17 56c13 0 22 5 28 16ZM35 54C20 52 14 44 13 33c12 3 19 10 22 21ZM27 35C15 29 12 20 16 10c10 7 14 15 11 25Z" />
        </svg>
        <svg className="v3v-laurel v3v-laurel-right" viewBox="0 0 64 92" aria-hidden="true">
          <path d="M55 87C25 72 12 46 17 9M45 72C29 73 20 67 17 56c13 0 22 5 28 16ZM35 54C20 52 14 44 13 33c12 3 19 10 22 21ZM27 35C15 29 12 20 16 10c10 7 14 15 11 25Z" />
        </svg>
        <span className="v3v-rank-crown" aria-hidden="true">
          <svg viewBox="0 0 60 42"><path d="M4 11 15 21 25 5 30 22 41 5 47 21 56 11 52 35 8 35Z" /></svg>
        </span>
        <span className={`v3v-medal v3v-medal-${slot.place}`}>{slot.rank}</span>
        <div className="v3v-names">
          {slot.entries.slice(0, 3).map((e) => (
            <b className="v3v-player-row" key={e.playerId}>
              <span className="v3v-player-name">{shortName(e.displayName, 22)}</span>
              {(e.top1Streak ?? 0) >= 2 && <span className="v3-top1-badge" data-testid="top1-badge">x{e.top1Streak}</span>}
            </b>
          ))}
          {slot.entries.length > 3 && <small>+{slot.entries.length - 3} người</small>}
          <i>{lead.score.toLocaleString('vi-VN')} PTS</i>
          {tied && <strong className="tie-label">ĐỒNG HẠNG</strong>}
        </div>
        <span className="v3v-nameplate-reflection" aria-hidden="true" />
      </div>
    </div>
  );
}

function VictoryAtmosphere() {
  return <svg className="v3v-atmosphere" viewBox="0 0 1080 1920" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="v3v-neon" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#37d7ff" /><stop offset=".52" stopColor="#b44dff" /><stop offset="1" stopColor="#ff62df" /></linearGradient>
      <radialGradient id="v3v-core"><stop stopColor="#6488ff" stopOpacity=".34" /><stop offset="1" stopColor="#30127b" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="540" cy="490" rx="610" ry="470" fill="url(#v3v-core)" />
    <g className="v3v-vortex-lines" fill="none" stroke="url(#v3v-neon)">
      <path d="M-30 380C76 104 390 38 624 149s338 340 172 518-493 151-574-30 76-345 267-287 201 225 96 311" />
      <path d="M-60 478C71 204 366 145 575 248s286 287 145 430-409 128-486-14 55-271 204-224 158 178 76 246" />
    </g>
    <g className="v3v-lightning" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M76 104 34 258l73-42-51 193 112-225-67 39 50-160M1000 110l48 153-72-40 53 187-113-219 66 38-46-160" />
      <path d="M12 560 84 640l-46-4 117 112-64-147 45 9-92-101M1068 552l-75 86 44-5-118 117 66-146-45 9 94-101" />
    </g>
    <g className="v3v-stand-lights" fill="none" stroke="url(#v3v-neon)">
      <path d="M0 910 250 790v350H0ZM1080 910 830 790v350h250Z" />
      <path d="M0 986 222 882M0 1080 222 976M1080 986 858 882M1080 1080 858 976" />
      {[0, 1, 2, 3].map((index) => <React.Fragment key={index}>
        <rect x={38 + index * 32} y="852" width="17" height="28" rx="4" fill="#e7faff" stroke="none" />
        <rect x={1025 - index * 32} y="852" width="17" height="28" rx="4" fill="#fff0ff" stroke="none" />
      </React.Fragment>)}
    </g>
    <g className="v3v-confetti">
      <path d="m131 488 17-22 18 22-17 23zM280 680l12-15 14 16-12 15zM832 477l20-25 18 25-20 25zM920 711l13-17 15 18-13 17zM72 772l11-15 15 16-12 16zM980 904l10-13 14 13-11 14z" />
      <circle cx="214" cy="590" r="5" /><circle cx="882" cy="616" r="6" /><circle cx="171" cy="832" r="4" /><circle cx="902" cy="785" r="4" />
    </g>
  </svg>;
}

function VictoryCup() {
  return <svg className="v3v-trophy-art" viewBox="0 0 1020 660" aria-hidden="true">
    <defs>
      <linearGradient id="v3v-cup-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0cf" /><stop offset=".2" stopColor="#8bcaff" /><stop offset=".48" stopColor="#f8e3ff" /><stop offset=".72" stopColor="#745dcb" /><stop offset="1" stopColor="#e9c7ff" /></linearGradient>
      <linearGradient id="v3v-cup-core" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#de9aff" /><stop offset=".42" stopColor="#6626dc" /><stop offset="1" stopColor="#111b68" /></linearGradient>
      <linearGradient id="v3v-cup-stage" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4932a3" /><stop offset=".5" stopColor="#171950" /><stop offset="1" stopColor="#080d31" /></linearGradient>
      <radialGradient id="v3v-cup-glow"><stop stopColor="#b871ff" stopOpacity=".72" /><stop offset="1" stopColor="#556aff" stopOpacity="0" /></radialGradient>
      <filter id="v3v-cup-neon" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="510" cy="270" rx="380" ry="210" fill="url(#v3v-cup-glow)" />
    <g className="v3v-cup-halo" fill="none" stroke="#b45fff" filter="url(#v3v-cup-neon)">
      <path d="M230 354a280 225 0 0 1 560 0M278 354a232 184 0 0 1 464 0" />
    </g>
    <g className="v3v-cup-art">
      <path d="M398 127c-71-29-105 20-87 84 13 46 50 76 112 80l8-37c-38-4-62-19-72-49-10-29 0-47 48-38Z" fill="url(#v3v-cup-metal)" stroke="#f4dcff" strokeWidth="8" />
      <path d="M622 127c71-29 105 20 87 84-13 46-50 76-112 80l-8-37c38-4 62-19 72-49 10-29 0-47-48-38Z" fill="url(#v3v-cup-metal)" stroke="#f4dcff" strokeWidth="8" />
      <path d="M370 100 650 100 627 278c-14 104-65 151-117 151s-103-47-117-151Z" fill="url(#v3v-cup-metal)" stroke="#fff1ff" strokeWidth="10" />
      <path d="M395 126 625 126 606 271c-10 76-49 112-96 112s-86-36-96-112Z" fill="url(#v3v-cup-core)" stroke="#9bdcff" strokeWidth="5" />
      <path d="m510 154 37 67-28-4 26 55-63-61 31 5-22-38-23 32 10-56-22 16Z" fill="#fff5ff" stroke="#d895ff" strokeWidth="5" strokeLinejoin="round" filter="url(#v3v-cup-neon)" />
      <path d="M387 108h246M433 426h154l28 37H405Z" fill="none" stroke="url(#v3v-cup-metal)" strokeWidth="15" strokeLinejoin="round" />
      <path d="M463 455h94l30 82H433Z" fill="url(#v3v-cup-metal)" stroke="#e6d8ff" strokeWidth="7" />
      <path d="M392 535h236l55 58H337Z" fill="url(#v3v-cup-stage)" stroke="url(#v3v-cup-metal)" strokeWidth="9" />
      <path d="m337 593 173-42 173 42-55 42H392Z" fill="url(#v3v-cup-stage)" stroke="#d184ff" strokeWidth="8" />
    </g>
    <g className="v3v-cup-platform" strokeLinejoin="round">
      <path d="m154 514 162-54h388l162 54v82l-162 54H316L154 596Z" fill="url(#v3v-cup-stage)" stroke="#75dfff" strokeWidth="8" />
      <path d="m190 528 139-42h382l139 42v50l-139 47H329l-139-47Z" fill="none" stroke="#e080ff" strokeWidth="5" filter="url(#v3v-cup-neon)" />
      <path d="M250 557h520M282 598h456" stroke="#5edaff" strokeWidth="4" opacity=".8" />
    </g>
  </svg>;
}

export function VictoryStage({ snapshot }: { snapshot: PublicSnapshot }) {
  const podium = snapshot.podium;
  return (
    <div className="v3-stage v3v" data-scene={snapshot.scene}>
      <div className="v3-bg v3v-bg" aria-hidden="true" />
      <div className="v3v-dim" aria-hidden="true" />
      <VictoryAtmosphere />
      <div className="v3v-floor" aria-hidden="true" />
      <header className="v3v-header">
        <BrandMark />
        <span className="v3v-caption">VINH DANH TOP 3 · VÒNG {snapshot.round?.roundNumber ?? 1}</span>
      </header>
      <div className="v3v-trophy" data-layer="trophy">
        <VictoryCup />
      </div>
      <div className="v3v-support" aria-hidden="true" />
      <div className="v3v-platform-wing v3v-platform-wing-left" aria-hidden="true" />
      <div className="v3v-platform-wing v3v-platform-wing-right" aria-hidden="true" />
      <div className="v3v-stage-platform" data-testid="victory-platform" aria-hidden="true" />
      <div className="v3v-podium">
        {podium && podiumLeftToRight(podium.slots).map((s) => <Slot key={s.place} slot={s} tieAcross={podium.tieAcrossCutoff} />)}
        {(!podium || podium.slots.length === 0) && <div className="v3v-empty">Chưa có người chơi đạt điểm</div>}
      </div>
    </div>
  );
}

export const V3_VICTORY_SCENES = new Set(['VICTORY', 'ROUND_WINNER']);
