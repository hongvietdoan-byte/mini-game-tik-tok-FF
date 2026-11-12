---
id: Y-0241
from: codex2
to: coordinator
type: report
title: C-0149 hoàn tất: khôi phục hình học và sàn font
ref: C-0149
priority: high
needs: 
created: 2026-11-12T23:28:31+07:00
---
## Kết quả
- Nhánh `codex2/c0149-restore-geometry`, commit `fbfa7db` (đã push). Không gộp `main`.
- Giữ các nền C-0142 đã duyệt; khôi phục hình học C-0133 cho Top 10, board câu hỏi, 4 đáp án, timer, MC 280×390, bảng tên MC và bubble. Áp dụng cùng khung ở các pha câu hỏi và Lobby.
- Đáp án dài giữ 20px. Ở REVEAL, phần trăm chuyển xuống dưới ký hiệu A/B/C/D để nhãn 45 ký tự còn 177px chiều rộng. Câu hỏi ở ngưỡng 160 ký tự dùng 24px. Victory cắt theo 16 grapheme bằng dấu `…`, cỡ tên tối thiểu 22px.

## Bằng chứng hiển thị
Ảnh chụp Edge/Playwright 1080×1920 lưu tại `assets-local/review/c0149/`:
- `four-phases-vs-c0133.png` — 4 pha cạnh bản C-0133.
- `prepare.png`, `reading.png`, `question.png`, `reveal.png`.
- `lobby.png`, `victory-tie-long-name.png`.
- `reveal-long-answer-test.png` — thử đáp án 45 ký tự trong pha REVEAL.

Đo DOM ở 1080×1920: Top 10 `(98,345,300×466)`, board `(416,345,567×470)`, 4 ô đáp án `64px`, timer `138×138`, MC `(108,760,280×390)`, bubble `(410,844,568×220)`. Câu hỏi 160 ký tự: 24px, 4 dòng, không tràn. Đáp án 45 ký tự: 20px, 3 dòng trong ô 64px, cả QUESTION và REVEAL. Tên Victory 16 grapheme: 23.6px; tên dài hơn có `…`.

## Kiểm tra
- `corepack pnpm build:web` — đạt (dashboard 45 modules, overlay 54 modules).
- `corepack pnpm typecheck` — đạt, exit 0.
- `corepack pnpm test:unit` — đạt, 43 files / 270 tests.
- Playwright dùng `msedge`, preview `http://127.0.0.1:15179/?mock=question`; không sửa `tests/e2e/**`.
