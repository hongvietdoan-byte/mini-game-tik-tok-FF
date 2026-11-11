---
id: C-0016
from: coordinator
to: codex2
type: task
title: V3 duyệt: HUỶ C-0012; C-0008 chưa commit baseline; C-0016 overlay/dashboard theo hợp đồng mới
ref: 
priority: high
needs: 
created: 2026-11-11T12:10:10+07:00
---
# V3 đã được duyệt — HUỶ C-0012; việc kế tiếp sau C-0007

Người dùng đã duyệt V3 (`STORM_ARENA_CLAUDE_BUILD_SPEC_V3.md`, audit `docs/V3_AUDIT.md`, BOARD #15–16). Ưu tiên: **game chạy đúng + kết nối TikTok LIVE ổn định**; KHÔNG đầu tư animation.

## 1. HUỶ C-0012
V3 cấm 3 khối bục TOP 1/2/3. Nếu đã làm dở nhánh `codex2/c0012-*` thì dừng, không push thêm. Cảnh Victory sẽ làm lại khi có cúp/sân tách nền.

## 2. C-0008: chưa commit ảnh baseline
Vẫn viết test (không lỗi console, chống lộ đáp án, XSS, vùng an toàn, thứ tự podium) nhưng **chưa commit** `__screenshots__` — bố cục sẽ đổi theo V3.

## 3. Hợp đồng server đã đổi (main `5d6307d`) — xem `docs/API_CONTRACT.md` mục 7
- PREPARE: `question.options = []`, `optionsVisible = false` → chỉ hiện câu hỏi; ACCEPTING mới hiện 4 đáp án.
- Sau MỖI câu có `LEADERBOARD` ngắn 4 s với `scene = 'REVEAL'` (giữ màn câu hỏi, đáp án đúng vẫn hiện); mốc 5/10/15 → `INTERIM_TOP10`.
- `leaderboard.kind = 'COMPACT'` (Top 10) trong mọi cảnh câu hỏi.
- Thêm `snapshot.mc = { state, bubble }` (MC Kelly) và `seq` trên mọi thông điệp WS.
- Coordinator đã vá tối thiểu `apps/overlay/src/mock/snapshots.ts` để typecheck xanh (thêm `optionsVisible`, `mc`) — có dòng `TODO(codex2, C-0016)`.

## 4. C-0016 (làm ngay sau C-0007) — overlay + dashboard theo hợp đồng mới, KHÔNG đổi bố cục lớn
Phạm vi: `apps/overlay/**`, `apps/dashboard/**`.
- Overlay: PREPARE chỉ hiện câu hỏi (ô đáp án ẩn/khung trống, không nhảy layout khi đáp án xuất hiện); cảnh REVEAL kèm Top 10 gọn; hiện bubble MC dạng chữ (chưa cần ảnh Kelly);
  mock cập nhật theo hợp đồng (bỏ TODO), câu mock chủ đề Free Fire; client bỏ qua thông điệp có `seq` cũ hơn bản đang giữ, nhận snapshot mới khi server khởi động lại.
- Dashboard: hiện `mc.bubble`, phân biệt LEADERBOARD ngắn và BXH lớn.
- Unit test logic tương ứng. Tiêu chí: build + typecheck + `corepack pnpm test` xanh, ảnh local các cảnh prepare/question/reveal.

## 5. Việc lớn tiếp theo (thư riêng sẽ gửi): Connection Test + Connection Manager + hướng dẫn OBS (V3.1 mục C/D/E)
Coordinator đang chuẩn bị API server cho phần này; khi có sẽ gửi thư task.
