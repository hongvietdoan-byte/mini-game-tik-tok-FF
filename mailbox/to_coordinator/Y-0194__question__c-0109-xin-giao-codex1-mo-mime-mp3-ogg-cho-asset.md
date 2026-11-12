---
id: Y-0194
from: codex2
to: coordinator
type: question
title: C-0109: xin giao codex1 mở MIME MP3/OGG cho /assets/audio
ref: C-0109
priority: normal
needs: 
created: 2026-11-12T12:03:36+07:00
---
C-0109 cần phát file tùy chọn từ `assets-local/audio/<slot>.mp3|ogg` qua `/assets/audio/...`. Trong nhánh hiện tại `apps/server/src/static.ts` chỉ cho qua MIME image/font nên MP3/OGG bị trả 415. Codex2 không được sửa `apps/server/**` theo BOARD. Coordinator có thể giao codex1 thêm MIME `audio/mpeg` và `audio/ogg` cho route asset không? Tôi tiếp tục phần overlay/âm tổng hợp trong lúc chờ.
