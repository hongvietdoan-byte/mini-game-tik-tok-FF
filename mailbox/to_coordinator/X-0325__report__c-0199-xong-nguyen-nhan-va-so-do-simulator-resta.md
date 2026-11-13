---
id: X-0325
from: codex1
to: coordinator
type: report
title: C-0199 xong — nguyên nhân và số đo simulator-restart
ref: C-0199
priority: high
needs: 
created: 2026-11-14T01:05:13+07:00
---
## Kết luận

Đây là nghẽn hiệu năng có từ trước C-0184, không phải lỗi logic của C-0196. Trên đúng commit trước C-0184 (`8d2ceb3`), test file-backed hoàn tất trong 94,51 giây với `maxWorkers=1` và `testTimeout=120000`; với mặc định 60 giây nó cũng sẽ timeout. Đổi vùng tạm sang `.tmp-test` làm kết quả chậm hơn thêm khoảng 19–21 giây trong các cặp đo cùng phiên máy, nhưng không phải chuyển ổ: trên máy này cả `.tmp-test` lẫn `os.tmpdir()` (`E:\temp\Temp`) đều ở ổ E:, NTFS. Giới hạn worker không loại bỏ được chậm trễ; tải máy làm kết quả dao động nhưng không phải nguyên nhân duy nhất.

| Đo file-backed | Vùng tạm | Giai đoạn 500 | Giai đoạn 2.000 | Toàn test |
|---|---|---:|---:|---:|
| Trước tối ưu, mẫu 1 | `.tmp-test` | 13,31s | 107,13s | 127,96s |
| Trước tối ưu, mẫu lặp | `.tmp-test` | 9,82s | 65,32s | 78,90s |
| Trước tối ưu, cùng bộ mã | `E:\temp\Temp` | 12,00s | 71,26s | 85,73s |
| Sau tối ưu, `maxWorkers=1` | `.tmp-test` | 9,17s | 55,82s | 70,48s |
| Sau tối ưu, `maxWorkers=1` | `E:\temp\Temp` | 5,28s | 42,90s | 50,87s |

Trên commit trước C-0184, test đơn lẻ đo được 94,51 giây (test body; tổng Vitest 96,21 giây). Các mẫu profile khác nhau đáng kể, nên bảng dùng để định vị nghẽn, không phải số benchmark ổn định giữa các máy.

## Nguyên nhân và thay đổi

- 2.000 bình luận tạo khoảng 2.431 giao dịch SQLite trong pha tải; đo được 56,21 giây ở `.tmp-test` và 44,37 giây ở `E:\temp\Temp`. I/O file-backed là phần chi phí chính.
- Trước sửa, mỗi đáp án nhận được lại chạy `COUNT(*)` toàn bộ người tham gia vòng. Chuyển sang lấy kết quả thêm người từ `roundPlayerJoin` và tăng bộ đếm cache theo kết quả đó; profile sau sửa chỉ còn 2 lần `participantCount` tổng cộng, khoảng 0,3 ms.
- Khi đủ 35 ghế, `AudienceManager` nối người mới trực tiếp vào queue nội bộ, không sao chép toàn bộ state cho từng người.
- Test này xác minh ID event qua STOP → START của MockSimulator trong cùng tiến trình/server và không kiểm tra độ bền SQLite qua đóng/mở Store. Chuyển riêng test này sang `:memory:` giữ nguyên vòng đời Store và kiểm tra đúng điều cần kiểm tra; kiểm tra persistence file vẫn nằm trong bộ Store tests. Test mới chạy phần 500+2.000 trong 599 ms. Không nâng timeout.

## Xác minh

- `corepack pnpm exec vitest run --project unit --project integration packages/persistence/src/store.test.ts packages/audience-engine/src/index.test.ts tests/integration/simulator-restart.test.ts --maxWorkers=1 --reporter=verbose` → 3 file, 28 test PASS; simulator-restart 599 ms, tổng 24,00 giây.
- `corepack pnpm exec tsc --noEmit -p tsconfig.json` → PASS.
- `git diff --check` → PASS.

Nhánh `codex1/c0199-sim-bench`, commit `536443c`, đã push và rebase trên `origin/main`.

Ghi chú vệ sinh: lần benchmark tại commit cũ tạo `E:\temp\Temp\quiz-it-Yx4uhC`. Lệnh xóa thư mục tạm đệ quy bị automatic review chặn; tôi không thử lách kiểm duyệt, nên thư mục benchmark còn lại ngoài repo.
