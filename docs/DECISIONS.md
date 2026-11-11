# Bản ghi quyết định kiến trúc (ADR)

Mỗi mục: **Quyết định** · Lý do · Hệ quả. Quyết định hành vi đã chốt với người dùng nằm ở `mailbox/BOARD.md` ("Quyết định đã chốt") và được khoá bằng test.

## D-01 · Monorepo pnpm, TypeScript strict, chạy thẳng `src/*.ts` bằng tsx
- Lý do: một tsconfig chung, package export thẳng `src/index.ts` → không cần bước build cho Phase 1, typecheck toàn repo bằng một lệnh.
- Hệ quả: đóng gói Windows (Phase 6) cần thêm bước bundle. Ghim major: vite 6, vitest 3, zod 3, react 18.

## D-02 · SQLite qua better-sqlite3 + Drizzle (không Prisma)
- Lý do: better-sqlite3 **đồng bộ** → cùng với Node đơn luồng, mọi đầu vào (comment, lệnh, đồng hồ) xử lý tuần tự, không có tranh chấp; transaction rẻ.
  Drizzle chỉ dùng để khai báo schema + sinh migration (`drizzle-kit`); đường nóng dùng prepared statement thô. Prisma cần engine nhị phân + client async, nặng hơn và không cần thiết cho ứng dụng cục bộ.
- Cấu hình: WAL, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`.
- Hệ quả: một tiến trình server cho một file DB. Đo: p99 ingest ≈ 1 ms (`tests/load`).

## D-03 · Reducer thuần + vỏ hiệu ứng (SessionRuntime)
- `transition(state, input, now)` không I/O, không đồng hồ, không random. `SessionRuntime.apply()` làm:
  reducer → **một transaction** (hiệu ứng DB + snapshot trạng thái + bản ghi lệnh + outbox) → commit → phát WS từ outbox → đặt lại đồng hồ.
- Hệ quả: WS không bao giờ phát trạng thái chưa commit; test reducer không cần DB.

## D-04 · Chấm điểm tại REVEAL bằng tính lại toàn vòng
- `computeRoundScores` tính lại toàn vòng từ dữ liệu gốc; `INSERT … ON CONFLICT DO NOTHING` vào sổ cái với khoá `(round, questionInstance, player, reason)` → idempotent.
- Sau mỗi lần chấm: so `SUM(sổ cái)` với kết quả tính; lệch ⇒ `FATAL SCORE_INTEGRITY` (ERROR, dừng đồng hồ). Kiểm lại khi khôi phục sau crash.

## D-05 · `UNIQUE(question_instance_id, player_id)` là thẩm quyền "đáp án đầu tiên thắng"
- Spam / đổi đáp án không có tác dụng. Khử trùng `eventId` trong bộ nhớ (≤ 100 000 khoá) chỉ là lớp phụ.

## D-06 · Void sau reveal chỉ cho câu VỪA reveal
- Hợp lệ ở REVEAL/LEADERBOARD của chính câu đó; ghi bút toán đảo `VOID_REVERSAL:<reason>`, không sửa/xoá dòng cũ. Void hồi tố câu cũ hơn → backlog.

## D-07 · Khởi động lại → PAUSED/RECOVERY (= RECOVERY_PENDING)
- `PROCESS_RESTARTED`: thời gian còn lại tính theo heartbeat cuối (1 s/lần). Chỉ `RESOLVE_RECOVERY` (RESUME/VOID/STOP) hoặc `STOP` được nhận.
  VOID qua recovery chỉ cho câu chưa công bố. Outbox chưa phát của tiến trình cũ bị đánh dấu đã phát (client lấy snapshot qua HELLO).

## D-08 · Mất kết nối nguồn comment
- Đang ACCEPTING → `CONNECTION_INTERRUPTED`, đồng hồ đóng băng. Mở câu khi đang mất kết nối → vào thẳng CONNECTION_INTERRUPTED. Có mạng lại không tự chạy;
  RESUME mở lại cửa sổ từ thời điểm resume (comment trong lúc treo không bao giờ được tính).

## D-09 · Kênh công khai không lộ đáp án
- `PublicQuestion` dựng tường minh, không có `correctOptionId`/`originalOptionId`. Trong ACCEPTING chỉ gửi TỔNG số đáp án; phân bố A–D chỉ lúc REVEAL. Có test WS.

## D-10 · LEADERBOARD sau mỗi câu (V3, thay bản V2)
- REVEAL → LEADERBOARD 4 s (scene REVEAL, Top 10 gọn cập nhật); mốc mỗi 5 câu + câu cuối → BXH lớn `INTERIM_TOP10` 6 s. Câu huỷ trước công bố chỉ vào BXH ở mốc.
- PREPARE chỉ hiện câu hỏi; ACCEPTING mới hiện 4 đáp án (người dùng chốt 11/11).

## D-11 · Câu hỏi DEMO
- `verificationStatus='DEMO'`, chỉ vào vòng khi `mode=MOCK` và `allowDemoQuestions=true` (schema chặn ở LIVE). Overlay luôn gắn nhãn DEMO.

## D-12 · Mốc chuỗi 3/5/10
- Thưởng tại câu đạt mốc; sau khi chuỗi bị reset, đạt lại mốc thì thưởng lại. **Diễn giải — cần người dùng xác nhận.**

## D-13 · Bảo vệ admin trên localhost
- Bind `127.0.0.1` (từ chối host khác nếu không đặt `QUIZ_ALLOW_REMOTE=1`). Token sinh lần đầu (`data/admin-token.txt`), gửi qua `Authorization` / HELLO, không trong URL, không in log.
  POST kiểm `Origin` (chống CSRF). So token bằng `timingSafeEqual`.

## D-14 · Chỉ một phiên OPEN tại một thời điểm
- Đơn giản hoá runtime + overlay (không cần chọn phiên). Tạo phiên mới khi đang có phiên mở → 409.

## D-15 · TikTok connector — cập nhật 11/11: dùng tạm `tiktok-live-connector` (người dùng chốt), song song hỏi kênh chính thức
- Thư viện cộng đồng, ký request qua Euler Stream (bên thứ ba), giấy phép AGPL-3.0 có sửa đổi. Người dùng/đơn vị chấp nhận rủi ro điều khoản. Ràng buộc: xem BOARD #17.

### (bản cũ) TikTok connector bị chặn cho tới cổng khả thi (Phase 4)
- `TikTokAdapterBlocked` luôn báo `BLOCKED`; server từ chối tạo phiên mode TIKTOK (`LIVE_CONNECTOR_BLOCKED`). Không khẳng định có API chính thức khi chưa có bằng chứng.

## D-16 · Không thưởng tốc độ
- Độ trễ giao comment của TikTok không dự đoán được; chấm theo thời điểm server nhận, cửa sổ end-exclusive.

## D-17 · Người dùng làm chủ bộ câu hỏi (người dùng chốt 11/11)
- Tool (AI Question Studio, Phase 3) chỉ **đề xuất** bản nháp (`DRAFT`/`PENDING_REVIEW`). Người dùng **sửa** (câu hỏi, 4 đáp án, đáp án đúng, giải thích, độ khó),
  **chọn** câu nào dùng và **duyệt** (`APPROVED` + `OPERATOR_VERIFIED`). Không có đường nào tự đặt `APPROVED`.
- Sửa câu đã duyệt → `version + 1`, lưu `question_versions`, quay về `PENDING_REVIEW`. Vòng đang chạy dùng snapshot bất biến nên không bị ảnh hưởng.
- Màn Question Bank (Phase 2) phải có form sửa đầy đủ + nút duyệt/từ chối; `MANUAL_PLAYLIST` để người dùng tự chọn bộ câu cho vòng.
- `fixtures/questions.ts` chỉ là dữ liệu DEMO để kiểm thử engine ở chế độ MOCK.
- **Toàn bộ câu hỏi phải thuộc chủ đề Free Fire** (người dùng chốt 11/11), kể cả bộ DEMO. Dữ kiện giải BVĐC chỉ dùng khi người dùng duyệt nguồn.

## D-18 · Ưu tiên V3 (người dùng chốt 11/11)
- Tập trung: game đúng + kết nối TikTok LIVE ổn định + đóng gói Windows. Animation chỉ ở mức tối thiểu (PNG tĩnh + transform nhẹ); không Spine/Rive/Pixi ở MVP.
- Đóng gói: Electron (server chạy trong tiến trình chính, phục vụ dashboard + overlay cùng một origin loopback), bộ cài NSIS, dữ liệu ở %APPDATA%.

## Hoãn (backlog)
SMART_RANDOM theo quota 7/5/3 (Phase 2) · auto mode nhiều vòng có preflight đầy đủ (Phase 6) · purge/export dữ liệu người chơi (Phase 6) ·
backup định kỳ (Phase 6) · void hồi tố câu cũ · tie-break công bố trước vòng.
