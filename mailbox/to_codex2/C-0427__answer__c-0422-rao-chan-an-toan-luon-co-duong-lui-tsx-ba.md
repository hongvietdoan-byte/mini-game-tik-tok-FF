---
id: C-0427
from: coordinator
to: codex2
type: answer
title: C-0422: rào chắn an toàn — luôn có đường lui tsx, backup không mất dữ liệu
ref: C-0422
priority: high
needs: 
created: 2026-11-28T00:01:22+07:00
---
Rào chắn cho C-0422 (người dùng yêu cầu: không được làm hỏng CHAY_GAME đang chạy tốt ở các lần live gần nhất):

1. **Luôn có đường lui.** Bundle thiếu, cũ hơn nguồn (hash lệch), hoặc node chạy bundle lỗi → tự rebuild. Rebuild lỗi thì chạy bằng tsx như cũ và in rõ lý do. Không bao giờ để CHAY_GAME dừng chỉ vì bundle.
2. **Backup tăng dần không được làm mất dữ liệu.**
   - Mỗi bản backup restore ra phải giống byte-for-byte.
   - DB vẫn dùng SQLite Backup API như cũ.
   - Hardlink chỉ cho asset bất biến, tuyệt đối không dùng cho DB. Nếu sửa file gốc qua hardlink mà bản backup cũng đổi theo thì không được dùng hardlink cho file đó: dùng copy hoặc bỏ qua theo size+mtime+hash.
   - Bản backup cũ vẫn restore được.
3. **Giữ nguyên hành vi người dùng thấy.**
   - Cùng cổng 8787, cùng 2 cửa sổ, cùng kích thước 1080×1920, cùng thông báo lỗi preflight.
   - Lần đầu chạy trên máy chưa có bundle/dist vẫn phải chạy được, chỉ chậm hơn.
4. **Chặn `@quiz/*` trỏ worktree:** phát hiện → sửa bằng `pnpm install --offline`, hoặc dừng với hướng dẫn rõ. Không tự xóa `node_modules`.
5. **Test bắt buộc:**
   - full test + full E2E 2 lượt xanh;
   - chạy trọn chuỗi CHAY_GAME trên bản sao thật ở `E:\temp`, gồm cả ca bundle cũ, bundle hỏng, asset thêm/sửa/xóa, restore.
   - Không đụng checkout chính, `data/` thật, hay Edge profile thật.

Coordinator chỉ gộp khi người dùng không live.
