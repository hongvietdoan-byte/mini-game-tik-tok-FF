# HANDOFF — phiên coordinator (cập nhật 11/11/2026 ~16:40)

**PHIÊN KẾ (điều phối quiz TikTok sau nén) — ĐÃ NHẬN 11/11 (sau nén).**

Vòng ngữ cảnh: `.claude/settings.json` (cục bộ) đặt `CLAUDE_CODE_AUTO_COMPACT_WINDOW=350000` + hook SessionStart `py -X utf8 tools/session_handoff.py` → tự nén ở ~70 % rồi nạp lại file này. Khi context ~70 %: cập nhật file này, đổi dòng in đậm trên thành `— ĐỌC ĐẦU TIÊN.`, commit + push. KHÔNG clear/archive/mở phiên mới cho phiên chính.

Phiên trước đầy context. Phiên mới: **chỉ điều phối** (memory `coordinator-delegate-not-code`) — giao code cho Codex qua hòm thư, rà report, gộp nhánh.

## Bắt đầu phiên mới
1. Đọc: `mailbox/README.md`, `mailbox/BOARD.md` (phân làn + quyết định chốt #1–#17), `docs/TIEN_DO.md` (mốc + giờ), file này.
2. `py tools/mb.py status` → `py tools/mb.py read --for coordinator` → rà report (chạy lại `corepack pnpm typecheck && corepack pnpm test`, e2e nếu đụng overlay) → gộp.
3. Gộp nhánh Codex trong worktree riêng hoặc gộp nhanh rồi push ngay (mb.py của Codex `pull --rebase` ở checkout chính). Build overlay trong Git Bash phải `MSYS_NO_PATHCONV=1`.
4. Đặt `py tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền để được đánh thức khi có thư.

## Trạng thái (11/11 ~19:10) — main ≈ `1cb2dbc`, 214 test + e2e 28 xanh
- Đã gộp: Setup Wizard + phiên TikTok + duyệt câu (C-0021/24), test V3/tải (C-0027/36), dashboard e2e (C-0040), replay TikTok (C-0043), soak 60' (C-0051), McSequence (C-0037), cutout tool (C-0034/44), overlay V3 redesign (C-0032).
- Coordinator tự sửa: lỗi "Failed to retrieve Room ID" → coi như chưa LIVE, không retry dồn (f485321).
- Asset cục bộ (ngoài git): `assets-local/chibi/` = bộ ĐÃ tách nền (bộ cũ ở `_backup/chibi-old-chua-sach/`); `mc/kelly.png` (rembg 17:18, người dùng "tạm được"); `mc/kelly/{idle,welcome,ask,react,celebrate}/` chờ frame; `brand/logo.png` = logo chính thức BVĐC; `cards/the-chien-dau-ffvn-kelly.png` = chuẩn khung; `ref/victory-ref.png` = mẫu Victory. Server soát ảnh: `py -m http.server 8791 --directory assets-local`.

## Hàng chờ Codex
| Làn | Thư | Việc |
|---|---|---|
| codex2 | C-0056 → C-0054 → C-0055 | HUD mô phỏng phải là UI LIVE (không phải video) + safe zone; sửa Top10 cắt tên/hụt hàng 10, dòng "đang chờ chỗ" đè ghế; Victory: 3 chibi TOÀN THÂN đứng TRÊN bục như `ref/victory-ref.png`, bảng tên lục giác dưới chân |
| codex1 | C-0053 | Sửa `tests/load/audience.test.ts` (2000 CORRECT, Kahoot) — Codex 1 có thể chưa đọc, người dùng nhắc |
| — | — | Hết việc: Codex gửi note "rảnh"; DP1/2/4 đã xong (BOARD) |

## Đang chờ người dùng
- Ảnh chụp màn hình phòng LIVE TikTok thật (góc nhìn người xem) → `assets-local/ref/tiktok-live-*.png` để căn safe zone.
- Duyệt 36 câu Free Fire (`docs/review/DE_XUAT_CAU_HOI_FF.md`); phát LIVE thử (@username); quyền asset; frame PNG Sequence MC; khung trống thẻ chiến đấu (nếu có).
