import { useState } from 'react';
import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { podiumLeftToRight } from '../overlayLogic';
import { shortName } from './arenaLogic';
import { BrandMark } from './BrandMark';

const ASSET = '/assets';

function Chibi({ entry }: { entry: LeaderboardEntry }) {
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

function Slot({ slot, tieAcross }: { slot: PodiumSlot; tieAcross: boolean }) {
  const lead = slot.entries[0]!;
  const tied = slot.tied || (tieAcross && slot.entries.length > 1);
  return (
    <div className={`v3v-slot v3v-place-${slot.place}`} data-testid={`podium-slot-${slot.place}`} data-place={slot.place}>
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
          {slot.entries.slice(0, 2).map((entry) => (
            <b className="v3v-player-row" key={entry.playerId}>
              <span className="v3v-player-name">{shortName(entry.displayName, 22)}</span>
              {(entry.top1Streak ?? 0) >= 2 && <span className="v3-top1-badge" data-testid="top1-badge">x{entry.top1Streak}</span>}
            </b>
          ))}
          {slot.entries.length > 2 && <small>+{slot.entries.length - 2} người</small>}
          <i>{lead.score.toLocaleString('vi-VN')} PTS</i>
          {tied && <strong className="tie-label">ĐỒNG HẠNG</strong>}
        </div>
      </div>
      <span className="v3v-nameplate-reflection" aria-hidden="true" />
      <span className="v3v-score-reflection" aria-hidden="true">{lead.score.toLocaleString('vi-VN')} PTS</span>
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
      <img className="v3v-bg-image" src={`${ASSET}/victory/bg.jpg`} alt="" draggable={false} decoding="async" data-testid="victory-background" />
      <div className="v3v-bg-dim" aria-hidden="true" />
      <div className="v3v-trophy-glow" aria-hidden="true" />
      <div className="v3v-floor-reflection" aria-hidden="true" />
      <VictoryConfetti />
      <header className="v3v-header">
        <BrandMark />
        <span className="v3v-caption">VÒNG {snapshot.round?.roundNumber ?? 1}</span>
      </header>
      <div className="v3v-trophy" data-layer="trophy">
        <img
          className="v3v-trophy-stage"
          src={`${ASSET}/victory/trophy-stage.png`}
          alt=""
          draggable={false}
          decoding="async"
          data-testid="victory-trophy-stage"
        />
      </div>
      <div className="v3v-podium">
        {podium && podiumLeftToRight(podium.slots).map((slot) => <Slot key={slot.place} slot={slot} tieAcross={podium.tieAcrossCutoff} />)}
        {(!podium || podium.slots.length === 0) && <div className="v3v-empty">Chưa có người chơi đạt điểm</div>}
      </div>
    </div>
  );
}

export const V3_VICTORY_SCENES = new Set(['VICTORY', 'ROUND_WINNER']);
