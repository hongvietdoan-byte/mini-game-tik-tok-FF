---
id: C-0384
from: coordinator
to: codex1
type: note
title: Bổ sung C-0382 việc E: xoá ngai cũ khi mở sảnh + header sảnh đúng số vòng
ref: C-0382
priority: high
needs: 
created: 2026-11-21T21:56:18+07:00
---
# Bổ sung C-0382 — việc E: sảnh vòng mới (người dùng chốt 21/11)

Làm sau việc D, cùng nhánh `codex1/c-sau-live-server`, commit riêng.

## E1. Xoá ngai cũ khi mở sảnh
- Live 21/11: ở sảnh trước vòng 10, ngai vẫn hiện chủ ngai vòng 9 ("Việt 10.157 ĐIỂM"). Người dùng chốt: **xoá ngai cũ**.
- Nguyên nhân: ngai chỉ được đặt lại ở `ROUND_STARTED` (`runtime.ts:673`), không đặt lại khi chuyển sang LOBBY.
- Sửa đơn giản: trong khối `if (e.to === 'LOBBY')` (`runtime.ts:~739`) thêm `this.throne = { unlocked: false, holder: null, correctElapsedMs: new Map() }; this.throneStreaks.clear();`, giống dòng 673–674.
- Test: sau VICTORY → LOBBY, public `throne` không còn holder; overlay sảnh hiện ngai trống. Kết quả/người thắng vòng trước trong DB không đổi.

## E2. Header sảnh "VÒNG 1 / 0 ĐANG CHƠI"
- Ở sảnh, `snapshot.round` null nên `ArenaStage.tsx:230` luôn ghi "VÒNG 1", và số đang chơi ghi 0 dù đã 24/30 ghế.
- Sửa:
  - ở sảnh, ghi **số vòng sắp chơi** (số vòng đã chơi trong phiên + 1; server gửi trường này trong public state);
  - số "ĐANG CHƠI" = số người đã vào ghế ở sảnh (khớp việc C3).
- Chỉ sửa dòng 229–231 ở overlay. Codex 2 có thể sửa phần Top 3 trong cùng file: gộp origin/main trước khi báo, xung đột thì báo coordinator.
- Test: sảnh trước vòng 10 ghi "VÒNG 10", 24 người ngồi ghi 24 ĐANG CHƠI; vòng đầu phiên ghi "VÒNG 1".
