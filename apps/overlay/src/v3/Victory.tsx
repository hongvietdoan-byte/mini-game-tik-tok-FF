import { useState, type CSSProperties } from 'react';
import type { PublicLeaderboardEntry, PublicPodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { podiumLeftToRight } from '../overlayLogic';
import { shortName } from './arenaLogic';
import { BrandMark } from './BrandMark';

const ASSET = '/assets';
const VICTORY_BACKGROUND = `${ASSET}/victory/bg-user-cover.jpg`;
const VICTORY_LAYOUT = {
  '--v3v-place-2-x': '14.5%',
  '--v3v-place-1-x': '50%',
  '--v3v-place-3-x': '85.5%',
  '--v3v-place-2-feet': '62.5%',
  '--v3v-place-1-feet': '62.5%',
  '--v3v-place-3-feet': '62.5%',
  '--v3v-side-height': '384px',
  '--v3v-center-height': '384px',
  '--v3v-side-width': '180px',
  '--v3v-center-width': '242px',
} as CSSProperties;

function VictoryLogo() {
  const [ok, setOk] = useState(true);
  return ok
    ? <img className="v3v-event-logo" src={`${ASSET}/brand/logo.png`} alt="Bá Vương Đại Chiến — Ai là nhà vua bá khí" draggable={false} decoding="async" data-testid="v3v-event-logo" onError={() => setOk(false)} />
    : <div className="v3v-logo-fallback"><BrandMark /></div>;
}

function Chibi({ entry }: { entry: PublicLeaderboardEntry }) {
  const [ok, setOk] = useState(true);
  return ok && entry.characterId ? (
    <img
      src={`${ASSET}/chibi/${entry.characterId}.png`}
      alt=""
      draggable={false}
      decoding="async"
      onError={() => setOk(false)}
    />
  ) : (
    <div className="v3v-chibi-placeholder" aria-hidden="true" />
  );
}

function podiumNameSize(name: string): number {
  const length = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name)).length;
  return Math.max(22, Math.min(34, 38 - length));
}

function Slot({ slot, tieAcross }: { slot: PublicPodiumSlot; tieAcross: boolean }) {
  const lead = slot.entries[0]!;
  const tied = slot.tied || (tieAcross && slot.entries.length > 1);
  return (
    <div className={`v3v-slot v3v-place-${slot.place}${tied ? ' is-tied' : ''}`} data-testid={`podium-slot-${slot.place}`} data-place={slot.place} data-rank={slot.rank} data-score={lead.score}>
      <div className="v3v-figure">
        <Chibi entry={lead} />
        <span className="v3v-shadow" aria-hidden="true" />
      </div>
      <div className={`v3v-nameplate${tied ? ' is-tied' : ''}`} data-testid="podium-nameplate">
        <svg className="v3v-laurel v3v-laurel-left" viewBox="0 0 64 92" aria-hidden="true">
          <path d="M55 87C25 72 12 46 17 9M45 72C29 73 20 67 17 56c13 0 22 5 28 16ZM35 54C20 52 14 44 13 33c12 3 19 10 22 21ZM27 35C15 29 12 20 16 10c10 7 14 15 11 25Z" />
        </svg>
        <svg className="v3v-laurel v3v-laurel-right" viewBox="0 0 64 92" aria-hidden="true">
          <path d="M55 87C25 72 12 46 17 9M45 72C29 73 20 67 17 56c13 0 22 5 28 16ZM35 54C20 52 14 44 13 33c12 3 19 10 22 21ZM27 35C15 29 12 20 16 10c10 7 14 15 11 25Z" />
        </svg>
        <span className="v3v-rank-crown" aria-hidden="true">
          <svg viewBox="0 0 60 42"><path d="M4 11 15 21 25 5 30 22 41 5 47 21 56 11 52 35 8 35Z" /></svg>
        </span>
        <div className="v3v-names">
          <span className="v3v-rank-label" data-testid="podium-rank">TOP {slot.rank}</span>
          {slot.entries.slice(0, 2).map((entry) => {
            const displayName = shortName(entry.safeDisplayName, 16);
            return (
              <b className="v3v-player-row" key={entry.playerId}>
                <span className="v3v-player-name" style={{ fontSize: `${podiumNameSize(displayName)}px` }}>{displayName}</span>
                {(entry.top1Streak ?? 0) >= 2 && <span className="v3-top1-badge" data-testid="top1-badge">x{entry.top1Streak}</span>}
              </b>
            );
          })}
          {slot.entries.length > 2 && <small>+{slot.entries.length - 2} người</small>}
          <i>{lead.score.toLocaleString('vi-VN')} PTS</i>
          {tied && <strong className="tie-label">ĐỒNG HẠNG</strong>}
        </div>
      </div>
    </div>
  );
}

function VictoryConfetti() {
  const particles = [
    { top: '6%', left: '8%', size: 13, color: '#ffd76d', rotate: 24 },
    { top: '17%', left: '18%', size: 10, color: '#e578ff', rotate: 58 },
    { top: '8%', left: '30%', size: 12, color: '#ffd76d', rotate: 17 },
    { top: '25%', left: '40%', size: 11, color: '#e578ff', rotate: 41 },
    { top: '3%', left: '58%', size: 14, color: '#ffd76d', rotate: 74 },
    { top: '19%', left: '74%', size: 10, color: '#e578ff', rotate: 33 },
    { top: '9%', left: '90%', size: 14, color: '#ffd76d', rotate: 18 },
    { top: '37%', left: '4%', size: 11, color: '#e578ff', rotate: 62 },
    { top: '52%', left: '13%', size: 15, color: '#ffd76d', rotate: 38 },
    { top: '43%', left: '85%', size: 12, color: '#e578ff', rotate: 11 },
    { top: '59%', left: '94%', size: 15, color: '#ffd76d', rotate: 53 },
    { top: '68%', left: '66%', size: 11, color: '#e578ff', rotate: 29 },
    { top: '33%', left: '24%', size: 9, color: '#ffd76d', rotate: 42 },
    { top: '47%', left: '34%', size: 12, color: '#e578ff', rotate: 7 },
    { top: '62%', left: '48%', size: 15, color: '#ffd76d', rotate: 71 },
    { top: '31%', left: '63%', size: 10, color: '#e578ff', rotate: 55 },
    { top: '53%', left: '76%', size: 14, color: '#ffd76d', rotate: 26 },
    { top: '73%', left: '20%', size: 11, color: '#e578ff', rotate: 36 },
    { top: '77%', left: '83%', size: 13, color: '#ffd76d', rotate: 18 },
    { top: '12%', left: '48%', size: 9, color: '#e578ff', rotate: 65 },
    { top: '26%', left: '94%', size: 12, color: '#ffd76d', rotate: 31 },
    { top: '66%', left: '5%', size: 13, color: '#ffd76d', rotate: 50 },
    { top: '78%', left: '58%', size: 10, color: '#e578ff', rotate: 14 },
    { top: '39%', left: '55%', size: 12, color: '#ffd76d', rotate: 82 },
    { top: '14%', left: '4%', size: 12, color: '#48dfff', rotate: 15 },
    { top: '22%', left: '11%', size: 9, color: '#ff68cf', rotate: 72 },
    { top: '4%', left: '22%', size: 14, color: '#75a4ff', rotate: 31 },
    { top: '29%', left: '32%', size: 13, color: '#a9ff83', rotate: 59 },
    { top: '10%', left: '39%', size: 11, color: '#fff5e7', rotate: 25 },
    { top: '21%', left: '53%', size: 14, color: '#48dfff', rotate: 66 },
    { top: '6%', left: '68%', size: 10, color: '#ff68cf', rotate: 44 },
    { top: '28%', left: '82%', size: 13, color: '#75a4ff', rotate: 83 },
    { top: '14%', left: '96%', size: 10, color: '#a9ff83', rotate: 19 },
    { top: '39%', left: '9%', size: 11, color: '#fff5e7', rotate: 36 },
    { top: '55%', left: '29%', size: 14, color: '#48dfff', rotate: 8 },
    { top: '71%', left: '38%', size: 9, color: '#ff68cf', rotate: 73 },
    { top: '48%', left: '60%', size: 13, color: '#75a4ff', rotate: 29 },
    { top: '64%', left: '89%', size: 11, color: '#a9ff83', rotate: 57 },
    { top: '79%', left: '3%', size: 14, color: '#fff5e7', rotate: 12 },
    { top: '82%', left: '45%', size: 10, color: '#48dfff', rotate: 46 },
    { top: '75%', left: '73%', size: 13, color: '#ff68cf', rotate: 21 },
    { top: '35%', left: '98%', size: 9, color: '#75a4ff', rotate: 63 },
    { top: '18%', left: '61%', size: 12, color: '#a9ff83', rotate: 34 },
    { top: '57%', left: '2%', size: 10, color: '#fff5e7', rotate: 48 },
    { top: '45%', left: '44%', size: 14, color: '#48dfff', rotate: 27 },
    { top: '67%', left: '56%', size: 11, color: '#ff68cf', rotate: 80 },
    { top: '31%', left: '72%', size: 13, color: '#75a4ff', rotate: 17 },
  ];
  return <div className="v3v-confetti" aria-hidden="true">
    {particles.map((particle, index) => (
      <i
        key={index}
        style={{
          top: particle.top,
          left: particle.left,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          color: particle.color,
          transform: `rotate(${particle.rotate}deg)`,
        }}
      />
    ))}
  </div>;
}

export function VictoryStage({ snapshot }: { snapshot: PublicSnapshot }) {
  const podium = snapshot.podium;
  return (
    <div className="v3-stage v3v" data-scene={snapshot.scene}>
      <img className="v3v-bg-image" src={VICTORY_BACKGROUND} alt="" draggable={false} decoding="async" data-testid="victory-background" />
      <VictoryConfetti />
      <header className="v3v-header">
        <VictoryLogo />
      </header>
      <div className="v3v-podium" style={VICTORY_LAYOUT}>
        {podium && podiumLeftToRight(podium.slots).map((slot) => <Slot key={slot.place} slot={slot} tieAcross={podium.tieAcrossCutoff} />)}
        {(!podium || podium.slots.length === 0) && <div className="v3v-empty">Chưa có người chơi đạt điểm</div>}
      </div>
    </div>
  );
}

export const V3_VICTORY_SCENES = new Set(['VICTORY', 'ROUND_WINNER']);
