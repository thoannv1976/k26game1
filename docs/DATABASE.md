# DATABASE – Cấu trúc Firestore

Firestore Native mode, vùng `asia-southeast1`. Kiểu dữ liệu chi tiết: `packages/shared/src/schemas.ts`.
Toàn bộ dữ liệu của một trường nằm dưới `tenants/{tenantId}` (multi-tenant). Client **không ghi** trực tiếp (xem `firebase/firestore.rules`).

```
tenants/{tenantId}                                  TenantDoc: name, allowedEmailDomains, quotas, aiConfig, active
  users/{uid}                                       UserDoc: role, email, displayName, studentCode, courseIds, level,
                                                    xp, completedMissionIds, bestPercent, voiceSessions, achievements,
                                                    recordingConsentAt, locale, disabled
  courses/{courseId}                                CourseDoc: code, name, teacherIds[], studentIds[], monthlyBudgetUsd
  assignments/{assignmentId}                        AssignmentDoc: courseId, missionId, dueAt, note, createdBy
  missions/{missionId}                              MissionDoc: approvedVersion, latestVersion, status, content (bản đã duyệt)
    versions/{n}                                    content, status draft|approved|superseded, createdBy, approvedBy, note
  game_sessions/{sessionId}                         SessionDoc: uid, missionId, missionVersion, courseId, assignmentId,
                                                    status, state (Scenario Engine), turnSeq, studentTurns, voiceTurns,
                                                    textTurns, hintsUsed, replaysUsed, speech metrics, activeMs, resumedAt,
                                                    pendingTurnId (khóa xử lý), lastNpcLine, lastNpcTtsHash
    conversation_turns/{turnId}                     TurnDoc: seq, speaker student|npc|system, text, mode voice|text|scripted,
                                                    stageId, audioPath, speech, ttsHash, fallback, objectivesCredited,
                                                    status, response (bản lưu để trả lại khi gửi trùng)
  assessments/{sessionId}                           AssessmentDoc: criteria (5 tiêu chí), total, percent, aiStatus, feedback,
                                                    recommendation, xpAwarded, newAchievements, versions, teacherReview, finalPercent
  usage_counters/{id}                               u_{uid}_{yyyymmdd} | t_{yyyymm} | c_{courseId}_{yyyymm}:
                                                    aiCalls, costUsd, tokens, sttSeconds, ttsChars, attempts{missionId}
  usage_logs/{autoId}                               kind converse|assess|stt|tts|ping, uid, sessionId, model, tokens,
                                                    sttSeconds, ttsChars, costUsd (ước tính), ok, latencyMs, day, month
  audit_logs/{autoId}                               at, actorUid, actorEmail, actorRole, action, target, details
platform_audit_logs/{autoId}                        thao tác của quản trị nền tảng
```

## Quy ước

- **ID chống trùng:** lượt hội thoại dùng `clientTurnId` (UUID từ client); đánh giá dùng `sessionId` → một phiên chỉ có một đánh giá.
- **Phiên bản:** phiên chơi lưu `missionVersion`; kết quả lưu `versions {rubric, prompt, model, mission}` để kiểm tra lại.
- **Ngày/tháng** của bộ đếm tính theo giờ Việt Nam (UTC+7).
- **Dữ liệu lớn** (lượt hội thoại) là subcollection của phiên.
- **Chỉ mục:** `firebase/firestore.indexes.json` (deploy bằng `firebase deploy --only firestore:indexes`).

## Lưu trữ & xóa

- Audio sinh viên: `gs://<project>-audio/tenants/{tenantId}/sessions/{sessionId}/{turnId}.wav`, tự xóa theo lifecycle bucket
  (mặc định 30 ngày). Trường có thể đặt `aiConfig.audioRetentionDays = 0` để **không lưu audio**.
- Audio NPC (TTS): `gs://<project>-audio/tts-cache/{hash}.mp3` (không phải dữ liệu cá nhân).
- Xóa dữ liệu cá nhân: Admin → Người dùng → Xóa dữ liệu (`DELETE /api/admin/users/:uid`) xóa phiên, lượt, đánh giá, audio,
  bộ đếm, hồ sơ và tài khoản đăng nhập; ghi audit log.
- Không dùng hội thoại/ghi âm để huấn luyện mô hình.
