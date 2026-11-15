import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredMcVoiceRuntime } from './configured-runtime';

const tempDirectories: string[] = [];

async function profileFile(value: unknown) {
  const directory = await mkdtemp(join(tmpdir(), 'mc-voice-profile-'));
  tempDirectories.push(directory);
  const path = join(directory, 'profile.json');
  await writeFile(path, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
  return path;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('configuredMcVoiceRuntime với profile tạm', () => {
  it('tắt runtime khi profile thiếu hoặc sai, không ném chi tiết filesystem', async () => {
    vi.stubEnv('CLIPAI_TOKEN', 'fake-token');
    await expect(configuredMcVoiceRuntime({ cacheDirectory: join(tmpdir(), 'unused-cache'), profileFile: join(tmpdir(), 'missing-profile.json') }))
      .resolves.toBeNull();
    const invalid = await profileFile({ baseUrl: 'http://api.example.test/', provider: 'fake', model: 'm', voiceId: 'v', voiceSettings: {}, allowedCdnHosts: ['cdn.example.test'] });
    await expect(configuredMcVoiceRuntime({ cacheDirectory: join(tmpdir(), 'unused-cache'), profileFile: invalid })).resolves.toBeNull();
  });

  it('đọc profile cục bộ và chỉ lấy token từ env', async () => {
    vi.stubEnv('CLIPAI_TOKEN', 'fake-token');
    const path = await profileFile({
      baseUrl: 'https://api.example.test/', provider: 'fake-provider', model: 'fake-model', voiceId: 'fake-voice',
      voiceSettings: { volume: 1 }, allowedCdnHosts: ['cdn.example.test'],
    });
    const runtime = await configuredMcVoiceRuntime({ cacheDirectory: join(tmpdir(), 'unused-cache'), profileFile: path });
    expect(runtime).not.toBeNull();
    expect(runtime!.profile).toMatchObject({ model: 'fake-model', voiceKey: expect.stringMatching(/^[a-f0-9]{64}$/), rate: 1, voiceSettings: { volume: 1 } });
    expect(await runtime!.credentials.get()).toBe('fake-token');

    const changedProfile = await profileFile({
      baseUrl: 'https://api.example.test/', provider: 'fake-provider', model: 'fake-model', voiceId: 'other-fake-voice',
      voiceSettings: { volume: 1 }, allowedCdnHosts: ['cdn.example.test'],
    });
    const changed = await configuredMcVoiceRuntime({ cacheDirectory: join(tmpdir(), 'unused-cache'), profileFile: changedProfile });
    expect(changed!.profile.voiceKey).not.toBe(runtime!.profile.voiceKey);

    vi.stubEnv('CLIPAI_TOKEN', '');
    await expect(configuredMcVoiceRuntime({ cacheDirectory: join(tmpdir(), 'unused-cache'), profileFile: path })).resolves.toBeNull();
  });
});
