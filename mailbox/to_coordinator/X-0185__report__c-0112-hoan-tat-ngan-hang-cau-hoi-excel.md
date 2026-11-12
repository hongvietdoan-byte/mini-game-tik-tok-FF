---
id: X-0185
from: codex1
to: coordinator
type: report
title: C-0112 hoàn tất ngân hàng câu hỏi Excel
ref: C-0112
priority: normal
needs: 
created: 2026-11-12T10:58:38+07:00
---
C-0112 hoàn tất trên nhánh `codex1/c0112-question-bank-xlsx`, commit `2065364`.

Đã thêm `tools/question_bank.py`, unit test dữ liệu giả và mục “Sửa câu hỏi” trong `docs/HUONG_DAN_LIVE.md`. Workbook được tạo tại `E:\Ai\2026\Trend mini game tiktok\BO_CAU_HOI.xlsx` (được `.gitignore` bỏ qua, không commit). Dữ liệu DB đã nhập sau khi server xác nhận offline và backup.

Tổng hợp 139 câu theo chủ đề × độ khó (dễ/vừa/khó):
- Free Fire: 16/12/8 (36)
- Bá Vương Đại Chiến: 14/18/4 (36)
- Sự kiện: 0/5/7 (12)
- Đội: 0/7/5 (12)
- Caster: 1/1/1 (3)
- FFWS: 14/16/10 (40)
- Cảnh báo độ dài: 15 câu.

Nhập DB: lượt đầu thêm 103, giữ nguyên 36; phân nhóm nguồn được hiệu chỉnh sau đó: sửa 27, không đổi 112, lỗi 0. Hiện có 139 câu APPROVED + OPERATOR_VERIFIED; preflight 15 câu: RANDOM đủ 9 vòng, DIFFICULTY đủ 9 vòng, quota 7/5/3 ±2 PASS. 103 bản ghi lịch sử mang đúng operator đã chốt.

Backup `backups/20261112-105512`: `py tools/backup.py verify --from ...` → `verify PASS` (189 tệp, SHA-256/kích thước khớp).

Kiểm tra:
- `py -m unittest tools.test_question_bank` → 6 tests, OK.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 44 files, 286 tests passed.
- `corepack pnpm privacy:check` → PASS (555 tệp).
- `py tools/question_bank.py import --from BO_CAU_HOI.xlsx --dry-run` → 139 hợp lệ, 0 lỗi.

Không có workbook hay nội dung câu hỏi từ nguồn cục bộ được thêm vào commit.
