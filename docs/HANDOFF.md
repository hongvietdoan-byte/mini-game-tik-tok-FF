# HANDOFF — phiên coordinator (cập nhật 20/11/2026 chiều)

**PHIÊN KẾ (điều phối quiz TikTok, người dùng đổi tài khoản 20/11 ~17:15) — ĐÃ NHẬN 20/11 17:17.**

## Mới nhất 21/11 ~17:00
- Main `6aead045`: gộp C-0378/C-0379/C-0381 (Codex 2, người dùng duyệt ảnh): khung MC REVEAL/LEADERBOARD giữ x 740→998 không đè ngai; Top 3 nhanh nhất mỗi câu (`questionTop3`) chữ nhỏ 20→15 px; ảnh MC hết hở với khung tên (chỉ nới CSS `.v3-mc-figure`). Checkout chính đã ff + `web_build.py ensure`.
- 21/11 ~17:30 main `dfe79963`: cửa sổ overlay program mặc định `contain` (màn 2560×1440 không chứa nổi 1080×1920, `cover` cắt mất phần dưới); `?fit=cover` vẫn dùng được. Mock 15 câu × 400 người: ngai đổi chủ 6 lần đúng (trùng nhân vật là do luật gán ngẫu nhiên sau 62 người). Game đã mở lại 17:31, preflight build PASS.
- **Lỗi người dùng báo 21/11, SỬA SAU (chưa giao Codex):**
  1. Dashboard "MC nói với khán giả": câu "Sắp đủ ghế rùi" bị chặn với từ “đủ”. Nguyên nhân: `runtime.ts:~1196` dùng bộ lọc tên (`nameFilter.findTextMatches`, so khớp bỏ dấu) cho câu MC → "đủ" trùng từ bậy khi bỏ dấu. Hướng sửa đơn giản: câu MC chỉ chặn khi khớp **có dấu** (hoặc danh sách riêng cho câu MC); thêm test "Sắp đủ ghế rùi" được gửi. Live 21/11 còn bị chặn "xe lại đi anh em" (từ “đi”). Gốc: `packages/name-filter/src/default-list.ts` có biến thể không dấu `du`, `di`, `lon`, `cac`, `dit`, `deo`, `buoi` → chặn nhầm đủ/dù/đi/dì/lớn/các/đít… Với câu MC: bỏ qua biến thể không dấu, chỉ khớp từ có dấu và các từ viết tắt (dm, vcl, cc…).
  2. Dashboard "Tự bắt đầu khi đủ ghế": hiện "Đã ngồi 30/35" nhưng đã đếm ngược vào trận. Sảnh chỉ còn 30 ghế (C-0333 bỏ hàng ghế đầu) mà `apps/dashboard/src/main.tsx:679` vẫn ghi cứng 35. Hướng sửa: lấy sức chứa thật (số ghế của audience/server) thay số 35; test hiện "Đã đủ ghế" khi 30/30.
  3. Live 21/11: người lên ngai để lại **1 ghế trống mãi**, không mở cho người mới. Nguyên nhân: `apps/server/src/audience.ts:302` ẩn ghế của chủ ngai ("trống tới lượt xoay"), nhưng `rotateBetweenQuestions` (dòng 249) ghim Top 5 đang ngồi — chủ ngai là Top 1 nên bị ghim, ghế không bao giờ được xoay. Hướng sửa đơn giản: khi ngai HELD, bỏ chủ ngai khỏi ghế (trả ghế cho người kế tiếp trong hàng chờ ở lượt xoay gần nhất, không ghim chủ ngai); khi mất ngai thì chủ cũ vào hàng chờ như thường. Test: sau câu 5 ghế cũ của chủ ngai có người mới sau 1 lượt xoay; không ai xuất hiện 2 nơi.
  4. Live 21/11: tool "MC nói với khán giả" bị giới hạn ~10 giây thoại. Có 3 giới hạn chồng nhau: (a) ô nhập tối đa **120 ký tự** (`McChatTextSchema`, contracts:245) ≈ 8–10 s đọc; (b) tạo giọng quá **10 s** thì báo lỗi (`MC_CHAT_GENERATION_TIMEOUT_MS`, runtime.ts:114) — câu dài sinh giọng chậm dễ chạm; (c) file giọng tối đa **20 s** (`MAX_MC_VOICE_ASSET_MS`, contracts:223). Hướng sửa đơn giản: nâng (a) lên ~300 ký tự, (b) lên ~30 s, (c) lên ~45 s chỉ cho câu MC chat (giữ nguyên cue câu hỏi/đếm ngược). **Người dùng chốt 21/11: mỗi câu MC chat tối đa ~30 giây** → ô nhập ~400 ký tự, timeout tạo giọng ~40 s, file giọng tối đa ~35 s (chỉ áp cho MC chat).
  5. Người dùng 21/11: giảm tiết tấu 4 s/câu — `prepareMs` 8000→6000 (đầu câu) và `revealMs` 9000→7000 (sau đáp án). Đổi mặc định ở `TimingsSchema` (contracts:497–500), kiểm cue MC ở REVEAL (Top 3, "Hết giờ") không bị cắt. Phiên đang chạy không đổi được timings giữa chừng; phiên mới tạo qua API nhận `config.timings` nên có thể áp ngay không cần code.
  6. Live 21/11: câu `bv-061` "Trận đầu tiên mỗi ngày thi đấu bắt đầu lúc mấy giờ?" thiếu ngữ cảnh. Đề xuất (chờ người dùng duyệt): "Tại Bá Vương Đại Chiến, trận đầu tiên mỗi ngày bắt đầu lúc mấy giờ?". Các câu bvdc khác không nêu tên giải, cần người dùng xem: bv-016, bv-022, bv-023, bv-024, bv-025, bv-029, bv-030, bv-031, bv-062, bv-063 (bv-009, demo-030 đã đủ ngữ cảnh). **Người dùng DUYỆT 21/11:** thêm "Tại Bá Vương Đại Chiến," vào đầu 11 câu (câu tứ kết dùng "Ở tứ kết Bá Vương Đại Chiến, …"); bv-061 bỏ chữ "thi đấu". Sửa DB sau live: sao lưu, version+1, `question_versions`, chạy lại `pnpm report:question-length`.
  7. Live 21/11: câu demo-004 ("Chế độ nào của Free Fire được tổ chức thành các vòng giao tranh…", 3 dòng) **không căn giữa dọc**, chữ dính sát mép trên khung câu hỏi. Bố cục ảnh nền người dùng: `arena.css:1381–1382` `.v3-stage--question-user .v3-question` cao cố định 160 px, chữ 30 px; có thể chữ cao hơn khung nên căn giữa tràn lên trên. Hướng sửa đơn giản: thu cỡ chữ cho vừa khung (giữ sàn 24 px) và căn giữa an toàn. Test bắt buộc: chạy **mọi câu APPROVED trong DB** (và fixtures), đo bbox chữ trong khung: cách mép trên/dưới ≥ 8 px và lệch trên–dưới ≤ 4 px; báo cáo `report:question-length` thêm cột này.
- Test chập chờn mới gặp: `c0319-hud-tall.spec.ts:206` (lượt placeholder, chạy lại 3/3 đạt), `mc-chat` race QUEUED/GENERATING.
- Người dùng 21/11: luôn chọn cách sửa đơn giản nhất (memory `simplest-fix-first`).

## Mới nhất 20/11 ~21:40 — hàng đợi code hôm nay XONG
- Main `4a72593a`, checkout chính đã ff + build:web. Đã gộp tối nay: C-0361 (preselection + C-0224), C-0335 (chủ đề ưu tiên), C-0374 (Codex 2: dashboard Setup Wizard cổng Vite riêng mỗi worker), batch C-0360+C-0329 (+ coordinator sửa fixtures demo-029 A/B cho khớp v3, `30d88c70`).
- DB máy người dùng: demo-004/demo-029 A/B rút gọn lên version 3 (người dùng duyệt), sao lưu `backups/quiz-before-c0310-ab-shorten-20261120-190955.db`. Đọc ước lượng còn ~21,5 s (vẫn >20 s). Gợi ý chưa duyệt: demo-029 bỏ chữ "Trong" ở đầu câu hỏi.
- `apps/overlay/src/mock/snapshots.ts:304` còn text A cũ của demo-029 (chỉ mock xem trước, chưa sửa).
- 20/11 ~22:00 MOCK 15 câu × 2.000 người trên bản sao dữ liệu: MOCK_ROUND_CHECK_PASSED, Top 1 4235 điểm; event-loop p99 806 ms, max 1,1 s.
- Codex 1 và Codex 2 đều rảnh, chưa có brief. Việc chặn còn lại: thử live TikTok thật (cần LIVE điện thoại ≥25 phút).

## Mới nhất 20/11 ~17:15 — đọc khối này trước, các khối dưới đã cũ
- **Main `ea469287`+.** Hôm nay đã gộp:
  - **C-0339:** ngai vàng và màn vinh danh kiểu B.
  - **C-0290 phase 4b.**
  - **C-0310:** `pnpm report:question-length` đọc bản sao DB, đo bằng overlay thật và đề xuất rút gọn, không sửa câu.
  - **C-0324:** `py -3 tools/throne_assets.py check|build` kiểm ảnh `assets-local/throne/`. Kết quả 62 OK, 1 cần xem (Maxim, nhìn vẫn ổn).
  - Checkout chính đã build C-0339 và C-0290; C-0310 và C-0324 chỉ thêm tools nên không cần build. Người dùng cần mở lại CHAY_GAME để nhận bản mới.
- **DB máy người dùng 20/11:** rút gọn demo-004 và demo-029 theo C-0310 (người dùng duyệt), version 2, có `question_versions`. Sao lưu ở `backups/quiz-before-c0310-shorten-20261120-165749.db`. Đo lại: 0 đáp án bị cắt, 0 câu bị clamp, 49 câu chữ dưới 30 px, 2 câu (chính 2 câu này) ước lượng đọc khoảng 23 s.
  - **Đang chờ người dùng trả lời:** có rút gọn tiếp đáp án A/B không? Đề xuất:
    - demo-029: A "Nhóm đồng đội phối hợp trong trận", B "Nhóm khán giả theo dõi trận đấu".
    - demo-004: A "Hành trình khám phá không có đối thủ", B "Một trận sinh tồn trên bản đồ rộng".
  - Nếu người dùng đồng ý: sao lưu DB, sửa như script cũ (version 3 và `question_versions`), rồi báo Codex 1 sửa `fixtures/questions.ts` cho khớp.
- **Codex 1** đang chạy hàng đợi C-0362 theo thứ tự:
  1. **C-0361** (nhánh `codex1/c-0361-preselection-preflight`, chứa C-0347 preflight đủ 4 ảnh mỗi nhân vật).
     - Test `tests/integration/mc-voice-preselection.test.ts` ca "Auto mode cũng chờ bundle câu 1…" **chập chờn ngay trên main** (C-0365).
     - Đã cho phép sửa riêng ca C-0224 trong `tests/e2e/c0223-mc-dialogue-wrap.spec.ts` (C-0366), với điều kiện không nới timeout và đạt 10/10 với cả hai bộ asset.
     - Tiêu chí đạt: chạy riêng 20/20, cả bộ 3/3, E2E 2 lượt 0 failed.
  2. **C-0335** ưu tiên chủ đề sự kiện, theo brief C-0357, nhánh `codex1/c-0335-priority-topic`.
  3. **Nhánh `codex1/batch-0360-0329`:**
     - C-0329: ARCHIVED demo-001 và demo-023, sửa `fixtures/fixtures.test.ts:35` và `tests/e2e/c0319-hud-tall.spec.ts:244`.
     - Fixtures demo-004 và demo-029 theo text mới (C-0367).
     - C-0360: test chập chờn `mc-chat.test.ts`, `welcome.test.ts` và `dashboard.test.ts:212` Setup Wizard.
- **Codex 2:** rảnh (C-0368), chưa có task. Giao gì cũng phải đủ brief 6 mục (memory `brief-full-spec-upfront`).
- **Quy trình gộp:**
  - Làm trong worktree `.claude/worktrees/coord-merge-0293`: `git checkout --detach origin/main`, rồi `git merge origin/<nhánh>`.
  - Kiểm tra: typecheck, privacy, `vitest --project unit --project integration --pool=forks --maxWorkers=2`, Playwright 2 lượt (asset thật, và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) với `PLAYWRIGHT_SERVER_PORT=18931 PLAYWRIGHT_OVERLAY_PORT=15331`.
  - Push bằng `HEAD:main`. Ở checkout chính, khi cổng 8787 không nghe: `git fetch; git merge --ff-only origin/main; py -3 tools/web_build.py ensure` (KHÔNG dùng `build:web`: không ghi `.build-commit` → preflight overlayBuild/dashboardBuild FAIL).
  - `mb.py` phải gọi từ checkout chính: `py -X utf8 "E:\Ai\2026\Trend mini game tiktok\tools\mb.py"`.
- **Test chập chờn đã biết:**
  - mc-voice-preselection;
  - welcome.test;
  - mc-chat.test;
  - dashboard.test.ts:212 (lượt placeholder);
  - c0223 C-0224 bubble.screenshot khi máy tải nặng.

  Diff chỉ đụng `tools/` mà hỏng các test này thì không chặn gộp.

**Phiên trước (13/11) — ĐÃ NHẬN 13/11 15:57.**

## Mới nhất 13/11 ~16:00 — đọc khối này trước, các khối dưới đã cũ
- **Cập nhật 17/11 chiều (MỚI NHẤT — đọc khối này trước):** main `6117e74`+. Hôm nay đã gộp:
  - **C-0233:** ghế khán giả cập nhật ngay qua `AUDIENCE_UPDATED`, bỏ lazy-load chibi.
  - **C-0234:** server ghi nhận người spam đáp án. Panel cảnh báo trên Dashboard đã **huỷ** vì người dùng không muốn.
  - **C-0238:** MC đếm ngược "Còn 10 giây!", rồi "Năm, Bốn, Ba, Hai, Một" đúng từng giây; cue nào trễ hoặc chồng thì bỏ. "Hết giờ!" khi đóng câu. Nhắc "mỗi người chỉ một đáp án, bình luận đầu tiên mới được tính" ở câu 2/5/8. Từ điển phát âm `data/mc-pronunciation.json` (ignore) chỉ đổi text gửi đi sinh giọng.
  - **C-0237:** simulator 20.000 người; chấm điểm theo delta, ghi SQLite theo lô. Đo 20k: 0 đáp án mất, ingest p99 khoảng 2 ms, chấm cộng xếp hạng khoảng 0,3 s. Máy bị throttle thì ANSWER_COUNTS có lúc trễ khoảng 4 s. Lệnh đo `pnpm bench:simulator-20k`.
  - **C-0239:** chỉ số luồng bình luận TikTok thật trên Dashboard (bình luận/giây, trễ p50/p95, kết nối lại, lý do loại), cảnh báo khi im lặng hơn 5 s hoặc p95 trên 3 s. Kết nối lại lần đầu ≤1 s. Ghi và phát lại JSONL bật bằng `TIKTOK_RECORD_RAW_COMMENTS=1`, xem `docs/TIKTOK_INGEST_DIAGNOSTICS.md`.
  - **C-0240/C-0242/C-0244/C-0246:** **theme theo sự kiện**. Gói theme ở `data/themes/<id>/` (ignore), gồm `theme.json` (55 token CSS `--theme-*`, font, asset theo slot) cùng `assets/` và `fonts/`. Các lệnh `pnpm theme:validate`, `pnpm theme:export-default [--force]`. Dashboard có tab "Giao diện / Theme" (quét lại, xem trước, áp dụng); overlay đổi theme ngay qua `themeVersion`. Theme mặc định trùng pixel với giao diện cũ (E2E so 6 cảnh). Theme **không** đổi vị trí hay kích thước khung. Hướng dẫn ở `docs/THEME.md`.

  Kiểm tra cuối trên main: typecheck PASS, 489 test PASS, test:load PASS, privacy PASS. E2E do Codex báo: 96 PASS với asset thật, 95 + 1 skip với placeholder.

  Đã làm ở máy (không có trong repo):
  - Theme mặc định xuất ra `data/themes/default`, zip gửi người dùng ở `assets-local/themes/theme-default-1117.zip`. Video nền lặp và dãy ảnh MC chưa có file nên chưa vào theme.
  - Từ điển phát âm 75 mục, **phiên âm theo âm tiếng Anh, không dịch nghĩa** (người dùng chốt). Chưa nghe thử bằng giọng thật.

  Quyết định của người dùng hôm nay:
  - Không thêm thời gian ân hạn sau deadline, vì sẽ ảnh hưởng kết quả.
  - Lọc tên bậy đã có từ 15/11 (tab "Kiểm duyệt tên"). Đã hướng dẫn tự thử bằng bình luận tay với simulator tắt.

  Chặn live TikTok thật: tài khoản cần LIVE từ điện thoại ít nhất 25 phút để mở LIVE Studio. Gợi ý trong buổi đó nhờ 5–10 người bình luận để đối chiếu xem game có nhận đủ không.

  Còn treo:
  - Người dùng cần **mở lại CHAY_GAME** để nhận server mới; lần đầu sẽ sinh 8 câu giọng chung mới và các câu có từ trong từ điển phát âm.
  - C-0250 đổi launcher CHAY_GAME sang một cửa sổ overlay `role=program` có audio cùng Dashboard; dùng Window Capture cửa sổ này trong LIVE Studio (nhánh `codex2/c-one-window`, chờ gộp).

  Codex1 và Codex2 đang rảnh. Codex2 từng ngừng hoạt động khoảng 02:00–14:30; khi đó C-0241 được chuyển sang codex1.
- **Cập nhật 16/11 tối:** người dùng bảo gộp để chạy live thử. Checkout chính đã `ff` tới origin/main (đủ C-0227/C-0229/C-0230 + HANDOFF) và đã `corepack pnpm build:web`. Kiểm tra cuối trên main: typecheck PASS, 448 test PASS, privacy PASS; E2E (Codex báo) 93/93 với asset thật, 92 + 1 skip với placeholder. Chạy live: mở sảnh, chờ vài chục giây cho câu 1 có giọng rồi mới bấm bắt đầu; lần đầu sinh lại ~60+ câu giọng (policy 3, tốn lượt). Nhạc nền chỉnh qua tham số overlay `bgm` (`bgm=0` tắt). Đang chờ người dùng báo kết quả chạy live.
- **Cập nhật 16/11 chiều:** main đã gộp C-0227 (chọn trước vòng ở LOBBY, sinh giọng câu 1 trước), C-0229 (E2E chạy với asset placeholder), C-0230 (nhạc nền sảnh `bgm-lobby` / lúc chơi `bgm-game`, lặp, crossfade 1 s, mặc định 0,18, tắt ở VICTORY). CI chỉ chạy bấm tay (bỏ trigger push, người dùng không muốn mail). Âm thanh CC0 (Kenney + OpenGameArt) ở `assets-local/audio/` (ignore), nguồn ghi trong `NGUON-AM-THANH.txt`; nhạc 182 s người dùng gửi chỉ là dự phòng ở `assets-local/audio-src/`. Người dùng: sảnh KHÔNG đếm người, tự bấm bắt đầu. Codex1/Codex2 rảnh. Chưa chạy live sau các thay đổi (lần đầu sinh lại ~60+ câu giọng).
- **Cập nhật 16/11 sáng:** main `a30f69b` đã gộp C-0225 + C-0226 (MC đọc "A: …/B: …", ngắt 700/400 ms co dần theo ngân sách READING, `voiceSettingsByEvent` tuỳ chọn, WELCOME phát khi vào LOBBY, bộ lọc chuẩn hoá chỉ cắt lặng đầu/cuối — bản cũ xén ~0,3 s tiếng trước mỗi khoảng lặng, policy version 3). typecheck, 436 test, e2e 93, privacy PASS. **Người dùng duyệt mẫu giọng cảm xúc, "hết cụt"**; đã ghi thông số cảm xúc vào profile cục bộ `data/mc-voice-profile.json` (bị ignore, KHÔNG ghi giá trị vào thư/repo). Cache cũ (policy 2) không dùng nữa → vòng thử kế sẽ sinh lại ~60+ câu (tốn lượt, hỏi người dùng trước). Còn chờ người dùng: câu chào MC, 5 PNG dáng MC, video loop.
- **(ĐÃ XONG — người dùng chọn giao Codex 1, thành C-0227)** Câu hỏi cũ 16/11: coordinator đã giải thích KHÔNG sinh trước toàn bộ giọng (139 câu duyệt; đáp án bị xáo mỗi vòng ở `packages/quiz-core/src/selection.ts:299` và text đã có chữ cái → phủ đủ cần ~2.900 câu; endpoint `/api/mc-voice/pre-generate` sinh theo thứ tự gốc nên phần lớn không khớp live). Live tự sinh ở ROUND_STARTED (`runtime.ts preGenerateRoundVoice`, ~60 lượt/vòng mới, có cache). Đề xuất chờ duyệt: giao codex1 sinh giọng sớm hơn (ngay khi chọn xong câu của vòng/ở sảnh) để câu 1 kịp có giọng (PREPARE chỉ 8 s). Hỏi lại người dùng: "giao Codex 1 hay giữ nguyên?". Codex1/Codex2 đang rảnh. Thư mục `.claude/worktrees/coord-voice` đã gỡ khỏi git nhưng còn file (bị khoá) — xoá tay được. 4 PNG chưa track ở gốc repo là ảnh người dùng — không commit (repo public).
- Main `3ce7335`+. Đã gộp hôm nay: C-0167 (CHAY_GAME mở 2 cửa sổ Edge app: Overlay preview có cờ autoplay + Dashboard; preflight WARN khi audio program bị chặn) — typecheck, 325 test, privacy, e2e 63/63 PASS. Quy trình gộp: worktree `.claude/worktrees/coord-merge3`, MERGE không rebase, e2e với `QUIZ_ASSETS_DIR=assets-local` cổng riêng, push `HEAD:main`, rồi ở checkout chính `git merge --ff-only origin/main` + `corepack pnpm build:web` (PowerShell) nếu đổi UI. `git pull` ở checkout chính báo "multiple branches" → dùng `git fetch` + `git merge --ff-only origin/main`.
- **Cập nhật 14/11 ~00:30:** main `1da99a4` (đã gộp C-0184 dọn temp test, C-0196 overlay theo phiên mới). Người dùng xem vòng MOCK offline và yêu cầu 6 việc → codex2 C-0197 (lộ 8 cờ đội trên nền, nổi bật người đúng nhanh nhất, MC nhiều dáng, nền video lặp; làm sau C-0194 header A/B), codex1 C-0199 (ca `simulator-restart` quá hạn 60 s trên main) → C-0198 (trả lời 15→20 s — người dùng CHỐT 20 s; +5 s mọi pha có đồng hồ; dữ liệu người đúng nhanh nhất). Chờ người dùng quyết: 2 luật lọc tên `chó điên`/`bó đái`. **NGƯỜI DÙNG YÊU CẦU: khi gộp bản hoàn thiện phải chạy thử offline KÈM GIỌNG MC (mcVoiceEnabled) cho họ xem/nghe.** Cách chạy thử offline: copy `data/` sang `.tmp-test/offline-data`, chạy server với `QUIZ_DATA_DIR`/`QUIZ_DB` trỏ vào đó, tạo phiên MOCK + simulator qua API, mở `http://127.0.0.1:8787/overlay/?role=preview`, xong thì tắt server + xóa `.tmp-test`.
- **Cập nhật 15/11 ~12:20 (MỚI NHẤT — đọc khối này):** main `3344272` = gộp `codex2/c0214-user-mockup` (đã chứa RC 1114b, giọng MC server+overlay, 97 luật lọc tên, người đúng nhanh nhất, header, HUD settings). Coordinator tự chạy: typecheck, privacy, 430 test, build, e2e 93/93 PASS. Người dùng ĐÃ DUYỆT: màn câu hỏi theo ảnh mẫu `assets-local/review/mau-nguoi-dung/mau-1114.png` nâng 180px (khung y=348, nền không dịch); Kelly BÁN THÂN trong ô 205px (C-0221); Top 10 giữa vòng: Kelly góc phải ngay dưới bảng + bong bóng ngang to bên trái (C-0222); sảnh chờ GIỮ bố cục cũ; lời thoại MC xuống dòng cân đối, ngắt sau dấu câu, giữ cụm từ (C-0223/C-0224); câu Top 10 "BXH trực tiếp! Cùng xem ai đang dẫn đầu và bám sát Top 10 nhé." giữ nguyên. Đã chạy vòng MOCK offline 10 câu có giọng MC, video gửi người dùng: `assets-local/review/1115-vong-thu/vong-thu-10-cau-giong-mc.mp4` (giọng ghép theo mốc cue, không có SFX). Cache giọng `data/mc-voice-cache` = 77 câu (đã tốn ~76 lượt sinh). Ghi chú kỹ thuật chạy giọng offline: server chạy bằng `pnpm --filter @quiz/server start` có cwd `apps/server` → phải đặt `QUIZ_MC_VOICE_PROFILE_FILE` tuyệt đối tới `data/mc-voice-profile.json` + nạp `CLIPAI_TOKEN` từ biến User; câu 1 của vòng có thể chưa kịp có giọng (sinh trước bắt đầu lúc ROUND_STARTED); cue chỉ có trong snapshot WS của overlay, không có trong ADMIN_SNAPSHOT. Codex1/Codex2 đang rảnh. Còn chờ người dùng: nhận xét video vòng thử, duyệt câu chào MC, 5 ảnh dáng MC, video nền lặp.
- **Cập nhật 14/11 ~13:00:** main `c0f21cd`+ (đã gộp thêm C-0199 sửa ca `simulator-restart`; 328 test). **QUY ĐỊNH NGƯỜI DÙNG NHẮC LẠI RẤT GẮT: vị trí khung Top 10 và khung câu hỏi là CỐ ĐỊNH, được đè lên nền cờ; không tự điều chỉnh bất kỳ quyết định nào họ đã chốt.** Thư C-0197-A của coordinator đã sai khi bảo dời khung → đính chính **C-0207** (codex2: trả mọi vị trí về đúng main lệch ≤1px, chỉ bỏ lớp che cờ `.v3-question-banner-mask`; huỷ C-0205) + C-0208 (codex1: nhánh `codex1/release-candidate-1114` chứa bố cục sai, sẽ gộp lại sau). Mọi ảnh trong `assets-local/review/1114/` chụp trên bố cục sai — không dùng để duyệt. Chưa gộp: `codex1/c0200-safe-name-rules` (97 luật lọc tên, người dùng đã đồng ý mở rộng), `codex1/c0198-fastest-correct` (thời gian +5 s, trả lời 20 s, `fastestCorrectAnswer`), `codex1/c0204-mc-voice` (giọng MC phía server: `mcVoiceCue` trong snapshot WS, `/api/mc-voice/assets/<hash>`), `codex2/c0168-header-size`, `codex2/c0197-*` (dáng MC, nền video, người đúng nhanh nhất). Giọng MC: file cấu hình cục bộ `data/mc-voice-profile.json` (gitignore, KHÔNG chép giá trị vào thư/repo), token chỉ từ env; coordinator đã chạy `mc-voice:real-check -- --confirm-spend` 1 câu thành công (mẫu `assets-local/review/1114/giong-mc-thu-1-cau.mp3`); mỗi lần sinh tốn credit, không tự thử lại. Overlay phát giọng: codex2 **C-0209** (sau C-0207). Tiếp theo: nhận report C-0207 → đo vị trí bằng main → gửi ảnh người dùng chọn header A/B + kiểu nổi bật người nhanh nhất A/B → codex1 gộp lại RC → coordinator tự chạy đủ bộ kiểm → người dùng duyệt ảnh → gộp main → chạy vòng MOCK offline KÈM GIỌNG MC (`mcVoiceEnabled: true`, `?role=program`). Còn chờ người dùng: duyệt lời thoại MC, 5 ảnh dáng MC (512×768 nền trong, `assets-local/mc/kelly/<idle|welcome|ask|react|celebrate>/0001.png`), video nền lặp (WebM VP9 1080×1920 6–8 s + MP4). Khi chạm hạn mức: ghi file này + đặt lịch tự chạy lại (memory `auto-resume-after-usage-limit`).
- Người dùng nói TIẾNG VIỆT; test không quan tâm nội dung câu hỏi (câu dài tự bỏ/cắt). Logo đã kiểm: không méo ở mọi màn (object-fit contain).
- **Đang chờ report, CHƯA gộp (UI phải người dùng duyệt ảnh trước):**
  - codex2 `codex2/c0165-preview-fit` — C-0165 preview contain 9:16 (`?role=preview` contain, program cover, `?fit=`). Ảnh `assets-local/review/c0165/`. Chưa gộp.
  - codex2 C-0166 — bỏ nút "Bấm để bật âm", SFX tự phát, không nhạc nền. Chưa report.
  - codex2 `codex2/c0168-header-size` — header B2 (người dùng DUYỆT mockup B2: pill "ĐẤU TRƯỜNG BÃO TỐ" 1 dòng 38px; ô 3 dòng "VÒNG 1" 36 / số 52 vàng / "ĐANG CHƠI" 24; số <10.000 đủ dấu chấm, ≥10.000 rút gọn 10,5K/1,2M). Report Y-0274 có ảnh số lớn vẫn hiện 57 → **C-0174** chụp lại + test; người dùng thêm **C-0175** nới viền (pill ≥40px ngang, Top 10 ≥20px, khung câu hỏi ≥24px, không đè bong bóng MC). Chờ report chung → gửi ảnh người dùng duyệt → gộp.
- **An toàn tên người chơi + MC Voice** — người dùng DUYỆT đặc tả `docs/STORM_ARENA_PLAYER_NAME_SAFETY_MC_VOICE_SPEC_V1.md` (đọc cả mục quyết định cuối file). Gap Matrix chính: chưa lọc tên trên main; public snapshot Top 10/podium lộ `playerId = TIKTOK:<userId>`; tiktok.ts fallback dùng @uniqueId làm tên; leaderboard_snapshots/outbox lưu tên gốc; MC voice đang tắt hẳn và không template nào có tên nhưng chưa có rào chặn/validator; cache key chưa có voicePolicyVersion. Quiz Engine/scoring không cần sửa (xếp hạng/ghế theo playerId).
  - codex1 **C-0177** (ưu tiên cao nhất, thay C-0173): dùng tiếp bản dở chưa commit ở `.claude/worktrees/c0173-name-filter` → nhánh `codex1/name-filter`; mức rủi ro, alias `Người chơi <số>` cho HIGH/MANUAL/REVIEW, PARTIAL che phần vi phạm, protected registry (Garena/Free Fire/FF MAX/BTC/admin/moderator/support — KOL/tuyển thủ chờ người dùng gửi), mã công khai mờ, API kiểm duyệt (ẩn/hiện nhiều người, allow, thêm từ/ngoại lệ, audit), McVoiceEvent + validator, test + benchmark.
  - codex2 **C-0176**: trang "Kiểm duyệt tên" trên dashboard (danh sách cảnh báo, tích chọn nhiều tên để ẩn/hiện khi đang LIVE, ẩn cả tên không cảnh báo, dòng "Đọc tên người chơi: Chưa hỗ trợ"). Làm sau C-0174/C-0175, trước C-0172.
- **HUD tùy chỉnh** (người dùng yêu cầu: giữ bố cục mockup, đổi được chữ/logo/nền trong cài đặt): codex1 **C-0171** (server `HudConfig`, API, upload ảnh) — lùi sau C-0177; codex2 **C-0172** (trang "Giao diện HUD" + overlay đọc cấu hình) — sau C-0176.
- Server game offline đã tắt; cổng 8787 trống. Hòm thư coordinator sạch tới X-0275/Y-0277.
- Việc phía người dùng: tổng duyệt máy LIVE với nguồn `?role=program`; test LIVE thật (comment có che bảng tên Victory không); @username để test đọc comment; tùy chọn: 8 logo đội, tư thế MC, nền Victory nét hơn, danh sách KOL/tuyển thủ cần bảo vệ.

Vòng ngữ cảnh: `.claude/settings.json` (cục bộ) đặt `CLAUDE_CODE_AUTO_COMPACT_WINDOW=350000` + hook SessionStart `py -X utf8 tools/session_handoff.py` → tự nén ở ~70 % rồi nạp lại file này. Khi context ~70 %: cập nhật file này, đổi dòng in đậm trên thành `— ĐỌC ĐẦU TIÊN.`, commit + push. KHÔNG clear/archive/mở phiên mới cho phiên chính.

Phiên trước đầy context. Phiên mới: **chỉ điều phối** (memory `coordinator-delegate-not-code`) — giao code cho Codex qua hòm thư, rà report, gộp nhánh.

## Cập nhật 12/11 ~21:45
- Người dùng DUYỆT màn câu hỏi (C-0133) + Victory (C-0131). Đã gộp main `4b1eebc` (UI + âm thanh C-0109 + role program/audioState C-0121/C-0132/C-0135 + C-0136): typecheck, 321 test, privacy, e2e 59/59 PASS; build:web xong. URL nguồn LIVE Studio: `/overlay/?role=program`.
- Coordinator tự chạy thử offline 1 vòng MOCK 10 câu trên server thật (ảnh `assets-local/review/offline-1/`): chạy trọn tới Victory. Lỗi còn: sảnh chờ + Top 10 giữa vòng còn nền cũ, MC pha nhận đáp án lệch → codex2 **C-0142** (+C-0141 chụp Top 10). codex1: C-0138 script MOCK → C-0143 → C-0085 (đã mở khoá, giữ `tests/e2e/**`).
- Người dùng yêu cầu vòng tự động: giao Codex sửa → rà → khi đạt tự chạy thử offline MOCK → báo. CI chỉ chạy main (không spam mail).

## Cập nhật 12/11 ~14:30 (phiên mới)
- Người dùng CHỐT 2 nền: Victory `assets-local/victory/bg-user-cover.jpg` (gốc 3:4 `bg-user-src.png`, đã cắt phủ 9:16), màn câu hỏi `assets-local/arena/bg-question-user.jpg` (8 cờ đội in sẵn, y 14–32 %). Giao codex2 **C-0122** (ưu tiên trước C-0109/C-0118). Bỏ hẳn `bg-redraw.jpg`/`bg-ref-clean.jpg`.
- Đã gộp main C-0119. C-0120 nhắc codex2 tự sửa `static.ts` MIME audio (đã cho phép ở C-0111). codex1 làm **C-0121** (F9 server: overlay role program/preview).

## Mới nhất (12/11 ~10:25) — đọc khối này trước, mọi khối dưới đã cũ
- Người dùng đổi tài khoản Claude lúc ~10:25; phiên kế tiếp quản điều phối. Thư coordinator gần nhất: **C-0115**. Hòm thư coordinator sạch. Đặt lại `py -X utf8 tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền.
- **Đã gộp main (P0 xong)**: preflight `GET /api/preflight`, backup + `CHAY_GAME.cmd`, rehearsal Mock, simulator event ID, placeholder asset, 6 lỗi cloud tìm (C-0100), giới hạn độ dài câu hỏi (110/28 ký tự), chọn câu theo độ khó (mục tiêu 7/5/3, lệch ±2, chưa gán = vừa; mặc định vẫn RANDOM, không có nút bật trên dashboard). Lần kiểm cuối trên main: 286 unit test, typecheck sạch, privacy PASS; e2e coordinator CHƯA chạy lại. BOARD #18–#22.
- **Giao diện CHƯA gộp** — nhánh `codex2/c0068-victory-ref` (`00545c7`): màn câu hỏi, Top 10, Victory, đồng hạng. Người dùng CHƯA duyệt màn nào. Ảnh soát: `assets-local/review/c0101/`.
- **codex2 đang làm (thứ tự)**: C-0114 + C-0115 Victory → C-0113 header dùng thẳng `/assets/brand/logo.png` (logo trong ref là sai) → C-0109 âm thanh/hiệu ứng (nhánh `codex2/c0109-sound-fx`, được sửa `apps/server/src/static.ts` cho MIME audio và `docs/ASSET_INVENTORY.md`).
- **Nền Victory — CHỜ NGƯỜI DÙNG CHỌN**: người dùng chê bản render có 2 cột hai bên, đòi nền như ref. Ref in sẵn nhân vật/bảng tên/logo cũ nên không dùng thẳng được.
  - `assets-local/victory/bg-ref-clean.jpg`: ref đã xoá nhân vật — người dùng TỪ CHỐI (còn vệt nhoè).
  - `assets-local/victory/bg-redraw.jpg`: vẽ lại bằng công cụ tạo ảnh của Figma (chỉ nhận mô tả chữ, tốn credit của người dùng) — sạch nhưng cúp/tông màu khác ref; codex2 tạm dùng bản này, đường dẫn nền để 1 hằng số. Ảnh so: `assets-local/review/victory-bg-ref-vs-redraw.jpg`.
  - Đã hỏi người dùng: dùng bản này / vẽ thêm bản sát ref hơn / tự xuất bản không nhân vật từ công cụ gốc. Chưa trả lời.
  - Coordinator tự quyết ẩn MC Kelly ở Victory (ref không có MC) — đã báo người dùng, chưa được xác nhận.
- **codex1 đang làm**: C-0112 `tools/question_bank.py` + `BO_CAU_HOI.xlsx` ở gốc repo (ngoài git) gộp ~139 câu (36 FF trong DB + 63 câu về giải ở `assets-local/review/DE_XUAT_CAU_HOI_BVDC.md` + 40 câu FFWS ở `docs/review/DE_XUAT_CAU_HOI_GIAI_DAU.md`), import vào `data/quiz.db`. Người dùng sẽ tự xem/sửa file xlsx sau. 40 câu FFWS chưa kiểm nguồn. C-0085 phần e2e chờ gộp UI. Giọng MC dừng sau mốc 2.
- **Quy tắc người dùng chốt trong phiên này**: cờ khán đài mang logo 8 đội; Top 10 không chiếm quá ~45 % chiều cao; hạn chế câu quá dài; âm thanh được tạo bằng API (không gửi key qua chat); file thông tin giải ở gốc repo là NỘI BỘ (gitignore) — không chép nội dung/tên sheet/dữ liệu người chơi vào repo, thư, báo cáo.
- **Khi codex2 report**: chép ảnh so vào `assets-local/review/`, xem, gửi người dùng; KHÔNG gộp UI trước khi người dùng duyệt từng màn. Sau khi duyệt: gộp main vào nhánh, typecheck + test + e2e, push, `corepack pnpm build:web` chạy từ PowerShell, báo codex1 làm tiếp C-0085.
- **Chưa kiểm**: `CHAY_GAME.cmd` chạy trọn trên máy này (server cũ còn chiếm cổng 8787 — người dùng phải đóng cửa sổ game cũ rồi chạy lại).
- **Chờ người dùng**: chọn nền Victory; duyệt từng màn UI; 8 file logo đội gốc (cờ đang cắt từ ảnh, mờ); nền sân 1080×1920 sạch cho màn câu hỏi; quyền LIVE PC + @username; chibi nét hơn; PNG tư thế MC.

## Cũ (12/11 sáng)
- Plan V4 đã vào repo (`docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`), quyết định D-19..D-22 (`docs/DECISIONS.md`), BOARD #18–#21. Người dùng chốt: giữ điểm Kahoot; dừng giọng MC sau mốc 2; P0 trước.
- Đã gộp main: C-0077, C-0078 mốc 1 + 2 (pha READING, API giọng MC giả). 260 unit test xanh; e2e coordinator chưa chạy lại.
- codex1: **C-0092** P0 (preflight, backup + `CHAY_GAME.cmd`, QUIZ_ASSETS_DIR, rehearsal Mock). codex2: **C-0080** màn câu hỏi 6 điểm + READING; C-0079 hoãn. cloud: **C-0093** `docs/IMPLEMENTATION_GAP_MATRIX_V4.md` (nhánh `claude/zen-dijkstra-sop0bt`).
- Victory vòng 2 ở nhánh `codex2/c0068-victory-ref` (`1d6bbd8`) **CHƯA gộp** — chờ người dùng duyệt ảnh `assets-local/review/c0089-victory-vong2-so-ref.jpg` (BOARD #19: ảnh cạnh ref, người dùng duyệt rồi mới gộp). Khi duyệt: gộp trong worktree, typecheck + test + e2e, push, `corepack pnpm build:web`.
- Ref: ảnh gốc repo "Sân Khấu Neon" = ref **Victory**; `assets-local/ref/storm-arena-ref.png` = ref **màn câu hỏi**.
- 36 câu đã APPROVED để chạy thử (BOARD #20) — hỏi lại trước 13–14/11.
- Người dùng hỏi đổi repo sang private: đã trả lời (cần cấp quyền cho phiên cloud; phút Actions có hạn; kiểm CI qua API công khai hết dùng được). Chưa đổi.
- Chờ người dùng: duyệt Victory vòng 2; giữ/ẩn MC ở Victory; quyền LIVE PC + @username; chibi nét hơn; PNG tư thế MC.

## Cũ (11/11 ~22:45) — main ≈ `d420374`, 227 test + e2e 42 xanh
- Tool game chạy bằng `CHAY_GAME.cmd` (cửa sổ riêng, data ở `data/`, token tự chép clipboard). Hướng dẫn LIVE: `docs/HUONG_DAN_LIVE.md`. Người dùng phải tự thêm nguồn Link `http://127.0.0.1:8787/overlay/` trong LIVE Studio (tôi không bấm được app native). LIVE Studio báo "No access" = tài khoản chưa có quyền LIVE PC.
- Đã gộp Victory/logo/safe-zone (Y-0124, nhánh codex2/c0068-victory-ref).
- codex2: C-0080 ĐÃ ACK (Y-0125), đang làm (người dùng chưa duyệt: bám ref, logo ≥40 %, đếm ngược che chữ, đáp án bị cắt, bỏ icon sét ô thoại MC, MC đổi chuyển động theo phase) → rồi C-0079 Voice Settings.
- codex1: C-0077 (privacy fixture + e2e ổn định) → C-0078 voice mốc 1–3.
- Khi C-0080 report: rà ảnh (question câu dài, question-hud, reveal, victory, victory-tie, top10) cạnh `ref/storm-arena-ref.png`, gộp trong worktree `.claude/worktrees/coord-merge2`, chạy typecheck+test+e2e, push, rồi `corepack pnpm build:web` ở checkout chính (tool đang chạy tự phục vụ bản mới, chỉ cần reload overlay) và gửi ảnh cho người dùng.
- Ảnh người dùng ở gốc repo (Thẻ nhân vật…, logo_BAVUONG.png, Đấu Trường Bão Tố…png) KHÔNG commit (đã có bản trong assets-local).
- Chờ người dùng: PNG tư thế MC vào `assets-local/mc/kelly/{welcome,ask,react,celebrate,idle}`; @username + quyền LIVE; duyệt 36 câu.

## Bắt đầu phiên mới
1. Đọc: `mailbox/README.md`, `mailbox/BOARD.md` (phân làn + quyết định chốt #1–#17), `docs/TIEN_DO.md` (mốc + giờ), file này.
2. `py tools/mb.py status` → `py tools/mb.py read --for coordinator` → rà report (chạy lại `corepack pnpm typecheck && corepack pnpm test`, e2e nếu đụng overlay) → gộp.
3. Gộp nhánh Codex trong worktree riêng hoặc gộp nhanh rồi push ngay (mb.py của Codex `pull --rebase` ở checkout chính). Build overlay trong Git Bash phải `MSYS_NO_PATHCONV=1`.
4. Đặt `py tools/mb.py wait --for coordinator --timeout 3600 --interval 60` chạy nền để được đánh thức khi có thư.

## Trạng thái (11/11 ~19:50) — main ≈ `87a6861`, 220 test + e2e 29 xanh
- Đã gộp: Setup Wizard + phiên TikTok + duyệt câu (C-0021/24), test V3/tải (C-0027/36/53), dashboard e2e (C-0040), replay TikTok (C-0043), soak 60' (C-0051), McSequence (C-0037), cutout tool (C-0034/44), overlay V3 redesign (C-0032), HUD LIVE mô phỏng + safe zone (C-0056/57/58), Top10 đủ 10 hàng + crop an toàn x 9–91 % (C-0054).
- Coordinator tự sửa: lỗi "Failed to retrieve Room ID" → coi như chưa LIVE, không retry dồn (f485321).
- Asset cục bộ (ngoài git): `assets-local/chibi/` = bộ ĐÃ tách nền (bộ cũ ở `_backup/chibi-old-chua-sach/`); `mc/kelly.png` (rembg, "tạm được"); `mc/kelly/{idle,...}/` chờ frame; `brand/logo.png` = logo chính thức; `cards/the-chien-dau-ffvn-kelly.png`; `ref/victory-ref.png` (Victory: chibi đứng TRÊN bục); `ref/storm-arena-ref.png` = MẪU TOÀN CẢNH người dùng đòi giống (HUD, phong cách, background); `ref/tiktok-live-1..3.png` = UI LIVE thật (safe zone: trên 14 %, comment trái 73–92 %, crop ngang 9 %). Server soát ảnh: `py -m http.server 8791 --directory assets-local`.

## Hàng chờ Codex
| Làn | Thư | Việc |
|---|---|---|
| codex2 | C-0060 (ƯU TIÊN) → C-0055 | C-0060: overlay giống `ref/storm-arena-ref.png` (nền sân bão, khán đài bậc, HUD neon, header, Top10, MC). Khi report: gộp sau khi test xanh rồi cho người dùng xem ảnh cạnh ref. C-0055: Victory 3 chibi toàn thân đứng trên bục, bảng tên lục giác |
| codex1 | C-0062 | `tests/e2e/live-round.test.ts` full vòng overlay/dashboard + replay TikTok + FPS |
| — | — | Hết việc: Codex gửi note "rảnh"; DP1/2/4 đã xong (BOARD) |

## Đang chờ người dùng
- Có làm được nền sạch 1080×1920 không UI và/hoặc chibi nhìn từ sau lưng (để giống ref hơn) không.
- Duyệt 36 câu Free Fire (`docs/review/DE_XUAT_CAU_HOI_FF.md`); phát LIVE thử (@username); quyền asset; frame PNG Sequence MC; khung trống thẻ chiến đấu (nếu có).
