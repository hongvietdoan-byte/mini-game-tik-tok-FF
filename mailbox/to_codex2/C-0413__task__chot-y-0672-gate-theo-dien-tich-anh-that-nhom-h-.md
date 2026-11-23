---
id: C-0413
from: coordinator
to: codex2
type: task
title: Chốt Y-0672: gate theo diện tích ảnh thật; nhóm H soi riêng, chỉ báo cáo
ref: Y-0672
priority: high
needs: 
created: 2026-11-23T19:45:05+07:00
---
Trả lời Y-0672. Không giữ nhánh; đổi gate như sau rồi giao hàng.

1. K/I/N/V/L (gate cứng, vẫn FAIL được):
   - Ngưỡng 10% bbox sai với khung viền mỏng (K18 là khung 9-slice 523×149, phần có màu chỉ là viền ≈ 4–5% bbox).
   - Gate mới: `expected` = số pixel alpha > 0 của chính ảnh slot khi vẽ ở kích thước hiển thị (scale ảnh default.png về rộng×cao vị trí, đếm alpha > 0). ĐẠT khi số pixel đổi (bình thường so với visibility:hidden) ≥ 50% `expected`. Giữ luật ≥ 4 px cho bbox < 100 px².
   - Nếu `expected` = 0 (ảnh trong suốt hoàn toàn, ví dụ skin default cố ý trống) → ghi "TRONG_SUOT_CO_Y" trong report, không FAIL.
   - K18 tính lại theo gate mới; nếu vẫn FAIL thì báo kèm ảnh soi.

2. Nhóm H (hiệu ứng chạy theo thời gian, alpha thấp, bay ra ngoài khung) → CHỈ BÁO CÁO, không chặn:
   - H04 pháo giấy, H06 hạt sáng xuất phát ngoài màn (y −22, y 1935) nên ảnh chụp tĩnh không bắt được; H07/H08/H10 là lớp sáng/loé alpha thấp.
   - Kiểm chức năng (cứng): ở đúng màn, phần tử có trong DOM và CSS computed trỏ tới đúng file asset của slot (background-image/src). Sai thì FAIL.
   - `soi/Hxx.png`: vẽ chính ảnh asset trên nền tối (phóng to nếu < 64 px) + 1 ảnh màn có khung đỏ đánh dấu vùng hiệu ứng chạy. Không cần bắt đúng keyframe.
   - `CAN-CHUAN-BI.md` mục H: ghi rõ "hiệu ứng động, xem ảnh asset riêng; kiểm thật bằng chạy thử overlay".

3. INTERIM_TOP10 áp assert ngai chỉ cho LOBBY/QUESTION/REVEAL: đồng ý.

4. Ghi report: bảng slot → expected / changed / kết quả; liệt kê H báo cáo-only.

Sau đó hoàn tất C-0410/C-0411/C-0412: typecheck, privacy, vitest đủ, export + map + validate, Playwright asset thật 2 lượt 0 failed + placeholder 1 lượt; commit + push `codex2/c-theme-goc`; gửi report kèm đường dẫn gói.
