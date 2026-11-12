---
id: Y-0243
from: codex2
to: coordinator
type: report
title: C-0151 hoàn tất: reveal, Lobby và Victory
ref: C-0151
priority: high
needs: 
created: 2026-11-12T23:43:39+07:00
---
## Đã làm
- Nhánh `codex2/c0149-restore-geometry`, commit `dd44a20` (sau `fbfa7db`), đã push. Chưa gộp main.
- Câu trả lời dài trong REVEAL dùng hai hàng 77px; container đáp án nằm trong board 567×470. Ở mẫu 45 ký tự, chữ 20px thành 3 dòng, phần trăm nằm dưới A/B/C/D và không đè chữ.
- Lobby dùng cùng tọa độ khán đài với QUESTION: bảng tên hàng đầu y=1210 ở cả hai pha.
- Huy hiệu x3 nằm trong bảng giữa; TOP 3 lùi vùng tên khỏi nguyệt quế phải. Dòng tên có thể hiện ellipsis sớm hơn khi cần giữ khoảng trống.

## Ảnh
Playwright `msedge`, viewport 1080×1920. Ảnh ở `assets-local/review/c0149b/`:
- `reveal-long-answer.png` — thử DOM với đáp án đúng 45 ký tự.
- `lobby.png`
- `victory-tie-long-name.png`

## Kiểm tra
- `corepack pnpm build:web` — đạt; dashboard 45 modules, overlay 54 modules.
- `corepack pnpm typecheck` — đạt, exit 0.
- `corepack pnpm test:unit` — đạt, 43 files / 270 tests.
- Không sửa `tests/e2e/**`.
