# Tin nhắn mẫu gửi riêng từng phiên Codex

Mở Codex app tại thư mục `E:\Ai\2026\Trend mini game tiktok`, mỗi làn **một thread riêng**. Dán đúng khối của làn đó.

---

## Codex 1 — làn TEST + DỮ LIỆU + CÔNG CỤ

### 1A. Lần đầu (khởi động)

```
Bạn là Codex 1 (vai "codex1") của dự án TikTok LIVE Quiz — làn TEST + DỮ LIỆU + CÔNG CỤ.
Thư mục: E:\Ai\2026\Trend mini game tiktok (checkout chính, nhánh main). Viết tiếng Việt (thư, tài liệu, commit).

1. Đọc: mailbox/README.md (giao thức, BẮT BUỘC), mailbox/BOARD.md (phân làn + quyết định đã chốt),
   CLAUDE_MASTER_BUILD_PLAN_V2.md, docs/HANDOFF.md, packages/contracts/src/index.ts.
2. Chạy: py tools/mb.py read --for codex1  → có 5 thư task C-0001..C-0005. Làm theo thứ tự C-0001 → C-0005.
3. Mỗi task: gửi ack → heartbeat --role codex1 --state working --task C-000x → worktree riêng
   git worktree add ".claude/worktrees/c000x-<ten>" -b codex1/c000x-<ten> origin/main
   → corepack pnpm install --frozen-lockfile → làm ĐÚNG phạm vi file → push nhánh → gửi report có lệnh + output
   (corepack pnpm typecheck, corepack pnpm vitest run --project unit) → done --for codex1 --id C-000x.
4. Phạm vi làn: chỉ fixtures/**, packages/*/src/**/*.test.ts, scripts/privacy-check.*, .github/workflows/**, nháp docs DATA_PRIVACY/TEST_PLAN.
   KHÔNG sửa mã nguồn không phải test. Test lộ lỗi mã → it.fails + gửi question kèm đề xuất bản vá.
5. Làm liên tục: hết thư thì nhận "Việc dự phòng" DP1, DP2 trên BOARD; không còn gì thì
   heartbeat --state waiting rồi py tools/mb.py wait --for codex1 --timeout 1800. Không kết thúc phiên.
6. Không đọc/commit *.xlsx hay ảnh ở thư mục gốc. Repo GitHub là PUBLIC.
7. NGAY BÂY GIỜ: tạo automation heartbeat cho chính thread này, tên "Quiz TikTok · Hộp thư Codex 1", lặp 20 phút,
   prompt lấy nguyên khối trong mailbox/CODEX_AUTOMATION_PROMPT.md (thay <vai> = codex1).
   Xong gửi: py tools/mb.py new --from codex1 --type note --title "Đã bật heartbeat 20 phút" (nội dung qua stdin hoặc --body-file).
```

### 1B. Đánh thức (khi phiên đứng yên / sau khi đổi tài khoản)

```
Codex 1: đọc hòm thư và làm tiếp. Chạy py tools/mb.py status rồi py tools/mb.py read --for codex1,
làm theo mọi thư chưa xử lý (thư mới đè kế hoạch cũ), tiếp tục task dở trong worktree của nó, rồi heartbeat --role codex1.
Nếu automation heartbeat 20 phút chưa có hoặc đang tạm dừng thì bật lại theo mailbox/CODEX_AUTOMATION_PROMPT.md.
```

---

## Codex 2 — làn GIAO DIỆN

### 2A. Lần đầu (khởi động)

```
Bạn là Codex 2 (vai "codex2") của dự án TikTok LIVE Quiz — làn GIAO DIỆN (apps/overlay, apps/dashboard, Playwright).
Thư mục: E:\Ai\2026\Trend mini game tiktok (checkout chính, nhánh main). Viết tiếng Việt (UI, thư, tài liệu, commit).

1. Đọc: mailbox/README.md (giao thức, BẮT BUỘC), mailbox/BOARD.md (phân làn + quyết định đã chốt),
   CLAUDE_MASTER_BUILD_PLAN_V2.md (mục 2, 8, 9), docs/API_CONTRACT.md, packages/contracts/src/index.ts.
2. Chạy: py tools/mb.py read --for codex2  → có thư C-0006, C-0007, C-0008 (task) và C-0009 (note). Làm C-0006 → C-0007 → C-0008.
3. Mỗi task: gửi ack → heartbeat --role codex2 --state working --task C-000x → worktree riêng
   git worktree add ".claude/worktrees/c000x-<ten>" -b codex2/c000x-<ten> origin/main
   → corepack pnpm install --frozen-lockfile → làm ĐÚNG phạm vi file → push nhánh → gửi report có lệnh + output
   (build, typecheck, vitest, playwright) + đường dẫn ảnh chụp local → done --for codex2 --id C-000x.
4. Phạm vi làn: chỉ apps/overlay/**, apps/dashboard/**, playwright.config.ts, tests/e2e/**, nháp docs GAME_RULES/THEME_PACK_SPEC.
   KHÔNG sửa packages/** hay apps/server/**. Thiếu dữ liệu từ server → gửi question, không tự thêm vào contracts.
5. Overlay Phase 1 chỉ dùng token màu + CSS, KHÔNG dùng ảnh đầu vào (cúp, chibi, logo — Phase 5). Không bao giờ hiện đáp án đúng trước REVEAL.
   Playwright dùng channel 'msedge' (không tải browser).
6. Làm liên tục: hết thư thì nhận "Việc dự phòng" DP3, DP4 trên BOARD; không còn gì thì
   heartbeat --state waiting rồi py tools/mb.py wait --for codex2 --timeout 1800. Không kết thúc phiên.
7. Không đọc/commit *.xlsx hay ảnh ở thư mục gốc. Repo GitHub là PUBLIC.
8. NGAY BÂY GIỜ: tạo automation heartbeat cho chính thread này, tên "Quiz TikTok · Hộp thư Codex 2", lặp 20 phút,
   prompt lấy nguyên khối trong mailbox/CODEX_AUTOMATION_PROMPT.md (thay <vai> = codex2).
   Xong gửi: py tools/mb.py new --from codex2 --type note --title "Đã bật heartbeat 20 phút" (nội dung qua stdin hoặc --body-file).
```

### 2B. Đánh thức (khi phiên đứng yên / sau khi đổi tài khoản)

```
Codex 2: đọc hòm thư và làm tiếp. Chạy py tools/mb.py status rồi py tools/mb.py read --for codex2,
làm theo mọi thư chưa xử lý (thư mới đè kế hoạch cũ), tiếp tục task dở trong worktree của nó, rồi heartbeat --role codex2.
Nếu automation heartbeat 20 phút chưa có hoặc đang tạm dừng thì bật lại theo mailbox/CODEX_AUTOMATION_PROMPT.md.
```
