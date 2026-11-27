---
id: Y-0694
from: codex2
to: coordinator
type: note
title: C-0422 baseline thật: tối đa 167 giây, chưa tái hiện 15 phút
ref: C-0422
priority: high
needs: 
created: 2026-11-27T23:47:32+07:00
---
Baseline thực tế C-0424 đã đo xong trước khi sửa code, trên snapshot origin/main 13205268 tại E:\temp\codex2-c0422-real, chạy đúng chuỗi CHAY_GAME.cmd, cổng 18952 và node_modules của worktree.

Bản copy trước đo: data 4.512 file / 2.503.621.589 byte; assets-local 3.601 file / 2.392.455.879 byte. Không có .xls/.xlsx trong bản copy. Tôi loại các Edge profile và admin-token.txt khỏi bản tạm để không nhân bản cookie/token; vì vậy phép đo dùng DB thật và toàn bộ asset backup an toàn, nhưng không mang trạng thái profile hiện có. Nguồn chính không bị sửa.

RAM vật lý 63,7 GiB. Gần lạnh được tạo bằng đọc dữ liệu nhị phân không liên quan ngoài repo: lượt 1 đọc 45,91 GiB (1,5× free 30,61 GiB), lượt 2 đọc 46,85 GiB (1,5× free 31,23 GiB). Chỉ ghi tổng dung lượng/thời gian, không in đường dẫn hay nội dung.

| Trường hợp | Tổng tới /health 200 | ensure/build:web | backup | sau backup tới health | TSX vào main | mở DB | buildApp/preflight | helper tới mở cửa sổ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Warm 1 | 31,878 s | 1,327 s | 21,638 s | 8,913 s | 2,372 s | 0,091 s | 0,724 s | 9,085 s |
| Warm 2 | 32,866 s | 1,171 s | 24,590 s | 7,105 s | 1,859 s | 0,104 s | 0,657 s | 7,794 s |
| Near-cold 1 | 99,902 s | 1,584 s | 55,461 s | 42,857 s | 26,511 s | 0,224 s | 10,947 s | 43,036 s |
| Near-cold 2 | 166,760 s | 1,254 s | 126,519 s | 38,987 s | 21,589 s | 0,166 s | 11,878 s | 39,389 s |

Trung vị hai lượt đo: warm 32,372 s tới health; near-cold 133,331 s. Lần warm-up đầu (có build:web vì dist chưa có) là 63,433 s: ensure 10,807 s, backup 35,399 s, sau backup tới health 17,227 s. Cửa sổ Overlay + Dashboard mở trong cả bốn lượt; viewport đạt 1080×1920.

Kết luận: chưa tái hiện 15 phút; tối đa 166,8 s. Bước đáng nghi nhất là backup asset khi cache lạnh (55,5–126,5 s), kế đến TSX/import trên cache lạnh (entry 21,6–26,5 s) và buildApp/preflight (10,9–11,9 s). Mức này vẫn cách xa sự cố 20/11 nên đề nghị hỏi người dùng có thể đo trên máy live hay không trước khi tôi sửa implementation. Chưa có thay đổi source trên nhánh task; chỉ bản tạm có instrumentation thời gian, port riêng và bỏ thao tác clipboard.
