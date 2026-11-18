---
id: C-0307
from: coordinator
to: codex2
type: task
title: C-0307: làm lại BXH V5 theo 10 quy tắc thiết kế (rõ, gọn, chữ có khoảng thở)
ref: Y-0519
priority: normal
needs: 
created: 2026-11-19T02:34:55+07:00
---
Người dùng chưa chọn A hay B. Yêu cầu của họ: **bảng xếp hạng nào cũng phải rõ ràng, ngắn gọn, có khoảng trống để chữ "thở", và theo quy tắc thiết kế.** Làm lại ảnh mẫu V5 (C-0299) theo bộ quy tắc dưới đây, áp cho mọi bảng: BXH giữa trận, chặng, REVEAL/nhanh nhất, sảnh, Victory. Làm sau C-0306.

Vấn đề coordinator thấy ở bản Y-0519:
- A: cột trái bị cắt chữ "điểm" ("5.850 điển"), hai cột dính sát nhau.
- B: tên dài bị cắt ("Nguyễn Bảo Minh Tư…").
- Cả hai: quá nhiều dòng phụ ("KHÔNG PHẢI BXH TOÀN TRẬN", "TOP 10 TOÀN TRẬN GIỮ NGUYÊN · …", "ĐIỂM TOÀN TRẬN VÀ ĐIỂM CHẶNG ĐƯỢC TÁCH RÕ", dòng chuỗi đúng). Chữ "điểm" lặp lại ở mỗi dòng.

## Quy tắc thiết kế (bắt buộc, đo được)
1. **Một bảng, một thông điệp.**
   - Mỗi bảng chỉ có 1 tiêu đề ngắn (≤ 4 từ, ví dụ "TOP 10", "TOP 3 CHẶNG 1") và tối đa 1 dòng phụ.
   - Bỏ mọi chú thích giải thích cho người xem. Sự khác biệt giữa hai bảng phải thể hiện bằng tiêu đề và màu, không bằng câu chữ.
2. **Không lặp đơn vị.**
   - Số điểm chỉ ghi số ("5.850"), đơn vị đặt một lần ở tiêu đề cột hoặc tiêu đề bảng ("ĐIỂM").
   - Thời gian thì ghi "1,6 s" một lần.
3. **Cột thẳng hàng.**
   - Hạng canh giữa trong cột cố định, tên canh trái, điểm canh phải.
   - Dùng chữ số đều độ rộng (`font-variant-numeric: tabular-nums`).
   - Khoảng cách tên–điểm tối thiểu 24 px. Không cột nào được chạm cột kia.
4. **Khoảng trống theo lưới 8 px.**
   - Padding trong khung ≥ 24 px. Khoảng cách giữa các dòng ≥ 8 px. Khoảng cách giữa hai khối (Top 10 và Top 3) ≥ 24 px.
   - Không để chữ nào sát viền dưới 12 px.
5. **Cỡ chữ tối thiểu ở 1080×1920:**
   - Tên ≥ 28 px, điểm ≥ 28 px, tiêu đề bảng ≥ 32 px, dòng phụ ≥ 22 px.
   - Không quá 3 cỡ chữ trong một bảng.
6. **Thứ bậc thị giác.**
   - Top 1–3 nổi bật bằng màu huy chương hoặc nền nhẹ. Hạng 4–10 trung tính.
   - Chỉ một điểm nhấn màu vàng mỗi bảng.
7. **Tên dài.**
   - Ưu tiên giữ đủ tên: một cột rộng, tối đa 2 dòng nếu cần.
   - Nếu buộc phải cắt thì cắt sau ≥ 16 ký tự, có "…". Không được cắt chữ "điểm" hay số.
   - Mẫu phải chứa tên 24 ký tự.
8. **Ít hơn là hơn.**
   - Nếu Top 10 + Top 3 chặng không đủ chỗ thở trong một khung, đề xuất **hiện luân phiên** (Top 10 rồi Top 3 chặng, mỗi bảng vài giây), thay vì nhồi chung.
   - Dòng "chuỗi đúng dài nhất" cũng có thể đi luân phiên hoặc lên bong bóng MC.
9. **Tương phản:** chữ trên nền đạt WCAG AA (≥ 4.5:1). Không dùng chữ mờ cho thông tin chính.
10. **Bố cục cố định** theo mẫu 14/11: không dời hay đổi kích thước khung chính.

## Cần gửi
- 2 phương án (gộp chung hoặc luân phiên), mỗi phương án có: bình thường, tên 24 ký tự, đồng hạng.
- Kèm ảnh **phóng to vùng bảng** và bảng tự kiểm 10 quy tắc trên (đạt/không, kèm số đo px đo bằng DOM).
- Tự soi ảnh phóng to trước khi gửi. Lần trước ảnh có lỗi cắt chữ mà báo cáo vẫn ghi đạt.
