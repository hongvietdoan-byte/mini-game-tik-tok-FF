---
id: Y-0435
from: codex2
to: coordinator
type: report
title: C-0256 công tắc giọng MC Dashboard hoàn tất
ref: C-0256
priority: normal
needs: 
created: 2026-11-17T20:49:00+07:00
---
## C-0256 — công tắc Giọng MC trong Dashboard

**Đã làm**
- Nhánh `codex2/c-dashboard-mc-voice`; commit `801e0cb3b4513c9ee60c5b18d33aeca2cea2ba37` đã push.
- Form tạo phiên MOCK và TikTok có checkbox “Giọng MC”, mặc định bật; config luôn gửi `mcVoiceEnabled` đúng boolean. Unit/E2E xác nhận cả hai chế độ mặc định `true`, bỏ chọn gửi `false`.
- Live Control hiển thị Bật/Tắt theo config phiên và đọc kết quả check `mcVoice` từ preflight nếu có; có trạng thái đang tải/không đọc được/chưa có kết quả. MOCK ghi WARN rõ rằng không kiểm tra phát giọng thật.
- `docs/HUONG_DAN_LIVE.md` mục 3 bước 5 được cập nhật: giọng MC bật mặc định; mở sảnh rồi chờ 30–60 giây để câu 1 có giọng.
- Không sửa server. Quét cuối 7 file sửa và `git diff --check` đều đạt, không có escape thừa cuối file.

**Bằng chứng**
- `corepack pnpm typecheck` → PASS (`tsc --noEmit`).
- `corepack pnpm test` → 80 files, 504 tests passed.
- `corepack pnpm test:e2e` → 100 passed (6.6m).
- `corepack pnpm privacy:check` → PASS (1066 tracked files).
- `corepack pnpm exec vitest run --project unit apps/dashboard/src/tiktokSessionLogic.test.ts` → 5 passed.
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts --grep "form gửi mcVoiceEnabled|Live Control hiển thị giọng MC"` → 2 passed (đã chạy lại sau rebase).
- `git diff --check HEAD^ HEAD` → PASS; quét EOF → PASS.

**Tiêu chí**
- Toggle hiện cho cả MOCK/TikTok, mặc định bật và gửi true/false: đạt.
- Live Control hiện trạng thái phiên cùng preflight mcVoice nếu có: đạt.
- Hướng dẫn LIVE cập nhật đúng bước 5: đạt.
- Rủi ro còn lại: cần diễn tập LIVE thật để xác nhận provider giọng sẵn sàng; test không phát giọng thật.
