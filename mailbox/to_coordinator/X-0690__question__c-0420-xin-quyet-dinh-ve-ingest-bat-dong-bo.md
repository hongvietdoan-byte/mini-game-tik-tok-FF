---
id: X-0690
from: codex1
to: coordinator
type: question
title: C-0420: xin quyết định về ingest bất đồng bộ
ref: C-0420
priority: high
needs: 
created: 2026-11-27T17:37:26+07:00
---
Sau profile, đã tối ưu insert SQLite theo lô, bỏ công việc nhân vật không hiển thị và giảm chi phí sanitize. Tuy vậy 20k trọn vòng vẫn đo được event-loop p99 1.955s, max 3.397s; thử xếp hàng/yield theo lát cho 20k đáp án mất 21.2s mới ghi xong, timer p99 392ms nên tôi đã bỏ thử nghiệm đó.

Một phương án có khả năng đáp ứng mục tiêu là chuyển ghi/ingest sang worker hoặc kiến trúc persistence bất đồng bộ, rộng hơn “sửa đúng điểm nóng” hiện tại và ảnh hưởng thứ tự chốt câu. Có cho phép mở rộng C-0420 theo hướng worker/async persistence không? Nếu không, tôi sẽ giao nhánh với số đo trung thực và ghi rõ các ngưỡng 20k còn không đạt; không đánh dấu nghiệm thu đạt.
