# HANDOFF — trạng thái dở dang (2026-11-11)

Phiên trước dừng giữa chừng do giới hạn tài khoản. File này để phiên mới làm tiếp mà không phải dựng lại ngữ cảnh.
Đặc tả gốc: `CLAUDE_MASTER_BUILD_PLAN_V2.md`. Yêu cầu của user: phân tích kiến trúc, lập danh sách công việc theo phụ thuộc,
triển khai **chỉ Phase 0 và Phase 1**, mỗi phase có kiểm thử + báo cáo nghiệm thu. Tài liệu viết tiếng Việt.

## CHƯA KIỂM CHỨNG GÌ CẢ
Chưa chạy `typecheck`, chưa có test nào, chưa chạy server. Mọi mã dưới đây là bản viết lần đầu.

## Môi trường
- Node 24.18, không có pnpm toàn cục → dùng `corepack pnpm ...` (pnpm 10.12.1). Không có Python.
- `corepack pnpm install` đã chạy OK; better-sqlite3 12 cài được bản prebuilt.
- Cố ý ghim major đã biết: vite 6, vitest 3, zod 3, react 18 (registry có bản mới hơn nhiều).
- Đã `git init`, chưa commit. `.gitignore` chặn `*.xlsx` và ảnh đầu vào ở thư mục gốc.
- Có Edge + Chrome cài sẵn → Playwright dùng `channel: 'msedge'`, không cần tải browser.

## Kiểm kê đầu vào (đã xem)
- `DAU_TRUONG_BAO_TO_Megasheet_CS.xlsx`: 16 sheet. Chỉ đọc TÊN sheet, chưa đọc nội dung. Nhạy cảm, không được nhập:
  `3B. FINAL PLAYERS INFO` (ẩn), `3A. RAW PLAYERS INFO`, `3. PLAYERS INFO`, `PlayernameOverwrite`, `List KOL Dự Kiến` (ẩn), `_Lists` (ẩn).
  Các sheet khác: `1. Wiki`, `2. Project Timeline`, `4. BRACKET`, `10. KỊCH BẢN CASTERS`, AGENDA/RUNDOWN 12–14.11.
- 8 poster đội (GK/Gác Kiếm, Ngốc Nghếch, One Champ, Bạn Siêu Thân/BST, Outlaw, Thỏ Bá Vương, Hope, Bắn Toàn Trượt) —
  có ảnh chân dung người thật + logo FREE FIRE góc trên → chỉ tham khảo, không ship.
- Lưới 8 logo đội; 4 chibi tham chiếu; nền sân 16:9 có 8 banner; cúp + bục gốc (nền xám); nền cổng năng lượng 9:16;
  `4.png` (thẻ người chơi), `Screenshot…` (bảng MVP).
- `Ảnh ChatGPT 10_21_22` trùng byte-size với `10_21_10` (bản sao).
- Đặc tả nhắc `IMG_2125.jpeg`, `IMG_2124`, `IMG_2134`, `IMG_2141`, `IMG_2142` — **không có file tên đó**; các file "Ảnh ChatGPT…"
  có vẻ là chúng nhưng cần user xác nhận ánh xạ + quyền sử dụng asset trước Phase 5.

## Đã viết
- Gốc: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json` (một tsconfig chung, package export thẳng `src/index.ts`, chạy bằng tsx),
  `vitest.config.ts` (projects: unit / integration / load), `.gitignore`.
- `packages/contracts/src/index.ts` — Zod schema: state, scene, CommentEvent, Question, SessionConfig, SafeZonePreset,
  lệnh điều hành + envelope (commandId, expectedStateVersion…), snapshot public/admin, thông điệp WS.
- `packages/quiz-core/src/` — `answers.ts` (parse A/B/C/D, cửa sổ end-exclusive, sanitize tên), `scoring.ts`
  (tính lại cả vòng từ gốc, hạng dùng chung, podium có hoà), `selection.ts` (RANDOM có seed, xáo đáp án, snapshot),
  `engine.ts` (reducer thuần `transition(state, input, now)`).
- `packages/persistence/` — `src/schema.ts` (19 bảng), `migrations/0000_*.sql` (đã sinh bằng drizzle-kit), `src/index.ts` (class `Store`).
- `packages/live-adapters/src/` — `LiveAdapter`, `MockAdapter`, `TikTokAdapterBlocked`, `RealScheduler`/`ManualScheduler`, `MockSimulator`.
- `packages/theme-core`, `packages/ai-core`: chỉ là stub đánh dấu Phase 2/3.

## Quyết định thiết kế đã chốt (ghi vào docs/DECISIONS.md khi viết)
1. Drizzle + better-sqlite3 (đồng bộ, WAL, `synchronous=NORMAL`); đường nóng dùng prepared statement thô.
2. Chấm điểm tại REVEAL: tính lại toàn vòng bằng `computeRoundScores`, `INSERT … ON CONFLICT DO NOTHING` vào sổ cái
   → idempotent. Tổng điểm = SUM(sổ cái); lệch so với kết quả tính → coi là lỗi toàn vẹn (FATAL).
3. `UNIQUE(question_instance_id, player_id)` trên `answers` là thẩm quyền "đáp án đầu tiên thắng".
4. Void sau reveal chỉ cho câu VỪA reveal (đang ở REVEAL/LEADERBOARD); ghi bút toán đảo `VOID_REVERSAL:<reason>`.
   Void hồi tố câu cũ hơn → backlog.
5. LEADERBOARD chỉ vào ở mốc (mỗi `leaderboardInterval`=5 câu và câu cuối); các câu khác REVEAL → PREPARE.
6. Restart: `PROCESS_RESTARTED` → `PAUSED` với `suspended.kind='RECOVERY'` (= RECOVERY_PENDING), thời gian còn lại tính theo
   heartbeat cuối; chỉ `RESOLVE_RECOVERY` (RESUME/VOID/STOP) hoặc `STOP` được chấp nhận. Không bao giờ tự chạy tiếp.
7. Mở ACCEPTING khi mất kết nối → vào thẳng `CONNECTION_INTERRUPTED`. Có mạng lại không tự resume.
8. Công khai chỉ nhận TỔNG số đáp án trong ACCEPTING; phân bố theo đáp án chỉ gửi lúc reveal (tránh dẫn dắt + lộ đáp án).
9. Câu hỏi fixture gắn `verificationStatus='DEMO'`, chỉ vào vòng khi `mode=MOCK` và `allowDemoQuestions=true`.
10. Mốc chuỗi 3/5/10: thưởng tại câu đạt mốc; đạt lại sau khi reset thì thưởng lại (diễn giải — cần user xác nhận).
11. SMART_RANDOM (quota 7/5/3), auto mode nhiều vòng đầy đủ, purge/export → để Phase 2 / Phase 6, ghi rõ trong backlog.
12. Token admin: sinh lúc chạy lần đầu, gửi qua header `Authorization` / thông điệp HELLO, không đặt trong URL. Bind `127.0.0.1`.

## Còn phải làm (theo thứ tự phụ thuộc)
1. `corepack pnpm typecheck` và sửa lỗi các package đã viết.
2. Unit test quiz-core: parseAnswer, cửa sổ, chấm điểm/chuỗi, hoà hạng + podium vắt ngưỡng, selection tất định, mọi nhánh reducer.
3. `fixtures/questions.ts` (≥ 30 câu DEMO tiếng Việt, kiến thức chung, không dính dữ kiện giải đấu) + `fixtures/players.ts`
   (tên hư cấu, có tên dài / emoji / chuỗi giống HTML).
4. `apps/server`: `SessionRuntime` (dispatch trong transaction: idempotency → reducer → hiệu ứng → snapshot → outbox → commit → phát WS),
   pipeline comment, heartbeat, khôi phục lúc boot, Fastify routes mục 11, WS HELLO theo vai trò, token admin, kiểm tra Origin.
5. Test tích hợp bằng `ManualScheduler`: vòng 15 câu × 100 người mô phỏng, đối chiếu với bản tính tham chiếu độc lập,
   không điểm trùng, crash giữa câu + ngay sau reveal rồi mở lại DB, WS công khai không lộ đáp án trước reveal, lệnh cũ → 409,
   gửi lại cùng commandId. Test tải nhẹ ở `tests/load`.
6. `apps/overlay` (khung 1080×1920, các lớp DOM độc lập, chỉ dùng token màu — chưa dùng asset) và `apps/dashboard` tối thiểu (Live Control).
7. Playwright smoke + ảnh chụp overlay; `scripts/privacy-check.mjs` (fail nếu có xlsx/ảnh đầu vào bị track hoặc lọt vào fixtures);
   `scripts/simulate-round.ts`; `.github/workflows/ci.yml`.
8. Tài liệu mục 15.2: `README.md`, `docs/ARCHITECTURE.md`, `DECISIONS.md`, `DATA_PRIVACY.md`, `THEME_PACK_SPEC.md`,
   `GAME_RULES.md`, `TEST_PLAN.md`, `IMPLEMENTATION_BACKLOG.md` (kèm đồ thị phụ thuộc), sổ rủi ro,
   `docs/reports/PHASE_0_ACCEPTANCE.md`, `PHASE_1_ACCEPTANCE.md` (kèm lệnh + output test thật).
9. Dừng sau Phase 1, không làm Phase 2+.
