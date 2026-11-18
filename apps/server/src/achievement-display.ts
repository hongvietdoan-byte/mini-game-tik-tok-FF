import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AchievementDisplaySettingsSchema, type AchievementDisplaySettings } from '@quiz/contracts';

const DEFAULT_SETTINGS: AchievementDisplaySettings = { enabled: true };

/** Local runtime setting. It only controls public presentation; evaluation/persistence is untouched. */
export class AchievementDisplayStore {
  readonly path: string;
  private settings: AchievementDisplaySettings;

  constructor(dataDir: string) {
    this.path = join(dataDir, 'achievement-display.json');
    this.settings = this.read();
  }

  get(): AchievementDisplaySettings {
    return { ...this.settings };
  }

  private read(): AchievementDisplaySettings {
    if (!existsSync(this.path)) return { ...DEFAULT_SETTINGS };
    try {
      return AchievementDisplaySettingsSchema.parse(JSON.parse(readFileSync(this.path, 'utf8')));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  save(settings: AchievementDisplaySettings): AchievementDisplaySettings {
    const parsed = AchievementDisplaySettingsSchema.parse(settings);
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.path);
    this.settings = parsed;
    return { ...parsed };
  }
}
