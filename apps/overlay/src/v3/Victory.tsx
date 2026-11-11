import React, { useState } from 'react';
import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { podiumLeftToRight } from '../overlayLogic';
import { shortName } from './arenaLogic';

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
      <div className="v3v-nameplate nameplate">
        <span className={`v3v-medal v3v-medal-${slot.place}`}>{slot.rank}</span>
        <div className="v3v-names">
          {slot.entries.slice(0, 3).map((e) => (
            <b key={e.playerId}>
              {shortName(e.displayName, 14)}
              {(e.top1Streak ?? 0) >= 2 && <span className="v3-top1-badge" data-testid="top1-badge">x{e.top1Streak}</span>}
            </b>
          ))}
          {slot.entries.length > 3 && <small>+{slot.entries.length - 3} người</small>}
          <i>{lead.score.toLocaleString('vi-VN')} điểm</i>
          {tied && <strong className="tie-label">ĐỒNG HẠNG</strong>}
        </div>
      </div>
      <div className="v3v-figure">
        <Chibi entry={lead} />
        <span className="v3v-shadow" aria-hidden="true" />
      </div>
    </div>
  );
}

export function VictoryStage({ snapshot }: { snapshot: PublicSnapshot }) {
  const [bgOk, setBgOk] = useState(true);
  const [trophyOk, setTrophyOk] = useState(true);
  const podium = snapshot.podium;
  return (
    <div className="v3-stage v3v" data-scene={snapshot.scene}>
      {bgOk ? (
        <img className="v3v-bg" src={`${ASSET}/victory/bg.jpg`} alt="" onError={() => setBgOk(false)} draggable={false} />
      ) : (
        <div className="v3-bg" aria-hidden="true" />
      )}
      <div className="v3v-dim" aria-hidden="true" />
      <header className="v3v-header">
        <div className="v3-title">
          <svg className="v3-crown" viewBox="0 0 120 60" aria-hidden="true">
            <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
          </svg>
          <div className="v3-title-main">
            <span>BÁ VƯƠNG</span>
            <span>ĐẠI CHIẾN</span>
          </div>
          <div className="v3-title-ribbon">VINH DANH TOP 3 · VÒNG {snapshot.round?.roundNumber ?? 1}</div>
        </div>
      </header>
      <div className="v3v-trophy" data-layer="trophy">
        {trophyOk ? (
          <img src={`${ASSET}/victory/trophy-stage.png`} alt="" onError={() => setTrophyOk(false)} draggable={false} />
        ) : (
          <div className="v3v-trophy-placeholder">CÚP + SÂN KHẤU (thiếu asset)</div>
        )}
      </div>
      <div className="v3v-podium">
        {podium && podiumLeftToRight(podium.slots).map((s) => <Slot key={s.place} slot={s} tieAcross={podium.tieAcrossCutoff} />)}
        {(!podium || podium.slots.length === 0) && <div className="v3v-empty">Chưa có người chơi đạt điểm</div>}
      </div>
      {podium?.tieAcrossCutoff && <div className="v3v-tie-note">Đồng hạng tại ngưỡng bục vinh danh</div>}
    </div>
  );
}

export const V3_VICTORY_SCENES = new Set(['VICTORY', 'ROUND_WINNER']);
