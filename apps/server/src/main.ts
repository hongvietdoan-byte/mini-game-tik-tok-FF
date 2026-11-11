import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RealScheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, loadOrCreateAdminToken } from './app';

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
} catch (err) {
  console.warn(`[quiz] chưa nạp được fixtures DEMO: ${(err as Error).message}`);
}

const quiz = await buildApp({ store, scheduler, adminToken, logger: process.env.QUIZ_LOG === '1' });
const recovered = await quiz.recover();
if (recovered)
  console.log(`[quiz] khôi phục phiên ${recovered.id} → ${recovered.engine.state} (chờ operator chọn Tiếp tục / Huỷ câu / Dừng)`);

await quiz.app.listen({ host: HOST, port: PORT });
console.log(`[quiz] server http://${HOST}:${PORT}  — mã quản trị lưu tại ${tokenPath}`);

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
