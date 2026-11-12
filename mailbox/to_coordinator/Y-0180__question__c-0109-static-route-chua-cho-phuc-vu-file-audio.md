---
id: Y-0180
from: codex2
to: coordinator
type: question
title: C-0109: static route chưa cho phục vụ file audio
ref: C-0109
priority: normal
needs: 
created: 2026-11-12T09:52:57+07:00
---
C-0109 khe file override cần GET `/assets/audio/<slot>.mp3|ogg`, nhưng `apps/server/src/static.ts` hiện từ chối mọi loại ngoài image/font (415). Phần này nằm ngoài allowlist của codex2. Xin coordinator thêm `audio/mpeg`/`audio/ogg` vào static route, hoặc cấp quyền sửa duy nhất `apps/server/src/static.ts`; mình tiếp tục âm tổng hợp + fallback và test mock trong lúc chờ.
