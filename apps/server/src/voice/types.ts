import type { McVoiceCueEventType } from '@quiz/contracts';

export type McVoiceAudioFormat = 'mp3';

export type McVoiceSettingsValue = string | number | boolean;
export type McVoiceSettings = Readonly<Record<string, McVoiceSettingsValue>>;

export type McVoiceSynthesisRequest = {
  text: string;
  /** Giá trị runtime; chỉ dùng nội bộ để định tuyến/cache, không đưa vào snapshot hoặc log. */
  voiceKey: string;
  /** Settings hiệu lực đã chọn theo loại sự kiện; luôn là đúng bộ settings dùng cho cache. */
  voiceSettings: McVoiceSettings;
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
  synthesize(input: McVoiceSynthesisRequest, token: string, signal?: AbortSignal, maxDurationMs?: number): Promise<McVoiceAudio>;
}

export type McVoiceCacheDescriptor = {
  text: string;
  voicePolicyVersion: number;
  /** Dấu vân tay đã băm của cấu hình voice; cache không lưu ID/profile dạng thô. */
  voiceKey: string;
  provider: 'clipai';
  model: string;
  voiceSettings: McVoiceSettings;
  rate: number;
  format: McVoiceAudioFormat;
};

/** Cấu hình runtime được cấp ngoài repo (ví dụ từ app settings/env); không trả cho dashboard/overlay. */
export type McVoiceProfile = {
  model: string;
  voiceKey: string;
  rate: number;
  /** Bộ mặc định; profile cũ chỉ khai báo trường này vẫn tương thích. */
  voiceSettings: McVoiceSettings;
  /** Chỉ override các key được nêu; các key khác kế thừa từ voiceSettings. */
  voiceSettingsByEvent?: Partial<Record<McVoiceCueEventType, McVoiceSettings>>;
};

export function mcVoiceSettingsForEvent(profile: McVoiceProfile, eventType: McVoiceCueEventType): McVoiceSettings {
  return { ...profile.voiceSettings, ...profile.voiceSettingsByEvent?.[eventType] };
}

export type CachedMcVoiceAudio = {
  assetId: string;
  voicePolicyVersion: number;
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
