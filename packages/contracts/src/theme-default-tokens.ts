/** Token có sẵn ở giao diện mặc định; values được giữ đồng bộ với apps/overlay/src/style.css. */
export const THEME_DEFAULT_TOKENS = {
  deep: '#2D387F',
  violet: '#7049F5',
  gold: '#FFCC58',
  sky: '#8CC8FB',
  pink: '#D24470',
  coral: '#E47E5F',
  ink: '#121632',
  neon: '#B18CFF',
  paper: '#f7f7ff',
  'font-body': '"Segoe UI", "Be Vietnam Pro", Roboto, Arial, sans-serif',
} as const satisfies Record<string, string>;

export type ThemeDefaultToken = keyof typeof THEME_DEFAULT_TOKENS;
