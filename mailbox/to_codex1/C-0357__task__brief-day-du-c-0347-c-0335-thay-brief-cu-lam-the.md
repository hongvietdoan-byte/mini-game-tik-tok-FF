---
id: C-0357
from: coordinator
to: codex1
type: task
title: Brief đầy đủ C-0347 + C-0335 (thay brief cũ), làm theo thứ tự
ref: C-0347
priority: high
needs: 
created: 2026-11-20T10:36:08+07:00
---
## Brief đầy đủ cho C-0347 rồi C-0335 (thay cho mọi brief cũ của 2 việc này)

Đọc hết thư này trước khi code. Làm đúng thứ tự: **C-0347 → C-0335 → C-0329 → C-0324 → C-0310**. Mỗi việc dùng một nhánh mới tách từ `origin/main` mới nhất. C-0333 đã nằm trên main (merge 1f563cee).

---
### Việc 1: C-0347, preflight kiểm đủ 4 ảnh cho mỗi nhân vật
**Nhánh:** `codex1/c-0347-character-assets`

**Hiện trạng:**
- `apps/server/src/main.ts` khoảng dòng 55 đọc `assets/chibi/manifest.json` → `characterPool` (danh sách id, ví dụ `chibi-004-alvaro`).
- `apps/server/src/preflight-assets.ts` có `preflightAssets(assetRoot, repositoryRoot)`, trả về `{status:'PASS'|'FAIL', reason}`.

**Yêu cầu:**
1. Thêm hàm thuần `checkCharacterAssets(assetRoot, ids)` → `{ missing: { id: string; files: string[] }[] }`. Mỗi `id` phải có đủ 4 file, đường dẫn tương đối theo assetRoot:
   - `chibi/<id>.png`
   - `throne/ngai-<id>.png`
   - `chibi/dang-top2-top3/top2/top2-<id>.png`
   - `chibi/dang-top2-top3/top3/top3-<id>.png`

   Chỉ kiểm file có tồn tại (`existsSync`), không đọc nội dung ảnh.
2. Gọi hàm này trong `preflightAssets`, với danh sách id lấy từ `chibi/manifest.json` của assetRoot:
   - Có id thiếu ảnh → `FAIL`, reason dạng `Thiếu ảnh nhân vật: chibi-004-alvaro (throne/ngai-chibi-004-alvaro.png, …); +N nhân vật khác` (liệt kê tối đa 5 id).
   - Không có manifest → giữ hành vi hiện tại.
   - Không dùng ảnh thay thế, không tự loại nhân vật thiếu ảnh ra khỏi kho.
3. Kiểm thực tế: máy hiện có 62 nhân vật trong `assets-local/chibi/` và cả 62 đều đủ 4 ảnh, nên preflight với asset thật phải PASS.
4. **Test vitest** (thư mục tạm sinh trong test, xoá sau khi chạy; không động tới `data/` hay `assets-local/`):
   - đủ 4 ảnh → PASS;
   - thiếu từng loại trong 4 loại → FAIL và nêu đúng file;
   - 7 id thiếu → reason chỉ liệt kê 5 id kèm "+2";
   - không có manifest → giữ hành vi cũ.
5. Cập nhật placeholder: nếu `fixtures/assets-placeholder/chibi/manifest.json` có id thiếu ảnh ngai/top2/top3, thêm PNG giữ chỗ ≤4 KB và thêm đường dẫn vào `PLACEHOLDER_IMAGE_PATHS` trong `scripts/privacy-check.mjs`, để E2E placeholder vẫn PASS preflight.

---
### Việc 2: C-0335, ưu tiên câu thuộc chủ đề sự kiện
**Nhánh:** `codex1/c-0335-priority-topic`. Có thể tiếp tục từ 34b074e3 nếu merge sạch với origin/main, nếu không thì làm lại từ main.

**Dữ liệu kho hiện tại** (câu APPROVED, theo tên subtopic):
| Chủ đề | EASY | MEDIUM | HARD |
|---|---|---|---|
| FFA 2026 | 0 | 20 | 13 |
| FFWS | 14 | 16 | 10 |
| Đấu Trường Bão Tố | 0 | 11 | 6 |
| Bá Vương Đại Chiến + bvdc-* | 14 | 33 | 17 |
| ff-* (kiến thức chung) | 14 | 11 | 5 |

Lưu ý: **FFWS và Đấu Trường Bão Tố là hai chủ đề KHÁC NHAU** (brief cũ ghi gộp "FFWS / Đấu Trường Bão Tố" là sai).

**Cấu hình:** thêm vào GameConfig ở `packages/contracts/src/index.ts`, cạnh `questionSelectionMode` (khoảng dòng 533), và vào danh sách field sửa được (khoảng dòng 599/604):
- `priorityTopicNames: z.array(z.string().min(1).max(60)).max(10).default(['FFA 2026','FFWS','Đấu Trường Bão Tố'])`
- `priorityShare: z.number().min(0).max(1).default(0.6)`

So khớp theo `subtopics.name`, không phân biệt hoa thường, bỏ khoảng trắng hai đầu. Tên không có trong kho thì bỏ qua, không báo lỗi. Đổi cấu hình phải có hiệu lực từ vòng sau mà không cần khởi động lại server.

**Thuật toán** `packages/quiz-core/src/selection.ts` (`selectRound`, áp dụng cho cả RANDOM và DIFFICULTY):
1. Giữ nguyên kế hoạch số câu theo độ khó (`planDifficultyCounts`), seed tất định, quy tắc không lặp câu trong phiên và thứ tự EASY → MEDIUM → HARD.
2. Tổng số câu ưu tiên mục tiêu `P = round(priorityShare × count)`. Chia P cho từng mức độ khó theo tỉ lệ số câu của mức đó; phần dư dồn cho mức nào có nhiều câu ưu tiên chưa dùng nhất.
3. Trong mỗi mức: lấy câu ưu tiên **chưa dùng** trước, tới đủ chỉ tiêu; phần còn lại lấy câu thường chưa dùng.
   - Thiếu câu ưu tiên ở một mức thì chuyển phần thiếu sang mức khác còn câu ưu tiên. Ví dụ EASY không có câu FFA hay ĐTBT, nhưng FFWS có 14 câu EASY.
   - Hết cách thì bù bằng câu thường.
   - Thiếu câu thường thì bù bằng câu ưu tiên.
   - Chỉ dùng lại câu đã dùng khi cả hai nhóm đều hết câu chưa dùng.
4. Trong mỗi mức độ khó, xáo trộn câu ưu tiên lẫn câu thường theo seed, không để câu ưu tiên dồn cục ở đầu hay cuối.
5. Mỗi vòng ghi diagnostics/log `ưu tiên X/Y (FFA 2026: a, FFWS: b, Đấu Trường Bão Tố: c)`, và đưa thông tin này vào kết quả preflight hoặc nhật ký vòng hiện có.

**Dashboard (UI tối thiểu):**
- Trong trang Ngân hàng câu hỏi (`apps/dashboard/src/QuestionReviewPage.tsx`), thêm một thẻ "Chủ đề ưu tiên" đặt trên bộ lọc.
- Thẻ có:
  - danh sách checkbox các chủ đề đang có trong kho, kèm số câu APPROVED của từng chủ đề;
  - ô số "Tỉ lệ ưu tiên (%)" từ 0 đến 100, bước 5;
  - nút "Lưu".
- Chữ 16 px, khoảng cách giữa các dòng ≥8 px, không thêm màu mới (dùng token hiện có).
- Lưu bằng API cấu hình hiện có, có admin token.

**Test vitest:**
1. Kho đủ câu: tỉ lệ ra đúng P.
2. Thiếu câu ưu tiên ở EASY: chuyển sang mức khác đúng như mục 3.
3. Thiếu câu thường.
4. `priorityShare=0` hoặc danh sách rỗng: kết quả **giống hệt** bản cũ với cùng seed (snapshot).
5. Tên chủ đề không tồn tại.
6. Tất định theo seed.
7. Không lặp câu trong phiên.

Dùng kho giả lập, mô phỏng theo bảng số lượng ở trên.

---
### Kiểm tra bắt buộc cho MỖI việc (báo số liệu cụ thể)
1. `corepack pnpm -s typecheck`
2. `corepack pnpm -s privacy:check`
3. `corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=2` → báo số test passed/failed.
4. Chạy **toàn bộ** `corepack pnpm exec playwright test`, hai lượt:
   - asset thật (mặc định);
   - `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`.

   Đặt cổng riêng, ví dụ `PLAYWRIGHT_SERVER_PORT=18961 PLAYWRIGHT_OVERLAY_PORT=15361`. Báo passed/failed của từng lượt. Test cũ hỏng thì sửa theo hành vi mới; nếu là lỗi thật thì sửa code.
5. Merge `origin/main` mới nhất vào nhánh ngay trước khi báo.

Không commit ảnh chụp, xlsx hay bất kỳ thứ gì trong `assets-local`/`data`. Ảnh duyệt (nếu có) để ở `test-results/`. Không động tới `data/quiz.db`.

Báo cáo gồm: tên nhánh, commit, kết quả 5 mục kiểm tra ở trên. Dashboard có thay đổi thì kèm ảnh chụp cục bộ của thẻ "Chủ đề ưu tiên". Xong việc nào báo ngay việc đó rồi làm tiếp việc sau, không chờ.
