import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAME_FILTER_RULES,
  DEFAULT_PROTECTED_ENTITIES,
  filterPlayerName,
  maskName,
  normalizeForMatch,
  type NameFilterConfig,
  type NameFilterRule,
} from './index';

const emptyConfig: NameFilterConfig = {
  rules: [], whitelist: [], hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [], version: 1,
};
const clean = (name: string, config = emptyConfig, playerId: string | null = null) =>
  filterPlayerName(name, playerId, config, DEFAULT_NAME_FILTER_RULES, {
    alias: playerId ? 'Người chơi 128' : 'Người chơi 1',
    checkedAt: 123,
    protectedEntities: DEFAULT_PROTECTED_ENTITIES,
  });
const customRule = (overrides: Partial<NameFilterRule> = {}): NameFilterRule => ({
  id: 'custom.test-rule', term: 'badword', aliases: [], match: 'word', group: 'PROFANITY',
  severity: 'HIGH', source: 'CUSTOM', ...overrides,
});

describe('name-filter: risk, representation và alias an toàn', () => {
  it('tạo representation chuẩn hóa có dấu, bỏ dấu, leet, homoglyph, separators và chữ lặp', () => {
    expect(normalizeForMatch('Đ.ị\u200b.tttt 😈')).toBe('dit');
    expect(normalizeForMatch('l0ooonnn')).toBe('lon');
    expect(normalizeForMatch('ｄｍ')).toBe('dm');
    expect(normalizeForMatch('d1t')).toBe('dit');
    expect(normalizeForMatch('аdmin')).toBe('admin');
    expect(normalizeForMatch('aa')).toBe('a');
    expect(normalizeForMatch('cc')).toBe('cc');
  });

  it.each(['địt', 'ĐỊT', 'd1t', 'đ.ị.t', 'd\u200b😈m', 'd m', 'l0n', 'lồôônnn', 'cc', 'c.c'])(
    'gắn HIGH cho biến thể rõ ràng: %s',
    (name) => expect(clean(name)).toMatchObject({ risk: 'HIGH', displayAction: 'ANONYMIZE', safeDisplayName: 'Người chơi 1' }),
  );
  it('không biến chữ C sạch thành CC sau bước gộp lặp', () => expect(clean('C').risk).toBe('NONE'));

  it('giữ tên sạch có substring tương tự và tên Việt phổ biến', () => {
    for (const name of ['Classic', 'Dickens', 'Kelly', 'Hải Đăng', 'Thắng', 'Cường', 'Lộc', 'Dung', 'Bích', 'Phúc', 'Scunthorpe'])
      expect(clean(name), name).toMatchObject({ risk: 'NONE', safeDisplayName: name });
  });

  it('protected entity độc lập chỉ REVIEW, kết hợp giả mạo thành HIGH', () => {
    expect(clean('Garena')).toMatchObject({
      risk: 'REVIEW', displayAction: 'ANONYMIZE', safeDisplayName: 'Người chơi 1', matchedRuleIds: ['entity.garena'],
    });
    expect(clean('Free Fire MAX')).toMatchObject({ risk: 'REVIEW', safeDisplayName: 'Người chơi 1' });
    expect(clean('Garena Official')).toMatchObject({ risk: 'HIGH', safeDisplayName: 'Người chơi 1' });
    expect(clean('BTC trao thưởng')).toMatchObject({ risk: 'HIGH', safeDisplayName: 'Người chơi 1' });
  });

  it('chỉ tài khoản đúng source + stableUserId mới bỏ REVIEW; high khác vẫn thắng', () => {
    const config = { ...emptyConfig, verifiedOfficialAccounts: [{ source: 'TIKTOK', stableUserId: 'account-1', entityId: 'entity.garena' }] };
    expect(clean('Garena', config, 'TIKTOK:account-1').risk).toBe('NONE');
    expect(clean('Garena địt', config, 'TIKTOK:account-1').risk).toBe('HIGH');
    expect(clean('Garena', config, 'MOCK:account-1').risk).toBe('REVIEW');
  });

  it('whitelist chỉ gỡ rule được chỉ định, không gỡ một HIGH độc lập', () => {
    const custom = customRule({ term: 'badword' });
    const config = {
      ...emptyConfig,
      rules: [custom],
      whitelist: [{ value: 'badword fuck', ruleIds: [custom.id] }],
    };
    expect(clean('badword fuck', config).risk).toBe('HIGH');
    expect(clean('badword', config).risk).toBe('HIGH');
    const onlyCustom = { ...config, rules: [custom], whitelist: [{ value: 'badword', ruleIds: [custom.id] }] };
    expect(clean('badword', onlyCustom).risk).toBe('NONE');
  });

  it('PARTIAL che đúng span rồi kiểm tra lại output', () => {
    const rule = customRule({ term: 'badword', severity: 'PARTIAL' });
    const config = { ...emptyConfig, rules: [rule] };
    expect(clean('Tên badword đẹp', config)).toMatchObject({
      risk: 'PARTIAL', displayAction: 'PARTIAL_MASK', safeDisplayName: 'Tên ******* đẹp',
      matchedRuleIds: [rule.id], matchedRuleGroups: ['PROFANITY'],
    });
  });

  it('manual hide ưu tiên cao nhất; review allow chỉ áp dụng player đã duyệt', () => {
    const config = { ...emptyConfig, hiddenPlayerIds: ['TIKTOK:1'], allowedReviewPlayerIds: ['TIKTOK:2'] };
    expect(clean('địt', config, 'TIKTOK:1')).toMatchObject({ risk: 'MANUAL_HIDE', safeDisplayName: 'Người chơi 128' });
    expect(clean('Garena', config, 'TIKTOK:2').risk).toBe('NONE');
    expect(clean('Garena Official', config, 'TIKTOK:2').risk).toBe('HIGH');
  });

  it('giới hạn tên sạch/partial ở 16 grapheme và không cắt giữa grapheme', () => {
    const long = 'A' + '🇻🇳'.repeat(20);
    const display = clean(long).safeDisplayName;
    expect([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(display)]).toHaveLength(16);
    expect(maskName('😈Bad')).toBe('N***');
    expect(maskName('')).toBe('N');
  });

  it('trả nhóm rule, policyVersion và thời điểm kiểm tra thực', () => {
    expect(clean('địt')).toMatchObject({
      matchedRuleGroups: ['PROFANITY'], policyVersion: 1, checkedAt: 123, requiresReview: true,
    });
  });

  it('không gắn nhãn nhầm cho 500 tên Việt tổng hợp đã rà theo từ điển', () => {
    const family = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
    const middle = ['Minh', 'Anh', 'Thị', 'Văn', 'Ngọc', 'Hải', 'Thu', 'Quốc', 'Thanh', 'Bảo'];
    const given = ['An', 'Bình', 'Châu', 'Dung', 'Giang'];
    const names = family.flatMap((a) => middle.flatMap((b) => given.map((c) => [a, b, c].join(' '))));
    const falsePositives = names.filter((name) => clean(name).risk !== 'NONE');
    expect(names).toHaveLength(500);
    expect(falsePositives).toEqual([]);
  });
});
