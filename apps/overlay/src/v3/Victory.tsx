import { useState } from 'react';
import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { podiumLeftToRight } from '../overlayLogic';
import { shortName } from './arenaLogic';
import { BrandMark } from './BrandMark';
import { McCelebration } from './ArenaStage';

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
        <span className="v3v-nameplate-reflection" aria-hidden="true" />
      </div>
    </div>
  );
}

function VictoryConfetti() {
  const particles = [
    { top: '8%', left: '8%', size: 7, color: '#ffd76d', rotate: 24 },
    { top: '24%', left: '17%', size: 5, color: '#e578ff', rotate: 58 },
    { top: '12%', left: '31%', size: 6, color: '#ffd76d', rotate: 17 },
    { top: '28%', left: '43%', size: 5, color: '#e578ff', rotate: 41 },
    { top: '5%', left: '59%', size: 7, color: '#ffd76d', rotate: 74 },
    { top: '21%', left: '72%', size: 5, color: '#e578ff', rotate: 33 },
    { top: '10%', left: '90%', size: 7, color: '#ffd76d', rotate: 18 },
    { top: '43%', left: '4%', size: 5, color: '#e578ff', rotate: 62 },
    { top: '54%', left: '15%', size: 7, color: '#ffd76d', rotate: 38 },
    { top: '48%', left: '85%', size: 5, color: '#e578ff', rotate: 11 },
    { top: '61%', left: '94%', size: 7, color: '#ffd76d', rotate: 53 },
    { top: '70%', left: '66%', size: 5, color: '#e578ff', rotate: 29 },
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
      <McCelebration />
    </div>
  );
}

export const V3_VICTORY_SCENES = new Set(['VICTORY', 'ROUND_WINNER']);
