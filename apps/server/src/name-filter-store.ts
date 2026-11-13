import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  filterPlayerName,
  DEFAULT_NAME_FILTER_RULES,
  type NameFilterConfig,
  type NameFilterUpdate,
  type FilteredPlayerName,
} from '@quiz/name-filter';

const NAME_FILTER_CATEGORIES = ['PROFANITY', 'INSULT', 'DISCRIMINATION', 'POLITICAL', 'IMPERSONATION', 'CUSTOM'] as const;
export const NameFilterRuleSchema = z.object({
  term: z.string().trim().min(1).max(64).refine((value) => !/[<>]/u.test(value), 'Không được chứa HTML.'),
  match: z.enum(['word', 'substring']),
  category: z.enum(NAME_FILTER_CATEGORIES),
}).strict();
export const NameFilterUpdateSchema = z.object({
  rules: z.array(NameFilterRuleSchema).max(200),
  whitelist: z.array(z.string().trim().min(1).max(80).refine((value) => !/[<>]/u.test(value), 'Không được chứa HTML.')).max(500),
  hiddenPlayerIds: z.array(z.string().trim().min(1).max(200)).max(500),
}).strict();
export const NameFilterConfigSchema = NameFilterUpdateSchema.extend({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
export const NameFilterVisibilitySchema = z.object({
  playerId: z.string().trim().min(1).max(200),
  hidden: z.boolean(),
}).strict();
export type NameFilterVisibility = z.infer<typeof NameFilterVisibilitySchema>;

export const DEFAULT_NAME_FILTER_CONFIG: NameFilterConfig = {
  rules: [],
  whitelist: [],
  hiddenPlayerIds: [],
  version: 0,
};

function cloneDefault(): NameFilterConfig {
  return { ...DEFAULT_NAME_FILTER_CONFIG, rules: [], whitelist: [], hiddenPlayerIds: [] };
}

function atomicWrite(path: string, data: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.name-filter.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temp, data, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

export class NameFilterStore {
  readonly path: string;
  private current: NameFilterConfig;

  constructor(dataDir: string) {
    this.path = join(dataDir, 'name-filter.json');
    this.current = this.load();
  }

  private load(): NameFilterConfig {
    try {
      const parsed = NameFilterConfigSchema.safeParse(JSON.parse(readFileSync(this.path, 'utf8')) as unknown);
      return parsed.success ? parsed.data : cloneDefault();
    } catch {
      return cloneDefault();
    }
  }

  get(): NameFilterConfig {
    return { ...this.current, rules: [...this.current.rules], whitelist: [...this.current.whitelist], hiddenPlayerIds: [...this.current.hiddenPlayerIds] };
  }

  evaluate(name: string, playerId: string | null): FilteredPlayerName {
    return filterPlayerName(name, playerId, this.current, DEFAULT_NAME_FILTER_RULES);
  }

  update(value: unknown): NameFilterConfig {
    const parsed = NameFilterUpdateSchema.parse(value) as NameFilterUpdate;
    const config = NameFilterConfigSchema.parse({ ...parsed, version: this.current.version + 1 });
    this.persist(config);
    return this.get();
  }

  setPlayerHidden(playerId: string, hidden: boolean): NameFilterConfig {
    const hiddenPlayerIds = new Set(this.current.hiddenPlayerIds);
    if (hidden) hiddenPlayerIds.add(playerId);
    else hiddenPlayerIds.delete(playerId);
    return this.update({ rules: this.current.rules, whitelist: this.current.whitelist, hiddenPlayerIds: [...hiddenPlayerIds] });
  }

  private persist(config: NameFilterConfig) {
    const validated = NameFilterConfigSchema.parse(config);
    atomicWrite(this.path, `${JSON.stringify(validated, null, 2)}\n`);
    this.current = validated;
  }
}
