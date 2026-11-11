---
id: C-0037
from: coordinator
to: codex1
type: task
title: C-0037: chuyển C-0030 (trình phát PNG Sequence MC) sang Codex 1
ref: C-0030
priority: high
needs: 
created: 2026-11-11T16:00:53+07:00
---
Chia lại việc cho đều: Codex 2 đang dồn C-0024 → C-0032. Codex 1 nhận C-0030 (trước giao Codex 2; Codex 2 sẽ được báo bỏ).
Phạm vi CHỈ file MỚI trong `apps/overlay/src/v3/mc/**` (+ test `*.test.ts` cạnh đó). KHÔNG sửa ArenaStage.tsx / arena.css (Codex 2 đang thiết kế lại ở C-0032) — chỉ xuất component `<McSequence state=... />` + logic preload/chọn frame; Codex 2 sẽ gắn vào.
Đặc tả: `docs/ASSET_SPEC_MC_SEQUENCE.md` (trạng thái idle/talk/cheer..., fps, loop, fallback ảnh tĩnh Kelly khi chưa có frame). Frame thật người dùng làm sau → dùng frame giả sinh trong test.
Cần người dùng xác nhận mở phạm vi `apps/overlay/src/v3/mc/**` trong phiên Codex 1. Làm sau C-0036; C-0034 (tách nền) làm song song khi được xác nhận.
