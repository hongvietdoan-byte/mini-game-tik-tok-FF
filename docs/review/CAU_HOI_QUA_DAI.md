# Đề xuất rút gọn câu hỏi Free Fire vượt ngưỡng

> Chỉ là đề xuất để người dùng xem xét. Không chỉnh fixtures, database hay nội dung đang chạy.

Nguồn: `fixtures/questions.ts` (36 câu trong gói DEMO Free Fire). Đếm ký tự theo Unicode code point sau khi trim; cảnh báo khi câu hỏi > 110 hoặc bất kỳ đáp án nào > 28 ký tự.
Có **15 câu** vượt ít nhất một ngưỡng. Mã đáp án đúng trong mỗi đề xuất được giữ nguyên.

| ID | Prompt (ký tự; ⚠ khi >110) | Đáp án gốc vượt ngưỡng (ký tự) |
|---|---:|---|
| demo-001 | 216 ⚠ | o1: 38<br>o2: 41<br>o3: 51<br>o4: 46 |
| demo-002 | 134 ⚠ | — |
| demo-003 | 121 ⚠ | — |
| demo-004 | 66 | o1: 40<br>o2: 43<br>o3: 48<br>o4: 46 |
| demo-006 | 136 ⚠ | — |
| demo-009 | 136 ⚠ | — |
| demo-014 | 63 | o1: 60<br>o2: 76<br>o3: 59<br>o4: 62 |
| demo-015 | 96 | o1: 60<br>o2: 56<br>o3: 74<br>o4: 58 |
| demo-019 | 111 ⚠ | — |
| demo-023 | 200 ⚠ | — |
| demo-025 | 122 ⚠ | — |
| demo-029 | 103 | o1: 37<br>o2: 40<br>o3: 47<br>o4: 48 |
| demo-031 | 93 | o1: 29<br>o2: 44<br>o4: 34 |
| demo-032 | 82 | o2: 41<br>o3: 33 |
| demo-036 | 117 ⚠ | — |

## Nội dung gốc và một phương án rút gọn

Các phần dưới ngưỡng được giữ nguyên trong đề xuất; chỉ nội dung vượt ngưỡng được rút gọn. Đánh dấu đáp án đúng theo `correctOptionId` hiện có.

### demo-001

- **Câu hỏi gốc (216 ký tự):** “Trong Battle Royale, bạn đang đi cùng đồng đội, nhặt trang bị và theo dõi vùng an toàn đang thu hẹp. Mục tiêu tổng quát nào mô tả đúng điều cần đạt để thắng trận, thay vì chỉ hoàn thành một hành động phụ như nhặt đồ?”
- **Đáp án gốc o1 (38 ký tự, đáp án đúng hiện tại):** “Sinh tồn đến cuối trận để giành Booyah”
- **Đáp án gốc o2 (41 ký tự):** “Mua đủ vũ khí trong cửa hàng của mỗi vòng”
- **Đáp án gốc o3 (51 ký tự):** “Chiếm một căn cứ cố định và giữ nguyên đến hết trận”
- **Đáp án gốc o4 (46 ký tự):** “Hoàn thành mọi bài tập trong khu vực luyện tập”
- **Đề xuất câu hỏi (56 ký tự):** “Trong Battle Royale, mục tiêu chính để thắng trận là gì?”
- **Đề xuất đáp án:**
  - o1: “Sống sót đến cuối để Booyah” (27 ký tự) — **đáp án đúng giữ nguyên**
  - o2: “Mua đủ vũ khí mỗi vòng” (22 ký tự)
  - o3: “Giữ căn cứ đến hết trận” (23 ký tự)
  - o4: “Xong mọi bài luyện tập” (22 ký tự)

### demo-002

- **Câu hỏi gốc (134 ký tự):** “Chế độ nào của Free Fire được tổ chức thành các vòng giao tranh giữa hai đội, thay vì một trận Battle Royale kéo dài trên bản đồ rộng?”
- **Đề xuất câu hỏi (54 ký tự):** “Chế độ Free Fire nào đấu theo nhiều vòng giữa hai đội?”
- **Đề xuất đáp án:**
  - o1: “Battle Royale” (13 ký tự)
  - o2: “Clash Squad” (11 ký tự) — **đáp án đúng giữ nguyên**
  - o3: “Training Grounds” (16 ký tự)
  - o4: “Battle Royale Ranked” (20 ký tự)

### demo-003

- **Câu hỏi gốc (121 ký tự):** “Người chơi muốn thử cách ngắm bắn và làm quen với vũ khí trong khu luyện tập trước khi vào trận thì nên chọn khu vực nào?”
- **Đề xuất câu hỏi (51 ký tự):** “Muốn luyện ngắm bắn và thử vũ khí, nên vào khu nào?”
- **Đề xuất đáp án:**
  - o1: “Battle Royale” (13 ký tự)
  - o2: “Clash Squad” (11 ký tự)
  - o3: “Training Grounds” (16 ký tự) — **đáp án đúng giữ nguyên**
  - o4: “Battle Royale Ranked” (20 ký tự)

### demo-004

- **Đáp án gốc o1 (40 ký tự):** “Một hành trình khám phá không có đối thủ”
- **Đáp án gốc o2 (43 ký tự):** “Một trận sinh tồn duy nhất trên bản đồ rộng”
- **Đáp án gốc o3 (48 ký tự):** “Một bài tập ngắm bắn không có kết quả thắng thua”
- **Đáp án gốc o4 (46 ký tự, đáp án đúng hiện tại):** “Các vòng giao tranh nối tiếp nhau giữa hai đội”
- **Đề xuất câu hỏi (66 ký tự):** “Đặc điểm nào mô tả đúng nhịp trận của Clash Squad trong Free Fire?”
- **Đề xuất đáp án:**
  - o1: “Khám phá không có đối thủ” (25 ký tự)
  - o2: “Một trận sinh tồn duy nhất” (26 ký tự)
  - o3: “Luyện bắn, không thắng thua” (27 ký tự)
  - o4: “Hai đội đấu qua nhiều vòng” (26 ký tự) — **đáp án đúng giữ nguyên**

### demo-006

- **Câu hỏi gốc (136 ký tự):** “Trong Clash Squad, người chơi dùng khu vực mua sắm trong trận để chọn vũ khí và trang bị cho vòng đấu. Khu vực đó thường được gọi là gì?”
- **Đề xuất câu hỏi (56 ký tự):** “Trong Clash Squad, khu mua vũ khí và trang bị gọi là gì?”
- **Đề xuất đáp án:**
  - o1: “Vending Machine” (15 ký tự)
  - o2: “CS Store” (8 ký tự) — **đáp án đúng giữ nguyên**
  - o3: “Tactical Market” (15 ký tự)
  - o4: “Arsenal” (7 ký tự)

### demo-009

- **Câu hỏi gốc (136 ký tự):** “Theo ghi chú cập nhật bản đồ Kalahari của Garena, bản đồ nào đã được giới thiệu trước Kalahari với vai trò bản đồ thứ hai của Free Fire?”
- **Đề xuất câu hỏi (59 ký tự):** “Bản đồ nào là bản đồ thứ hai của Free Fire, trước Kalahari?”
- **Đề xuất đáp án:**
  - o1: “Purgatory” (9 ký tự) — **đáp án đúng giữ nguyên**
  - o2: “Bermuda” (7 ký tự)
  - o3: “Alpine” (6 ký tự)
  - o4: “NeXTerra” (8 ký tự)

### demo-014

- **Đáp án gốc o1 (60 ký tự):** “Một khẩu súng dùng để ngắm bắn mục tiêu ở khoảng cách rất xa”
- **Đáp án gốc o2 (76 ký tự, đáp án đúng hiện tại):** “Một bức tường tạm thời giúp tạo vật chắn để người chơi di chuyển an toàn hơn”
- **Đáp án gốc o3 (59 ký tự):** “Một bộ giáp làm tăng lượng vật phẩm có thể mang trong ba lô”
- **Đáp án gốc o4 (62 ký tự):** “Một thiết bị chỉ dùng để xem kết quả sau khi trận đấu kết thúc”
- **Đề xuất câu hỏi (63 ký tự):** “Cách mô tả nào đúng về công dụng của Gloo Wall trong Free Fire?”
- **Đề xuất đáp án:**
  - o1: “Súng bắn xa” (11 ký tự)
  - o2: “Tường chắn tạm thời” (19 ký tự) — **đáp án đúng giữ nguyên**
  - o3: “Giáp tăng sức chứa ba lô” (24 ký tự)
  - o4: “Thiết bị xem kết quả trận” (25 ký tự)

### demo-015

- **Đáp án gốc o1 (60 ký tự):** “Vật phẩm phòng thủ được đặt xuống để dựng một bức tường chắn”
- **Đáp án gốc o2 (56 ký tự):** “Vật phẩm chứa vũ khí và đồ tiếp tế được thả xuống bản đồ”
- **Đáp án gốc o3 (74 ký tự, đáp án đúng hiện tại):** “Vật phẩm hồi phục giúp khôi phục máu sau khi nhân vật bị thương trong trận”
- **Đáp án gốc o4 (58 ký tự):** “Vật phẩm dùng để tăng chỗ chứa đồ trong ba lô của nhân vật”
- **Đề xuất câu hỏi (96 ký tự):** “Khi nhân vật đã mất máu sau giao tranh, mô tả nào phù hợp nhất với công dụng cơ bản của Med Kit?”
- **Đề xuất đáp án:**
  - o1: “Vật chắn đặt trên đất” (21 ký tự)
  - o2: “Thùng vũ khí và tiếp tế” (23 ký tự)
  - o3: “Hồi máu khi bị thương” (21 ký tự) — **đáp án đúng giữ nguyên**
  - o4: “Tăng chỗ chứa trong ba lô” (25 ký tự)

### demo-019

- **Câu hỏi gốc (111 ký tự):** “Trong Battle Royale, vật thể tiếp tế được thả từ trên cao xuống và có thể chứa chiến lợi phẩm thường gọi là gì?”
- **Đề xuất câu hỏi (56 ký tự):** “Vật phẩm tiếp tế từ trên cao, có thể chứa đồ, gọi là gì?”
- **Đề xuất đáp án:**
  - o1: “War Chest” (9 ký tự)
  - o2: “Arsenal” (7 ký tự)
  - o3: “Airdrop” (7 ký tự) — **đáp án đúng giữ nguyên**
  - o4: “Vending Machine” (15 ký tự)

### demo-023

- **Câu hỏi gốc (200 ký tự):** “Trong Battle Royale, bản đồ đánh dấu khu vực an toàn, còn bên ngoài có thể nguy hiểm và vùng này dần thu hẹp. Khi đồng đội nhắc “vào bo”, họ đang nói đến khu vực nào cần tiến vào để tiếp tục sinh tồn?”
- **Đề xuất câu hỏi (58 ký tự):** “Đồng đội nói “vào bo”; bạn cần vào khu vực nào để an toàn?”
- **Đề xuất đáp án:**
  - o1: “Booyah” (6 ký tự)
  - o2: “Airdrop” (7 ký tự)
  - o3: “Safe Zone” (9 ký tự) — **đáp án đúng giữ nguyên**
  - o4: “Revival Point” (13 ký tự)

### demo-025

- **Câu hỏi gốc (122 ký tự):** “Khi một cơ chế trong trận đưa người đồng đội đã bị loại trở lại cuộc đấu, hành động đó thường được gọi bằng thuật ngữ nào?”
- **Đề xuất câu hỏi (47 ký tự):** “Đưa đồng đội đã bị loại trở lại trận gọi là gì?”
- **Đề xuất đáp án:**
  - o1: “Revive” (6 ký tự) — **đáp án đúng giữ nguyên**
  - o2: “Loot” (4 ký tự)
  - o3: “Heal” (4 ký tự)
  - o4: “Respawn” (7 ký tự)

### demo-029

- **Đáp án gốc o1 (37 ký tự, đáp án đúng hiện tại):** “Một nhóm đồng đội phối hợp trong trận”
- **Đáp án gốc o2 (40 ký tự):** “Một nhóm khán giả cùng theo dõi trận đấu”
- **Đáp án gốc o3 (47 ký tự):** “Một nhóm vật phẩm được sắp xếp trong hành trang”
- **Đáp án gốc o4 (48 ký tự):** “Một nhóm nhân vật được hiển thị trong bộ sưu tập”
- **Đề xuất câu hỏi (103 ký tự):** “Trong giao tiếp của trò chơi, từ “squad” thường chỉ điều gì khi người chơi cùng nhau tham gia một trận?”
- **Đề xuất đáp án:**
  - o1: “Nhóm đồng đội phối hợp” (22 ký tự) — **đáp án đúng giữ nguyên**
  - o2: “Nhóm khán giả xem trận” (22 ký tự)
  - o3: “Nhóm đồ trong hành trang” (24 ký tự)
  - o4: “Nhóm nhân vật sưu tập” (21 ký tự)

### demo-031

- **Đáp án gốc o1 (29 ký tự):** “Trò chơi chỉ chơi ngoại tuyến”
- **Đáp án gốc o2 (44 ký tự):** “Trò chơi chỉ chạy trên máy chơi game cầm tay”
- **Đáp án gốc o4 (34 ký tự):** “Trò chơi bàn cờ không cần thiết bị”
- **Đề xuất câu hỏi (93 ký tự):** “Theo phần FAQ chính thức, Free Fire là trò chơi trực tuyến hay trò chơi chỉ chơi ngoại tuyến?”
- **Đề xuất đáp án:**
  - o1: “Chỉ chơi ngoại tuyến” (20 ký tự)
  - o2: “Chỉ chạy trên máy cầm tay” (25 ký tự)
  - o3: “Trò chơi trực tuyến” (19 ký tự) — **đáp án đúng giữ nguyên**
  - o4: “Cờ bàn, không cần máy” (21 ký tự)

### demo-032

- **Đáp án gốc o2 (41 ký tự):** “Máy tính lớn dùng trong trung tâm dữ liệu”
- **Đáp án gốc o3 (33 ký tự):** “Máy chơi game cầm tay chuyên dụng”
- **Đề xuất câu hỏi (82 ký tự):** “Garena mô tả Free Fire là trò chơi battle royale dành riêng cho nhóm thiết bị nào?”
- **Đề xuất đáp án:**
  - o1: “Máy chơi game tại nhà” (21 ký tự)
  - o2: “Máy tính trung tâm dữ liệu” (26 ký tự)
  - o3: “Máy chơi game cầm tay” (21 ký tự)
  - o4: “Thiết bị di động” (16 ký tự) — **đáp án đúng giữ nguyên**

### demo-036

- **Câu hỏi gốc (117 ký tự):** “Người dùng iPhone hoặc iPad tìm bản tải chính thức của Free Fire trong cửa hàng ứng dụng nào được FAQ Garena nêu tên?”
- **Đề xuất câu hỏi (58 ký tự):** “Người dùng iPhone hoặc iPad tải Free Fire từ cửa hàng nào?”
- **Đề xuất đáp án:**
  - o1: “Google Play” (11 ký tự)
  - o2: “Steam Store” (11 ký tự)
  - o3: “Microsoft Store” (15 ký tự)
  - o4: “Apple App Store” (15 ký tự) — **đáp án đúng giữ nguyên**

## Ghi chú duyệt

- Các câu dài không bị tự động sửa hoặc loại khỏi ngân hàng câu hỏi.
- Người dùng có thể giữ nguyên, chọn một phần đề xuất hoặc tự biên tập; cần duyệt lại câu sau khi sửa.
- Đề xuất giữ nguyên `correctOptionId` và ý nghĩa của đáp án đúng hiện tại.
