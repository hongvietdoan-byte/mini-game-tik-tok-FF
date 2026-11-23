---
id: C-0407
from: coordinator
to: codex2
type: task
title: C-0404 bổ sung: tool theme chụp nhầm bố cục cũ không ngai — chuyển mọi mock sang bố cục có ngai, bỏ ngoại lệ K43
ref: C-0404
priority: high
needs: 
created: 2026-11-23T13:29:46+07:00
---
# C-0404 bổ sung QUAN TRỌNG: công cụ theme đang chụp nhầm bố cục cũ (không có ngai)

Người dùng phát hiện: bản live hiện nay là **bố cục có ngai vàng** (`.v3-stage--has-throne`). Ở bố cục này bong bóng MC nhỏ, nằm góc trên phải (CSS `arena.css:2430`, 262×146), không che nhãn hàng chờ.

Lỗi K43 bị che chỉ xảy ra vì mock `lobby-queue` của tool KHÔNG có ngai. Vì vậy overlay vẽ bố cục cũ: 35 ghế, bong bóng to giữa màn, MC to.

Soát lại thì `SO-DO.png` (LOBBY, QUESTION) và phần lớn ảnh `soi/` cũng đang là bố cục cũ. Chỉ `throne-locked` và `top3-throne-held-short-reveal` là có ngai. Bộ theme phải mô tả đúng màn hình live.

## Việc cần làm
1. **Mọi mock dùng để chụp** (SO-DO, soi, default.png, kiểm phủ pixel, kiểm "phần tử hiện") phải có `throne` trong snapshot, đúng như live V5.
   - Sảnh: ngai LOCKED hoặc OPEN.
   - Từ câu 5 trở đi: ngai HELD.
   - Sảnh 30 ghế như live.
   - Bỏ dùng mock không ngai.
   - Nếu thật sự cần giữ bố cục cũ thì chỉ để làm dự phòng, không đưa vào SO-DO/soi.
2. **Bỏ ngoại lệ K43** (ẩn `.v3-mc`) vừa duyệt ở C-0406. Chụp K43 trên mock sảnh có ngai + có người chờ (`queued > 0`). Chạy kiểm so pixel:
   - Đạt thì xong.
   - Vẫn bị che thì report kèm ảnh màn có ngai, KHÔNG tự sửa layout.
3. Chạy lại toàn bộ kiểm "phần tử hiện" (so pixel) trên bố cục có ngai. Các slot chỉ có ở bố cục cũ thì liệt kê riêng trong report.
4. **Thêm test e2e** (file overlay e2e): sảnh có ngai, đủ 30 ghế, `queued > 0` → `.v3-queue` phải nhìn thấy được. Kiểm bằng `elementFromPoint` lưới 3×3 ≥ 5/9 hoặc so pixel, không chỉ `toBeVisible`.

## Kiểm tra trước khi báo
- Như brief C-0404: export + map + validate PASS, vitest đủ, typecheck, Playwright asset thật 2 lượt liên tiếp 0 failed.
- Gửi đường dẫn `SO-DO.png`, `soi/K43.png`, `soi/I16.png`, `default-contact.png`, và tự phóng to xác nhận đúng bố cục có ngai.
- Không commit ảnh review. Push `codex2/c-theme-goc`, báo hash.
