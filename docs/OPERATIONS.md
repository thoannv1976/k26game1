# OPERATIONS – Vận hành & quản trị

## Vai trò hằng ngày

| Việc | Ai | Ở đâu |
|---|---|---|
| Tạo tài khoản, nhập CSV, khóa/xóa tài khoản | Quản trị trường | Quản trị → Người dùng |
| Tạo lớp, gán giảng viên/sinh viên, ngân sách học phần | Quản trị trường | Quản trị → Lớp học |
| Duyệt / sửa nội dung nhiệm vụ | Giảng viên, quản trị trường | Quản trị → Nhiệm vụ |
| Giao nhiệm vụ, theo dõi, thẩm định điểm, xuất CSV | Giảng viên | Giảng viên → Lớp |
| Cấu hình AI, hạn mức, ngân sách, xem chi phí | Quản trị trường | Quản trị → AI & hạn mức, Sử dụng |
| Tạo trường mới | Quản trị nền tảng | Nền tảng |

## Quy trình duyệt nhiệm vụ

1. Mở Quản trị → Nhiệm vụ → chọn nhiệm vụ → xem nội dung (JSON) → sửa nếu cần → **Lưu nháp** (tạo phiên bản mới).
2. Kiểm tra lại (có thể chơi thử bằng tài khoản giảng viên sau khi duyệt).
3. **Duyệt** phiên bản → sinh viên thấy nội dung mới. Phiên đang chơi dở vẫn dùng phiên bản cũ.
4. Lưu trữ (archive) để ẩn nhiệm vụ.

Các trường nội dung quan trọng: `studentCard` (thông tin SV được cấp), `npcFacts` (dữ kiện cố định của nhân vật),
`stages[].objectives` (mục tiêu + `evidenceKeywords`), `stages[].twist`, `limits`, `rubric` (tổng 100).

## Theo dõi

- **Cloud Run → ecs-api → Logs/Metrics:** lỗi 5xx, độ trễ, số instance. Log dạng JSON (`message`, `level`).
- **Quản trị → Sử dụng:** số lượt, chi phí ước tính theo loại/ngày/sinh viên, tỉ lệ lỗi AI (`failures`).
- **Billing → Reports:** chi phí thực tế (Vertex AI, Speech, TTS, Cloud Run).
- Nên tạo cảnh báo Cloud Monitoring: tỉ lệ 5xx > 2%, độ trễ p95 > 8 s.

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Nhân vật chỉ nói câu "Sorry, could you repeat…" | AI lỗi → log `AI converse failed`; kiểm tra model/vùng (`GEMINI_MODEL`, `VERTEX_LOCATION`), quota Vertex AI, quyền `aiplatform.user`; nút "Kiểm tra kết nối AI" |
| Không nghe được giọng nhân vật | TTS lỗi → log `TTS failed`; web tự dùng giọng của trình duyệt. Kiểm tra API Text-to-Speech, tên giọng trong nhiệm vụ |
| "Không nghe rõ" liên tục | Micro/ồn; thử tai nghe; kiểm tra log `stt` |
| Sinh viên báo hết lượt | Quản trị → AI & hạn mức: `aiCallsPerStudentPerDay`, `attemptsPerMissionPerDay` |
| Toàn trường bị chặn AI | Ngân sách tháng đã hết (`BUDGET_EXCEEDED`) → tăng ngân sách hoặc đổi chính sách `warn_only` |
| Phiên bị kẹt "đang xử lý" | Khóa tự hết hạn sau 90 giây (lượt) / 120 giây (đánh giá); sinh viên tải lại trang |
| Lỗi index Firestore | `npx firebase deploy --only firestore:indexes --project <id>` |

## Sao lưu

Bật Firestore Point-in-time recovery hoặc lịch export:

```bash
gcloud firestore databases update --database='(default)' --enable-pitr
```

```bash
gcloud firestore export gs://k26game1-backups/$(date +%F)
```

## Cập nhật phiên bản

Mọi thay đổi qua Pull Request → CI xanh → merge `main` → tự triển khai dev → kiểm thử → chạy **Deploy production** (cần duyệt).
Quay lui: Cloud Run → ecs-api → Revisions → chuyển 100% traffic về revision trước; Hosting → Release history → Rollback.
