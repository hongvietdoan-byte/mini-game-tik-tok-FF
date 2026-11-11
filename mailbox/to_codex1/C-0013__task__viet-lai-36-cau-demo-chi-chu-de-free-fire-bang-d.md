---
id: C-0013
from: coordinator
to: codex1
type: task
title: Viết lại 36 câu DEMO: chỉ chủ đề Free Fire + bảng đề xuất cho người dùng duyệt
ref: 
priority: high
needs: 
created: 2026-11-11T11:47:02+07:00
---
# Viết lại bộ câu DEMO: chỉ chủ đề Free Fire (người dùng yêu cầu)

Người dùng: bộ câu hỏi chỉ liên quan đến **Free Fire** — không có địa lý, toán, động vật… Thư C-0001 của coordinator đã yêu cầu sai ("kiến thức chung, không dính Free Fire"); thư này thay thế yêu cầu đó.
Làm **ngay sau C-0003**, nhánh `codex1/c0014-ff-questions` từ origin/main.

## Phạm vi file
`fixtures/questions.ts`, `fixtures/fixtures.test.ts`, và tạo `docs/review/DE_XUAT_CAU_HOI_FF.md` (bảng để người dùng duyệt).

## Nội dung
- Thay toàn bộ 36 câu bằng câu về **kiến thức game Free Fire** ổn định, ít thay đổi theo bản cập nhật. Gợi ý chủ đề (subtopicId):
  - `ff-che-do` chế độ chơi (Clash Squad là 4 đấu 4 theo hiệp, Battle Royale…),
  - `ff-ban-do` bản đồ (Bermuda, Purgatory, Kalahari…),
  - `ff-vat-pham` vật phẩm / vũ khí / trang bị cơ bản (keo băng, hộp y tế, mũ/áo giáp cấp…),
  - `ff-thuat-ngu` thuật ngữ thi đấu (booyah, bo, airdrop, hồi sinh…),
  - `ff-tong-quan` tổng quan game (nhà phát hành Garena, nền tảng di động…).
- **KHÔNG** viết câu về giải Bá Vương Đại Chiến (đội, tuyển thủ, lịch, kết quả, giải thưởng) — các dữ kiện giải đấu chỉ được dùng khi người dùng duyệt nguồn.
  Không dùng tên người thật. Không lấy gì từ Megasheet.
- Tránh chỉ số dễ đổi theo patch (sát thương, tốc độ bắn, kỹ năng nhân vật cụ thể, giá kim cương). Câu nào không chắc chắn → **đừng viết**, chọn câu khác.
- Giữ cấu trúc: id `demo-001…036`, `verificationStatus: 'DEMO'`, `approvalStatus: 'APPROVED'` (chỉ để engine chạy MOCK; overlay luôn gắn nhãn DEMO), 16 EASY / 12 MEDIUM / 8 HARD,
  đáp án đúng phân bố đều o1..o4, 4 đáp án cùng loại, ≥ 2 prompt dài 180–220 ký tự, ≥ 2 đáp án ~80 ký tự, `explanation` ngắn, `tags: ['demo', 'free-fire']`.
- `DEMO_PACK = { id: 'demo', name: 'Gói DEMO — Free Fire (đề xuất, chờ người dùng duyệt)' }`.

## fixtures.test.ts
- Bỏ kiểm tra cấm chữ "Free Fire". Giữ kiểm tra cấm "Bá Vương", "BVĐC" và tên 8 đội (danh sách trong `docs/HANDOFF.md`).
- Thêm kiểm tra: mọi câu có tag `free-fire`, subtopicId bắt đầu bằng `ff-`.

## docs/review/DE_XUAT_CAU_HOI_FF.md (cho người dùng duyệt)
Bảng: id · chủ đề · độ khó · câu hỏi · A/B/C/D · đáp án đúng · giải thích · **mức chắc chắn** (Cao/TB) + 1 dòng lý do nếu TB.
Đầu file ghi rõ: "Đây là ĐỀ XUẤT. Người dùng sửa / chọn / duyệt; câu chưa duyệt chỉ chạy ở chế độ MOCK với nhãn DEMO."

## Tiêu chí xong
typecheck + `corepack pnpm test` xanh, push nhánh, report liệt kê số câu theo chủ đề + các câu mức TB.
