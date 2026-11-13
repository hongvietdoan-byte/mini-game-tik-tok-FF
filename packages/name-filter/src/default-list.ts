import type { NameFilterRule, ProtectedEntity } from './index';

const high = (id: string, term: string, group: NameFilterRule['group'], aliases: string[] = [], separatorInsensitive = false): NameFilterRule => ({
  id, term, aliases, group, severity: 'HIGH', match: 'word', source: 'SYSTEM', separatorInsensitive,
});
const partial = (
  id: string,
  term: string,
  group: NameFilterRule['group'],
  aliases: string[] = [],
  separatorInsensitive = false,
): NameFilterRule => ({
  id, term, aliases, group, severity: 'PARTIAL', match: 'word', source: 'SYSTEM', separatorInsensitive,
});

/** Danh sách gợi ý chung, không chứa tên cá nhân/KOL. Không khẳng định phát hiện đủ mọi biến thể. */
export const DEFAULT_NAME_FILTER_RULES: readonly NameFilterRule[] = [
  high('profanity.vi.dit', 'địt', 'PROFANITY', ['dit', 'djt']),
  high('profanity.vi.du', 'đụ', 'PROFANITY', ['du']),
  high('profanity.vi.lon', 'lồn', 'PROFANITY', ['lon']),
  high('profanity.vi.buoi', 'buồi', 'PROFANITY', ['buoi']),
  high('profanity.vi.cac', 'cặc', 'PROFANITY', ['cac']),
  high('profanity.vi.di', 'đĩ', 'PROFANITY', ['di']),
  high('profanity.vi.dm', 'dm', 'PROFANITY', ['đm', 'd m'], true),
  high('profanity.vi.dmm', 'dmm', 'PROFANITY', ['đmm', 'd m m'], true),
  high('profanity.vi.dcm', 'dcm', 'PROFANITY', ['đcm', 'd c m'], true),
  high('profanity.vi.vcl', 'vcl', 'PROFANITY', ['v c l'], true),
  high('profanity.vi.clgt', 'clgt', 'PROFANITY', ['c l g t'], true),
  high('profanity.vi.cc', 'cc', 'PROFANITY', ['c c'], true),
  high('profanity.vi.deo', 'đéo', 'PROFANITY', ['deo']),
  partial('insult.vi.do-ngu', 'đồ ngu', 'PROFANITY', ['do ngu']),
  partial('insult.vi.do-cho', 'đồ chó', 'PROFANITY', ['do cho']),
  high('profanity.en.fuck', 'fuck', 'PROFANITY'),
  high('profanity.en.shit', 'shit', 'PROFANITY'),
  high('profanity.en.bitch', 'bitch', 'PROFANITY'),
  high('profanity.en.asshole', 'asshole', 'PROFANITY'),
  partial('profanity.en.damn', 'damn', 'PROFANITY'),
  high('sexual.en.porn', 'porn', 'NSFW_SEXUAL'),
  high('sexual.en.sexting', 'sexting', 'NSFW_SEXUAL'),
  high('sexual.vi.khoa-than', 'khoe thân', 'NSFW_SEXUAL'),
  high('hate.en.slur-n', 'nigger', 'HATE_SPEECH'),
  high('hate.en.slur-r', 'retard', 'HATE_SPEECH'),
  high('hate.vi.phan-biet', 'phân biệt chủng tộc', 'HATE_SPEECH', ['phan biet chung toc']),
  high('harmful.vi.de-doa', 'giết người', 'ILLEGAL_HARMFUL', ['giet nguoi']),
  high('harmful.en.kill', 'kill you', 'ILLEGAL_HARMFUL'),
  partial('impersonation.official-cue', 'official', 'IMPERSONATION', ['chính thức', 'chinh thuc']),
  partial('impersonation.fake-cue', 'fake', 'IMPERSONATION', ['giả mạo', 'gia mao']),
  partial('impersonation.reward-cue', 'trao thưởng', 'IMPERSONATION', ['trao thuong', 'giveaway', 'free diamonds']),
];

/** Protected names only create REVIEW by themselves; never an automatic block list. */
export const DEFAULT_PROTECTED_ENTITIES: readonly ProtectedEntity[] = [
  { id: 'entity.garena', label: 'Garena', aliases: [], kind: 'BRAND', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.free-fire', label: 'Free Fire', aliases: ['FreeFire'], kind: 'BRAND', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.free-fire-max', label: 'Free Fire MAX', aliases: ['FreeFireMAX'], kind: 'BRAND', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.btc', label: 'BTC', aliases: ['ban tổ chức', 'ban to chuc'], kind: 'ORGANIZATION', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.admin', label: 'admin', aliases: ['administrator'], kind: 'ROLE', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.moderator', label: 'moderator', aliases: ['mod'], kind: 'ROLE', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
  { id: 'entity.support', label: 'support', aliases: ['hỗ trợ', 'ho tro'], kind: 'ROLE', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' },
];
