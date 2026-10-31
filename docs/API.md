# API

Base URL: `https://<project>.web.app/api` (Firebase Hosting rewrite → Cloud Run). Mọi endpoint (trừ `GET /api/health`) cần
header `Authorization: Bearer <Firebase ID token>`. Vai trò/trường lấy từ custom claims `{ tenantId, role }`.

Lỗi trả về dạng `{ "error": { "code": "QUOTA_EXCEEDED", "message": "...", "details": ... } }`. Mã lỗi: xem `ApiErrorCodes`
trong `packages/shared/src/schemas.ts` (401 UNAUTHENTICATED, 403 FORBIDDEN/NOT_PROVISIONED/CONSENT_REQUIRED, 404, 400 VALIDATION,
409 CONFLICT/TURN_IN_PROGRESS/SESSION_NOT_ACTIVE/TURN_LIMIT/TIME_LIMIT/HINT_LIMIT/REPLAY_LIMIT, 413 AUDIO_TOO_LONG,
422 AUDIO_UNCLEAR/CONTENT_BLOCKED, 429 QUOTA_EXCEEDED/BUDGET_EXCEEDED/ATTEMPT_LIMIT).

## Người dùng & thế giới (mọi thành viên trường)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/me` | Hồ sơ + trường. Tài khoản Google thuộc domain được phép sẽ tự được tạo (trả `refreshToken: true` → client làm mới token) |
| PATCH | `/me` | `{locale?, level?, recordingConsent?, displayName?}` |
| GET | `/locations` | 6 địa điểm (3 mở) + số nhiệm vụ |
| GET | `/missions?locationId=&level=` | Nhiệm vụ đã duyệt (ẩn dữ kiện NPC/từ khóa) + đã hoàn thành/điểm cao nhất |
| GET | `/missions/:id` | Chi tiết + `activeSessionId` nếu đang chơi dở |

## Phiên chơi

| Method | Path | Mô tả |
|---|---|---|
| POST | `/sessions` | `{missionId, assignmentId?, restart?}` → tạo phiên hoặc **tiếp tục** phiên dở (`resumed: true`) |
| GET | `/sessions/:id` | Trạng thái phiên + lượt hội thoại |
| POST | `/sessions/:id/turns` | `{clientTurnId: uuid, text}` – lượt gõ chữ (không tính minh chứng Nói) |
| POST | `/sessions/:id/voice` | multipart: `clientTurnId`, `audio` (WAV PCM 16-bit mono) – cần đồng ý ghi âm |
| POST | `/sessions/:id/hint` | Gợi ý (giới hạn theo nhiệm vụ) |
| POST | `/sessions/:id/replay` | `{kind: replay|repeat_request}` – nghe lại / yêu cầu nhắc lại |
| POST | `/sessions/:id/pause` · `/resume` | Tạm dừng / tiếp tục (đồng hồ dừng khi tạm dừng) |
| POST | `/sessions/:id/complete` | Kết thúc + đánh giá (idempotent) |
| GET | `/sessions/:id/results` | Kết quả, rubric, phản hồi, transcript |
| GET | `/tts/:hash` | Audio MP3 lời NPC |
| GET | `/student/progress` | Dashboard sinh viên |

`TurnResponse`: `{clientTurnId, studentText, mode, npcText, ttsHash, fallback, needsClarification, objectivesCredited[], stageChanged, session}`.

## Giảng viên (teacher, school_admin)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/teacher/classes` · `/teacher/classes/:id` | Lớp, sinh viên, bài giao, kết quả |
| POST/DELETE | `/teacher/assignments` · `/teacher/assignments/:id` | Giao/xóa nhiệm vụ `{courseId, missionId, dueAt, note}` |
| GET | `/teacher/students/:uid` | Lịch sử phiên của sinh viên |
| GET | `/teacher/sessions/:id` · `/teacher/sessions/:id/audio/:turnId` | Xem lại hội thoại, nghe ghi âm |
| PUT | `/teacher/assessments/:id/review` | `{scores: {grammar: 14, …}, comment}` – thẩm định/điều chỉnh |
| GET | `/teacher/export.csv?courseId=` | Xuất kết quả CSV (UTF-8 BOM, mở được bằng Excel) |

## Quản trị trường (school_admin; mục Missions cho cả teacher)

`GET/POST /admin/users`, `POST /admin/users/import` (CSV `email,displayName,role,studentCode,courseCode,password`),
`PATCH/DELETE /admin/users/:uid`, `GET/POST /admin/courses`, `PATCH/DELETE /admin/courses/:id`,
`GET /admin/missions`, `GET/PUT /admin/missions/:id` (lưu nháp phiên bản mới), `POST /admin/missions/:id/approve {version}`,
`POST /admin/missions/:id/archive`, `POST /admin/missions/seed`, `GET /admin/settings`, `PUT /admin/ai-config`, `PUT /admin/quotas`,
`PUT /admin/school`, `POST /admin/health/ai`, `GET /admin/usage?month=YYYYMM`, `GET /admin/usage.csv`, `GET /admin/audit-logs`,
`GET /admin/reports/overview`.

## Nền tảng (platform_admin)

`GET/POST /platform/tenants`, `PATCH /platform/tenants/:id`. Quản trị nền tảng **không** đọc được dữ liệu học tập.

## Tích hợp LMS-AI9 / AI English Learning Portfolio (`/lms/v1`, school_admin hoặc tài khoản tích hợp có vai trò school_admin)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/lms/v1/results?courseId=&since=ISO&limit=` | Danh sách minh chứng học tập |
| GET | `/lms/v1/evidence/:sessionId` | Một minh chứng |

Định dạng minh chứng (`schema: "ecs-evidence-1.0"`):

```json
{
  "schema": "ecs-evidence-1.0",
  "evidenceId": "ecs:<tenantId>:<sessionId>",
  "source": "english-city-simulator",
  "learner": { "uid": "...", "email": "...", "studentCode": "SV001", "name": "..." },
  "courseId": "...",
  "activity": { "type": "speaking_mission", "missionId": "M02", "missionVersion": 1, "title": "Lost Luggage", "level": "B1" },
  "skills": ["listening", "speaking"],
  "result": {
    "missionCompleted": true, "objectivesMet": 9, "objectivesRequired": 9,
    "aiPercent": 82, "finalPercent": 85, "scoreType": "teacher_validated | ai_practice",
    "criteria": { "taskCompletion": { "score": 30, "max": 30, "status": "assessed", "source": "engine" } },
    "evidenceMode": "voice | text | mixed", "speakingEvidence": true
  },
  "feedback": { "strengths": [], "improvements": [], "nextPractice": [] },
  "timestamps": { "startedAt": "...", "completedAt": "...", "reviewedAt": null },
  "versions": { "rubric": "ecs-rubric-1.0", "prompt": "ecs-prompt-1.0", "model": "vertex:gemini-2.5-flash", "mission": 1 },
  "disclaimer": "AI-assisted learning feedback. This is not an official VSTEP score."
}
```

`scoreType` phân biệt điểm luyện tập AI với điểm đã được giảng viên thẩm định. Đồng bộ sổ điểm Moodle/LTI 1.3 là giai đoạn sau.
