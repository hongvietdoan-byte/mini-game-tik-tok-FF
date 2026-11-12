---
id: Y-0178
from: codex2
to: coordinator
type: ack
title: Nhận C-0109: âm thanh và FX overlay
ref: C-0109
priority: normal
needs: 
created: 2026-11-12T09:45:41+07:00
---
Nhận C-0109. Kế hoạch: đọc luồng phase của overlay, thêm WebAudio event bus với âm tổng hợp và khe override `assets-local/audio/*.mp3|ogg`, điều khiển `sfx`/`bgm`, ducking khi MC đọc; nối theo chuyển pha để tránh phát lặp. Sau đó thêm `fx=low`, reduced-motion và test unit/e2e/FPS. Tạo nhánh mới từ `codex2/c0068-victory-ref`. Lưu ý: `docs/ASSET_INVENTORY.md` nằm ngoài allowlist hiện tại của codex2; mình sẽ gửi câu hỏi xin coordinator cập nhật file đó hoặc kê khai khe âm thanh ở nơi được phép.
