# HANDOFF — phiên coordinator (cập nhật 12/11/2026 ~10:25)

**PHIÊN KẾ (điều phối quiz TikTok, người dùng đổi tài khoản 12/11 ~10:25) — ĐÃ NHẬN 12/11 14:20 (phiên mới; thư đến C-0121).**

Vòng ngữ cảnh: `.claude/settings.json` (cục bộ) đặt `CLAUDE_CODE_AUTO_COMPACT_WINDOW=350000` + hook SessionStart `py -X utf8 tools/session_handoff.py` → tự nén ở ~70 % rồi nạp lại file này. Khi context ~70 %: cập nhật file này, đổi dòng in đậm trên thành `— ĐỌC ĐẦU TIÊN.`, commit + push. KHÔNG clear/archive/mở phiên mới cho phiên chính.

Phiên trước đầy context. Phiên mới: **chỉ điều phối** (memory `coordinator-delegate-not-code`) — giao code cho Codex qua hòm thư, rà report, gộp nhánh.

## Mới nhất (12/11 ~10:25) — đọc khối này trước, mọi khối dưới đã cũ
- Người dùng đổi tài khoản Claude lúc ~10:25; phiên kế tiếp quản điều phối. Thư coordinator gần nhất: **C-0115**. Hòm thư coordinator sạch. Đặt lại `py -X utf8 tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền.
- **Đã gộp main (P0 xong)**: preflight `GET /api/preflight`, backup + `CHAY_GAME.cmd`, rehearsal Mock, simulator event ID, placeholder asset, 6 lỗi cloud tìm (C-0100), giới hạn độ dài câu hỏi (110/28 ký tự), chọn câu theo độ khó (mục tiêu 7/5/3, lệch ±2, chưa gán = vừa; mặc định vẫn RANDOM, không có nút bật trên dashboard). Lần kiểm cuối trên main: 286 unit test, typecheck sạch, privacy PASS; e2e coordinator CHƯA chạy lại. BOARD #18–#22.
- **Giao diện CHƯA gộp** — nhánh `codex2/c0068-victory-ref` (`00545c7`): màn câu hỏi, Top 10, Victory, đồng hạng. Người dùng CHƯA duyệt màn nào. Ảnh soát: `assets-local/review/c0101/`.
- **codex2 đang làm (thứ tự)**: C-0114 + C-0115 Victory → C-0113 header dùng thẳng `/assets/brand/logo.png` (logo trong ref là sai) → C-0109 âm thanh/hiệu ứng (nhánh `codex2/c0109-sound-fx`, được sửa `apps/server/src/static.ts` cho MIME audio và `docs/ASSET_INVENTORY.md`).
- **Nền Victory — CHỜ NGƯỜI DÙNG CHỌN**: người dùng chê bản render có 2 cột hai bên, đòi nền như ref. Ref in sẵn nhân vật/bảng tên/logo cũ nên không dùng thẳng được.
  - `assets-local/victory/bg-ref-clean.jpg`: ref đã xoá nhân vật — người dùng TỪ CHỐI (còn vệt nhoè).
  - `assets-local/victory/bg-redraw.jpg`: vẽ lại bằng công cụ tạo ảnh của Figma (chỉ nhận mô tả chữ, tốn credit của người dùng) — sạch nhưng cúp/tông màu khác ref; codex2 tạm dùng bản này, đường dẫn nền để 1 hằng số. Ảnh so: `assets-local/review/victory-bg-ref-vs-redraw.jpg`.
  - Đã hỏi người dùng: dùng bản này / vẽ thêm bản sát ref hơn / tự xuất bản không nhân vật từ công cụ gốc. Chưa trả lời.
  - Coordinator tự quyết ẩn MC Kelly ở Victory (ref không có MC) — đã báo người dùng, chưa được xác nhận.
- **codex1 đang làm**: C-0112 `tools/question_bank.py` + `BO_CAU_HOI.xlsx` ở gốc repo (ngoài git) gộp ~139 câu (36 FF trong DB + 63 câu về giải ở `assets-local/review/DE_XUAT_CAU_HOI_BVDC.md` + 40 câu FFWS ở `docs/review/DE_XUAT_CAU_HOI_GIAI_DAU.md`), import vào `data/quiz.db`. Người dùng sẽ tự xem/sửa file xlsx sau. 40 câu FFWS chưa kiểm nguồn. C-0085 phần e2e chờ gộp UI. Giọng MC dừng sau mốc 2.
- **Quy tắc người dùng chốt trong phiên này**: cờ khán đài mang logo 8 đội; Top 10 không chiếm quá ~45 % chiều cao; hạn chế câu quá dài; âm thanh được tạo bằng API (không gửi key qua chat); file thông tin giải ở gốc repo là NỘI BỘ (gitignore) — không chép nội dung/tên sheet/dữ liệu người chơi vào repo, thư, báo cáo.
- **Khi codex2 report**: chép ảnh so vào `assets-local/review/`, xem, gửi người dùng; KHÔNG gộp UI trước khi người dùng duyệt từng màn. Sau khi duyệt: gộp main vào nhánh, typecheck + test + e2e, push, `corepack pnpm build:web` chạy từ PowerShell, báo codex1 làm tiếp C-0085.
- **Chưa kiểm**: `CHAY_GAME.cmd` chạy trọn trên máy này (server cũ còn chiếm cổng 8787 — người dùng phải đóng cửa sổ game cũ rồi chạy lại).
- **Chờ người dùng**: chọn nền Victory; duyệt từng màn UI; 8 file logo đội gốc (cờ đang cắt từ ảnh, mờ); nền sân 1080×1920 sạch cho màn câu hỏi; quyền LIVE PC + @username; chibi nét hơn; PNG tư thế MC.

## Cũ (12/11 sáng)
- Plan V4 đã vào repo (`docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`), quyết định D-19..D-22 (`docs/DECISIONS.md`), BOARD #18–#21. Người dùng chốt: giữ điểm Kahoot; dừng giọng MC sau mốc 2; P0 trước.
- Đã gộp main: C-0077, C-0078 mốc 1 + 2 (pha READING, API giọng MC giả). 260 unit test xanh; e2e coordinator chưa chạy lại.
- codex1: **C-0092** P0 (preflight, backup + `CHAY_GAME.cmd`, QUIZ_ASSETS_DIR, rehearsal Mock). codex2: **C-0080** màn câu hỏi 6 điểm + READING; C-0079 hoãn. cloud: **C-0093** `docs/IMPLEMENTATION_GAP_MATRIX_V4.md` (nhánh `claude/zen-dijkstra-sop0bt`).
- Victory vòng 2 ở nhánh `codex2/c0068-victory-ref` (`1d6bbd8`) **CHƯA gộp** — chờ người dùng duyệt ảnh `assets-local/review/c0089-victory-vong2-so-ref.jpg` (BOARD #19: ảnh cạnh ref, người dùng duyệt rồi mới gộp). Khi duyệt: gộp trong worktree, typecheck + test + e2e, push, `corepack pnpm build:web`.
- Ref: ảnh gốc repo "Sân Khấu Neon" = ref **Victory**; `assets-local/ref/storm-arena-ref.png` = ref **màn câu hỏi**.
- 36 câu đã APPROVED để chạy thử (BOARD #20) — hỏi lại trước 13–14/11.
- Người dùng hỏi đổi repo sang private: đã trả lời (cần cấp quyền cho phiên cloud; phút Actions có hạn; kiểm CI qua API công khai hết dùng được). Chưa đổi.
- Chờ người dùng: duyệt Victory vòng 2; giữ/ẩn MC ở Victory; quyền LIVE PC + @username; chibi nét hơn; PNG tư thế MC.

## Cũ (11/11 ~22:45) — main ≈ `d420374`, 227 test + e2e 42 xanh
- Tool game chạy bằng `CHAY_GAME.cmd` (cửa sổ riêng, data ở `data/`, token tự chép clipboard). Hướng dẫn LIVE: `docs/HUONG_DAN_LIVE.md`. Người dùng phải tự thêm nguồn Link `http://127.0.0.1:8787/overlay/` trong LIVE Studio (tôi không bấm được app native). LIVE Studio báo "No access" = tài khoản chưa có quyền LIVE PC.
- Đã gộp Victory/logo/safe-zone (Y-0124, nhánh codex2/c0068-victory-ref).
- codex2: C-0080 ĐÃ ACK (Y-0125), đang làm (người dùng chưa duyệt: bám ref, logo ≥40 %, đếm ngược che chữ, đáp án bị cắt, bỏ icon sét ô thoại MC, MC đổi chuyển động theo phase) → rồi C-0079 Voice Settings.
- codex1: C-0077 (privacy fixture + e2e ổn định) → C-0078 voice mốc 1–3.
- Khi C-0080 report: rà ảnh (question câu dài, question-hud, reveal, victory, victory-tie, top10) cạnh `ref/storm-arena-ref.png`, gộp trong worktree `.claude/worktrees/coord-merge2`, chạy typecheck+test+e2e, push, rồi `corepack pnpm build:web` ở checkout chính (tool đang chạy tự phục vụ bản mới, chỉ cần reload overlay) và gửi ảnh cho người dùng.
- Ảnh người dùng ở gốc repo (Thẻ nhân vật…, logo_BAVUONG.png, Đấu Trường Bão Tố…png) KHÔNG commit (đã có bản trong assets-local).
- Chờ người dùng: PNG tư thế MC vào `assets-local/mc/kelly/{welcome,ask,react,celebrate,idle}`; @username + quyền LIVE; duyệt 36 câu.

## Bắt đầu phiên mới
1. Đọc: `mailbox/README.md`, `mailbox/BOARD.md` (phân làn + quyết định chốt #1–#17), `docs/TIEN_DO.md` (mốc + giờ), file này.
2. `py tools/mb.py status` → `py tools/mb.py read --for coordinator` → rà report (chạy lại `corepack pnpm typecheck && corepack pnpm test`, e2e nếu đụng overlay) → gộp.
3. Gộp nhánh Codex trong worktree riêng hoặc gộp nhanh rồi push ngay (mb.py của Codex `pull --rebase` ở checkout chính). Build overlay trong Git Bash phải `MSYS_NO_PATHCONV=1`.
4. Đặt `py tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền để được đánh thức khi có thư.

## Trạng thái (11/11 ~19:50) — main ≈ `87a6861`, 220 test + e2e 29 xanh
- Đã gộp: Setup Wizard + phiên TikTok + duyệt câu (C-0021/24), test V3/tải (C-0027/36/53), dashboard e2e (C-0040), replay TikTok (C-0043), soak 60' (C-0051), McSequence (C-0037), cutout tool (C-0034/44), overlay V3 redesign (C-0032), HUD LIVE mô phỏng + safe zone (C-0056/57/58), Top10 đủ 10 hàng + crop an toàn x 9–91 % (C-0054).
- Coordinator tự sửa: lỗi "Failed to retrieve Room ID" → coi như chưa LIVE, không retry dồn (f485321).
- Asset cục bộ (ngoài git): `assets-local/chibi/` = bộ ĐÃ tách nền (bộ cũ ở `_backup/chibi-old-chua-sach/`); `mc/kelly.png` (rembg, "tạm được"); `mc/kelly/{idle,...}/` chờ frame; `brand/logo.png` = logo chính thức; `cards/the-chien-dau-ffvn-kelly.png`; `ref/victory-ref.png` (Victory: chibi đứng TRÊN bục); `ref/storm-arena-ref.png` = MẪU TOÀN CẢNH người dùng đòi giống (HUD, phong cách, background); `ref/tiktok-live-1..3.png` = UI LIVE thật (safe zone: trên 14 %, comment trái 73–92 %, crop ngang 9 %). Server soát ảnh: `py -m http.server 8791 --directory assets-local`.

## Hàng chờ Codex
| Làn | Thư | Việc |
|---|---|---|
| codex2 | C-0060 (ƯU TIÊN) → C-0055 | C-0060: overlay giống `ref/storm-arena-ref.png` (nền sân bão, khán đài bậc, HUD neon, header, Top10, MC). Khi report: gộp sau khi test xanh rồi cho người dùng xem ảnh cạnh ref. C-0055: Victory 3 chibi toàn thân đứng trên bục, bảng tên lục giác |
| codex1 | C-0062 | `tests/e2e/live-round.test.ts` full vòng overlay/dashboard + replay TikTok + FPS |
| — | — | Hết việc: Codex gửi note "rảnh"; DP1/2/4 đã xong (BOARD) |

## Đang chờ người dùng
- Có làm được nền sạch 1080×1920 không UI và/hoặc chibi nhìn từ sau lưng (để giống ref hơn) không.
- Duyệt 36 câu Free Fire (`docs/review/DE_XUAT_CAU_HOI_FF.md`); phát LIVE thử (@username); quyền asset; frame PNG Sequence MC; khung trống thẻ chiến đấu (nếu có).
