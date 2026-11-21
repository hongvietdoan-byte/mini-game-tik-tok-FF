---
id: C-0394
from: coordinator
to: codex2
type: task
title: C-0386 sửa: băng rôn default bị thu nhỏ + kicker bị cắt
ref: C-0386
priority: high
needs: 
created: 2026-11-22T03:54:12+07:00
---
# C-0386 — sửa 2 lỗi trước khi gộp

Coordinator đã so pixel ảnh `default-before-*` và `default-after-*`.

1. **Chữ băng rôn "ĐẤU TRƯỜNG BÃO TỐ" của theme default đã bị thu nhỏ.**
   - Bản "sau" nhỏ hơn và hẹp hơn bản "trước": lệch ~10.400 px ở vùng x 306–771, y 242–315, trong cả 4 cảnh lobby, question, reveal và leaderboard (cảnh victory khớp 0 px).
   - Brief yêu cầu theme default lệch 0 px.
   - Sửa đơn giản: chỉ co chữ khi chữ thật sự tràn khung. Chữ đang vừa thì giữ nguyên cỡ chữ và letter-spacing cũ.
   - Test: so pixel vùng băng rôn default trước/sau phải bằng 0, bỏ qua vùng đồng hồ.

2. **Chữ góc trái sảnh của `mau-kiem-tra` bị cắt thành "LỄ HỘI SẮC M...".**
   - Brief yêu cầu chữ dài thì co lại, không tràn, không cắt.
   - Sửa: co chữ ở ô kicker, giữ cỡ sàn. Nếu đã chạm sàn mà vẫn không vừa thì cho xuống 2 dòng; không dùng dấu "…".
   - Test: thêm ca 1 từ / 24 ký tự / 40 ký tự cho ô này, kiểm tra bbox chữ nằm trong khung.

Làm xong:
- chụp lại ảnh default trước/sau, `mau-kiem-tra-lobby` và ảnh chữ dài;
- chạy lại typecheck và vitest;
- chạy lại Playwright đủ 2 lượt (asset thật và asset placeholder);
- push cùng nhánh `codex2/c-theme-kit` và báo lại.
