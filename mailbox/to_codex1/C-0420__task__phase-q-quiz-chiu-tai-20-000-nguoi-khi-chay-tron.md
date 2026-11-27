---
id: C-0420
from: coordinator
to: codex1
type: task
title: Phase Q: Quiz chịu tải 20.000 người khi chạy trọn vòng
ref: 
priority: high
needs: 
created: 2026-11-27T14:38:13+07:00
---
Người dùng duyệt 27/11 ("Giao ngay"). Phase Q của kế hoạch Cinema V6: **Quiz phải chịu được 20.000 người khi chạy TRỌN VÒNG.** Kênh chính có lúc 10.000–20.000 người xem.

## Bằng chứng hiện có
- C-0237 `pnpm bench:simulator-20k` (`scripts/benchmark-scale.ts`): chỉ đo nhận comment + chấm điểm. Kết quả: ingest p99 ~2 ms, chấm + xếp hạng ~0,3 s.
- Vòng MOCK TRỌN VẸN 20/11 (`tools/mock_round_check.ts`, 15 câu × **2.000** người): event-loop **p99 806 ms, max 1,1 s**. Ở 20.000 người, đồng hồ đếm ngược/overlay gần như chắc chắn sẽ giật.
- Sau đó main có thêm C-0416/C-0418 (ghế theo điểm, `reorderByRank`) và `803213a9` (bỏ sort toàn bộ khán giả ở REVEAL). Chưa ai đo lại trọn vòng.

## Việc 1 — Đo trước khi sửa (baseline trên origin/main)
- Chạy `tools/mock_round_check.ts --questions 15 --players 10000` rồi `--players 20000`. Mở thêm Overlay `?role=program` và Dashboard (Playwright headless) trong suốt vòng.
- Server chạy cổng riêng (KHÔNG dùng 8787) và `QUIZ_DATA_DIR` là **bản sao** dữ liệu đặt trên ổ E. Không đụng `data/quiz.db` của checkout chính. Dọn thư mục tạm khi xong (ổ C gần đầy).
- Đo theo từng pha (LOBBY vào sảnh, ANSWER, REVEAL, LEADERBOARD, VICTORY):
  - event-loop p50/p99/max (`monitorEventLoopDelay`);
  - thời gian REVEAL → LEADERBOARD;
  - kích thước và tần suất snapshot WS gửi Overlay và Dashboard;
  - heap (đã gc);
  - FPS Overlay;
  - số đáp án mất; điểm có khớp bản tính tay không.
- Lấy `--cpu-prof` ở lượt 20k để tìm 3 điểm nóng nhất.

## Việc 2 — Sửa điểm nóng (cách đơn giản nhất)
- Chỉ sửa đúng chỗ profile chỉ ra. Hướng thường gặp:
  - việc O(n) chạy cho mỗi comment hoặc mỗi lần phát → gom lô hoặc tính tăng dần;
  - snapshot Overlay chỉ chứa 30 ghế + ngai + Top 10 + số tổng, **kích thước không được tăng theo số người**;
  - phát WS có trần tần suất;
  - ghi SQLite theo lô.
- KHÔNG đổi luật chơi, bố cục, UI hay cách chấm điểm. KHÔNG đụng gì liên quan Cinema.

## Nghiệm thu — đạt ở cả 10.000 và 20.000 người, mỗi mức chạy 2 lượt
- event-loop p99 < 100 ms, max < 250 ms ở mọi pha (kể cả REVEAL và lúc 20.000 người cùng trả lời trong 2 giây đầu).
- Đồng hồ đếm ngược trên Overlay không nhảy cóc quá 1 giây; FPS Overlay ≥ 30.
- 0 đáp án mất; điểm và Top 10 khớp bản tính tay.
- Kích thước snapshot gửi Overlay ở 20.000 người ≈ ở 2.000 người (chênh ≤ 10%).
- Heap ổn định sau 15 câu; không rò bộ nhớ.

## Ca biên bắt buộc
- 20.000 comment dồn vào 2 giây đầu ANSWER; comment trùng `eventId`; trả lời muộn sau deadline.
- 20.000 người vào sảnh: đúng 30 người ngồi ghế, phần còn lại vào hàng chờ, không ai xuất hiện ở 2 nơi.
- Overlay ngắt kết nối rồi nối lại giữa vòng: nhận lại đúng trạng thái trong ≤ 2 giây.
- Đổi chủ ngai giữa vòng ở 20.000 người.

## Test
- typecheck, `privacy:check`, vitest đủ (unit + integration), `pnpm test:load`.
- Playwright đủ 2 lượt asset thật + 1 lượt placeholder: 0 failed.
- Nếu tối ưu xứng đáng thì thêm bài tải 20k cố định vào project load (thời gian chạy hợp lý, không làm CI quá chậm).

## Giao hàng
- Nhánh `codex1/c-quiz-20k` từ origin/main mới nhất; merge origin/main lại trước khi báo.
- KHÔNG commit ảnh, log, file profile hay dữ liệu đo.
- Report gồm:
  - bảng TRƯỚC/SAU cho 2.000, 10.000 và 20.000 người, mỗi pha một dòng;
  - 3 điểm nóng tìm được và cách sửa (file:dòng);
  - số passed/failed của từng lượt test;
  - lệnh để coordinator tự chạy lại phép đo.
- ACK khi nhận việc. Nếu baseline đã đạt sẵn thì báo ngay kèm số liệu, không cần sửa.
