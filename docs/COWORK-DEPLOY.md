# Hướng dẫn cho Claude Cowork – Triển khai English City Simulator lên GCP/Firebase

> Sao chép toàn bộ khối bên dưới và dán vào Claude Cowork.

```text
NHIỆM VỤ: Triển khai ứng dụng "English City Simulator" (repo GitHub công khai https://github.com/thoannv1976/k26game1,
nhánh mặc định claude/kind-faraday-0vksvn) lên Google Cloud project "k26game1" (tổ chức "mbahelp2002-org",
billing đã liên kết). Làm việc trong trình duyệt Chrome của tôi, đã đăng nhập Google Cloud Console và Firebase Console
bằng tài khoản thứ 2 (authuser=1). Dùng Cloud Shell của project k26game1 để chạy lệnh.

Tài liệu chi tiết nằm trong repo: docs/DEPLOYMENT.md (đọc nếu gặp lỗi, mục 9 là bảng xử lý sự cố).

NGUYÊN TẮC
- Không tạo khóa JSON cho service account, không dán mật khẩu/khóa vào file trong repo, không commit gì lên GitHub.
- Không xóa tài nguyên có sẵn (đặc biệt 2 project "Default Gemini Project").
- Mỗi bước: chạy, đọc kết quả, chỉ sang bước sau khi thành công. Nếu lỗi không tự xử lý được theo docs/DEPLOYMENT.md,
  dừng lại và báo tôi kèm thông báo lỗi nguyên văn.
- Hỏi tôi trước khi thay đổi chính sách tổ chức (Organization Policy) hoặc quyền ở cấp tổ chức.
- Cuối cùng báo cáo: URL ứng dụng, kết quả từng bước kiểm tra, danh sách tài khoản + mật khẩu tạm (chỉ báo trong chat).

BƯỚC 1 – Gắn Firebase vào project k26game1 (Firebase Console, trình duyệt)
1. Mở https://console.firebase.google.com/u/1/
2. Bấm "Create a new Firebase project". Ở màn hình đặt tên, KHÔNG tạo project mới: chọn liên kết
   "Add Firebase to Google Cloud project" / "Already have a Google Cloud project?" và chọn "k26game1".
3. Xác nhận gói Blaze (pay-as-you-go, dùng billing đã liên kết). Google Analytics: tắt (không cần).
4. Đợi xong, kiểm tra trang chủ Firebase có project k26game1.

BƯỚC 2 – Bật đăng nhập (Firebase Console → k26game1)
1. Build → Authentication → Get started.
2. Sign-in method → Email/Password → Enable → Save.
3. (Tùy chọn) Google → Enable → chọn email hỗ trợ → Save.
KHÔNG cần tạo Firestore hay Hosting trong Console – script ở bước 4 sẽ tạo.

BƯỚC 3 – Tạo Web App và lấy cấu hình
1. Project settings (bánh răng) → General → Your apps → biểu tượng Web (</>).
2. App nickname: english-city-web. KHÔNG tích "Firebase Hosting" ở màn này. Register app.
3. Ghi lại các giá trị trong firebaseConfig: apiKey, authDomain, projectId, appId (đây là cấu hình công khai).

BƯỚC 4 – Lấy mã nguồn và khởi tạo hạ tầng (Cloud Shell)
Mở Cloud Shell (biểu tượng >_ góc trên phải Google Cloud Console, project k26game1) và chạy lần lượt:

  gcloud config set project k26game1
  git clone https://github.com/thoannv1976/k26game1.git && cd k26game1
  git log --oneline -1
  source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22 && node -v
  bash infrastructure/bootstrap.sh

bootstrap.sh bật API, tạo Firestore (Native, asia-southeast1), Artifact Registry, bucket audio (tự xóa sau 30 ngày),
service account ecs-api và gh-deployer, Workload Identity Federation cho GitHub. Chạy lại nhiều lần vẫn an toàn.
Nếu lệnh "gcloud services enable" báo lỗi billing → báo tôi. Lưu lại phần cuối in ra (WIF_PROVIDER, …).

BƯỚC 5 – Kiểm tra model Gemini (Cloud Shell)
  curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" \
    "https://asia-southeast1-aiplatform.googleapis.com/v1/projects/k26game1/locations/asia-southeast1/publishers/google/models/gemini-2.5-flash:generateContent" \
    -d '{"contents":[{"role":"user","parts":[{"text":"Say ready"}]}]}' | head -c 600
- Có chữ "ready" trong kết quả → dùng GEMINI_MODEL=gemini-2.5-flash, VERTEX_LOCATION=asia-southeast1.
- Lỗi 404/NOT_FOUND → tìm model Gemini Flash hiện hành trong Vertex AI → Model Garden và thử lại với tên đó;
  nếu vẫn không có ở asia-southeast1 thì thử endpoint global:
  https://aiplatform.googleapis.com/v1/projects/k26game1/locations/global/publishers/google/models/<MODEL>:generateContent
  và dùng VERTEX_LOCATION=global.
Ghi lại GEMINI_MODEL và VERTEX_LOCATION dùng được.

BƯỚC 6 – Cấu hình web (Cloud Shell, trong thư mục k26game1)
Tạo file apps/web/.env.production với giá trị lấy ở bước 3:
  cat > apps/web/.env.production <<'EOF'
  VITE_FIREBASE_API_KEY=<apiKey>
  VITE_FIREBASE_AUTH_DOMAIN=k26game1.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=k26game1
  VITE_FIREBASE_APP_ID=<appId>
  VITE_USE_AUTH_EMULATOR=false
  EOF
(Xóa khoảng trắng đầu dòng nếu có. File này không được commit.)

BƯỚC 7 – Đăng nhập cho Firebase CLI và thư viện (Cloud Shell)
  gcloud auth application-default login
  gcloud auth application-default set-quota-project k26game1
  npx --yes firebase-tools@14.27.0 login --no-localhost
(Mỗi lệnh login mở một đường link: mở link trong trình duyệt bằng đúng tài khoản sở hữu project, cho phép,
 dán mã xác nhận lại vào Cloud Shell.)

BƯỚC 8 – Triển khai (Cloud Shell)
  GEMINI_MODEL=<model từ bước 5> VERTEX_LOCATION=<location từ bước 5> bash scripts/deploy.sh
Script: npm ci → unit test → Cloud Build image → Cloud Run "ecs-api" (asia-southeast1) → build web →
Firebase Hosting + Firestore rules + indexes → kiểm tra https://k26game1.web.app/api/health.
- Nếu tổ chức chặn truy cập công khai Cloud Run, script tự chuyển sang "--no-invoker-iam-check".
  Nếu bước đó cũng bị chính sách chặn (lỗi có chữ "constraint" / "organization policy") → DỪNG và báo tôi;
  cách xử lý: docs/DEPLOYMENT.md mục 4 (cần quyền Organization Policy Administrator, phải hỏi tôi trước).
- Lỗi Cloud Build về quyền → chạy lại bash infrastructure/bootstrap.sh rồi chạy lại bước 8.
- Lỗi "requires an index" xuất hiện sau đó → đợi 5–10 phút để Firestore build index.

BƯỚC 9 – Tạo dữ liệu ban đầu (Cloud Shell)
  npx tsx scripts/seed.mts --project k26game1 --tenant demo-university --name "Trường Đại học (thử nghiệm)" \
    --admin-email <EMAIL QUẢN TRỊ – hỏi tôi> --demo --approve --platform-admin <EMAIL QUẢN TRỊ>
Script in bảng tài khoản: quản trị trường, 1 giảng viên, 3 sinh viên demo kèm mật khẩu tạm. Chép lại bảng này để báo tôi.
(--approve: duyệt sẵn 6 nhiệm vụ để kiểm thử. Khi dùng thật cho trường, bỏ --approve để giảng viên tự duyệt.)

BƯỚC 10 – Kiểm tra (trình duyệt)
1. Mở https://k26game1.web.app/api/health → phải thấy "ai":"vertex","stt":"google","tts":"google","env":"production".
2. Mở https://k26game1.web.app → đăng nhập tài khoản quản trị → Quản trị → AI & hạn mức → "Kiểm tra kết nối AI" → ok.
3. Đăng xuất, đăng nhập sinh viên demo (student1@demo.edu.vn) → Bản đồ thành phố → Sân bay → M01 → Bắt đầu.
   Gõ thử 2 câu ở ô chữ (vd. "Good morning, I'd like to check in for my flight." và câu trả lời theo thẻ thông tin):
   nhân vật phải trả lời bằng tiếng Anh, đúng bối cảnh, có giọng đọc. Thử nút micro nếu máy có micro.
4. Bấm "Kết thúc ngay" → xem trang kết quả có điểm theo tiêu chí.
5. Đăng nhập giảng viên (teacher@demo.edu.vn) → mở lớp ENG101 → thấy kết quả sinh viên → Xuất CSV.
6. Cloud Console → Cloud Run → ecs-api → Logs: không có lỗi PERMISSION_DENIED.

BÁO CÁO CHO TÔI
- URL: https://k26game1.web.app
- GEMINI_MODEL / VERTEX_LOCATION đã dùng
- Kết quả 6 mục kiểm tra ở bước 10 (đạt/không đạt + ảnh chụp màn hình nếu không đạt)
- Bảng tài khoản ở bước 9
- Các giá trị cuối của bootstrap.sh (để sau này cấu hình GitHub Actions tự động triển khai)
```

## Ghi chú cho người dùng

- Chi phí: Cloud Run, Firestore, Hosting gần như miễn phí ở quy mô thử nghiệm; chi phí chính là AI (~0,1 USD/lượt chơi, xem PLAN.md mục 7).
  Nên đặt ngân sách cảnh báo: Billing → Budgets & alerts, hoặc chạy lại bootstrap với `BILLING_ACCOUNT=016D80-18C71C-FC11A8 BUDGET_USD=50`.
- Sau khi chạy ổn, có thể bật tự động triển khai qua GitHub Actions: docs/DEPLOYMENT.md mục 5.
