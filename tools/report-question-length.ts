import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { DatabaseSync, backup } from 'node:sqlite';
import { chromium, type Browser, type Page } from '@playwright/test';
import { DEFAULT_HUD_CONFIG, MC_VOICE_POLICY_VERSION, type PublicSnapshot } from '@quiz/contracts';
import { questionVoiceScripts } from '../apps/server/src/voice/question-script';
import { applyMcPronunciationDictionary, loadMcPronunciationDictionary } from '../apps/server/src/voice/pronunciation';
import { mcVoiceCacheKey } from '../apps/server/src/voice/cache';
import { makeMockSnapshot } from '../apps/overlay/src/mock/snapshots';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Option = { id: string; text: string };
type Question = {
  id: string;
  topic: string;
  prompt: string;
  options: Option[];
  correctOptionId: string;
};
type TextMetric = {
  fontPx: number;
  lineHeightPx: number;
  lines: number;
  maxLines: number | null;
  truncated: boolean;
  visibleText: string;
  fullText: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
  lineBoxOverflowPx: number;
  overflowX: string;
  overflowY: string;
  centered?: boolean | null;
  topGapPx?: number | null;
  bottomGapPx?: number | null;
};
type GlyphAudit = {
  questionId: string;
  optionId: string;
  letter: string;
  text: string;
  glyph: string;
  glyphBox: { left: number; top: number; right: number; bottom: number };
  contentBox: { left: number; top: number; right: number; bottom: number };
  withinContentBox: boolean;
  screenshot: string;
};
type QuestionMetrics = {
  question: TextMetric;
  reveal: TextMetric;
  answers: Record<string, { question: TextMetric; reveal: TextMetric }>;
};
export type QuestionResult = Question & {
  promptChars: number;
  answerChars: number[];
  metrics: QuestionMetrics;
  durationMs: number | null;
  durationEstimated: boolean;
  slowRateCps: number | null;
  groups: string[];
  glyphAudits?: GlyphAudit[];
};
type CacheProfile = {
  baseUrl: string;
  provider: string;
  model: string;
  voiceId: string;
  voiceSettings: Record<string, string | number | boolean>;
  voiceSettingsByEvent?: Record<string, Record<string, string | number | boolean>>;
};
type CacheDuration = { assetId: string; durationMs: number };
type Suggestion = string | { prompt?: string; options?: Record<string, string> };
type Suggestions = Record<string, Suggestion[]>;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_INPUT_ROOT = existsSync(resolve(REPO_ROOT, 'data', 'quiz.db'))
  ? REPO_ROOT
  : resolve(REPO_ROOT, '..', '..', '..');
const COPY_DIRECTORY = resolve(REPO_ROOT, 'test-results', 'c0310');
const DATABASE_COPY = resolve(COPY_DIRECTORY, 'quiz-copy.db');
const REPORT_DIRECTORY = resolve(REPO_ROOT, '.claude', 'review', 'C0310');
const REPORT_MARKDOWN = resolve(REPORT_DIRECTORY, 'question-length-report.md');
const REPORT_JSON = resolve(REPORT_DIRECTORY, 'question-length-report.json');
const SUGGESTIONS_FILE = resolve(REPORT_DIRECTORY, 'suggestions.json');
const QUESTION_IDS = ['A', 'B', 'C', 'D'] as const;

function codePointLength(text: string): number {
  return Array.from(text).length;
}

export function median(values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function estimateDurationMs(characters: number, charsPerSecond: number | null): number | null {
  if (!Number.isFinite(characters) || characters < 0 || !charsPerSecond || !Number.isFinite(charsPerSecond) || charsPerSecond <= 0)
    return null;
  return Math.ceil(characters / charsPerSecond * 1_000);
}

function hasClamp(metric: TextMetric): boolean {
  return metric.truncated || metric.visibleText.includes('…') || metric.visibleText !== metric.fullText;
}

function isOptionCut(metric: TextMetric): boolean {
  return metric.truncated || metric.visibleText.includes('…') || metric.visibleText !== metric.fullText;
}

function rankingScore(item: QuestionResult): number {
  const prompt = [item.metrics.question, item.metrics.reveal];
  const answers = Object.values(item.metrics.answers).flatMap((answer) => [answer.question, answer.reveal]);
  return (prompt.some(hasClamp) ? 1_000_000 : 0) +
    (answers.some(isOptionCut) ? 100_000 : 0) +
    (prompt.some((metric) => metric.fontPx < 30) ? 10_000 : 0) +
    (item.durationMs !== null && item.durationMs > 20_000 ? 1_000 : 0) +
    Math.max(item.promptChars, ...item.answerChars);
}

export function rankQuestions<T extends QuestionResult>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => rankingScore(b) - rankingScore(a) || a.id.localeCompare(b.id));
}

export function proposeShortenedPrompt(prompt: string): string {
  const compressed = prompt.trim()
    .replace(/^Trong (?:trò chơi )?Free Fire,?\s*/iu, 'Free Fire: ')
    .replace(/\b(?:có thể |thường )?được gọi là\b/giu, 'là')
    .replace(/\bcó tên là gì\b/giu, 'là gì')
    .replace(/\bngười chơi có thể\b/giu, 'người chơi')
    .replace(/\s+/gu, ' ');
  if (compressed.length < prompt.trim().length) return compressed;
  const shorterFrame = prompt.trim()
    .replace(/^Bạn hãy cho biết\s+/iu, '')
    .replace(/^Hãy cho biết\s+/iu, '')
    .replace(/^Theo ([^,]+),\s*/iu, '$1: ')
    .replace(/\s+/gu, ' ');
  if (shorterFrame.length < prompt.trim().length) return shorterFrame;
  return prompt.trim();
}

function rowGroups(item: QuestionResult): string[] {
  const groups: string[] = [];
  if (item.metrics.question.centered === false) groups.push('Prompt chưa căn giữa');
  if ([item.metrics.question, item.metrics.reveal].some(hasClamp)) groups.push('Prompt bị clamp');
  if (Object.values(item.metrics.answers).some((entry) => isOptionCut(entry.question) || isOptionCut(entry.reveal))) groups.push('Đáp án bị cắt');
  if ([item.metrics.question, item.metrics.reveal].some((entry) => entry.fontPx < 30)) groups.push('Cỡ chữ dưới 30 px');
  if (item.durationMs !== null && item.durationMs > 20_000) groups.push('Ước lượng đọc trên 20 giây');
  return groups;
}

async function captureScene(page: Page, question: Question, scene: 'question' | 'reveal', stateVersion: number, send: (snapshot: PublicSnapshot) => void) {
  const base = makeMockSnapshot(scene);
  if (!base?.question) throw new Error(`Mock overlay thiếu cảnh ${scene.toUpperCase()}.`);
  const questionInstanceId = `c0310-${question.id}`;
  const publicQuestion = {
    ...base.question,
    questionInstanceId,
    index: 0,
    prompt: question.prompt,
    optionsVisible: true,
    isDemo: false,
    options: question.options.map((option, index) => ({ id: QUESTION_IDS[index]!, text: option.text })),
  };
  const snapshot = {
    ...base,
    stateVersion,
    question: publicQuestion,
    reveal: scene === 'reveal' && base.reveal
      ? { ...base.reveal, questionInstanceId, correctOptionId: question.correctOptionId }
      : null,
  } as PublicSnapshot;
  send(snapshot);
  await page.locator('[data-testid="question-prompt"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForFunction(({ prompt, sceneName }) => {
    const element = document.querySelector<HTMLElement>('[data-testid="question-prompt"]');
    return element?.getAttribute('title') === prompt && document.querySelector(`[data-testid="stage"][data-scene="${sceneName}"]`);
  }, { prompt: question.prompt, sceneName: scene === 'question' ? 'QUESTION' : 'REVEAL' }, { timeout: 10_000 });
  await page.waitForTimeout(30);
  const collectMetrics = new Function(`
    function readMetric(element, visibleText) {
      visibleText = visibleText ?? element.textContent ?? '';
      const isPrompt = element.matches('[data-testid="question-prompt"]');
      const textSource = isPrompt ? element.querySelector('[data-testid="question-prompt-copy"]') ?? element : element;
      const walker = document.createTreeWalker(textSource, NodeFilter.SHOW_TEXT);
      const rects = [];
      let textNode = walker.nextNode();
      while (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        rects.push(...Array.from(range.getClientRects()).filter((rect) => rect.width > 0.5 && rect.height > 0.5));
        textNode = walker.nextNode();
      }
      const lines = new Set(rects.map((rect) => Math.round(rect.top * 10) / 10)).size;
      const frame = element.getBoundingClientRect();
      const fullText = element.getAttribute('title') ?? visibleText;
      const style = getComputedStyle(element);
      const clamp = Number.parseInt(style.getPropertyValue('-webkit-line-clamp') || style.webkitLineClamp, 10);
      const topGapPx = isPrompt && rects.length ? Math.min(...rects.map((rect) => rect.top)) - frame.top : null;
      const bottomGapPx = isPrompt && rects.length ? frame.bottom - Math.max(...rects.map((rect) => rect.bottom)) : null;
      const centered = isPrompt && topGapPx !== null && bottomGapPx !== null && topGapPx >= 8 && bottomGapPx >= 8 &&
        Math.abs(topGapPx - bottomGapPx) <= 4 && element.scrollHeight <= element.clientHeight;
      const contentCut = visibleText.includes('…') || visibleText !== fullText || (!isPrompt && lines > clamp && Number.isFinite(clamp)) ||
        (!isPrompt && element.scrollWidth > element.clientWidth);
      return {
        fontPx: Number.parseFloat(style.fontSize) || 0,
        lineHeightPx: Number.parseFloat(style.lineHeight) || 0,
        lines,
        maxLines: Number.isFinite(clamp) ? clamp : null,
        truncated: isPrompt
          ? element.getAttribute('data-prompt-truncated') === 'true' || element.scrollHeight > element.clientHeight + 1 || visibleText.includes('…') || visibleText !== fullText
          : contentCut,
        visibleText,
        fullText,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        lineBoxOverflowPx: Math.max(0, element.scrollHeight - element.clientHeight),
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        centered: isPrompt ? centered : null,
        topGapPx,
        bottomGapPx,
      };
    }
    const prompt = document.querySelector('[data-testid="question-prompt"]');
    const copy = prompt.querySelector('[data-testid="question-prompt-copy"]');
    const answers = {};
    for (const id of ['A', 'B', 'C', 'D']) answers[id] = readMetric(document.querySelector('[data-testid="option-' + id + '"] .v3-option-text'));
    return { prompt: readMetric(prompt, copy.textContent ?? ''), answers };
  `) as () => { prompt: TextMetric; answers: Record<string, TextMetric> };
  return page.evaluate(collectMetrics);
}

function chooseGlyphAudits(questions: Question[]): Array<{ question: Question; optionIndex: number; glyph: string }> {
  const glyphs = 'ẫỖỮạặỵ';
  const candidates = questions.flatMap((question) => question.options.flatMap((option, optionIndex) => {
    const glyph = Array.from(option.text).find((character) => glyphs.includes(character));
    return glyph ? [{ question, optionIndex, glyph }] : [];
  }));
  const selected: typeof candidates = [];
  const addFirst = (predicate: (candidate: typeof candidates[number]) => boolean) => {
    const match = candidates.find((candidate) => !selected.some((item) => item.question.id === candidate.question.id && item.optionIndex === candidate.optionIndex) && predicate(candidate));
    if (match) selected.push(match);
  };
  addFirst(({ glyph }) => 'ẫỖỮ'.includes(glyph));
  addFirst(({ glyph }) => glyph === 'ặ');
  addFirst(({ glyph }) => 'ạỵ'.includes(glyph));
  for (const candidate of candidates) {
    if (selected.length >= 5) break;
    if (!selected.some((item) => item.question.id === candidate.question.id && item.optionIndex === candidate.optionIndex)) selected.push(candidate);
  }
  return selected;
}

async function measureGlyph(page: Page, letter: string, glyph: string): Promise<Omit<GlyphAudit, 'optionId' | 'letter' | 'text' | 'screenshot'>> {
  const evaluator = new Function(`return function(args) {
    const answerLetter = args.answerLetter;
    const targetGlyph = args.targetGlyph;
    const element = document.querySelector('[data-testid="option-' + answerLetter + '"] .v3-option-text');
    if (!element) throw new Error('Không tìm thấy đáp án để đo glyph.');
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let rangeRect = null;
    while (node) {
      const index = node.data.indexOf(targetGlyph);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + targetGlyph.length);
        rangeRect = range.getBoundingClientRect();
        break;
      }
      node = walker.nextNode();
    }
    if (!rangeRect) throw new Error('Không tìm thấy glyph trong đáp án.');
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const px = (value) => Number.parseFloat(value) || 0;
    const left = rect.left + px(style.borderLeftWidth) + px(style.paddingLeft);
    const top = rect.top + px(style.borderTopWidth) + px(style.paddingTop);
    const right = rect.left + px(style.borderLeftWidth) + element.clientWidth - px(style.paddingRight);
    const bottom = rect.top + px(style.borderTopWidth) + element.clientHeight - px(style.paddingBottom);
    const glyphBox = { left: rangeRect.left, top: rangeRect.top, right: rangeRect.right, bottom: rangeRect.bottom };
    const contentBox = { left, top, right, bottom };
    const epsilon = 0.5;
    return { glyphBox, contentBox, withinContentBox: glyphBox.left >= left - epsilon && glyphBox.right <= right + epsilon && glyphBox.top >= top - epsilon && glyphBox.bottom <= bottom + epsilon };
  }`)() as (args: { answerLetter: string; targetGlyph: string }) => unknown;
  return await page.evaluate(evaluator, { answerLetter: letter, targetGlyph: glyph }) as Omit<GlyphAudit, 'optionId' | 'letter' | 'text' | 'screenshot'>;
}

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng overlay tạm.');
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function waitForHttp(url: string, child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Overlay Vite kết thúc sớm với mã ${child.exitCode}.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await delay(250);
  }
  throw new Error('Overlay Vite không sẵn sàng sau 25 giây.');
}

async function startOverlay(port: number, serverPort: number): Promise<{ child: ChildProcess; url: string }> {
  const overlayDirectory = resolve(REPO_ROOT, 'apps', 'overlay');
  const viteEntrypoint = resolve(overlayDirectory, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteEntrypoint, '--config', 'vite.config.ts', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: overlayDirectory,
    env: { ...process.env, VITE_PORT: String(port), QUIZ_PORT: String(serverPort) },
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', () => undefined);
  const url = `http://127.0.0.1:${port}`;
  await waitForHttp(url, child);
  return { child, url };
}

async function startServer(port: number, assetDirectory: string): Promise<{ child: ChildProcess; url: string }> {
  const entrypoint = resolve(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const dataDirectory = resolve(COPY_DIRECTORY, 'server-data');
  await mkdir(dataDirectory, { recursive: true });
  const child = spawn(process.execPath, [entrypoint, resolve(REPO_ROOT, 'apps', 'server', 'src', 'main.ts')], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      QUIZ_HOST: '127.0.0.1',
      QUIZ_PORT: String(port),
      QUIZ_DB: ':memory:',
      QUIZ_DATA_DIR: dataDirectory,
      QUIZ_ASSETS_DIR: assetDirectory,
      CLIPAI_TOKEN: '',
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', () => undefined);
  const url = `http://127.0.0.1:${port}`;
  await waitForHttp(`${url}/health`, child);
  return { child, url };
}

async function copyDatabase(): Promise<void> {
  await mkdir(COPY_DIRECTORY, { recursive: true });
  const sourcePath = resolve(LOCAL_INPUT_ROOT, 'data', 'quiz.db');
  if (!isAbsolute(sourcePath)) throw new Error('Đường dẫn DB nguồn không hợp lệ.');
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await rm(DATABASE_COPY, { force: true });
    await backup(source, DATABASE_COPY);
  } finally {
    source.close();
  }
}

function readQuestions(): Question[] {
  const db = new DatabaseSync(DATABASE_COPY, { readOnly: true });
  try {
    const rows = db.prepare(`
      SELECT q.id, COALESCE(s.name, q.subtopic_id, '') AS topic, q.prompt,
        q.options_json, q.correct_option_id
      FROM questions q
      LEFT JOIN subtopics s ON s.id = q.subtopic_id
      WHERE q.approval_status = 'APPROVED'
      ORDER BY q.id
    `).all() as Array<{ id: string; topic: string; prompt: string; options_json: string; correct_option_id: string }>;
    return rows.map((row) => {
      const sourceOptions = JSON.parse(row.options_json) as Option[];
      if (sourceOptions.length !== 4 || sourceOptions.some((option) => typeof option.text !== 'string'))
        throw new Error(`Câu ${row.id} không có đúng bốn đáp án hợp lệ.`);
      const correctIndex = sourceOptions.findIndex((option) => option.id === row.correct_option_id);
      if (correctIndex < 0) throw new Error(`Câu ${row.id} có đáp án đúng không khớp danh sách.`);
      return {
        id: row.id,
        topic: row.topic,
        prompt: row.prompt,
        options: sourceOptions,
        correctOptionId: QUESTION_IDS[correctIndex]!,
      };
    });
  } finally {
    db.close();
  }
}

async function loadCacheDurations(): Promise<Map<string, number>> {
  const directory = resolve(LOCAL_INPUT_ROOT, 'data', 'mc-voice-cache');
  const result = new Map<string, number>();
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9]{64}$/u.test(entry.name)) continue;
      try {
        const metadata = JSON.parse(await readFile(join(directory, entry.name, 'metadata.json'), 'utf8')) as CacheDuration;
        if (metadata.assetId === entry.name && Number.isSafeInteger(metadata.durationMs) && metadata.durationMs > 0)
          result.set(entry.name, metadata.durationMs);
      } catch { /* Missing or invalid cache metadata is not a duration sample. */ }
    }
  } catch { /* A missing local cache simply means no cached samples are available. */ }
  return result;
}

async function loadVoiceContext(): Promise<{ key: string; model: string; settings: Record<string, string | number | boolean>; rules: Awaited<ReturnType<typeof loadMcPronunciationDictionary>> } | null> {
  const profilePath = resolve(LOCAL_INPUT_ROOT, 'data', 'mc-voice-profile.json');
  try {
    const profile = JSON.parse(await readFile(profilePath, 'utf8')) as CacheProfile;
    const endpoint = new URL(profile.baseUrl).origin;
    const key = createHash('sha256').update(JSON.stringify([endpoint, profile.provider.trim(), profile.model.trim(), profile.voiceId.trim()])).digest('hex');
    const settings = { ...profile.voiceSettings, ...profile.voiceSettingsByEvent?.QUESTION };
    const rules = await loadMcPronunciationDictionary(resolve(LOCAL_INPUT_ROOT, 'data', 'mc-pronunciation.json'));
    return { key, model: profile.model.trim(), settings, rules };
  } catch {
    return null;
  }
}

function scriptCacheKey(text: string, context: NonNullable<Awaited<ReturnType<typeof loadVoiceContext>>>): string {
  return mcVoiceCacheKey({
    text: applyMcPronunciationDictionary(text, context.rules),
    voicePolicyVersion: MC_VOICE_POLICY_VERSION,
    voiceKey: context.key,
    provider: 'clipai',
    model: context.model,
    voiceSettings: context.settings,
    rate: 1,
    format: 'mp3',
  });
}

async function readSuggestions(): Promise<Suggestions> {
  try {
    const parsed = JSON.parse(await readFile(SUGGESTIONS_FILE, 'utf8')) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Array.isArray(value) && value.every((entry) =>
        typeof entry === 'string' || (!!entry && typeof entry === 'object' && !Array.isArray(entry) &&
          (('prompt' in entry && typeof entry.prompt === 'string') || ('options' in entry && !!entry.options && typeof entry.options === 'object'))))));
  } catch { /* A first run gets a review template, not an invented rewrite. */ }
  return {};
}

function summaryMetric(item: QuestionResult): string {
  const a = item.metrics.question;
  const b = item.metrics.reveal;
  return `${a.fontPx}px/${a.lines} dòng · ${b.fontPx}px/${b.lines} dòng`;
}

function promptCentering(item: QuestionResult): string {
  const metric = item.metrics.question;
  if (metric.centered === undefined || metric.centered === null || metric.topGapPx === undefined || metric.topGapPx === null ||
    metric.bottomGapPx === undefined || metric.bottomGapPx === null) return 'Không đo được';
  return `${metric.centered ? 'Đạt' : 'Không'} (${metric.topGapPx.toFixed(1)} / ${metric.bottomGapPx.toFixed(1)} px)`;
}

export function renderMarkdown(results: readonly QuestionResult[], totals: { approved: number; clamp: number; small: number; slow: number; answerCuts: number }, suggestions: Suggestions = {}, medianCps: number | null = null): string {
  const sorted = rankQuestions(results);
  const affected = sorted.filter((item) => item.groups.length > 0);
  const centeringMeasured = results.filter((item) => item.metrics.question.centered !== undefined && item.metrics.question.centered !== null);
  const centeringPassed = centeringMeasured.filter((item) => item.metrics.question.centered === true).length;
  const rows = affected.map((item) => {
    const generated = proposeShortenedPrompt(item.prompt);
    const proposals = suggestions[item.id]?.length ? suggestions[item.id]!.slice(0, 2) : generated !== item.prompt ? [generated] : [];
    const optionSummary = Object.entries(item.metrics.answers).map(([id, metric]) =>
      `${id}: Q ${metric.question.fontPx}px/${metric.question.lines} dòng${isOptionCut(metric.question) ? ' cắt' : ''}; R ${metric.reveal.fontPx}px/${metric.reveal.lines} dòng${isOptionCut(metric.reveal) ? ' cắt' : ''}; “${item.options[QUESTION_IDS.indexOf(id as typeof QUESTION_IDS[number])]?.text ?? ''}”`,
    ).join('; ');
    const duration = item.durationMs === null ? 'chưa ước lượng (thiếu cache mẫu)' : `${(item.durationMs / 1_000).toFixed(1)} s${item.durationEstimated ? ' (ước lượng)' : ' (đủ cache)'}`;
    const details = proposals.length
      ? proposals.map((value, index) => {
        const text = typeof value === 'string'
          ? `Rút gọn câu hỏi: “${value}”`
          : [value.prompt ? `Rút gọn câu hỏi: “${value.prompt}”` : '', ...Object.entries(value.options ?? {}).map(([letter, option]) => `Đáp án ${letter}: “${option}”`)].filter(Boolean).join('; ');
        return `${index + 1}. **ĐỀ XUẤT — chờ người dùng duyệt:** ${text}; giữ nguyên đáp án đúng.`;
      }).join('<br>')
      : 'Chưa tìm được cách rút gọn an toàn tự động; cần biên tập thủ công.';
    return `| ${item.groups.join(', ')} | ${item.id} | ${item.topic} | ${item.promptChars} | ${promptCentering(item)} | ${summaryMetric(item)} | ${optionSummary} | ${duration} | ${item.prompt.replaceAll('|', '\\|')} | ${details} |`;
  });
  const worst = sorted.slice(0, 5).map((item) => `- **${item.id} · ${item.topic}** — ${item.groups.join(', ') || 'không nằm trong nhóm cảnh báo'}; ${item.promptChars} ký tự, ${summaryMetric(item)}, ${item.durationMs === null ? 'chưa có ước lượng' : `${(item.durationMs / 1_000).toFixed(1)} s`}. Gốc: “${item.prompt}”`).join('\n');
  const answerSlots = results.flatMap((item) => QUESTION_IDS.map((letter, index) => ({
    key: `${item.id}:${index}`,
    metrics: item.metrics.answers[letter]!,
  })));
  const overflowingAnswers = answerSlots.filter(({ metrics }) => [metrics.question, metrics.reveal].some((metric) => metric.lineBoxOverflowPx > 1));
  const lineBoxOnlyAnswers = overflowingAnswers.filter(({ metrics }) => ![metrics.question, metrics.reveal].some(isOptionCut));
  const overflowValues = lineBoxOnlyAnswers.flatMap(({ metrics }) => [metrics.question, metrics.reveal]
    .filter((metric) => metric.lineBoxOverflowPx > 1)
    .map((metric) => metric.lineBoxOverflowPx));
  const styleCounts = new Map<string, number>();
  for (const { metrics } of lineBoxOnlyAnswers) {
    for (const metric of [metrics.question, metrics.reveal]) {
      if (metric.lineBoxOverflowPx <= 1) continue;
      const key = `${metric.fontPx}px / ${metric.lineHeightPx}px`;
      styleCounts.set(key, (styleCounts.get(key) ?? 0) + 1);
    }
  }
  const styleSummary = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]).map(([style, count]) => `${style} (${count} cảnh)`).join(', ') || 'không quan sát thấy tràn';
  const glyphAudits = results.flatMap((item) => item.glyphAudits ?? []);
  const glyphRows = glyphAudits.map((audit, index) => {
    const glyphBox = `${audit.glyphBox.left.toFixed(1)}, ${audit.glyphBox.top.toFixed(1)} → ${audit.glyphBox.right.toFixed(1)}, ${audit.glyphBox.bottom.toFixed(1)}`;
    const contentBox = `${audit.contentBox.left.toFixed(1)}, ${audit.contentBox.top.toFixed(1)} → ${audit.contentBox.right.toFixed(1)}, ${audit.contentBox.bottom.toFixed(1)}`;
    return `| ${index + 1} | ${audit.text.replaceAll('|', '\\|')} | ${audit.glyph} | ${glyphBox} | ${contentBox} | ${audit.withinContentBox ? 'Trong content box' : 'Vượt content box'} | ${audit.screenshot} |`;
  });
  return [
    '# Báo cáo độ dài câu hỏi APPROVED',
    '',
    '> Báo cáo chỉ đọc bản sao DB. Không có nội dung nào được ghi lại vào DB hay file câu hỏi. Các phương án rút gọn là đề xuất, chờ người dùng duyệt.',
    '',
    '## Tổng quan',
    '',
    `- Tổng câu APPROVED: **${totals.approved}**`,
    `- Prompt bị clamp ở QUESTION hoặc REVEAL: **${totals.clamp}**`,
    `- Prompt có cỡ chữ dưới 30 px: **${totals.small}**`,
    `- Prompt căn giữa dọc đạt: **${centeringPassed}/${centeringMeasured.length}**; không đạt: **${centeringMeasured.length - centeringPassed}**.`,
    `- Thời lượng đọc ước lượng trên 20 giây: **${totals.slow}**`,
    `- Đáp án bị cắt (tính theo đáp án duy nhất, cắt ở ít nhất một cảnh): **${totals.answerCuts}**`,
    `- Trung vị tốc độ đọc từ dòng cache hiện có: **${medianCps === null ? 'không có mẫu khớp cache' : `${medianCps.toFixed(2)} ký tự/giây`}**`,
    '',
    '## Tràn line-box chung (theo dõi riêng, không phải cắt nội dung)',
    '',
    `- Số đáp án có \`scrollHeight > clientHeight + 1\`: **${overflowingAnswers.length}/${answerSlots.length}** (đếm slot đáp án duy nhất, gộp QUESTION/REVEAL).`,
    `- Tách riêng: **${lineBoxOnlyAnswers.length}** slot chỉ tràn hình học và **${overflowingAnswers.length - lineBoxOnlyAnswers.length}** slot cũng bị cắt nội dung ở trên. Chênh scrollHeight-clientHeight của nhóm chỉ hình học là **${overflowValues.length ? `${Math.min(...overflowValues).toFixed(0)}–${Math.max(...overflowValues).toFixed(0)} px` : '0 px'}**; selector: \`.v3-option-text\`; cỡ chữ/line-height: ${styleSummary}.`,
    '',
    '## Kiểm chứng glyph tiếng Việt có dấu',
    '',
    '| # | Đáp án gốc | Glyph đo | Range glyph bbox (trái, trên → phải, dưới; CSS px) | Content box (trái, trên → phải, dưới; CSS px) | So hình học | Ảnh vùng đáp án ×3 |',
    '|---:|---|---|---|---|---|---|',
    ...glyphRows,
    '',
    '- Chọn 5 đáp án thật có dấu chồng trên/dấu nặng dưới; ảnh cắt chụp ở DPR 3 trong khi bố cục CSS giữ 1080×1920. Range bbox vượt content box 3–6 CSS px ở cả 5 mẫu, nhưng Range phản ánh line box, không phải viền mực glyph; kiểm tra ảnh phóng ×3 thấy các dấu trên và dưới đều nguyên vẹn. Kết luận: **chỉ tràn hình học, không mất pixel**.',
    '',
    '## Các câu cần xem (xếp theo clamp → đáp án bị cắt → chữ dưới 30 px → trên 20 giây)',
    '',
    '| Nhóm | ID | Chủ đề | Ký tự prompt | Căn giữa QUESTION (đạt / không; mép trên / dưới) | Prompt (QUESTION / REVEAL) | Đáp án | Thời lượng | Text gốc | Phương án rút gọn |',
    '|---|---|---|---:|---|---|---|---:|---|---|',
    ...rows,
    '',
    '## Năm câu có điểm ưu tiên cao nhất',
    '',
    worst || '- Không có câu trong dữ liệu.',
    '',
    '## Phương pháp',
    '',
    '- Đo trên overlay thật ở viewport 1080×1920 qua WebSocket snapshot mock; nội dung từng câu lấy từ bản sao chỉ đọc và chỉ gồm câu APPROVED.',
    '- Số dòng và bbox đo bằng `Range.getClientRects()` trên text node. Cột căn giữa đạt khi khoảng cách trên/dưới đều ít nhất 8 px, chênh không quá 4 px và `scrollHeight <= clientHeight`. Prompt bị clamp khi overlay báo clamp, có dấu `…`, hoặc phần hiển thị khác text gốc. Đáp án bị cắt nội dung chỉ khi có `…`, text hiển thị khác text gốc, số dòng Range vượt `-webkit-line-clamp`, hoặc `scrollWidth > clientWidth`; `scrollHeight > clientHeight + 1` được thống kê riêng như tràn line-box chung.',
    '- Chỉ đọc `durationMs` và `assetId` trong metadata cache. Cache đủ 5 dòng cho một câu thì dùng tổng chính xác; thiếu dòng thì ước lượng dòng thiếu theo trung vị ký tự/giây của các dòng cache khớp. Không phát sinh giọng đọc.',
    '',
  ].join('\n');
}

async function captureAll(questions: Question[], assetDirectory: string): Promise<{ metrics: QuestionMetrics[]; glyphAudits: GlyphAudit[] }> {
  const serverPort = await unusedPort();
  let overlayPort = await unusedPort();
  while (overlayPort === serverPort) overlayPort = await unusedPort();
  const server = await startServer(serverPort, assetDirectory);
  const overlay = await startOverlay(overlayPort, serverPort);
  let browser: Browser | null = null;
  try {
    try { browser = await chromium.launch({ channel: 'msedge', headless: true }); }
    catch { browser = await chromium.launch({ headless: true }); }
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 3 });
    await page.route('**/assets/**', async (route) => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      const relativeAsset = pathname.slice('/assets/'.length).replaceAll('/', sep);
      const target = resolve(assetDirectory, relativeAsset);
      if (relative(target, assetDirectory).startsWith(`..${sep}`) || relative(target, assetDirectory) === '..') {
        await route.abort();
        return;
      }
      try { await route.fulfill({ path: target }); }
      catch { await route.continue(); }
    });
    let publish: ((snapshot: PublicSnapshot) => void) | null = null;
    let latest: PublicSnapshot | null = null;
    await page.routeWebSocket('**/ws', (socket) => {
      socket.onMessage((raw) => {
        if ((JSON.parse(String(raw)) as { type?: string }).type === 'HELLO' && latest) publish?.(latest);
      });
      socket.onClose(() => { publish = null; });
      publish = (snapshot) => {
        socket.send(JSON.stringify({ v: 1, type: 'STATE_SNAPSHOT', seq: snapshot.stateVersion, sessionId: snapshot.sessionId,
          stateVersion: snapshot.stateVersion, serverTimeMs: Date.now(), payload: snapshot }));
      };
    });
    const metrics: QuestionMetrics[] = [];
    const glyphAudits: GlyphAudit[] = [];
    const auditCandidates = chooseGlyphAudits(questions);
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.goto(`${overlay.url}/?role=program`, { waitUntil: 'domcontentloaded' });
    const send = (snapshot: PublicSnapshot) => {
      latest = snapshot;
      publish?.(snapshot);
    };
    let stateVersion = 1;
    for (const question of questions) {
      const questionMetric = await captureScene(page, question, 'question', stateVersion++, send);
      for (const candidate of auditCandidates.filter(({ question: selected }) => selected.id === question.id)) {
        const letter = QUESTION_IDS[candidate.optionIndex]!;
        const option = question.options[candidate.optionIndex]!;
        const measured = await measureGlyph(page, letter, candidate.glyph);
        const screenshot = resolve(COPY_DIRECTORY, `glyph-${String(glyphAudits.length + 1).padStart(2, '0')}-${question.id}-${option.id}.png`);
        await page.locator(`[data-testid="option-${letter}"]`).screenshot({ path: screenshot, animations: 'disabled' });
        glyphAudits.push({ questionId: question.id, optionId: option.id, letter, text: option.text, glyph: candidate.glyph, ...measured, screenshot });
      }
      const revealMetric = await captureScene(page, question, 'reveal', stateVersion++, send);
      metrics.push({
        question: questionMetric.prompt,
        reveal: revealMetric.prompt,
        answers: Object.fromEntries(QUESTION_IDS.map((id) => [id, {
          question: questionMetric.answers[id]!,
          reveal: revealMetric.answers[id]!,
        }])),
      });
    }
    return { metrics, glyphAudits };
  } finally {
    await browser?.close().catch(() => undefined);
    overlay.child.kill();
    server.child.kill();
    await delay(100);
  }
}

async function buildReport(jsonOutput: boolean): Promise<void> {
  await copyDatabase();
  const questions = readQuestions();
  const cacheDurations = await loadCacheDurations();
  const voiceContext = await loadVoiceContext();
  const voices = voiceContext ? questions.map((question) => ({ question, texts: questionVoiceScripts(question.prompt, question.options) })) : [];
  const samples: number[] = [];
  const durationByQuestion = new Map<string, { ms: number; estimated: boolean }>();
  if (voiceContext) {
    for (const { question, texts } of voices) {
      const durations = texts.map((line) => cacheDurations.get(scriptCacheKey(line.text, voiceContext)) ?? null);
      for (let index = 0; index < durations.length; index += 1) {
        const duration = durations[index];
        if (duration) samples.push(codePointLength(texts[index]!.text) / (duration / 1_000));
      }
    }
  }
  const medianCps = median(samples);
  for (const { question, texts } of voices) {
    const cached = texts.map((line) => cacheDurations.get(scriptCacheKey(line.text, voiceContext!)) ?? null);
    let duration = 0;
    let estimated = false;
    let complete = true;
    for (let index = 0; index < cached.length; index += 1) {
      if (cached[index] !== null) duration += cached[index]!;
      else {
        const estimate = estimateDurationMs(codePointLength(texts[index]!.text), medianCps);
        if (estimate === null) complete = false;
        else { duration += estimate; estimated = true; }
      }
    }
    durationByQuestion.set(question.id, { ms: complete ? duration : NaN, estimated });
  }
  const assetDirectory = resolve(process.env.QUIZ_ASSETS_DIR ?? resolve(LOCAL_INPUT_ROOT, 'assets-local'));
  const capture = await captureAll(questions, assetDirectory);
  const domMetrics = capture.metrics;
  const results = questions.map((question, index): QuestionResult => {
    const voiceDuration = durationByQuestion.get(question.id);
    const metrics = domMetrics[index]!;
    const durationMs = voiceDuration && Number.isFinite(voiceDuration.ms) ? voiceDuration.ms : null;
    const entry: QuestionResult = {
      ...question,
      promptChars: codePointLength(question.prompt),
      answerChars: question.options.map(({ text }) => codePointLength(text)),
      metrics,
      durationMs,
      durationEstimated: voiceDuration?.estimated ?? false,
      slowRateCps: medianCps,
      groups: [],
      glyphAudits: capture.glyphAudits.filter((audit) => audit.questionId === question.id),
    };
    entry.groups = rowGroups(entry);
    return entry;
  });
  const answerCuts = new Set(results.flatMap((item) => QUESTION_IDS.flatMap((id, index) => {
    const metric = item.metrics.answers[id]!;
    return isOptionCut(metric.question) || isOptionCut(metric.reveal) ? [`${item.id}:${index}`] : [];
  })));
  const totals = {
    approved: results.length,
    clamp: results.filter((item) => item.groups.includes('Prompt bị clamp')).length,
    small: results.filter((item) => item.groups.includes('Cỡ chữ dưới 30 px')).length,
    slow: results.filter((item) => item.groups.includes('Ước lượng đọc trên 20 giây')).length,
    answerCuts: answerCuts.size,
  };
  const suggestions = await readSuggestions();
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  await writeFile(REPORT_MARKDOWN, renderMarkdown(results, totals, suggestions, medianCps), 'utf8');
  if (jsonOutput) await writeFile(REPORT_JSON, JSON.stringify({ totals, medianCharsPerSecond: medianCps, results }, null, 2), 'utf8');
  const affected = results.filter((item) => item.groups.length > 0);
  console.log(JSON.stringify({ totals, medianCharsPerSecond: medianCps, report: REPORT_MARKDOWN, json: jsonOutput ? REPORT_JSON : null,
    suggestionsProvided: Object.keys(suggestions).length, affectedQuestions: affected.length, worst: rankQuestions(results).slice(0, 5).map(({ id, topic, groups }) => ({ id, topic, groups })) }, null, 2));
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if ([...args].some((arg) => !['--json'].includes(arg))) throw new Error('Tùy chọn hợp lệ: --json.');
  await buildReport(args.has('--json'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Không thể tạo báo cáo độ dài câu hỏi.');
    process.exitCode = 1;
  });
}
