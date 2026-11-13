---
id: X-0327
from: codex1
to: coordinator
type: report
title: Báo cáo C-0200 — mở rộng luật lọc tên và đo C-0201
ref: C-0200
priority: normal
needs: 
created: 2026-11-14T01:47:03+07:00
---
C-0200 — hoàn tất, kèm trả lời câu hỏi C-0201 theo yêu cầu.

### Nhánh và phạm vi
Nhánh `codex1/c0200-safe-name-rules`, commit `beb4c13` (`feat: mo rong bo loc ten an toan`), đã push lên origin. Chỉ gồm tài liệu đặc tả, luật và bộ kiểm name-filter, benchmark; không đổi overlay hay đường nhận comment.

### Luật và mức nền
Tổng 97 luật tính cả 2 luật REVIEW theo ngữ cảnh URL/số điện thoại:
- PROFANITY: 33; nền PARTIAL; 12 PARTIAL, 21 HIGH.
- NSFW_SEXUAL: 14; nền HIGH; 14 HIGH.
- HATE_SPEECH: 9; nền HIGH; 5 PARTIAL theo cụm miệt thị có ngữ cảnh, 4 HIGH.
- ILLEGAL_HARMFUL: 38; nền REVIEW; 35 REVIEW, 3 HIGH.
- IMPERSONATION: 3 cue PARTIAL; nền REVIEW cho thực thể riêng lẻ, ngữ cảnh có thể nâng mức.

Hai luật được duyệt có ID `insult.vi.cho-dien` và `insult.vi.bo-dai`, đều PARTIAL. Kiểm tra xác nhận che đúng span, giữ phần tên còn lại và lưu rule ID/risk; test giữ chuỗi markup như chữ để UI escape. E2E `XSS shaped names render as text`: 1 passed (11.9s).

Bộ so khớp có dấu/không dấu, hoa thường, chữ số thay chữ, separator, lặp ký tự, Cyrillic/Greek/full-width; thêm alias phía luật cho `đ→dz`, `c→k`, `ph→f`, `s→x`, không gộp toàn cục các cặp này trên tên sạch. Bộ case biến thể phát hiện 23/23; đây là tỷ lệ trên bộ kiểm thử, không phải ước lượng recall ngoài đời.

### Tên sạch và benchmark name-filter
Corpus gồm 294 tên/handle sạch tổng hợp, bao gồm các âm dễ trùng từ nhạy cảm và tên vùng miền đứng riêng: 0 báo nhầm (0%). Bộ tổng hợp riêng 500 tên: 0/500. Luồng benchmark 10.000 tên × 20 lượt: 0/10.000 báo nhầm; median 12,25 µs/tên, p95 13,69 µs/tên trên máy chạy kiểm thử. Benchmark chỉ đo hàm lọc tên, không thêm I/O vào ingest.

### C-0201 — thông lượng DB file sau C-0199
Đo trên `origin/main` tại `fa4c853`, có merge C-0199 `c0f21cd` (commit tối ưu `536443c`). Dùng app/runtime server thật, `RealScheduler`, callback `MockAdapter.emit`, SQLite file-backed với `journal_mode=WAL`, `synchronous=NORMAL`; đây là đường callback chung của adapter, không phải benchmark mạng TikTok.
- 2.000 đáp án, cửa sổ 20 giây, ba DB mới: nhận đủ 2.000 cả ba lượt; 7,347 / 7,762 / 7,910 giây, tương đương 272,2 / 257,7 / 252,8 đáp án/giây (median 257,7/s).
- Burst 20.000 sự kiện trong cửa sổ 3 giây: adapter giao đủ 20.000; 942 được nhận, 19.058 bị từ chối `LATE`, không có lý do từ chối khác; burst kết thúc sau 3,129 giây. Tốc độ nhận hợp lệ đo được là khoảng 301/s trong burst này.

Server không có hàng đợi bền/batch nội bộ cho comment: callback đồng bộ, mỗi đáp án hợp lệ ghi trong transaction riêng. Khi quá tải, các callback được xử lý sau deadline bị từ chối `LATE`, không chờ cho tới khi hợp lệ trở lại. `ingest` đóng dấu thời điểm khi callback được gọi; do đó nếu một adapter bên ngoài tự buffer sự kiện đã đến trước deadline nhưng chỉ gọi callback sau deadline, sự kiện đó có thể thành `LATE`. Connector TikTok hiện chưa khả thi/được chặn nên chưa thể xác minh buffering bên ngoài hoặc đo end-to-end trên LIVE thật.

Chỉ đề xuất, chưa sửa: WAL và NORMAL đã bật nên không cần bật lại; đo tiếp với connector được phép và thêm back-pressure/telemetry. Nếu burst cao hơn khoảng 250–300 đáp án/s là yêu cầu, thử transaction batching có giới hạn và giữ thứ tự/receive-time do server đóng dấu ngay khi nhận, rồi kiểm chứng không làm sai deadline và first-answer-wins.

### Kiểm tra
- Unit name-filter + NameFilterStore: 2 files, 38 tests passed.
- Integration name-filter: 1 file, 3 tests passed. Lần chạy chung với unit gặp ENOENT ở thư mục tạm; chạy lại riêng thì PASS.
- `corepack pnpm exec tsc --noEmit -p tsconfig.json`: exit 0.
- `corepack pnpm exec node scripts/privacy-check.mjs`: PASS (801 files).
- `corepack pnpm exec tsx tools/name_filter_benchmark.ts`: exit 0, kết quả như trên.
- `git diff --check`: sạch.
