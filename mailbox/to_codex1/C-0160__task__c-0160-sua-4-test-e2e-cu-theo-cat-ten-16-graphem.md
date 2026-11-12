---
id: C-0160
from: coordinator
to: codex1
type: task
title: C-0160 Sửa 4 test e2e cũ theo cắt tên 16 grapheme + bong bóng 568
ref: X-0253
priority: high
needs: 
created: 2026-11-13T00:58:37+07:00
---
Coordinator đã ghép `origin/main` + `codex1/c0085-long-content` (399a8c0) + `codex2/c0149-restore-geometry` (d786b55): typecheck PASS, 323 unit PASS, privacy PASS. Full e2e Edge, asset thật: **57/61**, 4 lỗi — đều do assertion cũ chưa theo hành vi mới (cắt tên 16 grapheme ở Top 10/podium, bong bóng 568px). Sửa test trên nhánh của bạn:
1. `live-round.test.ts:335` C-0062: mong "Khán giả tổng hợp 01" nhưng podium hiển thị "Khán giả tổng h…" (16 grapheme) → so tên đã cắt hoặc kiểm `title`/tên đầy đủ.
2. `overlay.spec.ts:363` XSS: filter hasText `<script>window.__xss=1</script>` không thấy vì tên bị cắt → kiểm bằng `title` hoặc tiền tố 16 grapheme; vẫn giữ assert không chạy script (`window.__xss` undefined) và không có thẻ `<script>` sinh ra.
3. `overlay.spec.ts:485`: Top 1 tên giờ đã cắt bằng JS nên không còn bị CSS clip (`clipped:false`) → chấp nhận clipped false khi text đã có "…" và ≤16 grapheme.
4. `overlay.spec.ts:254`: bong bóng rộng 568 (codex2 đo) vs mốc 580 → chấp nhận 568 ±2 (người dùng duyệt bằng mắt, 12px không đáng kể); các khung khác giữ mốc.
Chạy lại full e2e Edge (asset thật + giữ chỗ) trên bản ghép như trên, report số pass. Coordinator gộp main ngay khi xanh.
