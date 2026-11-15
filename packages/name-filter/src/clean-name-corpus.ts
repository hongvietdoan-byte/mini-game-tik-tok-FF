const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'] as const;
const middleNames = ['Minh', 'Anh', 'Thị', 'Văn', 'Ngọc'] as const;
const givenNames = ['An', 'Bình', 'Châu', 'Dung', 'Giang'] as const;

const commonVietnameseNames = familyNames.flatMap((family) =>
  middleNames.flatMap((middle) => givenNames.map((given) => `${family} ${middle} ${given}`)),
);

const gamerHandles = [
  'CuongGaming', 'DucPro', 'LocMVP', 'BichXinh', 'DungTop1', 'Cuc_99', 'PhucFF', 'KhoaKiller',
  'DzungDragon', 'TeamChienThang', 'StormKing', 'KellyLive', 'BVD.Champion', 'MVP_An', 'BanMai77',
  'Player_2026', 'BluePhoenix', 'NoScopeVN', 'ChauChau', 'MinhAnh.exe', 'BacKy', 'NamKy', 'BinhMinh',
  'ThangLong', 'Classic', 'Dickens', 'Scunthorpe', 'CucMay', 'LocPhat', 'DucAnh', 'BichNgoc',
  'XuanSang', 'XinhXan', 'SangXuan',
] as const;

/** Bộ sạch gán nhãn theo cấu trúc tên phổ biến và handle game; không chứa dữ liệu người dùng thật. */
export const CLEAN_NAME_CORPUS: readonly string[] = [
  ...commonVietnameseNames,
  ...gamerHandles,
  'Cường', 'Đức', 'Lộc', 'Bích', 'Dũng', 'Cúc', 'Phúc', 'Dzung', 'Bắc Kỳ', 'Nam Kỳ',
];
