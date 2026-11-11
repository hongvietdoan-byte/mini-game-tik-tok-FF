# Ma trận khoảng trống theo plan V4 (C-0093)

Lập bởi: làn `cloud`, 12/11/2026. Phạm vi: Lượt A của V4 (§12), chỉ đọc code + viết tài liệu, không sửa code.
Nguồn: `docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`, `docs/DECISIONS.md` D-19..D-22, `mailbox/BOARD.md` #18–#21, code trên `main` @ `3769b01`.

**Bằng chứng chạy lại trong cloud @ `ff1d9f2` (cập nhật 12/11 theo C-0099):** `corepack pnpm typecheck` sạch; `corepack pnpm test` → 41 file, **268/268 test PASS**; `node scripts/privacy-check.mjs` PASS (500 tệp). Bản đầu (C-0093) @ `3769b01`: 260/260.
E2E Playwright **không chạy lại được** trong cloud (thiếu `assets-local/`, không có Edge — xem `docs/review/RA_SOAT_QUY_TRINH.md` §6). Con số "42/42 trên Windows" chỉ là báo cáo agent, chưa tái lập.

## Quy ước

- Trạng thái dùng đúng từ vựng V4: `IMPLEMENTED` (có code, chưa có test đáng tin) · `UNIT_VERIFIED` (vitest unit/tích hợp in-process PASS @ `3769b01`) · `E2E_VERIFIED` (Playwright tái lập được) · `BLOCKED` · `DEFERRED`. Ghi thêm `MISSING` khi chưa có code.
- **Không mục nào được ghi `VISUAL_APPROVED` hay `LIVE_VERIFIED`**: người dùng chưa duyệt hình, chưa có LIVE thật (BOARD #21).
- Không có mục nào đạt `E2E_VERIFIED` vì E2E chưa tái lập được ngoài máy Windows.
- Ước lượng tính theo ngày công của một làn (0,5 = nửa ngày). Riêng các bước của người dùng không ước lượng.
- "Code hiện có" là `file:dòng` trên `main` (bản đầu @ `3769b01`; các dòng P0 gộp sau đó cập nhật @ `ff1d9f2`). Mục nào chỉ có trên nhánh chưa gộp thì ghi rõ tên nhánh.
- C-0092 (preflight, backup + đường chạy, rehearsal) **đã gộp main** (`397157f`..`5ae3a49`). Lỗi tìm thấy khi rà: `docs/review/RA_SOAT_P0.md` (F1–F12).

## 1. Logic cốt lõi được yêu cầu kiểm cụ thể

| Hạng mục V4 | Code hiện có | Bằng chứng | Trạng thái | Còn thiếu | Làn đề xuất | Ưu tiên | Ước lượng | Phụ thuộc |
|---|---|---|---|---|---|---|---|---|
| Chọn câu SMART_RANDOM 7/5/3 theo độ khó (V4 §3) | `packages/quiz-core/src/selection.ts:53-88`. Chỉ có RANDOM có seed; chú thích dòng 54 ghi "SMART_RANDOM … thuộc Phase 2". `difficulty` có trong snapshot (`:109`) nhưng không dùng để chọn. DECISIONS "Hoãn" ghi SMART_RANDOM là backlog. | `selection.test.ts` (8 test), `round.test.ts:136` (seed tất định) | **MISSING** (RANDOM: UNIT_VERIFIED) | Quota theo độ khó, cấu hình quota, xử lý khi một mức thiếu câu (cảnh báo, không lặp âm thầm). Ngoài ra phải gắn nhãn độ khó cho 36 câu và kiểm có đủ 7/5/3 không. | codex1 (test) + coordinator (`quiz-core` thuộc làn coordinator) | P1 (xem mâu thuẫn M3) | 1 | Bộ câu đã gắn độ khó (P0.2) |
| Không lặp câu trong trận / trong phiên | `selection.ts:64-84`: lọc `usedInSession`; `allowReuse` chỉ khi operator bật. Lỗi `INSUFFICIENT_QUESTIONS` ở `apps/server/src/runtime.ts:600-611`. | `round.test.ts:234`, `operator-flow.test.ts:283` | UNIT_VERIFIED | — | — | — | — | — |
| Sảnh JOIN trước vòng (V4 §3 "comment đáp án hợp lệ hoặc JOIN nếu operator bật") | Không có. `grep JOIN` chỉ ra SQL. Comment trong LOBBY bị loại `NOT_ACCEPTING` (`packages/quiz-core/src/answers.ts:34`). Người chơi chỉ được tạo khi có đáp án hợp lệ trong ACCEPTING (`runtime.ts:742-755`). | — | **MISSING** (phương án "tham gia bằng đáp án hợp lệ": UNIT_VERIFIED) | Nếu muốn JOIN: thêm từ khoá, cờ operator, chỗ trong sảnh + ghế. V4 ghi "nếu operator bật", nên đây là tuỳ chọn. | người dùng quyết → coordinator | P2 / tuỳ chọn | 1 | Người dùng chốt (M4) |
| 35 ghế 7×5, xoay ghế khi > 35 người | `packages/audience-engine/src/index.ts` (`createSlots`, `onPlayerJoined:164`, `rotate:251`); gọi ở `apps/server/src/audience.ts:101-113` và `runtime.ts:409-416` (mỗi `audienceRotateEvery`=2 câu, tối đa 5 ghế đổi). **Ghim Top N theo điểm** (`audiencePinTop`=3). | `audience-engine/index.test.ts` (12), `tests/integration/audience.test.ts` (3), `tests/load/audience.test.ts` | UNIT_VERIFIED | Trái V4 §4 "giữ vị trí ưu tiên cho người mới/vừa trả lời, **không ưu tiên điểm**" (M2). Chưa có test 0/1/35/36/500/2.000 người trên overlay (V4 §9). | coordinator (nếu đổi) + codex1 (test) | P1 | 0,5 | Người dùng chốt M2 |
| characterId ổn định trong trận, không random lại ở Victory | `audience.ts:68-93`: gán một lần, lưu DB (`store.assignCharacter`); podium lấy `characterOf` (`runtime.ts:898`) | `v3-acceptance.test.ts:233` (reconnect giữ ghế), audience tests | UNIT_VERIFIED | Test "thay ghế không đổi character" trên overlay | codex1 | P1 | 0,25 | — |
| Thời gian trả lời 15 s | `packages/contracts/src/index.ts:244` `answerMs` mặc định 15 000; `engine.ts:315-318` mở timer backend. MOCK có `speedMultiplier` (`engine.ts:113`); LIVE ép 1. | `engine.test.ts`, `round.test.ts:81` | UNIT_VERIFIED | — | — | — | — | — |
| Đủ các pha PREPARE → READING → ACCEPTING → REVEAL → LEADERBOARD (kể cả READING mới gộp) | `engine.ts:300-400`. READING chỉ vào khi `mcVoiceEnabled` (`:354-357`), hạn cứng `MAX_MC_READING_MS`=20 s (`contracts:85`, `engine.ts:308-313`). Hết hạn hoặc lỗi → `MC_READING_ABORTED` rồi ACCEPTING (`:358-365`, `:457-476`). | `engine.test.ts` (25), `v3-acceptance.test.ts:139` (READING hiện 4 đáp án, chưa nhận comment, không lộ đáp án) | UNIT_VERIFIED (engine) | Overlay trên `main` **chưa có giao diện riêng cho READING** (`apps/overlay/src` không có chữ `READING`; chỉ xử lý `PREPARE` ở `v3/ArenaStage.tsx:91`). Cảnh READING đã làm ở C-0080/C-0098 trên nhánh chưa gộp `codex2/c0068-victory-ref`. Giọng MC tạm dừng (D-22) nên mặc định `mcVoiceEnabled=false` → bỏ qua READING. | codex2 | P1 | (trong C-0080) | C-0080 |
| Khoá đáp án đầu tiên | `persistence/src/schema.ts:232` `UNIQUE(question_instance_id, player_id)`; `runtime.ts:741-758` chèn trong transaction, trùng → `DUPLICATE_ANSWER` | `round.test.ts:159`, `v3-acceptance.test.ts:171` (spam A 100 lần), `:196` (A→B) | UNIT_VERIFIED | V4 §4 ghi `UNIQUE(roundId, questionInstanceId, playerId)`. `questionInstanceId` đã chứa `roundId` (`selection.ts:101`) nên tương đương. | — | — | — | — |
| Chống trùng event / reconnect phát lại | `runtime.ts:731-744`: `seenEvents` trong RAM + `markEventProcessed` bền trong DB | `round.test.ts:159`, `tiktok-replay.test.ts` (3), `tiktok.replay.test.ts` (6) | UNIT_VERIFIED | Chưa có comment thật (P0.3) | — | — | — | — |
| Comment trễ / sớm / thuộc câu trước | `answers.ts:27-46`: cửa sổ `[openAtMs, deadlineMs)`, `STALE_SOURCE_TIMESTAMP` nếu `sourceTimestamp < openAt` hoặc trễ > `maxSourceLagMs` (5 s, `contracts:278`). Giờ nguồn TikTok được quy về giờ máy ở `live-adapters/src/tiktok.ts:150-160`. | `answers.test.ts` (7), `round.test.ts:191` | UNIT_VERIFIED | Ngưỡng 5 s chưa đo trên LIVE thật. Độ trễ TikTok có thể > 5 s và loại nhầm đáp án hợp lệ (CHƯA KIỂM CHỨNG). | operator + codex1 (đo khi có LIVE) | P0 (gắn P0.3) | 0,25 | P0.3 |
| Pause / resume / huỷ câu (skip, void trước và sau reveal) | `engine.ts:584-650`: PAUSE đóng băng timer; RESUME mở lại từ `now` (comment trong lúc pause không tính, `:283-292`). SKIP/VOID trước reveal → không chấm; VOID sau reveal → bút toán đảo. | `operator-flow.test.ts:319`, `:361`; `round.test.ts:244` | UNIT_VERIFIED | E2E dashboard cho nút Pause/Huỷ câu chưa tái lập ngoài Windows | codex2 (E2E) | P1 | 0,5 | P1.3 |
| Mất kết nối giữa câu | `engine.ts:488-495`: ACCEPTING → `CONNECTION_INTERRUPTED`; có mạng lại không tự chạy; `RESUME` cần `connectionOk` (`:597-606`). Adapter reconnect có backoff (`tiktok.ts:177`). | `round.test.ts:264`, `operator-flow.test.ts:430`, `connection.test.ts` | UNIT_VERIFIED | Chưa thử với TikTok thật; chưa có phương án dự phòng cho operator (RA_SOAT R-a) | operator + coordinator (runbook) | P0 | 0,25 | P0.3 |
| Khôi phục sau restart | `runtime.ts:212-225` `recover()` → `PROCESS_RESTARTED`; `engine.ts:510-527` → PAUSED/RECOVERY, timer tính theo heartbeat cuối; chỉ nhận `RESOLVE_RECOVERY`/`STOP` (`:651-680`). Gọi lúc khởi động ở `apps/server/src/main.ts:52`. | `round.test.ts:321`, `:354`, `:374`; `v3-acceptance.test.ts:294` | UNIT_VERIFIED | Chưa thử khôi phục trên bản Electron (`apps/desktop/src/main.ts`) | codex1 (trong rehearsal C-0092) | P0 | (C-0092) | C-0092 |
| Top 10 / Victory đồng hạng | `quiz-core/src/scoring.ts:180-205` `rankPlayers` (điểm → số câu đúng → cùng hạng 1,1,3); `buildPodium:218-232` (`tieAcrossCutoff`). Overlay hiện "ĐỒNG HẠNG" ở `apps/overlay/src/v3/Victory.tsx:27,54`. | `scoring.test.ts` (10), `v3-acceptance.test.ts:269`; E2E `overlay.spec.ts:485` (chưa tái lập) | UNIT_VERIFIED | V4 §3 ghi "BXH: điểm → số đúng → đồng hạng" — khớp. Chưa test tên dài/emoji/tên độc hại trên Top 10 (V4 §9). Hiện chỉ có test XSS ở `overlay.spec.ts:164`. | codex2 (E2E) | P1 | 0,5 | — |
| Tính điểm | `scoring.ts:16-31` Kahoot 500–1000 + chuỗi | `kahoot.test.ts`, `speed.test.ts`, `round.test.ts:81` | UNIT_VERIFIED | **Không phải khoảng trống**: D-21 giữ Kahoot, thắng V4 §3. | — | — | — | — |
| Preflight trước Start | `apps/server/src/app.ts:199-326` `makePreflight()` + `GET /api/preflight` (`:370`): câu (APPROVED, đủ, không lặp, loại DEMO), DB ghi thử, asset bắt buộc, overlay ACK, nguồn comment, build overlay/dashboard. Chặn 422 `PREFLIGHT_FAILED` cho `START_ROUND` ở TIKTOK (`:529-540`); MOCK chỉ WARN. | `tests/integration/preflight.test.ts` (5) | UNIT_VERIFIED (đường HTTP) | **Auto mode bỏ qua cổng** (`runtime.ts:517`, F1 P0). `CONNECTED` chưa chứng minh có comment (F6). Audio chưa kiểm. ACK của tab xem thử cũng tính (F9). Asset chỉ kiểm tồn tại (F10). | coordinator (server) + codex1 (test) | **P0** (F1) | 0,5 | — |
| Backup / restore | `tools/backup.py` (create/verify/restore, manifest SHA-256), `tools/backup_db.ts` gọi `Store.backup()` (SQLite Online Backup). `CHAY_GAME.cmd:30-33` backup mỗi lần khởi động, FAIL thì không mở server. | Thử trong cloud: create → verify → restore → verify PASS (cùng schema). Chưa có test tự động cho `backup.py`. | IMPLEMENTED | **Máy chưa có `data/quiz.db` không bao giờ khởi động được** (F2 P0, đã tái hiện). Không dọn bản cũ, mỗi lần chép đủ `assets-local` (F5). Restore không chặn khi server đang chạy (F7). Restore có thể migrate chính bản backup (F8). | codex1 | **P0** (F2) / P1 | 0,5 | — |
| Đường chạy `CHAY_GAME.cmd` | `CHAY_GAME.cmd`: cố định `QUIZ_DATA_DIR=<repo>\data`, in commit + DB, `py tools\web_build.py check` → build lại nếu dist thiếu/cũ → `verify` → backup → server. Đường source-run đã tách khỏi `%APPDATA%` (`:6-15`). | `docs/HUONG_DAN_LIVE.md` khớp đường source-run; chưa chạy trên Windows trong cloud | IMPLEMENTED | **Thiếu `py`/`git` hoặc Python < 3.9 → dừng hẳn, báo sai nguyên nhân** (F3 P0). Kiểm "dist còn mới" so với giờ commit, có thể báo PASS sai sau `git pull` (F4). | codex1 | **P0** (F3) / P1 (F4) | 0,5 | Người dùng xác nhận máy LIVE có `py` + `git` |

## 2. P0 — chặn buổi LIVE (V4 §7)

| Hạng mục V4 | Code hiện có | Bằng chứng | Trạng thái | Còn thiếu | Làn đề xuất | Ưu tiên | Ước lượng | Phụ thuộc |
|---|---|---|---|---|---|---|---|---|
| P0.1 Khoá ref + kiểm kê asset | `docs/ASSET_INVENTORY.md`; ref `assets-local/ref/*.png` (D-20) — `assets-local/` không có trong git | Không kiểm được trong cloud | **BLOCKED (ngoài cloud)** · REFERENCE_MISSING trong repo | Contact sheet + checksum từ máy Windows; xác nhận `brand/logo.png` là logo sự kiện hay logo Free Fire (CHƯA KIỂM CHỨNG) | coordinator (máy Windows) | P0 | 0,5 | — |
| P0.1 Màn Quiz đúng ref | `apps/overlay/src/v3/ArenaStage.tsx`, `arena.css` trên `main`. C-0080 (6 điểm + READING) và C-0098 (câu dài ≥ 30 px, Top 10 2×5) nằm trên nhánh **chưa gộp** `codex2/c0068-victory-ref`. | Ảnh ghép REF \| RENDER ở máy Windows (Y-0157); Playwright 52/52 theo report codex2 (chưa tái lập) | IMPLEMENTED trên nhánh — chưa duyệt hình, chưa gộp | Người dùng duyệt ảnh ghép; thêm ảnh 720×1280 + HUD | codex2 → người dùng | P0 | 0,25 | Người dùng duyệt |
| P0.1 Victory D07/D08 | **`main`**: `Victory.tsx:92-121` vẫn **vẽ cúp/sân khấu bằng SVG** (`VictoryCup`) — trái D07/D-20. Bản dùng raster `victory/trophy-stage.png` nằm trên nhánh **chưa gộp** `codex2/c0068-victory-ref` @ `1d6bbd8`. Nhánh đó vẫn render `<BrandMark />` ở header (`Victory.tsx:116`). | Ảnh so sánh đã gửi người dùng (C-0094) | IMPLEMENTED trên nhánh — chưa duyệt hình, chưa gộp | (1) Người dùng duyệt `1d6bbd8` → gộp. (2) Kiểm D08: nếu `BrandMark` là logo Free Fire thì phải bỏ. (3) Nền nhạt, thiếu chùm sáng (C-0094). | codex2 → người dùng | P0 | 0,5 | Người dùng duyệt |
| P0.1 Tên/điểm động, không che cúp, không 3 bục riêng | Nhánh `c0068`: tên/điểm từ `podium` snapshot; E2E `overlay.spec.ts:508` | Chưa tái lập | IMPLEMENTED | Test "không che cúp" bằng toạ độ; test HUD che tên | codex2 | P0 | 0,25 | Gộp Victory |
| P0.2 15 câu APPROVED+VERIFIED | `isEligible` `selection.ts:24-34` (APPROVED **và** VERIFIED/OPERATOR_VERIFIED; DEMO chỉ ở MOCK). 36 câu đã được bấm duyệt hộ trong `data/quiz.db` máy LIVE (BOARD #20), **chỉ để chạy thử**. | `operator-flow.test.ts:283`; `fixtures.test.ts` | **BLOCKED (người dùng)** | Người dùng duyệt nội dung + nguồn ≥ 15 câu cho buổi thi; danh sách ID + nguồn | người dùng (+ codex1 soạn bảng nguồn) | P0 | — | — |
| P0.3 Comment thật | Adapter `live-adapters/src/tiktok.ts` (không chính thức, chỉ đọc, `processInitialData:false` `:240`, chống trùng `msgId` `:53-61`) | Chỉ mock/replay: `tiktok.test.ts` (7), `tiktok.replay.test.ts` (6), `tests/integration/tiktok*.ts` | **BLOCKED** (LIVE Studio "No access"; chưa có phiên LIVE được phép) | Biên bản comment thật: event đến, ghi player, chấm điểm, latency, reconnect | người dùng/operator + codex1 (log) | P0 | 0,5 | Quyền LIVE |
| P0.4 Một đường chạy | Source-run `CHAY_GAME.cmd` đã chốt cho 12–14/11 (`HUONG_DAN_LIVE.md:7`); NSIS ở `apps/desktop` không dùng cho buổi này | — | IMPLEMENTED | Sửa F2/F3/F4; thử trên máy operator: OBS/LIVE Studio + audio + xem thử trên điện thoại | codex1 (F2–F4) + người dùng (OBS) | P0 | 0,5 | — |
| P0.5 Tổng duyệt Mock rồi LIVE | `tools/rehearsal.ts`: Fastify thật, đồng hồ ảo, DB tạm, 6 vòng × 15 câu, 500/2.000 người, restart, spam, deadline, pause | `docs/reports/REHEARSAL_2026-11-12.md`: MOCK_REHEARSAL_PASSED (12 gate) | UNIT_VERIFIED (tổng duyệt **mã nguồn**) | Chưa có tổng duyệt trên máy operator (overlay trong OBS, audio, điện thoại, ảnh/video). Preflight TIKTOK không được thử (F11). | người dùng/operator + coordinator | P0 | 0,5 | P0.1, P0.4 |

## 3. P1 — ổn định và quy trình

| Hạng mục V4 | Code hiện có | Bằng chứng | Trạng thái | Còn thiếu | Làn đề xuất | Ưu tiên | Ước lượng | Phụ thuộc |
|---|---|---|---|---|---|---|---|---|
| P1.1 MC Kelly Voice | `apps/server/src/voice/*` (cache, pre-generate, provider, safe-storage, ffmpeg); engine READING | `voice/*.test.ts` (20), `mc-voice.test.ts` (3) | UNIT_VERIFIED (giả lập) — **DEFERRED theo D-22** (dừng sau mốc 2) | Gọi API thật; C-0079 Voice Settings hoãn | codex1 (sau P0) | P1 | — | D-22 |
| P1.1 PNG Sequence MC | `apps/overlay/src/v3/mc/mcSequence.ts`, `mc-sequence-player` | `mcSequence.test.ts` (4), `mc-sequence-player.test.ts` (3) | UNIT_VERIFIED; thiếu frame Kelly → ảnh tĩnh | Frame thật | người dùng (asset) | P1 | — | — |
| P1.2 Auto preflight + backup | xem §1 | `preflight.test.ts` | IMPLEMENTED — auto mode chưa qua preflight (F1) | Gộp kiểm preflight vào đường auto start | coordinator | P0 | 0,5 | — |
| P1.3 CI/E2E | `.github/workflows/ci.yml`: không có bước Playwright. `QUIZ_ASSETS_DIR` mặc định `<repo>/assets-local` (`apps/server/src/main.ts:40`). Bộ asset giữ chỗ an toàn `fixtures/assets-placeholder/` đã gộp (C-0092 P0-C). | CI xanh lại từ 11/11 22:43 (RA_SOAT §2) | IMPLEMENTED một phần | E2E Chromium trong CI (C-0085 codex1, đang xếp hàng); 720×1280, reduced motion chưa có; câu dài nhất có trên nhánh `c0068` (C-0098) | codex1 (C-0085) | P1 | 1 | — |
| P1.4 Quy trình merge | BOARD #19 (cổng ảnh ghép); code vẫn gộp thẳng `main` | C-0094 tuân thủ (chưa gộp khi chưa duyệt) | IMPLEMENTED (quy tắc) | Chặn merge khi `main` đỏ; người code không tự duyệt hình | coordinator | P1 | 0,25 | — |
| P1.5 Đồng bộ tài liệu | BOARD #18–#21 đã sửa #11/#15/#16; DECISIONS D-19..D-22 | — | IMPLEMENTED một phần | BOARD dòng 3–4 vẫn ghi "Phase 0 + Phase 1", "chưa có test nào"; bảng việc dừng ở C-0018. README/HUONG_DAN_LIVE theo đường chạy chốt. Dọn 33+ nhánh đã gộp. | coordinator | P1 | 0,5 | P0.4 |

## 4. P2 — sau sự kiện (DEFERRED_UNTIL_AFTER_EVENT theo D-22)

| Hạng mục V4 | Code hiện có | Trạng thái | Ghi chú |
|---|---|---|---|
| Theme Pack runtime | `packages/theme-core/src/index.ts` (2 dòng, stub); đặc tả `docs/THEME_PACK_SPEC.md` | DEFERRED | — |
| AI Question Studio | `packages/ai-core/src/index.ts` (2 dòng, stub) | DEFERRED | Không tự đặt APPROVED (BOARD #13) |
| Character Pack mở rộng, lip sync, reactions | — | DEFERRED | — |
| Analytics, rank liên buổi, nhiều game mode | — | DEFERRED | — |
| Installer hardening, update channel, backup tự động | NSIS cơ bản ở `apps/desktop` | DEFERRED | Backup tối thiểu vẫn là P0 (C-0092) |

## 5. Quyết định khoá D01–D10

| ID | Code hiện có | Bằng chứng | Trạng thái | Còn thiếu | Làn | Ưu tiên |
|---|---|---|---|---|---|---|
| D01 Canvas 1080×1920 + 720×1280, HUD preset | Overlay 1080×1920; preset vùng an toàn chỉnh được (BOARD #10); `tests/e2e/safe-zone.test.ts` | E2E chưa tái lập | IMPLEMENTED | Test 720×1280; thử trên điện thoại thật | codex2 + người dùng | P0 (gate Visual) |
| D02 Bán 3D từ asset gốc, không SVG/CSS thay asset | Quiz dùng ảnh `assets-local`; **Victory trên `main` vẫn SVG** | — | IMPLEMENTED (Quiz) / vi phạm trên `main` (Victory) | Gộp `c0068` sau khi duyệt | codex2 | P0 |
| D03 Màn Quiz đủ thành phần | `ArenaStage.tsx` | E2E `overlay.spec.ts:226,300,352` (chưa tái lập) | IMPLEMENTED | Duyệt hình; test câu dài | codex2 | P0 |
| D04 Kelly + TTS một API | `voice/clipai-provider.ts` | voice tests | DEFERRED (D-22) | API thật | codex1 | P1 |
| D05 characterId ổn định, 35 ghế chỉ là hiển thị | §1 | §1 | UNIT_VERIFIED | — | — | — |
| D06 Top 10 sau mỗi câu, không che câu hỏi | `engine.ts:211` (`isInterimLeaderboard`), `sceneFor` | `overlay.spec.ts:183,300` (chưa tái lập) | UNIT_VERIFIED (logic) | Duyệt hình | codex2 | P0 |
| D07 Victory cúp gốc, 3 nhân vật trên bục thấp, 1 giữa/2 trái/3 phải | Nhánh `c0068`; thứ tự trái→phải `podiumLeftToRight` | `overlay.spec.ts:485,508` (chưa tái lập) | IMPLEMENTED trên nhánh | Người dùng duyệt + gộp | codex2 → người dùng | P0 |
| D08 Bỏ logo Free Fire trên Victory; tên/điểm động | Nhánh `c0068` vẫn có `<BrandMark />` (`Victory.tsx:116`); tên/điểm động: có | — | **CHƯA KIỂM CHỨNG** | Xác định `brand/logo.png` là logo gì; nếu là Free Fire thì bỏ | codex2 | P0 |
| D09 PNG Sequence, fallback tĩnh | `v3/mc/*` | tests | UNIT_VERIFIED | Frame thật | người dùng | P1 |
| D10 Ưu tiên ổn định, hoãn mở rộng | D-22 | — | Đang áp dụng | — | coordinator | — |

## 6. Ma trận gate (V4 §8)

| Gate | Hiện trạng @ `ff1d9f2` | Trạng thái |
|---|---|---|
| Functional | typecheck sạch; 268/268 vitest PASS; privacy PASS (chạy lại trong cloud) | UNIT_VERIFIED |
| Visual | Quiz (C-0080/C-0098) và Victory nằm trên nhánh `c0068`, chưa được duyệt; thiếu ảnh 720×1280 | Chưa đạt |
| Data | 36 câu chỉ được duyệt để chạy thử (D-22, BOARD #20) | BLOCKED (người dùng) |
| Operational | Đường source-run đã chốt; backup + preflight đã gộp nhưng còn F1–F3 (P0) | Chưa đạt |
| LIVE | Chưa có comment thật | BLOCKED |
| Release | Còn nhiều P0 mở | NO-GO cho LIVE thật; tối đa CONDITIONAL GO (MOCK) khi Visual + Operational đạt |

## 7. ≤ 10 việc phải xong trước tổng duyệt (xếp theo rủi ro, cao → thấp; cập nhật 12/11 sau C-0099)

1. **Người dùng duyệt nội dung + nguồn ≥ 15 câu cho buổi thi** (P0.2). Không có bước này thì không có vòng LIVE hợp lệ. Bước của người dùng.
2. **Thử comment thật trên một phiên LIVE được phép** (P0.3). Đo độ trễ để chốt `maxSourceLagMs` (5 s). Nếu không có quyền → BLOCKED, chỉ được công bố là MOCK.
3. **Auto mode phải qua preflight** (F1). Hiện vòng TIKTOK tự bắt đầu mà không kiểm overlay, asset, DB, nguồn.
4. **`CHAY_GAME.cmd` không được dừng vì lý do phụ** (F2, F3). Máy chưa có DB, thiếu `py`/`git`, Python < 3.9 đều không mở được server. Cần sửa trước khi phải đổi máy gấp.
5. **Duyệt và gộp nhánh giao diện `codex2/c0068-victory-ref`** (Victory raster + C-0080 + C-0098). `main` vẫn là cúp SVG, trái D07.
6. **Kiểm D08 logo Victory.** `BrandMark` vẫn ở header Victory trên nhánh `c0068`.
7. **Kiểm "bản build còn mới" bằng hash commit** (F4), không dùng giờ commit. Tránh phát overlay cũ sau `git pull`.
8. **Backup có giới hạn bản giữ lại** (F5) và **restore từ chối khi server đang chạy** (F7).
9. **Tổng duyệt trên máy operator** (P0.5): overlay trong OBS/LIVE Studio, audio, xem thử trên điện thoại, có ảnh/video. Tổng duyệt mã nguồn (`tools/rehearsal.ts`) đã PASS nhưng không thay được bước này (F11).
10. **Phương án dự phòng khi TikTok rớt giữa buổi** (RA_SOAT R-a): runbook cho operator khi nào huỷ câu, khi nào dừng. Kèm preflight "nguồn comment" phải thấy comment thật, không chỉ `CONNECTED` (F6).

## 8. Điểm V4 mâu thuẫn với code/quyết định hiện tại — cần người dùng chốt

| # | V4 nói | Code / quyết định hiện tại | Đề xuất |
|---|---|---|---|
| M1 | §3: +100 đúng, chuỗi 3/5/10, không ưu tiên tốc độ | Kahoot 500–1000 theo tốc độ (D-21) | **Đã chốt: giữ Kahoot.** Ghi ở đây để không ai sửa lại theo V4. |
| M2 | §4: xoay ghế ưu tiên người mới/vừa trả lời, **không ưu tiên điểm** | `runtime.ts:413` ghim Top 3 theo điểm khi xoay (`audiencePinTop`) | Hỏi người dùng: giữ ghim Top 3 hay đổi theo V4 (`audiencePinTop=0` + ưu tiên người vừa trả lời). |
| M3 | §3: SMART_RANDOM 7/5/3 mặc định | Chỉ RANDOM có seed; DECISIONS "Hoãn" để SMART_RANDOM ở backlog | Hỏi: cần cho buổi thi không? Nếu cần thì 36 câu phải có đủ 7 dễ/5 vừa/3 khó **đã duyệt** cho mỗi vòng (6 vòng = 90 câu, nhiều hơn 36). |
| M4 | §3: Lobby nhận JOIN nếu operator bật | Không có JOIN; tham gia = trả lời đúng định dạng | Đề xuất: giữ như hiện tại cho buổi thi (V4 cho phép); JOIN để P2. |
| M5 | §3/§4 GamePhase có `ROUND_FINISHED` | Engine dùng `ROUND_END` + `VICTORY` + `INTERMISSION` | Chỉ khác tên; đề xuất không đổi (V4 §4 "không phá engine đã test"). |
| M6 | §4: `UNIQUE(roundId, questionInstanceId, playerId)` | `UNIQUE(questionInstanceId, playerId)`, trong đó `questionInstanceId` đã chứa `roundId` | Tương đương; không đổi. |
| M7 | §6 bảng: "36 câu chưa duyệt" | BOARD #20: đã duyệt **để chạy thử** | Không mâu thuẫn thật, nhưng cổng Data V4 vẫn chưa đạt. Cần người dùng duyệt lại cho buổi thi (việc 1). |
| M8 | §12 Lượt A: "Cập nhật decision D07 trong DECISIONS.md" | D-20 đã làm việc này | Xong, không cần làm thêm. |
| M9 | D07 "không thêm 3 cục bục riêng" | BOARD #18 viết "đứng TRÊN mặt bục bát giác của `trophy-stage.png`" | Khớp nhau nếu bục bát giác là bục gốc trong ảnh. Cần người dùng nhìn ảnh `c0068` để xác nhận. Không hỏi lại quyết định, chỉ duyệt hình. |

## 9. Chưa kiểm chứng (ngoài tầm cloud)

- Nội dung `assets-local/` (ref, cúp, logo, chibi) và checksum.
- `brand/logo.png` là logo gì (liên quan D08).
- E2E Playwright trên Windows/Edge (báo cáo 42/42 chưa tái lập).
- Bộ cài NSIS trên máy sạch; overlay trong OBS/LIVE Studio; thu âm thanh.
- Kết nối TikTok với phiên LIVE thật; độ trễ comment thực tế.
- `data/quiz.db` trên máy LIVE (36 câu APPROVED + OPERATOR_VERIFIED theo BOARD #20).
