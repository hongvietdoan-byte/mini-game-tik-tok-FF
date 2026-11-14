---
id: C-0222
from: coordinator
to: codex2
type: task
title: Top10 giua vong: bong bong MC ngang to
ref: C-0221
priority: high
needs: 
created: 2026-11-14T21:52:28+07:00
---
Tiếp trên nhánh `codex2/c0214-user-mockup` (66e8485). Người dùng ĐÃ DUYỆT ảnh C-0221 (Kelly bán thân màn câu hỏi/nhanh nhất; cụm Kelly Top 10 giữa vòng sát bảng). Không đụng lại những phần đó.

## Việc: Top 10 giữa vòng — bong bóng lời MC phải NGANG, TO như các màn khác
Người dùng: "top 10 giữa vòng thì cho khung text ngang to giống các phần khác đi, cho bé ở dưới để làm gì đâu".
- Hiện tại bong bóng nhỏ (~224px rộng, chữ nhỏ 3 dòng) nằm DƯỚI ảnh Kelly ở góc phải.
- Sửa: giữ ảnh Kelly + bảng tên đúng vị trí C-0221 (góc phải, mép trên y=1138, mép phải x=968, bán thân). Bong bóng chuyển sang NẰM NGANG BÊN TRÁI Kelly, cùng hàng với ảnh Kelly:
  - mép trái thẳng mép trái bảng Top 10 (x≈115), mép phải cách ảnh Kelly ~12–20px, đuôi bong bóng chỉ sang phải về phía Kelly;
  - chiều cao, viền, nền, cỡ chữ, kiểu chữ GIỐNG bong bóng màn câu hỏi (145px cao, chữ nghiêng vàng/trắng như "Trả lời bằng cách comment…");
  - căn giữa theo chiều dọc với ảnh Kelly.
- Bảng Top 10, header, nền giữ nguyên. Không đổi màn khác.

## Nộp
- `top10-mid-round.png` 1080×1920 + số đo hộp bong bóng/ảnh Kelly/bảng tên, ở `.claude/review/C0222/`.
- Kiểm vùng an toàn TikTok: báo rõ bong bóng mới có giao comment rail/HUD không (nếu có, ghi px, chỉ ngoại lệ đúng phần tử đó).
- typecheck, test, e2e. Không gộp main.
