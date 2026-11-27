---
id: C-0422
from: coordinator
to: codex2
type: task
title: CHAY_GAME khởi động nhanh trên HDD + chặn lỗi liên kết @quiz
ref: 
priority: high
needs: 
created: 2026-11-27T21:49:09+07:00
---
Người dùng duyệt 27/11 ("Giao ngay"). **Rút ngắn thời gian khởi động `CHAY_GAME.cmd` trên ổ HDD và chặn lỗi vận hành lúc khởi động.**

## Bối cảnh
- Ngày 20/11, người dùng bấm CHAY_GAME lúc 21:47 nhưng tới 22:02 cổng 8787 mới mở, trễ ~15 phút. Ổ E là HDD: disk time ~296 %, đọc ~5 MB/s, server gần như không dùng CPU. `tools/open-game-windows.ps1` chỉ chờ `/health` 90 giây nên hết hạn và không mở được cửa sổ Overlay/Dashboard.
- Có 3 bước khởi động nghi là nặng:
  1. `py -3 tools\web_build.py ensure`
  2. `py -3 tools\backup.py create` — mỗi lần chép lại toàn bộ DB + `assets-local` (~1.200 tệp), giữ 10 bản.
  3. `node_modules\.bin\tsx.cmd apps\server\src\main.ts` — tsx dịch mã nguồn TS lúc chạy, tức là đọc rất nhiều tệp nhỏ trên HDD.
- 22/11 còn gặp lỗi: các liên kết `node_modules/@quiz/*` của checkout chính trỏ vào `.claude/worktrees/...` cũ, nên game chạy bằng package cũ mà không báo gì.

## Việc 1 — Đo trước khi sửa
- Đo thời gian từng bước (ensure / backup / server tới lúc `/health` trả 200 / cửa sổ mở) trên **một bản sao** của repo đặt trên ổ E, dùng cổng riêng (không dùng 8787). Không đụng checkout chính và `data/` thật.
- Đo 2 trường hợp:
  - **ấm**: chạy lại ngay sau một lần chạy;
  - **gần lạnh**: sau khi đọc một tệp lớn ≥ 4 GB không liên quan để đẩy cache, hoặc cách khác tương đương; ghi rõ dùng cách nào.
- Chạy mỗi trường hợp 3 lần, báo trung vị.

## Việc 2 — Sửa (cách đơn giản nhất)
1. **Chạy server từ bản build:** bundle `apps/server` thành 1 tệp JS (esbuild đã có trong `node_modules`; không thêm dependency mới nếu đủ dùng) rồi chạy bằng `node` thay vì `tsx`.
   - Dùng hash nguồn giống `web_build.py ensure`: mã nguồn đổi thì tự build lại, không đổi thì bỏ qua.
   - Native module (SQLite) để `external`.
   - Đường dẫn asset/migration phải đúng khi chạy từ dist.
   - Preflight phải kiểm được bản build server khớp nguồn, giống overlayBuild/dashboardBuild.
2. **Backup tăng dần:**
   - Asset nào không đổi (cùng size + mtime, hoặc cùng hash nếu đã có manifest) so với bản backup gần nhất thì không chép lại; dùng hardlink nếu cùng ổ và NTFS, không được thì mới chép.
   - DB vẫn backup đầy đủ, nhất quán như hiện nay.
   - Mỗi bản backup vẫn phải tự đủ: `backup.py restore` và `verify` chạy được với bất kỳ bản nào, kể cả sau khi các bản cũ bị xoá theo `--keep`.
   - Giữ nguyên exit code 2 khi ổ đầy.
3. **Cửa sổ game:** thay mốc 90 giây cố định bằng cách chờ theo tiến trình server:
   - server còn sống thì tiếp tục chờ (trần ≥ 20 phút) và cứ 30 giây in một dòng "đang chờ máy chủ…";
   - server chết thì báo lỗi ngay.
4. **Kiểm tra liên kết `@quiz/*`** trước khi chạy:
   - nếu liên kết nào trong `node_modules/@quiz/*` (và `node_modules/.pnpm` nếu cần) trỏ ra ngoài `packages/`/`apps/` của chính checkout đang chạy (ví dụ vào `.claude/worktrees`), dừng khởi động;
   - in lỗi tiếng Việt kèm lệnh sửa: `corepack pnpm install --frozen-lockfile --offline`.
5. In thời gian của từng bước ra cửa sổ CHAY_GAME, ví dụ `[1/3] xong sau 12 s`, để lần sau dễ chẩn đoán.

## Không được đổi
- Luật chơi, UI, bố cục, giọng MC, câu hỏi.
- Định dạng DB, thông điệp chữ hiển thị cho người dùng trong CHAY_GAME. Chỉ được thêm dòng thời gian và lỗi mới.
- **KHÔNG sửa** `apps/server/src/runtime.ts` và `packages/persistence/**`: Codex 1 đang sửa ở C-0420. Bundle chỉ build những file đó, không sửa. Nếu bắt buộc phải đụng vào thì hỏi coordinator trước.

## Nghiệm thu
- **Ấm:** từ lúc bấm CHAY_GAME đến khi `/health` trả 200 **≤ 60 s**.
- **Gần lạnh:** giảm **≥ 50 %** so với baseline đo ở Việc 1. Báo cả hai con số.
- Backup lần 2 khi asset không đổi: **≤ 10 s**, chỉ ghi DB + manifest. Restore từ bản tăng dần cho kết quả byte-for-byte giống bản đầy đủ (so hash toàn bộ tệp).
- Sửa 1 dòng trong `apps/server/src` thì lần chạy sau tự build lại server; preflight báo FAIL nếu bản build server cũ hơn nguồn.
- Dựng tình huống liên kết `@quiz/contracts` trỏ vào một thư mục worktree giả → CHAY_GAME dừng, in đúng lệnh sửa.
- Server khởi động chậm giả lập (ví dụ thêm biến môi trường delay 3 phút chỉ dùng cho test) → cửa sổ game vẫn tự mở sau khi `/health` lên.

## Ca biên
- Chạy lần đầu chưa có bản backup nào; bản backup gần nhất bị hỏng hoặc thiếu manifest → chép đầy đủ.
- `assets-local` có tệp bị xoá hoặc đổi tên giữa 2 lần backup.
- Ổ không phải NTFS hoặc không tạo được hardlink → chép thường, không lỗi.
- Bản build server có nhưng thiếu tệp → build lại.
- Không có Git (`QUIZ_COMMIT=khong-xac-dinh`) → vẫn chạy được, build lại.

## Test
- typecheck, `privacy:check`, vitest đủ (unit + integration).
- `py -3 -m pytest tools/test_backup.py tools/test_web_build.py`, kèm test mới cho phần backup tăng dần, kiểm liên kết và hash server.
- **Chạy E2E đầy đủ 2 lượt:** khởi động bằng CHAY_GAME (bản sao, cổng riêng) → vòng MOCK trọn vẹn → Victory, mỗi lượt có Overlay + Dashboard mở. Playwright đủ 2 lượt asset thật + 1 lượt placeholder: 0 failed.
- Dọn hết thư mục tạm khi xong (ổ C gần đầy; bản sao đặt trên ổ E và cũng xoá sau khi đo).

## Giao hàng
- Nhánh `codex2/c-fast-start` từ origin/main mới nhất; merge origin/main lại trước khi báo.
- KHÔNG commit ảnh, log, profile, bản backup hay dữ liệu đo.
- Report gồm:
  - bảng TRƯỚC/SAU từng bước (ấm / gần lạnh, trung vị 3 lần);
  - danh sách file sửa (file:dòng);
  - số passed/failed của từng lượt test;
  - lệnh để coordinator tự đo lại.
- ACK khi nhận việc.
