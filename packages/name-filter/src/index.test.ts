import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAME_FILTER_RULES,
  filterPlayerName,
  maskName,
  normalizeForMatch,
  type NameFilterConfig,
} from './index';

const emptyConfig: NameFilterConfig = { rules: [], whitelist: [], hiddenPlayerIds: [], version: 1 };
const clean = (name: string) => filterPlayerName(name, null, emptyConfig, DEFAULT_NAME_FILTER_RULES);

describe('name-filter: chuẩn hoá và che tên', () => {
  it('bỏ dấu tiếng Việt, NFKC, zero-width, separator và emoji; đổi leetspeak; gộp chữ lặp', () => {
    expect(normalizeForMatch('Đ.ị​.tttt 😈')).toBe('dit');
    expect(normalizeForMatch('l0ooonnn')).toBe('lon');
    expect(normalizeForMatch('ｄｍ')).toBe('dm');
    expect(normalizeForMatch('d1t')).toBe('dit');
    expect(normalizeForMatch('aa')).toBe('a');
    expect(normalizeForMatch('cc')).toBe('cc');
  });

  it.each(['địt', 'ĐỊT', 'd1t', 'đ.ị.t', 'd\u200b😈m', 'd m', 'l0n', 'lồôônnn', 'cc', 'c.c'])('gắn cờ cách viết né lọc: %s', (name) => {
    expect(clean(name)).toMatchObject({ flagged: true, reasonCategory: 'PROFANITY' });
  });
  it('không biến chữ C sạch thành teencode CC sau bước gộp lặp', () => {
    expect(clean('C')).toMatchObject({ flagged: false });
  });

  it('khớp từ nguyên vẹn; cho phép luật substring rõ ràng và whitelist gỡ bắt nhầm', () => {
    const config: NameFilterConfig = {
      rules: [{ term: 'ell', match: 'word', category: 'CUSTOM' }, { term: 'cunt', match: 'substring', category: 'CUSTOM' }],
      whitelist: [],
      hiddenPlayerIds: [],
      version: 1,
    };
    expect(filterPlayerName('Kelly', null, config, [])).toMatchObject({ flagged: false });
    expect(filterPlayerName('ell', null, config, [])).toMatchObject({ flagged: true, reasonCategory: 'CUSTOM' });
    expect(filterPlayerName('Scunthorpe-like', null, config, [])).toMatchObject({ flagged: true });
    expect(filterPlayerName('Scunthorpe-like', null, { ...config, whitelist: ['Scunthorpe-like'] }, [])).toMatchObject({ flagged: false });
  });

  it('không bắt nhầm các tên Việt sạch phổ biến', () => {
    const names = ['Kelly', 'Hải Đăng', 'Thắng', 'Cường', 'Lộc', 'Dung', 'Bích', 'Phúc', 'Scunthorpe-like'];
    for (const name of names) expect(clean(name), name).toMatchObject({ flagged: false });

    const family = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
    const middle = ['Minh', 'Anh', 'Thị', 'Văn', 'Ngọc'];
    const given = ['An', 'Bình', 'Châu', 'Dung', 'Giang', 'Hạnh', 'Hà', 'Huy', 'Khoa', 'Lan'];
    const generated = family.flatMap((a) => middle.flatMap((b) => given.map((c) => `${a} ${b} ${c}`)));
    const falsePositives = generated.filter((name) => clean(name).flagged);
    expect(generated).toHaveLength(500);
    expect(falsePositives).toEqual([]);
  });

  it('giới hạn mask ở 16 grapheme và thay ký tự đầu emoji bằng N', () => {
    const masked = maskName(`A${'🇻🇳'.repeat(20)}`);
    expect([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(masked)]).toHaveLength(16);
    expect(masked).toBe(`A${'*'.repeat(15)}`);
    expect(maskName('😈Bad')).toBe('N***');
    expect(maskName('')).toBe('N');
  });

  it('giữ chữ Hàn/Thái và tên sạch; hỗ trợ ẩn thủ công theo id nội bộ', () => {
    expect(clean('홍길동')).toMatchObject({ flagged: false, displayName: '홍길동' });
    expect(clean('สมชาย')).toMatchObject({ flagged: false, displayName: 'สมชาย' });
    expect(filterPlayerName('Ngọc', 'MOCK:42', { ...emptyConfig, hiddenPlayerIds: ['MOCK:42'] }, [])).toMatchObject({
      displayName: 'N***', flagged: true, reasonCategory: 'MANUAL',
    });
  });

  it('lọc 10.000 tên trong dưới 200 ms', () => {
    const samples = ['Hải Đăng', 'Thắng', 'Cường', 'Lộc', 'Dung', 'Bích', 'Phúc', 'Kelly'];
    for (let index = 0; index < 2_000; index += 1) clean(`${samples[index % samples.length]} ${index}`);
    const start = performance.now();
    for (let index = 0; index < 10_000; index += 1) clean(`${samples[index % samples.length]} ${index}`);
    const elapsed = performance.now() - start;
    console.info(`name-filter 10k: ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(200);
  });
});
