import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { McVoiceCredentialStore } from './types';

export interface McVoiceSafeStorage {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

/** Kho ciphertext dùng Electron safeStorage (Windows DPAPI); không ghi token plaintext ra app data. */
export class SafeStorageMcVoiceCredentialStore implements McVoiceCredentialStore {
  constructor(private readonly path: string, private readonly safeStorage: McVoiceSafeStorage) {}

  async get(): Promise<string | null> {
    let info;
    try {
      info = await lstat(this.path);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
      throw new Error('Không đọc được kho thông tin xác thực MC Voice.');
    }
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Kho thông tin xác thực MC Voice không hợp lệ.');
    if (!this.safeStorage.isEncryptionAvailable()) throw new Error('Mã hoá hệ điều hành chưa sẵn sàng.');
    try {
      const value = this.safeStorage.decryptString(await readFile(this.path));
      return value || null;
    } catch {
      throw new Error('Không giải mã được thông tin xác thực MC Voice.');
    }
  }

  async set(value: string): Promise<void> {
    if (!value.trim() || value.length > 4_096) throw new Error('Thông tin xác thực MC Voice không hợp lệ.');
    if (!this.safeStorage.isEncryptionAvailable()) throw new Error('Mã hoá hệ điều hành chưa sẵn sàng.');

    let encrypted: Buffer;
    try {
      encrypted = this.safeStorage.encryptString(value);
    } catch {
      throw new Error('Không mã hoá được thông tin xác thực MC Voice.');
    }
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, encrypted, { flag: 'wx', mode: 0o600 });
      await rename(temporary, this.path);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async clear(): Promise<void> {
    await rm(this.path, { force: true });
  }
}
