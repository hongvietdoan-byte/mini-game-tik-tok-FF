import { QuestionSchema } from '@quiz/contracts';

export const DEMO_PACK = { id: 'demo', name: 'Gói DEMO — kiến thức chung' } as const;

type QuestionRow = {
  subtopicId: string;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
  explanation: string;
};

const ROWS: QuestionRow[] = [
  { subtopicId: 'demo-dia-ly', prompt: 'Trong một chuyến tìm hiểu các thành phố lớn ở Đông Á, bạn đọc thấy nơi đặt trụ sở chính phủ và hoàng cung của Nhật Bản cũng là trung tâm kinh tế đông dân; thành phố đó có tên gì trong nhiều thời kỳ?', answer: 'Tokyo', distractors: ['Osaka', 'Kyoto', 'Sapporo'], explanation: 'Tokyo là thủ đô của Nhật Bản.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Đại dương nào nằm giữa châu Á và châu Mỹ?', answer: 'Thái Bình Dương', distractors: ['Đại Tây Dương', 'Ấn Độ Dương', 'Bắc Băng Dương'], explanation: 'Thái Bình Dương nằm giữa châu Á, châu Đại Dương và châu Mỹ.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Kim tự tháp Giza nổi tiếng nằm ở quốc gia nào?', answer: 'Ai Cập', distractors: ['Hy Lạp', 'Ấn Độ', 'Mexico'], explanation: 'Quần thể kim tự tháp Giza nằm gần Cairo, Ai Cập.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Đỉnh Everest thuộc dãy núi nào?', answer: 'Himalaya', distractors: ['Alps', 'Andes', 'Rocky'], explanation: 'Everest là đỉnh cao nhất của dãy Himalaya.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Quốc gia nào có hình dáng thường được ví như chiếc ủng?', answer: 'Ý', distractors: ['Tây Ban Nha', 'Bồ Đào Nha', 'Na Uy'], explanation: 'Bán đảo Ý có đường viền giống một chiếc ủng.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Sông Nile chảy chủ yếu qua châu lục nào?', answer: 'Châu Phi', distractors: ['Châu Á', 'Châu Âu', 'Nam Mỹ'], explanation: 'Sông Nile nằm ở đông bắc châu Phi.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Thủ đô của Canada là thành phố nào?', answer: 'Ottawa', distractors: ['Toronto', 'Vancouver', 'Montreal'], explanation: 'Ottawa là thủ đô của Canada.' },
  { subtopicId: 'demo-dia-ly', prompt: 'Trên bản đồ thế giới, dải hoang mạc khô nóng rộng lớn này trải dài qua nhiều quốc gia ở phía bắc của lục địa, có cồn cát, cao nguyên đá và rất ít mưa; đó là sa mạc nào suốt nhiều tháng trong năm?', answer: 'Châu Phi', distractors: ['Châu Á', 'Châu Úc', 'Châu Âu'], explanation: 'Sahara trải rộng ở phía bắc châu Phi.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Ở áp suất khí quyển thông thường, nước tinh khiết đóng băng ở nhiệt độ nào?', answer: '0°C', distractors: ['-10°C', '10°C', '32°C'], explanation: 'Điểm đóng băng của nước tinh khiết là 0°C ở áp suất chuẩn.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Hành tinh nào được gọi là hành tinh đỏ?', answer: 'Sao Hỏa', distractors: ['Sao Kim, hành tinh có khí quyển dày và nhiệt độ bề mặt rất cao quanh năm', 'Sao Mộc', 'Sao Thủy'], explanation: 'Bề mặt giàu oxit sắt khiến Sao Hỏa có màu đỏ.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Cây xanh hấp thụ khí nào trong quá trình quang hợp?', answer: 'Carbon dioxide — khí cây hấp thụ để tạo chất hữu cơ khi quang hợp', distractors: ['Oxy do lá cây tạo ra và thải vào không khí trong quá trình quang hợp ban ngày', 'Nitơ', 'Heli'], explanation: 'Quang hợp sử dụng carbon dioxide, nước và năng lượng ánh sáng.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Cơ quan nào bơm máu đi khắp cơ thể người?', answer: 'Tim', distractors: ['Phổi', 'Gan', 'Thận'], explanation: 'Tim co bóp để đưa máu qua hệ tuần hoàn.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Ánh sáng nhìn thấy truyền nhanh nhất trong môi trường nào?', answer: 'Chân không', distractors: ['Nước', 'Thủy tinh', 'Không khí ẩm'], explanation: 'Trong chân không, ánh sáng truyền với tốc độ lớn nhất.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Động vật có vú nuôi con bằng cách nào?', answer: 'Tiết sữa', distractors: ['Đẻ trứng có vỏ', 'Dùng lá cây', 'Tạo mật'], explanation: 'Đặc điểm tiêu biểu của động vật có vú là nuôi con bằng sữa.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Lực nào giữ các hành tinh chuyển động quanh Mặt Trời?', answer: 'Lực hấp dẫn', distractors: ['Lực ma sát', 'Lực đàn hồi', 'Lực đẩy nổi'], explanation: 'Lực hấp dẫn giữa Mặt Trời và các hành tinh duy trì quỹ đạo.' },
  { subtopicId: 'demo-khoa-hoc', prompt: 'Âm thanh không thể truyền qua môi trường nào?', answer: 'Chân không', distractors: ['Nước', 'Không khí', 'Thép'], explanation: 'Âm thanh cần môi trường vật chất để truyền.' },
  { subtopicId: 'demo-toan', prompt: 'Tổng của 18 và 24 bằng bao nhiêu?', answer: '42', distractors: ['40', '41', '44'], explanation: '18 + 24 = 42.' },
  { subtopicId: 'demo-toan', prompt: 'Một hình vuông có cạnh dài 5 cm. Chu vi của hình vuông là bao nhiêu?', answer: '20 cm', distractors: ['10 cm', '15 cm', '25 cm'], explanation: 'Chu vi hình vuông bằng bốn lần độ dài cạnh.' },
  { subtopicId: 'demo-toan', prompt: 'Một nửa của 3/4 là phân số nào?', answer: '3/8', distractors: ['3/2', '2/7', '1/4'], explanation: '3/4 chia cho 2 bằng 3/8.' },
  { subtopicId: 'demo-toan', prompt: 'Số nguyên tố nhỏ nhất lớn hơn 10 là số nào?', answer: '11', distractors: ['12', '13', '15'], explanation: '11 chỉ chia hết cho 1 và chính nó.' },
  { subtopicId: 'demo-toan', prompt: 'Nếu x + 7 = 19 thì x bằng bao nhiêu?', answer: '12', distractors: ['10', '11', '13'], explanation: 'Lấy 19 trừ 7 được x = 12.' },
  { subtopicId: 'demo-toan', prompt: 'Diện tích hình chữ nhật dài 8 cm, rộng 3 cm là bao nhiêu?', answer: '24 cm²', distractors: ['11 cm²', '22 cm²', '48 cm²'], explanation: 'Diện tích bằng chiều dài nhân chiều rộng: 8 × 3.' },
  { subtopicId: 'demo-toan', prompt: 'Góc vuông có số đo bao nhiêu độ?', answer: '90°', distractors: ['45°', '60°', '180°'], explanation: 'Một góc vuông có số đo 90 độ.' },
  { subtopicId: 'demo-toan', prompt: 'Trung bình cộng của 4, 6 và 8 là bao nhiêu?', answer: '6', distractors: ['5', '7', '18'], explanation: '(4 + 6 + 8) ÷ 3 = 6.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Từ nào đồng nghĩa gần nhất với “dũng cảm”?', answer: 'Can đảm', distractors: ['Rụt rè', 'Lơ đãng', 'Mệt mỏi'], explanation: '“Can đảm” có nghĩa gần với “dũng cảm”.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Trong câu “Lan đọc sách”, từ nào là động từ?', answer: 'đọc', distractors: ['Lan', 'sách', 'trong'], explanation: '“Đọc” chỉ hoạt động.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Một bài thơ lục bát thường luân phiên các dòng có bao nhiêu tiếng?', answer: '6 và 8', distractors: ['5 và 7', '7 và 7', '8 và 10'], explanation: 'Thể thơ lục bát thường gồm dòng sáu tiếng xen dòng tám tiếng.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Từ trái nghĩa với “rộng” là từ nào?', answer: 'Hẹp', distractors: ['Dài', 'Cao', 'Sâu'], explanation: '“Hẹp” là từ trái nghĩa với “rộng”.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Trong tiếng Việt, dấu hỏi được đặt trên nguyên âm nào trong từ “mỏi”?', answer: 'o', distractors: ['m', 'i', 'l'], explanation: 'Dấu hỏi trong “mỏi” đặt trên nguyên âm o.' },
  { subtopicId: 'demo-ngon-ngu', prompt: 'Thành ngữ “nước đến chân mới nhảy” thường nhắc đến thói quen trì hoãn việc chuẩn bị cho tới khi thời hạn hoặc tình huống cấp bách đã ở rất gần; ý nghĩa phù hợp nhất là gì?', answer: 'Chỉ làm khi đã sát hạn', distractors: ['Chuẩn bị từ rất sớm', 'Thích bơi lội mỗi ngày', 'Luôn giúp đỡ người khác'], explanation: 'Thành ngữ chỉ việc chậm chuẩn bị, đợi sát lúc mới hành động.' },
  { subtopicId: 'demo-the-thao', prompt: 'Một đội bóng đá có bao nhiêu cầu thủ trên sân khi trận đấu bắt đầu?', answer: '11', distractors: ['9', '10', '12'], explanation: 'Mỗi đội có 11 cầu thủ trên sân khi bắt đầu trận.' },
  { subtopicId: 'demo-the-thao', prompt: 'Trong quần vợt, điểm số 40–40 được gọi bằng thuật ngữ nào?', answer: 'Deuce', distractors: ['Ace', 'Break', 'Love'], explanation: 'Deuce là trạng thái hòa 40–40 trong một game.' },
  { subtopicId: 'demo-the-thao', prompt: 'Vận động viên chạy marathon thi đấu trên quãng đường xấp xỉ bao nhiêu km?', answer: '42,195 km', distractors: ['21 km', '30 km', '50 km'], explanation: 'Cự ly marathon tiêu chuẩn là 42,195 km.' },
  { subtopicId: 'demo-the-thao', prompt: 'Trong bóng rổ, một cú ném thành công từ ngoài vạch ba điểm thường được tính mấy điểm?', answer: '3 điểm', distractors: ['1 điểm', '2 điểm', '4 điểm'], explanation: 'Cú ném hợp lệ từ ngoài vạch được tính ba điểm.' },
  { subtopicId: 'demo-the-thao', prompt: 'Ở môn cờ vua, quân nào có thể đi theo hàng ngang, hàng dọc và đường chéo?', answer: 'Hậu', distractors: ['Xe', 'Tượng', 'Mã'], explanation: 'Hậu kết hợp cách đi của xe và tượng.' },
  { subtopicId: 'demo-the-thao', prompt: 'Trong bơi tự do, kiểu bơi nào thường được dùng để đạt tốc độ cao nhất?', answer: 'Bơi sải', distractors: ['Bơi ếch', 'Bơi ngửa', 'Bơi bướm'], explanation: 'Bơi sải thường là kiểu bơi nhanh nhất trong thi đấu tự do.' },
];

const DIFFICULTIES = [
  ...Array(16).fill('EASY'),
  ...Array(12).fill('MEDIUM'),
  ...Array(8).fill('HARD'),
] as const;

export const DEMO_QUESTIONS: (typeof QuestionSchema)['_input'][] = ROWS.map((row, index) => {
  const correctIndex = index % 4;
  const options = [...row.distractors];
  options.splice(correctIndex, 0, row.answer);
  return {
    id: `demo-${String(index + 1).padStart(3, '0')}`,
    packId: DEMO_PACK.id,
    subtopicId: row.subtopicId,
    prompt: row.prompt,
    options: options.map((text, optionIndex) => ({ id: `o${optionIndex + 1}`, text })),
    correctOptionId: `o${correctIndex + 1}`,
    explanation: row.explanation,
    difficulty: DIFFICULTIES[index]!,
    tags: ['demo'],
    verificationStatus: 'DEMO',
    approvalStatus: 'APPROVED',
  };
});

const first = DEMO_QUESTIONS[0]!;
export const INVALID_QUESTION_SAMPLES: unknown[] = [
  { ...first, id: 'invalid-three-options', options: first.options.slice(0, 3) },
  {
    ...first,
    id: 'invalid-duplicate-option-text',
    options: first.options.map((option, index) => ({ ...option, text: index === 1 ? first.options[0]!.text : option.text })),
  },
  { ...first, id: 'invalid-correct-option', correctOptionId: 'missing' },
  { ...first, id: 'invalid-empty-prompt', prompt: '   ' },
  { ...first, id: 'invalid-long-prompt', prompt: 'x'.repeat(221) },
];
