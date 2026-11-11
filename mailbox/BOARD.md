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
| C-0013 | codex1 | Viết lại 36 câu DEMO chủ đề Free Fire + bảng đề xuất `docs/review/` | C-0003 | CHỜ |
| C-0012 | codex2 | Sửa cảnh ĐỒNG HẠNG (mock + chân bục theo rank) | C-0006 | CHỜ (sau C-0007) |
| C-0007 | codex2 | `apps/dashboard` tối thiểu (Live Control) | C-0006 (dùng chung khung Vite) | CHỜ |
| C-0008 | codex2 | Playwright smoke + ảnh chụp cảnh overlay (Edge) | C-0006 | CHỜ |
| — | coordinator | `apps/server`: SessionRuntime, routes, WS, recovery (`04aa4a4`) | — | XONG — 14 test tích hợp + 1 test tải xanh |
| — | coordinator | Test tích hợp 15 câu × 100 người, crash/restart, test tải | server | XONG (`tests/integration`, `tests/load`) |
| — | coordinator | Docs + báo cáo nghiệm thu Phase 0 / Phase 1 | tất cả | CHỜ |

## Việc dự phòng (hết việc chính thì tự nhận, gửi `ack` trước)

- DP1 (codex1): nháp `docs/DATA_PRIVACY.md` — kiểm kê đầu vào (theo `docs/HANDOFF.md` mục "Kiểm kê đầu vào"), cột nào bị cấm, purge/export là backlog Phase 6.
- DP2 (codex1): nháp `docs/TEST_PLAN.md` — ánh xạ từng mục §13 đặc tả sang test cụ thể (đã có / sẽ có / Phase nào).
- DP3 (codex2): nháp `docs/GAME_RULES.md` — luật chấm điểm, chuỗi, hoà hạng, podium ĐỒNG HẠNG, void/skip, viết cho operator.
- DP4 (codex2): nháp `docs/THEME_PACK_SPEC.md` — manifest, token màu Storm Arena, luật không có JS trong pack, fallback (chỉ đặc tả, chưa code — Phase 2).

## Quyết định đã chốt (không hỏi lại, không làm ngược)

1. Chỉ chấp nhận comment **chính xác** `A|B|C|D` sau NFKC + trim + uppercase. `"đáp án A"`, `"AA"`, `"!A"` = không phải đáp án.
2. Cửa sổ nhận đáp án `[openAtMs, deadlineMs)` (end-exclusive). Đáp án đầu tiên thắng (`UNIQUE(question_instance_id, player_id)`).
3. Đúng +100; chuỗi 3/5/10 thưởng +30/+50/+100 tại câu đạt mốc; sai/bỏ lỡ → chuỗi về 0; người vào giữa vòng bắt đầu 0; câu void không tính và không ảnh hưởng chuỗi. Không thưởng tốc độ.
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
