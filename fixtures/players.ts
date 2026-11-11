export type FixturePlayer = { userId: string; displayName: string };

export const EDGE_CASE_PLAYERS: FixturePlayer[] = [
  { userId: 'sim-0001', displayName: 'Nguyễn Thị Ánh Tuyết' },
  { userId: 'sim-0002', displayName: 'Trần Bảo Minh An Khánh Hoàng Gia Tuấn Phúc Thiên Long Vĩnh Viễn' },
  { userId: 'sim-0003', displayName: 'Gia đình 👨‍👩‍👧‍👦 vui vẻ' },
  { userId: 'sim-0004', displayName: '<script>alert(1)</script>' },
  { userId: 'sim-0005', displayName: '<img src=x onerror=1>' },
  { userId: 'sim-0006', displayName: 'Tên‮đảo chiều' },
  { userId: 'sim-0007', displayName: '   ' },
  { userId: 'sim-0008', displayName: 'Ｔｅ̂ｎ Ｆｕｌｌｗｉｄｔｈ' },
  { userId: 'sim-0009', displayName: 'Minh Anh' },
  { userId: 'sim-0010', displayName: 'Minh Anh' },
];

const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ'];
const MIDDLE = ['Minh', 'Bảo', 'Gia', 'Thanh', 'Quốc', 'Hải', 'Khánh', 'Ngọc'];
const GIVEN = ['An', 'Bình', 'Chi', 'Duy', 'Hà', 'Linh', 'Nam', 'Vy'];

function seededValue(seed: number, index: number): number {
  let value = (seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function makeSimPlayers(n: number, seed = 1): FixturePlayer[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n phải là số nguyên không âm');
  const players = EDGE_CASE_PLAYERS.slice(0, n).map((player) => ({ ...player }));
  for (let index = players.length; index < n; index += 1) {
    const value = seededValue(seed, index);
    const family = FAMILY[value % FAMILY.length]!;
    const middle = MIDDLE[(value >>> 5) % MIDDLE.length]!;
    const given = GIVEN[(value >>> 10) % GIVEN.length]!;
    players.push({
      userId: `sim-${String(index + 1).padStart(4, '0')}`,
      displayName: `${family} ${middle} ${given} ${index + 1}`,
    });
  }
  return players;
}
