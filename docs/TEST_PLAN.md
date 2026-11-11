# TEST_PLAN — Ma trận kiểm thử §13

**Trạng thái:** kiểm kê và kế hoạch; đối chiếu `CLAUDE_MASTER_BUILD_PLAN_V2.md` §13 tại `origin/main` (`e02a5a0`). Tài liệu này không phải bằng chứng suite đã chạy hoặc đạt. “Có” nghĩa là đã tìm thấy test tương ứng trong mã nguồn; kết quả chạy gần nhất cần lấy từ CI hoặc chạy lại trước khi phát hành. Không có test mới được thêm trong DP2.

## 1. Hiện trạng kiểm thử trong repository

| Phạm vi | File và test hiện có |
|---|---|
| Parser, thời điểm nhận đáp án, tên hiển thị | `packages/quiz-core/src/answers.test.ts`: `parseAnswer`, `decideComment`, `sanitizeDisplayName` — token đơn A–D, thời điểm đầu/cuối, đáp án sớm/trễ/stale, control/bidi, grapheme và emoji. |
| Chọn câu và pool | `packages/quiz-core/src/selection.test.ts`: PRNG/seed, eligibility, ngày hiệu lực, không lặp, hết pool, reuse có chủ đích và ánh xạ đáp án sau shuffle. |
| Điểm, tie, podium | `packages/quiz-core/src/scoring.test.ts`: điểm/streak, idempotency, đối chiếu ledger, hạng đồng điểm, Top N và tie qua ngưỡng podium. |
| State machine, pause/reconnect/recovery | `packages/quiz-core/src/engine.test.ts`: chuyển trạng thái/version, timer, mất kết nối, skip/void, restart, auto mode và vòng kế tiếp. |
| Persistence | `packages/persistence/src/store.test.ts`: migration/WAL/FK, player/answer, ledger, transaction rollback, backup mở lại được và lịch sử. |
| Vòng tích hợp MOCK | `tests/integration/round.test.ts`: vòng 15 câu × 100 người chơi, spam/trùng, stale event, zero participant, hết câu, disconnect, crash/recovery, no answer before reveal. |
| Connector/overlay health MOCK | `tests/integration/connection.test.ts`: phát lại `eventId` sau restart, trạng thái reconnect, system checks và overlay ACK với một client. |
| Tải ingest MOCK | `tests/load/ingest.test.ts`: 500 người chơi, 1.500 comment trong 10 giây ảo, nhận 500 và loại 1.000 đáp án trùng; đo p50/p99 đồng bộ của `ingest`. Đây không phải phép đo TikTok hay mạng thật. |
| Dashboard/overlay logic | `apps/dashboard/src/logic.test.ts`, `apps/overlay/src/overlayLogic.test.ts`: command/version, snapshot cũ, timer, phân trang leaderboard, thứ tự podium. Chưa phải kiểm thử render pixel hoặc trình duyệt thật. |
| SPA, origin và loopback | `tests/integration/web.test.ts`: dashboard/overlay SPA và asset, traversal, origin lạ, loopback và DNS rebinding. |
| Fixtures | `fixtures/fixtures.test.ts`: 36 câu DEMO, dữ liệu giả, câu dài, lựa chọn hợp lệ, sanitize tên dài/emoji và từ cấm. |

## 2. Ma trận yêu cầu §13

### Tải và hiệu năng

| ID | Yêu cầu §13 | Bằng chứng hiện có hoặc test cần thêm | Trạng thái và phase |
|---|---|---|---|
| P-01 | Mốc MOCK cơ sở: 100 người chơi đồng thời | `tests/integration/round.test.ts` — `Vòng MOCK 15 câu × 100 người chơi mô phỏng`: chạy vòng, đối chiếu điểm tham chiếu, kiểm tra không chấm trùng. Simulator tạo người chơi sự kiện trong tiến trình; chưa kiểm tra 100 kết nối mạng đồng thời. | Có cho baseline mô phỏng Phase 1; không phải kiểm tra connector thật. |
| P-02 | Stress với 500 người chơi | `tests/load/ingest.test.ts` chạy 500 danh tính trong một câu, cùng 1.500 lần ingest; không chạy 500 socket/client độc lập hoặc nhiều phiên đồng thời. | Một phần; mở rộng workload và tiêu chí stress ở Phase 6. |
| P-03 | Burst 100 comment/giây | Load test ghi 1.500 comment qua 10 giây ảo (150/s trung bình theo lịch test). Lời gọi `ingest` đồng bộ trong cùng tiến trình; chưa mô phỏng burst mạng theo thời gian thực. | Một phần; thêm workload burst thực tế trong benchmark Phase 6. |
| P-04 | Benchmark latency từ ingest tới ACK | `tests/load/ingest.test.ts` đo p50/p99 thời gian gọi `ingest` đồng bộ, đặt ngưỡng p99 <20 ms. `tests/integration/connection.test.ts` kiểm tra ACK snapshot overlay riêng; chưa đo đầu-cuối từ comment tới ACK hoặc p95/p99 ACK. | Một phần; benchmark đầu-cuối ở Phase 6. |
| P-05 | Benchmark WebSocket fanout | `tests/integration/connection.test.ts` kết nối một overlay, nhận snapshot và ACK; không đo fanout tới nhiều client, thông lượng hay latency. | Chưa có benchmark; Phase 6. |
| P-06 | Benchmark tranh chấp SQLite | `packages/persistence/src/store.test.ts` xác nhận WAL, transaction/rollback và backup; không có test ghi/đọc đồng thời hoặc benchmark contention. | Chưa có benchmark; Phase 6. |
| P-07 | Đo sự kiện bị rơi | Load test đối chiếu số accepted/rejected trong workload MOCK; test connection xác nhận dedupe event sau restart. Chưa tiêm mất sự kiện vào queue/connector hoặc đo khả năng phát hiện và đối soát event rơi. | Một phần; thêm fault injection và bộ đếm/đối soát ở Phase 6, connector thật ở Phase 4 khi được phép. |

### Hành vi, trạng thái và dữ liệu biên

| ID | Yêu cầu §13 | Bằng chứng hiện có hoặc test cần thêm | Trạng thái và phase |
|---|---|---|---|
| F-01 | Spam đáp án | `tests/load/ingest.test.ts` gửi một đáp án cùng hai lần lặp cho mỗi người; `tests/integration/round.test.ts` kiểm tra spam, duplicate answer/event và no double score. | Có cho MOCK; execution status cần xác nhận ở CI. |
| F-02 | Duplicate event | `tests/integration/round.test.ts` — `eventId` trùng bị loại; `tests/integration/connection.test.ts` — event đã xử lý trước restart không được tính lại. | Có cho MOCK và persistence. |
| F-03 | Hai đáp án đến đồng thời | Test hiện có xác nhận đáp án đầu tiên thắng, nhưng không gửi đồng thời/racing để kiểm tra tính nguyên tử giữa ingest và SQLite. | Chưa có; bổ sung test tranh chấp ở Phase 1 trước khi dựa vào thứ tự event của connector. |
| F-04 | Đáp án sớm/trễ | `packages/quiz-core/src/answers.test.ts` — biên `openAtMs`/`deadlineMs`, EARLY/LATE/STALE; `tests/integration/round.test.ts` kiểm tra ngoài cửa sổ nhận. | Có. |
| F-05 | Mất kết nối/kết nối lại | `packages/quiz-core/src/engine.test.ts`, `tests/integration/round.test.ts` và `tests/integration/connection.test.ts` kiểm tra pause/interruption/reconnect/resume. Đây là luồng MOCK, không xác nhận TikTok LIVE. | Có cho MOCK; connector và tài khoản được phép thuộc Phase 4, tổng duyệt thuộc Phase 6. |
| F-06 | Backend crash | `tests/integration/round.test.ts` có crash giữa câu và sau reveal, phục hồi từ SQLite, xác nhận điểm và ledger; Store có test backup. | Có cho luồng recovery MOCK; cần ghép vào tổng duyệt Phase 6. |
| F-07 | Reload trình duyệt | Test logic overlay/dashboard bỏ snapshot cũ và chấp nhận server run mới; chưa tự reload trang trình duyệt đang mở và kiểm tra UI phục hồi. | Chưa có end-to-end browser test; Phase 5. |
| F-08 | Theme không hợp lệ | System check hiện chỉ xác nhận trạng thái theme `NOT_TESTED`; chưa có test pack/theme malformed hoặc fallback UI. | Chưa có; Phase 2. |
| F-09 | JSON AI không hợp lệ | Chưa có kiểm thử JSON sinh lỗi, schema validation, hiển thị lỗi và chặn publish. | Chưa có; Phase 3. |
| F-10 | Câu trả lời mơ hồ | `packages/quiz-core/src/answers.test.ts` từ chối comment ghép như `A B`, `đáp án A`, `AA`; chưa có bộ ca biên theo nguồn/comment hoặc đánh giá câu hỏi AI mơ hồ. | Một phần ở parser; xác định ca mơ hồ và kiểm tra review gate ở Phase 1/3. |
| F-11 | Không có người tham gia | `tests/integration/round.test.ts` — `vòng không có ai tham gia vẫn kết thúc, không bịa người chơi`. | Có. |
| F-12 | Đồng điểm tại ngưỡng podium | `packages/quiz-core/src/scoring.test.ts` — tie hạng và `buildPodium` với `tieAcrossCutoff`. | Có ở logic tính hạng/podium. |
| F-13 | Pool câu hỏi cạn | `packages/quiz-core/src/selection.test.ts` kiểm tra `INSUFFICIENT_QUESTIONS` và reuse; `tests/integration/round.test.ts` kiểm tra không đổi trạng thái khi thiếu câu. | Có. |
| F-14 | Tên tiếng Việt và nickname dài | `packages/quiz-core/src/answers.test.ts` kiểm tra sanitizer Unicode/grapheme; `fixtures/fixtures.test.ts` kiểm tra tên dài/emoji giả và câu hỏi/đáp án dài. Chưa kiểm tra cách font render các nickname trên overlay. | Một phần; kiểm tra hình ảnh ở Phase 5. |
| F-15 | Safe-zone trên nhiều thiết bị | Overlay logic test không đo pixel; chưa có bộ viewport/device và vùng che HUD đã hiệu chuẩn. | Chưa có; simulator, hiệu chuẩn và xác minh Phase 5. |
| F-16 | Ít nhất 6 vòng liên tiếp | Test tích hợp chạy một vòng 15 câu và bắt đầu vòng sau, không chứng minh 6 vòng liên tục cùng recovery/backup. | Chưa có; acceptance 6 vòng mock thuộc Phase 6. |

### Hình ảnh và chữ tiếng Việt

| ID | Yêu cầu §13 | Bằng chứng hiện có hoặc test cần thêm | Trạng thái và phase |
|---|---|---|---|
| V-01 | So sánh screenshot của mọi overlay scene | `apps/overlay/src/overlayLogic.test.ts` kiểm tra dữ liệu logic; chưa có screenshot baseline, pixel/visual diff hay kiểm kê scene tự động. | Chưa có; Phase 5. |
| V-02 | HUD Simulator với comment dày | Load test chỉ đo xử lý ingest MOCK; không render comment chồng lên overlay hoặc so ảnh trong HUD Simulator. | Chưa có; Phase 5. |
| V-03 | Xác minh glyph tiếng Việt | Dữ liệu test có tiếng Việt, nhưng chưa có kiểm tra glyph/font qua trình duyệt hoặc ảnh chụp ở độ phân giải phát sóng. | Chưa có; Phase 5. |

## 3. Definition of done

| ID | Điều kiện hoàn tất §13 | Bằng chứng hiện có hoặc việc cần làm | Trạng thái và phase |
|---|---|---|---|
| D-01 | Chỉ tuyên bố LIVE-ready sau khi connector được thử với tài khoản thật trong môi trường được phép | `docs/TIKTOK_CONNECTOR_SPIKE.md`; test system check mặc định `tiktokConnector: NOT_TESTED`. Không có bằng chứng test LIVE trong suite. | Chưa đạt; Phase 4 và phải có môi trường/tài khoản được phép. MOCK không thay thế điều kiện này. |
| D-02 | Tất cả state/score tests pass | Có unit/integration coverage ở `packages/quiz-core/src/engine.test.ts`, `scoring.test.ts`, `tests/integration/round.test.ts`. Kiểm kê DP2 không chạy suite, nên không xác nhận pass tại commit này. | Có test source; cần CI xanh và lưu kết quả khi chốt release. |
| D-03 | Operator chạy được mà không phải sửa code | `apps/dashboard/src/logic.test.ts` kiểm tra logic command; chưa có kiểm thử người vận hành chạy trọn từ cài đặt đến trận đấu và khôi phục trên máy sạch. | Chưa xác minh; đóng gói/vận hành và tổng duyệt Phase 6. |
| D-04 | Overlay không lộ đáp án trước reveal | `tests/integration/round.test.ts` kiểm tra answer count/reveal và test WebSocket `không lộ đáp án đúng trước REVEAL; admin cần token`. | Có test source cho MOCK; cần CI xanh trước release. |
| D-05 | Top 10 và Victory được xác minh trực quan trên điện thoại | Integration kiểm tra dữ liệu leaderboard/podium; không có kiểm chứng bố cục trên thiết bị hoặc screenshot. | Chưa đạt; Phase 5. |
| D-06 | Trophy không bị che | Chưa có visual regression hoặc ảnh xác minh. | Chưa đạt; Phase 5. |
| D-07 | Hạng/tên/điểm ngoài vùng HUD che đã hiệu chuẩn | Chưa có calibration profile theo thiết bị và bài kiểm tra pixel/ảnh. | Chưa đạt; Phase 5. |
| D-08 | Backup và crash recovery đã được thử | `packages/persistence/src/store.test.ts` tạo backup và mở DB backup; integration round thử phục hồi sau crash. Chưa có kiểm thử quy trình restore do operator thực hiện từ backup trong cài đặt sạch. | Một phần; hoàn tất backup/restore và crash rehearsal ở Phase 6. |
| D-09 | Có hướng dẫn triển khai | `README.md` có cài đặt/chạy và URL OBS; chưa thấy hướng dẫn triển khai/vận hành hoàn chỉnh gồm cài máy sạch, quyền truy cập, backup/restore, chẩn đoán và kết thúc an toàn. | Một phần; hoàn tất operator manual và kiểm thử máy sạch ở Phase 6. |

## 4. Cổng xác nhận trước phát hành

1. Lưu kết quả CI của unit, integration, load, typecheck và kiểm tra bảo mật tại commit phát hành; không suy luận trạng thái pass từ việc test file tồn tại.
2. Chạy load benchmark có ghi cấu hình, phiên bản, thời gian, concurrency, p50/p95/p99, kết quả accepted/rejected và event bị rơi; tách rõ MOCK khỏi connector thật.
3. Lưu screenshot theo từng scene, viewport/thiết bị, cấu hình HUD, bộ comment dày, font và kết quả kiểm tra safe-zone; bao gồm Top 10 và Victory.
4. Ghi biên bản 6 vòng MOCK liên tiếp, backup/restore, crash recovery, operator run không sửa code và hướng dẫn cài máy sạch.
5. Chỉ đánh dấu LIVE-ready khi có bằng chứng connector hoạt động trong môi trường được phép; nếu chưa có, ghi trạng thái là `NOT_TESTED` hoặc `BLOCKED`, không dùng kết quả MOCK thay thế.
