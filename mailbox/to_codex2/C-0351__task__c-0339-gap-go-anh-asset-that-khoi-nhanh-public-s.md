---
id: C-0351
from: coordinator
to: codex2
type: task
title: C-0339 gấp: gỡ ảnh asset thật khỏi nhánh public + sửa 2 lỗi nhỏ
ref: C-0339
priority: high
needs: 
created: 2026-11-20T02:17:36+07:00
---
## C-0339: GẤP — gỡ ảnh chụp chứa asset thật khỏi nhánh public, rồi sửa 2 lỗi nhỏ

### 1. Quyền riêng tư (làm trước tiên)
Commit `34e5fa2a` và `47d665f2` trên `codex2/c-0339-throne-ui` có 41 PNG trong `tests/e2e/__screenshots__/c0339-review/`, mỗi file 0,3–2,6 MB. Các ảnh này chụp bằng asset thật của người dùng (nền, logo, chibi, ngai, MC). Repo là PUBLIC, nên tuyệt đối không được commit những ảnh này. privacy:check không bắt được vì `isAllowedImagePath` đang cho qua toàn bộ `tests/e2e/__screenshots__/`.

Cần làm:
1. Tạo nhánh mới `codex2/c-0339-throne-ui-v2` từ `origin/main`, đưa toàn bộ thay đổi code, test và placeholder ≤4 KB của C-0339 vào. **Không** đưa bất kỳ file nào dưới `tests/e2e/__screenshots__/`.
2. Kiểm tra `git log origin/main..HEAD --stat` không còn ảnh lớn, push nhánh v2, rồi xoá nhánh cũ trên remote: `git push origin --delete codex2/c-0339-throne-ui`.
3. Sửa `scripts/privacy-check.mjs`: bỏ ngoại lệ `tests/e2e/__screenshots__/`. Ảnh trong thư mục này chỉ được qua nếu nằm trong `PLACEHOLDER_IMAGE_PATHS` hoặc nhỏ hơn 4 KB. Thêm test trong `privacy-check.test.ts` để chứng minh ảnh 1 MB ở `tests/e2e/__screenshots__/x.png` bị chặn.
4. Ảnh duyệt từ nay ghi ra thư mục bị ignore, ví dụ `test-results/` hoặc `assets-local/review/c0339/`. Báo đường dẫn tuyệt đối trên máy, không commit.

### 2. Duyệt hình — gần đạt, còn 2 lỗi
Bố cục B ở màn câu hỏi đã khớp ảnh mẫu: ngai, bóng MC, nhãn NGAI VÀNG + tên + điểm, 30 ghế. Victory không còn bị cắt bảng tên. Còn lại:

- **Victory, bảng tên Top (cả ca đồng hạng):** chữ "ĐỒNG HẠNG" đè lên viền vàng dưới của bảng. Cần chữ cách mép trong viền ≥8 px; nới chiều cao bảng hoặc dời chữ lên. Badge `x3` dính sát chữ "PTS": cần khoảng cách ≥8 px, hoặc đưa badge lên góc phải trên của bảng.
- **Màn câu hỏi:** đáy bóng MC (khoảng y 990) cách dòng "NGAI VÀNG" (khoảng y 1010) chỉ khoảng 20 px, chưa đạt quy tắc 11 (≥24 px). Dời khối NGAI VÀNG xuống, hoặc giảm chiều cao bóng MC, để có ≥24 px. Thêm assert bbox cho khoảng này trong `c0339-throne-ui.spec.ts`.

Sau khi sửa: chạy typecheck, privacy:check, spec c0339 với cả asset thật và placeholder. Báo cáo kèm đường dẫn ảnh cục bộ 1080×1920 của các cảnh question-held, victory-tie và victory thường.
