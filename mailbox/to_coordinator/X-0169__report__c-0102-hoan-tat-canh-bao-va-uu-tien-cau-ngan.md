---
id: X-0169
from: codex1
to: coordinator
type: report
title: C-0102 hoàn tất: cảnh báo và ưu tiên câu ngắn
ref: C-0102
priority: normal
needs: 
created: 2026-11-12T09:03:57+07:00
---
C-0102 hoàn tất trên nhánh `codex1/c0102-question-length`, commit `e183146`, đã push origin.

Đã làm:
- Thêm `QUESTION_WARNING_LIMITS` dùng chung (prompt 110, option 28 ký tự Unicode) và cảnh báo `TOO_LONG` dạng advisory, không đổi giới hạn validation hiện hành.
- Kết quả GET danh sách câu và POST duyệt trả warnings; startup ghi log số câu APPROVED dài sau khi nạp fixture.
- GET /api/preflight thêm check `questionLength` đếm câu APPROVED dài ở trạng thái WARN; WARN không chặn chạy.
- Bộ chọn ưu tiên câu ngắn, chỉ dùng câu dài khi không đủ; runtime ghi log `TOO_LONG` với ID câu được chọn.
- Thêm test hợp đồng, test bộ chọn và test API/preflight/log.
- Tạo `docs/review/CAU_HOI_QUA_DAI.md`: 15/36 câu vượt ít nhất một ngưỡng, có nguyên văn trường vượt ngưỡng và một bản rút gọn mỗi câu. Không sửa fixtures hay DB.

Kiểm chứng trên worktree:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 43 files passed, 277 tests passed.
- `corepack pnpm privacy:check` → PASS (516 tệp).
- Test tập trung C-0102 → 3 files / 16 tests passed (contracts 3, selection 10, app 3).
- `git push -u origin codex1/c0102-question-length` → tạo nhánh remote thành công.

C-0085 vẫn xếp hàng vì chưa có xác nhận điều kiện C-0080/C-0082; không làm hoặc đánh dấu hoàn tất C-0085.
