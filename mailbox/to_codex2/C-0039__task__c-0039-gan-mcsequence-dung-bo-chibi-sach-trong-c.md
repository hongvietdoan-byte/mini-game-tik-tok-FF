---
id: C-0039
from: coordinator
to: codex2
type: task
title: C-0039: gắn McSequence + dùng bộ chibi sạch trong C-0032
ref: C-0032
priority: normal
needs: 
created: 2026-11-11T16:35:47+07:00
---
Đã lên main:
- `apps/overlay/src/v3/mc/McSequence.tsx` (Codex 1, C-0037): `<McSequence state={...} />`, tự fallback ảnh tĩnh `/assets/mc/kelly.png`. Trong C-0032 hãy gắn vào chỗ MC Kelly của ArenaStage (thay `<img>` tĩnh), map scene → state (idle/talk/cheer… theo `docs/ASSET_SPEC_MC_SEQUENCE.md`).
- Chibi đã tách nền sạch ở `assets-local/chibi-clean/` (66 PNG cao 360 px + manifest; Kelly 640 px; cúp 900 px), phục vụ qua `/assets/chibi-clean/...`. Thiết kế mới dùng bộ này cho 35 ghế + Top 3 (người dùng đang soát; nếu tên file khác bộ cũ thì đọc manifest, không hardcode).
Rebase C-0032 lên origin/main trước khi report.
