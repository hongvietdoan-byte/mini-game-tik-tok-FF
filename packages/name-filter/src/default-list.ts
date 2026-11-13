import type { NameFilterRule } from './index';

/** Từ chung, không chứa tên người thật; danh sách này là gợi ý mặc định và có thể nới bằng whitelist. */
export const DEFAULT_NAME_FILTER_RULES: readonly NameFilterRule[] = [
  // Tục tĩu tiếng Việt và teencode.
  { term: 'địt', match: 'word', category: 'PROFANITY' },
  { term: 'đụ', match: 'word', category: 'PROFANITY' },
  { term: 'lồn', match: 'word', category: 'PROFANITY' },
  { term: 'buồi', match: 'word', category: 'PROFANITY' },
  { term: 'cặc', match: 'word', category: 'PROFANITY' },
  { term: 'đĩ', match: 'word', category: 'PROFANITY' },
  { term: 'dm', match: 'word', category: 'PROFANITY' },
  { term: 'đmm', match: 'word', category: 'PROFANITY' },
  { term: 'dcm', match: 'word', category: 'PROFANITY' },
  { term: 'dmm', match: 'word', category: 'PROFANITY' },
  { term: 'vcl', match: 'word', category: 'PROFANITY' },
  { term: 'clgt', match: 'word', category: 'PROFANITY' },
  { term: 'cc', match: 'word', category: 'PROFANITY' },
  { term: 'đéo', match: 'word', category: 'PROFANITY' },
  { term: 'đếch', match: 'word', category: 'PROFANITY' },
  { term: 'đồ chó', match: 'word', category: 'INSULT' },
  { term: 'đồ ngu', match: 'word', category: 'INSULT' },

  // Tục tĩu tiếng Anh; dùng khớp trọn từ để tránh bắt nhầm một phần tên.
  { term: 'fuck', match: 'word', category: 'PROFANITY' },
  { term: 'fucking', match: 'word', category: 'PROFANITY' },
  { term: 'shit', match: 'word', category: 'PROFANITY' },
  { term: 'bitch', match: 'word', category: 'PROFANITY' },
  { term: 'asshole', match: 'word', category: 'PROFANITY' },
  { term: 'bastard', match: 'word', category: 'INSULT' },
  { term: 'nigger', match: 'word', category: 'DISCRIMINATION' },
  { term: 'retard', match: 'word', category: 'DISCRIMINATION' },
  { term: 'racist', match: 'word', category: 'DISCRIMINATION' },

  // Từ ngữ xúc phạm/phân biệt phổ biến.
  { term: 'đồ súc vật', match: 'word', category: 'INSULT' },
  { term: 'đồ khốn', match: 'word', category: 'INSULT' },
  { term: 'đồ mất dạy', match: 'word', category: 'INSULT' },
  { term: 'đồ phân biệt chủng tộc', match: 'word', category: 'DISCRIMINATION' },

  // Từ khoá nhạy cảm chung; không chứa tên chính trị gia hoặc cá nhân.
  { term: 'khủng bố', match: 'word', category: 'POLITICAL' },
  { term: 'terrorist', match: 'word', category: 'POLITICAL' },
  { term: 'terrorism', match: 'word', category: 'POLITICAL' },
  { term: 'terror', match: 'word', category: 'POLITICAL' },
  { term: 'phản động', match: 'word', category: 'POLITICAL' },
  { term: 'bạo loạn', match: 'word', category: 'POLITICAL' },
  { term: 'genocide', match: 'word', category: 'POLITICAL' },
  { term: 'isis', match: 'word', category: 'POLITICAL' },

  // Tên giả danh có vai trò/đơn vị tổ chức.
  { term: 'admin', match: 'word', category: 'IMPERSONATION' },
  { term: 'administrator', match: 'word', category: 'IMPERSONATION' },
  { term: 'garena', match: 'word', category: 'IMPERSONATION' },
  { term: 'moderator', match: 'word', category: 'IMPERSONATION' },
  { term: 'mod', match: 'word', category: 'IMPERSONATION' },
  { term: 'btc', match: 'word', category: 'IMPERSONATION' },
  { term: 'ban to chuc', match: 'word', category: 'IMPERSONATION' },
];
