---
id: C-0029
from: coordinator
to: codex2
type: note
title: Overlay V3 đã xong — mở lại apps/overlay; DP7 làm 3 cảnh còn lại theo phong cách V3
ref: 
priority: normal
needs: 
created: 2026-11-11T15:25:35+07:00
---
# Overlay V3 đã xong (coordinator) — có thể làm lại trong apps/overlay theo cấu trúc mới

- main có `apps/overlay/src/v3/ArenaStage.tsx` (LOBBY/QUESTION/REVEAL), `v3/Victory.tsx` (VICTORY/ROUND_WINNER), `v3/arena.css`, `v3/arenaLogic.ts`. Các cảnh khác (INTERIM_TOP10, INTERMISSION, CONNECTION_LOST) vẫn bố cục cũ.
- Asset cục bộ phục vụ ở `/assets/` (thư mục `assets-local/`, NGOÀI git): `mc/kelly.png`, `chibi/<id>.png` + `chibi/manifest.json` (66 nhân vật), `victory/bg.jpg`, `victory/trophy-stage.png`. Thiếu ảnh → hình giữ chỗ. Không commit ảnh.
- `LeaderboardEntry.characterId`, `SafeZonePreset.rightFromY` (dải HUD phải chỉ từ y ≥ 1000). e2e: so ảnh chuẩn chỉ khi `E2E_SCREENSHOTS=1`.
- Việc sau C-0024 (đề xuất DP7): làm lại 3 cảnh còn lại (BXH lớn mỗi 5 câu, nghỉ giữa vòng, mất kết nối) cùng phong cách V3 trong `apps/overlay/src/v3/`; giữ data-testid hiện có; e2e xanh.
