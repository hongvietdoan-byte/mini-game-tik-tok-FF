import { join, resolve } from 'node:path';
import { formatPrunePlan, pruneDatabaseFile } from '@quiz/persistence';

async function main() {
  const args = process.argv.slice(2);
  const daysIndex = args.indexOf('--older-than');
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : NaN;
  const apply = args.includes('--apply');
  if (daysIndex < 0 || args.length !== (apply ? 3 : 2) || (apply && args[2] !== '--apply')) {
    console.error('Cách dùng: pnpm data:prune --older-than <ngày> [--apply]');
    process.exit(2);
  }
  if (!Number.isInteger(days) || days < 1) {
    console.error('--older-than phải là số nguyên ngày dương.');
    process.exit(2);
  }
  const dbPath = resolve(process.env.QUIZ_DB ?? join(process.cwd(), 'data', 'quiz.db'));
  try {
    const result = await pruneDatabaseFile(dbPath, days, apply);
    console.log(formatPrunePlan(result));
  } catch (error) {
    console.error(`Không dọn DB: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

await main();
