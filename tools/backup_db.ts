import { resolve } from 'node:path';
import { Store } from '@quiz/persistence';

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  console.error('Cách dùng nội bộ: backup_db.ts <db-nguồn> <db-đích>');
  process.exit(2);
}

const source = resolve(sourceArg);
const destination = resolve(destinationArg);
if (source === destination) {
  console.error('Từ chối backup DB vào chính file nguồn.');
  process.exit(2);
}

const store = new Store(source);
try {
  await store.backup(destination);
} finally {
  store.close();
}
