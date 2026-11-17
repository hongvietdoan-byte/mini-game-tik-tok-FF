# Nhà Thông Thái Free Fire — Audit codebase và kế hoạch triển khai V5

Ngày 18/11/2026 · Coordinator · Đối chiếu với `NHA_THONG_THAI_FREE_FIRE_RETENTION_ACHIEVEMENT_SPEC_V5` và main `1ccb941`.
Trạng thái: **ĐÃ DUYỆT 18/11/2026** (chủ dự án duyệt theo đề xuất; V5 bắt đầu sau C-0272).

## 1. Kết luận nhanh

- Nền dữ liệu đã đủ cho V5:
  - `score_events` lưu điểm theo từng câu và từng người. Đã đối chiếu trên `data/quiz.db`: tổng `score_events` khớp `round_players.score` ở 100% bản ghi (0 lệch).
  - `leaderboard_snapshots` lưu bảng xếp hạng sau mỗi câu, làm được mốc hạng đầu chặng cho COMEBACK.
  - `answers` có khoá duy nhất (câu, người chơi), nên chỉ đáp án đầu tiên được tính.
- Điểm chặng tính được bằng cách cộng `score_events` theo câu. **Không phải đổi công thức Kahoot.**
- Nhịp game đã có sẵn chỗ cho chặng:
  - `leaderboardInterval = 5`. Sau câu 5, 10 và 15, engine đã vào màn `INTERIM_TOP10` (`bigLeaderboardMs` 6 s).
  - Bảng chặng thay nội dung màn này, **không thêm pha mới**.
- "Người đúng nhanh nhất" đã có cho 1 người (`FastestCorrectAnswer`, `apps/server/src/runtime.ts:2014`). Cần nâng thành Top 3, có xử lý đồng hạng.
- Mốc tính thời gian là `round_questions.opened_at_ms`, ghi khi `QUESTION_OPENED`. Sau C-0257, mốc này rơi đúng lúc mở nhận đáp án ở pha đọc, khớp yêu cầu V5 §3.1.
- Danh hiệu và theme danh hiệu **chưa có gì**. `packages/theme-core` mới là khung rỗng; manifest theme thật nằm ở `packages/contracts/src/theme.ts` và là `.strict()`.
- Tên ứng dụng hiện còn 3 kiểu: "Bá Vương Đại Chiến" (title Dashboard và Overlay), "Storm Arena LIVE Quiz" (bộ cài Electron), "Storm Arena" (docs). Tổng 91 chỗ trong 39 file; phần lớn là docs và test.
- Chưa có chính sách giữ dữ liệu (retention). Bình luận thô chỉ được ghi khi bật `TIKTOK_RECORD_RAW_COMMENTS=1`.

## 2. Gap Matrix

| # | Yêu cầu V5 | Hiện trạng | Gap | Phase |
| --- | --- | --- | --- | --- |
| 1 | Tên app "Nhà Thông Thái Free Fire" (Dashboard, launcher, titlebar, installer, shortcut, docs người dùng) | "Bá Vương Đại Chiến · Điều khiển LIVE" (`apps/dashboard/index.html`), "Storm Arena LIVE Quiz" (`apps/desktop/electron-builder.yml`), `CHAY_GAME.cmd`, `apps/desktop/src/main.ts` | Đổi chuỗi hiển thị; giữ nguyên định danh kỹ thuật | 4 |
| 2 | Top 3 đúng nhanh nhất mỗi câu (`questionTop3`) | Chỉ 1 người, `fastestCorrectAnswerFor` trong runtime | Hàm thuần Top 3 + đồng hạng + contract + UI | 1 (lõi), 3 (UI) |
| 3 | Top 3 điểm chặng (`stageTop3`), nhãn "KHÔNG PHẢI BXH TOÀN TRẬN" | Chưa có; đã có màn INTERIM_TOP10 sau câu 5/10/15 | Tính `stageScore` từ score_events; StageDefinition; UI thay nội dung INTERIM_TOP10 | 1, 3 |
| 4 | Top 10 toàn trận + Victory Top 3 theo tổng điểm | Đã có (`rankPlayers`, `buildPodium`; C-0258 ẩn người 0 điểm) | Chỉ đặt tên rõ `roundTop3/roundTop10`, giữ logic | 1 (nhẹ) |
| 5 | Danh hiệu: LONGEST_STREAK, MOST_CORRECT, COMEBACK, PERFECT_STAGE, FULL_PARTICIPATION, FIRST_CORRECT | Chưa có. `PlayerTotals` có chuỗi hiện tại, chưa có chuỗi dài nhất | Registry + evaluator thuần + snapshot có revision, khoá idempotent | 2 |
| 6 | Theme quyết định tên, icon, màu, số dòng, slot danh hiệu; event override; Dashboard "Danh hiệu theo chủ đề" | Theme có token, font, asset; không có `achievements` | Thêm khối `achievements` tuỳ chọn vào manifest (theme cũ vẫn hợp lệ); trang Dashboard; fallback | 4 |
| 7 | Không rank/XP dài hạn; có retention policy | Không có rank dài hạn ✔; chưa có retention | Lệnh dọn dữ liệu theo số ngày, mặc định chạy thử, người điều khiển duyệt | 5 |
| 8 | Không popup hay ticker xác nhận từng comment | Không có ✔ | Không làm. Bỏ đề xuất "Thấy tên mình ngay" và "BXH tuần" ở tài liệu 17/11 | — |
| 9 | Nhận đáp án từ khi 4 lựa chọn hiện | Đã có (C-0257) ✔ | Chỉ test hồi quy | 5 |
| 10 | Không đổi công thức Kahoot | `kahootPoints`, `kahootStreakBonus` | Không đụng; thêm test khẳng định tổng điểm không đổi | 1 |
| 11 | MC không đọc tên hay comment | `apps/server/src/voice/safety.ts` chặn tên/ID ✔ | Lời dẫn mới chỉ là câu chung (sinh giọng một lần rồi cache) | 3 |
| 12 | Không quá tải ở 5.000–10.000 người | Đã đo 20k người cho ingest/chấm (C-0237) | Đo thêm phần tính chặng và danh hiệu; overlay chỉ nhận Top N | 5 |
| 13 | Giữ asset và bố cục Quiz/Victory đã duyệt | Bố cục chuẩn mẫu 14/11 | UI mới chỉ dùng khung có sẵn (ô callout nhanh nhất, màn INTERIM_TOP10, sảnh). Duyệt ảnh mẫu trước khi code UI | 3 |
| 14 | Unit, integration, performance, kiểm tra giao diện thật | Có vitest, Playwright, bench 20k | Bổ sung test theo mục 7 | mọi phase |
| 15 | Analytics giữ chân theo cohort Q1→Q5→Q10→Q15 | Chưa có | Công cụ chỉ đọc DB, xuất báo cáo | 5 |
| 16 | Index cho score_events theo câu | Có `score_events_round_player_idx`, `answers_round_idx`, unique (câu, người) | Thêm index `score_events(round_id, question_instance_id)`; không đổi các unique hiện có | 1 |

## 3. Module và file sẽ sửa (đường dẫn thật)

**Phase 1 — Ranking core (Codex 1)**
- Mới: `packages/quiz-core/src/rankings.ts` (+ test). Hàm thuần: Top 3 nhanh nhất theo câu, định nghĩa chặng theo `leaderboardInterval`, điểm chặng từ score events, Top 3 chặng.
- Sửa: `packages/quiz-core/src/index.ts` (export).
- Sửa: `packages/contracts/src/index.ts`:
  - thêm `RankingScope`, `RankedEntry`, `StageDefinition`;
  - thêm `questionTop3` / `stageTop3` vào `PublicSnapshot`;
  - giữ `fastestCorrectAnswer` cũ một thời gian để overlay cũ không vỡ.
- Sửa: `apps/server/src/runtime.ts`: thay `fastestCorrectAnswerFor` bằng snapshot Top 3; tính stage Top 3 khi vào INTERIM_TOP10.
- Mới: `packages/persistence/migrations/0004_*.sql`:
  - thêm index;
  - thêm bảng `ranking_snapshots` (round_id, scope, scope_id, achievement_id, revision, entries_json, finalized_at_ms), khoá duy nhất (round_id, achievement_id, scope_id, revision).
- Sửa: `packages/persistence/src/index.ts` (đọc/ghi snapshot).

**Phase 2 — Achievement evaluator (Codex 1)**
- Mới: `packages/quiz-core/src/achievements.ts` (+ test): registry ID cố định và evaluator thuần trên score_events, answers, leaderboard_snapshots.
- Sửa: `runtime.ts` (gọi evaluator ở mốc chặng và cuối trận), `contracts`, `persistence`.

**Phase 3 — Hiển thị (Codex 2)**
- `apps/overlay/src/v3/ArenaStage.tsx`: Top 3 nhanh nhất trong ô callout đã có (thay 1 người bằng tối đa 3 dòng).
- `apps/overlay/src/v3/AuxiliaryStages.tsx`: màn INTERIM_TOP10 hiện stage Top 3, nhãn chặng/khoảng câu, 1 danh hiệu phụ; sảnh xoay danh hiệu trận trước.
- `apps/overlay/src/v3/arena.css`.
- `apps/dashboard/src/main.tsx`: xem trước.
- Lời dẫn MC chung: `apps/server/src/voice/*`.

**Phase 4 — Theme danh hiệu và đổi tên (Codex 1 phần schema, Codex 2 phần giao diện)**
- `packages/contracts/src/theme.ts`: thêm `achievements` (optional).
- `apps/server/src/theme-store.ts`: đọc theme, gộp event override, fallback.
- `apps/dashboard/src/ThemePage.tsx` hoặc trang mới "Danh hiệu theo chủ đề": bật/tắt, tên, subtitle, icon, màu, Top 3/5, slot, Preview, Validate, Reset.
- Đổi tên hiển thị:
  - `apps/dashboard/index.html`
  - `apps/overlay/index.html` (chỉ title cửa sổ; trên sân đấu vẫn hiện tên sự kiện theo theme)
  - `apps/desktop/electron-builder.yml` (`productName`, `shortcutName`)
  - `apps/desktop/src/main.ts`
  - `CHAY_GAME.cmd`
  - `docs/HUONG_DAN_LIVE.md`
  - các test e2e đang kiểm chuỗi title

**Phase 5 — Đo tải, analytics, retention (Codex 1)**
- `tools/`: bench mở rộng, báo cáo giữ chân chỉ đọc DB, lệnh dọn dữ liệu dry-run.

## 4. Migration và tương thích ngược

1. Chỉ **thêm**: migration 0004 thêm index và bảng `ranking_snapshots`; không sửa hay xoá cột nào. Sao lưu `data/quiz.db` trước khi chạy lần đầu.
2. Phiên cũ (trước V5) không có snapshot → BXH chặng và danh hiệu tính lại từ `score_events` khi cần; không làm sai dữ liệu cũ.
3. Theme cũ không có khối `achievements` vẫn hợp lệ; tên và màu danh hiệu lấy fallback của ứng dụng.
4. Đổi tên **không** đụng các định danh kỹ thuật sau:
   - `appId: vn.stormarena.livequiz`
   - tên package `@quiz/*`
   - đường dẫn `data/`, API, WebSocket
5. **Rủi ro cần xử lý:** Electron tính thư mục userData theo `productName`. Đổi `productName` mà không ghim đường dẫn thì bản cài mới sẽ không thấy dữ liệu cũ. Phase 4 phải ghim userData về đường dẫn cũ và có test.
6. `fastestCorrectAnswer` giữ song song với `questionTop3` cho đến khi overlay mới gộp xong rồi mới bỏ, tránh overlay và server lệch phiên bản.

## 5. Luật xếp hạng và trường hợp đồng hạng

**Top 3 nhanh nhất mỗi câu (QUESTION)**
- Nguồn là đáp án đầu tiên đã chấp nhận của mỗi người (`answers`), đúng đáp án, thuộc đúng câu.
- `responseMs = receivedAtMs − openedAtMs` theo đồng hồ server.
- Cùng mili-giây thì đồng hạng (cùng hạng, gắn `tied`). Thứ tự hiển thị trong nhóm theo thứ tự server nhận (`answers.id`), không coi là "nhanh hơn".
- Nhóm đồng hạng vượt quá 3 dòng: hiện 3 dòng kèm "+X người đồng hạng".
- 1–2 người đúng thì chỉ hiện đúng số người; 0 người hiện "Chưa có người trả lời đúng".
- Hiển thị giây, tối đa 2 chữ số thập phân. Câu bị huỷ: không có Top 3.

**Top 3 chặng (STAGE)**
- Chặng = khối `leaderboardInterval` câu (mặc định 5): 1–5, 6–10, 11–15. Số câu khác 15 thì chặng cuối ngắn hơn.
- `stageScore` = tổng `score_events.points` (CORRECT + SPEED + STREAK) của các câu trong chặng, kể cả thưởng chuỗi kéo từ chặng trước.
- Kiểm chứng bắt buộc: tổng stageScore các chặng = điểm vòng của từng người.
- Xếp theo stageScore, hoà thì theo số câu đúng trong chặng, vẫn hoà thì đồng hạng (giống `rankPlayers`).
- Người vào giữa vòng được tranh từ chặng họ tham gia.

**Danh hiệu**
- **LONGEST_STREAK (toàn trận, Top 3):** chuỗi đúng dài nhất của từng người. Đồng chuỗi thì đồng hạng; tối thiểu 3 câu mới vào bảng.
- **MOST_CORRECT (toàn trận, Top 5):** số câu đúng tuyệt đối; nhãn ghi "NHIỀU CÂU ĐÚNG NHẤT". Không làm ACCURACY_RATE trong V5.
- **COMEBACK (chặng, Top 3):**
  - Delta = hạng toàn trận ở snapshot cuối chặng trước − hạng ở snapshot cuối chặng này.
  - Chỉ tính người có hạng ở cả hai mốc và trả lời ít nhất 3 câu trong chặng; chặng 1 không xét.
  - Đồng delta thì đồng hạng.
- **PERFECT_STAGE, FULL_PARTICIPATION, FIRST_CORRECT:** chỉ hiện tổng số người đạt, không chọn ai làm "Top".
- **STAGE_CHAMPION, FASTEST_CORRECT, ROUND_CHAMPION:** dùng chung dữ liệu với Stage Top 3, Question Top 3 và Victory; không tạo bảng trùng.
- **Chống phát lặp:** khoá `roundId + achievementId + scopeId + playerId`. Reconnect hay recovery chỉ nhận lại snapshot mới nhất theo `revision`.
- **Câu bị void/regrade:** tính lại snapshot với `revision + 1`.

## 6. Dòng thời gian trình chiếu (không thêm thời gian chờ)

| Thời điểm | Hiện gì | Thời lượng |
| --- | --- | --- |
| REVEAL mỗi câu | Đáp án đúng, % chọn; Top 3 nhanh nhất trong ô callout đang có | Giữ 9 s hiện tại |
| Sau câu 5 và 10 (INTERIM_TOP10) | "BXH CHẶNG X – CÂU A–B – KHÔNG PHẢI BXH TOÀN TRẬN" Top 3 + 1 danh hiệu phụ | Giữ 6 s hiện tại |
| Sau câu 15 | Chặng 3 gọn trong INTERIM_TOP10, rồi Victory Top 3 toàn trận | 6 s + Victory 10 s (C-0265) |
| Sảnh chờ | Xoay Top 3/5 danh hiệu trận trước cạnh đếm ngược | Trong thời gian sảnh có sẵn |

MC chỉ đọc câu chung, ví dụ "Top ba nhanh nhất câu này đã lộ diện!", "Đây là bảng chặng hai, không phải bảng tổng!".

Trước khi code Phase 3, Codex 2 nộp ảnh mẫu 1080×1920 cho từng khung để chủ dự án duyệt, vì bố cục 14/11 là cố định.

## 7. Kế hoạch test, đo tải và rollback

- **Unit (quiz-core):**
  - Top 3 với 0, 1, 2, 3 và nhiều người đúng; đồng hạng cùng mili-giây; đáp án sai không được tính.
  - Chặng 1/2/3 với 15 câu và với số câu khác; tổng chặng = tổng vòng; chuỗi kéo qua chặng; người vào muộn.
  - COMEBACK bỏ qua người không có hạng đầu chặng; MOST_CORRECT đúng metric; câu void.
- **Integration (server):**
  - Snapshot không phát lặp sau reconnect, pause/resume, khôi phục.
  - Không lẫn sang vòng mới.
  - Overlay và WebSocket chỉ nhận `safeDisplayName`.
  - TTS không chứa tên người chơi.
  - Tổng điểm trước và sau V5 giống hệt trên cùng dữ liệu phát lại.
- **Đo tải:**
  - 100 / 1.000 / 5.000 / 10.000 người, bình luận dồn cục.
  - Ghi p50/p95/p99 thời gian tính chặng và danh hiệu, CPU, RAM, kích thước payload WebSocket, độ tăng DB.
  - Không mất đáp án.
- **Giao diện:**
  - Ảnh 1080×1920 các khung mới với tên dài 24 ký tự và đồng hạng; nhãn CÂU / CHẶNG / TOÀN TRẬN dễ phân biệt.
  - Victory giữ nguyên sân khấu và cúp.
  - Chạy thử qua LIVE Studio.
- **Rollback:**
  - Mỗi phase là một nhánh và một merge riêng; lỗi thì revert merge đó.
  - Migration 0004 chỉ thêm nên không phải gỡ.
  - Có cờ cấu hình để tắt hiển thị danh hiệu khi LIVE mà không cần build lại.

## 8. Bảng việc, thứ tự và phụ thuộc

**Đang chạy (P0 vận hành, V5 §2 yêu cầu ưu tiên):**
- **Codex 1:**
  - C-0269: CHAY_GAME tự build
  - C-0262/0263: ô chat MC
  - C-0272: câu dễ ra đầu vòng
- **Codex 2:**
  - C-0273: sửa lưới đáp án
  - C-0264/0265/0266: % đủ 100, Victory 10 s, nhạc thay phiên. **Đang sửa contracts và engine.**
  - C-0270: nút hợp lệ
  - C-0271: cửa sổ 1080×1920

**Xung đột cần tránh:**
- C-0264/0266 đang sửa `packages/contracts/src/index.ts`, `packages/contracts/src/theme.ts` (slot âm thanh) và `packages/quiz-core/src/engine.ts`.
- C-0272 sửa `packages/quiz-core/src/selection.ts`.
- C-0262 sửa `apps/server/src/runtime.ts`.
- C-0269/0271 sửa launcher.

Vì vậy:

| Mức | Việc | Owner | Bắt đầu khi |
| --- | --- | --- | --- |
| P1 | Phase 1 Ranking core | Codex 1 | C-0272 và C-0264/0265/0266 đã gộp vào main |
| P1 | Phase 2 Achievement evaluator | Codex 1 | Phase 1 được duyệt nghiệm thu |
| P1 | Ảnh mẫu UI Phase 3 (chưa code) | Codex 2 | Sau C-0271; song song Phase 1 vì không đụng code |
| P1 | Phase 3 Hiển thị | Codex 2 | Phase 1 xong + ảnh mẫu được duyệt (cần Phase 2 cho danh hiệu phụ) |
| P2 | Phase 4a schema theme danh hiệu | Codex 1 | Sau Phase 2 |
| P2 | Phase 4b trang Dashboard + đổi tên | Codex 2 | Sau C-0269/C-0271 (cùng đụng launcher) và Phase 4a |
| P2 | Phase 5 đo tải 10k, analytics, retention | Codex 1 | Sau Phase 3 |

Quiz-core và overlay không bao giờ có hai nhánh cùng sửa một lúc. Mỗi phase nộp bằng chứng (test, ảnh, số đo) trước khi coordinator gộp và sang phase kế.

## 9. Quyết định đã chốt (18/11/2026)

1. LONGEST_STREAK chỉ vào bảng khi chuỗi ≥ 3 câu; COMEBACK yêu cầu ≥ 3 câu trả lời trong chặng.
2. Retention mặc định 30 ngày, chỉ chạy khi người điều khiển bấm lệnh (mặc định dry-run, không tự xoá).
3. Phase 1 bắt đầu sau khi C-0272 gộp vào main. Nếu C-0264/0265/0266 gộp trước hoặc sau, nhánh V5 phải merge origin/main mới nhất trước khi báo cáo.
