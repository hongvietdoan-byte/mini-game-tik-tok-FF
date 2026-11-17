import { describe, expect, it } from 'vitest';
import { containsPlayerIdentity } from './safety';

describe('MC Voice identity deny-list', () => {
  it('chặn tên/id trong mọi câu thoại sau chuẩn hoá Unicode và không sửa nội dung hiển thị', () => {
    const identities = ['Player-Test-001', 'Khán giả Demo'];
    expect(containsPlayerIdentity('Chúc mừng Player-Test-001 nhé!', identities)).toBe(true);
    expect(containsPlayerIdentity('Bảng xếp hạng đã cập nhật.', identities)).toBe(false);
    expect(containsPlayerIdentity('Khán   giả Demo đang dẫn đầu.', identities)).toBe(true);
    expect(containsPlayerIdentity('Khán giả Demo đang dẫn đầu.', ['Khán giả Demo'])).toBe(true);
  });

  it('không chặn nhầm vì tên quá ngắn hoặc chỉ là một phần của từ khác', () => {
    const identities = ['N', 'ừ', 'nk.', 'Đăng', 'hany'];
    for (const line of ['Còn 10 giây!', 'Năm', 'Bốn', 'Hết giờ!', 'Bảng xếp hạng đã cập nhật.', 'Đáp án đúng là B: Ngốc Nghếch.'])
      expect(containsPlayerIdentity(line, identities)).toBe(false);
    expect(containsPlayerIdentity('Đăng ký ngay nhé', identities)).toBe(true);
    expect(containsPlayerIdentity('Khuyến mãi hằng ngày', ['hằng'])).toBe(true);
    expect(containsPlayerIdentity('Phần thưởng hấp dẫn', ['thưở'])).toBe(false);
  });
});
