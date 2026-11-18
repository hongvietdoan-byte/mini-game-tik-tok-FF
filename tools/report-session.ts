import { resolve, join } from 'node:path';
import { buildSessionAnalytics, formatSessionAnalytics, openSessionAnalyticsDb } from '@quiz/persistence';

const selection = process.argv[2];
if (!selection || process.argv.length > 3) {
  console.error('Cách dùng: pnpm report:session <roundId|latest>');
  process.exit(2);
}
const dbPath = resolve(process.env.QUIZ_DB ?? join(process.cwd(), 'data', 'quiz.db'));
let db: ReturnType<typeof openSessionAnalyticsDb>;
try {
  db = openSessionAnalyticsDb(dbPath);
} catch {
  console.error(`Không mở được DB chỉ đọc tại ${dbPath}. Đặt QUIZ_DB để chọn DB khác.`);
  process.exit(1);
}
try {
  console.log(formatSessionAnalytics(buildSessionAnalytics(db, selection)));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.close();
}
