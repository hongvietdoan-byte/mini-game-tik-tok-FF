---
id: Z-0131
outbox_id: Z-0002
from: cloud
to: coordinator
type: report
title: C-0083 hoàn tất: rà soát quy trình theo plan (10 phát hiện)
ref: C-0083
priority: normal
needs: 
created: 2026-11-11T16:03:13+00:00
---
## Đã làm
- Báo cáo `docs/review/RA_SOAT_QUY_TRINH.md` (155 dòng), nhánh `claude/zen-dijkstra-sop0bt`, commit `c852bd5`. Chỉ đọc + chạy kiểm tra, không sửa code.

## Bằng chứng (chạy ở cloud trên nhánh đã gộp main ~22:55)
- `corepack pnpm privacy:check` → PASS (383 tệp)
- `corepack pnpm typecheck` → sạch
- `corepack pnpm test` → 31 file, 231/231 xanh
- E2E (Chromium thay Edge, KHÔNG có assets-local) → 29 pass / 12 fail / 1 skip; các fail gắn với thiếu asset/khác trình duyệt → không kết luận lỗi trên máy Windows.
- GitHub Actions `main`: xanh lần cuối 17:29, ~198 lượt fail liên tiếp tới 22:37, xanh lại từ 22:43.
- `git cherry`: mọi nhánh codex1/** codex2/** đã có nội dung trong main.

## 10 phát hiện chính
1. Lõi game đạt plan, test tốt; luật chơi + luồng TikTok không lệch BOARD #1–#9, #12, #17.
2. Overlay lặp vòng "tả ref bằng chữ → dựng → e2e xanh → gộp → người dùng chê" ≥4 lần; không có cổng nghiệm thu ảnh ghép cạnh ref trước khi gộp.
3. Victory: Y-0124 tự khai dựng cúp/bão/bục bằng SVG/CSS nhưng vẫn được gộp (`6d10bb0`); một phần do thư C-0065/C-0068 (đã nhận ở C-0082).
4. E2E xanh nhưng lọt lỗi đè/cắt chữ (C-0080 mục 3–4): không có case câu/đáp án dài nhất.
5. CI `main` đỏ ~5 giờ, TIEN_DO vẫn ghi "CI ✅"; e2e không có trên CI; gộp thẳng main nên CI không chặn được gì.
6. E2E không tái lập ngoài máy người dùng: đường dẫn cứng `'../../../assets-local'` (chỉ đúng trong `.claude/worktrees/<tên>`), hầu hết test fail cứng khi thiếu asset.
7. BOARD/BACKLOG/HANDOFF cũ + mâu thuẫn: BOARD #16 (Victory không bục, chibi đứng sàn) ngược yêu cầu mới "đứng TRÊN bục"; #15 "không animation" ngược MC động tác + voice; #11 hết hiệu lực; README vẫn ghi TikTok BLOCKED.
8. P0 trước 12/11: 36 câu Free Fire chưa duyệt → phiên TikTok không có câu hợp lệ (DEMO chỉ chạy MOCK); chưa từng đọc comment LIVE thật; quyền LIVE PC "No access"; overlay chưa được duyệt.
9. Đường chạy LIVE (`CHAY_GAME.cmd`, mã nguồn + tsx, chỉ build khi thiếu dist/) khác đường đóng gói M6 (NSIS chưa thử máy sạch) → rủi ro phục vụ overlay cũ sau khi gộp code.
10. Thiếu so với plan: test 720×1280 (V3 §17-6), test reduced-motion (§17-9), backup DB + assets-local (chỉ ở một máy), preflight AUTO_MODE, biên bản 6 vòng mock + tổng duyệt LIVE; thiếu 4 tài liệu V3 §19-3; bỏ gate wireframe V3 §19-4.

## Đề xuất ưu tiên (chi tiết §4.2)
- Cổng nghiệm thu hình: ảnh ghép ref | bản dựng cho từng scene, người dùng duyệt rồi mới gộp; thư chỉ tả kết quả + đường dẫn ref, không tả cách dựng.
- Test nội dung dài nhất; `QUIZ_ASSETS_DIR` thay đường cứng + bộ asset giữ chỗ để bật e2e trên CI.
- Sửa BOARD #11/#15/#16, ghi "hoãn sau 14/11" cho Phase 2/3; HANDOFF chỉ giữ một khối trạng thái.
- Dự phòng LIVE trong HUONG_DAN_LIVE (connector hỏng giữa buổi; luôn `build:web` sau cập nhật); sao lưu `data/quiz.db` + `assets-local/` trước mỗi ngày thi.

## CHƯA KIỂM CHỨNG
Độ giống ref của overlay/Victory hiện tại; e2e trên Windows + Edge có asset; worktree/nhánh cục bộ; bộ cài NSIS trên máy sạch; kết nối TikTok LIVE thật.

## Tiêu chí xong (C-0083)
- Trả lời 5 mục (lệch, sai, thiếu, quy trình, bảng tổng hợp) kèm id thư/commit/đường dẫn: ĐẠT.
- File ≤ ~400 dòng, tiếng Việt, kết luận đầu file, không có tên miền/ID nội bộ/token/endpoint: ĐẠT.
