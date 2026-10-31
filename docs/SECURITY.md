# SECURITY – Bảo mật, quyền riêng tư, chi phí

## Xác thực & phân quyền

- Firebase Authentication (email/mật khẩu do quản trị cấp; Google Sign-in cho domain trường được khai báo).
- Vai trò và trường nằm trong **custom claims** `{tenantId, role}`, chỉ backend (Admin SDK) gán.
  Vai trò: `student`, `teacher`, `school_admin`, `platform_admin`.
- Backend xác thực ID token ở mọi request với `checkRevoked=true`: tài khoản bị khóa hoặc đổi vai trò mất hiệu lực ngay
  (backend thu hồi refresh token khi khóa/đổi vai trò).
- Quyền truy cập dữ liệu (kiểm tra ở backend, có test):
  - Sinh viên: chỉ phiên/kết quả của chính mình.
  - Giảng viên: sinh viên thuộc lớp mình dạy; không thể tự thẩm định bài của chính mình.
  - Quản trị trường: toàn bộ dữ liệu của trường mình.
  - Quản trị nền tảng: quản lý trường; **không** xem dữ liệu học tập.
  - Không ai truy cập được dữ liệu trường khác (mọi truy vấn nằm dưới `tenants/{tenantId}` lấy từ token, không lấy từ request).
- Firestore Security Rules: cấm mọi thao tác ghi từ client; chỉ cho đọc dữ liệu của chính mình (phòng thủ nhiều lớp).
  Storage Rules: cấm toàn bộ (audio chỉ đi qua API).

## AI an toàn

- Mọi lời gọi AI ở backend; không có API key trong frontend/repo (Cloud Run dùng service account + ADC).
- Prompt hệ thống riêng cho từng nhiệm vụ; đầu ra JSON có schema và kiểm tra bằng zod; giới hạn token, độ dài câu, số lượt.
- Lời sinh viên được đặt trong khối dữ liệu có ký hiệu riêng, đã loại ký tự phân cách; prompt ghi rõ đó là dữ liệu, không phải chỉ thị.
  Engine chỉ chấp nhận mục tiêu khi trích dẫn nằm trong câu nói thật của sinh viên → "prompt injection" không thể tự đánh dấu hoàn thành.
- Bộ lọc nội dung (danh sách từ + `BLOCKED_TERMS`) cho đầu vào và đầu ra; Gemini safety settings `BLOCK_MEDIUM_AND_ABOVE`.
- Thử lại có giới hạn, timeout, câu dự phòng khi AI lỗi.

## Chống gửi trùng

`clientTurnId` làm ID lượt; xử lý trong transaction; một phiên chỉ xử lý một lượt tại một thời điểm; một phiên có đúng một
đánh giá; XP cộng một lần (có test đồng thời).

## Quyền riêng tư

- Màn hình đồng ý trước khi ghi âm (lưu thời điểm đồng ý). Không đồng ý → chỉ dùng chế độ gõ chữ.
- Lưu audio theo `audioRetentionDays` của trường (0 = không lưu) + lifecycle bucket tự xóa.
- Xóa dữ liệu cá nhân theo yêu cầu (Admin), có audit log.
- Không dùng dữ liệu sinh viên để huấn luyện mô hình (Vertex AI không dùng dữ liệu khách hàng để huấn luyện theo mặc định).
- Xuất CSV có chống CSV/formula injection.

## Kiểm soát chi phí

Theo trường (Admin → AI & hạn mức): lượt AI/sinh viên/ngày, số lần chơi/nhiệm vụ/ngày, thời lượng phiên, độ dài ghi âm,
token tối đa, ngân sách USD/tháng của trường và của từng học phần, ngưỡng cảnh báo, chính sách khi vượt (`block` | `warn_only`).
Mỗi lời gọi ghi `usage_logs` kèm chi phí ước tính. **Budget Alert của Google Cloud chỉ là cảnh báo**, không tự chặn chi phí —
hạn mức nội bộ mới là cơ chế chặn.

## Khác

- Helmet headers, rate limit 240 request/phút/người dùng, giới hạn kích thước request (1 MB JSON, 3 MB audio).
- Container chạy user `node` (không phải root).
- Audit log cho thao tác quản trị: tạo/sửa/xóa người dùng, lớp, nhiệm vụ, cấu hình, xuất dữ liệu, thẩm định điểm.
