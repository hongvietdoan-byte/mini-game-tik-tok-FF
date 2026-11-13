---
id: C-0188
from: coordinator
to: codex1
type: task
title: Nhánh tích hợp name-filter + name-moderation (+hud-config) và QA Phase D
ref: C-0177
priority: high
needs: 
created: 2026-11-13T18:46:42+07:00
---
Chuẩn bị nhánh tích hợp để coordinator gộp main ngay khi người dùng duyệt ảnh. KHÔNG push main, KHÔNG rebase (chỉ merge).

## Việc
1. Tạo nhánh `codex1/integration-name-safety` từ `origin/main` mới nhất (C-0184 sẽ vào main trong ít phút — nếu chưa có thì merge `origin/codex1/test-temp-cleanup` trước). Merge lần lượt: `origin/codex1/name-filter` → `origin/codex2/name-moderation` (@ `929a8a0`). Giải quyết xung đột, giữ đúng hành vi của từng nhánh.
2. Nhánh codex2 đang có validator cục bộ khớp schema C-0181 (vì chưa có export trong `@quiz/contracts`). Sau khi merge: cho dashboard dùng thẳng schema của `@quiz/contracts`, bỏ bản trùng. Đây là ngoại lệ được phép sửa `apps/dashboard/**` trong task này; không đổi giao diện/chữ/bố cục.
3. Mọi test mới của hai nhánh dùng helper `.tmp-test/` của C-0184 (không còn `os.tmpdir()`).
4. Chạy đủ: typecheck, `pnpm test`, privacy:check, `build:web`, toàn bộ e2e (đặt `QUIZ_ASSETS_DIR` trỏ `assets-local` của checkout chính, cổng riêng). Codex2 báo `build:web` bước overlay từng bị `EPERM` khi Vite dọn `apps/overlay/dist/assets` — tìm nguyên nhân (tiến trình giữ file?) và ghi lại.
5. Phase D đặc tả (mục 13): chạy 1 vòng mô phỏng đông người (≥500 người, có tên sạch + tên vi phạm + tên trùng thực thể bảo vệ, đổi tên giữa trận, ẩn tay giữa trận, reconnect overlay) trên nhánh tích hợp bằng API thật (không mock dashboard). Xác nhận bằng script: không message WS công khai nào chứa tên gốc bị gắn cờ hoặc mã TikTok; điểm/thứ hạng không đổi so với cùng seed khi tắt lọc; TTS spy = 0 trường danh tính.
6. Sau đó (tách commit): merge thêm `origin/codex1/hud-config` vào cùng nhánh tích hợp nếu không xung đột lớn; nếu xung đột ở contracts thì giải quyết và ghi chú.

## Bàn giao
Report: danh sách xung đột + cách xử lý, số liệu test/e2e, kết quả Phase D (số người, số tên bị che theo từng mức, bằng chứng không lộ), commit cuối. Dòng "Dọn dẹp: …" theo quy tắc mới. Không tự nhận việc khác sau task này.
