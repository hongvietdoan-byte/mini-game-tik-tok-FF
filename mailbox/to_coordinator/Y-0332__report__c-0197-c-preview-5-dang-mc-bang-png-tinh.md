---
id: Y-0332
from: codex2
to: coordinator
type: report
title: C-0197 C: preview 5 dáng MC bằng PNG tĩnh
ref: C-0197
priority: normal
needs: 
created: 2026-11-14T02:16:08+07:00
---
## C-0197 C hoàn tất: MC một ảnh tĩnh cho mỗi dáng

Nhánh \`codex2/c0197-mc-poses\`, commit \`60692e6\` (đã push).

### Đã làm
- MC nhận một ảnh theo từng state trong manifest; mỗi ảnh có thể là một PNG duy nhất (\`frames: 1\`). Khi state/ảnh đổi, lớp trong suốt đổi dáng bằng hiệu ứng mờ + nhún nhẹ 320ms; tôn trọng \`prefers-reduced-motion\`.
- Giữ nguyên ảnh fallback \`assets-local/mc/kelly.png\` khi thiếu manifest hoặc ảnh state.
- Thêm query mock \`?mock=question&mc=<idle|welcome|ask|react|celebrate>\` để người dùng xem từng dáng.
- Không đổi contracts. Dáng → pha: idle (leaderboard/nghỉ/gián đoạn), welcome (sảnh), ask (prepare/reading/accepting), react (reveal), celebrate (round end/victory).
- Đề xuất state mở rộng khi hợp đồng được nâng cấp: \`hurry\` (5 giây cuối), \`fastest\` (công bố người trả lời đúng nhanh nhất), \`top10\` (đang giới thiệu Top 10). Chưa thêm các state này vào contract.
- Chụp 5 placeholder chỉ để duyệt bố cục, không thêm ảnh đầu vào/binary asset vào repo.

### Danh sách ảnh cần người dùng cung cấp
Đặt dưới \`assets-local/mc/kelly/\`:
- \`idle/0001.png\`
- \`welcome/0001.png\`
- \`ask/0001.png\`
- \`react/0001.png\`
- \`celebrate/0001.png\`

Mỗi file: PNG RGBA 512×768, nền trong suốt, nhân vật bán thân chính diện, cùng tỉ lệ đầu/vai/ánh sáng và điểm cắt thân. Canh tâm ở x=256; giữ đáy thân cùng đường neo y=752 để đổi dáng không giật vị trí. Vì ảnh bán thân, neo y=752 là điểm neo tương đương chân của bộ sprite, không vẽ chân. Tên mỗi thư mục khớp state trong manifest.

### Kiểm tra
- \`corepack pnpm typecheck\`: đạt.
- \`corepack pnpm build:web\`: dashboard + overlay build đạt.
- \`corepack pnpm test\`: 57 files / 340 tests đạt.
- \`corepack pnpm test:e2e\`: 70/70 đạt; gồm safe-zone 9/9 và long-content 5/5.
- Dọn dẹp theo C-0185: \`.tmp-test\`, \`test-results/e2e\`, \`playwright-report\` đều không còn.

Ảnh placeholder:
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-mc-poses\.claude\review\C0197C\idle.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-mc-poses\.claude\review\C0197C\welcome.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-mc-poses\.claude\review\C0197C\ask.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-mc-poses\.claude\review\C0197C\react.png\`
- \`E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-mc-poses\.claude\review\C0197C\celebrate.png\`

C-0197 còn mở: B đang chờ tên trường fastest-correct trong báo cáo C-0198; D sẽ làm ở nhánh riêng.
