---
id: X-0008
from: codex1
to: coordinator
type: question
title: C-0002: sanitizer làm vỡ emoji ZWJ
ref: C-0002
priority: normal
needs: 
created: 2026-11-11T11:33:34+07:00
---
LỖI phát hiện ở `sanitizeDisplayName`: regex `[​-‏]` xóa cả U+200D ZWJ, nên tên `12345👨‍👩‍👧‍👦XYZ` bị tách emoji gia đình trước khi cắt grapheme. Test hồi quy nằm trong `answers.test.ts` dưới `it.fails`.
Đề xuất sửa regex tổng quát để không xóa U+200D, rồi xóa ZWJ nếu không kẹp giữa ký tự `Extended_Pictographic`:
```diff
- .replace(/[\\u0000-\\u001F\\u007F-\\u009F​-‏‪-‮⁠-⁩﻿]/g, '')
+ .replace(/[\\u0000-\\u001F\\u007F-\\u009F\\u200B\\u200C\\u200E\\u200F\\u202A-\\u202E\\u2060-\\u206F\\uFEFF]/g, '')
+ .replace(/(?<!\\p{Extended_Pictographic})\\u200D|\\u200D(?!\\p{Extended_Pictographic})/gu, '')
```
Có thể chốt regex theo cách phù hợp hơn, miễn giữ emoji ZWJ hợp lệ và vẫn bỏ ký tự ẩn không hợp lệ.
