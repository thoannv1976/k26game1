# ARCHITECTURE

## Tổng quan

```
Browser (React SPA) ──Firebase Auth SDK──► Firebase Authentication
   │  fetch /api/** + Bearer ID token
   ▼
Firebase Hosting ──rewrite /api/**──► Cloud Run "ecs-api" (Fastify, Node 22)
                                         ├─ Firestore (multi-tenant data)
                                         ├─ Firebase Auth Admin (verify token, custom claims)
                                         ├─ Cloud Storage (student audio, TTS cache)
                                         ├─ Vertex AI Gemini (conversation, assessment)
                                         ├─ Speech-to-Text (student voice → text + word timings)
                                         └─ Text-to-Speech (NPC voice, cached by hash)
```

## Thư mục

| Thư mục | Nội dung |
|---|---|
| `packages/shared` | Kiểu dữ liệu + zod schema, **Scenario Engine**, chấm điểm (rubric, fluency, XP, thành tích, gợi ý), CSV |
| `content/missions` | Nội dung 6 nhiệm vụ M01–M06 (JSON, kiểm tra bằng schema + test) |
| `apps/api` | REST API: `routes/` (HTTP), `services/` (nghiệp vụ), `ai/` `speech/` (nhà cung cấp), `quota.ts`, `auth.ts` |
| `apps/web` | React + Vite + Tailwind: bản đồ thành phố SVG isometric, màn hội thoại, kết quả, dashboard |
| `firebase/` | Firestore/Storage rules, indexes |
| `infrastructure/` | `bootstrap.sh` (hạ tầng một lần), Cloud Build config |
| `scripts/` | `deploy.sh`, `seed.mts` |
| `tests/e2e` | Playwright end-to-end |

## Nguyên tắc thiết kế

1. **Luật chơi xác định, AI chỉ nói.** `packages/shared/src/engine.ts` quyết định giai đoạn, mục tiêu, twist và hoàn thành.
   AI chỉ *đề xuất* mục tiêu đạt được kèm trích dẫn; engine chỉ chấp nhận khi trích dẫn thực sự nằm trong câu nói của sinh viên
   và mục tiêu thuộc giai đoạn hiện tại hoặc sau đó.
2. **Mọi thứ quan trọng ở backend.** Gọi AI, ghi lượt hội thoại, ghi điểm, hạn mức đều ở Cloud Run. Firestore rules cấm client ghi.
3. **Không bịa điểm.** Hoàn thành nhiệm vụ do engine tính; trôi chảy chỉ chấm khi đủ dữ liệu giọng nói; khi AI lỗi các tiêu chí
   AI ghi `not_assessed`. Không chấm phát âm từ transcript.
4. **Chống trùng & đồng thời.** Mỗi lượt có `clientTurnId` (UUID do client tạo) làm document ID; xử lý 3 pha
   (A: transaction "giữ chỗ" + kiểm tra hạn mức → B: STT/AI/TTS ngoài transaction → C: transaction ghi kết quả).
   Gửi lại cùng ID trả kết quả cũ; lượt khác gửi cùng lúc bị từ chối `TURN_IN_PROGRESS`. Đánh giá dùng `assessments/{sessionId}`.
5. **Có thể thay nhà cung cấp AI.** `AiProvider`, `SpeechToText`, `TextToSpeech`, `BlobStore` là interface; bản `fake` chỉ dùng
   cho dev/test và API **từ chối khởi động** ở production nếu cấu hình nhà cung cấp giả.
6. **Multi-tenant.** Dữ liệu học tập nằm dưới `tenants/{tenantId}`; vai trò/trường nằm trong custom claims của token.

## Luồng một lượt nói

1. Web ghi âm WAV 16 kHz mono → `POST /api/sessions/:id/voice` (multipart, `clientTurnId`).
2. API: xác thực token → transaction A (idempotency, trạng thái phiên, giới hạn lượt/thời gian, hạn mức AI).
3. Kiểm tra WAV (định dạng, độ dài, độ ồn) → Speech-to-Text (kèm phrase hints từ thẻ thông tin) → độ tin cậy thấp → `AUDIO_UNCLEAR`.
4. Lưu audio (nếu trường cho phép) → bộ lọc nội dung → Gemini (system prompt theo nhiệm vụ + JSON schema) → zod validate.
5. Scenario Engine áp dụng bằng chứng → câu thoại NPC → TTS (cache theo SHA-256 của giọng+tốc độ+câu).
6. Transaction C ghi lượt SV, lượt NPC, trạng thái phiên; trả `TurnResponse`.
7. AI lỗi/timeout (tối đa 2 lần thử lại) → câu dự phòng trong kịch bản, **không đổi tiến độ**.

## Mở rộng

- Thêm địa điểm: `packages/shared/src/locations.ts` (`available: true`) + nhiệm vụ mới trong `content/missions` hoặc qua Admin.
- Thêm nhà cung cấp AI: hiện thực `AiProvider` trong `apps/api/src/ai/`, chọn trong `deps.ts`.
- LTI 1.3 / SSO LMS-AI9: thêm route mới dùng `provisionUser` để gán claims; định dạng minh chứng xem `docs/API.md`.
