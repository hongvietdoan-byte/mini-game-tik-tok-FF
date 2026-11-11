# Bảng việc (chỉ coordinator sửa)

Cập nhật: 2026-11-11 — mục tiêu hiện tại: **Phase 0 + Phase 1** của `CLAUDE_MASTER_BUILD_PLAN_V2.md`. Không làm Phase 2+.
Trạng thái `main`: contracts / quiz-core / persistence / live-adapters đã viết, `corepack pnpm typecheck` sạch, **chưa có test nào**.

## Phân làn (không trùng file)

| Làn | Sở hữu file | Không được sửa |
|---|---|---|
| coordinator | `packages/contracts`, `packages/quiz-core/src/*.ts` (trừ `*.test.ts`), `packages/persistence/src` + migrations, `packages/live-adapters`, `apps/server`, `tests/integration`, `tests/load`, `scripts/simulate-round.ts`, `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/IMPLEMENTATION_BACKLOG.md`, `docs/reports/*`, `README.md`, file cấu hình gốc | — |
| codex1 | `fixtures/**`, `docs/review/**`, `packages/*/src/**/*.test.ts`, `scripts/privacy-check.mjs` (+ test), `.github/workflows/**`, nháp `docs/DATA_PRIVACY.md`, `docs/TEST_PLAN.md` | mọi file không phải test trong `packages/`, `apps/` |
| codex2 | `apps/overlay/**`, `apps/dashboard/**`, `playwright.config.ts`, `tests/e2e/**`, nháp `docs/GAME_RULES.md`, `docs/THEME_PACK_SPEC.md` | `packages/**`, `apps/server/**` |

## Đang làm / hàng chờ

| Thư | Làn | Việc | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| C-0001 | codex1 | Fixtures: ≥ 30 câu DEMO tiếng Việt + người chơi hư cấu | — | XONG, đã gộp (`aff786b`) |
| C-0010 | codex1 | Sửa câu Sahara/Tokyo, rà 36 câu | C-0001 | XONG, đã gộp |
| C-0002 | codex1 | Unit test `answers` / `scoring` / `selection` | — | XONG, đã gộp (+ sửa ZWJ `797799a`) |
| C-0003 | codex1 | Unit test reducer `engine.ts` (mọi nhánh) | — | XONG, đã gộp (36 test) |
| C-0004 | codex1 | Unit test `Store` (persistence) | C-0001 (dùng fixtures) | XONG, đã gộp (14 test) |
| C-0005 | codex1 | `scripts/privacy-check.mjs` + `.github/workflows/ci.yml` | — | CHỜ |
| C-0006 | codex2 | `apps/overlay` 1080×1920, 8 cảnh, chế độ mock, client WS | — | XONG, đã gộp |
| C-0013 | codex1 | Viết lại 36 câu DEMO chủ đề Free Fire + bảng đề xuất `docs/review/` | C-0003 | XONG, đã gộp — **chờ người dùng duyệt nội dung** |
| C-0012 | codex2 | ~~Sửa cảnh ĐỒNG HẠNG với 3 khối bục~~ | — | **HUỶ** — V3 cấm 3 khối bục; Victory làm lại khi có cúp/sân tách nền |
| C-0007 | codex2 | `apps/dashboard` tối thiểu (Live Control) | C-0006 | XONG, đã gộp |
| C-0016 | codex2 | Overlay/dashboard theo hợp đồng V3 | — | ĐANG LÀM |
| C-0018 | codex2 | Connection Test + Connection Manager + hướng dẫn OBS | C-0016, M2 | CHỜ |
| C-0008 | codex2 | Playwright smoke + ảnh chụp cảnh overlay (Edge) | C-0006 | CHỜ |
| — | coordinator | `apps/server`: SessionRuntime, routes, WS, recovery (`04aa4a4`) | — | XONG — 14 test tích hợp + 1 test tải xanh |
| — | coordinator | Test tích hợp 15 câu × 100 người, crash/restart, test tải | server | XONG (`tests/integration`, `tests/load`) |
| — | coordinator | Docs + báo cáo nghiệm thu Phase 0 / Phase 1 | tất cả | CHỜ |

## Việc dự phòng — DP1, DP2, DP4 ĐÃ XONG (đừng nhận lại); DP3 đang được codex2 cập nhật theo Kahoot (11/11). Hết việc → gửi `note` "rảnh" cho coordinator, KHÔNG tự nhận DP cũ.

- DP1 (codex1): nháp `docs/DATA_PRIVACY.md` — kiểm kê đầu vào (theo `docs/HANDOFF.md` mục "Kiểm kê đầu vào"), cột nào bị cấm, purge/export là backlog Phase 6.
- DP2 (codex1): nháp `docs/TEST_PLAN.md` — ánh xạ từng mục §13 đặc tả sang test cụ thể (đã có / sẽ có / Phase nào).
- DP3 (codex2): nháp `docs/GAME_RULES.md` — luật chấm điểm, chuỗi, hoà hạng, podium ĐỒNG HẠNG, void/skip, viết cho operator.
- DP4 (codex2): nháp `docs/THEME_PACK_SPEC.md` — manifest, token màu Storm Arena, luật không có JS trong pack, fallback (chỉ đặc tả, chưa code — Phase 2).

## Quyết định đã chốt (không hỏi lại, không làm ngược)

1. Chỉ chấp nhận comment **chính xác** `A|B|C|D` sau NFKC + trim + uppercase. `"đáp án A"`, `"AA"`, `"!A"` = không phải đáp án.
2. Cửa sổ nhận đáp án `[openAtMs, deadlineMs)` (end-exclusive). Đáp án đầu tiên thắng (`UNIQUE(question_instance_id, player_id)`).
3. **Tính điểm kiểu Kahoot** (người dùng chốt 11/11, `scoringMode: 'KAHOOT'` mặc định): câu đúng = round(1000 × (1 − (t/T)/2)) → 500–1000, t = giờ SERVER nhận − lúc mở câu; chuỗi đúng liên tiếp từ câu thứ 2: +100 × (n − 1), tối đa +500; sai/bỏ lỡ → 0 điểm và mất chuỗi; người vào giữa vòng bắt đầu 0; câu void không tính, không ảnh hưởng chuỗi. Chế độ cũ `CLASSIC` (100 + speedBonusMax + mốc 3/5/10) vẫn chọn được.
4. Xếp hạng: điểm ↓, số câu đúng ↓, hoà tuyệt đối **dùng chung hạng** (1,1,3); thứ tự hiển thị trong nhóm hoà theo `playerId`. Không bịa người khi < 10.
5. Podium: nhóm hoà vắt qua ngưỡng 3 → `tieAcrossCutoff=true`, UI hiển thị **ĐỒNG HẠNG**, không gán hạng khác nhau. Trái = hạng 2, giữa = hạng 1, phải = hạng 3.
6. Overlay công khai **không bao giờ** thấy đáp án đúng trước REVEAL; trong ACCEPTING chỉ thấy TỔNG số đáp án, phân bố A/B/C/D chỉ lúc REVEAL.
7. Khởi động lại tiến trình → `PAUSED` chờ operator (RESUME/VOID/STOP), không bao giờ tự chạy tiếp câu hỏi.
8. Mất kết nối nguồn comment khi đang ACCEPTING → `CONNECTION_INTERRUPTED`, có mạng lại cũng không tự chạy tiếp.
9. Câu hỏi DEMO chỉ dùng trong `mode=MOCK` + `allowDemoQuestions=true`, luôn hiện nhãn DEMO trên overlay.
10. Vùng an toàn 230/690/130 px chỉ là **preset thử nghiệm**, không phải số chính thức của TikTok; phải chỉnh được, có lớp hướng dẫn chỉ hiện khi xem trước.
11. Phase 1 overlay chỉ dùng **token màu** (`#2D387F #7049F5 #FFCC58 #E47E5F #D24470 #8CC8FB`) + font hệ thống hỗ trợ tiếng Việt. **Chưa dùng asset/ảnh đầu vào nào** (cúp, chibi, logo — Phase 5, cần xác nhận quyền).
12. Token admin không bao giờ nằm trong URL; server chỉ bind `127.0.0.1`.
13. **Câu hỏi: tool chỉ ĐỀ XUẤT; người dùng sửa, chọn, duyệt** (người dùng chốt 11/11). Người dùng sửa được cả câu hỏi, 4 đáp án và đáp án đúng. Không câu nào vào vòng công khai nếu người dùng chưa duyệt; sửa câu đã duyệt → phiên bản mới, quay về chờ duyệt. AI/fixtures không bao giờ tự đặt `APPROVED`. `fixtures/` chỉ là dữ liệu DEMO kiểm thử engine.
14. **Nội dung câu hỏi chỉ về Free Fire** (người dùng chốt 11/11) — kể cả bộ DEMO. Dữ kiện giải BVĐC (đội, tuyển thủ, lịch, kết quả) chỉ dùng khi người dùng duyệt nguồn.
15. **V3 là bản yêu cầu mới nhất** (`STORM_ARENA_CLAUDE_BUILD_SPEC_V3.md` + V3.1 cài đặt/kết nối). Audit: `docs/V3_AUDIT.md`. Người dùng duyệt 11/11:
    LEADERBOARD 4 s sau mỗi câu (BXH lớn mỗi 5 câu) · PREPARE **chỉ hiện câu hỏi**, mở nhận mới hiện 4 đáp án · giữ tên trạng thái/thông điệp V2 + thêm `seq` ·
    **ưu tiên: game chạy đúng + kết nối TikTok LIVE ổn định; KHÔNG đầu tư animation** (MC/khán giả dùng PNG tĩnh, chuyển động transform nhẹ) ·
    huỷ C-0012, chưa chốt ảnh baseline C-0008 · đóng gói Electron + NSIS · connector TikTok phải qua khảo sát khả thi, không dùng cách vượt cơ chế bảo vệ.
16. Victory: **không có 3 khối bục TOP 1/2/3**; giữ cúp + sân khấu gốc, 3 chibi đứng sàn phía trước (V3 §11).
17. **TikTok connector (người dùng chốt lại 11/11 chiều): dùng tạm thư viện cộng đồng `tiktok-live-connector` (GitHub zerodytrash/TikTok-Live-Connector) trong lúc vẫn chờ kênh chính thức.** Người dùng/đơn vị chấp nhận rủi ro điều khoản TikTok. Ràng buộc: chỉ đọc, `authenticateWs=false`, không gửi cookie/session, không `sendMessage`, `processInitialData=false` (không nạp bình luận cũ), khoá người chơi = `user.id` số, chống trùng theo `msgId`, adapter ghi nhãn KHÔNG CHÍNH THỨC; reconnect có backoff, không tự chạy tiếp câu hỏi. Khi TikTok có kênh chính thức → thay adapter.
18. **Cập nhật 11/11 đêm (thay phần đã cũ của #11, #15, #16 — theo rà soát C-0083):**
    - #11 hết hiệu lực: overlay ĐƯỢC dùng asset trong `assets-local/` (logo, chibi, MC, `victory/trophy-stage.png`, `victory/bg.jpg`).
    - #16 sửa theo ref người dùng gửi lại: vẫn không dựng 3 khối bục riêng, nhưng 3 chibi toàn thân đứng TRÊN mặt bục bát giác của `trophy-stage.png`, bảng tên dưới chân (C-0082).
    - #15 "không đầu tư animation" chỉ còn áp cho khán giả; MC được đổi động tác theo pha + có giọng (C-0078/C-0080).
19. **Cổng nghiệm thu hình (bắt buộc cho mọi việc UI):** thư giao việc chỉ nêu kết quả + đường dẫn file ref + asset phải dùng, KHÔNG tả cách dựng; report phải kèm ảnh ghép `ref | bản dựng` cho từng scene, chụp sau khi animation xong; coordinator tự chụp lại và người dùng duyệt ảnh TRƯỚC khi gộp main. E2E xanh không thay cho bước này.
20. **36 câu Free Fire: người dùng duyệt TOÀN BỘ (11/11 ~23:45)** với lý do "đang là bản test, không quan trọng". Coordinator đã bấm duyệt hộ qua API trên máy LIVE (`data/quiz.db`: 36 câu `APPROVED` + `OPERATOR_VERIFIED`). Đây là duyệt để chạy thử, CHƯA phải duyệt nội dung cho buổi thi 13–14/11 — hỏi lại người dùng trước ngày thi. `fixtures/` không đổi.
21. **Plan V4 là tài liệu điều phối mới nhất (12/11)** — `docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt`, chi tiết ở `docs/DECISIONS.md` D-19..D-22. Người dùng chốt: (a) GIỮ tính điểm Kahoot, không đổi engine; (b) DỪNG giọng MC sau mốc 2, làm P0 trước (preflight, backup, một đường chạy, tổng duyệt Mock — C-0092); (c) C-0079 Voice Settings hoãn; (d) cloud lập ma trận khoảng trống V4 (C-0093). Không ghi VISUAL_APPROVED/LIVE_VERIFIED khi người dùng chưa duyệt hình hoặc chưa có LIVE thật.
