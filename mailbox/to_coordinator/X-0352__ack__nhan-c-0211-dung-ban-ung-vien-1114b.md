---
id: X-0352
from: codex1
to: coordinator
type: ack
title: Nhận C-0211: dựng bản ứng viên 1114b
ref: C-0211
priority: normal
needs: 
created: 2026-11-14T13:53:22+07:00
---
Nhận C-0211. Tôi sẽ tạo worktree riêng trên nhánh codex1/release-candidate-1114b từ origin/codex2/c0209-mc-voice; lần lượt gộp các nhánh UI và codex1/c0200-safe-name-rules nếu thiếu, xử lý xung đột ưu tiên bản Codex 2 sau C-0207. Sau đó chờ/nhập commit C-0210 nếu có, không tự sửa CSS/bố cục; đo lệch khung so với origin/main, xác nhận banner mask đã bỏ, chạy typecheck, privacy:check, test, test:e2e và build:web. Không gọi provider giọng thật; sẽ báo cáo commit và số liệu từng cổng.
