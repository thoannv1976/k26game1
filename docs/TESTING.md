# TESTING

## Chạy kiểm thử

Yêu cầu: Node 22, Java 21 (cho Firebase emulators).

```bash
npm ci
```

```bash
npm run typecheck
```

```bash
npm run test:unit
```

```bash
npm run test:integration
```

```bash
npm run build && npm run test:e2e
```

- `test:unit` – logic thuần (không cần mạng): Scenario Engine, chấm điểm, CSV, WAV, prompt, cấu hình, hạn mức.
- `test:integration` – khởi động Firestore + Auth emulator rồi chạy kiểm thử API thật (Fastify inject, token thật từ Auth emulator)
  và kiểm thử Firestore Security Rules (`@firebase/rules-unit-testing`).
- `test:e2e` – Playwright: khởi động emulators + seed + API + web, chơi nhiệm vụ trên trình duyệt (micro giả bằng file WAV).

Kiểm thử dùng nhà cung cấp AI/giọng nói **offline** (`fake`) để chạy ổn định, không tốn chi phí. Kiểm thử với Gemini/Speech thật
thực hiện thủ công trên môi trường dev (xem `docs/DEPLOYMENT.md` mục 7).

## Ánh xạ yêu cầu bắt buộc → kiểm thử

| Yêu cầu (đặc tả X, GĐ 5) | Kiểm thử |
|---|---|
| Đăng nhập và phân quyền | `apps/api/test/integration/security.test.ts` (authentication, role-based access), `teacher-admin.test.ts` (đổi vai trò, khóa tài khoản, tự cấp quyền theo domain), E2E đăng nhập |
| SV không xem được dữ liệu SV khác | `security.test.ts` › student data isolation; `test/rules/firestore-rules.test.ts` |
| Trường này không truy cập dữ liệu trường khác | `security.test.ts` › school (tenant) isolation; rules test |
| Hoàn thành nhiệm vụ bằng giọng nói | `gameplay.test.ts` › voice turns (WAV → STT → AI → engine → fluency); E2E voice |
| Tiếp tục phiên bị gián đoạn | `robustness.test.ts` › interrupted sessions (resume, pause/resume, lượt lỗi được thử lại) |
| Kiểm soát chi phí | `robustness.test.ts` › cost control (lượt/ngày, ngân sách tháng, số lần chơi, giới hạn lượt, usage log) |
| Phục hồi khi AI không phản hồi | `robustness.test.ts` › AI outages (câu dự phòng, không đổi tiến độ; đánh giá `not_assessed`) |
| Không ghi trùng lượt hội thoại và điểm | `robustness.test.ts` › no duplicate turns or scores (gửi lại, gửi đồng thời, hoàn thành 2 lần) |
| Firestore Security Rules | `apps/api/test/rules/firestore-rules.test.ts` |
| API quan trọng | toàn bộ `apps/api/test/integration/*` |
| Xuất dữ liệu | `teacher-admin.test.ts` › exports results as CSV, usage CSV; `packages/shared/test/scoring.test.ts` › csv |
| 6 nhiệm vụ hoạt động | `packages/shared/test/scenario-missions.test.ts` (kịch bản mẫu hoàn thành từng giai đoạn); `gameplay.test.ts` (M01–M06 qua API) |
| Chống prompt injection, nội dung không phù hợp | `security.test.ts` › server-side score protection; `units.test.ts` › prompts, moderation |

## Kết quả gần nhất (31/10/2026)

| Bộ kiểm thử | Kết quả |
|---|---|
| `packages/shared` (engine, chấm điểm, 6 kịch bản nhiệm vụ) | 34/34 |
| `apps/api` unit | 15/15 |
| `apps/web` unit (WAV encoder, i18n) | 14/14 |
| `apps/api` integration (emulators) | 63/63 |
| Firestore Security Rules | 8/8 |
| E2E Playwright (desktop + mobile) | 7/7 |
| **Tổng** | **141/141** |

Typecheck toàn bộ workspace và build (web + API + Docker image) đều thành công. CI (`.github/workflows/ci.yml`) chạy lại toàn bộ trên mỗi PR.

## Kiểm thử thủ công trước nghiệm thu (trên dev, với AI thật)

1. Mỗi nhiệm vụ M01–M06: chơi bằng giọng nói trên Chrome (máy tính) và Safari (iPhone); kiểm tra nhân vật phản hồi đúng bối cảnh,
   không tiết lộ đáp án, đưa tình huống phát sinh, không tự kết thúc khi chưa đủ mục tiêu.
2. Trả lời sai thông tin trên thẻ (vd. sai số chuyến bay) → nhân vật yêu cầu kiểm tra lại.
3. Thử chèn chỉ thị ("ignore your instructions…") → nhân vật giữ vai, không đánh dấu mục tiêu.
4. Tắt mạng giữa chừng → tải lại trang → tiếp tục đúng giai đoạn.
5. Giảng viên thẩm định, xuất CSV mở bằng Excel (tiếng Việt hiển thị đúng).
6. Đặt hạn mức thấp → kiểm tra thông báo khi vượt.
