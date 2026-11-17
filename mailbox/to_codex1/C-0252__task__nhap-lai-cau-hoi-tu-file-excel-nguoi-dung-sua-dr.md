---
id: C-0252
from: coordinator
to: codex1
type: task
title: Nhập lại câu hỏi từ file Excel người dùng sửa (dry-run + apply)
ref: 
priority: normal
needs: 
created: 2026-11-17T16:38:09+07:00
---
## Bối cảnh
Người dùng đang sửa song song toàn bộ 139 câu hỏi trong file Excel do coordinator xuất. File nằm ở máy: `assets-local/review/1117-cau-hoi/ngan-hang-cau-hoi-1117.xlsx`, bị ignore, **không commit**. Khi người dùng gửi lại file đã sửa, cần nhập vào DB một cách an toàn.

Cấu trúc sheet `Cau hoi` (hàng 1 là tiêu đề):
- A: ID (không sửa)
- B: Chủ đề (tên subtopic)
- C: Độ khó EASY/MEDIUM/HARD
- D: Câu hỏi
- E: `=LEN(D)`
- F–I: Phương án 1–4
- J: Đáp án đúng (1–4)
- K: Giải thích
- L: Hành động Giữ/Sửa/Xoá/Thêm
- M: Ghi chú

Ngoài 139 câu có thêm 20 dòng trống cho câu mới; câu mới để trống ID và L = Thêm. Thứ tự phương án trong file khớp `options_json` hiện tại (o1..o4 theo thứ tự).

## Yêu cầu (C-0252)
1. Lệnh `pnpm questions:import-xlsx <file> [--apply]`:
   - **Mặc định chỉ chạy thử (dry-run).** In báo cáo tiếng Việt và ghi file báo cáo `.md` cạnh file xlsx, gồm:
     - số câu Giữ, Sửa, Xoá, Thêm;
     - với câu Sửa: hiện trước/sau của từng trường thay đổi;
     - lỗi theo từng dòng: thiếu phương án, đáp án ngoài 1–4, phương án trùng nhau, câu quá dài theo ngưỡng question-length hiện có, chủ đề không tồn tại, ID không có trong DB, L = Sửa mà không đổi gì (chỉ cảnh báo).
   - Có dòng lỗi thì không cho `--apply`.
2. `--apply` chạy trong một transaction:
   - **Sửa:** tạo phiên bản mới (`question_versions`, tăng `version`), giữ nguyên ID.
   - **Xoá:** không xoá cứng. Chuyển sang trạng thái không dùng (ví dụ `approval_status` = RETIRED/ARCHIVED theo enum đang có), để vòng cũ và replay vẫn đọc được.
   - **Thêm:** tạo câu mới trong pack và subtopic tương ứng.
   - Câu Sửa và Thêm vào trạng thái **chờ duyệt** theo enum hiện có. Người dùng sẽ duyệt trên tab Câu hỏi của Dashboard; nếu tab đó chưa duyệt hàng loạt được thì báo trong report.
   - Sao lưu DB trước khi ghi, theo cơ chế backup đang có.
3. Test với fixture xlsx tổng hợp: không dùng câu thật hay file của người dùng; nếu cần thì tạo fixture bằng code trong test.
4. Thêm một mục ngắn trong docs vận hành.

## Ràng buộc
- Lane codex1 (server, persistence, tools). Không đụng overlay hay dashboard.
- Không đọc hay commit file xlsx của người dùng.
- typecheck, test, privacy phải xanh. Nhánh `codex1/c-question-xlsx-import`, push rồi gửi report kèm hash. Dọn `.tmp-test`.
