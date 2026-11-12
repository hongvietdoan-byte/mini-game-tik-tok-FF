---
id: C-0105
from: coordinator
to: codex1
type: task
title: C-0105 Chọn câu theo độ khó, số lượng linh hoạt quanh 7/5/3 (làm sau C-0102)
ref: 
priority: normal
needs: 
created: 2026-11-12T09:03:38+07:00
---
Người dùng chốt 12/11: **chọn câu theo độ khó, nhưng số lượng linh hoạt — KHÔNG cố định 7/5/3**. Làm SAU C-0102 (cùng vùng code chọn câu), nhánh `codex1/c0105-difficulty-selection`, được sửa `packages/**` và `apps/server/**`.

Yêu cầu:
1. Chế độ chọn câu mới theo độ khó (dễ/vừa/khó). 7/5/3 chỉ là **mục tiêu**, không phải điều kiện: mỗi mức được lệch ±2 (đặt ở cấu hình: mục tiêu từng mức + độ lệch cho phép), tổng luôn đúng `questionsPerRound`.
2. Khi kho câu đã duyệt của một mức không đủ: lấy bù từ mức gần nhất (khó thiếu → lấy vừa; dễ thiếu → lấy vừa), ghi rõ phân bố thực tế. Chỉ từ chối bắt đầu vòng khi TỔNG số câu hợp lệ chưa dùng < `questionsPerRound` (như hiện nay) — không bao giờ từ chối chỉ vì lệch độ khó.
3. Thứ tự trong vòng: dễ → vừa → khó (trong mỗi mức xáo ngẫu nhiên có seed). Vẫn giữ: không lặp câu trong phiên, loại DEMO theo mode, ưu tiên câu không quá dài (C-0102).
4. Câu chưa gán độ khó: coi là "vừa". Kiểm bộ 36 câu Free Fire đã có trường độ khó chưa; nếu chưa, đề xuất độ khó cho từng câu trong `docs/review/DE_XUAT_DO_KHO.md` để người dùng duyệt — không tự ghi vào DB.
5. Preflight thêm một dòng (PASS/WARN, không FAIL) cho biết phân bố dự kiến của vòng tới, ví dụ "6 dễ / 6 vừa / 3 khó (mục tiêu 7/5/3)". Với 36 câu hiện có, 6 vòng × 15 = 90 câu là không đủ: preflight phải báo còn đủ cho bao nhiêu vòng.
6. Chế độ RANDOM hiện tại giữ nguyên và vẫn là mặc định cho tới khi người dùng bật chế độ mới (tham số cấu hình phiên; không cần UI — codex2 làm sau).

Test: đủ kho → đúng mục tiêu; thiếu một mức → bù đúng hướng, tổng đủ; lệch tối đa; seed cho kết quả lặp lại; 6 vòng liên tiếp không lặp câu. Typecheck + test + privacy xanh trên cây đã commit.
