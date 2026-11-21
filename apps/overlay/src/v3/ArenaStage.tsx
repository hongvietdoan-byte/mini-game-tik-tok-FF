import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AudienceSeatView, PublicLeaderboardEntry, PublicSnapshot, QuestionTop3View } from '@quiz/contracts';
import { positiveScoreEntries } from '../overlayLogic';
import { answerPercentages, shortName, splitBubble, truncateGraphemeText, wrapMcBubbleText, wrapPromptToLines } from './arenaLogic';
import { formatParticipantCount } from './participantCount';
import { BrandMark } from './BrandMark';
import { publicPlayerName } from '../publicPlayerName';
import { McSequence } from './mc/mc-sequence-player';
import { themeAssetChildUrl, useTheme } from '../theme';
import { ArenaBackdrop } from './ArenaBackdrop';
import { useHudConfig } from '../hudConfig';
import { fitHudTextStyle } from './hudText';
import { getPublicThrone, orderRankOneHolderFirst, publicThroneHolderId, type PublicThrone } from '../throne';
import { activeQuestionTop3, questionTop3Presentation } from './questionTop3Presentation';
import './arena.css';

/**
 * Bố cục V3 "Storm Arena" theo ảnh mẫu người dùng duyệt (11/11): header, BXH Top 10 trái, khung câu hỏi + đồng hồ + 4 đáp án,
 * MC Kelly + bong bóng hướng dẫn, khán giả 7×5. Mọi chữ/điểm là lớp DOM độc lập (không ghép vào ảnh nền).
 * Kelly và chibi lấy từ asset bank local; logo, khung động, ghế và hiệu ứng sân khấu được dựng bằng CSS/SVG.
 */

const ASSET_BASE = '/assets';

type FastestCorrectAnswerView = {
  questionInstanceId: string;
  publicPlayerId: string;
  seatId: string | null;
  safeDisplayName: string;
  responseMs: number;
};

function fastestCorrectFor(snapshot: PublicSnapshot): FastestCorrectAnswerView | null {
  const fastest = (snapshot as PublicSnapshot & { fastestCorrectAnswer?: FastestCorrectAnswerView | null }).fastestCorrectAnswer;
  if (snapshot.scene !== 'REVEAL' || !snapshot.reveal || !fastest ||
    fastest.questionInstanceId !== snapshot.reveal.questionInstanceId ||
    !fastest.safeDisplayName.trim() || !Number.isFinite(fastest.responseMs) || fastest.responseMs < 0) return null;
  return fastest;
}

function fastestSeconds(ms: number) {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ms / 1000);
}

function FastestName({ name }: { name: string }) {
  const nameRef = useRef<HTMLElement>(null);
  const graphemes = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name), (part) => part.segment);
  const midpoint = Math.ceil(graphemes.length / 2);
  const breakCandidates = graphemes.flatMap((part, index) => index > 0 &&
    (/[\s._-]$/u.test(graphemes[index - 1]!) || /^\p{Lu}/u.test(part)) ? [index] : []);
  const splitAt = breakCandidates.sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint))[0] ?? midpoint;
  const lines = graphemes.length > 12
    ? [graphemes.slice(0, splitAt).join(''), graphemes.slice(splitAt).join('')]
    : [name];

  useLayoutEffect(() => {
    const element = nameRef.current;
    if (!element) return;

    const fit = () => {
      if (nameRef.current !== element) return;
      const nameLines = [...element.querySelectorAll<HTMLElement>('.v3-fastest-name-content > span')];
      const nameLineOverflows = () => nameLines.some((line) =>
        line.scrollWidth > line.clientWidth || line.scrollHeight > line.clientHeight);
      let fontSize = 34;
      element.style.fontSize = `${fontSize}px`;
      while (fontSize > 10 && (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight || nameLineOverflows())) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
      }
    };

    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    const themeObserver = new MutationObserver(fit);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme-id'] });
    document.fonts.addEventListener('loadingdone', fit);
    fit();
    void document.fonts.ready.then(fit);
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      document.fonts.removeEventListener('loadingdone', fit);
    };
  }, [name]);

  return <b ref={nameRef} className="v3-fastest-name"><span className="v3-fastest-name-content">
    {lines.map((line, index) => <span key={index}>{line}</span>)}
  </span></b>;
}

function splitTop3Name(name: string, maxWidth: number, font: string, letterSpacing: number): [string, string] {
  const graphemes = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name), (part) => part.segment);
  const midpoint = Math.ceil(graphemes.length / 2);
  const preferred = graphemes.flatMap((part, index) => {
    return index > 0 && (/\s/u.test(graphemes[index - 1]!) || /^\p{Lu}/u.test(part)) ? [index] : [];
  });
  const candidates = Array.from({ length: Math.max(0, graphemes.length - 1) }, (_, index) => index + 1);
  const context = document.createElement('canvas').getContext('2d');
  if (context) context.font = font;
  const width = (text: string) => (context?.measureText(text).width ?? text.length * 9) + Math.max(0, Array.from(text).length - 1) * letterSpacing;
  const fits = (index: number) => width(graphemes.slice(0, index).join('')) <= maxWidth && width(graphemes.slice(index).join('')) <= maxWidth;
  const feasible = candidates.filter(fits);
  const choices = feasible.length ? feasible : candidates;
  const preferredChoices = choices.filter((index) => preferred.includes(index));
  const splitAt = (preferredChoices.length ? preferredChoices : choices)
    .sort((a, b) => Math.max(width(graphemes.slice(0, a).join('')), width(graphemes.slice(a).join(''))) -
      Math.max(width(graphemes.slice(0, b).join('')), width(graphemes.slice(b).join(''))) ||
      Math.abs(a - midpoint) - Math.abs(b - midpoint))[0] ?? midpoint;
  return [graphemes.slice(0, splitAt).join(''), graphemes.slice(splitAt).join('')];
}

function fittingTop3Split(element: HTMLElement, name: string): number | null {
  const lines = [...element.querySelectorAll<HTMLElement>('[data-top3-name-line]')];
  if (lines.length !== 2) return null;
  const graphemes = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name), (part) => part.segment);
  const midpoint = Math.ceil(graphemes.length / 2);
  const preferred = new Set(graphemes.flatMap((part, index) => {
    return index > 0 && (/\s/u.test(graphemes[index - 1]!) || /^\p{Lu}/u.test(part)) ? [index] : [];
  }));
  const candidates = Array.from({ length: Math.max(0, graphemes.length - 1) }, (_, index) => index + 1)
    .sort((a, b) => Number(!preferred.has(a)) - Number(!preferred.has(b)) || Math.abs(a - midpoint) - Math.abs(b - midpoint));
  const original = lines.map((line) => line.textContent ?? '');
  let result: number | null = null;
  for (const index of candidates) {
    lines[0]!.textContent = graphemes.slice(0, index).join('');
    lines[1]!.textContent = graphemes.slice(index).join('');
    if (lines.every((line) => line.scrollWidth <= element.clientWidth)) {
      result = index;
      break;
    }
  }
  lines[0]!.textContent = original[0]!;
  lines[1]!.textContent = original[1]!;
  return result;
}

function Top3Name({ name }: { name: string }) {
  const nameRef = useRef<HTMLElement>(null);
  const [splitAt, setSplitAt] = useState<number | null>(null);
  const graphemes = Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name), (part) => part.segment);
  const lines = splitAt === null ? [name] : [graphemes.slice(0, splitAt).join(''), graphemes.slice(splitAt).join('')];

  useLayoutEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    const fits = () => {
      const lineElements = [...element.querySelectorAll<HTMLElement>('[data-top3-name-line]')];
      return element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight &&
        lineElements.every((line) => line.scrollWidth <= line.clientWidth && line.scrollHeight <= line.clientHeight);
    };
    const fit = () => {
      let size = 20;
      const minimumSize = splitAt === null && graphemes.length > 12 ? 15 : 12;
      element.style.fontSize = size + 'px';
      while (size > minimumSize && !fits()) {
        size -= 1;
        element.style.fontSize = size + 'px';
      }
      if (splitAt === null && !fits()) {
        const style = window.getComputedStyle(element);
        const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
        const split = splitTop3Name(name, element.clientWidth, style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily, letterSpacing);
        setSplitAt(Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(split[0])).length);
        return;
      }
      if (splitAt !== null) {
        const lines = [...element.querySelectorAll<HTMLElement>('[data-top3-name-line]')];
        if (lines.some((line) => line.scrollWidth > element.clientWidth)) {
          const nextSplitAt = fittingTop3Split(element, name);
          if (nextSplitAt !== null && nextSplitAt !== splitAt) setSplitAt(nextSplitAt);
        }
      }
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(element.parentElement ?? element);
    const themeObserver = new MutationObserver(fit);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme-id'] });
    document.fonts.addEventListener('loadingdone', fit);
    fit();
    void document.fonts.ready.then(fit);
    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.fonts.removeEventListener('loadingdone', fit);
    };
  }, [name, splitAt]);

  return <b ref={nameRef} className={'v3-top3-name' + (splitAt !== null ? ' is-wrapped' : '')} data-testid="top3-name" data-graphemes={graphemes.length}>
    {lines.map((line, index) => <span key={index} data-top3-name-line>{line}</span>)}
  </b>;
}

function QuestionTop3({ ranking }: { ranking: QuestionTop3View }) {
  const presentation = questionTop3Presentation(ranking);
  const hasLongName = presentation.entries.some((entry) =>
    Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(entry.safeDisplayName)).length > 12);
  return <div className={'v3-question-top3' + (hasLongName ? ' has-long-name' : '')} data-testid="question-top3" data-empty={presentation.empty}>
    <strong className="v3-question-top3-title">TOP 3 NHANH NHẤT</strong>
    {presentation.empty
      ? <p className="v3-question-top3-empty">Chưa có người trả lời đúng</p>
      : <div className="v3-question-top3-rows" data-testid="top3-rows">
        {presentation.entries.map((entry) => <div className={'v3-top3-row' + (entry.tied ? ' is-tied' : '')} key={entry.playerId} data-testid="top3-row" data-rank={entry.rank} data-tied={entry.tied}>
          <b className="v3-top3-rank">#{entry.rank}</b>
          <Top3Name name={entry.safeDisplayName} />
          <span className="v3-top3-time" data-testid="top3-time">{fastestSeconds(entry.metricValue)} giây</span>
        </div>)}
      </div>}
    {presentation.tiedOverflowCount > 0 && <small className="v3-top3-overflow" data-testid="top3-overflow">+{presentation.tiedOverflowCount.toLocaleString('vi-VN')} người đồng hạng</small>}
  </div>;
}

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function BrandEventMark() {
  const config = useHudConfig();
  const [first = '', ...rest] = config.texts.kicker.trim().split(/\s+/u);
  const second = rest.join(' ');
  return <div className="v3-event-mark" data-testid="event-mark" aria-label={config.texts.kicker}>
    <span title={config.texts.kicker} style={fitHudTextStyle(first, 178, 31, 12)}>{first}</span>
    {second && <b title={config.texts.kicker} style={fitHudTextStyle(second, 178, 34, 12)}>{second}</b>}
  </div>;
}

export function RoundCard({ snapshot }: { snapshot: PublicSnapshot }) {
  const config = useHudConfig();
  const roundLabel = /^VONG$/iu.test(config.texts.roundLabel.trim()) ? 'VÒNG' : config.texts.roundLabel;
  const roundTitle = `${roundLabel} ${snapshot.round?.roundNumber ?? snapshot.lobbyRoundNumber ?? 1}`;
  const count = formatParticipantCount(snapshot.playingCount ?? snapshot.participantCount);
  return <div className="v3-round-card" data-testid="round-card">
    <b className="v3-round-title" title={roundTitle} style={fitHudTextStyle(roundTitle, 190, 36, 18)}>{roundTitle}</b>
    <strong className="v3-round-count" data-testid="participant-count" title={count} style={fitHudTextStyle(count, 196, 52, 30)}>{count}</strong>
    <small className="v3-round-label" title={config.texts.playingLabel} style={fitHudTextStyle(config.texts.playingLabel, 196, 24, 12)}>{config.texts.playingLabel}</small>
  </div>;
}

export function BrandHeader({ snapshot }: { snapshot: PublicSnapshot }) {
  return <header className="v3-header" data-layer="brand-header">
    <BrandEventMark />
    <BrandMark wide />
    <RoundCard snapshot={snapshot} />
  </header>;
}

function Top10({ entries, allowLegacyNames, fastestPublicPlayerId, showFastestBadge }: { entries: PublicLeaderboardEntry[]; allowLegacyNames: boolean; fastestPublicPlayerId?: string; showFastestBadge: boolean }) {
  const config = useHudConfig();
  return (
    <section className="v3-top10" data-layer="leaderboard" data-testid="v3-top10">
      <div className="v3-top10-title">
        <small title={config.texts.leaderboardTitle} style={fitHudTextStyle(config.texts.leaderboardTitle, 216, 17, 9)}>{config.texts.leaderboardTitle}</small>
        <b>TOP 10</b>
      </div>
      <ol>
        {entries.slice(0, 10).map((e) => (
          <li key={e.playerId} className={`v3-rank-${e.rank <= 3 ? e.rank : 'n'}`} data-testid="leaderboard-row">
            <span className="v3-rank">{e.rank}</span>
            <span className="v3-name">
              {(() => { const name = publicPlayerName(e, `Người chơi ${e.rank}`, allowLegacyNames); return <span className="v3-name-text player-name" title={name}>{shortName(name, 16)}</span>; })()}
              {(e.top1Streak ?? 0) >= 2 && (
                <b className="v3-top1-badge" data-testid="top1-badge" title={`Top 1 liên tiếp ${e.top1Streak} lần`}>
                  x{e.top1Streak}
                </b>
              )}
              {showFastestBadge && e.playerId === fastestPublicPlayerId && <b className="v3-fastest-row-badge" data-testid="fastest-row-badge" aria-label="Người trả lời đúng nhanh nhất">⚡</b>}
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

function QuestionBoard({ snapshot, remainingMs, debug, overlayRole }: { snapshot: PublicSnapshot; remainingMs: number; debug: boolean; overlayRole: 'preview' | 'program' }) {
  const q = snapshot.question;
  const reveal = snapshot.reveal;
  const promptClass = promptSize(q?.prompt);
  const promptText = q?.prompt ?? 'Đang chờ câu hỏi…';
  const isLobby = snapshot.scene === 'LOBBY';
  const promptRef = useRef<HTMLDivElement>(null);
  const [promptFit, setPromptFit] = useState({ fontSize: 0, truncated: false, text: '' });
  const lobbySeatCount = snapshot.audience?.seats.filter((seat) => seat.occupant !== null).length ?? 0;
  const seatCapacity = snapshot.audience?.seats.length ?? 0;
  const lobbyCountdown = snapshot.lobbyCountdown;
  const isPrepare = snapshot.state === 'PREPARE';
  const isReading = snapshot.state === 'READING';
  const optionsVisible = !!q?.optionsVisible && !isPrepare;
  const hasLongOption = !!q?.options.some((option) => option.text.length > 45);
  const hasLongLabel = !!q?.options.some((option) => option.text.length > 30);
  const percentages = reveal ? answerPercentages(reveal.optionCounts) : null;

  useLayoutEffect(() => {
    const element = promptRef.current;
    if (!element) return;
    if (isLobby) {
      element.style.fontSize = '';
      element.style.display = '';
      element.style.webkitBoxOrient = '';
      element.style.webkitLineClamp = '';
      element.style.overflow = '';
      setPromptFit({ fontSize: 0, truncated: false, text: '' });
      return;
    }

    const fit = () => {
      // Reset to the stylesheet's natural size before measuring the available inner box.
      element.style.fontSize = '';
      element.style.display = '';
      element.style.webkitBoxOrient = '';
      element.style.webkitLineClamp = '';
      element.style.overflow = '';
      element.style.whiteSpace = '';
      const baseSize = Number.parseFloat(window.getComputedStyle(element).fontSize) || 30;
      // Keep question text readable on phones; unfit prompts are shortened instead of shrinking below 24px.
      const minimumSize = 24;
      const bottomInset = 16;
      const style = window.getComputedStyle(element);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      const width = element.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
      const contentHeight = element.clientHeight - (Number.parseFloat(style.paddingTop) || 0) - (Number.parseFloat(style.paddingBottom) || 0);
      const baseLineHeight = Number.parseFloat(style.lineHeight) || baseSize * 1.16;
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      const lineHeightAt = (fontSize: number) => baseLineHeight * fontSize / baseSize;
      const layoutAt = (fontSize: number, maxLines: number) => {
        context.font = style.font.replace(/(?:\d*\.)?\d+px/u, `${fontSize}px`);
        return wrapPromptToLines(promptText, width, maxLines, (value) =>
          context.measureText(value).width + Math.max(0, Array.from(value).length - 1) * letterSpacing);
      };
      const fits = (fontSize: number) => {
        const layout = layoutAt(fontSize, 4);
        return layout.lineCount <= 4 && layout.lineCount * lineHeightAt(fontSize) <= contentHeight - bottomInset + 1;
      };

      let best: number | null = null;
      let low = minimumSize;
      let high = Math.max(minimumSize, baseSize);
      if (fits(high)) best = high;
      else if (fits(minimumSize)) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const middle = (low + high) / 2;
          if (fits(middle)) {
            best = middle;
            low = middle;
          } else high = middle;
        }
      }

      const truncated = best === null;
      const fontSize = best ?? minimumSize;
      element.style.fontSize = `${fontSize}px`;
      const maxVisibleLines = Math.max(1, Math.min(4, Math.floor((contentHeight - bottomInset) / lineHeightAt(fontSize))));
      const visibleText = truncated ? layoutAt(fontSize, maxVisibleLines).text : '';
      if (truncated) element.style.whiteSpace = 'pre-line';
      setPromptFit((current) => current.fontSize === fontSize && current.truncated === truncated && current.text === visibleText
        ? current
        : { fontSize, truncated, text: visibleText });
    };

    fit();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [isLobby, promptText]);

  useLayoutEffect(() => {
    const frame = promptRef.current;
    const copy = frame?.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]');
    if (!frame || !copy || isLobby) return;

    const centerRange = () => {
      const rects: DOMRect[] = [];
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5));
        node = walker.nextNode();
      }
      if (!rects.length) return;
      const frameRect = frame.getBoundingClientRect();
      const topGap = Math.min(...rects.map((rect) => rect.top)) - frameRect.top;
      const bottomGap = frameRect.bottom - Math.max(...rects.map((rect) => rect.bottom));
      const currentOffset = Number(copy.style.transform.match(/translateY\((-?[\d.]+)px\)/u)?.[1] ?? 0);
      const offset = currentOffset + (bottomGap - topGap) / 2;
      copy.style.transform = Math.abs(offset) > 0.25 ? `translateY(${offset}px)` : '';
    };

    centerRange();
    const frameId = requestAnimationFrame(centerRange);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(centerRange);
    observer?.observe(frame);
    observer?.observe(copy);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [isLobby, promptFit.fontSize, promptFit.text, promptText]);

  return (
    <section className="v3-board" data-layer="quiz-hud">
      <div className="v3-board-tab" data-testid="question-tab">{isLobby ? 'CHÀO MỪNG' : `CÂU HỎI ${(snapshot.round?.questionIndex ?? 0) + 1}`}</div>
      {snapshot.timer && !isLobby && !isReading && <Timer ms={remainingMs} totalMs={snapshot.timer.durationMs} running={snapshot.timer.running} />}
      {isReading && <div className="v3-reading-status" data-testid="reading-status">MC ĐANG ĐỌC</div>}
      <div
        ref={promptRef}
        className={`v3-question ${promptClass} ${isLobby ? 'is-lobby' : ''} ${promptFit.truncated ? 'is-prompt-truncated' : ''}`}
        data-testid="question-prompt"
        data-prompt-truncated={promptFit.truncated && !isLobby ? 'true' : 'false'}
        aria-label={promptFit.truncated ? `${promptText} — Câu hỏi quá dài, cần rút gọn` : promptText}
        title={promptText}
      >
        {isLobby ? (
          <>
            <div className="v3-lobby-copy">
              <strong>SẮP BẮT ĐẦU</strong>
              <div className="v3-lobby-seat-summary" data-testid="lobby-seat-summary">
                <span className="v3-lobby-seat-count" data-testid="lobby-seat-count">{lobbySeatCount}/{seatCapacity}</span>
                <span className="v3-lobby-seat-label">GHẾ ĐÃ CÓ CHỦ</span>
              </div>
            </div>
          </>
        ) : (
          <span data-testid="question-prompt-copy">{promptFit.truncated ? promptFit.text : promptText}</span>
        )}
      </div>
      {promptFit.truncated && !isLobby && overlayRole !== 'program' && <span className="v3-prompt-truncation-warning" data-testid="prompt-truncation-warning" role="status">CÂU HỎI QUÁ DÀI · CẦN RÚT GỌN</span>}
      {isLobby && (
        <div className={`v3-lobby-status ${lobbyCountdown ? 'is-countdown' : ''}`} data-testid="lobby-status">
          {lobbyCountdown ? (
            <>
              <span className="v3-lobby-countdown-label" data-testid="lobby-countdown-label">VÀO TRẬN SAU</span>
              <strong className="v3-lobby-countdown" data-testid="lobby-countdown">{Math.ceil(lobbyCountdown.remainingMs / 1_000)}</strong>
            </>
          ) : seatCapacity > 0 && lobbySeatCount >= seatCapacity ? (
            <strong className="v3-lobby-full" data-testid="lobby-full">ĐÃ ĐỦ GHẾ!</strong>
          ) : (
            <span className="v3-lobby-reminder" data-testid="lobby-reminder">Comment <b>FREE FIRE</b> để giành ghế!</span>
          )}
        </div>
      )}
      {!isLobby && (
        <div className={`v3-options ${reveal ? 'is-revealed' : ''} ${hasLongOption ? 'has-long-option' : ''} ${hasLongLabel ? 'has-long-label' : ''}`} data-testid="option-list">
          {(['A', 'B', 'C', 'D'] as const).map((id) => {
            const opt = optionsVisible ? q?.options.find((o) => o.id === id) : undefined;
            const correct = !!reveal && reveal.correctOptionId === id;
            const percentage = percentages?.[id] ?? 0;
            return (
              <div
                key={id}
                className={`v3-option ${opt ? '' : 'is-hidden'} ${correct ? 'is-correct' : ''} ${reveal && !correct ? 'is-dim' : ''}`}
                data-testid={`option-${id}`}
                style={{ '--answer-share': `${percentage}%` } as React.CSSProperties}
              >
                <span className="v3-letter">{id}</span>
                <span
                  className={`v3-option-text ${optionSize(opt?.text)}`}
                  title={opt?.text}
                  data-option-truncated={opt && opt.text.length > 45 ? 'true' : 'false'}
                >
                  {opt ? truncateGraphemeText(opt.text, 45, true) : ''}
                </span>
                {reveal && (
                  <span className="v3-option-count">{percentage}%</span>
                )}
                {reveal && <span className="v3-option-meter" aria-hidden="true"><i /></span>}
              </div>
            );
          })}
        </div>
      )}
      {q?.isDemo && debug && <div className="v3-demo" data-testid="demo-badge">DEMO</div>}
    </section>
  );
}

export function McBubbleText({ text, playerNames = [], as = 'span', highlight = false }: {
  text: string;
  playerNames?: readonly string[];
  as?: 'p' | 'span';
  highlight?: boolean;
}) {
  const textElement = useRef<HTMLElement | null>(null);
  const namesKey = playerNames.join('\u0000');
  const [formatted, setFormatted] = useState(() => wrapMcBubbleText(text, playerNames));

  useLayoutEffect(() => {
    const element = textElement.current;
    if (!element) return;

    const update = () => {
      const style = window.getComputedStyle(element);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      context.font = style.font;
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      const next = wrapMcBubbleText(text, playerNames, {
        maxWidth: element.clientWidth,
        measureText: (value) => context.measureText(value).width + Math.max(0, Array.from(value).length - 1) * letterSpacing,
      });
      setFormatted((current) => current === next ? current : next);
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [text, namesKey]);

  const content = highlight
    ? splitBubble(formatted).map((part, index) => part.hl
      ? <em key={index}>{part.text}</em>
      : <React.Fragment key={index}>{part.text}</React.Fragment>)
    : formatted;
  const setElement = (element: HTMLElement | null) => { textElement.current = element; };
  return as === 'p' ? <p ref={setElement}>{content}</p> : <span ref={setElement}>{content}</span>;
}

const questionCallToAction = /(?:comment|bình luận)\s+A\s*,\s*B\s*,\s*C\s+hoặc\s+D/iu;

export function throneMcBubbleText(text: string): string {
  return questionCallToAction.test(text) ? 'Comment A/B/C/D\nđể trả lời ngay!' : text;
}

export function sceneMcBubbleText(snapshot: PublicSnapshot, text: string): string {
  if (!questionCallToAction.test(text)) return text;
  if (snapshot.scene === 'INTERMISSION') return 'Nghỉ giữa vòng nhé!\nChặng tiếp theo sắp bắt đầu.';
  if (snapshot.scene === 'ROUND_WINNER') return 'Chúc mừng người thắng chặng!\nCùng nhìn lại màn bứt phá nhé.';
  return text;
}

export function McKelly({ snapshot, bubbleOverride, fastest, questionTop3, fastestVariant, hideBubble = false, throneLayout = false }: { snapshot: PublicSnapshot; bubbleOverride?: string; fastest?: FastestCorrectAnswerView | null; questionTop3?: QuestionTop3View | null; fastestVariant?: 'a' | 'b'; hideBubble?: boolean; throneLayout?: boolean }) {
  const playerNames = snapshot.leaderboard?.entries.map((entry) => entry.safeDisplayName) ?? [];
  const bubble = (bubbleOverride ?? '').replace(
    /^Bình luận A, B, C hoặc D để tham gia\.?$/,
    'Trả lời bằng cách comment A, B, C hoặc D',
  ).replace(
    /^Trả lời bằng cách\ncomment A, B, C hoặc D\nđể tham gia ngay!$/u,
    'Trả lời bằng cách comment A, B, C hoặc D',
  );
  return (
    <section className={`v3-mc v3-mc-${snapshot.mc.state}${hideBubble ? ' v3-mc--voice-only' : ''}`} data-layer="kelly">
      <div className="v3-mc-figure">
        <McSequence state={snapshot.mc.state} />
      </div>
      <div className="v3-mc-plate">
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
        MC KELLY
      </div>
      {!hideBubble && bubbleOverride !== undefined && <div className={`v3-bubble ${fastest || questionTop3 ? `v3-fastest-callout v3-fastest-callout-${fastestVariant ?? 'a'}` : ''}`} data-testid="mc-bubble">
        {throneLayout && <strong className="v3-throne-bubble-label">MC KELLY</strong>}
        {questionTop3 ? <QuestionTop3 ranking={questionTop3} /> : fastest ? <div className="v3-fastest-copy" data-testid="fastest-callout">
          <strong>{fastestVariant === 'b' ? '⚡ NHANH NHẤT' : 'NHANH NHẤT'}</strong>
          {throneLayout
            ? <FastestName name={fastest.safeDisplayName} />
            : <b className="v3-fastest-name">{fastest.safeDisplayName}</b>}
          <span>{fastestSeconds(fastest.responseMs)} giây</span>
        </div> :
        <McBubbleText as="p" text={bubble} playerNames={playerNames} highlight />}
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

/** Nén riêng khoảng hàng ghế của màn câu hỏi theo lưới 7 hàng trong ảnh mẫu C-0216. */
const seatY = (y: number, compactQuestion = false, userQuestionLayout = false, hasThrone = false) => {
  const top = hasThrone ? 1320 : userQuestionLayout ? 1211 : compactQuestion ? 1330 : AUDIENCE_TOP_Y;
  const front = hasThrone ? 1890 : userQuestionLayout ? 1839 : compactQuestion ? 1860 : AUDIENCE_FRONT_Y;
  return top + ((y - 1105) * (front - top)) / (1825 - 1105);
};
const AUDIENCE_TOP_Y = 1190;
const AUDIENCE_FRONT_Y = 1880;

function audiencePosition(seat: AudienceSeatView, compactQuestion: boolean, userQuestionLayout: boolean, hasThrone: boolean) {
  return {
    x: seat.x,
    y: seatY(seat.y, compactQuestion, userQuestionLayout, hasThrone),
  };
}

function ThronePanel({ throne }: { throne: PublicThrone }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [changing, setChanging] = useState(false);
  const previousHolder = useRef<string | null>(null);
  const holderId = throne.state === 'HELD' ? publicThroneHolderId(throne.holder) : null;
  useEffect(() => {
    setImageFailed(false);
    if (!holderId) {
      previousHolder.current = null;
      setChanging(false);
      return;
    }
    const changed = previousHolder.current !== null && previousHolder.current !== holderId;
    previousHolder.current = holderId;
    if (!changed) return;
    setChanging(true);
    const timer = window.setTimeout(() => setChanging(false), 850);
    return () => window.clearTimeout(timer);
  }, [holderId]);

  const holder = throne.state === 'HELD' ? throne.holder : null;
  const image = holder ? `${ASSET_BASE}/throne/ngai-${holder.characterId}.png` : `${ASSET_BASE}/throne/ngai-trong.png`;
  useEffect(() => setImageFailed(false), [image]);
  return <section className={`v3-throne v3-throne-${throne.state.toLowerCase()}${changing ? ' is-changing' : ''}`} data-testid="throne-panel" data-throne-state={throne.state} data-holder-id={holderId ?? ''} data-score={holder?.score ?? ''} data-visible-art="372,837,706,1176" aria-label={holder ? `Ngai vàng, ${holder.safeDisplayName}, ${holder.score.toLocaleString('vi-VN')} điểm` : throne.state === 'LOCKED' ? 'Ngai vàng đang khoá' : 'Ngai vàng đang trống'}>
    <div className="v3-throne-art" aria-hidden="true">
      {!imageFailed
        ? <img src={image} alt="" draggable={false} decoding="async" data-testid="throne-art" onError={() => setImageFailed(true)} />
        : <svg className="v3-throne-emblem" viewBox="0 0 800 800" aria-label="Ngai vàng trống">
            <path d="M64 744V80h146v270h380V80h146v664M64 744h672M210 350v220h380V350M280 465h240v190H280z" />
            <path d="m64 80 73 100 73-100m380 0 73 100 73-100" />
          </svg>}
    </div>
    <div className="v3-throne-copy">
      <strong className="v3-throne-title">NGAI VÀNG</strong>
      {holder ? <>
        <b className="v3-throne-name" data-testid="throne-holder-name" title={holder.safeDisplayName}>{shortName(holder.safeDisplayName, 12)}</b>
        <span className="v3-throne-score" data-testid="throne-holder-score">{holder.score.toLocaleString('vi-VN')} ĐIỂM</span>
      </> : throne.state === 'LOCKED'
        ? <span className="v3-throne-status" data-testid="throne-status">Mở sau câu 5</span>
        : <span className="v3-throne-status" data-testid="throne-status">đang chờ chủ</span>}
    </div>
  </section>;
}

function SeatChibi({ characterId }: { characterId: string }) {
  const [ok, setOk] = useState(true);
  const [failedTheme, setFailedTheme] = useState(false);
  const theme = useTheme();
  const themeBank = theme.assets['chibi.bankDir'];
  const themedSrc = themeBank ? themeAssetChildUrl(themeBank, `${characterId}.png`) : '';
  const src = themedSrc && !failedTheme ? themedSrc : `${ASSET_BASE}/chibi/${characterId}.png`;
  useEffect(() => { setOk(true); setFailedTheme(false); }, [theme.version, themedSrc]);
  if (!ok) return null;
  return (
    <div className="v3-chibi-img" aria-hidden="true">
      <img src={src} alt="" width={92} height={104} decoding="async" draggable={false} onError={() => {
        if (themedSrc && !failedTheme && src === themedSrc) setFailedTheme(true);
        else setOk(false);
      }} />
    </div>
  );
}

type SeatMotion = { x: number; y: number };
type SeatProps = { seat: AudienceSeatView; compactQuestion: boolean; userQuestionLayout: boolean; hasThrone: boolean; allowLegacyNames: boolean; fastestSeatId?: string | null; motion?: SeatMotion };

function audienceIdentity(seat: AudienceSeatView) {
  return seat.occupant ? JSON.stringify([seat.occupant.safeDisplayName, seat.occupant.characterId]) : null;
}

function sameSeat(previous: SeatProps, next: SeatProps) {
  const a = previous.seat;
  const b = next.seat;
  const left = a.occupant;
  const right = b.occupant;
  const sameOccupant = left === right || (!!left && !!right &&
    publicPlayerName(left, `Khán giả ${a.slotId}`, previous.allowLegacyNames) === publicPlayerName(right, `Khán giả ${b.slotId}`, next.allowLegacyNames) &&
    left.characterId === right.characterId &&
    left.pinned === right.pinned &&
    left.result === right.result);
  const sameMotion = previous.motion?.x === next.motion?.x && previous.motion?.y === next.motion?.y;
  return previous.compactQuestion === next.compactQuestion && previous.userQuestionLayout === next.userQuestionLayout && previous.hasThrone === next.hasThrone && previous.allowLegacyNames === next.allowLegacyNames && previous.fastestSeatId === next.fastestSeatId && a.slotId === b.slotId && a.x === b.x && a.y === b.y && a.scale === b.scale && a.depth === b.depth && a.rowIndex === b.rowIndex && sameOccupant && sameMotion;
}

const Seat = React.memo(function Seat({ seat, compactQuestion, userQuestionLayout, hasThrone, fastestSeatId, motion }: SeatProps) {
  const o = seat.occupant;
  const isFastest = !!fastestSeatId && seat.slotId === fastestSeatId;
  const position = audiencePosition(seat, compactQuestion, userQuestionLayout, hasThrone);
  return (
    <div
      className={`v3-seat ${o ? '' : 'is-empty'} ${o?.pinned ? 'is-pinned' : ''} ${o?.result === 'correct' ? 'is-correct' : ''} ${isFastest ? 'is-fastest' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex: 10 + Math.round(seat.depth),
        ['--s' as string]: seat.scale,
      }}
      data-testid="audience-seat"
      data-slot-id={seat.slotId}
      data-row-index={seat.rowIndex}
    >
      {o && <div className="v3-seat-occupant" style={{ ['--move-x' as string]: `${motion?.x ?? 0}px`, ['--move-y' as string]: `${motion?.y ?? 0}px` }}><SeatChibi characterId={o.characterId} /></div>}
      <div className="v3-seat-back" aria-hidden="true">
        <svg viewBox="0 0 120 60">
          <path d="M8 52 L18 12 L42 34 L60 4 L78 34 L102 12 L112 52 Z" />
        </svg>
      </div>
    </div>
  );
}, sameSeat);

const SeatName = React.memo(function SeatName({ seat, compactQuestion, userQuestionLayout, hasThrone, allowLegacyNames, fastestSeatId, motion }: SeatProps) {
  const occupant = seat.occupant;
  if (!occupant) return null;
  const position = audiencePosition(seat, compactQuestion, userQuestionLayout, hasThrone);
  return <div className={`v3-seat-name ${occupant.pinned ? 'is-pinned' : ''} ${seat.slotId === fastestSeatId ? 'is-fastest' : ''}`} data-slot-id={seat.slotId} data-row-index={seat.rowIndex} style={{ left: position.x, top: position.y, ['--s' as string]: seat.scale, ['--move-x' as string]: `${motion?.x ?? 0}px`, ['--move-y' as string]: `${motion?.y ?? 0}px` }}>
    {shortName(publicPlayerName(occupant, `Khán giả ${seat.slotId}`, allowLegacyNames), 13)}
  </div>;
}, sameSeat);

function Audience({ snapshot, allowLegacyNames, hasThrone }: { snapshot: PublicSnapshot; allowLegacyNames: boolean; hasThrone: boolean }) {
  const a = snapshot.audience;
  const fastest = fastestCorrectFor(snapshot);
  const compactQuestion = snapshot.scene === 'LOBBY' || snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const userQuestionLayout = snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const previousPositions = useRef(new Map<string, { x: number; y: number }>());
  const [motions, setMotions] = useState<Record<string, SeatMotion>>({});
  useLayoutEffect(() => {
    const current = new Map<string, { x: number; y: number }>();
    const nextMotions: Record<string, SeatMotion> = {};
    for (const seat of a?.seats ?? []) {
      const identity = audienceIdentity(seat);
      if (!identity) continue;
      const position = audiencePosition(seat, compactQuestion, userQuestionLayout, hasThrone);
      const previous = previousPositions.current.get(identity);
      if (snapshot.scene === 'REVEAL' && previous && (previous.x !== position.x || previous.y !== position.y)) {
        nextMotions[identity] = { x: previous.x - position.x, y: previous.y - position.y };
      }
      current.set(identity, position);
    }
    previousPositions.current = current;
    if (!Object.keys(nextMotions).length) {
      setMotions({});
      return;
    }
    setMotions(nextMotions);
    const frame = window.requestAnimationFrame(() => setMotions({}));
    return () => window.cancelAnimationFrame(frame);
  }, [snapshot.scene, a?.seats, compactQuestion, userQuestionLayout]);
  const rows = a
    ? [...new Map(a.seats.map((s) => [s.rowIndex, seatY(s.y, compactQuestion, userQuestionLayout, hasThrone)])).entries()].map(([row, y]) => ({ row, y }))
    : [];
  return (
    <section className="v3-audience" data-layer="audience-seats">
      <div className="v3-tiers" aria-hidden="true" />
      {rows.map((r) => (
        <span key={r.row} className="v3-step" aria-hidden="true" style={{ top: r.y + 4, ['--r' as string]: r.row }} />
      ))}
      {a?.seats.map((s) => { const identity = audienceIdentity(s); const motion = identity ? motions[identity] : undefined; return <Seat key={s.slotId} seat={s} compactQuestion={compactQuestion} userQuestionLayout={userQuestionLayout} hasThrone={hasThrone} allowLegacyNames={allowLegacyNames} fastestSeatId={fastest?.seatId} motion={motion} />; })}
      {/* Lớp bảng tên riêng (V3 §3 audience-nametags) — luôn trên mọi nhân vật, không bị hàng trước che */}
      <div className="v3-nametags" data-layer="audience-nametags">
        {a?.seats.map((s) => { const identity = audienceIdentity(s); const motion = identity ? motions[identity] : undefined; return <SeatName key={s.slotId} seat={s} compactQuestion={compactQuestion} userQuestionLayout={userQuestionLayout} hasThrone={hasThrone} allowLegacyNames={allowLegacyNames} fastestSeatId={fastest?.seatId} motion={motion} />; })}
      </div>
      {a && a.queued > 0 && <div className="v3-queue">+{a.queued.toLocaleString('vi-VN')} người đang chờ chỗ</div>}
    </section>
  );
}

export function ArenaStage({ snapshot, remainingMs, debug = false, allowLegacyNames = false, overlayRole = 'preview' }: { snapshot: PublicSnapshot; remainingMs: number; debug?: boolean; allowLegacyNames?: boolean; overlayRole?: 'preview' | 'program' }) {
  const config = useHudConfig();
  const [voiceBubble, setVoiceBubble] = useState<{ cueId: string; eventType: string; text: string; durationMs: number } | null>(null);
  useLayoutEffect(() => {
    const cue = snapshot.mcVoiceCue;
    if (!cue) {
      if (voiceBubble?.eventType === 'OPERATOR_CHAT' && !snapshot.mcChatBubble) setVoiceBubble(null);
      return;
    }
    if (!cue.bubbleText) {
      setVoiceBubble(null);
      return;
    }
    setVoiceBubble({ cueId: cue.cueId, eventType: cue.eventType, text: cue.bubbleText, durationMs: cue.durationMs });
  }, [snapshot.mcVoiceCue?.cueId, snapshot.mcChatBubble?.chatId]);
  useLayoutEffect(() => {
    if (!voiceBubble) return;
    const tailMs = voiceBubble.eventType === 'OPERATOR_CHAT' ? 0 : 250;
    const timeout = window.setTimeout(() => setVoiceBubble((current) => current?.cueId === voiceBubble.cueId ? null : current), voiceBubble.durationMs + tailMs);
    return () => window.clearTimeout(timeout);
  }, [voiceBubble?.cueId]);
  const fastest = fastestCorrectFor(snapshot);
  const questionTop3 = activeQuestionTop3(snapshot);
  const throne = getPublicThrone(snapshot);
  const holderId = throne?.state === 'HELD' ? publicThroneHolderId(throne.holder) ?? undefined : undefined;
  const fastestVariant: 'a' | 'b' = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === 'fastest-b' ? 'b' : 'a';
  const questionBackground = snapshot.scene === 'LOBBY' || snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const questionBubbleSource = snapshot.scene === 'LOBBY'
    ? (voiceBubble?.text ?? snapshot.mcChatBubble?.text ?? snapshot.lobbyMessage ?? (throne ? 'Vào sảnh nhé!' : 'CHÀO MỪNG ĐẾN VỚI\nĐẤU TRƯỜNG BÃO TỐ!'))
    : questionBackground ? (voiceBubble?.text ?? snapshot.mcChatBubble?.text ?? snapshot.mc.bubble) : undefined;
  const questionBubble = questionBubbleSource !== undefined && throne ? throneMcBubbleText(questionBubbleSource) : questionBubbleSource;
  const hasLongPrompt = promptSize(snapshot.question?.prompt) === 'is-xlong';
  const hasLongOptions = snapshot.question?.options.some((option) => option.text.length > 45) ?? false;
  const userQuestionLayout = snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL';
  const stageClasses = ['v3-stage', questionBackground && 'v3-stage--question-user', userQuestionLayout && 'v3-stage--user-question-layout', throne && 'v3-stage--has-throne', (fastest || questionTop3) && 'has-fastest-callout', hasLongPrompt && 'has-long-prompt', hasLongOptions && 'has-long-options'].filter(Boolean).join(' ');
  return (
    <div className={stageClasses} data-scene={snapshot.scene}>
      <ArenaBackdrop arena questionBackground={questionBackground} loopVideo={snapshot.scene === 'QUESTION' || snapshot.scene === 'REVEAL'} showFlags={!questionBackground} backgroundId={snapshot.scene === 'LOBBY' ? config.images.bgLobby : config.images.bgQuestion} />
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
      <Top10 entries={orderRankOneHolderFirst(positiveScoreEntries(snapshot.leaderboard?.entries ?? []), holderId)} allowLegacyNames={allowLegacyNames} fastestPublicPlayerId={fastest?.publicPlayerId} showFastestBadge={fastestVariant === 'b'} />
      <QuestionBoard snapshot={snapshot} remainingMs={remainingMs} debug={debug} overlayRole={overlayRole} />
      <McKelly snapshot={snapshot} bubbleOverride={questionBubble} fastest={questionTop3 ? null : fastest} questionTop3={questionTop3} fastestVariant={fastestVariant} throneLayout={!!throne} />
      {throne && questionBackground && <ThronePanel throne={throne} />}
      <Audience snapshot={snapshot} allowLegacyNames={allowLegacyNames} hasThrone={!!throne} />
    </div>
  );
}

export const V3_SCENES = new Set(['LOBBY', 'QUESTION', 'REVEAL']);
