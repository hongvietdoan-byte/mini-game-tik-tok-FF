---
id: Y-0329
from: codex2
to: coordinator
type: report
title: C-0194 hoàn tất, C-0193 đã khớp B2
ref: C-0194
priority: normal
needs: 
created: 2026-11-14T01:49:49+07:00
---
## Hoàn tất C-0194, gộp xác minh C-0193

### Nhánh và commit
- C-0194 phương án A/B: \`codex2/c0168-header-size\`, commit \`cff8b76\` (đã push).
- C-0193 + tích hợp A của C-0197 vào HUD: \`codex2/hud-settings\`, commit \`6272312\` (đã push).

### C-0194: hai phương án B2
Đã giữ pill một dòng, bộ đếm ba dòng, dời khung Top 10/câu hỏi xuống dưới dải cờ và giữ vùng trống ≥8px giữa câu hỏi dài với đồng hồ. Bỏ lớp mask che dải cờ. MC và bong bóng nằm dưới nội dung câu hỏi, phần chân dung chỉ lấy bán thân.

- A giữ cỡ chữ vòng 36/52/24, thu gọn card còn 220×99px. Số đo 1080×1920: logo x453.60 y18 172.80×178.50; pill x430.38 y212.5 325.25×53; event x96.36 y14 213.28×94; round x760 y16 220×99; Top 10 x98 y620 300×466; board x418 y620 560×512; question x448 y796 500×160; timer x814 y646 138×138.
- B giữ vị trí, giảm cỡ chữ vòng xuống 24/34/18; card 220×108px.
- Trên nhánh nguồn: \`corepack pnpm typecheck\` đạt; \`corepack pnpm test\` đạt 55 files / 332 tests; \`corepack pnpm test:e2e\` đạt 67/67 cho A, 67/67 cho B; A được chạy lại đủ 67/67 sau hiệu chỉnh cuối.
- Trên nhánh HUD sau merge: \`corepack pnpm test:e2e\` đạt 69/69, trong đó safe-zone 9/9 và long-content 5/5. Không nới ngưỡng kiểm tra.

Ảnh A/B (question, Top 10, safe-zone overlay):
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-a-question.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-a-top10.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-a-safe-zone.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-b-question.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-b-top10.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\.claude\review\C0194\option-b-safe-zone.png\`

### C-0193: cấu hình HUD khớp B2 trong 1px
Trên \`codex2/hud-settings\`, số đo mặc định và tuỳ chỉnh trùng nhau; cũng trùng hình học B2 trong 1px:
- logo/frame: x453.60 y18 172.80×178.50
- pill: x430.38 y212.5 325.25×53
- event: x96.36 y14 213.28×94
- round: x760 y16 220×99
- Top 10: x98 y620 300×466
- question: x448 y796 500×160

Ảnh C-0193:
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0193\default-question.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0193\custom-question.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0193\custom-top10.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0193\custom-victory.png\` — giữ nền Victory mặc định, chỉ thay logo/tiêu đề.
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0193\nen-thu-victory.png\` — ảnh nền thử riêng.

### Kiểm tra cuối trên nhánh HUD
- \`corepack pnpm typecheck\`: đạt.
- \`corepack pnpm build:web\`: dashboard và overlay build đạt.
- \`corepack pnpm test\`: 57 files / 340 tests đạt.
- \`corepack pnpm test:e2e\`: 69/69 đạt.
- Dọn dẹp theo C-0185 đã xác minh: \`.tmp-test\`, \`test-results/e2e\`, \`playwright-report\` đều không còn.

A của C-0197 (lộ dải 8 cờ) đã tích hợp vào các ảnh C-0194. Các mục B/C/D của C-0197 vẫn đang mở, sẽ làm theo yêu cầu tách nhánh từng mục.
