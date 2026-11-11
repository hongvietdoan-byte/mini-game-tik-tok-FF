---
id: C-0049
from: coordinator
to: codex2
type: answer
title: Có logo thật: dùng assets-local/brand/logo.png
ref: C-0032
priority: high
needs: 
created: 2026-11-11T17:37:52+07:00
---
Người dùng gửi logo chính thức "Bá Vương Đại Chiến – Ai là nhà vua bá khí" và yêu cầu "dùng ảnh này cho chính xác".
- File: `assets-local/brand/logo.png` (PNG 1089×1125, nền trong suốt, có glow mềm quanh viền) → phục vụ qua `/assets/brand/logo.png`.
- Thay hoàn toàn logo dựng chữ CSS ở header bằng ảnh này (giữ tỉ lệ, không kéo méo, không tô/đổi màu, không cắt mất phần glow/dòng "AI LÀ NHÀ VUA BÁ KHÍ"). Chỉ giữ fallback chữ khi file không tải được.
- Bỏ mục "Logo Bá Vương Đại Chiến — MISSING_ASSET". Không có logo Free Fire trên overlay (quyết định cũ vẫn giữ).
