---
id: C-0361
from: coordinator
to: codex1
type: task
title: C-0347 chưa gộp: test preselection hỏng khi có preflight 4 ảnh
ref: C-0347
priority: high
needs: 
created: 2026-11-20T13:20:48+07:00
---
## C-0347: chưa gộp — test preselection hỏng khi có C-0347

**Bằng chứng** (coordinator chạy `corepack pnpm exec vitest run tests/integration/mc-voice-preselection.test.ts`):
- Trên `origin/main` (e92b2890 và bd5fa1da): 11/11 đạt, chạy 2 lần.
- Trên `origin/codex1/c-0347-character-assets` (1892b028) chạy riêng: lần 1 đạt 11/11, lần 2 có 1 ca FAIL.
- Trên main gộp với C-0347: FAIL **3/3 lần**.
- Ca hỏng: `MC Voice lựa chọn trước trong LOBBY > Auto mode cũng chờ bundle câu 1 trước khi chuyển khỏi LOBBY`. Auto mode vẫn ở LOBBY, không chuyển sang PREPARE.

**Giả thuyết cần kiểm:** test này dùng thư mục asset tạm hoặc fixtures không có ảnh `throne/`, `top2`, `top3`. Khi đó preflight mới trả FAIL, Auto mode từ chối bắt đầu vòng ("auto mode gặp preflight FAIL thì không bắt đầu vòng"). Cũng có thể là 248 lệnh `existsSync` mỗi lần preflight làm chậm, khiến test hết thời gian chờ.

**Yêu cầu:**
1. Tìm đúng nguyên nhân và ghi lại trong báo cáo.
2. Nếu do asset test thiếu: bổ sung đủ 4 ảnh cho mọi id trong manifest test. Dùng PNG placeholder ≤4 KB và thêm vào `PLACEHOLDER_IMAGE_PATHS` nếu là file được track. Không nới preflight.
3. Nếu do tốc độ: cache kết quả kiểm ảnh theo (assetRoot, mtime của manifest), chỉ kiểm lại khi manifest đổi, hoặc kiểm một lần lúc khởi động server. Không tăng timeout của test.
4. Nhánh đã merge `origin/main` mới nhất (`bd5fa1da`, đã có C-0290 4b). Chạy file trên **10 lần liền**, cả 10 lần phải đạt 11/11. Báo kèm lệnh vòng lặp và kết quả.
5. Chạy đủ: typecheck, privacy:check, unit + integration, toàn bộ playwright hai lượt (asset thật và placeholder). Báo passed/failed của từng lượt.

Làm ngay việc này, xen trước C-0335 (C-0335 tạm dừng, giữ nguyên nhánh). Xong thì làm tiếp C-0335.

Ghi chú thêm: E2E placeholder có ca `tests/e2e/dashboard.test.ts:212 Setup Wizard giữ trạng thái Overlay PASS khi tiếp tục` thỉnh thoảng hỏng, kéo theo 17 ca "did not run"; chạy riêng thì đạt 18/18. Gộp ca này vào C-0360, cùng chứng minh bằng 10 lần chạy liền.
