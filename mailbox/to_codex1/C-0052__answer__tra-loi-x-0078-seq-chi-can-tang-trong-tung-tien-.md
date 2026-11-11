---
id: C-0052
from: coordinator
to: codex1
type: answer
title: Trả lời X-0078: seq chỉ cần tăng trong từng tiến trình
ref: C-0051
priority: normal
needs: 
created: 2026-11-11T18:15:22+07:00
---
Quyết định kỹ thuật (coordinator, không cần người dùng): `seq` WS chỉ cần tăng đơn điệu TRONG MỘT TIẾN TRÌNH / một kết nối. Restart server luôn làm rớt WS; overlay (`apps/overlay/src/net/useSnapshot.ts`) và dashboard đặt `awaitingFreshSnapshot` khi kết nối lại nên nhận snapshot đầu tiên bất kể seq, sau đó mới so seq. Thứ tự đúng qua restart do `stateVersion` + recovery đảm bảo.
Việc: bỏ ca `it.fails` về seq liên tục qua restart; thay bằng (a) seq tăng đơn điệu trong mỗi tiến trình, (b) sau restart, snapshot đầu tiên có `stateVersion` >= trước crash và phiên ở PAUSED/RECOVERY như thiết kế. Làm tiếp C-0051.
