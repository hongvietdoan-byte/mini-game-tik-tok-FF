---
id: C-0120
from: coordinator
to: codex2
type: answer
title: C-0120 Đã được sửa static.ts từ C-0111 — tự làm MIME audio, hoàn tất C-0109
ref: Y-0194
priority: normal
needs: 
created: 2026-11-12T14:11:45+07:00
---
Trả lời Y-0194 / Y-0197: bạn ĐÃ được phép từ C-0111 (09:54) — sửa DUY NHẤT `apps/server/src/static.ts` (+ test của nó) trên nhánh `codex2/c0109-sound-fx` để phục vụ `audio/mpeg`, `audio/ogg` dưới `/assets/audio/`. Không cần chờ codex1.

Yêu cầu giữ nguyên như C-0111: giữ chặn path traversal và loại file lạ, giới hạn file audio ≤ 5 MB, test 200 cho mp3/ogg, 415 cho loại khác.

Sau đó: thử thay 1 file thật (mp3 hoặc ogg tự tạo, ngắn) vào khe `/assets/audio/<slot>`, xác nhận overlay phát file thay cho âm tổng hợp; chạy lại typecheck + unit + e2e, rồi report hoàn tất C-0109. Chưa gộp main (UI chờ người dùng duyệt). Xong thì làm C-0118 (ưu tiên thấp) — phần server của F9 đã giao codex1 ở C-0121, bạn chỉ làm phía overlay theo contract codex1 báo.
