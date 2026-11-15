import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { questionLengthWarnings } from '@quiz/contracts';
import { RealScheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, loadOrCreateAdminToken } from './app';
import { configuredMcVoiceRuntime } from './voice/configured-runtime';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const DATA = process.env.QUIZ_DATA_DIR ?? join(ROOT, 'data');
const HOST = process.env.QUIZ_HOST ?? '127.0.0.1';
const PORT = Number(process.env.QUIZ_PORT ?? 8787);

if (HOST !== '127.0.0.1' && HOST !== 'localhost' && process.env.QUIZ_ALLOW_REMOTE !== '1') {
  console.error(`Từ chối bind ${HOST}: server chỉ chạy localhost (đặt QUIZ_ALLOW_REMOTE=1 nếu thật sự cần).`);
  process.exit(1);
}

const scheduler = new RealScheduler();
const store = new Store(process.env.QUIZ_DB ?? join(DATA, 'quiz.db'));
const mcVoice = await configuredMcVoiceRuntime({ cacheDirectory: join(dirname(store.path), 'mc-voice-cache') });
if (!mcVoice && process.env.CLIPAI_TOKEN?.trim())
  console.warn('[quiz] MC Voice chưa sẵn sàng; cần cấu hình runtime cục bộ đã duyệt. Không có chi tiết provider nào được ghi log.');
const tokenPath = join(DATA, 'admin-token.txt');
const adminToken = loadOrCreateAdminToken(tokenPath);

// Nạp bộ câu hỏi DEMO (hư cấu) nếu có fixtures — không ghi đè câu đã tồn tại.
try {
  const fixturesPath = join(ROOT, 'fixtures', 'index.ts');
  const fx = (await import(pathToFileURL(fixturesPath).href)) as {
    DEMO_PACK: { id: string; name: string };
    DEMO_QUESTIONS: unknown[];
  };
  const added = store.seedQuestions(fx.DEMO_PACK, fx.DEMO_QUESTIONS, scheduler.now());
  console.log(`[quiz] câu hỏi DEMO: thêm ${added} câu (gói ${fx.DEMO_PACK.id})`);
  const approvedTooLong = store.listQuestions(fx.DEMO_PACK.id)
    .filter((question) => question.approvalStatus === 'APPROVED' && questionLengthWarnings(question).length > 0);
  if (approvedTooLong.length > 0) {
    console.warn(
      `[quiz] import TOO_LONG: ${approvedTooLong.length} câu APPROVED vượt ngưỡng khuyến nghị (id: ${approvedTooLong.map((question) => question.id).join(', ')}).`,
    );
  }
} catch (err) {
  console.warn(`[quiz] chưa nạp được fixtures DEMO: ${(err as Error).message}`);
}

const webRoots = {
  dashboard: process.env.QUIZ_DASHBOARD_DIR ?? join(ROOT, 'apps', 'dashboard', 'dist'),
  overlay: process.env.QUIZ_OVERLAY_DIR ?? join(ROOT, 'apps', 'overlay', 'dist'),
  // asset cục bộ chưa xác nhận quyền phân phối (MC Kelly, chibi tách nền) — ngoài git
  assets: process.env.QUIZ_ASSETS_DIR ?? join(ROOT, 'assets-local'),
};
// Kho chibi đã tách nền (tools/prep_chibi_bank.py) → mỗi người chơi được gán 1 nhân vật trong kho
let characterPool: string[] | undefined;
try {
  const manifest = JSON.parse(readFileSync(join(webRoots.assets, 'chibi', 'manifest.json'), 'utf8')) as { characters: { id: string }[] };
  characterPool = manifest.characters.map((c) => c.id);
  console.log(`[quiz] kho nhân vật: ${characterPool.length} chibi`);
} catch {
  console.log('[quiz] chưa có kho chibi (assets-local/chibi/manifest.json) — dùng hình giữ chỗ');
}
const quiz = await buildApp({ store, scheduler, adminToken, repositoryRoot: ROOT, webRoots, characterPool, mcVoice: mcVoice ?? undefined, logger: process.env.QUIZ_LOG === '1' });
const recovered = await quiz.recover();
if (recovered)
  console.log(`[quiz] khôi phục phiên ${recovered.id} → ${recovered.engine.state} (chờ operator chọn Tiếp tục / Huỷ câu / Dừng)`);

await quiz.app.listen({ host: HOST, port: PORT });
console.log(`[quiz] server http://${HOST}:${PORT}  — mã quản trị lưu tại ${tokenPath}`);
const health = (await quiz.app.inject({ method: 'GET', url: '/health' })).json() as { web: { dashboard: boolean; overlay: boolean } };
if (health.web.dashboard) console.log(`[quiz] Dashboard: http://${HOST}:${PORT}/dashboard/`);
if (health.web.overlay) console.log(`[quiz] Overlay (OBS Browser Source 1080x1920): http://${HOST}:${PORT}/overlay/`);
if (!health.web.dashboard || !health.web.overlay) console.log('[quiz] chưa có bản build web — chạy: corepack pnpm build:web');

let closing = false;
for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, () => {
    if (closing) return;
    closing = true;
    void quiz.close().finally(() => {
      store.close();
      process.exit(0);
    });
  });
