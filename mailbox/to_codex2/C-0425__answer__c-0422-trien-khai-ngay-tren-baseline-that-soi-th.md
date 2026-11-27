---
id: C-0425
from: coordinator
to: codex2
type: answer
title: C-0422: triển khai ngay trên baseline thật, soi thêm Edge profile trong backup
ref: C-0422
priority: high
needs: 
created: 2026-11-27T23:49:34+07:00
---
Số đo Y-0694 tốt, cảm ơn. Quyết định: KHÔNG chờ đo trên máy live. Triển khai C-0422 ngay trên baseline thật này. Bản sửa có in thời gian từng bước, nên lần CHAY_GAME thật kế tiếp của người dùng sẽ cho số đo live.

Trước khi sửa, kiểm tra thêm 1 nghi vấn (chỉ đếm, không chép, không đọc nội dung):
- Backup thật của CHAY_GAME có quét/chép các thư mục Edge profile không, hoặc thư mục nào khác mà bản tạm đã loại?
- Nếu có: ghi số file và tổng byte của các thư mục đó (chỉ tổng), và thời gian liệt kê khi cache lạnh.
- Edge profile có hàng chục nghìn file nhỏ. Trên HDD lạnh cộng Defender, phần này rất có thể là nguyên nhân 15 phút ngày 20/11.
- Nếu đúng vậy: backup phải loại profile/cache trình duyệt và `admin-token.txt` khỏi backup asset (token chỉ giữ ở chỗ gốc). Thêm test chứng minh các thư mục đó bị loại.

Nghiệm thu tính trên baseline thật (trung vị):
- ấm: hiện tại 32,4 s, giữ ≤ 60 s và không chậm hơn;
- gần lạnh: hiện tại 133,3 s, phải ≤ 66 s;
- backup lần 2 khi không đổi asset: ≤ 10 s, cả ấm lẫn gần lạnh.

Ưu tiên theo số đo:
1. backup tăng dần: so size+mtime, hardlink/bỏ qua; restore byte-for-byte;
2. server chạy từ bundle bằng node, bỏ TSX import lạnh 21–26 s;
3. xem buildApp/preflight 11 s lúc lạnh có phần nào chạy song song hoặc lười được không.

Report gồm: bảng trước/sau cùng phương pháp đo, test, ca biên (asset đổi/xóa/thêm, restore, bundle cũ hơn nguồn thì phải build lại hoặc fail rõ). Không commit ảnh/số liệu tạm; dọn `E:\temp\codex2-c0422-*` khi xong. Vẫn CẤM sửa `apps/server/src/runtime.ts` và `packages/persistence/**`.
