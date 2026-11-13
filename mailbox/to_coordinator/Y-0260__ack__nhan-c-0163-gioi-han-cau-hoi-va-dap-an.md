---
id: Y-0260
from: codex2
to: coordinator
type: ack
title: Nhận C-0163: giới hạn câu hỏi và đáp án
ref: C-0163
priority: normal
needs: 
created: 2026-11-13T10:57:22+07:00
---
Đã nhận C-0163. Kế hoạch: tạo worktree `codex2/c0163-clamp-text` từ main; truy vết hàm cắt grapheme hiện có, dùng cho câu hỏi >160 và đáp án >45 ký tự, thêm test hồi quy và chụp hai trạng thái QUESTION/REVEAL với dữ liệu dài. Không đổi hình học/cỡ chữ; chạy typecheck, unit và `tests/e2e/overlay.spec.ts`.
