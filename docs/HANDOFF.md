# HANDOFF — phiên coordinator (cập nhật 11/11/2026 ~22:45)

**PHIÊN KẾ (điều phối quiz TikTok sau nén) — ĐÃ NHẬN 11/11 (sau nén).**

Vòng ngữ cảnh: `.claude/settings.json` (cục bộ) đặt `CLAUDE_CODE_AUTO_COMPACT_WINDOW=350000` + hook SessionStart `py -X utf8 tools/session_handoff.py` → tự nén ở ~70 % rồi nạp lại file này. Khi context ~70 %: cập nhật file này, đổi dòng in đậm trên thành `— ĐỌC ĐẦU TIÊN.`, commit + push. KHÔNG clear/archive/mở phiên mới cho phiên chính.

Phiên trước đầy context. Phiên mới: **chỉ điều phối** (memory `coordinator-delegate-not-code`) — giao code cho Codex qua hòm thư, rà report, gộp nhánh.

## Mới nhất (11/11 ~22:45) — main ≈ `d420374`, 227 test + e2e 42 xanh
- Tool game chạy bằng `CHAY_GAME.cmd` (cửa sổ riêng, data ở `data/`, token tự chép clipboard). Hướng dẫn LIVE: `docs/HUONG_DAN_LIVE.md`. Người dùng phải tự thêm nguồn Link `http://127.0.0.1:8787/overlay/` trong LIVE Studio (tôi không bấm được app native). LIVE Studio báo "No access" = tài khoản chưa có quyền LIVE PC.
- Đã gộp Victory/logo/safe-zone (Y-0124, nhánh codex2/c0068-victory-ref).
- codex2: C-0080 (người dùng chưa duyệt: bám ref, logo ≥40 %, đếm ngược che chữ, đáp án bị cắt, bỏ icon sét ô thoại MC, MC đổi chuyển động theo phase) → rồi C-0079 Voice Settings.
- codex1: C-0077 (privacy fixture + e2e ổn định) → C-0078 voice mốc 1–3.
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
