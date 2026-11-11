# Rà soát code P0 vừa gộp (C-0099)

Người rà: làn `cloud`, 12/11/2026. Phạm vi: các commit `397157f..ff1d9f2` trên `main` (C-0092 P0-A..D, C-0097).
Các file đã rà: `apps/server/src/app.ts`, `tests/integration/preflight.test.ts`, `tools/backup.py`, `tools/backup_db.ts`, `tools/web_build.py`, `CHAY_GAME.cmd`, `tools/rehearsal.ts`, `packages/live-adapters/src/simulator.ts`, `scripts/privacy-check.mjs`.
Chỉ đọc code và thử trong thư mục tạm; không sửa code.

**Kiểm tra chạy lại @ `ff1d9f2` (cloud, Linux):**
- `corepack pnpm typecheck` sạch.
- `corepack pnpm test`: 41 file, **268/268 PASS**.
- `node scripts/privacy-check.mjs`: PASS (500 tệp).

Trên Windows/cmd chưa chạy được (CHƯA KIỂM CHỨNG). Kịch bản Windows bên dưới suy ra từ cách `cmd.exe` xử lý `errorlevel`.

Mức độ:
- **P0** = có thể làm hỏng hoặc chặn buổi LIVE.
- **P1** = nên sửa trước tổng duyệt.
- **P2** = sửa sau.

## 5 phát hiện nặng nhất

| # | Mức | Phát hiện | Vị trí |
|---|---|---|---|
| 1 | **P0** | Auto mode bỏ qua cổng preflight: vòng TIKTOK tự bắt đầu mà không kiểm gì. | `apps/server/src/runtime.ts:517`, `apps/server/src/app.ts:530` |
| 2 | **P0** | Máy mới (chưa có `data/quiz.db`): backup báo FAIL, `CHAY_GAME.cmd` không bao giờ mở server. **Đã tái hiện.** | `tools/backup.py:147-148`, `CHAY_GAME.cmd:30-33` |
| 3 | **P0** | Thiếu `py` hoặc `git` (hoặc Python < 3.9): `CHAY_GAME.cmd` dừng hẳn, thông báo lỗi sai nguyên nhân. | `CHAY_GAME.cmd:18-21`, `tools/web_build.py:15-29`, `tools/backup.py:50` |
| 4 | **P1** | Kiểm "bản build còn mới" so mtime với **giờ commit**: có thể báo PASS cho bản build cũ sau `git pull`. | `tools/web_build.py:43`, `apps/server/src/app.ts:116-120,310` |
| 5 | **P1** | Mỗi lần khởi động chép **toàn bộ** `assets-local/` vào `backups/`, không dọn bản cũ. Ổ đầy thì backup FAIL và server không mở. | `tools/backup.py:143-176`, `CHAY_GAME.cmd:30-33` |

## Chi tiết

### F1 · P0 · Auto mode bỏ qua preflight

- **Vị trí:** cổng preflight chỉ nằm trong route HTTP `POST /api/sessions/:id/commands`, và chỉ áp cho lệnh `START_ROUND` do operator gửi (`app.ts:529-540`). Ở auto mode, runtime tự gọi `this.systemCommand({ type: 'START_ROUND' })` (`runtime.ts:517`). Lệnh này đi thẳng vào `dispatch()`, không qua route. `RESTART_ROUND` cũng không qua cổng.
- **Tái hiện:**
  1. Phiên TIKTOK, bật `SET_AUTO_MODE enabled=true` ở LOBBY.
  2. Đóng overlay (hoặc làm hỏng `assets-local/victory/trophy-stage.png`).
  3. Hết `lobbyMs` thì `AUTO_START_REQUESTED`, vòng bắt đầu.
  4. `GET /api/preflight` lúc đó vẫn báo `overlayAck`/`assets` FAIL.

  Với auto mode thì cả vòng 1 cũng tự bắt đầu, nên toàn bộ 6 vòng của một buổi LIVE có thể chạy mà preflight không chặn lần nào. `preflight.test.ts` chỉ thử đường HTTP (`:164`), không có test cho auto mode.
- **Đề xuất:**
  - Đưa kiểm preflight vào một hàm chung mà cả route lẫn `systemCommand` (nhánh auto start) đều gọi.
  - Khi FAIL ở auto mode: tắt auto (`runtime.ts:520` đã có mẫu "Tự động bắt đầu vòng thất bại") và hiện lý do cho operator.
  - Thêm test tích hợp: auto mode + overlay rời thì không có `ROUND_STARTED`.

### F2 · P0 · Máy mới không khởi động được

- **Vị trí:** `CHAY_GAME.cmd:30-33` gọi backup **trước** khi mở server. `backup.py:147-148` ném lỗi khi chưa có `data/quiz.db`, nhưng file này chỉ được tạo khi server chạy lần đầu (`Store` ở `apps/server/src/main.ts:19`). Lệnh `.cmd` rẽ sang `:backup_error` và thoát.
- **Tái hiện (đã chạy trong cloud):** tạo thư mục có `assets-local/` nhưng chưa có `data/`, gọi `backup.make_backup(root)` → `BackupError: Không tìm thấy database source-run: …/data/quiz.db`.

  Trường hợp tương tự: chưa có `assets-local/` (`:149-150`). Chỉ cần xoá hoặc đổi tên `data/` để "làm sạch" là lần sau không chạy được nữa.
- **Ảnh hưởng:** máy LIVE hiện đã có `data/quiz.db` (BOARD #20) nên chưa gặp. Nhưng máy dự phòng, máy clone mới, hoặc khi phải xoá DB đều bị chặn. Đúng lúc cần đổi máy gấp thì không mở được game.
- **Đề xuất:** chưa có DB thì in "bỏ qua backup: chưa có dữ liệu" và chạy tiếp. Chỉ FAIL khi DB có mà sao không được. Thêm test cho trường hợp này.

### F3 · P0 · Thiếu `py` / `git` / Python ≥ 3.9

- **Thiếu `py`:** `cmd` trả `errorlevel 9009`, nên `if errorlevel 2` đúng (`CHAY_GAME.cmd:19`). Script nhảy tới `:build_check_error` và in "không đọc được commit HEAD". Thông báo sai nguyên nhân, và server không mở.
- **Thiếu `git`:** dòng 9 vẫn chạy tiếp (`QUIZ_COMMIT=khong-xac-dinh`). Nhưng `web_build.py:16-21` gọi `git log`, gặp `OSError` nên trả 2 (`:28-29,59-61`). Kết quả giống trường hợp trên. Ngoài ra máy nhận code dạng zip (không có `.git`) cũng rơi vào nhánh này.
- **Python < 3.9:** `Path.is_relative_to` (`backup.py:50`) gây `AttributeError`. Lỗi này không nằm trong `except` (`:277`), nên in traceback rồi exit 1, script vào `:backup_error` và server không mở.
- **Đề xuất:**
  - Kiểm `where py` và `where git` ở đầu `.cmd`, in hướng dẫn rõ ràng.
  - Không có git thì chuyển sang "luôn build lại" thay vì dừng.
  - Kiểm phiên bản Python ≥ 3.9.
  - Ghi yêu cầu `py`/`git`/Node trong `docs/HUONG_DAN_LIVE.md`. Hiện chỉ dòng 12-13 nhắc `py` gián tiếp, không ghi là điều kiện bắt buộc.

### F4 · P1 · So "build còn mới" bằng giờ commit

- **Vị trí:** `web_build.py:43` và `app.ts:310` so `mtime(dist/)` với `git log -1 --format=%ct HEAD` (giờ *committer*).
- **Báo PASS sai (nguy hiểm hơn):** fast-forward giữ nguyên giờ commit gốc. Tái hiện:
  1. 09:00 một làn commit sửa overlay (X).
  2. 09:30 máy LIVE chạy `CHAY_GAME` trên commit cũ W và build lại dist.
  3. 10:00 `git pull` nhận X (`%ct` = 09:00 < mtime dist 09:30).
  4. `check` báo "còn mới", không build lại, nên overlay cũ lên sóng. Đây đúng là lỗi V4 P0.4 đã cảnh báo.
- **Báo FAIL/rebuild thừa:** `pull` chỉ đổi `docs/` hoặc `mailbox/` cũng buộc build lại (~1 phút). Không chặn buổi LIVE vì `.cmd` tự build, nhưng tốn thời gian lúc gấp.
- **Phụ:** `headCommitAtMs` chỉ đọc một lần lúc `buildApp` (`app.ts:114-123`). Đúng cho source-run (pull rồi khởi động lại), nhưng `git pull` khi server đang chạy thì preflight vẫn so với HEAD cũ.
- **Đề xuất:**
  - Khi build, ghi `dist/.build-commit` chứa hash HEAD.
  - Khi kiểm: so hash. Nếu khác thì chạy `git diff --quiet <hash> HEAD -- apps/overlay apps/dashboard packages pnpm-lock.yaml`; chỉ build lại khi diff có đổi.
  - Preflight dùng cùng logic đó (chung một nguồn sự thật với `web_build.py`).

### F5 · P1 · Backup phình ổ đĩa

- **Vị trí:** `CHAY_GAME.cmd:32` chạy `backup.py create` **mỗi lần khởi động**. `make_backup` chép toàn bộ `assets-local/` (trừ `_backup`, `review` — `:20`) vào thư mục mới `backups/<stamp>/` (`:152-176`). Không có cơ chế giữ N bản hay xoá bản cũ.
- **Tái hiện:** khởi động lại game 10 lần trong ngày LIVE (sửa lỗi, đổi máy, crash) tạo ra 10 bản sao đầy đủ của kho chibi, ref và MC. Dung lượng thực tế CHƯA KIỂM CHỨNG vì không có `assets-local` trong cloud.

  Khi ổ đầy thì `copy2` báo `OSError`, backup FAIL, server không mở (F2 cùng đường). Đồng thời SQLite của phiên đang chạy cũng có thể ghi lỗi.
- **Đề xuất:**
  - Giữ N bản gần nhất (ví dụ 5), hoặc dọn bản cũ hơn X ngày.
  - Asset: chỉ chép khi manifest SHA-256 khác bản trước. Có thể dùng hardlink cho file trùng.
  - Kiểm dung lượng trống trước khi chép.
  - Backup FAIL nhưng đã có bản hợp lệ < 24 giờ thì cảnh báo và vẫn mở server.

### F6 · P1 · Preflight "Nguồn comment" PASS chỉ vì `CONNECTED`

- **Vị trí:** `app.ts:282-288` PASS khi `live.status === 'CONNECTED'`.
- **Vấn đề:** V4 §3 ghi rõ "CONNECTED không đồng nghĩa đã nhận comment". Adapter không chính thức có thể kết nối được mà không nhận được chat, ví dụ phòng sai hoặc bị chặn.
- **Đề xuất:** PASS khi đã CONNECTED **và** `health.commentsReceived > 0` trong N phút gần nhất (đã có `lastCommentAtMs`, `runtime.ts:717-718`). Nếu chỉ CONNECTED thì báo WARN "chưa thấy comment nào".

### F7 · P1 · Khôi phục khi server đang mở DB

- **Vị trí:** `restore_database` (`backup.py:206-220`) xoá `quiz.db-wal`/`-shm` của đích, rồi `os.replace` file DB. Không kiểm server có đang chạy không; chỉ in lời nhắc (`:197`), và `--yes` bỏ qua cả lời nhắc.
- **Tái hiện:**
  - Linux/macOS: server đang chạy, gọi `restore --yes`. Thao tác thành công. Server tiếp tục ghi vào inode cũ đã bị unlink, mọi đáp án và điểm sau đó mất khi tắt server, DB đích "lùi" về bản backup.
  - Windows: SQLite mở file không có `FILE_SHARE_DELETE`, nên nhiều khả năng `unlink` báo `PermissionError` và dừng an toàn. CHƯA KIỂM CHỨNG.
- **Đề xuất:**
  - Trước restore, thử kết nối `127.0.0.1:8787` hoặc kiểm lock file. Nếu server đang chạy thì từ chối.
  - Đổi thứ tự: `os.replace` trước, chỉ xoá sidecar khi đã chắc không có tiến trình giữ file.

### F8 · P2 · Restore không xoá asset thừa; có thể migrate chính bản backup

- **Asset thừa:** `restore_backup` (`:232-241`) chỉ chép đè file có trong manifest. Asset mới thêm sau thời điểm backup vẫn còn lại, nên "khôi phục" không trả về đúng trạng thái cũ.
- **Migrate bản backup:** `sqlite_backup` mở **bản backup** bằng `new Store(source)` (`backup_db.ts:17`). Constructor chạy `migrate` và `journal_mode=WAL` (`packages/persistence/src/index.ts:91-100`). Nếu backup có schema cũ hơn code hiện tại thì file trong `backups/` bị migrate tại chỗ, SHA-256 đổi, và lần `verify` sau sẽ FAIL.

  Đã thử cùng schema trong cloud: create → verify → restore → verify vẫn PASS. Trường hợp khác schema CHƯA KIỂM CHỨNG.
- **Đề xuất:**
  - Mở nguồn backup ở chế độ read-only (`new Database(path, { readonly: true })`), không qua `Store`.
  - Restore asset: tuỳ chọn `--mirror` để xoá file không có trong manifest.

### F9 · P2 · Overlay ACK

- `app.ts:267`: PASS nếu **bất kỳ** overlay nào đã ACK. Một tab xem thử trên trình duyệt đủ để PASS, kể cả khi nguồn Browser Source trong OBS/LIVE Studio đã chết.
- Ngay sau mỗi lệnh (`stateVersion` tăng), có khoảng vài trăm ms ACK chưa kịp tới, nên báo FAIL tạm thời. Operator bấm Start ngay sau Auto/Pause có thể bị 422 vô lý.
- **Đề xuất:**
  - Phân biệt overlay "phát" và "xem thử", ví dụ bằng query `?role=program`.
  - Cho phép ACK trễ tối đa 1 `stateVersion` hoặc 2 s.

### F10 · P2 · Preflight asset chỉ kiểm tồn tại

- `app.ts:243-264` chỉ `existsSync`. Trỏ `QUIZ_ASSETS_DIR` nhầm sang `fixtures/assets-placeholder/` (ảnh xám ≤ 4 KB) vẫn PASS.
- **Đề xuất:** kiểm kích thước tối thiểu (ví dụ `trophy-stage.png` > 50 KB) hoặc đối chiếu checksum với `ASSET_INVENTORY`. Báo FAIL nếu đường dẫn nằm trong `fixtures/`.

### F11 · P2 · Tổng duyệt Mock là tổng duyệt **mã nguồn**, chưa phải P0.5 của V4

- `tools/rehearsal.ts` chạy Fastify thật, nhưng dùng đồng hồ ảo (`:25`), DB tạm (`:438`), câu DEMO và chế độ MOCK. Không có overlay, OBS, audio hay máy operator. Cổng preflight TIKTOK không được thử, vì MOCK chỉ WARN.
- Biên bản `docs/reports/REHEARSAL_2026-11-12.md` tự ghi đúng phạm vi. Nhưng mục "Ghi chú" vẫn nói regression `it.fails` của simulator, trong khi `simulator.test.ts:7` hiện là `it` thường (đã sửa ở C-0097), nên ghi chú đã cũ.
- **Đề xuất:**
  - Gọi kết quả này là `CODE_REHEARSAL_PASSED` (hoặc ghi rõ "mã nguồn").
  - V4 P0.5 vẫn cần một buổi trên máy operator: overlay trong OBS/LIVE Studio, audio, điện thoại xem thử, có ảnh/video.
  - Cập nhật ghi chú simulator.

### F12 · P2 · Lặt vặt

- `app.ts:217` `excludesDemo` luôn `true` ở TIKTOK, vì `eligible` đã lọc DEMO qua `allowDemo=false`. Không sai, nhưng là kiểm tra thừa. Câu "đã loại DEMO" trong lý do là đúng.
- `scripts/privacy-check.mjs` (khối `runCli`) giờ `lstat` **mọi** tệp đã theo dõi. Một tệp nhị phân đã xoá ở working tree nhưng chưa commit sẽ làm privacy-check FAIL ("không thể đọc metadata"); trước đây chỉ tệp text mới vậy. Chỉ ảnh hưởng máy dev, CI checkout sạch không gặp.
- `privacy-check.mjs`: thư mục `fixtures/assets-placeholder/` chấp nhận **bất kỳ** ảnh ≤ 4 KB. Một ảnh thật cỡ nhỏ (logo, thumbnail) vẫn lọt. Đề xuất: danh sách tên cố định hoặc kiểm ảnh một màu.
- Simulator (`simulator.ts:54,94`): `runId` UUID mỗi instance, sửa đúng lỗi trùng `sim-N`. Đã có test `simulator-restart.test.ts:25`. Không thấy vấn đề.

## Những gì đã ổn

- **Backup DB:** dùng SQLite Online Backup (`Store.backup`), không chép file thô, nên nhất quán cả khi có WAL. Manifest SHA-256 kèm kích thước. Đường dẫn trong manifest được kiểm chống `..` và thoát thư mục (`backup.py:35-52`).
- **Restore:** verify trước, yêu cầu gõ xác nhận, ghi DB qua file tạm rồi `os.replace` (nguyên tử trên cùng ổ đĩa).
- **Preflight TIKTOK:** chặn 422 kèm danh sách FAIL. MOCK chỉ cảnh báo. Có test cho từng mục FAIL (`preflight.test.ts:197`).
- **`CHAY_GAME.cmd`:** cố định `QUIZ_DATA_DIR=<repo>\data` và in commit + đường dẫn DB, nên tách khỏi `%APPDATA%` của Electron. Lỗi "hai thư mục dữ liệu" ở ma trận V4 đã được xử lý cho đường source-run.
