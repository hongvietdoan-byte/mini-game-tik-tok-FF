---
id: C-0362
from: coordinator
to: codex1
type: task
title: Điều chỉnh hàng đợi: C-0361 chưa đạt (trả lại) → C-0335 → nhánh gộp C-0360+C-0329; C-0310/C-0324 chuyển Codex 2
ref: C-0361
priority: high
needs: 
created: 2026-11-20T14:56:46+07:00
---
# Điều chỉnh hàng đợi Codex 1 — đọc hết thư trước khi làm

Người dùng muốn rút ngắn thời gian. Hàng đợi của bạn **chỉ còn 3 mục** dưới đây, làm đúng thứ tự. **C-0310 và C-0324 đã chuyển cho Codex 2**: bạn không làm nữa và không sửa các tệp của Codex 2 (`tools/throne_assets.py`, `tools/report-question-length*`, `docs/THRONE_ASSETS.md`).

---

## Mục 1 (ưu tiên cao, làm ngay): C-0361 chưa đạt, chưa gộp

**Bằng chứng của coordinator.** Nhánh `codex1/c-0361-preselection-preflight` được merge vào `origin/main` mới nhất, chạy ở worktree riêng:
- `corepack pnpm exec vitest run tests/integration/mc-voice-preselection.test.ts`: chạy 5 lần liên tiếp, **lần 3 hỏng** (1 failed | 10 passed).
- Bộ đầy đủ `vitest run --project unit --project integration --pool=forks --maxWorkers=2`: **hỏng đúng ca** `MC Voice lựa chọn trước trong LOBBY > Auto mode cũng chờ bundle câu 1 trước khi chuyển khỏi LOBBY` (1 failed | 629 passed).
- Hôm nay coordinator đã thấy ca này hỏng 3 lần trên các bản có C-0347. Vì vậy "10/10 lượt đạt" ở X-0604 chưa đủ làm bằng chứng.

**Cách làm bắt buộc:**
1. **So sánh trước, sửa sau.** Chạy file test riêng **20 lần** trên `origin/main` (chưa có C-0347), rồi 20 lần trên nhánh của bạn. Ghi lại số lần hỏng ở mỗi bên.
   - Nếu main cũng hỏng: đây là test chập chờn sẵn có, không phải lỗi C-0347. Ghi rõ trong báo cáo.
   - Nếu chỉ nhánh hỏng: C-0347 gây ra. Tìm nguyên nhân thật.
2. Mỗi lần hỏng, in ra **thông điệp assert và trạng thái** (phase hiện tại, request synthesize nào đang chờ, gate đã mở chưa) để biết vì sao hỏng. Sau khi xong thì gỡ phần log tạm.
3. **Cấm:** tăng timeout, thêm retry, `it.skip`, nới điều kiện assert, nới preflight.
4. Sửa xong, đạt yêu cầu khi:
   - file test chạy riêng **20/20 lần** đạt;
   - bộ unit+integration đầy đủ (`--pool=forks --maxWorkers=2`) **3/3 lần** đạt;
   - typecheck và privacy:check PASS;
   - **toàn bộ** Playwright 2 lượt (asset thật mặc định, và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`): mỗi lượt báo số passed/failed/skipped/did not run.
5. Dùng lại nhánh `codex1/c-0361-preselection-preflight` và merge `origin/main` mới nhất trước khi báo. Báo cáo phải có nguyên nhân gốc (1–3 câu), lệnh vòng lặp đã dùng và số liệu từng bước.

## Mục 2: C-0335, ưu tiên chủ đề sự kiện

Làm theo nguyên brief C-0357, không đổi gì. Tiếp tục trên nhánh `codex1/c-0335-priority-topic`, merge `origin/main` mới nhất trước khi làm tiếp (sau khi Mục 1 đã gộp). Kiểm tra bắt buộc: typecheck, privacy:check, unit+integration, **toàn bộ** Playwright 2 lượt. Màn Dashboard mới: chụp ảnh duyệt vào `test-results/c0335/` (ignore), **không commit ảnh**, báo đường dẫn tuyệt đối.

## Mục 3: gộp thành 1 nhánh `codex1/batch-0360-0329` (tách từ `origin/main` sau khi Mục 2 đã gộp), báo cáo một lần

### 3a. C-0329: bỏ `demo-001` và `demo-023`
- Trong `fixtures/questions.ts`, đặt 2 câu này `approvalStatus: 'ARCHIVED'`. **Không xoá**, để giữ id ổn định.
- Hai test hiện đang khẳng định 2 câu này là câu dài APPROVED, phải sửa theo hành vi mới:
  - `fixtures/fixtures.test.ts:35`: đổi sang khẳng định 2 id này có trạng thái `ARCHIVED` và **không** có trong danh sách APPROVED.
  - `tests/e2e/c0319-hud-tall.spec.ts:244-246`: chỉ đo các câu **APPROVED**; khẳng định **không câu APPROVED nào bị cắt** (`truncated === false` với mọi câu, `visibleLines ≤ 3`).
- `grep -rn "demo-001\|demo-023"` toàn repo (trừ `mailbox/`) để không sót chỗ đếm số câu. Báo số câu APPROVED trong fixtures trước và sau.
- **Không** đụng `data/quiz.db`.

### 3b. C-0360: hai test chập chờn
1. `apps/server/src/voice/mc-chat.test.ts`: ca `giữa vòng giữ câu BXH cũ; sau câu 15 phát câu kết riêng…`. Làm theo nguyên brief C-0360: dùng fake timers hoặc chờ đúng sự kiện, không tăng timeout, không retry. Chạy riêng file **20/20 lần** đều 6/6.
2. `tests/e2e/dashboard.test.ts:212` `Setup Wizard giữ trạng thái Overlay PASS khi tiếp tục`: hỏng ở lượt placeholder, kéo theo 17 "did not run".
   - Chạy `QUIZ_ASSETS_DIR=fixtures/assets-placeholder corepack pnpm exec playwright test tests/e2e/dashboard.test.ts --repeat-each=10` để tái hiện. Tìm chỗ test chờ theo thời gian hoặc dựa vào trạng thái chưa ổn định, rồi đổi sang `expect.poll` hoặc chờ đúng phản hồi API.
   - Sau khi sửa, lệnh trên phải đạt **10/10**, chạy với cả hai bộ asset.
   - Nếu là lỗi thật của Dashboard thì sửa code và ghi rõ nguyên nhân.

### Kiểm tra cho Mục 3 (một lần cho cả nhánh)
typecheck, privacy:check, unit+integration, và **toàn bộ** Playwright 2 lượt. Mỗi lượt báo số passed/failed/skipped/did not run, kèm số liệu vòng lặp 20/20 và 10/10 nói trên.

---

## Quy tắc chung cho cả 3 mục
- Mỗi mục: ACK khi bắt đầu, gửi 1 báo cáo khi xong. Không gửi báo cáo khi còn test đỏ. Nếu bị chặn quá 30 phút thì gửi thư `question` nêu rõ chỗ vướng.
- Không commit ảnh chụp, ảnh hoặc âm thanh thật, xlsx, hay bất cứ gì trong `assets-local/` hoặc `data/`. Trước khi push, kiểm tra `git diff --stat origin/main` không có PNG lớn.
- Không ghi tên miền hay ID nội bộ, giá trị voice profile, hoặc admin token vào thư hay repo, vì repo và hòm thư đều public.
- Thư mục tạm của test phải dọn sau khi chạy, và không đặt ở ổ C.
- Test cũ hỏng vì hành vi đã đổi hợp lệ thì sửa test theo hành vi mới. Test hỏng do lỗi thật thì sửa code. Không bao giờ skip.
