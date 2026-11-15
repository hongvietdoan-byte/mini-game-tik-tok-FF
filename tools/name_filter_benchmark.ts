import { performance } from 'node:perf_hooks';
import {
  DEFAULT_NAME_FILTER_RULES,
  DEFAULT_NAME_FILTER_GROUP_POLICY,
  DEFAULT_PROTECTED_ENTITIES,
  filterPlayerName,
  type NameFilterConfig,
} from '../packages/name-filter/src/index';
import { CLEAN_NAME_CORPUS } from '../packages/name-filter/src/clean-name-corpus';

const repeats = 20;
const perBatch = 10_000;
const config: NameFilterConfig = {
  rules: [], whitelist: [], hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [], version: 1,
};
const families = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
const middles = ['Minh', 'Anh', 'Thị', 'Văn', 'Ngọc', 'Hải', 'Thu', 'Quốc', 'Thanh', 'Bảo'];
const given = ['An', 'Bình', 'Châu', 'Dung', 'Giang', 'Hạnh', 'Khoa', 'Lan', 'Mai', 'Nam'];
const cleanNames = Array.from({ length: perBatch }, (_, index) =>
  `${families[Math.floor(index / 100) % families.length]} ${middles[Math.floor(index / 10) % middles.length]} ${given[index % given.length]} ${index + 1}`,
);
// Curated synthetic combinations of ordinary Vietnamese name components;
// keep this distinct from a real-user or independently hand-labeled corpus.
const curatedCleanNames = Array.from({ length: 500 }, (_, index) =>
  `${families[Math.floor(index / 50)]} ${middles[Math.floor(index / 5) % middles.length]} ${given[index % 5]}`,
);
const adversarialCases = [
  { name: 'địt', group: 'PROFANITY' }, { name: 'd1t', group: 'PROFANITY' },
  { name: 'đ.ị.t', group: 'PROFANITY' }, { name: 'd m', group: 'PROFANITY' },
  { name: 'l0n', group: 'PROFANITY' }, { name: 'c.c', group: 'PROFANITY' },
  { name: 'Tên đồ ngu', group: 'PROFANITY' }, { name: 'Tên đồ chó', group: 'PROFANITY' },
  { name: 'DZ0-KH0-DI3N', group: 'PROFANITY' }, { name: 'Cường bố dại MVP', group: 'PROFANITY' },
  { name: 'fan biet chung toc', group: 'HATE_SPEECH' },
  { name: 'porn', group: 'NSFW_SEXUAL' }, { name: 'xex', group: 'NSFW_SEXUAL' }, { name: 'nigger', group: 'HATE_SPEECH' },
  { name: 'giết người', group: 'ILLEGAL_HARMFUL' },
  { name: 'người chơi cá độ', group: 'ILLEGAL_HARMFUL' },
  { name: 'https://quiz.example.vn', group: 'ILLEGAL_HARMFUL' },
  { name: 'Liên hệ 0912 345 678', group: 'ILLEGAL_HARMFUL' },
  { name: 'kêu gọi biểu tình', group: 'ILLEGAL_HARMFUL' },
  { name: 'Garena Official', group: 'IMPERSONATION' }, { name: 'Free Fire MAX fake', group: 'IMPERSONATION' },
  { name: 'BTC trao thưởng', group: 'IMPERSONATION' }, { name: 'admin support' },
].map((item) => {
  const result = filterPlayerName(item.name, null, config, DEFAULT_NAME_FILTER_RULES, { protectedEntities: DEFAULT_PROTECTED_ENTITIES });
  return { ...item, detected: result.risk !== 'NONE', matchedGroups: result.matchedRuleGroups };
});

const heapBefore = process.memoryUsage().heapUsed;
let peakHeap = heapBefore;
for (const name of cleanNames.slice(0, 1_000))
  filterPlayerName(name, null, config, DEFAULT_NAME_FILTER_RULES, { protectedEntities: DEFAULT_PROTECTED_ENTITIES });

const batchesMs: number[] = [];
let falsePositives = 0;
for (let repeat = 0; repeat < repeats; repeat += 1) {
  const started = performance.now();
  for (let index = 0; index < cleanNames.length; index += 1) {
    const result = filterPlayerName(cleanNames[index]!, null, config, DEFAULT_NAME_FILTER_RULES, { protectedEntities: DEFAULT_PROTECTED_ENTITIES });
    if (repeat === 0 && result.risk !== 'NONE') falsePositives += 1;
    if (index % 1_000 === 0) peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
  }
  batchesMs.push(performance.now() - started);
}
const curatedFalsePositives = curatedCleanNames.filter((name) =>
  filterPlayerName(name, null, config, DEFAULT_NAME_FILTER_RULES, { protectedEntities: DEFAULT_PROTECTED_ENTITIES }).risk !== 'NONE',
).length;
const reviewedCleanFalsePositives = CLEAN_NAME_CORPUS.filter((name) =>
  filterPlayerName(name, null, config, DEFAULT_NAME_FILTER_RULES, { protectedEntities: DEFAULT_PROTECTED_ENTITIES }).risk !== 'NONE',
).length;
const adversarialGroups = ['PROFANITY', 'NSFW_SEXUAL', 'HATE_SPEECH', 'ILLEGAL_HARMFUL', 'IMPERSONATION'] as const;

const sorted = [...batchesMs].sort((a, b) => a - b);
const percentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0;
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
console.log(JSON.stringify({
  namesPerBatch: perBatch,
  repeats,
  batchMs: batchesMs.map((value) => Number(value.toFixed(2))),
  medianMs: Number(median.toFixed(2)),
  p95Ms: Number(percentile(0.95).toFixed(2)),
  medianMicrosecondsPerName: Number(((median * 1_000) / perBatch).toFixed(2)),
  p95MicrosecondsPerName: Number(((percentile(0.95) * 1_000) / perBatch).toFixed(2)),
  falsePositives: `${falsePositives}/${perBatch}`,
  curatedSyntheticFalsePositives: `${curatedFalsePositives}/${curatedCleanNames.length}`,
  reviewedCleanCorpusFalsePositives: `${reviewedCleanFalsePositives}/${CLEAN_NAME_CORPUS.length}`,
  adversarialFalseNegatives: `${adversarialCases.filter((item) => !item.detected).length}/${adversarialCases.length}`,
  defaultRulesByGroup: Object.fromEntries(adversarialGroups.map((group) => [group, {
    defaultSeverity: DEFAULT_NAME_FILTER_GROUP_POLICY.find((policy) => policy.group === group)?.defaultSeverity,
    ruleCount: DEFAULT_NAME_FILTER_RULES.filter((rule) => rule.group === group).length + (group === 'ILLEGAL_HARMFUL' ? 2 : 0),
    severityCounts: Object.fromEntries(['PARTIAL', 'REVIEW', 'HIGH'].map((severity) => [
      severity, DEFAULT_NAME_FILTER_RULES.filter((rule) => rule.group === group && rule.severity === severity).length +
        (group === 'ILLEGAL_HARMFUL' && severity === 'REVIEW' ? 2 : 0),
    ])),
  }])),
  adversarialByGroup: Object.fromEntries(adversarialGroups.map((group) => {
    const cases = adversarialCases.filter((item) => item.group === group);
    return [group, { detected: cases.filter((item) => item.matchedGroups.includes(group)).length, total: cases.length }];
  })),
  peakHeapDeltaBytesSampled: Math.max(0, peakHeap - heapBefore),
}, null, 2));
