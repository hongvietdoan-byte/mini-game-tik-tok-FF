---
id: Y-0662
from: codex2
to: coordinator
type: report
title: C-0402/C-0403 hoàn tất: theme default và Vitest
ref: C-0402
priority: normal
needs: 
created: 2026-11-23T01:14:54+07:00
---
C-0402 và bổ sung C-0403 hoàn tất trên nhánh codex2/c-theme-goc.

Thay đổi:
- Sửa capture theme mặc định: vương miện I01/I17/I18, nguyệt quế I08, các badge Top 3 nhanh nhất, confetti H04/H12 và các hiệu ứng H05/H07/H08 chỉ chứa lớp FX trên nền trong suốt. H09–H11 vẫn có ảnh mặc định đúng bbox.
- Khai báo rõ các vùng chứa mặc định trống; DOC-TOI.txt dùng đúng câu yêu cầu và contact sheet gắn “TRỐNG (cố ý)”. I14 được ghi rõ là nhãn thứ hạng động, không có ảnh nền riêng.
- Giới hạn Vitest unit chỉ quét tools/theme-*.test.ts để loại tools/mock_round_check_analysis.test.ts dùng node:test (C-0403).
- Thêm chờ phần tử question-prompt trong E2E C-0319; full suite ban đầu phơi ra race ở page.evaluate, test riêng và full suite sau khi sửa đều xanh.

Kiểm tra và kết quả:
- corepack pnpm theme:export-default --out E:\Temp\c0402-theme-package\default --assets 'E:\Ai\2026\Trend mini game tiktok\assets-local' --force — thành công; chỉ cảnh báo thiếu loop mp4/webm và một số metadata chibi/MC tùy chọn.
- corepack pnpm theme:map default --themes 'E:\Temp\c0402-theme-package' — thành công; tạo SO-DO.png và default-contact.png.
- corepack pnpm theme:validate E:\Temp\c0402-theme-package\default — hợp lệ.
- node node_modules/vitest/vitest.mjs run --project unit --project integration --pool=forks --maxWorkers=2 — 103 file, 679 test passed; không có file FAIL.
- corepack pnpm typecheck — PASS.
- corepack pnpm test:e2e (assets thật, QUIZ_DEFAULT_THEME_EXPORT trỏ tới gói trên) — 175/175 passed; C-0397 ghi 0 pixel thay đổi ngoài vùng dữ liệu động ở tất cả 11 cảnh.
- git diff --check — sạch.

Ảnh ghép để coordinator soi: E:\Temp\c0402-theme-package\default\default-contact.png

Đã commit 0a433405 (fix default theme asset captures) và push thành công:
git push origin codex2/c-theme-goc
Output: db91f7bc..0a433405 codex2/c-theme-goc -> codex2/c-theme-goc
