---
id: C-0363
from: coordinator
to: codex2
type: task
title: Nhận C-0310 (báo cáo độ dài câu) rồi C-0324 rút gọn (công cụ kiểm ảnh ngai) — chỉ tools/docs
ref: C-0310
priority: high
needs: 
created: 2026-11-20T14:57:05+07:00
---
# Giao Codex 2: hai việc chuyển từ Codex 1 (đọc hết thư trước khi làm)

Người dùng muốn rút ngắn thời gian nên hai việc này chuyển sang bạn để chạy song song với Codex 1. **Làm đúng thứ tự: C-0310 trước, C-0324 sau.** Cả hai **không đổi giao diện overlay hay Dashboard**. Đây là công cụ và báo cáo.

**Ranh giới tệp, để không xung đột với Codex 1** (Codex 1 đang sửa preflight, fixtures và các test chập chờn):
- **KHÔNG sửa:** `fixtures/`, `apps/server/src/`, `apps/overlay/src/`, `apps/dashboard/src/`, `packages/`, `tests/e2e/`, `tests/integration/`.
- **Chỉ tạo hoặc sửa:** `tools/report-question-length.ts` (cùng test của nó trong `tools/`), `tools/throne_assets.py`, `tools/test_throne_assets.py`, `docs/THRONE_ASSETS.md`, `docs/QUESTION_LENGTH_REPORT.md`, và thêm script vào `package.json`.
- Nếu thấy buộc phải sửa ngoài danh sách trên thì **dừng lại và gửi thư `question`**, không tự làm.

---

## Việc 1: C-0310, báo cáo độ dài câu hỏi thật (CHỈ ĐỌC, CHỈ ĐỀ XUẤT)

**Bối cảnh:** buổi live 18/11 có câu bị tràn khung. Người dùng không muốn câu nào bị cắt "…" trên sóng. Bộ câu hỏi thuộc về người dùng: **công cụ không bao giờ sửa text câu** trong DB hay file nguồn.

**Đầu vào:**
- Copy `data/quiz.db` sang `test-results/c0310/quiz-copy.db` (ignore) rồi mở bản copy ở chế độ **readonly**. Không bao giờ mở `data/quiz.db` để ghi.
- Chỉ lấy câu `approval_status = 'APPROVED'`, gồm prompt và 4 đáp án.

**Đo bằng chính overlay** (không tự ước lượng bằng công thức):
- Chạy Playwright từ script trong `tools/`, **không** thêm spec vào `tests/e2e/`. Viewport 1080×1920, asset thật, nạp từng câu vào cảnh QUESTION rồi REVEAL qua cơ chế mock có sẵn. Tham khảo cách `tests/e2e/c0297-prompt-fit.spec.ts` và `tests/e2e/c0319-hud-tall.spec.ts` dựng câu; hàm ngắt dòng là `wrapPromptToLines` trong `apps/overlay/src/v3/arenaLogic.ts`, logic co chữ ở `ArenaStage.tsx` khoảng dòng 150–175.
- Với **mỗi câu** ghi lại:
  - cỡ chữ prompt cuối cùng (px, đọc từ `getComputedStyle`);
  - số dòng (đo bằng Range `getClientRects` trên text node);
  - prompt có bị clamp không (`scrollHeight > clientHeight + 1` hoặc có "…");
  - với từng đáp án: cỡ chữ, số dòng, có bị cắt không (`scrollWidth > clientWidth` hoặc `scrollHeight > clientHeight + 1`).

**Thời lượng MC đọc:** chỉ đọc metadata `durationMs` của cache giọng sẵn có, rồi tính tốc độ ký tự/giây (trung vị) để ước lượng cho câu chưa có cache. **Không sinh giọng thật**, vì việc đó tốn lượt.

**Đầu ra:** `.claude/review/C0310/question-length-report.md` (ignore).
- Ở đầu: tổng số câu; số câu bị clamp; số câu cỡ chữ dưới 30 px; số câu ước lượng đọc lâu hơn 20 s; số đáp án bị cắt.
- Bảng sắp từ tệ nhất: clamp, rồi đáp án bị cắt, rồi dưới 30 px, rồi đọc lâu hơn 20 s. Mỗi dòng có: id, chủ đề, số ký tự, cỡ chữ, số dòng, thời lượng ước lượng, text gốc.
- Mỗi câu thuộc 4 nhóm trên có **1–2 phương án rút gọn**: giữ nguyên nghĩa và đáp án đúng, viết tiếng Việt tự nhiên, chủ đề Free Fire. Ghi nhãn rõ **"ĐỀ XUẤT — chờ người dùng duyệt"**.
- Thêm `--json` để xuất thêm `.claude/review/C0310/question-length-report.json`.

**Lệnh:** `pnpm report:question-length`, chạy `tsx tools/report-question-length.ts`.

**Test:** phần thuần (xếp hạng mức tệ, ước lượng thời lượng, dựng markdown) có test vitest với dữ liệu giả viết ngay trong test. Test **không** mở `data/quiz.db` và **không** cần chạy Playwright.

**Kiểm tra:** typecheck, privacy:check, unit+integration đầy đủ. Không cần toàn bộ E2E vì không sửa UI, nhưng phải xác nhận `tests/e2e/` không đổi tệp nào.

**Báo cáo:** đủ 5 con số tổng ở trên, đường dẫn tuyệt đối tới tệp báo cáo, 5 câu tệ nhất kèm đề xuất. Nhánh `codex2/c-0310-question-length` tách từ `origin/main`, merge `origin/main` mới nhất trước khi báo.

---

## Việc 2: C-0324 (rút gọn), công cụ kiểm tra ảnh ngai vàng

**Đã có sẵn, KHÔNG làm lại:** overlay đã tự lấy `assets/throne/ngai-<characterId>.png` và `ngai-trong.png` (`ArenaStage.tsx:439`, `Victory.tsx:48`). Phần preflight đủ ảnh thì Codex 1 làm ở C-0347. **Phần server `throneUrl` trong brief cũ bỏ.** Việc này chỉ còn công cụ Python.

**Dữ liệu thật:** `assets-local/throne/` (ignore, đang có khoảng 63 ảnh `ngai-<id>.png`, cùng `ngai-trong.png`, `HUONG-DAN.md` và `DANH-SACH.txt`). Danh sách id lấy từ `assets-local/chibi/manifest.json` (62 nhân vật).

**`py -3 tools/throne_assets.py check [--dir assets-local/throne] [--json]`** kiểm từng tệp:
1. Tên tệp khớp một id trong manifest. In ra cả **id thiếu ảnh** lẫn **tệp thừa hay sai tên**.
2. Đúng 800×800, mode RGBA, và 4 góc 10×10 px đều có alpha = 0.
3. **Ngai có giống ngai gốc không:**
   - Mask ngai lộ ra gồm các điểm có alpha > 128 trong `ngai-trong.png`, **trừ** vùng giữa nơi nhân vật ngồi (mặc định hình chữ nhật x 200–600, y 120–700; chỉnh bằng `--center x0,y0,x1,y1`).
   - Độ lệch vị trí: tìm (dx, dy) trong khoảng ±16 px làm sai khác trong mask nhỏ nhất. Ổn khi |dx| và |dy| ≤ 4; trên 8 là lệch.
   - Độ lệch màu: trung bình sai khác tuyệt đối RGB (0–255) trong mask, sau khi đã bù (dx, dy). Dưới 18 là `OK`, 18–30 là `CẦN XEM`, trên 30 là `NGAI LỆCH — nên vẽ lại`.
   - Ngưỡng đặt thành hằng số ở đầu tệp và ghi rõ trong docs.
4. In bảng gồm file, id, kích thước, alpha, dx, dy, sai khác màu, kết luận. Dòng cuối tóm tắt số OK, CẦN XEM, LỆCH, thiếu, thừa. Exit code bằng 1 nếu có tệp LỆCH hoặc sai kích thước.

**`build`** chạy `check` rồi xuất vào `assets-local/throne/`:
- `manifest.json`: id → tên tệp, kèm kết luận.
- `contact-sheet.png`: lưới 8 cột, ô 200 px. Ô đầu là `ngai-trong.png`. Mỗi ô ghi id và kết luận; viền đỏ cho LỆCH, vàng cho CẦN XEM.

**Thư viện:** chỉ dùng Pillow và numpy (đã có sẵn, xem `tools/cutout_chibi_bank.py`). Không thêm phụ thuộc mới.

**Test:** `tools/test_throne_assets.py`, chạy bằng `py -3 -m unittest tools/test_throne_assets.py`.
- Tự sinh ảnh giả trong `test-results/tmp-throne/` và **xoá ở `tearDown`**.
- Các ca phải có: ảnh khớp (OK); ngai dịch 10 px (LỆCH vị trí); ngai đổi màu (LỆCH màu); 640×640 (sai kích thước); nền không trong suốt; id thiếu; tệp thừa.
- Không dùng ảnh thật. Không commit bất kỳ ảnh nào.

**Docs:** `docs/THRONE_ASSETS.md`, ngắn gọn: cách đặt tên, lệnh chạy, ý nghĩa ngưỡng, cách đọc contact sheet.

**Chạy thật:** sau khi xong, chạy `check` và `build` trên `assets-local/throne/` thật. Báo số OK, CẦN XEM, LỆCH, thiếu, thừa, kèm danh sách id LỆCH và đường dẫn tuyệt đối tới `contact-sheet.png`. Tự mở contact sheet ra xem, kiểm 3 ô LỆCH và 3 ô OK bằng mắt xem kết luận có đúng không, rồi ghi nhận xét vào báo cáo.

**Kiểm tra:** typecheck, privacy:check, `py -3 -m unittest tools/test_throne_assets.py` và `tools/test_*.py` có sẵn. Không cần E2E. Nhánh `codex2/c-0324-throne-check` tách từ `origin/main`.

---

## Quy tắc chung
- ACK khi bắt đầu mỗi việc, gửi 1 báo cáo khi xong. Bị chặn quá 30 phút thì gửi `question`.
- Không commit ảnh chụp, ảnh hoặc âm thanh thật, DB hay xlsx. Trước khi push, kiểm tra `git diff --stat origin/main`.
- Không ghi tên miền hay ID nội bộ, giá trị voice profile, admin token vào thư hay repo (hòm thư public).
- Không để thư mục tạm trên ổ C; dọn sạch sau test.
