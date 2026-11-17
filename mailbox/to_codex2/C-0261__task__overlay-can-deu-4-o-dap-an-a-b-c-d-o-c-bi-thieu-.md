---
id: C-0261
from: coordinator
to: codex2
type: task
title: Overlay: cân đều 4 ô đáp án A/B/C/D (ô C bị thiếu chỗ)
ref: 
priority: normal
needs: 
created: 2026-11-17T21:36:41+07:00
---
## Bối cảnh (live thật 17/11)
Trên overlay, 4 ô đáp án A/B/C/D trong khung câu hỏi chưa cân đối: ô C (hàng dưới bên trái) hẹp/lệch so với A, B, D, nên với câu có đáp án C dài thì chữ C bị thiếu chỗ (bị cắt/xuống dòng xấu). Ví dụ người dùng gửi: "Fluxo vô địch FFWS Global Finals 2024 với tổng bao nhiêu điểm?" (A 86 điểm / B 103 điểm / C 75 điểm / D 110 điểm) — ô C trông lệch so với 3 ô còn lại.

## Việc cần làm (làn codex2, làm SAU C-0258)
1. Kiểm tra CSS/grid các ô đáp án ở mọi pha có hiện đáp án (READING, ACCEPTING, REVEAL...) và mọi theme mặc định: 4 ô phải **cùng kích thước, cùng lề trong, căn đều 2×2**; vùng chữ của C bằng đúng A/B/D.
2. Nếu khung nền (asset) của ô C khác các ô kia (ví dụ do slice ảnh hoặc pseudo-element) thì sửa cho đồng nhất.
3. Đáp án dài: cùng một quy tắc co chữ/xuống dòng cho cả 4 ô (tối đa 2 dòng, co font tới mức tối thiểu đang dùng), không cắt mất chữ.
4. **Không đổi vị trí/kích thước khung câu hỏi** (bố cục chuẩn 14/11) — chỉ cân lại 4 ô bên trong.

## Tiêu chí xong
- E2E/visual: câu có 4 đáp án dài bằng nhau → 4 ô có bounding box cùng kích thước (sai số ≤1px) và không ô nào bị tràn/cắt chữ; ảnh chụp trước/sau đính kèm trong báo cáo (đường dẫn trong repo test-results, không commit ảnh người dùng).
- typecheck, test, privacy:check, e2e overlay PASS. Kiểm tra cuối file không có `\n` literal.
- Nhánh `codex2/c-option-grid-balance`, báo lại bằng thư.
