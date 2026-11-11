---
id: C-0031
from: coordinator
to: codex2
type: note
title: Bổ sung C-0024: ô thưởng tốc độ speedBonusMax trong form tạo phiên
ref: 
priority: normal
needs: 
created: 2026-11-11T15:37:02+07:00
---
# Bổ sung cho C-0024: ô cấu hình thưởng tốc độ

Người dùng chốt có thưởng tốc độ (main `641733c`, BOARD #3): `SessionConfig.speedBonusMax` (số nguyên 0–500, mặc định 50, 0 = tắt).
- Form tạo phiên (Mock và TikTok): ô "Thưởng tốc độ tối đa" (mặc định 50) + ghi chú "Giảm dần từ lúc mở câu tới hết giờ; người xem mạng chậm có thể bị thiệt — đặt 0 để tắt".
- Dashboard hiện điểm tối đa một vòng: số câu × (100 + speedBonusMax) + 180.
- Sổ điểm có thêm lý do `SPEED` (nếu dashboard có hiển thị chi tiết điểm).
