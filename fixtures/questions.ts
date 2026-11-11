import { QuestionSchema } from '@quiz/contracts';

export const DEMO_PACK = { id: 'demo', name: 'Gói DEMO — Free Fire (đề xuất, chờ người dùng duyệt)' } as const;

type QuestionRow = {
  subtopicId: string;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
  explanation: string;
};

const ROWS: QuestionRow[] = [
  {
    subtopicId: 'ff-che-do',
    prompt: 'Trong Battle Royale, bạn đang đi cùng đồng đội, nhặt trang bị và theo dõi vùng an toàn đang thu hẹp. Mục tiêu tổng quát nào mô tả đúng điều cần đạt để thắng trận, thay vì chỉ hoàn thành một hành động phụ như nhặt đồ?',
    answer: 'Sinh tồn đến cuối trận để giành Booyah',
    distractors: ['Mua đủ vũ khí trong cửa hàng của mỗi vòng', 'Chiếm một căn cứ cố định và giữ nguyên đến hết trận', 'Hoàn thành mọi bài tập trong khu vực luyện tập'],
    explanation: 'Battle Royale tập trung vào sinh tồn và kết thúc bằng chiến thắng Booyah.',
  },
  {
    subtopicId: 'ff-che-do',
    prompt: 'Chế độ nào của Free Fire được tổ chức thành các vòng giao tranh giữa hai đội, thay vì một trận Battle Royale kéo dài trên bản đồ rộng?',
    answer: 'Clash Squad',
    distractors: ['Battle Royale', 'Training Grounds', 'Battle Royale Ranked'],
    explanation: 'Clash Squad là chế độ giao tranh theo đội qua từng vòng.',
  },
  {
    subtopicId: 'ff-che-do',
    prompt: 'Người chơi muốn thử cách ngắm bắn và làm quen với vũ khí trong khu luyện tập trước khi vào trận thì nên chọn khu vực nào?',
    answer: 'Training Grounds',
    distractors: ['Battle Royale', 'Clash Squad', 'Battle Royale Ranked'],
    explanation: 'Training Grounds là nơi người chơi có thể luyện tập và thử vũ khí.',
  },
  {
    subtopicId: 'ff-che-do',
    prompt: 'Đặc điểm nào mô tả đúng nhịp trận của Clash Squad trong Free Fire?',
    answer: 'Các vòng giao tranh nối tiếp nhau giữa hai đội',
    distractors: ['Một hành trình khám phá không có đối thủ', 'Một trận sinh tồn duy nhất trên bản đồ rộng', 'Một bài tập ngắm bắn không có kết quả thắng thua'],
    explanation: 'Clash Squad sử dụng cấu trúc thi đấu theo vòng giữa hai đội.',
  },
  {
    subtopicId: 'ff-che-do',
    prompt: 'Trong ví dụ Clash Squad 4v4 được nêu trong ghi chú cập nhật chính thức của Garena, mỗi đội có bao nhiêu người?',
    answer: '4 người',
    distractors: ['1 người', '2 người', '8 người'],
    explanation: 'Ghi chú Garena mô tả một biến thể Clash Squad 4v4; cách tổ chức có thể thay đổi theo sự kiện.',
  },
  {
    subtopicId: 'ff-che-do',
    prompt: 'Trong Clash Squad, người chơi dùng khu vực mua sắm trong trận để chọn vũ khí và trang bị cho vòng đấu. Khu vực đó thường được gọi là gì?',
    answer: 'CS Store',
    distractors: ['Vending Machine', 'Tactical Market', 'Arsenal'],
    explanation: 'CS Store là cửa hàng trang bị của Clash Squad.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Trang bản đồ chính thức của Free Fire mô tả bản đồ nào là nơi mang lại trải nghiệm Battle Royale cổ điển?',
    answer: 'Bermuda',
    distractors: ['Purgatory', 'Kalahari', 'Alpine'],
    explanation: 'Trang bản đồ Garena gọi Bermuda là trải nghiệm Battle Royale cổ điển.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Bản đồ nào trong Free Fire được Garena giới thiệu với bối cảnh sa mạc?',
    answer: 'Kalahari',
    distractors: ['Bermuda', 'Purgatory', 'Alpine'],
    explanation: 'Dev blog chính thức mô tả Kalahari là chiến trường sa mạc.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Theo ghi chú cập nhật bản đồ Kalahari của Garena, bản đồ nào đã được giới thiệu trước Kalahari với vai trò bản đồ thứ hai của Free Fire?',
    answer: 'Purgatory',
    distractors: ['Bermuda', 'Alpine', 'NeXTerra'],
    explanation: 'Garena gọi Purgatory là bản đồ thứ hai trước khi giới thiệu Kalahari.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Hangar là một địa danh được nhắc đến trong các ghi chú về khu vực nào của Free Fire?',
    answer: 'Bermuda',
    distractors: ['Kalahari', 'Purgatory', 'Alpine'],
    explanation: 'Ghi chú chính thức về Bermuda nhắc đến khu vực Hangar.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Trên trang bản đồ Kalahari của Garena, địa danh nào dưới đây được liệt kê trong bản đồ này?',
    answer: 'Shrines',
    distractors: ['Peak', 'Hangar', 'Shipyard'],
    explanation: 'Trang bản đồ Kalahari liệt kê Shrines là một địa danh.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Địa danh Peak gắn với bản đồ nào trong các trang bản đồ Free Fire?',
    answer: 'Bermuda',
    distractors: ['Kalahari', 'Purgatory', 'Alpine'],
    explanation: 'Peak là một địa danh trên Bermuda.',
  },
  {
    subtopicId: 'ff-ban-do',
    prompt: 'Tên nào dưới đây cũng xuất hiện trong danh sách bản đồ Free Fire do Garena công bố?',
    answer: 'Alpine',
    distractors: ['Sundown', 'Mirage Bay', 'Northpoint'],
    explanation: 'Alpine có trong danh sách bản đồ chính thức của Free Fire.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Cách mô tả nào đúng về công dụng của Gloo Wall trong Free Fire?',
    answer: 'Một bức tường tạm thời giúp tạo vật chắn để người chơi di chuyển an toàn hơn',
    distractors: ['Một khẩu súng dùng để ngắm bắn mục tiêu ở khoảng cách rất xa', 'Một bộ giáp làm tăng lượng vật phẩm có thể mang trong ba lô', 'Một thiết bị chỉ dùng để xem kết quả sau khi trận đấu kết thúc'],
    explanation: 'Garena mô tả Gloo Wall là vật chắn tạm thời giúp người chơi di chuyển an toàn hơn.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Khi nhân vật đã mất máu sau giao tranh, mô tả nào phù hợp nhất với công dụng cơ bản của Med Kit?',
    answer: 'Vật phẩm hồi phục giúp khôi phục máu sau khi nhân vật bị thương trong trận',
    distractors: ['Vật phẩm phòng thủ được đặt xuống để dựng một bức tường chắn', 'Vật phẩm chứa vũ khí và đồ tiếp tế được thả xuống bản đồ', 'Vật phẩm dùng để tăng chỗ chứa đồ trong ba lô của nhân vật'],
    explanation: 'Med Kit là vật phẩm hồi phục được dùng để khôi phục máu.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Trong nhóm trang bị phòng thủ, vật phẩm nào được đội trên đầu nhân vật?',
    answer: 'Mũ bảo hiểm',
    distractors: ['Áo giáp', 'Ba lô', 'Hộp cứu thương'],
    explanation: 'Mũ bảo hiểm là trang bị đội trên đầu.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Trang bị nào được mặc trên thân người để bổ sung giáp trong Free Fire?',
    answer: 'Áo giáp',
    distractors: ['Mũ bảo hiểm', 'Ba lô', 'Hộp cứu thương'],
    explanation: 'Áo giáp là trang bị phòng thủ mặc trên thân người.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Vật phẩm nào giúp người chơi mang theo nhiều đồ hơn trong hành trang?',
    answer: 'Ba lô',
    distractors: ['Mũ bảo hiểm', 'Áo giáp', 'Gloo Wall'],
    explanation: 'Ba lô cung cấp sức chứa cho hành trang.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Trong Battle Royale, vật thể tiếp tế được thả từ trên cao xuống và có thể chứa chiến lợi phẩm thường gọi là gì?',
    answer: 'Airdrop',
    distractors: ['War Chest', 'Arsenal', 'Vending Machine'],
    explanation: 'Airdrop là kiện tiếp tế được thả xuống trong trận.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Loại tiền trong Clash Squad được dùng trong cửa hàng của trận đấu thường có tên viết tắt nào?',
    answer: 'CS Cash',
    distractors: ['FF Coins', 'Kim cương', 'Guild Tokens'],
    explanation: 'CS Cash là tiền trận đấu được dùng trong Clash Squad.',
  },
  {
    subtopicId: 'ff-vat-pham',
    prompt: 'Mũ bảo hiểm và áo giáp thuộc nhóm trang bị nào trong một trận Free Fire?',
    answer: 'Trang bị giáp',
    distractors: ['Vật phẩm hồi phục', 'Vũ khí tầm xa', 'Đồ trang trí hồ sơ'],
    explanation: 'Mũ bảo hiểm và áo giáp đều là trang bị phòng thủ.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong Free Fire, từ nào thường xuất hiện trên kết quả khi người chơi hoặc đội giành chiến thắng Battle Royale?',
    answer: 'Booyah',
    distractors: ['Airdrop', 'Safe Zone', 'Revival'],
    explanation: 'Booyah là dấu hiệu chiến thắng trong Battle Royale.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong Battle Royale, bản đồ đánh dấu khu vực an toàn, còn bên ngoài có thể nguy hiểm và vùng này dần thu hẹp. Khi đồng đội nhắc “vào bo”, họ đang nói đến khu vực nào cần tiến vào để tiếp tục sinh tồn?',
    answer: 'Safe Zone',
    distractors: ['Booyah', 'Airdrop', 'Revival Point'],
    explanation: 'Safe Zone là khu vực an toàn mà người chơi cần hướng tới.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Thuật ngữ nào chỉ kiện tiếp tế được thả xuống bản đồ trong một trận Battle Royale?',
    answer: 'Airdrop',
    distractors: ['Booyah', 'Safe Zone', 'Clash Squad'],
    explanation: 'Airdrop là kiện hàng tiếp tế được thả xuống trong trận.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Khi một cơ chế trong trận đưa người đồng đội đã bị loại trở lại cuộc đấu, hành động đó thường được gọi bằng thuật ngữ nào?',
    answer: 'Revive',
    distractors: ['Loot', 'Heal', 'Respawn'],
    explanation: 'Revive là hồi sinh đồng đội để họ quay lại trận đấu.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong ngôn ngữ game, việc tìm và nhặt vũ khí hoặc vật phẩm trên bản đồ thường được gọi là gì?',
    answer: 'Loot',
    distractors: ['Revive', 'Heal', 'Respawn'],
    explanation: 'Loot là tìm và thu thập vật phẩm trong trận.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong tên viết tắt BR thường dùng khi nói về Free Fire, hai chữ cái đó đại diện cho cụm từ tiếng Anh nào?',
    answer: 'Battle Royale',
    distractors: ['Battle Round', 'Bonus Revival', 'Battle Ranking'],
    explanation: 'BR là cách viết tắt của Battle Royale.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong tên viết tắt CS thường dùng khi nhắc đến một chế độ của Free Fire, hai chữ cái đó đại diện cho tên nào?',
    answer: 'Clash Squad',
    distractors: ['Combat Stage', 'Classic Survival', 'Co-op Story'],
    explanation: 'CS là viết tắt của Clash Squad.',
  },
  {
    subtopicId: 'ff-thuat-ngu',
    prompt: 'Trong giao tiếp của trò chơi, từ “squad” thường chỉ điều gì khi người chơi cùng nhau tham gia một trận?',
    answer: 'Một nhóm đồng đội phối hợp trong trận',
    distractors: ['Một nhóm khán giả cùng theo dõi trận đấu', 'Một nhóm vật phẩm được sắp xếp trong hành trang', 'Một nhóm nhân vật được hiển thị trong bộ sưu tập'],
    explanation: 'Squad là nhóm người chơi phối hợp cùng nhau.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Thương hiệu nào được ghi nhận là nhà phát hành Free Fire?',
    answer: 'Garena',
    distractors: ['Nintendo', 'Valve', 'Ubisoft'],
    explanation: 'Thông tin chính thức của Garena xác nhận Free Fire được phát hành dưới thương hiệu Garena.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Theo phần FAQ chính thức, Free Fire là trò chơi trực tuyến hay trò chơi chỉ chơi ngoại tuyến?',
    answer: 'Trò chơi trực tuyến',
    distractors: ['Trò chơi chỉ chơi ngoại tuyến', 'Trò chơi chỉ chạy trên máy chơi game cầm tay', 'Trò chơi bàn cờ không cần thiết bị'],
    explanation: 'FAQ chính thức mô tả Free Fire là trò chơi trực tuyến.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Garena mô tả Free Fire là trò chơi battle royale dành riêng cho nhóm thiết bị nào?',
    answer: 'Thiết bị di động',
    distractors: ['Máy chơi game tại nhà', 'Máy tính lớn dùng trong trung tâm dữ liệu', 'Máy chơi game cầm tay chuyên dụng'],
    explanation: 'FAQ chính thức mô tả Free Fire là trò chơi battle royale chỉ dành cho thiết bị di động.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Theo FAQ của Garena, người chơi có thể tải Free Fire trên hai hệ sinh thái di động phổ biến nào?',
    answer: 'iOS và Android',
    distractors: ['Windows và Linux', 'PlayStation và Xbox', 'macOS và ChromeOS'],
    explanation: 'FAQ chính thức nêu App Store cho iOS và Google Play cho Android.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Free Fire thường được xếp vào thể loại trò chơi nào?',
    answer: 'Battle Royale',
    distractors: ['Mô phỏng nông trại', 'Đua xe đường trường', 'Giải đố ghép hình'],
    explanation: 'Garena giới thiệu Free Fire là trò chơi thuộc thể loại Battle Royale.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Người dùng Android tìm bản tải chính thức của Free Fire trong cửa hàng ứng dụng nào được FAQ Garena nêu tên?',
    answer: 'Google Play',
    distractors: ['Apple App Store', 'Steam Store', 'Microsoft Store'],
    explanation: 'FAQ chính thức nêu Google Play là nơi tải bản Android.',
  },
  {
    subtopicId: 'ff-tong-quan',
    prompt: 'Người dùng iPhone hoặc iPad tìm bản tải chính thức của Free Fire trong cửa hàng ứng dụng nào được FAQ Garena nêu tên?',
    answer: 'Apple App Store',
    distractors: ['Google Play', 'Steam Store', 'Microsoft Store'],
    explanation: 'FAQ chính thức nêu App Store là nơi tải bản iOS.',
  },
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
    tags: ['demo', 'free-fire'],
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
