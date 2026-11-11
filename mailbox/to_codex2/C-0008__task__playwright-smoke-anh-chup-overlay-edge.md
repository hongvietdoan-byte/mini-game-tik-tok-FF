---
id: C-0008
from: coordinator
to: codex2
type: task
title: Playwright smoke + ảnh chụp overlay (Edge)
ref: 
priority: normal
needs: 
created: 2026-11-11T10:58:56+07:00
---
# Playwright smoke + ảnh chụp overlay (Edge cài sẵn)

## Phạm vi file
- `playwright.config.ts` (gốc repo), `tests/e2e/**`. Không sửa app (lỗi app → sửa trên nhánh C-0006 nếu chưa gộp, hoặc báo trong report).

## Yêu cầu
1. `playwright.config.ts`: `use.channel = 'msedge'` (KHÔNG tải browser), viewport 1080×1920, `deviceScaleFactor: 1`; `webServer` khởi động `corepack pnpm --filter @quiz/overlay dev` (cổng 5174, `reuseExistingServer: true`);
   `outputDir: 'test-results/e2e'`; `testDir: 'tests/e2e'`.
2. `tests/e2e/overlay.spec.ts` — với mọi cảnh mock của C-0006:
   - mở `/?mock=<scene>`, chờ `[data-testid=stage][data-scene=...]`, không có lỗi console (`page.on('console')` + `pageerror`);
   - `toHaveScreenshot('<scene>.png', { maxDiffPixelRatio: 0.01 })` (baseline sinh lần đầu bằng `--update-snapshots`; baseline PNG lưu trong `tests/e2e/__screenshots__/` — đây là ảnh do app tự render, được phép commit);
   - **chống lộ đáp án**: ở `question` và `prepare`, HTML của trang không chứa `correctOptionId` và không có option nào mang class/thuộc tính "đúng"; ở `reveal` thì có đúng một option được đánh dấu đúng;
   - **vùng an toàn**: lấy `boundingBox()` của `question-prompt`, `option-A..D`, `timer`, `leaderboard-row`, `podium-slot-*` (phần nameplate) → nằm trọn trong vùng an toàn của snapshot (top 230, bottom 1920−690, right 1080−130);
   - **XSS**: tên `<script>…` hiển thị dạng chữ, `window.__xss` không được set (tên mock nên dùng `<img src=x onerror="window.__xss=1">`);
   - cảnh `top10-short` (< 10 người) không có hàng trống / tên bịa; `victory-tie` có chữ "ĐỒNG HẠNG"; thứ tự podium trái→phải = hạng 2, 1, 3 (so toạ độ x).
3. Script gốc đã có `"test:e2e": "playwright test"` — dùng `corepack pnpm test:e2e`.
4. `test-results/` và `playwright-report/` đã bị ignore — không commit chúng.

## Tiêu chí xong
- `corepack pnpm test:e2e` xanh 2 lần liên tiếp (dán output), baseline đã commit, report đính kèm đường dẫn ảnh local + ghi chú cảnh nào sát vùng an toàn nhất.
- Nhánh `codex2/c0008-e2e` (tạo từ nhánh C-0006 nếu C-0006 chưa gộp main).
