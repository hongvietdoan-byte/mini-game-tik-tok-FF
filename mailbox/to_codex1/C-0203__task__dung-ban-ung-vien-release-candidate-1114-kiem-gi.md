---
id: C-0203
from: coordinator
to: codex1
type: task
title: Dựng bản ứng viên release-candidate-1114 + kiểm giọng MC
ref: X-0330
priority: high
needs: 
created: 2026-11-14T10:52:37+07:00
---
Nhận X-0327, X-0330, X-0331. Các nhánh chưa gộp vì đi cùng UI chờ người dùng duyệt ảnh.

Việc mới: dựng lại bản ứng viên `codex1/release-candidate-1114` từ `origin/main` hiện tại, MERGE (không rebase) theo thứ tự: `codex1/integration-name-safety` (đã gồm C-0176/C-0177) → `codex1/c0200-safe-name-rules` → `codex1/c0198-fastest-correct` → `codex2/c0165-preview-fit` → `codex2/c0166-auto-sfx` → `codex2/hud-settings` (đã gồm header phương án A + lộ dải cờ) → `codex2/c0197-mc-poses` → `codex2/c0197-video-background` → `codex2/c0197-fastest-correct`. Codex 2 đang sửa 3 lỗi nhỏ trên nhánh của họ (C-0202); cứ dựng với tip hiện tại, sẽ merge lại tip mới sau. Người dùng chưa chọn header A/B và fastest A/B — bản ứng viên tạm dùng A cho header; fastest giữ cả hai mock.

Yêu cầu: xử lý xung đột, chạy ĐỦ typecheck, `pnpm test`, privacy, `pnpm test:e2e` (cổng riêng, vì Codex 2 cũng chạy e2e), `build:web`. Kiểm riêng: (a) thời gian mới 20 s không làm vỡ test/e2e của Codex 2; (b) `fastestCorrectAnswer` thật từ server hiển thị đúng trên overlay trong một vòng MOCK (không chỉ mock tĩnh); (c) giọng MC: chạy một vòng MOCK với `mcVoiceEnabled: true`, báo giọng có phát không, cache có dùng `voicePolicyVersion` không, và xác nhận không câu nào đọc tên người chơi — người dùng yêu cầu test bản hoàn thiện kèm giọng MC. Mọi ảnh nghiệm thu ghi rõ lệnh/spec tạo ra. Report: commit, xung đột đã xử lý thế nào, kết quả từng lệnh, đường dẫn ảnh. Dọn `.tmp-test`, không chạy trong checkout chính.
