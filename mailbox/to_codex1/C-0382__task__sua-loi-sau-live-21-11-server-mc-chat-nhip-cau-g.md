---
id: C-0382
from: coordinator
to: codex1
type: task
title: Sửa lỗi sau live 21/11 — server: MC chat, nhịp câu, ghế, câu BVĐC
ref: 
priority: high
needs: 
created: 2026-11-21T21:52:04+07:00
---
# Sửa lỗi sau live 21/11 — phần server (Codex 1)

Người dùng duyệt 21/11. Danh sách gốc: `docs/HANDOFF.md` mục "Lỗi người dùng báo 21/11, SỬA SAU" (mục 1, 3, 4, 5, 6, 8, 11). **Luôn chọn cách sửa đơn giản nhất**, chỉ sửa đúng chỗ ghi dưới đây, không thêm nhánh xử lý cho tình huống chưa xảy ra.
Nhánh: `codex1/c-sau-live-server` (từ origin/main mới nhất). Làm theo thứ tự A → B → C → D, commit riêng từng việc.
Codex 2 đang sửa song song: `apps/dashboard`, `arena.css`, `questionTop3Presentation.ts`, `packages/live-adapters`, migration DB người chơi. **Không đụng các file đó** (trừ 1 dòng header ở việc C nếu cần, báo rõ).

## A. MC chat (mục 1 + 11) — `apps/server/src/runtime.ts` `mcChatSafetyFailure` (~1189–1207)
- Câu MC do người điều hành tự gõ trên Dashboard: **bỏ hẳn kiểm tra trùng tên/ID người chơi** (`containsPlayerIdentity`). Lời MC tự động vẫn giữ luật "không đọc tên" như cũ.
- Bộ lọc từ bậy cho MC chat: chỉ khớp **có dấu** + các từ viết tắt (dm, vcl, cc…). Bỏ qua các biến thể không dấu trong `packages/name-filter/src/default-list.ts` (`du`, `di`, `lon`, `cac`, `dit`, `deo`, `buoi`…) **chỉ cho MC chat**. Lọc tên người chơi giữ nguyên.
- Test: các câu sau phải gửi được: "Sắp đủ ghế rùi", "xe lại đi anh em", "chỉ tính câu trả lời đầu tiên thui đó anh em" (khi có người chơi tên "Tiên"), "các bạn lớn tuổi dù sao cũng vui". Một từ bậy có dấu vẫn bị chặn. Lọc tên người chơi không đổi (test cũ giữ nguyên).

## B. MC chat dài ~30 giây (mục 4) — chỉ áp cho MC chat
- `McChatTextSchema` (`packages/contracts/src/index.ts:245`): 120 → **400** ký tự. Ô nhập Dashboard đọc giới hạn từ schema/hằng số chung. Nếu Dashboard ghi cứng 120 thì chỉ sửa đúng dòng đó và báo.
- `MC_CHAT_GENERATION_TIMEOUT_MS` (`runtime.ts:114`): 10000 → **40000**.
- File giọng MC chat tối đa **35000 ms** (hiện dùng chung `MAX_MC_VOICE_ASSET_MS` 20000, `contracts:223`). Thêm hằng riêng cho MC chat; cue câu hỏi/đếm ngược giữ 20000.
- Test: câu 400 ký tự hợp lệ, câu 401 bị từ chối; tạo giọng 30 s (giả lập) không lỗi timeout; file 34 s được nhận, 36 s bị loại; cue QUESTION vẫn giới hạn 20 s.

## B2. Nhịp câu nhanh hơn 4 s (mục 5)
- `TimingsSchema` (`packages/contracts/src/index.ts:497–500`): `prepareMs` 8000 → **6000**, `revealMs` 9000 → **7000**.
- Kiểm tra các cue MC ở REVEAL ("Hết giờ", đáp án đúng, Top 3) không bị cắt. Nếu cue dài hơn 7 s thì báo tên cue và độ dài, không tự đổi lời.
- Test: mặc định mới; test cũ phụ thuộc 8000/9000 thì cập nhật.

## C. Ghế (mục 3 + 8) — `apps/server/src/audience.ts`
1. Chủ ngai để lại ghế trống mãi (`audience.ts:302` ẩn ghế chủ ngai; `rotateBetweenQuestions` ~247 ghim Top 5, nên ghế chủ ngai không bao giờ được xoay). Sửa: khi ngai HELD, ghế của chủ ngai được trả cho người kế tiếp trong hàng chờ ở lượt xoay gần nhất. Không ghim chủ ngai. Khi mất ngai thì chủ cũ vào hàng chờ như thường.
2. Người ngồi ghế **không trả lời 3 câu liên tiếp** (tính từ lúc vào ghế) thì được mời ra trước ở lượt xoay kế tiếp, kể cả khi thuộc Top 5 bị ghim. Sau đó mới đổi ngẫu nhiên như cũ. Chỉ mời ra khi hàng chờ có người.
3. Header "ĐANG CHƠI": đếm người **có trả lời trong 3 câu gần nhất**, không đếm tổng người từng vào. Ở câu 1–2 thì đếm người đã có trả lời; ở sảnh đếm người đã vào ghế. Thêm trường mới vào public state, overlay header đọc trường đó (sửa 1 dòng ở overlay, báo rõ file:dòng).
- Test (integration):
  - Sau khi ngai đổi chủ, ghế cũ của chủ ngai có người mới sau 1 lượt xoay; không ai xuất hiện 2 nơi (ghế + ngai).
  - Người bỏ 3 câu liền bị thay ở lượt kế; người bỏ 2 câu vẫn ngồi; hàng chờ rỗng thì giữ nguyên.
  - Top 5 bỏ 3 câu vẫn bị mời ra.
  - Số ĐANG CHƠI đúng với kịch bản 30 người ngồi, 3 người trả lời.

## D. Sửa 11 câu Bá Vương Đại Chiến trong DB (mục 6)
- Câu hỏi ở `data/quiz.db` của checkout chính `E:\Ai\2026\Trend mini game tiktok`. **Trước khi ghi, kiểm tra cổng 8787 không có server chạy.** Nếu đang chạy, gửi note cho coordinator và chờ, không ghi.
- Sao lưu `data/quiz.db` → `data/backup/quiz-<giờ>-truoc-bvdc.db`.
- Thêm "Tại Bá Vương Đại Chiến, " vào đầu prompt các câu: bv-016, bv-022, bv-023, bv-024, bv-025, bv-029, bv-030, bv-031, bv-061, bv-062, bv-063. Chữ đầu câu cũ chuyển thường nếu cần cho đúng ngữ pháp.
  - Câu nói về tứ kết thì dùng "Ở tứ kết Bá Vương Đại Chiến, …" (không lặp chữ "tứ kết").
  - bv-061 bỏ chữ "thi đấu": "Tại Bá Vương Đại Chiến, trận đầu tiên mỗi ngày bắt đầu lúc mấy giờ?".
- Làm đúng quy trình phiên bản: version + 1, ghi `question_versions`, trạng thái duyệt giữ nguyên. Dùng code/repo có sẵn nếu có, không SQL tay bỏ qua lịch sử.
- Chạy lại `pnpm report:question-length`. Câu nào sau khi thêm chữ vượt độ dài/dưới sàn 24 px thì liệt kê, **không tự rút gọn**.
- Gửi coordinator bảng: mã câu | prompt cũ | prompt mới.

## Kiểm tra trước khi báo xong
- Gộp origin/main mới nhất.
- typecheck, privacy:check, vitest unit + integration.
- **Toàn bộ** Playwright 2 lượt: asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`. Báo số passed/failed từng lượt, cả hai phải 0 failed. Test cũ hỏng vì hành vi mới thì sửa test theo hành vi mới.
- Không commit ảnh hay DB.

## Bàn giao
- Push nhánh `codex1/c-sau-live-server`, báo commit từng việc A–D, file:dòng đã sửa, kết quả test.
- ACK khi bắt đầu.
