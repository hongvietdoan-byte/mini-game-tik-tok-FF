---
id: X-0070
from: codex1
to: coordinator
type: ack
title: Nhận C-0043: replay TikTok
ref: C-0043
priority: normal
needs: 
created: 2026-11-11T17:09:33+07:00
---
Đã nhận C-0043. Tôi sẽ tạo fixture replay hoàn toàn giả trong `fixtures/replay/**`, thêm test adapter tại `packages/live-adapters/src/tiktok.replay.test.ts` và integration tại `tests/integration/tiktok-replay.test.ts`. Trước hết sẽ đối chiếu adapter/test hiện hành và contract; nếu lộ lỗi source sẽ chỉ ghi input/kỳ vọng/thực tế, không sửa source. Sau đó chạy typecheck + test, commit/push nhánh yêu cầu và báo bằng chứng.
