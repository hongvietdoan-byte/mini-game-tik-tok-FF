import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafeStorageMcVoiceCredentialStore, type McVoiceSafeStorage } from './safe-storage';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

async function makeStore() {
  const directory = await mkdtemp(join(tmpdir(), 'mc-voice-safe-storage-'));
  directories.push(directory);
  const secure: McVoiceSafeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`ciphertext:${Buffer.from(value).toString('base64')}`),
    decryptString: (value) => Buffer.from(value.toString().slice('ciphertext:'.length), 'base64').toString(),
  };
  const path = join(directory, 'mc-voice-token.dat');
  return { store: new SafeStorageMcVoiceCredentialStore(path, secure), path, secure };
}

describe('SafeStorageMcVoiceCredentialStore', () => {
  it('chỉ ghi ciphertext, khôi phục token qua safeStorage và xoá theo yêu cầu', async () => {
    const { store: credentials, path } = await makeStore();
    const token = 'test-only-credential-9876';
    await credentials.set(token);
    const bytes = await readFile(path);
    expect(bytes.toString()).not.toContain(token);
    expect(await credentials.get()).toBe(token);
    await credentials.clear();
    await expect(credentials.get()).resolves.toBeNull();
  });

  it('từ chối ghi khi mã hoá hệ điều hành chưa sẵn sàng', async () => {
    const { store: base, path } = await makeStore();
    const unavailable = new SafeStorageMcVoiceCredentialStore(path, {
      isEncryptionAvailable: () => false,
      encryptString: vi.fn(),
      decryptString: vi.fn(),
    });
    await expect(unavailable.set('test-only-token')).rejects.toThrow('Mã hoá hệ điều hành chưa sẵn sàng');
    await expect(base.get()).resolves.toBeNull();
  });
});
