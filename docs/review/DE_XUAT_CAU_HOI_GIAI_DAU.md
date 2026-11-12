# Đề xuất câu hỏi giải đấu — Bá Vương Đại Chiến & FFWS 2026

Làn cloud soạn theo C-0107, ngày 12/11/2026. **Đây chỉ là ĐỀ XUẤT.** Người dùng sửa, chọn, duyệt. File này không ghi vào `fixtures/` hay DB.

## Đọc trước

**Truy cập web trong phiên cloud:**
- **Tìm kiếm web: được.** Mọi dữ kiện FFWS bên dưới lấy từ kết quả tìm kiếm ngày 12/11/2026.
- **Mở trực tiếp trang nguồn: không được.** liquipedia.net và en.wikipedia.org không phân giải tên miền (bị chặn mạng), nên tôi không mở trang nào để đọc toàn văn.
- Vì vậy, theo đúng định nghĩa của C-0107 ("có nguồn mở được hôm nay"), **0 câu đạt ĐÃ KIỂM**. Mọi câu đều là **CẦN NGƯỜI DÙNG XÁC NHẬN**, chia ba mức:
  - **đối chiếu ≥2 nguồn tìm kiếm**: dữ kiện xuất hiện khớp nhau ở ít nhất hai nguồn độc lập. Chỉ cần người dùng mở một URL để xác nhận.
  - **1 nguồn**: chỉ một nguồn. Rủi ro cao hơn, nên kiểm kỹ.
  - **KHUNG, chờ dữ kiện**: câu về Bá Vương Đại Chiến và 8 đội, có chỗ trống `{...}`.
- Ở dòng "Bằng chứng": phần trong ngoặc kép là đoạn trích ngắn (< 15 từ) từ kết quả tìm kiếm. Phần ghi "(diễn giải)" là ý chính, không phải trích nguyên văn.

**Giải FFWS 2026 đang diễn ra** (6–28/11). Tôi tránh mọi câu có đáp án thay đổi theo ngày (bảng điểm, đội dẫn đầu, ai vào Grand Finals). Lịch 27/11 và 28/11 là lịch công bố, giải có thể dời.

**Trùng với 36 câu hiện có:** đã đối chiếu `fixtures/questions.ts`. Bộ hiện có chỉ hỏi về gameplay, bản đồ, vật phẩm và nhà phát hành. Bộ này chỉ hỏi về giải đấu, nên không trùng câu.

**Quy ước định dạng:** câu ≤ 110 ký tự, mỗi đáp án ≤ 28 ký tự, đúng một đáp án đúng. Script đã kiểm cả 95 câu và vị trí đáp án đúng được rải đều A/B/C/D.

## Dữ kiện người dùng cần cung cấp (Bá Vương Đại Chiến)

Repo không có dữ liệu về giải này. Tìm kiếm web cũng **không ra** giải nào tên "Bá Vương Đại Chiến". Kết quả gần nhất là "Nữ Vương Đại Chiến", một giải khác dành cho streamer nữ. Ngoài ra có một **đội** tên "Bá Vương" từng dự FFWS Vietnam 2026 Spring. Tôi không dùng hai thông tin này để đoán.

Điền các chỗ trống sau thì 34 câu khung dùng được:

| Mã | Dữ kiện cần | Dùng ở |
|---|---|---|
| `{ĐỘI_1}`…`{ĐỘI_8}` | Tên 8 đội, viết đúng chính tả hiển thị | nhóm c |
| `{ĐT_1}`…`{ĐT_8}` | Tên thi đấu công khai của đội trưởng mỗi đội | nhóm c |
| `{TAG_1}`, `{LOGO_5}` | Tag viết tắt, mô tả logo | nhóm c |
| `{ĐỘI_FFWS}`, `{ĐỘI_ĐKVĐ}`, `{TT_6}` | Đội từng dự FFWS, đương kim vô địch, thành tích tốt nhất | nhóm c |
| `{F_C13}` | Cách chia bảng | nhóm c |
| `{F_A04}` | Chế độ thi đấu (BR / Clash Squad) | nhóm a |
| `{F_A05}` | Giải thưởng vô địch | nhóm a |
| `{F_A06}` | Thể thức chung kết | nhóm a |
| `{F_A07}`, `{F_A16}` | Lịch và số ngày thi đấu | nhóm a |
| `{F_A08}` | Kênh phát sóng chính | nhóm a |
| `{F_A09}`, `{F_A10}` | Số tuyển thủ mỗi đội, số trận mỗi ngày | nhóm a |
| `{F_A11}`, `{F_A12}` | Bảng điểm: điểm Booyah, điểm mỗi mạng hạ | nhóm a |
| `{F_A13}` | Bản đồ thi đấu | nhóm a |
| `{F_A14}`, `{F_A18}` | Tên danh hiệu vô địch, giải cá nhân | nhóm a |
| `{F_A15}`, `{F_A17}` | Mùa thứ mấy, nhà vô địch mùa trước (bỏ nếu là mùa đầu) | nhóm a |

Đáp án nhiễu dạng `{nhiễu n}` cần người dùng hoặc làn soạn điền sau khi có dữ kiện thật. Ba câu gd-001..gd-003 dùng được ngay nếu người dùng xác nhận tên giải và con số 8 đội.

## (a) Bá Vương Đại Chiến — khung

### gd-001 · nhóm a · dễ

**Bá Vương Đại Chiến quy tụ bao nhiêu đội tham dự?**

A. 6 đội  
B. 10 đội  
C. 12 đội  
D. 8 đội

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: (diễn giải) thư giao việc ghi "8 đội dự Bá Vương Đại Chiến"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Đáp án lấy từ yêu cầu người dùng, cần xác nhận lại.

### gd-002 · nhóm a · dễ

**Bá Vương Đại Chiến là giải đấu của tựa game nào?**

A. PUBG Mobile  
B. Liên Quân Mobile  
C. Free Fire  
D. Valorant

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: (diễn giải) thư giao việc: chủ đề Free Fire esports
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-003 · nhóm a · dễ

**Tên đầy đủ của giải là "Bá Vương ___ Chiến". Chữ còn thiếu là gì?**

A. Thế  
B. Đại  
C. Hùng  
D. Vô

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: (diễn giải) tên giải do người dùng ghi
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-004 · nhóm a · dễ

**Bá Vương Đại Chiến thi đấu ở chế độ nào của Free Fire?**

A. {F_A04}  
B. Clash Squad / BR (còn lại)  
C. Lone Wolf  
D. Tử chiến xếp hạng

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: chế độ thi đấu
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Người dùng điền {F_A04}; đáp án nhiễu chỉnh theo thực tế.

### gd-005 · nhóm a · vừa

**Nhà vô địch Bá Vương Đại Chiến nhận giải thưởng bao nhiêu?**

A. {nhiễu 1}  
B. {nhiễu 2}  
C. {nhiễu 3}  
D. {F_A05}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: giải thưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-006 · nhóm a · vừa

**Chung kết Bá Vương Đại Chiến áp dụng thể thức nào?**

A. Champion Rush / tổng điểm  
B. Loại trực tiếp  
C. {F_A06}  
D. Vòng tròn

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: thể thức
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Bỏ đáp án trùng với {F_A06}.

### gd-007 · nhóm a · dễ

**Bá Vương Đại Chiến diễn ra trong những ngày nào?**

A. {nhiễu ngày 1}  
B. {F_A07}  
C. {nhiễu ngày 2}  
D. {nhiễu ngày 3}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: lịch thi đấu
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-008 · nhóm a · dễ

**Bá Vương Đại Chiến được phát trực tiếp chủ yếu trên nền tảng nào?**

A. {F_A08}  
B. YouTube / TikTok (còn lại)  
C. Facebook  
D. Twitch

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: kênh phát sóng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-009 · nhóm a · vừa

**Mỗi đội dự Bá Vương Đại Chiến đăng ký bao nhiêu tuyển thủ chính thức?**

A. 4 tuyển thủ  
B. 5 tuyển thủ  
C. 6 tuyển thủ  
D. {F_A09}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: số tuyển thủ/đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-010 · nhóm a · vừa

**Mỗi ngày thi đấu của Bá Vương Đại Chiến có bao nhiêu trận?**

A. {nhiễu 1}  
B. {nhiễu 2}  
C. {F_A10}  
D. {nhiễu 3}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: số trận/ngày
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-011 · nhóm a · khó

**Ở Bá Vương Đại Chiến, một Booyah được cộng bao nhiêu điểm thứ hạng?**

A. {nhiễu 1}  
B. {F_A11}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: bảng điểm
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-012 · nhóm a · khó

**Ở Bá Vương Đại Chiến, mỗi mạng hạ gục được tính bao nhiêu điểm?**

A. {F_A12}  
B. {nhiễu 1}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: bảng điểm
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-013 · nhóm a · vừa

**Bản đồ nào được dùng nhiều nhất ở Bá Vương Đại Chiến?**

A. Bermuda / Kalahari  
B. Purgatory  
C. Alpine  
D. {F_A13}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: bản đồ thi đấu
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-014 · nhóm a · dễ

**Nhà vô địch Bá Vương Đại Chiến nhận danh hiệu gì?**

A. {nhiễu 1}  
B. {nhiễu 2}  
C. {F_A14}  
D. {nhiễu 3}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên danh hiệu
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-015 · nhóm a · vừa

**Bá Vương Đại Chiến năm nay là mùa thứ mấy?**

A. {nhiễu 1}  
B. {F_A15}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: số mùa
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Bỏ câu nếu đây là mùa đầu.

### gd-016 · nhóm a · vừa

**Bá Vương Đại Chiến kéo dài bao nhiêu ngày thi đấu?**

A. {F_A16}  
B. {nhiễu 1}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: số ngày
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-017 · nhóm a · khó

**Đội nào là nhà vô địch Bá Vương Đại Chiến mùa trước?**

A. {đội 2}  
B. {đội 3}  
C. {đội 4}  
D. {F_A17}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: kết quả mùa trước
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Bỏ nếu mùa đầu.

### gd-018 · nhóm a · khó

**Giải cá nhân xuất sắc nhất ở Bá Vương Đại Chiến có tên gọi gì?**

A. {nhiễu 1}  
B. {nhiễu 2}  
C. {F_A18}  
D. {nhiễu 3}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên giải cá nhân
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện


## (b) FFWS 2026 Global Finals

### gd-019 · nhóm b · dễ

**FFWS 2026 Global Finals được tổ chức tại thành phố nào?**

A. Jakarta  
B. Bangkok  
C. Rio de Janeiro  
D. Singapore

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: "will be held in Bangkok, Thailand this November"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-020 · nhóm b · dễ

**FFWS 2026 Global Finals có bao nhiêu đội tham dự?**

A. 24 đội  
B. 18 đội  
C. 12 đội  
D. 16 đội

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule>
- Bằng chứng: (diễn giải) roadmap Garena nâng Global Finals lên 24 đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-021 · nhóm b · vừa

**Năm 2026, Global Finals được mở rộng lên 24 đội. Trước đó giải có bao nhiêu đội?**

A. 12 đội  
B. 16 đội  
C. 20 đội  
D. 18 đội

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) "expanded from 18 to 24 teams"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-022 · nhóm b · dễ

**Vòng Grand Finals của FFWS 2026 Global Finals có bao nhiêu đội tranh chức vô địch?**

A. 24 đội  
B. 8 đội  
C. 12 đội  
D. 16 đội

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained>
- Bằng chứng: "The final 12 teams will compete for the Championship"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-023 · nhóm b · vừa

**Trận Grand Finals FFWS 2026 Global Finals được lên lịch vào ngày nào?**

A. 6/11/2026  
B. 28/11/2026  
C. 15/11/2026  
D. 22/11/2026

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced> · <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained>
- Bằng chứng: "in the Grand Finals 2026 on November 28"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm
- Ghi chú: Lịch giải có thể dời; kiểm lại trước khi dùng.

### gd-024 · nhóm b · dễ

**FFWS 2026 Global Finals khởi tranh ngày nào?**

A. 6/11/2026  
B. 1/11/2026  
C. 13/11/2026  
D. 28/11/2026

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) Global Finals "kicks off on November 6"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-025 · nhóm b · vừa

**Grand Finals FFWS 2026 diễn ra tại nhà thi đấu nào ở Bangkok?**

A. Indonesia Arena  
B. Carioca Arena 1  
C. Rajamangala Stadium  
D. BITEC LIVE

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://esportswatchguide.com/free-fire/events/free-fire-world-series-2026/> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) grand finale "at BITEC LIVE, Bangkok"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-026 · nhóm b · dễ

**Tổng giải thưởng FFWS 2026 Global Finals vào khoảng bao nhiêu?**

A. 500.000 USD  
B. 3 triệu USD  
C. 1,2 triệu USD  
D. 100.000 USD

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://liquipedia.net/freefire/Free_Fire_World_Series/2026> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: "prize pool will be around $1.2 million"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-027 · nhóm b · vừa

**FFWS 2026 Global Finals gồm Knockout, Grand Finals và giai đoạn nào nằm giữa?**

A. Wildcard  
B. Last Chance  
C. Play-in  
D. Bán kết

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule>
- Bằng chứng: (diễn giải) ba giai đoạn: Knockout, Last Chance, Grand Finals
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-028 · nhóm b · vừa

**Grand Finals FFWS 2026 thi đấu theo thể thức nào?**

A. Champion Rush  
B. Loại trực tiếp  
C. Thể thức Thụy Sĩ  
D. Đối kháng Bo5

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) "finalists play in the Champion Rush format"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-029 · nhóm b · khó

**Ở Grand Finals FFWS 2026, ngưỡng điểm Champion Rush là bao nhiêu?**

A. 100 điểm  
B. 80 điểm  
C. 150 điểm  
D. 110 điểm

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) "Champion Rush threshold is 110 points"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn
- Ghi chú: Chỉ 1 nguồn; ngưỡng mỗi giải khác nhau (VN Fall 2026 là 100).

### gd-030 · nhóm b · vừa

**Trong Champion Rush, đội đã chạm ngưỡng điểm cần làm gì để đăng quang?**

A. Giữ top 1 tổng điểm  
B. Hạ 10 mạng một trận  
C. Giành một Booyah  
D. Thắng 3 trận liên tiếp

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-sea-fall-winner-prize-pool-distribution-qualified-teams-global-finals>
- Bằng chứng: (diễn giải) "first eligible team to win a Booyah is crowned champion"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-031 · nhóm b · vừa

**Đội vô địch Free Fire tại Esports World Cup 2026 nhận quyền lợi gì ở FFWS 2026?**

A. Vào thẳng Last Chance  
B. Vào thẳng Global Finals  
C. Thêm 20 điểm khởi đầu  
D. Chọn bảng đấu

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://esportsworldcup.com/en/news/free-fire-at-ewc26-champions>
- Bằng chứng: (diễn giải) EWC champion "secure direct qualification" vào Global Finals
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-032 · nhóm b · dễ

**Đội nào vô địch Free Fire tại Esports World Cup 2026 và vào thẳng FFWS 2026?**

A. LYON  
B. Fluxo  
C. Buriram United  
D. Team Flash

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://esportsworldcup.com/en/news/free-fire-at-ewc26-champions> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule>
- Bằng chứng: "LYON has claimed the final Booyah at Free Fire at the Esports World Cup 2026"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-033 · nhóm b · khó

**Esports World Cup 2026, nơi LYON vô địch Free Fire, diễn ra tại thành phố nào?**

A. Riyadh  
B. Bangkok  
C. London  
D. Paris

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/2026_Esports_World_Cup> · <https://sportsdigest.in/ffws-sea-2026-spring-results-secret-wag/194619/> · <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule>
- Bằng chứng: (diễn giải) EWC 2026 diễn ra tại Paris, Pháp
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm
- Ghi chú: Kế hoạch ban đầu là Riyadh rồi dời sang Paris — dễ gây tranh cãi.

### gd-034 · nhóm b · khó

**FFWS 2026 Global Finals là lần đầu có bao nhiêu đội Ấn Độ cùng góp mặt?**

A. 1 đội  
B. 2 đội  
C. 3 đội  
D. 5 đội

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: "three Indian teams are set to feature in the World Series"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-035 · nhóm b · dễ

**Đội nào dưới đây là đại diện Việt Nam tại FFWS 2026 Global Finals?**

A. LOUD  
B. P Esports  
C. Fluxo  
D. Bigetron by Vitality

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) danh sách 24 đội ghi P Esports (Vietnam)
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-036 · nhóm b · vừa

**Việt Nam có bao nhiêu đội dự FFWS 2026 Global Finals?**

A. 3 đội  
B. 1 đội  
C. 2 đội  
D. 4 đội

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) GOW, P Esports, Team Flash đều ghi (Vietnam)
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn
- Ghi chú: Chỉ 1 nguồn; danh sách thiếu 2 suất.

### gd-037 · nhóm b · vừa

**Ở giai đoạn Knockout FFWS 2026, 24 đội được chia thành mấy bảng?**

A. 2 bảng  
B. 3 bảng  
C. 6 bảng  
D. 4 bảng

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained>
- Bằng chứng: "divided into four groups for the first phase"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-038 · nhóm b · khó

**Mỗi bảng ở giai đoạn Knockout FFWS 2026 Global Finals có bao nhiêu đội?**

A. 4 đội  
B. 8 đội  
C. 6 đội  
D. 12 đội

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2026-global-finals-format-explained>
- Bằng chứng: (diễn giải) "4 groups of 6"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn
- Ghi chú: Suy ra được từ 24 đội / 4 bảng.

### gd-039 · nhóm b · khó

**Vòng Last Chance FFWS 2026 Global Finals được lên lịch vào ngày nào?**

A. 20/11/2026  
B. 27/11/2026  
C. 6/11/2026  
D. 30/11/2026

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) Last Chance ngày 27/11, Grand Finals 28/11
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-040 · nhóm b · khó

**Khu vực Đông Nam Á (FFWS SEA) có bao nhiêu suất dự FFWS 2026 Global Finals?**

A. 8 suất  
B. 4 suất  
C. 6 suất  
D. 10 suất

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) "FFWS SEA (8 slots)"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-041 · nhóm b · dễ

**Tên viết tắt FFWS là của giải đấu nào?**

A. Free Fire War Season  
B. Fire Fight World Stage  
C. Free Fire Weekly Show  
D. Free Fire World Series

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_World_Series> · <https://ff.garena.com/en/article/1605/>
- Bằng chứng: (diễn giải) tên giải chính thức Free Fire World Series
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-042 · nhóm b · dễ

**"Global Finals" trong tên FFWS 2026 Global Finals là chung kết ở cấp nào?**

A. Đông Nam Á  
B. Việt Nam  
C. Thế giới  
D. Châu Á

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/> · <https://www.sportskeeda.com/free-fire/news-ffws-2026-global-finals-all-24-qualified-teams-dates-announced>
- Bằng chứng: (diễn giải) giải quốc tế, đội từ nhiều khu vực
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-043 · nhóm b · vừa

**Trước 2026, Bangkok từng đăng cai chung kết FFWS vào năm nào dưới đây?**

A. 2024  
B. 2023  
C. 2019  
D. 2025

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2023-grand-finals-winners-mvp-prize-pool-distribution> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series_2023>
- Bằng chứng: (diễn giải) FFWS 2023 tổ chức tại Bangkok, Thái Lan
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm
- Ghi chú: 2022 có nguồn nói Bangkok cũng đăng cai — không đưa 2022 vào đáp án.

### gd-044 · nhóm b · vừa

**Theo Garena, mục tiêu mở rộng Global Finals 2026 lên 24 đội là gì?**

A. Đón thêm khu vực mới  
B. Rút ngắn lịch thi đấu  
C. Giảm giải thưởng  
D. Bỏ vòng loại khu vực

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1605/>
- Bằng chứng: "welcome more new regions into top-tier competition"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn


## (c) 8 đội Bá Vương Đại Chiến — khung

### gd-045 · nhóm c · dễ

**Đội nào dưới đây có tham dự Bá Vương Đại Chiến?**

A. Fluxo  
B. Buriram United  
C. LYON  
D. {ĐỘI_1}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên 8 đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Đáp án nhiễu là đội nước ngoài, chắc chắn không dự.

### gd-046 · nhóm c · dễ

**Đội nào dưới đây KHÔNG thuộc 8 đội dự Bá Vương Đại Chiến?**

A. {ĐỘI_2}  
B. {ĐỘI_3}  
C. Magic Squad  
D. {ĐỘI_4}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên 8 đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-047 · nhóm c · vừa

**Đội trưởng của {ĐỘI_1} thi đấu với tên gì?**

A. {ĐT_2}  
B. {ĐT_1}  
C. {ĐT_3}  
D. {ĐT_4}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Chỉ tên thi đấu công khai.

### gd-048 · nhóm c · vừa

**Đội trưởng của {ĐỘI_2} thi đấu với tên gì?**

A. {ĐT_2}  
B. {ĐT_1}  
C. {ĐT_5}  
D. {ĐT_6}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-049 · nhóm c · vừa

**Đội trưởng của {ĐỘI_3} thi đấu với tên gì?**

A. {ĐT_4}  
B. {ĐT_7}  
C. {ĐT_8}  
D. {ĐT_3}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-050 · nhóm c · vừa

**Đội trưởng của {ĐỘI_4} thi đấu với tên gì?**

A. {ĐT_2}  
B. {ĐT_6}  
C. {ĐT_4}  
D. {ĐT_8}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-051 · nhóm c · dễ

**{ĐT_5} là đội trưởng của đội nào ở Bá Vương Đại Chiến?**

A. {ĐỘI_6}  
B. {ĐỘI_5}  
C. {ĐỘI_7}  
D. {ĐỘI_8}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-052 · nhóm c · dễ

**{ĐT_6} là đội trưởng của đội nào ở Bá Vương Đại Chiến?**

A. {ĐỘI_6}  
B. {ĐỘI_5}  
C. {ĐỘI_1}  
D. {ĐỘI_3}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-053 · nhóm c · dễ

**{ĐT_7} là đội trưởng của đội nào ở Bá Vương Đại Chiến?**

A. {ĐỘI_2}  
B. {ĐỘI_4}  
C. {ĐỘI_8}  
D. {ĐỘI_7}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-054 · nhóm c · dễ

**{ĐT_8} là đội trưởng của đội nào ở Bá Vương Đại Chiến?**

A. {ĐỘI_1}  
B. {ĐỘI_5}  
C. {ĐỘI_8}  
D. {ĐỘI_7}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tên thi đấu đội trưởng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-055 · nhóm c · dễ

**Tên viết tắt {TAG_1} là của đội nào ở Bá Vương Đại Chiến?**

A. {ĐỘI_2}  
B. {ĐỘI_1}  
C. {ĐỘI_3}  
D. {ĐỘI_4}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: tag đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-056 · nhóm c · dễ

**Logo của {ĐỘI_5} có hình gì?**

A. {LOGO_5}  
B. {nhiễu 1}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: mô tả logo
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Câu vui, dễ trả lời khi logo hiện trên LIVE.

### gd-057 · nhóm c · vừa

**8 đội dự Bá Vương Đại Chiến được chia thành mấy bảng?**

A. 1 bảng  
B. 2 bảng  
C. 4 bảng  
D. {F_C13}

- Đúng: **D**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: chia bảng
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-058 · nhóm c · vừa

**Đội nào trong 8 đội Bá Vương Đại Chiến từng dự FFWS?**

A. {ĐỘI_x}  
B. {ĐỘI_y}  
C. {ĐỘI_FFWS}  
D. {ĐỘI_z}

- Đúng: **C**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: thành tích đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Nếu có, đối chiếu với danh sách GOW / P Esports / Team Flash ở FFWS 2026.

### gd-059 · nhóm c · khó

**Đội nào là đương kim vô địch trong 8 đội dự Bá Vương Đại Chiến?**

A. {ĐỘI_x}  
B. {ĐỘI_ĐKVĐ}  
C. {ĐỘI_y}  
D. {ĐỘI_z}

- Đúng: **B**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: đương kim vô địch
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện

### gd-060 · nhóm c · khó

**{ĐỘI_6} từng giành thành tích cao nhất nào trước Bá Vương Đại Chiến?**

A. {TT_6}  
B. {nhiễu 1}  
C. {nhiễu 2}  
D. {nhiễu 3}

- Đúng: **A**
- Nguồn (tra 12/11/2026): thư C-0107 (yêu cầu người dùng 12/11)
- Bằng chứng: CHỜ: thành tích đội
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — KHUNG, chờ dữ kiện
- Ghi chú: Không dùng câu công kích; chỉ thành tích.


## (d) Đội mạnh và lịch sử FFWS

### gd-061 · nhóm d · dễ

**Đội nào vô địch Free Fire World Series 2019?**

A. LOUD  
B. Fluxo  
C. Phoenix Force  
D. Corinthians

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.oneesports.gg/free-fire/corinthians-win-the-free-fire-world-series-2019/> · <https://www.pocketgamer.com/garena-free-fire/team-corinthians-wins-garena-free-fires-free-fire-world-series-2019> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: "won by the home team, Corinthians"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-062 · nhóm d · vừa

**FFWS 2019 được tổ chức tại thành phố nào?**

A. São Paulo  
B. Bangkok  
C. Rio de Janeiro  
D. Singapore

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.oneesports.gg/free-fire/corinthians-win-the-free-fire-world-series-2019/> · <https://www.pocketgamer.com/garena-free-fire/team-corinthians-wins-garena-free-fires-free-fire-world-series-2019>
- Bằng chứng: (diễn giải) tại Barra Olympic Park, Rio de Janeiro
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-063 · nhóm d · khó

**Đội nào giành á quân FFWS 2019 sau Corinthians?**

A. Phoenix Force  
B. Sbornaya ChR  
C. Magic Squad  
D. EVOS Esports

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.oneesports.gg/free-fire/corinthians-win-the-free-fire-world-series-2019/> · <https://www.pocketgamer.com/garena-free-fire/team-corinthians-wins-garena-free-fires-free-fire-world-series-2019>
- Bằng chứng: (diễn giải) Corinthians "narrowly beating Russian team Sbornaya ChR"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-064 · nhóm d · vừa

**Năm 2020 không có FFWS do COVID-19. Giải nào được tổ chức thay thế?**

A. FF Continental Series  
B. FF World Cup  
C. FFWS Online  
D. Esports World Cup

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_Continental_Series_2020> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: "replaced with the Free Fire Continental Series 2020"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-065 · nhóm d · dễ

**Đội nào vô địch FFWS 2021 tổ chức tại Singapore?**

A. Corinthians  
B. Fluxo  
C. Buriram United  
D. Phoenix Force

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sea.com/news/204> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: "Team Phoenix Force of Thailand is the FFWS 2021 SG champions"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-066 · nhóm d · vừa

**Phoenix Force, nhà vô địch FFWS 2021, đến từ quốc gia nào?**

A. Indonesia  
B. Việt Nam  
C. Thái Lan  
D. Brazil

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sea.com/news/204> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: "Team Phoenix Force of Thailand"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-067 · nhóm d · dễ

**FFWS 2021 (đội Phoenix Force vô địch) diễn ra ở đâu?**

A. Bangkok  
B. Singapore  
C. Jakarta  
D. Rio de Janeiro

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sea.com/news/204> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: "FFWS 2021 SG champions"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-068 · nhóm d · dễ

**Đội nào vô địch FFWS 2023 tổ chức tại Bangkok?**

A. Magic Squad  
B. Fluxo  
C. Corinthians  
D. Team Flash

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2023-grand-finals-winners-mvp-prize-pool-distribution> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series_2023>
- Bằng chứng: "Magic Squad becoming the undisputed world champions of the year"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-069 · nhóm d · vừa

**Magic Squad, nhà vô địch FFWS 2023, đến từ quốc gia nào?**

A. Thái Lan  
B. Indonesia  
C. Mexico  
D. Brazil

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2023-grand-finals-winners-mvp-prize-pool-distribution> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: (diễn giải) Magic Squad (Brazil)
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-070 · nhóm d · dễ

**Đội nào vô địch FFWS Global Finals 2024?**

A. Magic Squad  
B. RRQ Kazu  
C. Fluxo  
D. Buriram United

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_World_Series_%E2%80%93_Global_Finals_2024> · <https://theclutch.com.br/noticias/free-fire/ffws-global-finals-2024-fluxo-e-campeao-mundial/> · <https://www.oneesports.id/free-fire/fluxo-juara-ffws-global-finals-2024/>
- Bằng chứng: "Fluxo é campeão mundial"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-071 · nhóm d · dễ

**FFWS Global Finals 2024 được tổ chức tại thành phố nào?**

A. Bangkok  
B. Rio de Janeiro  
C. Jakarta  
D. Singapore

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_World_Series_%E2%80%93_Global_Finals_2024> · <https://theclutch.com.br/noticias/free-fire/ffws-global-finals-2024-fluxo-e-campeao-mundial/>
- Bằng chứng: "Arena Carioca 1, no Rio de Janeiro"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-072 · nhóm d · khó

**Fluxo vô địch FFWS Global Finals 2024 với tổng bao nhiêu điểm?**

A. 86 điểm  
B. 103 điểm  
C. 110 điểm  
D. 75 điểm

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://theclutch.com.br/noticias/free-fire/ffws-global-finals-2024-fluxo-e-campeao-mundial/> · <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: (diễn giải) Fluxo kết thúc với 86 điểm, 3 Booyah
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-073 · nhóm d · khó

**Đội nào giành á quân FFWS Global Finals 2024, kém Fluxo 3 điểm?**

A. Buriram United  
B. Magic Squad  
C. LOUD  
D. RRQ Kazu

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://theclutch.com.br/noticias/free-fire/ffws-global-finals-2024-fluxo-e-campeao-mundial/>
- Bằng chứng: "apenas 3 à frente do segundo colocado RRQ KAZU"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-074 · nhóm d · vừa

**FFWS Global Finals 2024 diễn ra tại nhà thi đấu nào?**

A. BITEC LIVE  
B. Indonesia Arena  
C. Carioca Arena 1  
D. Maracanã

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_World_Series_%E2%80%93_Global_Finals_2024> · <https://theclutch.com.br/noticias/free-fire/ffws-global-finals-2024-fluxo-e-campeao-mundial/>
- Bằng chứng: "Carioca Arena 1, Barra Olympic Park"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-075 · nhóm d · vừa

**Magic Squad (2023) và Fluxo (2024) giúp nước nào vô địch FFWS hai năm liền?**

A. Thái Lan  
B. Brazil  
C. Indonesia  
D. Việt Nam

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.oneesports.id/free-fire/fluxo-juara-ffws-global-finals-2024/> · <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2023-grand-finals-winners-mvp-prize-pool-distribution>
- Bằng chứng: "Brazil back to back champion!"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-076 · nhóm d · dễ

**Đội nào vô địch FFWS Global Finals 2025?**

A. Buriram United Esports  
B. Fluxo  
C. Magic Squad  
D. LYON

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1566/> · <https://www.antaranews.com/berita/5244657/buriram-esports-juara-ffws-global-finals-2025-jakarta> · <https://observerid.com/buriram-united-esports-crowned-free-fire-world-champion-at-ffws-global-finals-2025-jakarta/>
- Bằng chứng: "Buriram United Esports was crowned the new Free Fire world champion"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-077 · nhóm d · dễ

**FFWS Global Finals 2025 được tổ chức tại thành phố nào?**

A. Bangkok  
B. Rio de Janeiro  
C. Paris  
D. Jakarta

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1566/> · <https://www.antaranews.com/berita/5244657/buriram-esports-juara-ffws-global-finals-2025-jakarta> · <https://observerid.com/buriram-united-esports-crowned-free-fire-world-champion-at-ffws-global-finals-2025-jakarta/>
- Bằng chứng: "FFWS Global Finals 2025 Jakarta"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-078 · nhóm d · dễ

**Buriram United Esports, nhà vô địch FFWS 2025, đến từ quốc gia nào?**

A. Indonesia  
B. Brazil  
C. Thái Lan  
D. Việt Nam

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1566/> · <https://observerid.com/buriram-united-esports-crowned-free-fire-world-champion-at-ffws-global-finals-2025-jakarta/>
- Bằng chứng: "Thailand's Buriram United Esports Triumphs"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-079 · nhóm d · vừa

**Chung kết FFWS Global Finals 2025 diễn ra tại nhà thi đấu nào?**

A. BITEC LIVE  
B. Indonesia Arena  
C. Carioca Arena 1  
D. Singapore Indoor

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://ff.garena.com/en/article/1566/> · <https://observerid.com/buriram-united-esports-crowned-free-fire-world-champion-at-ffws-global-finals-2025-jakarta/>
- Bằng chứng: (diễn giải) Buriram đăng quang tại Indonesia Arena
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-080 · nhóm d · khó

**Đội nào giành á quân FFWS Global Finals 2025 sau Buriram United?**

A. Fluxo  
B. RRQ Kazu  
C. Magic Squad  
D. LOUD

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://en.wikipedia.org/wiki/Free_Fire_World_Series>
- Bằng chứng: (diễn giải) bảng kết quả ghi Fluxo á quân
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn
- Ghi chú: Nguồn duy nhất, ô bảng mơ hồ.

### gd-081 · nhóm d · khó

**Tuyển thủ nào nhận FMVP Grand Finals FFWS Global Finals 2025?**

A. Nobru  
B. Kojaa  
C. LevelUp007  
D. WASSANA

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.antaranews.com/berita/5244657/buriram-esports-juara-ffws-global-finals-2025-jakarta>
- Bằng chứng: "Grand Finals Most Valuable Player (FMVP) and Predator"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-082 · nhóm d · khó

**Đội nào vô địch nội dung Clash Squad tại FFWS Global Finals 2025?**

A. Fluxo  
B. Buriram United  
C. All Gamers Global  
D. RRQ Kazu

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2025-global-finals-cs-winners-mvp-prize-pool-distribution-highlights>
- Bằng chứng: "won the battle by a 3-1 scoreline over Fluxo"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-083 · nhóm d · dễ

**Đội nào vô địch FFWS SEA 2026 Spring?**

A. GOW  
B. SECRET WAG  
C. Bigetron by Vitality  
D. Buriram United

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://vietnamnews.vn/sports/1782593/vietnamese-team-crowned-ffws-sea-esports-champion.html> · <https://english.vov.vn/en/sports/vietnamese-team-crowned-ffws-sea-esports-champion-post1296938.vov> · <https://sportsdigest.in/ffws-sea-2026-spring-results-secret-wag/194619/>
- Bằng chứng: (diễn giải) SECRET WAG vô địch FFWS SEA 2026 Spring
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-084 · nhóm d · vừa

**Chung kết FFWS SEA 2026 Spring diễn ra ở quốc gia nào?**

A. Việt Nam  
B. Thái Lan  
C. Indonesia  
D. Malaysia

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://vietnamnews.vn/sports/1782593/vietnamese-team-crowned-ffws-sea-esports-champion.html> · <https://english.vov.vn/en/sports/vietnamese-team-crowned-ffws-sea-esports-champion-post1296938.vov>
- Bằng chứng: (diễn giải) đội Việt Nam đầu tiên vô địch FFWS SEA trên sân nhà
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-085 · nhóm d · dễ

**SECRET WAG, nhà vô địch FFWS SEA 2026 Spring, đến từ quốc gia nào?**

A. Thái Lan  
B. Indonesia  
C. Philippines  
D. Việt Nam

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://vietnamnews.vn/sports/1782593/vietnamese-team-crowned-ffws-sea-esports-champion.html> · <https://english.vov.vn/en/sports/vietnamese-team-crowned-ffws-sea-esports-champion-post1296938.vov>
- Bằng chứng: "Vietnamese team crowned FFWS SEA esports champion"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-086 · nhóm d · khó

**SECRET WAG khép lại chung kết Champion Rush FFWS SEA 2026 Spring sau bao nhiêu trận?**

A. 8 trận  
B. 10 trận  
C. 6 trận  
D. 12 trận

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://english.vov.vn/en/sports/vietnamese-team-crowned-ffws-sea-esports-champion-post1296938.vov>
- Bằng chứng: (diễn giải) 4 Booyah trong 6 trận, đội đầu tiên xong Champion Rush trong 6 trận
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-087 · nhóm d · vừa

**Đội nào vô địch FFWS SEA 2026 Fall?**

A. GOW  
B. Bigetron by Vitality  
C. SECRET WAG  
D. P Esports

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-sea-fall-winner-prize-pool-distribution-qualified-teams-global-finals> · <https://liquipedia.net/freefire/Free_Fire_World_Series/2026>
- Bằng chứng: "Indonesian club Bigetron by Vitality became the champion"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-088 · nhóm d · dễ

**Bigetron by Vitality, nhà vô địch FFWS SEA 2026 Fall, đến từ quốc gia nào?**

A. Indonesia  
B. Thái Lan  
C. Việt Nam  
D. Philippines

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-sea-fall-winner-prize-pool-distribution-qualified-teams-global-finals>
- Bằng chứng: "Indonesian club Bigetron by Vitality"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-089 · nhóm d · khó

**Đội Việt Nam nào giành á quân FFWS SEA 2026 Fall?**

A. P Esports  
B. Team Flash  
C. SECRET WAG  
D. GOW

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-sea-fall-winner-prize-pool-distribution-qualified-teams-global-finals>
- Bằng chứng: "emerged as the runner-up despite leading the finale's overall standings"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-090 · nhóm d · khó

**Tuyển thủ nào là MVP Grand Finals FFWS SEA 2026 Fall?**

A. WASSANA  
B. Nobru  
C. Kojaa  
D. Fixa

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sportskeeda.com/free-fire/news-ffws-2026-sea-fall-winner-prize-pool-distribution-qualified-teams-global-finals>
- Bằng chứng: (diễn giải) Kojaa (Bigetron by Vitality) là Grand Finals MVP
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-091 · nhóm d · vừa

**Team Flash (Việt Nam) dự FFWS 2022 tổ chức tại đâu?**

A. Bangkok, Thái Lan  
B. Sentosa, Singapore  
C. Rio de Janeiro  
D. Jakarta, Indonesia

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://teamflash.gg/blogs/new/team-flash-vietnam-to-compete-at-sentosa-for-free-fire-world-series-20> · <https://en.wikipedia.org/wiki/Team_Flash>
- Bằng chứng: "took place from 14 to 21 May at Sentosa"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-092 · nhóm d · dễ

**Corinthians, Magic Squad và Fluxo cùng đến từ quốc gia nào?**

A. Brazil  
B. Thái Lan  
C. Mexico  
D. Indonesia

- Đúng: **A**
- Nguồn (tra 12/11/2026): <https://www.oneesports.gg/free-fire/corinthians-win-the-free-fire-world-series-2019/> · <https://www.sportskeeda.com/free-fire/news-free-fire-world-series-ffws-2023-grand-finals-winners-mvp-prize-pool-distribution> · <https://www.oneesports.id/free-fire/fluxo-juara-ffws-global-finals-2024/>
- Bằng chứng: (diễn giải) ba đội Brazil vô địch 2019, 2023, 2024
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — đối chiếu ≥2 nguồn tìm kiếm

### gd-093 · nhóm d · vừa

**LYON, đội vô địch Free Fire EWC 2026, là câu lạc bộ của quốc gia nào?**

A. Brazil  
B. Pháp  
C. Thái Lan  
D. Mexico

- Đúng: **D**
- Nguồn (tra 12/11/2026): <https://www.sportsdunia.com/esports/free-fire-world-series-global-finals-2026-teams-format-and-schedule>
- Bằng chứng: (diễn giải) "Mexican club LYON"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn
- Ghi chú: Tên LYON dễ nhầm với thành phố Lyon (Pháp).

### gd-094 · nhóm d · vừa

**Giải thưởng cho nhà vô địch FFWS 2021 Singapore (Phoenix Force) là bao nhiêu?**

A. 100.000 USD  
B. 1,2 triệu USD  
C. 500.000 USD  
D. 50.000 USD

- Đúng: **C**
- Nguồn (tra 12/11/2026): <https://www.sea.com/news/204>
- Bằng chứng: (diễn giải) "took home ... US$500,000 in prize money"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

### gd-095 · nhóm d · dễ

**FFWS 2019, giải đầu tiên do Corinthians vô địch, có bao nhiêu đội dự chung kết?**

A. 24 đội  
B. 12 đội  
C. 8 đội  
D. 18 đội

- Đúng: **B**
- Nguồn (tra 12/11/2026): <https://www.oneesports.gg/free-fire/corinthians-win-the-free-fire-world-series-2019/>
- Bằng chứng: (diễn giải) "12 teams battling through eight rounds"
- Tin cậy: CẦN NGƯỜI DÙNG XÁC NHẬN — 1 nguồn

## Tổng hợp

Mục tiêu C-0107 là khoảng 42 dễ / 30 vừa / 18 khó. Thực tế lệch sang vừa/khó vì nhóm (d) nhiều câu chi tiết.

| Nhóm | Dễ | Vừa | Khó | Tổng | ≥2 nguồn | 1 nguồn | Khung |
|---|---|---|---|---|---|---|---|
| (a) Bá Vương Đại Chiến — khung | 7 | 7 | 4 | 18 | 0 | 0 | 18 |
| (b) FFWS 2026 Global Finals | 9 | 11 | 6 | 26 | 20 | 6 | 0 |
| (c) 8 đội Bá Vương Đại Chiến — khung | 8 | 6 | 2 | 16 | 0 | 0 | 16 |
| (d) Đội mạnh và lịch sử FFWS | 14 | 12 | 9 | 35 | 25 | 10 | 0 |
| **Tổng** | 38 | 36 | 21 | 95 | 45 | 16 | 34 |

**Câu dùng được ngay sau khi người dùng mở nguồn:** 45 câu đối chiếu ≥2 nguồn (nhóm b + d). Đề xuất ưu tiên các câu này cho buổi 13–14/11.

## Câu rủi ro sai cao nhất

Nên kiểm trước, hoặc bỏ nếu không kịp:

1. **gd-029**: ngưỡng Champion Rush Grand Finals 2026 = 110. Chỉ 1 nguồn. Ngưỡng mỗi giải khác nhau (FFWS VN 2026 Fall dùng 100).
2. **gd-033**: EWC 2026 diễn ra ở Paris. Kế hoạch ban đầu là Riyadh, sau đó dời. Khán giả có thể cãi.
3. **gd-080**: á quân Global Finals 2025 = Fluxo. Một nguồn, ô bảng mơ hồ.
4. **gd-036**, **gd-040**: số đội Việt Nam (3) và số suất SEA (8). Một nguồn, danh sách 24 đội bị thiếu 2 suất.
5. **gd-089**, **gd-090**: á quân và MVP SEA 2026 Fall. Một nguồn.
6. **gd-081**, **gd-082**: FMVP và vô địch Clash Squad 2025. Một nguồn mỗi câu.
7. **gd-086**: SECRET WAG xong Champion Rush trong 6 trận. Một nguồn.
8. **gd-073**: á quân 2024 = RRQ Kazu. Nguồn tiếng Bồ Đào Nha duy nhất.
9. **gd-023**, **gd-039**: ngày Grand Finals 28/11 và Last Chance 27/11. Giải đang diễn ra, lịch có thể dời.
10. **gd-043**: Bangkok đăng cai năm 2023. Nguồn cho năm 2022 mâu thuẫn, nên 2022 đã được loại khỏi đáp án.
11. **gd-093**: LYON là câu lạc bộ Mexico. Một nguồn, và tên dễ nhầm với thành phố Lyon (Pháp).

**Đã cố ý không đưa vào:**
- Nhà vô địch FFWS 2022: các nguồn mâu thuẫn (Attack All Around ở Sentosa / EVOS Phoenix ở Bangkok).
- Vô địch FFWS Vietnam 2026 Fall: chỉ có một bảng Liquipedia không mở được.
- Mọi bảng điểm FFWS 2026 hiện tại.
