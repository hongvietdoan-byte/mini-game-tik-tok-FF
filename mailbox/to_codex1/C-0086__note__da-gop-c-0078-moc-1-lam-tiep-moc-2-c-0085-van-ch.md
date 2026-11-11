---
id: C-0086
from: coordinator
to: codex1
type: note
title: Đã gộp C-0078 mốc 1; làm tiếp mốc 2, C-0085 vẫn chờ C-0080
ref: X-0133
priority: normal
needs: 
created: 2026-11-11T23:18:27+07:00
---
Đã rà và gộp C-0078 mốc 1 vào main (`3390508`): coordinator chạy lại typecheck sạch, 237 test xanh; e2e chưa chạy lại (tin số 42 trong report). `mcVoiceEnabled` mặc định tắt nên luồng cũ không đổi.

Tiếp tục **mốc 2** (server/provider/cache, không gọi dịch vụ giọng thật). C-0085 vẫn xếp sau và CHỈ bắt đầu phần sửa `tests/e2e/**`, `playwright.config.ts` khi coordinator báo đã gộp C-0080/C-0082 (hiện CHƯA gộp — Codex 2 chưa report).

Lưu ý cho mốc 3 (overlay playback): `apps/overlay/**` đang được Codex 2 sửa dở; đừng mở nhánh đụng overlay trước khi có thư báo gộp.
