# Chuẩn bị theme: Màu Kiểm Tra

Thay ảnh/audio/video trong assets/ hoặc cập nhật đường dẫn tương đối trong theme.json. Mỗi tệp asset tối đa 50 MB. Không đổi bố cục, vị trí hay kích thước khung.

Ảnh nền phải là một lớp riêng không có chữ/khung UI. Ảnh mẫu dựng sẵn cả giao diện không dùng làm nền.
Chibi và MC phải đủ số khung/dáng như bản mặc định: đủ pose MC trong manifest.json, chibi sảnh và đủ dáng Top 2/Top 3 cho từng nhân vật có thể thắng.

| Slot | Tệp hiện tại / dự phòng | Kích thước px đang hiển thị | Định dạng | Trong suốt | Màn hình / khung | Đã thay? |
|---|---|---|---|---|---|---|
| arena.background | assets/arena/bg.jpg | 1080 × 1920 px (toàn khung; ảnh được cover/crop) | JPG; chấp nhận JPG, PNG, WEBP | Không | Sảnh/đấu trường; chỉ ảnh nền sạch, không chữ hoặc khung UI. | [ ] |
| arena.questionBackground | assets/arena/bg-question-user.jpg | 1080 × 1920 px (toàn khung; ảnh được cover/crop) | JPG; chấp nhận JPG, PNG, WEBP | Không | Câu hỏi và công bố đáp án; chỉ ảnh nền sạch, không chữ hoặc khung UI. | [ ] |
| arena.flag.0 | assets/arena/flags/flag-1.png | 70 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 1 bên trái đấu trường. | [ ] |
| arena.flag.1 | assets/arena/flags/flag-2.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 2 bên trái đấu trường. | [ ] |
| arena.flag.2 | assets/arena/flags/flag-3.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 3 bên trái đấu trường. | [ ] |
| arena.flag.3 | assets/arena/flags/flag-4.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 4 bên trái đấu trường. | [ ] |
| arena.flag.4 | assets/arena/flags/flag-5.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 5 bên phải đấu trường. | [ ] |
| arena.flag.5 | assets/arena/flags/flag-6.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 6 bên phải đấu trường. | [ ] |
| arena.flag.6 | assets/arena/flags/flag-7.png | 58 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 7 bên phải đấu trường. | [ ] |
| arena.flag.7 | assets/arena/flags/flag-8.png | 70 px rộng, cao theo tỷ lệ ảnh | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có (PNG/SVG) | Cờ 8 bên phải đấu trường. | [ ] |
| arena.loopVideoWebm | assets/arena/bg-loop.webm | 1080 × 1920 px vùng phủ; ưu tiên video dọc | WEBM; chấp nhận WEBM | Không | Video nền lặp trong câu hỏi/REVEAL và Victory. | [ ] |
| arena.loopVideoMp4 | assets/arena/bg-loop.mp4 | 1080 × 1920 px vùng phủ; ưu tiên video dọc | MP4; chấp nhận MP4 | Không | Bản dự phòng video nền lặp. | [ ] |
| brand.logo | assets/brand/logo.png | 440 × 182 px header; 420 × 350 px Victory; 270 × 210 px legacy | PNG; chấp nhận PNG, WEBP, SVG | Nên có | Logo thương hiệu ở header và Victory; giữ nguyên khung hiển thị. | [ ] |
| chibi.bankDir | assets/chibi | 92 × 104 px khung ghế; 70 × 78 px khi có ngai | PNG, JPG, WEBP, GIF, SVG; chấp nhận PNG, JPG, WEBP, GIF, SVG | Nên có | Ngân hàng chibi; đủ tất cả nhân vật đang dùng và các dáng. | [ ] |
| chibi.podiumDir | assets/chibi/dang-top2-top3 | 166 × 385 px (Top 2/3); 178 × 415 px (Top 1) khung ảnh | PNG, JPG, WEBP, GIF, SVG; chấp nhận PNG, JPG, WEBP, GIF, SVG | Nên có | Thư mục assets/chibi/dang-top2-top3/top2 và top3; đủ hai dáng cho mỗi nhân vật có thể thắng. | [ ] |
| mc.static | assets/mc/kelly.png | 250 × 290 px cơ sở; khung đổi theo cảnh (180 × 208 đến 280 × 390 px) | PNG; chấp nhận PNG, JPG, WEBP, GIF, SVG | Nên có | Ảnh tĩnh dự phòng MC Kelly trong mọi cảnh. | [ ] |
| mc.sequenceDir | assets/mc/kelly | 250 × 290 px cơ sở; khung đổi theo cảnh (180 × 208 đến 280 × 390 px) | PNG, JPG, WEBP, GIF, SVG, JSON manifest; chấp nhận PNG, JPG, WEBP, GIF, SVG, JSON manifest | Nên có | Chuỗi pose MC; cần manifest và đủ khung idle/welcome/ask/react/celebrate. | [ ] |
| throne.bankDir | assets/throne | Ngai ghế 400 × 400 px; dáng Top 1 Victory 440 × 520 px | PNG, JPG, WEBP, GIF, SVG; chấp nhận PNG, JPG, WEBP, GIF, SVG | Nên có | Ngai trống/ngai theo characterId và dáng Top 1 Victory trong cùng slot. | [ ] |
| victory.background | assets/victory/bg.jpg | 1080 × 1920 px (cover toàn khung) | JPG; chấp nhận JPG, PNG, WEBP | Không | Nền Victory. | [ ] |
| victory.userCover | assets/victory/bg-user-cover.jpg | 1080 × 1920 px (cover toàn khung) | JPG; chấp nhận JPG, PNG, WEBP | Không | Ảnh nền sự kiện Victory; ưu tiên ảnh riêng không có UI. | [ ] |
| victory.trophyStage | assets/victory/trophy-stage.png | 1620 × 990 px được co/crop trong vùng 1080 × 900 px | PNG; chấp nhận PNG, JPG, WEBP, SVG | Nên có | Sân khấu Victory; khung được CSS giữ nguyên. | [ ] |
| audio.question-enter | assets/audio/question-enter | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Hiệu ứng mở câu hỏi. | [ ] |
| audio.countdown-tick | assets/audio/countdown-tick | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Tiếng tích đếm ngược. | [ ] |
| audio.timeout | assets/audio/timeout | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Hết thời gian. | [ ] |
| audio.correct-answer | assets/audio/correct-answer | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Công bố đáp án đúng. | [ ] |
| audio.top10 | assets/audio/top10 | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Chuyển sang Top 10. | [ ] |
| audio.victory | assets/audio/victory | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Cue chiến thắng ngắn. | [ ] |
| audio.transition | assets/audio/transition | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Chuyển cảnh. | [ ] |
| audio.victory-music-1 | assets/audio/victory-music-1 | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Nhạc vinh danh lượt 1. | [ ] |
| audio.victory-music-2 | assets/audio/victory-music-2 | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Nhạc vinh danh lượt 2. | [ ] |
| audio.bgm-lobby | assets/audio/bgm-lobby | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Nhạc nền sảnh. | [ ] |
| audio.bgm-game | assets/audio/bgm-game | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Nhạc nền trong câu hỏi. | [ ] |
| audio.bgm | assets/audio/bgm | Không áp dụng | MP3, OGG, WAV; chấp nhận MP3, OGG, WAV | Không áp dụng | Nhạc nền dự phòng. | [ ] |

Các khung SVG/CSS, bảng, chữ HUD và vị trí seat được cố định để giữ nguyên hình học. Theme chỉ thay asset, màu, font, âm thanh, MC/chibi và chữ tiêu đề.
