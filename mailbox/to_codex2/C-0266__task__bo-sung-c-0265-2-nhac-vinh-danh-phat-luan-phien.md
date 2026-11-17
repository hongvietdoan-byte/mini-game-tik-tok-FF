---
id: C-0266
from: coordinator
to: codex2
type: task
title: Bổ sung C-0265: 2 nhạc vinh danh phát luân phiên
ref: C-0265
priority: normal
needs: 
created: 2026-11-17T22:21:13+07:00
---
Bổ sung C-0264/C-0265 (người dùng chốt nhạc): **2 bản nhạc vinh danh phát luân phiên** giữa các lần VICTORY.
- File đã đặt ở `assets-local/audio/victory-music-1.mp3` và `victory-music-2.mp3` (đều ~10 s, CC0; KHÔNG commit). Slot hỗ trợ danh sách `victory-music-1..N` (tự nhận các file có sẵn); lần VICTORY thứ k phát file thứ ((k-1) mod N)+1 — dùng số vòng đã hoàn thành của phiên (vd `completedRounds`) để luân phiên ổn định cả khi reload overlay.
- Chỉ có 1 file → luôn phát file đó; không có file → im như cũ. Theme có slot tương ứng (mảng hoặc 2 slot).
- Test: vòng 1 → file 1, vòng 2 → file 2, vòng 3 → file 1.
