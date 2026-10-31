# DEPLOYMENT – Triển khai lên Google Cloud & Firebase

Tài liệu này dành cho người triển khai (anh/chị hoặc **Claude Cowork**). Mọi lệnh chạy trong **Cloud Shell** của project
`k26game1` (hoặc máy đã đăng nhập `gcloud` với quyền Owner).

> Kiến trúc: Firebase Hosting (web) → rewrite `/api/**` → Cloud Run `ecs-api` (asia-southeast1) → Firestore, Firebase Auth,
> Cloud Storage, Vertex AI Gemini, Speech-to-Text, Text-to-Speech. Không cần API key bí mật: Cloud Run dùng service account.

---

## 0. Điều kiện

| Hạng mục | Cách kiểm tra |
|---|---|
| Billing đã liên kết với `k26game1` | Console → Billing |
| Firebase đã gắn vào project (`Add Firebase to an existing Google Cloud project`) | console.firebase.google.com thấy project `k26game1` |
| Firebase Authentication đã bật **Email/Password** (và Google nếu cần) | Firebase Console → Authentication → Sign-in method |
| Có Web App trong Firebase | Project settings → Your apps → Web (lấy `apiKey`, `authDomain`, `appId`) |
| Node.js 22, npm | `node -v` (Cloud Shell có sẵn; nếu là bản cũ: `nvm install 22`) |

## 1. Lấy mã nguồn

```bash
git clone https://github.com/thoannv1976/k26game1.git && cd k26game1
```

(Dùng nhánh đã được merge vào `main`; nếu chưa merge, `git checkout claude/kind-faraday-0vksvn`.)

## 2. Khởi tạo hạ tầng (một lần)

```bash
bash infrastructure/bootstrap.sh
```

Script (chạy lại nhiều lần vẫn an toàn) sẽ:

- bật các API cần thiết;
- tạo Firestore **Native mode ở asia-southeast1** (nếu chưa có — vùng không đổi được sau khi tạo);
- tạo Artifact Registry `ecs`, bucket `gs://k26game1-audio` (chặn truy cập công khai, **tự xóa audio sinh viên sau 30 ngày**);
- tạo service account chạy API `ecs-api@…` với quyền tối thiểu (Firestore, Vertex AI, Firebase Auth admin, bucket audio);
- tạo service account triển khai `gh-deployer@…` và **Workload Identity Federation** cho repo `thoannv1976/k26game1`
  (GitHub Actions không cần khóa JSON);
- (tùy chọn) tạo cảnh báo ngân sách nếu đặt `BILLING_ACCOUNT=…`.

Tùy chọn: `AUDIO_RETENTION_DAYS=14 BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX BUDGET_USD=50 bash infrastructure/bootstrap.sh`

Cuối script in ra các giá trị cần cho GitHub Actions (mục 5).

## 3. Kiểm tra model Gemini

Model mặc định là `gemini-2.5-flash`. Google thay đổi danh sách model theo thời gian, nên **kiểm tra model Flash đang có ở vùng
`asia-southeast1`** trong Vertex AI → Model Garden và đặt biến `GEMINI_MODEL` cho đúng. Nếu model không có ở vùng này, đặt
`VERTEX_LOCATION=global`. Sau khi triển khai, kiểm tra bằng Admin → AI & hạn mức → **Kiểm tra kết nối AI**.

## 4. Triển khai thủ công (Cloud Shell / Cowork)

```bash
cp apps/web/.env.example apps/web/.env.production
```

Sửa `apps/web/.env.production`: điền `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` (thường là `k26game1.firebaseapp.com`),
`VITE_FIREBASE_PROJECT_ID=k26game1`, `VITE_FIREBASE_APP_ID`, và `VITE_USE_AUTH_EMULATOR=false`.

```bash
GEMINI_MODEL=gemini-2.5-flash bash scripts/deploy.sh
```

Script: cài thư viện → chạy unit test → build image bằng Cloud Build → `gcloud run deploy ecs-api` → build web →
`firebase deploy` (Hosting, Firestore rules, indexes) → gọi `https://k26game1.web.app/api/health`.

> **Tổ chức chặn truy cập công khai.** Firebase Hosting gọi Cloud Run không kèm danh tính Google, nên dịch vụ `ecs-api`
> phải nhận request công khai (API tự kiểm tra Firebase ID token ở mọi endpoint). Tổ chức mới thường bật chính sách
> *Domain restricted sharing* (`iam.allowedPolicyMemberDomains`) nên `--allow-unauthenticated` không gán được `allUsers`.
> `scripts/deploy.sh` tự xử lý bằng `gcloud run services update ecs-api --no-invoker-iam-check`. Nếu chính sách
> `run.managed.requireInvokerIam` cũng chặn cách này, người có quyền Organization Policy Administrator cho phép ngoại lệ ở project:
>
> ```bash
> gcloud org-policies describe iam.allowedPolicyMemberDomains --effective --project k26game1
> ```
>
> ```bash
> printf 'name: projects/k26game1/policies/iam.allowedPolicyMemberDomains\nspec:\n  rules:\n  - allowAll: true\n' > /tmp/p.yaml && gcloud org-policies set-policy /tmp/p.yaml
> ```
>
> rồi chạy lại `bash scripts/deploy.sh`.

## 5. Triển khai tự động bằng GitHub Actions

GitHub → Settings → Environments: tạo **development** (và **production** có *Required reviewers*). Trong mỗi environment,
thêm **Variables** (không phải secrets — đây không phải khóa bí mật):

| Variable | Giá trị (development) |
|---|---|
| `GCP_PROJECT_ID` | `k26game1` |
| `GCP_REGION` | `asia-southeast1` |
| `WIF_PROVIDER` | in ra từ bootstrap (`projects/<số>/locations/global/workloadIdentityPools/github/providers/github-oidc`) |
| `DEPLOYER_SA` | `gh-deployer@k26game1.iam.gserviceaccount.com` |
| `RUNTIME_SA` | `ecs-api@k26game1.iam.gserviceaccount.com` |
| `AUDIO_BUCKET` | `k26game1-audio` |
| `GEMINI_MODEL` | model Flash đã kiểm tra ở mục 3 |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID` | từ Firebase Web App |
| `MIN_INSTANCES` (tùy chọn) | `0` cho dev, `1` cho production để giảm độ trễ |

Luồng: PR/push → **CI** (typecheck, unit, integration + rules trên emulator, build, E2E). Push vào `main` + CI xanh →
**Deploy dev**. **Deploy production** chỉ chạy thủ công (Actions → Deploy production → Run) và chờ người duyệt.

## 6. Tạo dữ liệu ban đầu

Cần Application Default Credentials của anh/chị trong Cloud Shell:

```bash
gcloud auth application-default login
```

Tạo trường, tài khoản quản trị, ngân hàng nhiệm vụ (và lớp/tài khoản demo để nghiệm thu):

```bash
npx tsx scripts/seed.mts --project k26game1 --tenant demo-university --name "Trường Đại học (thử nghiệm)" --admin-email admin@your-school.edu.vn --demo --platform-admin your-email@gmail.com
```

- Không có `--approve`: 6 nhiệm vụ ở trạng thái **nháp** → giảng viên/quản trị vào **Quản trị → Nhiệm vụ** để duyệt
  (đúng yêu cầu "nội dung phải được giảng viên kiểm duyệt"). Thêm `--approve` nếu nội dung đã được duyệt.
- Mật khẩu tạm in ra một lần; người dùng nên đổi mật khẩu (Firebase gửi email đặt lại mật khẩu nếu cần).

## 7. Kiểm tra sau triển khai (smoke test)

1. `https://k26game1.web.app/api/health` trả `{"ok":true,"ai":"vertex","stt":"google","tts":"google","env":"production"}`.
2. Đăng nhập tài khoản quản trị → **AI & hạn mức → Kiểm tra kết nối AI** trả `ok: true`.
3. Đăng nhập sinh viên demo → Thành phố → Airport → M01 → nói 2–3 câu bằng micro → nhân vật trả lời bằng giọng nói.
4. Hoàn thành nhiệm vụ → xem kết quả; đăng nhập giảng viên → thấy kết quả, thẩm định, xuất CSV.
5. Cloud Run → `ecs-api` → Logs: không có lỗi `PERMISSION_DENIED`.

## 8. Môi trường Production

1. Tạo project mới `k26game1-prod`, liên kết billing, gắn Firebase, bật Auth (như mục 0).
2. `PROJECT_ID=k26game1-prod GITHUB_REPO=thoannv1976/k26game1 bash infrastructure/bootstrap.sh`
3. Điền variables cho GitHub Environment **production**; đặt `MIN_INSTANCES=1`.
4. Chạy workflow **Deploy production**; seed trường thật (không `--demo`).
5. Cấu hình hạn mức & ngân sách thực tế trong Admin; đặt Budget Alert.

## 9. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `/api/**` trả 404 trên web.app | Cloud Run `ecs-api` chưa có ở `asia-southeast1`, hoặc tên service khác `firebase.json` |
| 403 khi Hosting gọi Cloud Run | Thiếu `allUsers` → `roles/run.invoker` (xem ghi chú mục 4) |
| Đăng nhập lỗi `auth/operation-not-allowed` | Chưa bật Email/Password trong Firebase Authentication |
| `NOT_PROVISIONED` sau khi đăng nhập | Tài khoản chưa được thêm vào trường (Admin → Người dùng) hoặc domain chưa khai báo |
| AI luôn trả câu dự phòng | Sai `GEMINI_MODEL`/`VERTEX_LOCATION`, chưa bật `aiplatform.googleapis.com`, hoặc thiếu `roles/aiplatform.user` |
| `AUDIO_UNCLEAR` liên tục | Micro quá nhỏ/ồn; kiểm tra quyền micro của trình duyệt; thử Chrome |
| `FAILED_PRECONDITION: The query requires an index` | Chưa deploy indexes: `npx firebase deploy --only firestore:indexes` (chờ vài phút để index build) |
| `BUDGET_EXCEEDED` | Ngân sách tháng của trường đã hết — tăng trong Admin → AI & hạn mức |
