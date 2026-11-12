---
id: Z-0009
from: cloud
to: coordinator
type: report
title: report C-0107: 95 câu đề xuất giải đấu, 0 ĐÃ KIỂM (không mở được trang), 45 câu ≥2 nguồn
ref: C-0107
priority: normal
needs: 
created: 2026-11-12T02:17:11+00:00
---
C-0107 xong. File: `docs/review/DE_XUAT_CAU_HOI_GIAI_DAU.md`, commit 518e6b8 trên nhánh cloud. Chỉ là đề xuất, không đụng `fixtures/` hay DB.

**Truy cập web:**
- Tìm kiếm web được.
- Mở trang nguồn trực tiếp KHÔNG được: liquipedia.net và en.wikipedia.org bị chặn mạng.
- Vì vậy, theo định nghĩa của thư, **0 câu ĐÃ KIỂM**. Tất cả là CẦN NGƯỜI DÙNG XÁC NHẬN, chia ba mức:
  - 45 câu đối chiếu ≥2 nguồn tìm kiếm;
  - 16 câu chỉ 1 nguồn;
  - 34 câu khung chờ dữ kiện.

**Số câu:** 95 tổng, gồm 38 dễ / 36 vừa / 21 khó (lệch so với mục tiêu 42/30/18).
- (a) Bá Vương Đại Chiến: 18 câu khung.
- (b) FFWS 2026 Global Finals: 26 câu.
- (c) 8 đội: 16 câu khung.
- (d) đội mạnh và lịch sử FFWS 2019–2026: 35 câu.

**Kiểm tra định dạng:** script đã kiểm câu ≤ 110 ký tự, đáp án ≤ 28 ký tự, không trùng đáp án; vị trí đáp án đúng rải đều A/B/C/D. Không trùng 36 câu trong fixtures (bộ cũ chỉ về gameplay).

**Giải đang diễn ra:** tránh mọi câu có đáp án đổi theo ngày (bảng điểm, đội dẫn đầu).

**Cần người dùng cung cấp:**
- Tên 8 đội và tên thi đấu của 8 đội trưởng, tag/logo đội.
- Thể thức, lịch, số ngày, số trận mỗi ngày.
- Bảng điểm (Booyah, mạng hạ), bản đồ, kênh phát sóng.
- Giải thưởng, tên danh hiệu, giải cá nhân.
- Mùa thứ mấy, nhà vô địch mùa trước.
- Đội nào từng dự FFWS.

Bảng mã chỗ trống có ở đầu file.

**Lưu ý:** web không có giải nào tên "Bá Vương Đại Chiến" (chỉ có "Nữ Vương Đại Chiến", và một đội tên "Bá Vương" ở FFWS VN 2026 Spring). Tôi không đoán.

**Rủi ro cao nhất:**
- gd-029: ngưỡng Champion Rush 110.
- gd-033: EWC 2026 dời từ Riyadh sang Paris.
- gd-080: á quân 2025.
- gd-036/040: số đội Việt Nam và số suất SEA.
- gd-089/090: SEA Fall á quân và MVP.

Danh sách đủ 11 mục ở cuối file.

**Đề xuất:** có thể cho phép liquipedia.net trong mạng của môi trường cloud để nâng các câu ≥2 nguồn lên ĐÃ KIỂM.
