# HANDOFF — phiên coordinator (cập nhật 11/11/2026 ~16:40)

**PHIÊN KẾ (điều phối quiz TikTok sau nén) — ĐÃ NHẬN 11/11 (sau nén).**

Vòng ngữ cảnh: `.claude/settings.json` (cục bộ) đặt `CLAUDE_CODE_AUTO_COMPACT_WINDOW=350000` + hook SessionStart `py -X utf8 tools/session_handoff.py` → tự nén ở ~70 % rồi nạp lại file này. Khi context ~70 %: cập nhật file này, đổi dòng in đậm trên thành `— ĐỌC ĐẦU TIÊN.`, commit + push. KHÔNG clear/archive/mở phiên mới cho phiên chính.

Phiên trước đầy context. Phiên mới: **chỉ điều phối** (memory `coordinator-delegate-not-code`) — giao code cho Codex qua hòm thư, rà report, gộp nhánh.

## Bắt đầu phiên mới
1. Đọc: `mailbox/README.md`, `mailbox/BOARD.md` (phân làn + quyết định chốt #1–#17), `docs/TIEN_DO.md` (mốc + giờ), file này.
2. `py tools/mb.py status` → `py tools/mb.py read --for coordinator` → rà report (chạy lại `corepack pnpm typecheck && corepack pnpm test`, e2e nếu đụng overlay) → gộp.
3. Gộp nhánh Codex trong worktree riêng hoặc gộp nhanh rồi push ngay (mb.py của Codex `pull --rebase` ở checkout chính). Build overlay trong Git Bash phải `MSYS_NO_PATHCONV=1`.
4. Đặt `py tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền để được đánh thức khi có thư.

## Trạng thái main (`3efe50c`, 182 test + e2e 17 xanh)
- Engine/server/persistence/khôi phục/WS, Connection Manager, kiểm tra hệ thống 9 bước, bộ cài Electron NSIS, 35 ghế khán giả (server), TikTok adapter `tiktok-live-connector` (dùng tạm, chỉ đọc), API duyệt câu hỏi.
- **Tính điểm Kahoot mặc định** (500–1000/câu + chuỗi tới +500; `scoringMode` CLASSIC còn chọn được); **huy hiệu Top 1 liên tiếp** `top1Streak` (x2, x3…).
- Overlay V3 (coordinator dựng nhanh): `apps/overlay/src/v3/` — đang được Codex 2 **thiết kế lại cho giống ảnh mẫu** (C-0032).
- Asset cục bộ NGOÀI git ở `assets-local/` (phục vụ `/assets/`): Kelly, 66 chibi + manifest, cúp + phông vinh danh. Ảnh mẫu người dùng nên đặt `assets-local/ref/storm-arena-ref.png`.
- Server xem thử có thể còn chạy ở `http://127.0.0.1:8790/` (dữ liệu tạm trong scratchpad) — tắt nếu cần cổng.

## Hàng chờ Codex
| Làn | Thư | Việc |
|---|---|---|
| codex2 | C-0021 → C-0024 | Setup Wizard → giao diện phiên TikTok + duyệt câu (+ ô `speedBonusMax`, C-0031) |
| codex2 | C-0032 (+C-0033) | Thiết kế lại overlay V3 giống mẫu + tối ưu fps + 3 cảnh còn lại + sửa Top 10 đè tên/điểm |
| codex2 | C-0030 | Trình phát PNG Sequence cho MC (frame người dùng làm sau, đặc tả `docs/ASSET_SPEC_MC_SEQUENCE.md`) |
| codex1 | DP6, C-0027 | Test duyệt câu hỏi; test tải 2000 người + kiểm thử V3 §17 |
| codex1 | C-0034 | Tách nền sạch toàn bộ chibi + Kelly + cúp bằng rembg (venv `.claude/venv-rembg`), bảng soát cho người dùng duyệt |

## Đang chờ người dùng
- Duyệt 36 câu Free Fire (`docs/review/DE_XUAT_CAU_HOI_FF.md`) — phiên TikTok chỉ dùng câu đã duyệt.
- Phát LIVE thử (cho biết @username) để kiểm bình luận thật.
- Luật chuỗi (CLASSIC) đạt lại mốc có thưởng lại không — nay mặc định Kahoot nên ít quan trọng.
- Quyền dùng asset (Kelly, 66 chibi, cúp) trước khi đóng gói vào bộ cài; bộ chibi quay lưng nếu muốn y mẫu.
- Gửi thư đề nghị kênh chính thức TikTok (`docs/TIKTOK_OFFICIAL_REQUEST.md`).
