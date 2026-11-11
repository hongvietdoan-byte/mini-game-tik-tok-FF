# Hòm thư điều phối: Coordinator ↔ Codex 1 / Codex 2

Repo: <https://github.com/hongvietdoan-byte/mini-game-tik-tok-FF> (nhánh `main`). Thư mục chính: `E:\Ai\2026\Trend mini game tiktok`.

- **Coordinator** = Claude Code + người dùng: giao việc, trả lời câu hỏi, rà kết quả, gộp nhánh, giữ lõi (engine, server, tích hợp).
- **Codex 1** (`codex1`) = làn **test + dữ liệu + công cụ** (fixtures, unit test, privacy-check, CI).
- **Codex 2** (`codex2`) = làn **giao diện** (apps/overlay, apps/dashboard, Playwright).

Đặc tả: `CLAUDE_MASTER_BUILD_PLAN_V2.md`. Hợp đồng API: `docs/API_CONTRACT.md`. Bảng việc + quyết định: `mailbox/BOARD.md`.

## 1. Cấu trúc

```
mailbox/
  README.md            giao thức (file này)
  BOARD.md             bảng việc + quyết định đã chốt. CHỈ coordinator sửa
  TIN_NHAN_MAU.md      tin nhắn dán sẵn cho từng phiên Codex (khởi động + đánh thức)
  CODEX1_START_PROMPT.md / CODEX2_START_PROMPT.md   (bản cũ, giữ để tham chiếu)
  CODEX_AUTOMATION_PROMPT.md                         prompt heartbeat 20 phút
  to_codex1/  to_codex2/   thư coordinator → Codex (C-xxxx, đánh số chung)
  to_coordinator/          thư Codex → coordinator (codex1: X-xxxx, codex2: Y-xxxx)
  state/<vai>.json         con trỏ đã xử lý + heartbeat. Mỗi vai chỉ ghi file của mình
tools/mb.py                công cụ gửi/đọc/chờ thư (Python chuẩn + git), luôn gọi bằng `py`
```

Mỗi file chỉ có một bên ghi. Không sửa thư đã gửi; đính chính = thư mới có `--ref`.

## 2. Loại thư (`--type`)

| type | Ai gửi | Dùng khi |
|---|---|---|
| `task` | coordinator | Giao việc: mục tiêu, phạm vi FILE được sửa, tiêu chí xong |
| `ack` | Codex | Nhận việc + kế hoạch ngắn + ước lượng |
| `report` | Codex | Xong việc/mốc. Bắt buộc bằng chứng (mục 4) |
| `question` | Codex | Cần quyết định (`--needs user` nếu cần người dùng) |
| `blocked` | Codex | Không đi tiếp được: đã thử gì, cần gì |
| `answer` | coordinator | Trả lời question/blocked (`--ref`) |
| `note` | cả hai | Thông tin, không cần hành động |

## 3. Vòng làm việc của Codex (không tự kết thúc phiên)

```
loop:
  py tools/mb.py read --for <vai>          # tự git pull, in mọi thư CHƯA XỬ LÝ (không tự đánh dấu)
  → làm theo từng thư, rồi: py tools/mb.py done --for <vai> --id C-xxxx
  → task mới: gửi ack, heartbeat --state working --task C-xxxx
  → làm trong WORKTREE riêng (mục 6), commit nhỏ, push nhánh của mình
  → xong: gửi report (nhánh + commit + lệnh test + output)
  → cần hỏi: gửi question rồi chuyển sang việc khác chưa bị chặn (xem "Việc dự phòng" trên BOARD)
  → hết việc: heartbeat --state waiting; py tools/mb.py wait --for <vai> --timeout 1800; hết giờ → quay lại đầu vòng
```

Đọc thư bắt buộc: đầu mỗi lượt, sau mỗi commit, trước khi gửi report/question. Thư mới đè kế hoạch đang làm.
Heartbeat ít nhất mỗi 30 phút khi làm việc dài.

## 4. Quy tắc báo cáo

Mỗi `report` gồm: **Đã làm** (file, nhánh, commit hash) · **Bằng chứng** (lệnh đã chạy + output rút gọn:
`corepack pnpm typecheck`, `corepack pnpm vitest run --project unit`, …) · **Tiêu chí xong**: đạt/chưa đạt từng mục ·
**Rủi ro / việc còn lại**. Không ghi "đạt" khi chưa chạy lệnh. Ảnh chụp không commit — ghi đường dẫn local (`test-results/…`).

## 5. Luật cứng (áp cho mọi làn)

- **Chỉ sửa file trong phạm vi của thư task.** Phát hiện lỗi ở file ngoài phạm vi (nhất là `packages/quiz-core/src/engine.ts`,
  `packages/contracts`, `packages/persistence`, `apps/server`) → không sửa, gửi `question` kèm test tái hiện + đề xuất bản vá.
- **Quyền riêng tư:** không bao giờ đọc/nhập/commit `*.xlsx`, ảnh đầu vào ở thư mục gốc (`Ảnh ChatGPT*`, `4.png`, `Screenshot*`),
  không đưa tên/thông tin người thật vào fixtures. Dữ liệu demo phải hư cấu và gắn DEMO.
- Không thêm dependency mới ngoài thư cho phép; cần thêm → hỏi. Dùng `corepack pnpm` (không có pnpm toàn cục).
  Ghim major: vite 6, vitest 3, zod 3, react 18.
- Commit chỉ file mình sửa (`git add <path>`), không `git add -A`, không force-push, không push `main` trừ thư hòm thư (mb.py tự làm).
- Tiếng Việt cho UI, tài liệu, thư, commit message.

## 6. Git + worktree

- Hòm thư (`mb.py`) chỉ chạy từ **checkout chính** ở nhánh `main`: `py "E:\Ai\2026\Trend mini game tiktok\tools\mb.py" ...`.
- Code: mỗi task một worktree **trong** thư mục chính:
  `git worktree add ".claude/worktrees/c0003-overlay" -b codex2/c0003-overlay origin/main` → làm, commit, `git push -u origin codex2/c0003-overlay`.
  Trong worktree mới chạy `corepack pnpm install --frozen-lockfile` (nếu thư cho phép thêm dependency thì được cập nhật lockfile, ghi rõ trong report).
- Coordinator rà + gộp vào `main`. Nhánh đã gộp → Codex gỡ worktree (`git worktree remove ...`).

## 7. Lệnh nhanh

```powershell
py tools/mb.py status
py tools/mb.py read --for codex1
py tools/mb.py new --from codex1 --type report --ref C-0001 --title "Fixtures xong" --body-file .claude/r.md
py tools/mb.py heartbeat --role codex2 --state working --task C-0003 --note "đang làm cảnh Top 10"
py tools/mb.py wait --for codex2 --timeout 1800
```
