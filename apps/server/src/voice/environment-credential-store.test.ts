import { afterEach, describe, expect, it } from 'vitest';
import { EnvironmentMcVoiceCredentialStore } from './types';

const original = process.env.CLIPAI_TOKEN;
afterEach(() => {
  if (original === undefined) delete process.env.CLIPAI_TOKEN;
  else process.env.CLIPAI_TOKEN = original;
});

describe('EnvironmentMcVoiceCredentialStore', () => {
  it('đọc env lúc khởi tạo và giữ set/clear trong bộ nhớ, không sửa env', async () => {
    process.env.CLIPAI_TOKEN = '  env-test-token  ';
    const credentials = new EnvironmentMcVoiceCredentialStore();
    expect(await credentials.get()).toBe('env-test-token');

    await credentials.set(' dashboard-memory-token ');
    expect(await credentials.get()).toBe('dashboard-memory-token');
    expect(process.env.CLIPAI_TOKEN).toBe('  env-test-token  ');

    await credentials.clear();
    expect(await credentials.get()).toBeNull();
    expect(process.env.CLIPAI_TOKEN).toBe('  env-test-token  ');
  });

  it('không khởi tạo token khi biến môi trường trống', async () => {
    delete process.env.CLIPAI_TOKEN;
    const credentials = new EnvironmentMcVoiceCredentialStore();
    expect(await credentials.get()).toBeNull();
  });
});
