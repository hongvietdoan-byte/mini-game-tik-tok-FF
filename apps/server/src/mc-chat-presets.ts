import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { McChatPresetRequestSchema, McChatPresetSchema, type McChatPreset } from '@quiz/contracts';

const MAX_PRESETS = 50;

/** Danh sách câu mẫu nằm cạnh DB trong data/ (đã được .gitignore loại khỏi Git). */
export class McChatPresetStore {
  constructor(private readonly filePath: string) {}

  list(): McChatPreset[] {
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
      const document = parsed as Record<string, unknown>;
      if (document.version !== 1 || !Array.isArray(document.presets) || document.presets.length > MAX_PRESETS) return [];
      const presets = document.presets.map((item) => McChatPresetSchema.safeParse(item));
      return presets.every((item) => item.success) ? presets.map((item) => item.data) : [];
    } catch {
      return [];
    }
  }

  add(input: unknown): McChatPreset | null {
    const parsed = McChatPresetRequestSchema.safeParse(input);
    if (!parsed.success) return null;
    const presets = this.list();
    if (presets.length >= MAX_PRESETS) return null;
    const preset = { id: randomUUID(), text: parsed.data.text };
    this.save([...presets, preset]);
    return preset;
  }

  remove(id: string): boolean {
    const presets = this.list();
    const next = presets.filter((preset) => preset.id !== id);
    if (next.length === presets.length) return false;
    this.save(next);
    return true;
  }

  private save(presets: McChatPreset[]) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify({ version: 1, presets }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
}
