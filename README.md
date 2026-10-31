# English City Simulator (K26 – Game 1)

Game mô phỏng thành phố ảo giúp sinh viên luyện **Nghe – Nói tiếng Anh B1–B2**: sinh viên đi trong thành phố isometric,
vào sân bay, nhà hàng, trường đại học và **nói chuyện bằng giọng nói với nhân vật AI** để hoàn thành nhiệm vụ.
AI đánh giá sơ bộ theo rubric 100 điểm, gợi ý luyện tập; giảng viên xem lại và thẩm định.

Chạy trên **Google Cloud** (Cloud Run, Vertex AI Gemini, Speech-to-Text, Text-to-Speech, Cloud Storage) và **Firebase**
(Hosting, Authentication, Firestore).

| Tài liệu | Nội dung |
|---|---|
| [PLAN.md](PLAN.md) | Kế hoạch xây dựng |
| [docs/COWORK-DEPLOY.md](docs/COWORK-DEPLOY.md) | **Hướng dẫn dán vào Claude Cowork để triển khai** |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Triển khai lên GCP/Firebase (chi tiết, xử lý sự cố) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, luồng xử lý |
| [docs/DATABASE.md](docs/DATABASE.md) | Cấu trúc Firestore |
| [docs/API.md](docs/API.md) | REST API, API tích hợp LMS-AI9 |
| [docs/TESTING.md](docs/TESTING.md) | Kiểm thử |
| [docs/SECURITY.md](docs/SECURITY.md) | Bảo mật, quyền riêng tư, kiểm soát chi phí |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Vận hành, xử lý sự cố |
| [docs/spec/game1-english-city-simulator.md](docs/spec/game1-english-city-simulator.md) | Đặc tả gốc |

## Hình ảnh

| Bản đồ thành phố | Hội thoại với nhân vật AI | Kết quả đánh giá |
|---|---|---|
| ![](docs/screenshots/1-city-map.png) | ![](docs/screenshots/3-conversation.png) | ![](docs/screenshots/4-results.png) |

## Tính năng v1.0

- 3 địa điểm (Airport, Restaurant & Café, University) + 3 địa điểm "sắp ra mắt"; **6 nhiệm vụ M01–M06** (B1/B2).
- Hội thoại giọng nói hai chiều; chế độ gõ chữ dự phòng; gợi ý, nghe lại, tạm dừng, tiếp tục phiên dở.
- Scenario Engine quản lý giai đoạn, mục tiêu, tình huống phát sinh, điều kiện hoàn thành.
- Đánh giá AI + khuyến nghị học tập; XP, thành tích.
- Dashboard sinh viên, giảng viên (giao bài, thẩm định, xuất CSV), quản trị trường (người dùng, lớp, ngân hàng nhiệm vụ,
  cấu hình AI, hạn mức, chi phí, nhật ký), quản trị nền tảng (nhiều trường).
- API tích hợp LMS-AI9 / AI English Learning Portfolio.

## Chạy trên máy phát triển

Yêu cầu: Node.js 22, Java 21 (Firebase emulators).

```bash
npm install
```

Terminal 1 – Firebase emulators (Auth + Firestore):

```bash
npm run emulators
```

Terminal 2 – dữ liệu mẫu (trường demo, 6 nhiệm vụ đã duyệt, tài khoản demo, mật khẩu `Demo-12345`):

```bash
npm run seed:local
```

Terminal 2 – API (nhà cung cấp AI/giọng nói offline, không tốn phí):

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCP_PROJECT_ID=demo-ecs npm run dev:api
```

Terminal 3 – web (http://localhost:5173):

```bash
cp apps/web/.env.example apps/web/.env.local && npm run dev:web
```

Tài khoản demo: `student1@demo.edu.vn`, `teacher@demo.edu.vn`, `admin@demo.edu.vn`, `platform@demo.edu.vn` (mật khẩu `Demo-12345`).

Ở chế độ offline, nhân vật dùng câu thoại kịch bản và giọng đọc của trình duyệt; nhận diện giọng nói trả về câu mẫu của giai đoạn.
Muốn dùng AI thật khi phát triển: đăng nhập `gcloud auth application-default login` rồi đặt
`AI_PROVIDER=vertex SPEECH_PROVIDER=google TTS_PROVIDER=google GCP_PROJECT_ID=k26game1`.

## Kiểm thử

```bash
npm run typecheck && npm run test:unit && npm run test:integration
```

Chi tiết: [docs/TESTING.md](docs/TESTING.md).

## Cấu trúc

```
apps/web          React + Vite + Tailwind (Firebase Hosting)
apps/api          Fastify API (Cloud Run)
packages/shared   Kiểu dữ liệu, Scenario Engine, chấm điểm
content/missions  Nội dung 6 nhiệm vụ
firebase/         Firestore/Storage rules, indexes
infrastructure/   bootstrap.sh (hạ tầng GCP), Cloud Build
scripts/          deploy.sh, seed.mts
tests/e2e         Playwright
docs/             Tài liệu
```

> Kết quả do AI hỗ trợ đánh giá chỉ mang tính đánh giá quá trình, **không phải điểm VSTEP chính thức**.
