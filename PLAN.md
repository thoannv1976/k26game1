# KẾ HOẠCH XÂY DỰNG GAME 1 – ENGLISH CITY SIMULATOR

> Phiên bản kế hoạch: 1.0 · Ngày lập: 31/10/2026
> Đặc tả gốc: [docs/spec/game1-english-city-simulator.md](docs/spec/game1-english-city-simulator.md)
> Repository: `thoannv1976/k26game1` · GCP project: `k26game1` · Database: Cloud Firestore (Firebase)

---

## 0. Tóm tắt

English City Simulator là web game luyện **Nghe – Nói** tiếng Anh B1–B2: sinh viên đi trong một thành phố
isometric 2.5D, vào từng địa điểm và **nói chuyện bằng giọng nói với nhân vật AI** để hoàn thành nhiệm vụ.
Sau mỗi nhiệm vụ, AI chấm sơ bộ theo rubric 100 điểm và gợi ý luyện tập. Giảng viên xem lại và thẩm định.

**Phạm vi v1.0:** 3 địa điểm (Airport, Restaurant, University) · 6 nhiệm vụ M01–M06 hoàn chỉnh ·
giọng nói hai chiều · đánh giá AI · dashboard sinh viên/giảng viên/quản trị · hạn mức chi phí AI ·
xuất CSV · API sẵn sàng nối LMS-AI9.

**Kiến trúc chạy trên GCP:**

| Thành phần | Dịch vụ |
|---|---|
| Frontend (React + TS + Vite + Tailwind) | Firebase Hosting |
| Backend REST API (Node.js + TS) | Cloud Run, vùng `asia-southeast1` (Singapore) |
| Cơ sở dữ liệu | Cloud Firestore (Native mode), `asia-southeast1` |
| Đăng nhập | Firebase Authentication + custom claims (tenant, role) |
| Âm thanh | Cloud Storage (tự xóa theo hạn lưu trữ) |
| AI | Vertex AI Gemini, Speech-to-Text v2, Text-to-Speech |
| Bí mật | Secret Manager |
| CI/CD | GitHub Actions + Workload Identity Federation (không lưu khóa dịch vụ trên GitHub) |

**Lộ trình:** 7 giai đoạn (0–6), ước tính **6–8 tuần** tùy tốc độ duyệt nội dung nhiệm vụ.

| GĐ | Nội dung | Thời gian ước tính | Ai làm |
|---|---|---|---|
| 0 | Chuẩn bị GCP/Firebase (billing, Firebase, quyền) | 0,5 ngày | **Anh/chị** (theo hướng dẫn mục 6) |
| 1 | Khởi tạo monorepo, Auth, phân quyền, mô hình dữ liệu, CI | 1 tuần | Claude Code |
| 2 | Game engine: bản đồ, nhiệm vụ, Scenario Engine, hội thoại AI, giọng nói | 2 tuần | Claude Code + giảng viên duyệt kịch bản |
| 3 | Đánh giá AI, gợi ý học tập, dashboard sinh viên & giảng viên | 1 tuần | Claude Code |
| 4 | Quản trị, hạn mức chi phí, báo cáo, CSV, API LMS | 1 tuần | Claude Code |
| 5 | Kiểm thử đầy đủ (unit, integration, rules, E2E) | 1 tuần (chạy song song từ GĐ 1) | Claude Code |
| 6 | Triển khai dev → nghiệm thu → production | 1 tuần | Claude Code + anh/chị (chạy lệnh/duyệt) |

---

## 1. Quyết định mặc định

Các lựa chọn dưới đây được dùng nếu anh/chị không yêu cầu khác. Có thể đổi bất kỳ lúc nào trước Giai đoạn 1.

| # | Vấn đề | Quyết định | Lý do |
|---|---|---|---|
| D1 | Vùng triển khai | `asia-southeast1` (Singapore) cho Firestore, Cloud Run, Storage, Vertex AI | Gần Việt Nam nhất, đủ dịch vụ. **Vùng Firestore không đổi được sau khi tạo.** |
| D2 | Môi trường | `k26game1` = **dev/staging**. Production tạo project riêng `k26game1-prod` ở Giai đoạn 6 | Đặc tả yêu cầu tách Dev/Prod; tách project là cách an toàn nhất |
| D3 | Repo | Dùng repo hiện có `k26game1` (đặc tả gợi ý tên `english-city-simulator`, không bắt buộc) | Đã tạo sẵn |
| D4 | Monorepo | npm workspaces, Node.js 22 LTS, TypeScript strict | Ít công cụ phải cài, chạy được ngay trong Cloud Shell |
| D5 | Backend framework | Fastify + zod (kiểm tra schema đầu vào/đầu ra) | Nhanh, có sẵn validation, dễ test |
| D6 | Bản đồ 2.5D | SVG isometric vẽ bằng code (React components), không dùng engine 3D | Nhẹ, responsive, dễ click trên điện thoại; nâng cấp PixiJS sau nếu cần |
| D7 | Ghi âm | Ghi WAV 16 kHz mono trên trình duyệt (Web Audio API), tối đa 30 giây/lượt | Chạy được cả Chrome, Safari iOS; Speech-to-Text đọc trực tiếp, không lỗi codec |
| D8 | Mô hình AI | Gemini **Flash** trên Vertex AI, đặt qua biến `GEMINI_MODEL` (chọn bản Flash mới nhất có ở thời điểm GĐ 1) | Nhanh, rẻ, đủ cho hội thoại B1–B2; đổi model không cần sửa code |
| D9 | Giọng đọc | Text-to-Speech, giọng Anh-Mỹ và Anh-Anh (mỗi nhân vật một giọng); câu thoại cố định được tạo sẵn và cache | Giảm độ trễ và chi phí |
| D10 | Đăng nhập v1 | Email/mật khẩu do quản trị cấp (nhập hàng loạt từ CSV) + tùy chọn Google Sign-in giới hạn theo tên miền trường | Đúng đặc tả "tài khoản được cấp"; SSO/LTI 1.3 để giai đoạn sau |
| D11 | Hạn lưu file ghi âm | 30 ngày, cấu hình được theo trường | Đặc tả yêu cầu có cấu hình xóa tự động |
| D12 | Ngôn ngữ giao diện | Tiếng Việt (mặc định) và tiếng Anh, chuyển đổi được; hội thoại trong game bằng tiếng Anh | Theo đặc tả mục VI |

---

## 2. Kiến trúc tổng thể

```
 Trình duyệt (máy tính / điện thoại)
   React SPA ── Firebase Auth SDK (lấy ID token)
      │  HTTPS, cùng tên miền
      ▼
 Firebase Hosting ──── /api/**  (rewrite) ────►  Cloud Run: ecs-api (Node.js/TS)
                                                   │
          ┌──────────────┬───────────────┬─────────┼──────────────┬───────────────┐
          ▼              ▼               ▼         ▼              ▼               ▼
   Firebase Auth    Firestore      Cloud Storage  Vertex AI    Speech-to-Text  Text-to-Speech
   (verify token,   (dữ liệu       (audio SV,     Gemini       v2              (+ cache audio
    custom claims)   multi-tenant)   audio TTS)                                  trong Storage)
                                                   │
                                            Secret Manager (cấu hình bí mật)
```

Nguyên tắc:

- **Mọi lời gọi AI, ghi điểm, ghi dữ liệu đều đi qua backend.** Frontend chỉ dùng Firebase SDK để đăng nhập;
  Firestore Security Rules **chặn toàn bộ thao tác ghi** từ client.
- Hosting rewrite `/api/**` sang Cloud Run → cùng tên miền, không cần CORS, cookie/token đơn giản.
- Backend chạy bằng service account riêng (`ecs-api@…`) với quyền tối thiểu. Gọi Google API bằng
  Application Default Credentials — **không có API key nào trong mã nguồn**.

---

## 3. Cấu trúc repository

```
k26game1/
├─ apps/
│  ├─ web/                 # React + Vite + Tailwind (SPA)
│  │  └─ src/{pages,components,city-map,conversation,audio,i18n,api}
│  └─ api/                 # Fastify + TypeScript, Dockerfile cho Cloud Run
│     └─ src/{routes,auth,engine,ai,speech,assessment,quota,repos,lms}
├─ packages/
│  └─ shared/              # zod schemas, kiểu dữ liệu, rubric, logic Scenario Engine thuần
├─ content/
│  └─ missions/            # M01–M06 dạng JSON/YAML (nguồn nội dung, giảng viên duyệt)
├─ firebase/               # firebase.json, firestore.rules, firestore.indexes.json, storage.rules
├─ infrastructure/         # script bootstrap GCP, cấu hình Cloud Run, lifecycle bucket
├─ scripts/                # seed dữ liệu mẫu, tạo tài khoản mẫu, pre-render TTS
├─ tests/                  # integration + rules tests (Firebase Emulator), E2E (Playwright)
├─ docs/                   # README/ARCHITECTURE/DEPLOYMENT/DATABASE/API/TESTING/SECURITY/OPERATIONS
├─ .github/workflows/      # ci.yml, deploy-dev.yml, deploy-prod.yml
├─ .env.example  .gitignore  CHANGELOG.md  CLAUDE.md  PLAN.md  README.md
```

---

## 4. Thiết kế lõi

### 4.1. Scenario Engine – "luật chơi" xác định, AI chỉ lo lời thoại

Đây là phần quan trọng nhất để đáp ứng yêu cầu *"AI không tự ý thay đổi thông tin cố định"* và
*"không tự động coi nhiệm vụ đã hoàn thành"*.

Mỗi nhiệm vụ là một tệp nội dung có cấu trúc (schema zod trong `packages/shared`):

```
Mission {
  code: "M02", locationId: "airport", level: "B1", version: 3, status: "draft" | "approved",
  title, briefing (bối cảnh cho SV), goals (mục tiêu giao tiếp), estimatedMinutes, xpReward,
  studentCard   // dữ kiện SV được cấp: số chuyến bay VN123, giờ đến 14:35, vali xanh, mã TAG-58213…
  npc { name, role, avatarId, voice: "en-GB-…", personality, openingLine },
  npcFacts      // dữ kiện cố định phía nhân vật: vali đang ở Bangkok, giao trước 18:00 mai…
  stages: [ { id, title, npcGoal, objectives: [ { id, description, required, evidenceHint } ] } ],
  twists: [ { id, afterStage, description } ],          // tình huống phát sinh có kiểm soát
  hints: [ { stageId, text } ],
  limits { maxTurns, maxMinutes, maxReplaysPerLine, maxHints, maxRecordSeconds },
  rubric { taskCompletion:30, comprehension:20, grammar:20, vocabulary:15, fluency:15 },
  approvedBy, approvedAt
}
```

Xử lý một lượt nói (`POST /api/sessions/:id/turns` hoặc `/voice`):

1. Xác thực ID token → `tenantId`, `uid`, `role`. Kiểm tra phiên thuộc về người gọi, còn hoạt động, chưa quá thời gian/số lượt.
2. **Chống gửi trùng:** client gửi `clientTurnId` (UUID). Lượt được lưu với document ID = `clientTurnId` trong
   một Firestore transaction; gửi lại cùng ID → trả lại kết quả cũ, không gọi AI lần nữa.
3. Kiểm tra & trừ hạn mức AI (transaction trên bộ đếm ngày của SV và của trường).
4. (Lượt giọng nói) Speech-to-Text v2 → transcript + độ tin cậy + mốc thời gian từng từ. Độ tin cậy thấp
   hoặc không có tiếng → trả lỗi "âm thanh không rõ", cho ghi lại, **không tính lượt**.
5. Lọc nội dung không phù hợp (bộ lọc từ khóa + safety settings của Gemini).
6. Dựng prompt: chỉ thị hệ thống theo nhiệm vụ (vai nhân vật, quy tắc B1/B2, giai đoạn hiện tại, các mục tiêu còn
   thiếu, `npcFacts` được phép nói, twist nếu đến lúc) + lịch sử ngắn của phiên. **Lời SV được đặt trong khối
   dữ liệu riêng, được ghi rõ là dữ liệu, không phải chỉ thị** (chống prompt injection).
7. Gọi Gemini với **JSON schema bắt buộc**:
   `{ npcReply, objectivesEvidence: [{objectiveId, quote}], needsClarification, offTopic, safetyFlag }`.
8. Kiểm tra kết quả bằng zod. Scenario Engine (code thuần, có unit test) quyết định:
   chỉ chấp nhận `objectiveId` thuộc giai đoạn hiện tại **và** có trích dẫn khớp lời SV; chuyển giai đoạn khi đủ
   mục tiêu bắt buộc; kích hoạt twist; đánh dấu `readyToComplete` khi xong giai đoạn cuối.
9. Text-to-Speech cho `npcReply` (lấy từ cache nếu câu đã có) → URL có thời hạn.
10. Ghi lượt SV + lượt NPC + trạng thái phiên + usage log trong một transaction.

**Khi AI lỗi:** thử lại tối đa 2 lần (backoff), quá thời gian 15 giây → trả câu dự phòng có sẵn trong kịch bản
(ví dụ nhắc lại câu hỏi của giai đoạn hiện tại), **không thay đổi tiến độ mục tiêu**, ghi log lỗi.

Phiên lưu trạng thái đầy đủ ở Firestore → đóng trình duyệt, mất mạng vẫn **tiếp tục được** từ đúng giai đoạn.

### 4.2. Giọng nói

- Trước lần ghi âm đầu: màn hình **đồng ý ghi âm** (lưu thời điểm đồng ý vào hồ sơ người dùng).
- Ghi WAV 16 kHz mono, có chỉ báo đang ghi/đang xử lý, giới hạn thời lượng theo nhiệm vụ.
- File ghi âm SV lưu tại `gs://<bucket>/tenants/{tenantId}/sessions/{sessionId}/{turnId}.wav`, lifecycle tự xóa sau N ngày.
- Chế độ **gõ chữ dự phòng** khi không có micro; lượt gõ chữ được đánh dấu `mode: "text"` và
  **không được tính làm minh chứng kỹ năng Nói**.
- Nút nghe lại lời NPC, nút "Could you repeat that?", nút gợi ý – mỗi lần dùng đều được ghi nhận và giới hạn theo nhiệm vụ.

### 4.3. Đánh giá (Assessment Engine)

Kết hợp **phần đo được bằng code** và **phần nhận xét của AI** để tránh "bịa điểm":

| Tiêu chí | Điểm | Cách tính |
|---|---|---|
| Hoàn thành mục tiêu giao tiếp | 30 | **Tính bằng code** từ Scenario Engine (tỉ lệ mục tiêu bắt buộc đạt, trừ nhẹ khi dùng nhiều gợi ý) |
| Hiểu nội dung, phản hồi phù hợp | 20 | Gemini chấm, bắt buộc trích dẫn lượt thoại làm bằng chứng |
| Ngữ pháp | 20 | Gemini chấm + danh sách lỗi (câu gốc → câu sửa) |
| Từ vựng | 15 | Gemini chấm + từ/mẫu câu nên học |
| Độ trôi chảy | 15 | **Chỉ chấm khi đủ dữ liệu âm thanh** (ví dụ ≥ 4 lượt nói, ≥ 30 giây). Dùng tốc độ nói, khoảng ngắt từ mốc thời gian của Speech-to-Text. Thiếu dữ liệu → `"not_assessed"` và tổng điểm quy đổi trên phần đã chấm |

- Phát âm: chỉ nhận xét định tính nếu có công cụ phù hợp; **không cho điểm phát âm từ transcript**.
- Kết quả ghi rõ: *"Phản hồi học tập do AI hỗ trợ, không phải điểm VSTEP chính thức."*
- Mỗi kết quả lưu kèm phiên bản rubric, prompt, model, nội dung nhiệm vụ (phục vụ kiểm tra lại).
- Giảng viên có thể sửa điểm từng tiêu chí + nhận xét → lưu riêng `teacherReview`; điểm cuối = điểm đã thẩm định nếu có.
- **Learning Recommendation**: lỗi ngữ pháp cần sửa, từ vựng/mẫu câu, nội dung luyện nghe, nhiệm vụ & cấp độ tiếp theo
  (gợi ý nhiệm vụ do code chọn từ ngân hàng nhiệm vụ, AI chỉ viết lời khuyên).

### 4.4. Mô hình dữ liệu Firestore (multi-tenant)

```
locations/{locationId}                          # dữ liệu chung: airport, restaurant, university (+3 khóa sẵn)
tenants/{tenantId}                              # thông tin trường, cấu hình, hạn mức, ngân sách
  users/{uid}                                   # hồ sơ, vai trò, lớp, cấp độ, XP, đồng ý ghi âm
  courses/{courseId}                            # học phần/lớp, giảng viên, danh sách SV
  assignments/{assignmentId}                    # nhiệm vụ được giao, hạn nộp
  missions/{missionId}                          # ngân hàng nhiệm vụ của trường (seed từ content/missions)
    versions/{version}                          # lịch sử phiên bản + trạng thái duyệt
  game_sessions/{sessionId}                     # người chơi, nhiệm vụ+version, trạng thái, giai đoạn, mục tiêu đạt, thời gian
    conversation_turns/{clientTurnId}           # thứ tự, người nói, nội dung, mode, audio path, STT metadata
  assessments/{sessionId}                       # 1 đánh giá / phiên (ID = sessionId → không ghi trùng)
  usage_counters/{uid_yyyymmdd}                 # bộ đếm hạn mức theo ngày
  usage_logs/{autoId}                           # lượt gọi AI, token vào/ra, giây STT, ký tự TTS, chi phí ước tính
  audit_logs/{autoId}                           # thao tác quản trị quan trọng
```

- Vai trò và trường được gắn vào **custom claims** của Firebase Auth: `{ tenantId, role }` với
  `role ∈ student | teacher | school_admin | platform_admin`.
- `platform_admin` quản lý trường/cấu hình nhưng **không đọc được dữ liệu học tập** nếu không được cấp quyền riêng.
- Chỉ mục (indexes) khai báo trong `firebase/firestore.indexes.json`.
- Chi tiết từng trường dữ liệu sẽ có trong `docs/DATABASE.md` (Giai đoạn 1).

### 4.5. API (REST, tiền tố `/api`, mọi endpoint yêu cầu ID token)

| Nhóm | Endpoint |
|---|---|
| Người dùng | `GET /me` · `PATCH /me` (ngôn ngữ, cấp độ, đồng ý ghi âm) |
| Thế giới | `GET /locations` · `GET /missions?locationId=&level=` · `GET /missions/:id` |
| Phiên chơi | `POST /sessions` · `GET /sessions/:id` · `POST /sessions/:id/turns` · `POST /sessions/:id/voice` · `POST /sessions/:id/hint` · `POST /sessions/:id/replay` · `POST /sessions/:id/pause` · `POST /sessions/:id/complete` · `GET /sessions/:id/results` · `GET /tts/:hash` |
| Sinh viên | `GET /student/progress` · `GET /student/sessions` |
| Giảng viên | `GET /teacher/classes` · `GET /teacher/classes/:id/students` · `POST /teacher/assignments` · `GET /teacher/sessions/:id` · `PUT /teacher/assessments/:id/review` · `GET /teacher/export.csv` |
| Quản trị trường | `GET/POST/PATCH /admin/users` · `POST /admin/users/import` (CSV) · `GET/POST/PATCH /admin/courses` · `GET/PUT /admin/missions/:id` + `POST /admin/missions/:id/approve` · `GET/PUT /admin/ai-config` · `GET/PUT /admin/quotas` · `GET /admin/usage` · `GET /admin/audit-logs` |
| Nền tảng | `GET/POST /platform/tenants` |
| Tích hợp LMS (v1 chuẩn bị) | `GET /lms/v1/results?courseId=&since=` · `GET /lms/v1/evidence/:sessionId` (định dạng chung cho AI English Learning Portfolio); xác thực bằng tài khoản dịch vụ, chừa chỗ cho LTI 1.3 |

### 4.6. Kiểm soát chi phí AI

- Cấu hình theo trường (và ghi đè theo học phần): thời lượng tối đa/phiên, số lượt AI/SV/ngày, số lần chơi lại/nhiệm vụ,
  giới hạn token, giới hạn giây ghi âm, **ngân sách USD/tháng**.
- Mỗi lời gọi AI ghi `usage_logs` với chi phí ước tính theo bảng giá cấu hình được.
- Cảnh báo trong dashboard khi đạt 80% hạn mức; đạt 100% → từ chối yêu cầu AI mới (theo chính sách trường),
  phiên đang dở được báo rõ lý do.
- Ngoài ra đặt **Budget Alert** của Google Cloud (chỉ là cảnh báo email, không tự chặn chi phí).

### 4.7. Bảo mật & quyền riêng tư

- Backend xác thực Firebase ID token cho mọi request; kiểm tra `tenantId` của dữ liệu khớp với claims.
- Firestore Rules: client chỉ **đọc** hồ sơ của chính mình; **cấm ghi** toàn bộ. Storage Rules: cấm client truy cập trực tiếp.
- Giới hạn kích thước request, rate-limit theo người dùng, header bảo mật (Helmet), CSP cho frontend.
- Không lưu khóa bí mật trong frontend, repo, tài liệu. Cấu hình nhạy cảm đặt trong Secret Manager.
- Không dùng hội thoại/ghi âm của SV để huấn luyện mô hình (Vertex AI mặc định không dùng dữ liệu khách hàng để huấn luyện).
- Có API xóa dữ liệu cá nhân theo yêu cầu (quản trị trường thực hiện), ghi audit log.

---

## 5. Lộ trình chi tiết

Quy tắc chung cho mọi giai đoạn: mỗi chức năng chỉ được đánh dấu **xong** khi bài kiểm thử tương ứng chạy qua;
mỗi giai đoạn kết thúc bằng commit + push + cập nhật `CHANGELOG.md`.

### Giai đoạn 0 – Chuẩn bị hạ tầng (anh/chị thực hiện, ~0,5 ngày)

Xem hướng dẫn từng bước ở **mục 6**. Kết quả cần có: billing đã liên kết, Firebase đã gắn vào project `k26game1`,
Firestore đã tạo ở `asia-southeast1`, đã bật Email/Password trong Firebase Authentication, có Firebase Web App config.

### Giai đoạn 1 – Nền tảng dự án (~1 tuần)

- Khởi tạo monorepo npm workspaces: `apps/web`, `apps/api`, `packages/shared`; ESLint, Prettier, TypeScript strict, Vitest.
- `packages/shared`: zod schema cho Mission, Session, Turn, Assessment, User, Tenant, cấu hình hạn mức.
- `apps/api`: Fastify, middleware xác thực ID token, kiểm tra role/tenant, xử lý lỗi chuẩn, logging JSON cho Cloud Logging,
  `GET /me`, endpoint health; Dockerfile; lớp truy cập Firestore (repository pattern).
- `apps/web`: Vite + React + Tailwind + React Router + TanStack Query + i18next (vi/en); trang đăng nhập; layout theo vai trò.
- `firebase/`: `firebase.json` (Hosting + rewrite `/api/**` → Cloud Run), Firestore rules + indexes, Storage rules,
  cấu hình Emulator Suite.
- `infrastructure/bootstrap.sh`: bật API, tạo Artifact Registry, bucket + lifecycle, service account, phân quyền,
  Workload Identity Federation cho GitHub Actions (anh/chị chạy 1 lần trong Cloud Shell).
- `scripts/`: tạo tenant mẫu, tài khoản mẫu (SV, GV, quản trị), gán custom claims.
- `.github/workflows/ci.yml`: lint, typecheck, unit test, rules test trên emulator, build.
- Tài liệu: README, ARCHITECTURE, DATABASE, DEPLOYMENT (bản đầu), `.env.example`, CHANGELOG.

**Xong khi:** đăng nhập bằng 3 vai trò trên emulator; rules test chứng minh SV không đọc được dữ liệu SV khác và
người trường A không đọc được dữ liệu trường B; CI xanh.

### Giai đoạn 2 – Game engine (~2 tuần)

- **Nội dung:** viết đầy đủ 6 nhiệm vụ M01–M06 trong `content/missions/` (bối cảnh, thẻ thông tin SV, dữ kiện NPC,
  4 giai đoạn, mục tiêu, twist, gợi ý, giới hạn, rubric). Script seed vào Firestore với trạng thái `draft`
  → **giảng viên duyệt** → `approved` (chỉ nhiệm vụ đã duyệt mới hiện cho SV).
- **City Map:** bản đồ isometric SVG, 6 tòa nhà (3 mở, 3 hiển thị "sắp ra mắt"), nhân vật, hiệu ứng hover/chạm, responsive.
- **Mission Screen:** bối cảnh, mục tiêu, thời lượng, cấp độ, XP, thẻ thông tin SV.
- **Scenario Engine** trong `packages/shared` (logic thuần, unit test kỹ: chuyển giai đoạn, twist, điều kiện hoàn thành,
  từ chối mục tiêu không hợp lệ).
- **AI Conversation Engine:** lớp `AiProvider` (Vertex Gemini; bản giả lập chỉ dùng cho test/dev, bị chặn ở production),
  prompt theo nhiệm vụ, JSON schema đầu ra, retry, timeout, câu dự phòng, bộ lọc nội dung.
- **Speech:** ghi WAV trên trình duyệt, `POST /voice` → Speech-to-Text v2; Text-to-Speech + cache trong Storage;
  script tạo sẵn audio cho các câu thoại cố định.
- **Conversation Screen:** avatar NPC, lời thoại, nghe lại, micro, đồng hồ, thanh tiến độ mục tiêu, gợi ý, tạm dừng;
  chế độ gõ chữ dự phòng; tiếp tục phiên dở.
- Quản lý phiên: tạo, tạm dừng, tiếp tục, hết giờ, chơi lại; chống gửi trùng bằng `clientTurnId`.

**Xong khi:** chơi trọn được cả 6 nhiệm vụ bằng giọng nói trên môi trường dev (thật, không giả lập); integration test
cho luồng lượt nói, gửi trùng, AI lỗi → câu dự phòng, tiếp tục phiên.

### Giai đoạn 3 – Đánh giá & dashboard (~1 tuần)

- Assessment Engine theo mục 4.3, lưu `assessments/{sessionId}` (idempotent), XP và thành tích cho SV.
- Learning Recommendation.
- **Assessment Screen:** kết quả, rubric, điểm mạnh/cần cải thiện, transcript, khuyến nghị, chơi lại/nhiệm vụ tiếp.
- **Student Dashboard:** thông tin, cấp độ, XP, số nhiệm vụ xong, thành tích, khuyến nghị, nút "Tiếp tục chơi".
- **Teacher Dashboard:** lớp, giao nhiệm vụ + hạn, tiến độ, kết quả từng SV, xem lại hội thoại (kèm nghe audio nếu còn),
  thẩm định/sửa điểm, xuất CSV.

**Xong khi:** test chứng minh không tạo 2 đánh giá cho 1 phiên; tiêu chí trôi chảy trả `not_assessed` khi chơi bằng chữ;
GV chỉ thấy SV lớp mình.

### Giai đoạn 4 – Quản trị & tích hợp (~1 tuần)

- **Administrator Dashboard:** người dùng & phân quyền (tạo lẻ, nhập CSV), trường/lớp/học phần, ngân hàng nhiệm vụ
  (sửa → phiên bản mới → duyệt), cấu hình AI (model, giọng, nhiệt độ, giới hạn), hạn mức & ngân sách, báo cáo sử dụng/chi phí,
  nhật ký hệ thống.
- Quản trị nền tảng: tạo trường (tenant), cấu hình chung.
- Hạn mức (mục 4.6) áp dụng ở mọi lời gọi AI; cảnh báo 80%/100%.
- Xuất CSV (kết quả, sử dụng); API `/lms/v1/*` + tài liệu định dạng minh chứng cho Portfolio.
- Chính sách lưu trữ: lifecycle audio, API xóa dữ liệu cá nhân.

**Xong khi:** test hạn mức (vượt mức bị chặn đúng), test xuất CSV, test quyền quản trị.

### Giai đoạn 5 – Kiểm thử (chạy song song từ GĐ 1, chốt ~1 tuần)

Bộ kiểm thử bắt buộc theo đặc tả:

| Kiểm thử | Loại |
|---|---|
| Đăng nhập và phân quyền theo 4 vai trò | Integration + E2E |
| SV không xem được dữ liệu SV khác | Rules test + API test |
| Người dùng trường A không truy cập dữ liệu trường B | Rules test + API test |
| Hoàn thành nhiệm vụ bằng giọng nói | E2E (Playwright, micro giả bằng file WAV) + kiểm thử tay trên dev |
| Tiếp tục phiên bị gián đoạn | Integration + E2E |
| Kiểm soát chi phí / hạn mức | Integration |
| Phục hồi khi AI không phản hồi | Integration (provider giả lập lỗi/timeout) |
| Không ghi trùng lượt hội thoại và điểm | Integration (gửi song song cùng `clientTurnId`) |
| Firestore & Storage Security Rules | `@firebase/rules-unit-testing` trên emulator |
| API quan trọng | Integration (Fastify inject + emulator) |
| Xuất dữ liệu CSV | Unit + integration |
| Scenario Engine 6 nhiệm vụ | Unit (kịch bản hội thoại mẫu → kết quả mong đợi) |

Kết quả ghi trong `docs/TESTING.md`. CI chặn merge khi test đỏ.

### Giai đoạn 6 – Triển khai & nghiệm thu (~1 tuần)

1. `deploy-dev.yml`: push vào `main` → build image → Artifact Registry → `gcloud run deploy ecs-api` →
   `firebase deploy` (hosting, rules, indexes) trên project `k26game1`. Xác thực bằng Workload Identity Federation.
2. Seed dữ liệu mẫu, tạo tài khoản kiểm thử, pre-render audio TTS.
3. Nghiệm thu trên dev theo 12 tiêu chí ở mục 8 với tài khoản SV/GV/quản trị mẫu.
4. Tạo project `k26game1-prod` (chạy lại bootstrap), `deploy-prod.yml` chạy thủ công và **cần anh/chị bấm duyệt**
   (GitHub Environment protection).
5. Đặt Budget Alert, cấu hình hạn mức thật, bàn giao `docs/OPERATIONS.md` (vận hành, xử lý sự cố, cấu hình AI & chi phí).

---

## 6. Việc anh/chị cần làm trước (Giai đoạn 0)

Môi trường Claude Code này **không có quyền đăng nhập Google Cloud** của anh/chị, nên các bước tạo tài nguyên có tính phí
do anh/chị thực hiện (hoặc giao Claude Cowork). Claude Code sẽ viết sẵn script ở Giai đoạn 1; trước đó chỉ cần:

**Bước 1 – Billing.** Console → Billing → liên kết tài khoản thanh toán với project `k26game1`
(Cloud Run, Vertex AI, Speech yêu cầu billing; Firebase sẽ chuyển sang gói Blaze).

**Bước 2 – Gắn Firebase vào project có sẵn.** https://console.firebase.google.com/u/1/ → *Create a project* →
chọn **"Add Firebase to an existing Google Cloud project"** → chọn `k26game1`. (Không tạo project Firebase mới,
để tất cả dùng chung một project.)

**Bước 3 – Tạo Firestore.** Firebase Console → Firestore Database → Create database → **Native mode**,
location **asia-southeast1 (Singapore)** → chọn *production mode* (rules khóa hết, sẽ được thay bằng rules của dự án).

**Bước 4 – Authentication.** Firebase Console → Authentication → Get started → bật **Email/Password**
(và **Google** nếu muốn SV đăng nhập bằng email trường).

**Bước 5 – Đăng ký Web App.** Project settings → *Your apps* → thêm Web app tên `english-city-web` →
sao chép khối `firebaseConfig` (apiKey, authDomain, projectId, appId…) gửi lại cho Claude Code.
*Đây là cấu hình công khai của web, không phải khóa bí mật.*

**Bước 6 – Bật API (chạy trong Cloud Shell của project `k26game1`):**

```bash
gcloud config set project k26game1
```

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com firebase.googleapis.com identitytoolkit.googleapis.com aiplatform.googleapis.com speech.googleapis.com texttospeech.googleapis.com secretmanager.googleapis.com storage.googleapis.com iamcredentials.googleapis.com sts.googleapis.com
```

**Bước 7 – Gửi lại cho Claude Code:** project number (lệnh dưới đây) và khối `firebaseConfig` ở Bước 5.

```bash
gcloud projects describe k26game1 --format="value(projectNumber)"
```

Các bước còn lại (Artifact Registry, bucket audio, service account, Workload Identity Federation cho GitHub Actions)
nằm trong `infrastructure/bootstrap.sh` sẽ được tạo ở Giai đoạn 1 – anh/chị chỉ cần chạy một lệnh trong Cloud Shell.

**Nên làm thêm:** Billing → Budgets & alerts → đặt ngân sách tháng cho `k26game1` (ví dụ 50 USD trong giai đoạn phát triển).

---

## 7. Ước tính chi phí vận hành (tham khảo)

> Con số thô để lập ngân sách, **cần đối chiếu bảng giá Google Cloud hiện hành** và đo thực tế bằng `usage_logs` ở GĐ 6.

Giả định 1 phiên ≈ 15 phút, ~15 lượt nói, SV nói ~3 phút, NPC nói ~1.500 ký tự:

| Hạng mục | Ước tính / phiên |
|---|---|
| Speech-to-Text (~3 phút) | ~0,05 USD |
| Text-to-Speech (~1.500 ký tự, có cache câu cố định) | ~0,02–0,05 USD |
| Gemini Flash (hội thoại + đánh giá) | ~0,01–0,03 USD |
| **Tổng** | **~0,1 USD/phiên** |

Ví dụ: 200 SV × 10 phiên/tháng ≈ 2.000 phiên ≈ **~200 USD/tháng** cho AI. Cloud Run, Firestore, Hosting, Storage
ở quy mô này thường nằm trong hoặc gần mức miễn phí. Hạn mức theo SV/ngày (mục 4.6) giữ chi phí trong ngân sách.

---

## 8. Ánh xạ tiêu chí nghiệm thu

| # | Tiêu chí (đặc tả mục XII) | Giai đoạn | Cách chứng minh |
|---|---|---|---|
| 1 | SV đăng nhập, vào thành phố | 1, 2 | E2E login → city map |
| 2 | 3 địa điểm, 6 nhiệm vụ hoạt động thực tế | 2 | Chơi tay 6 nhiệm vụ trên dev + unit test kịch bản |
| 3 | Hội thoại giọng nói với AI | 2 | E2E với micro giả + kiểm thử tay trên điện thoại & máy tính |
| 4 | AI phản hồi theo bối cảnh, cấp độ, trạng thái | 2 | Unit test prompt/engine + kiểm thử tay |
| 5 | Xác định mục tiêu giao tiếp đã hoàn thành | 2 | Unit test Scenario Engine |
| 6 | Đánh giá sơ bộ + khuyến nghị | 3 | Integration test + màn hình kết quả |
| 7 | Lưu đúng nội dung, kết quả theo chính sách lưu trữ | 2, 4 | Integration test + lifecycle bucket |
| 8 | GV xem kết quả, thẩm định | 3 | E2E vai trò GV |
| 9 | Quản trị kiểm soát quyền & hạn mức | 4 | Integration test hạn mức + quyền |
| 10 | Kiểm thử quan trọng & bảo mật đạt | 5 | CI xanh, báo cáo `docs/TESTING.md` |
| 11 | Triển khai, vận hành trên GCP/Firebase | 6 | URL dev chạy thật, workflow deploy |
| 12 | Mã nguồn & tài liệu đầy đủ trên GitHub | 1–6 | Danh sách tài liệu mục XI.1 đặc tả |

---

## 9. Rủi ro và cách xử lý

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Độ trễ hội thoại (STT + Gemini + TTS) > 4–5 giây | Trải nghiệm kém | Flash model, cache TTS, hiện lời thoại ngay rồi phát audio sau, `min-instances=1` ở production |
| AI "đi lệch" kịch bản, nói sai dữ kiện | Sai nội dung học | Scenario Engine quyết định tiến độ; dữ kiện cố định đưa vào prompt; JSON schema; unit test hội thoại mẫu |
| Nhận diện giọng nói kém với giọng SV Việt Nam | Kẹt nhiệm vụ | Cho ghi lại, hiện transcript cho SV xem, chế độ gõ chữ dự phòng, gợi ý |
| Safari iOS hạn chế ghi âm | Một số máy không nói được | Ghi WAV qua Web Audio, kiểm thử trên iPhone ở GĐ 2 |
| Chi phí AI vượt dự kiến | Ngân sách | Hạn mức nhiều tầng, usage log, Budget Alert |
| Nội dung nhiệm vụ chưa được duyệt kịp | Trễ nghiệm thu | Viết nội dung sớm ở đầu GĐ 2, có quy trình duyệt ngay trong Admin |
| Vùng Firestore chọn sai | Không đổi được | Chốt `asia-southeast1` trước khi tạo database (Bước 3 mục 6) |

---

## 10. Sau v1.0 (kiến trúc đã chừa chỗ)

Hotel, Office, Shopping Mall; SSO/LTI 1.3 với LMS-AI9 và đồng bộ sổ điểm Moodle; đồng bộ AI English Learning Portfolio;
giải đấu & bảng xếp hạng; chấm phát âm chuyên sâu khi có công cụ tin cậy; avatar/hoạt ảnh nâng cao;
dùng chung chuẩn API kết quả học tập với Game 2 (English Detective) và Game 3 (VSTEP Quest).

---

## 11. Bước tiếp theo

1. Anh/chị xem kế hoạch, điều chỉnh các quyết định ở mục 1 nếu cần.
2. Thực hiện Giai đoạn 0 (mục 6) và gửi lại project number + `firebaseConfig`.
3. Yêu cầu Claude Code: **"Thực hiện Giai đoạn 1 theo PLAN.md"** – các giai đoạn sau làm lần lượt theo cùng cách.
