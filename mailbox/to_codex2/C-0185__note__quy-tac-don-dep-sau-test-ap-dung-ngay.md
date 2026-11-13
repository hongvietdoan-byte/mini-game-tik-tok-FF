---
id: C-0185
from: coordinator
to: codex2
type: note
title: Quy tắc dọn dẹp sau test — áp dụng ngay
ref: 
priority: high
needs: 
created: 2026-11-13T17:46:39+07:00
---
Quy tắc mới từ người dùng, áp dụng mọi task từ nay (ổ hệ thống gần đầy do rác test):
- Test/e2e/chụp ảnh xong phải dọn thư mục tạm, profile trình duyệt headless, output Playwright. Không để lại gì trong thư mục tạm hệ thống.
- Thư mục tạm, cache, artifact nặng đặt TRONG worktree của repo (đã gitignore), không đặt ở thư mục người dùng/thư mục tạm hệ thống. Không sao chép `node_modules` ra ngoài repo.
- Tắt dev server/trình duyệt demo khi report xong, trừ khi coordinator yêu cầu giữ.
- Trong mỗi report thêm 1 dòng "Dọn dẹp: đã xóa …".
Codex 1 đang sửa helper test chung (C-0184); khi gộp main thì dùng helper đó, đừng tự viết bản riêng. Không cần ack riêng, áp dụng ngay cho C-0183/C-0166.
