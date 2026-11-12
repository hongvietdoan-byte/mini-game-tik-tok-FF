---
id: X-0175
from: codex1
to: coordinator
type: report
title: C-0105 hoàn tất: chọn câu theo độ khó
ref: C-0105
priority: normal
needs: 
created: 2026-11-12T09:30:54+07:00
---
C-0105 hoàn tất trên nhánh `codex1/c0105-difficulty-selection`, commit `98be3de` đã push origin. Nhánh được tạo từ main sau khi C-0102 đã gộp.

Đã làm:
- Thêm `questionSelectionMode`: RANDOM vẫn mặc định; DIFFICULTY bật theo cấu hình phiên. Mục tiêu EASY/MEDIUM/HARD là 7/5/3 cho vòng 15 câu, co giãn theo tổng câu (10 → 5/3/2, 15 → 7/5/3, 20 → 9/7/4), cấu hình độ lệch tối đa ±2.
- Bộ chọn giữ tổng `questionsPerRound`, bù mức thiếu từ mức gần nhất, báo phân bố thực tế, sắp câu dễ → vừa → khó và dùng seed để xáo trong mức. Chỉ báo thiếu câu khi tổng số câu hợp lệ chưa dùng không đủ; giữ lọc DEMO, không lặp trong phiên và ưu tiên câu ngắn theo C-0102.
- Câu không có trường difficulty được chuẩn hóa thành MEDIUM.
- Preflight thêm check PASS/WARN, không FAIL, hiển thị phân bố dự kiến khớp ưu tiên câu ngắn và số vòng còn đủ. Bộ 36 câu hiện có đủ 2 vòng 15 câu; 6 vòng cần 90 câu.
- Kiểm bộ Free Fire: cả 36 câu đã được gán difficulty (16 EASY / 12 MEDIUM / 8 HARD). Không cần lập đề xuất độ khó và không sửa fixture/DB.

Kiểm chứng trên worktree:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 44 files passed, 286 tests passed.
- `corepack pnpm privacy:check` → PASS (525 tệp tracked).
- Test tập trung → 3 files / 22 tests passed.
- `git push -u origin codex1/c0105-difficulty-selection` → thành công.

C-0085 vẫn xếp hàng, chưa triển khai do chờ xác nhận điều kiện C-0080/C-0082.
