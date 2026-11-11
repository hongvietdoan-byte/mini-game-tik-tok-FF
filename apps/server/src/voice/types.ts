export type McVoiceAudioFormat = 'mp3';

export type McVoiceSynthesisRequest = {
  text: string;
  /** Giá trị runtime; chỉ dùng nội bộ để định tuyến/cache, không đưa vào snapshot hoặc log. */
  voiceKey: string;
  rate: number;
  format: McVoiceAudioFormat;
};

export type McVoiceAudio = {
  bytes: Uint8Array;
  durationMs: number;
  format: McVoiceAudioFormat;
};

export type McVoiceFailureCode =
  | 'AUTH'
  | 'NO_CREDIT'
  | 'RATE_LIMITED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'DOWNLOAD_FAILED'
  | 'INVALID_RESPONSE'
  | 'TOO_LONG';

export class McVoiceProviderError extends Error {
  constructor(
    readonly code: McVoiceFailureCode,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'McVoiceProviderError';
  }
}

export interface McVoiceProvider {
  synthesize(input: McVoiceSynthesisRequest, token: string, signal?: AbortSignal): Promise<McVoiceAudio>;
}

export type McVoiceCacheDescriptor = {
  text: string;
  provider: 'clipai';
  model: string;
  /** Runtime-only; tham gia cache key nhưng không xuất hiện trong API công khai. */
  voiceKey: string;
  voiceSettings: Readonly<Record<string, string | number | boolean>>;
  rate: number;
  format: McVoiceAudioFormat;
};

/** Cấu hình runtime được cấp ngoài repo (ví dụ từ app settings/env); không trả cho dashboard/overlay. */
export type McVoiceProfile = {
  model: string;
  voiceKey: string;
  rate: number;
  voiceSettings: Readonly<Record<string, string | number | boolean>>;
};

export type CachedMcVoiceAudio = {
  assetId: string;
  durationMs: number;
  format: McVoiceAudioFormat;
  checksum: string;
  sizeBytes: number;
  bytes: Uint8Array;
};

export interface McVoiceCredentialStore {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
}

/** Fallback cho tiến trình không chạy trong Electron: env lúc khởi động, sau đó chỉ giữ trong RAM. */
export class EnvironmentMcVoiceCredentialStore implements McVoiceCredentialStore {
  private value = process.env.CLIPAI_TOKEN?.trim() || null;

  async get() {
    return this.value;
  }

  async set(value: string) {
    const token = value.trim();
    if (!token || token.length > 4_096) throw new Error('Thông tin xác thực MC Voice không hợp lệ.');
    this.value = token;
  }

  async clear() {
    this.value = null;
  }
}
