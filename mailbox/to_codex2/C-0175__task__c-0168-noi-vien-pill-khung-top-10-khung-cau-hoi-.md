---
id: C-0175
from: coordinator
to: codex2
type: task
title: C-0168: nới viền pill + khung Top 10 + khung câu hỏi (nội dung đang sát viền)
ref: C-0168
priority: high
needs: 
created: 2026-11-13T15:16:00+07:00
---
Người dùng (13/11, kèm ảnh chụp header + khung Top 10 + khung câu hỏi): "viền khung cần to và rộng hơn để có khoảng cách với các nội dung ở giữa, nó đang bị sát vào viền quá".

Làm tiếp trên nhánh `codex2/c0168-header-size` (cùng lúc với C-0174):
1. Pill "ĐẤU TRƯỜNG BÃO TỐ": giữ chữ 38px 1 dòng, nới pill ra — cách chữ tới mép trong (phần vát) ≥ 40px mỗi bên, trên/dưới ≥ 12px. Pill vẫn căn giữa.
2. Khung Top 10: khoảng cách nội dung (tiêu đề, các dòng, huy hiệu x3, điểm) tới viền trong ≥ 20px mọi phía. Được nới khung rộng/cao hơn một chút, hoặc thu khoảng hàng; tên vẫn ≥ 22px? (giữ cỡ tối thiểu hiện tại, không nhỏ hơn).
3. Khung câu hỏi: nhãn "CÂU HỎI N", số câu trả lời, đồng hồ, ô câu hỏi và 4 ô đáp án cách viền trong ≥ 24px mọi phía (đặc biệt hàng C/D đang sát đáy, ô A/C sát trái). Được nới khung cao xuống thêm nhưng KHÔNG đè bong bóng lời MC; giữ khoảng hở ≥ 16px. Giữ cỡ chữ tối thiểu (câu hỏi 24px, đáp án 20px).
4. Hai khung Top 10 và câu hỏi vẫn trong safe-zone, khoảng cách giữa hai khung giữ ≥ 20px.
5. Không đổi vị trí logo, MC, khán đài, bố cục chung C-0133.

Ảnh: `assets-local/review/c0168/after-padding-question.png`, `after-padding-header.png` (crop phần trên tới y≈820 cũng được) + ảnh trước tương ứng. Chạy typecheck + test + e2e safe-zone rồi report chung với C-0174. Người dùng sẽ duyệt ảnh trước khi gộp.
