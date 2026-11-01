# KẾ HOẠCH XÂY DỰNG GAME 2 – ENGLISH DETECTIVE (AI MYSTERY CHALLENGE)

> Phiên bản kế hoạch: 1.0 · Ngày lập: 01/11/2026 · Trạng thái: **chờ duyệt**
> Đặc tả gốc: [docs/spec/game2-english-detective.md](../spec/game2-english-detective.md)
> Kế thừa: kiến trúc, nền tảng và bài học từ Game 1 – English City Simulator (đã hoàn thành, 141/141 kiểm thử đạt)

---

## 0. Tóm tắt

English Detective là web game luyện **Đọc – Viết – Tư duy phản biện** B1–B2. Sinh viên là thám tử của *English Detective Agency*:
đọc tài liệu tiếng Anh (email, thông báo, trang web, hợp đồng, số liệu), trả lời câu hỏi đọc hiểu, **tự tìm và đánh dấu bằng chứng**
trong tài liệu, **phỏng vấn nhân vật AI** bằng văn bản, phân loại và kết nối bằng chứng trên Case Board, chọn kết luận, rồi **viết báo cáo
150–250 từ**. AI chấm sơ bộ theo rubric 100 điểm; giảng viên thẩm định.

**Điểm cốt lõi (theo đặc tả mục VI.6):** mỗi vụ việc có một **Canonical Case Dossier** – hồ sơ dữ kiện chuẩn đã được giảng viên
duyệt. **Game Engine (code xác định)** quản lý mở khóa tài liệu/bằng chứng, trạng thái điều tra và phần lớn điểm số; AI chỉ đóng vai
nhân vật, hỗ trợ học tập và chấm phần viết/lập luận. AI không thể tạo dữ kiện quyết định mới hay thay đổi đáp án.

**Phạm vi v1.0:** 6 vụ việc CASE01–CASE06 (3 B1, 3 B2) · Detective Office 2.5D · Document Room (đánh dấu, ghi chú, tra từ) ·
Interview Room (3 nhân vật/vụ) · Case Board (phân loại, kết nối, có thao tác thay thế kéo-thả) · Notebook · Report Editor (tự lưu nháp)
· chấm bất đồng bộ · trợ lý AI · công cụ AI soạn vụ việc mới cho giảng viên · dashboard SV/GV/quản trị · bảng xếp hạng lớp (chỉ điểm
trò chơi) · hạn mức chi phí · xuất CSV · API LMS-AI9 dùng chung định dạng với Game 1.

**Lộ trình:** 7 giai đoạn, ước tính **5–7 tuần** (nhanh hơn Game 1 nhờ tái sử dụng nền tảng; nút thắt chính là duyệt nội dung 6 vụ việc).

| GĐ | Nội dung | Ước tính | Ai làm |
|---|---|---|---|
| 0 | Tạo repo, chốt quyết định D1–D3 | 0,5 ngày | **Anh/chị** |
| 1 | Nền tảng: repo mới, tái sử dụng lớp nền của Game 1, Auth, phân quyền, dữ liệu, CI | 3–4 ngày | Claude Code |
| 2 | Game Engine: dossier, mở khóa, tài liệu, bằng chứng, Case Board, notebook, báo cáo | 1,5 tuần | Claude Code |
| 3 | AI: nhân vật, trợ lý, chấm bài viết, gợi ý học tập, kiểm soát dữ kiện | 1 tuần | Claude Code |
| 4 | Nội dung 6 vụ việc + công cụ AI soạn vụ việc & quy trình duyệt | 1 tuần (song song GĐ 2–3) | Claude Code + **giảng viên duyệt** |
| 5 | Dashboard, xếp hạng, báo cáo, CSV, API LMS, hạn mức | 1 tuần | Claude Code |
| 6 | Kiểm thử đầy đủ + tài liệu + hướng dẫn Cowork triển khai | 1 tuần (chạy song song từ GĐ 1) | Claude Code |

---

## 1. Quyết định cần anh/chị duyệt

| # | Vấn đề | Đề xuất | Phương án khác |
|---|---|---|---|
| **D1** | Repository | **Repo mới `thoannv1976/k26game2`** (công khai như Game 1). Đặc tả yêu cầu repo độc lập; tên theo quy ước `k26game1`. Anh/chị tạo repo trống (hoặc cho phép tôi tạo) | Tên `english-detective` như đặc tả; hoặc đặt chung repo `k26game1` dạng monorepo (dễ dùng chung code nhưng trái đặc tả "repo độc lập") |
| **D2** | Hạ tầng GCP | **Dùng chung project `k26game1`**: Cloud Run riêng `detective-api`, Hosting site riêng `k26-detective` (https://k26-detective.web.app), **Firestore database riêng tên `detective`**. Lợi ích: **một tài khoản đăng nhập dùng cho cả hai game** (đúng định hướng hệ sinh thái), một billing, Cowork không phải gắn Firebase lại; dữ liệu hai game vẫn tách biệt (đặc tả: "không phụ thuộc trực tiếp vào cơ sở dữ liệu của Game 1") | Project mới `k26game2`: tách biệt hoàn toàn, nhưng sinh viên phải có tài khoản riêng cho từng game, phải gắn Firebase/billing lại |
| **D3** | Mức tái sử dụng Game 1 | **Sao chép và tổng quát hóa lớp nền** (Auth/claims, trường, người dùng, lớp, hạn mức, usage, audit, CSV, triển khai, CI) sang repo mới; **phần game viết mới hoàn toàn**. Chuẩn hóa định dạng minh chứng chung `k26-evidence-1.0` cho cả 2 game | Tách lớp nền thành package npm riêng dùng chung (sạch hơn nhưng tốn thêm 1–2 tuần, nên làm khi có Game 3) |

Các quyết định kỹ thuật mặc định (đổi được trước GĐ 1):

| # | Vấn đề | Quyết định | Lý do |
|---|---|---|---|
| T1 | Phỏng vấn | Văn bản (v1.0), kiến trúc sẵn chỗ cho giọng nói (dùng lại pipeline Game 1) | Đặc tả mục VII.5 |
| T2 | Thu thập bằng chứng | Sinh viên **bôi đen đoạn văn** trong tài liệu → server đối chiếu với danh sách bằng chứng chuẩn (khớp đoạn trích) → nếu khớp thì thành bằng chứng, nếu không thì lưu thành "manh mối cá nhân" trong notebook | Sinh viên phải tự tìm, không chọn từ danh sách có sẵn; có gây nhiễu |
| T3 | Chấm bất đồng bộ | `POST /submit` lưu bài + trả `202 queued`; việc chấm được "nhận" bằng khóa trong Firestore và chạy khi client kiểm tra trạng thái (`GET /results`), tự thử lại nếu lỗi; **không cần gửi lại bài** | Đúng đặc tả IX, không cần thêm Cloud Tasks; có thể nâng cấp lên Cloud Tasks sau |
| T4 | Lưu nháp | Tự lưu lên server mỗi 10 giây khi có thay đổi (kèm số phiên bản chống ghi đè) + bản sao trong trình duyệt khi mất mạng | "Không để lỗi mạng làm mất bài" |
| T5 | Hồ sơ vụ việc | Mỗi phiên bản dossier là **một tài liệu Firestore** (tài liệu, nhân vật, bằng chứng, câu hỏi, đáp án, rubric) chỉ backend đọc được; client chỉ nhận phần đã mở khóa | Phiên bản hóa nguyên khối, không lộ đáp án ra trình duyệt |
| T6 | Mô hình AI | Gemini Flash qua Vertex AI (`GEMINI_MODEL`), cùng cấu hình với Game 1 | Đã kiểm chứng kiến trúc ở Game 1 |
| T7 | Giao diện | Tiếng Việt/Anh, nội dung vụ việc bằng tiếng Anh; 2.5D bằng SVG như Game 1 | Đồng bộ trải nghiệm hai game |

---

## 2. Kiến trúc

```
Trình duyệt (React SPA) ── Firebase Auth (dùng chung với Game 1)
     │  /api/** + ID token
     ▼
Firebase Hosting site "k26-detective" ──rewrite──► Cloud Run "detective-api" (asia-southeast1)
                                                     ├─ Firestore database "detective" (tách khỏi Game 1)
                                                     ├─ Firebase Auth Admin (claims {tenantId, role} dùng chung)
                                                     ├─ Vertex AI Gemini (nhân vật, trợ lý, chấm bài, soạn vụ việc)
                                                     └─ Cloud Storage (xuất báo cáo, tài liệu đính kèm nếu có)
```

Cấu trúc repo (theo đặc tả XIII.1):

```
apps/web               React + Vite + Tailwind
apps/api               Fastify API (Cloud Run)
packages/shared        Kiểu dữ liệu, schema dossier, định dạng minh chứng k26-evidence
packages/game-engine   Logic điều tra xác định: mở khóa, bằng chứng, giai đoạn, chấm phần xác định
packages/ai            Prompt + provider: Character, Assistant, Writing Grader, Recommendation, Case Generator
content/cases          CASE01–CASE06 (JSON, kiểm tra bằng schema + test)
firebase/ infrastructure/ scripts/ tests/ docs/ .github/workflows/
```

---

## 3. Canonical Case Dossier (hồ sơ dữ kiện chuẩn)

Schema zod trong `packages/shared`, mỗi vụ việc gồm:

| Thành phần | Nội dung | Ai thấy |
|---|---|---|
| `meta` | mã, tiêu đề {en, vi}, cấp độ, vai trò, bối cảnh, thời lượng, điểm thưởng | SV |
| `briefing` | giới thiệu tình huống, mục tiêu điều tra | SV |
| `documents[]` | email, thông báo, trang web, hợp đồng, bảng số liệu, tin nhắn…; `unlock`: có sẵn / mở sau khi phỏng vấn tiết lộ dữ kiện X / sau khi trả lời câu Y; `glossary` (từ khó + nghĩa) | SV (chỉ tài liệu đã mở) |
| `questions[]` | đọc hiểu: trắc nghiệm, True/False/Not Given, điền ngắn (đáp án xác định – **máy chấm**), giải thích (AI chấm theo ý chính) | SV thấy câu hỏi, **không** thấy đáp án |
| `evidence[]` | đoạn trích trong tài liệu, phân loại chuẩn (verified / unverified / irrelevant), `key` (bằng chứng then chốt), lý do | chỉ server |
| `characters[]` | tên, vai, tính cách, lý lịch, **known facts** (mỗi dữ kiện có id, điều kiện được nói, có thể mở khóa tài liệu/bằng chứng), **restricted info** (không được tiết lộ), phong cách B1/B2 | SV thấy tên/vai/ảnh; dữ kiện chỉ server |
| `links[]` | các cặp bằng chứng liên quan chuẩn (để chấm Case Board) | chỉ server |
| `conclusions` | các kết luận lựa chọn, kết luận được bằng chứng hỗ trợ, **những nhận định chưa đủ cơ sở** | SV thấy lựa chọn; đáp án chỉ server |
| `writingTask` | dạng (report/email), đề bài, số từ, các phần bắt buộc, ý chính mong đợi, rubric 10/7/7/6 | SV thấy đề; ý chính chỉ server |
| `hints` | 3 cấp gợi ý cho từng giai đoạn | SV (khi yêu cầu) |
| `limits` | lượt phỏng vấn/nhân vật, lượt trợ lý, số lần chấm, thời lượng | SV |

Dossier có phiên bản (nháp → duyệt → thay thế), như ngân hàng nhiệm vụ Game 1. **Phiên đang chơi giữ nguyên phiên bản khi bắt đầu**
(đặc tả: "không cho phép AI tự thay đổi dữ kiện chuẩn khi sinh viên đang chơi").

---

## 4. Game Engine (code xác định – `packages/game-engine`)

**Sáu giai đoạn** theo đặc tả V.1: Introduction → Documents → Evidence → Interviews → Analysis → Final Report. Engine theo dõi trạng thái
từng giai đoạn; sinh viên được quay lại tài liệu/phỏng vấn/bằng chứng bất kỳ lúc nào trước khi nộp.

| Cơ chế | Quy tắc |
|---|---|
| Mở khóa | Tài liệu/bằng chứng mở theo điều kiện trong dossier (dữ kiện đã được nhân vật tiết lộ, câu hỏi đã trả lời). Chỉ engine quyết định |
| Thu thập bằng chứng | Đoạn bôi đen phải nằm trong tài liệu **đã mở**; khớp với đoạn trích chuẩn (chuẩn hóa chữ hoa/thường, dấu câu, độ phủ ≥ 60%) → bằng chứng; không khớp → manh mối cá nhân |
| Phân loại & liên kết | SV xếp bằng chứng vào 3 nhóm + giải thích ngắn (tiếng Anh) + tạo liên kết giữa các bằng chứng |
| Điều kiện nộp báo cáo | Đã trả lời các câu đọc hiểu bắt buộc, có ≥ N bằng chứng, đã chọn kết luận kèm bằng chứng hỗ trợ (cấu hình theo vụ) |
| Nhân vật tiết lộ dữ kiện | AI trả về `factsRevealed[]`; engine chỉ chấp nhận id dữ kiện **thuộc nhân vật đó và đủ điều kiện** ở thời điểm đó → mở khóa tương ứng |
| Gợi ý 3 cấp | Theo giai đoạn hiện tại; ghi nhận số lần dùng; trừ **điểm trò chơi**, không trừ điểm năng lực |

---

## 5. Hệ thống AI (`packages/ai`)

| Thành phần | Đầu vào được phép | Đầu ra (JSON có schema, kiểm tra bằng zod) | Kiểm soát |
|---|---|---|---|
| **Character Engine** | hồ sơ nhân vật, **chỉ các dữ kiện đủ điều kiện**, danh sách thông tin bị cấm, lịch sử phỏng vấn với nhân vật đó, câu hỏi SV (khối dữ liệu riêng) | `reply`, `factsRevealed[]`, `outOfScope` | Không có đáp án/kết luận trong prompt; bộ lọc chặn cụm từ thuộc thông tin bị cấm; câu ngoài hồ sơ → "I don't know / I can't confirm that"; giới hạn lượt |
| **Investigation Assistant** | tài liệu đã mở, câu hỏi SV, gợi ý cấp hiện tại | `answer`, `kind` (vocab / grammar / strategy / refused) | Không nhận đáp án/dossier ẩn; từ chối giải hộ vụ việc hay viết hộ báo cáo; giới hạn lượt |
| **Writing Grader** | đề bài, rubric 10/7/7/6, ý chính mong đợi, bài viết SV | điểm thành phần + nhận xét + **ví dụ trích từ bài** + sửa lỗi | Mọi trích dẫn/lỗi phải **có thật trong bài** (server kiểm tra, loại bỏ nhận xét không khớp); lưu phiên bản rubric, prompt, model |
| **Critical-thinking grader** | dossier (kết luận chuẩn, nhận định chưa đủ cơ sở), giải thích bằng chứng & lập luận của SV | điểm phần lập luận + nhận xét | Phần xác định do engine chấm (xem mục 6) |
| **Learning Recommendation** | kết quả các tiêu chí, lỗi thường gặp | từ vựng, ngữ pháp, dạng bài đọc, nhiệm vụ viết tiếp theo, kỹ năng lập luận | Vụ việc tiếp theo do code chọn |
| **Case Generator** (cho giảng viên) | chủ đề, cấp độ, mục tiêu, số tài liệu/nhân vật, thời lượng, dạng bài viết | **dossier hoàn chỉnh** (đúng schema) | Chỉ tạo **bản nháp**; kiểm tra tính nhất quán bằng code (bằng chứng phải nằm trong tài liệu, dữ kiện nhân vật tham chiếu đúng id…); chỉ công bố khi giảng viên duyệt |

Mọi lời gọi AI ở backend, có retry giới hạn, timeout, câu trả lời dự phòng khi AI lỗi, ghi `usage_logs`, áp hạn mức.
Nội dung tài liệu và lời SV được xử lý như **dữ liệu không tin cậy** (chống prompt injection – đặc tả X.2).

---

## 6. Chấm điểm (100 điểm) – tách phần máy chấm và phần AI

| Tiêu chí | Điểm | Cách chấm |
|---|---|---|
| Reading Comprehension | 25 | Câu đáp án xác định: **máy chấm**; câu giải thích: AI chấm theo ý chính trong dossier. Thiếu câu giải thích → chấm trên phần có |
| Evidence Collection | 25 | **Máy chấm**: tìm được bằng chứng then chốt (độ phủ), phân loại đúng nhóm, tránh bằng chứng gây nhiễu (độ chính xác), liên kết đúng |
| Critical Thinking | 20 | 10 điểm **máy chấm** (chọn đúng kết luận + bằng chứng hỗ trợ hợp lệ, không dựa vào thông tin chưa xác minh) + 10 điểm AI (chất lượng giải thích, đối chiếu dossier) |
| English Writing | 30 | AI: Task Achievement 10, Coherence & Cohesion 7, Vocabulary 7, Grammar 6; số từ ngoài khoảng → ghi nhận trong Task Achievement |

- AI lỗi → các phần AI ghi **"chưa đánh giá"**, không tự tạo điểm (như Game 1); giảng viên có thể chấm tay.
- **Điểm trò chơi tách riêng**: Detective Points (hoạt động, giải vụ, trừ khi dùng gợi ý), XP, cấp độ, huy hiệu.
- **Bảng xếp hạng lớp chỉ hiện điểm trò chơi/huy hiệu**, không hiện bài viết hay điểm năng lực (đặc tả V.3).
- Kết quả ghi rõ: phản hồi do AI hỗ trợ, không phải điểm chính thức; giảng viên thẩm định từng tiêu chí.

---

## 7. Dữ liệu Firestore (database `detective`, multi-tenant)

```
tenants/{t}                                 cấu hình trường, hạn mức, cấu hình AI
  users/{uid}  courses/{id}  assignments/{id}
  cases/{caseId}                            meta, approvedVersion, status
    versions/{n}                            dossier đầy đủ (tài liệu, nhân vật, bằng chứng, câu hỏi, đáp án, rubric) – chỉ backend
  investigation_sessions/{sid}              người chơi, vụ, phiên bản, giai đoạn, mở khóa, câu trả lời, bằng chứng, phân loại,
                                            liên kết, kết luận, gợi ý, thời gian, điểm trò chơi
    interview_messages/{clientMsgId}        nhân vật, câu hỏi, trả lời, dữ kiện tiết lộ (id = chống gửi trùng)
    notes/notebook                          ghi chú, manh mối cá nhân
    drafts/current                          bản nháp báo cáo + số phiên bản
  final_reports/{sid}                       bài nộp, số từ, thời điểm, trạng thái chấm
  assessments/{sid}                         4 tiêu chí + thành phần, nhận xét, phiên bản rubric/prompt/model, thẩm định GV
  usage_counters/  usage_logs/  audit_logs/
```

Ánh xạ với đặc tả: `case_documents`, `case_characters`, `case_evidence` nằm trong `cases/{id}/versions/{n}` để phiên bản hóa nguyên khối;
`investigation_notes` = `notes/notebook`; các collection còn lại giữ tên như đặc tả. Firestore Rules cấm client ghi và cấm đọc dossier.

---

## 8. API chính

Theo bảng đặc tả IX, bổ sung: `GET /cases`, `GET /cases/:id` · `POST /sessions` (bắt đầu/tiếp tục) · `GET /sessions/:id` ·
`GET /sessions/:id/documents` · `POST /sessions/:id/answers` · `POST /sessions/:id/highlights` (thu thập bằng chứng) ·
`PUT /sessions/:id/board` (phân loại + liên kết) · `POST /sessions/:id/interviews` · `POST /sessions/:id/assistant` ·
`POST /sessions/:id/hint` · `PUT /sessions/:id/notes` · `PUT /sessions/:id/draft` · `POST /sessions/:id/conclusion` ·
`POST /sessions/:id/submit` (202) · `GET /sessions/:id/results` (trạng thái chấm/kết quả) · `GET /leaderboard?courseId=` ·
`/teacher/*` (lớp, giao vụ, theo dõi quá trình điều tra, đọc bài, thẩm định, xuất CSV) · `/admin/*` (người dùng, lớp, vụ việc +
**AI soạn vụ việc** + duyệt, cấu hình AI, hạn mức, sử dụng, nhật ký) · `/platform/*` · `/lms/v1/*` (định dạng `k26-evidence-1.0`).

Mọi API: xác thực, kiểm tra quyền và sở hữu phiên, kiểm tra đầu vào, chống gửi trùng (id do client tạo), giới hạn tần suất, ghi log.

---

## 9. Giao diện

| Màn hình | Nội dung chính |
|---|---|
| Detective Office | Văn phòng 2.5D (SVG): bảng vụ việc, bàn làm việc, cửa vào Document Room / Interview Room / Case Board / Report Room / Academy |
| Case workspace | Thanh tiến độ 6 giai đoạn; tab Tài liệu – Câu hỏi – Phỏng vấn – Case Board – Sổ tay – Báo cáo; đồng hồ; nút gợi ý; trợ lý AI |
| Document Viewer | Định dạng theo loại (email, trang web, hợp đồng, bảng); bôi đen → "Lưu làm bằng chứng"; đánh dấu; ghi chú; chạm từ → nghĩa (glossary, rồi trợ lý AI) |
| Interview Room | Chọn nhân vật (ảnh đại diện, vai), khung chat, lượt còn lại, "Lưu vào sổ tay" |
| Case Board | 3 cột Verified / Unverified / Irrelevant, thẻ bằng chứng, nối liên kết; **thay thế kéo-thả**: chọn thẻ → nút "Chuyển sang…"/"Liên kết với…" (điện thoại, bàn phím) |
| Report Editor | Đề bài, khung gợi ý cấu trúc (Summary, Evidence, Analysis, Conclusion, Recommendations), đếm từ, đồng hồ, ghi chú bên cạnh, tự lưu, xác nhận trước khi nộp |
| Kết quả | 4 tiêu chí + thành phần Writing, nhận xét có trích dẫn từ bài, bằng chứng bỏ sót, kết luận chuẩn (sau khi nộp), khuyến nghị, chơi lại |
| Detective Academy | Hồ sơ, cấp độ, XP, Detective Points, huy hiệu, bảng xếp hạng lớp |
| Giảng viên | Lớp, giao vụ, tiến độ từng SV (giai đoạn, bằng chứng, phỏng vấn), đọc báo cáo + đánh giá AI, thẩm định, xuất CSV |
| Quản trị | Người dùng, lớp, **vụ việc (soạn bằng AI → sửa → duyệt)**, cấu hình AI, hạn mức, chi phí, nhật ký |

---

## 10. Lộ trình chi tiết & điều kiện hoàn thành

**GĐ 0 – Chuẩn bị (anh/chị):** duyệt kế hoạch + D1–D3; tạo repo trống `thoannv1976/k26game2` (hoặc cho phép tôi tạo).

**GĐ 1 – Nền tảng (3–4 ngày):** monorepo theo cấu trúc mục 2; sao chép-tổng quát hóa lớp nền Game 1 (Auth/claims, trường, người dùng,
lớp, hạn mức, usage, audit, CSV); Firestore database `detective`; rules + indexes; CI; khung giao diện + Detective Office.
*Xong khi:* đăng nhập 4 vai trò trên emulator; test tách dữ liệu SV/trường; CI xanh. **Tài khoản Game 1 đăng nhập được Game 2.**

**GĐ 2 – Game Engine (1,5 tuần):** schema dossier, engine mở khóa/bằng chứng/giai đoạn/chấm phần xác định; API phiên, tài liệu, câu trả lời,
bằng chứng, board, notebook, nháp, nộp; Document Viewer, Case Board (kèm thao tác thay thế), Notebook, Report Editor (tự lưu).
*Xong khi:* chơi trọn 1 vụ với AI giả lập; unit test engine; test lưu nháp/nộp, chống gửi trùng, tiếp tục phiên.

**GĐ 3 – AI (1 tuần):** Character Engine, Assistant, Writing Grader (kiểm tra trích dẫn), Critical-thinking grader, Recommendation;
chấm bất đồng bộ; dự phòng khi AI lỗi; hạn mức. *Xong khi:* test nhân vật không lộ thông tin bị cấm/đáp án (AI giả lập + bộ kiểm thử
đối kháng), test chấm khi AI lỗi, test hạn mức.

**GĐ 4 – Nội dung (1 tuần, song song):** 6 vụ việc đầy đủ (5–7 tài liệu, 3 nhân vật, 6–10 câu hỏi, 8–12 bằng chứng gồm gây nhiễu,
kết luận, đề viết, rubric); test tự động kiểm tra tính nhất quán từng dossier và "chơi mẫu" hoàn thành từng vụ; Case Generator +
quy trình duyệt. *Giảng viên duyệt nội dung* → trạng thái approved.

**GĐ 5 – Dashboard & tích hợp (1 tuần):** Academy, xếp hạng lớp, dashboard GV/quản trị, CSV, `/lms/v1` với `k26-evidence-1.0`
(cập nhật Game 1 xuất cùng định dạng), báo cáo sử dụng.

**GĐ 6 – Kiểm thử & bàn giao (1 tuần):** toàn bộ bộ kiểm thử mục 11; tài liệu README, ARCHITECTURE, DATABASE, API, DEPLOYMENT, TESTING,
SECURITY, OPERATIONS, **hướng dẫn sử dụng cho giảng viên và sinh viên**, hướng dẫn chi phí AI; `docs/COWORK-DEPLOY.md` để dán vào Cowork;
script `scripts/eval-characters` chạy bộ câu hỏi đối kháng với **Gemini thật** trên môi trường dev để nghiệm thu nhân vật.

---

## 11. Kiểm thử bắt buộc

| Kiểm thử | Loại |
|---|---|
| Đăng nhập, phân quyền 4 vai trò; tài khoản dùng chung với Game 1 | Integration + E2E |
| SV không xem dữ liệu SV khác; trường không xem dữ liệu trường khác | API + Rules |
| **Client không đọc được dossier/đáp án/tài liệu chưa mở** | API + Rules |
| Engine: mở khóa, khớp đoạn trích, phân loại, điều kiện nộp, chấm phần xác định | Unit |
| **Nhân vật tuân thủ dữ kiện**: không lộ thông tin bị cấm, không lộ tài liệu chưa mở, chỉ tiết lộ dữ kiện đủ điều kiện, chống prompt injection | Unit/Integration (AI giả lập) + `eval-characters` với Gemini thật (thủ công trước nghiệm thu) |
| Grader: loại bỏ nhận xét trích dẫn không có trong bài; AI lỗi → "chưa đánh giá" | Integration |
| Lưu nháp (xung đột phiên bản, mất mạng), nộp bài, chấm bất đồng bộ, không chấm trùng | Integration + E2E |
| Hạn mức: lượt phỏng vấn, trợ lý, số lần chấm, ngân sách | Integration |
| 6 vụ việc: dossier nhất quán + chơi mẫu hoàn thành | Unit (content tests) + Integration |
| Xuất CSV, API LMS | Integration |
| E2E: SV chơi trọn 1 vụ (desktop + điện thoại, Case Board bằng thao tác thay thế); GV thẩm định; quản trị duyệt vụ do AI soạn | Playwright |

---

## 12. Ánh xạ tiêu chí nghiệm thu (đặc tả XIV)

| # | Tiêu chí | GĐ | Chứng minh |
|---|---|---|---|
| 1 | Đăng nhập, vào Detective Office | 1 | E2E |
| 2 | 6 vụ việc hoạt động hoàn chỉnh | 4 | Content tests + chơi tay trên dev |
| 3 | Đọc tài liệu, làm bài đọc hiểu | 2 | Integration + E2E |
| 4 | Thu thập, phân loại, kết nối bằng chứng | 2 | Unit + E2E |
| 5 | Phỏng vấn nhân vật AI bằng tiếng Anh | 3 | Integration + thủ công với Gemini |
| 6 | Nhân vật trả lời theo hồ sơ đã duyệt | 3 | Test tuân thủ + `eval-characters` |
| 7 | Viết, lưu nháp, nộp báo cáo | 2 | Integration + E2E |
| 8 | AI chấm sơ bộ, điểm và phản hồi | 3 | Integration |
| 9 | GV theo dõi, thẩm định | 5 | E2E |
| 10 | Quản trị theo dõi hoạt động, người dùng, mức dùng AI | 5 | Integration |
| 11 | Quyền truy cập, phân tách trường | 1–6 | API + Rules tests |
| 12 | Kiểm thử kỹ thuật & bảo mật đạt | 6 | CI, `docs/TESTING.md` |
| 13 | Triển khai trên GCP/Firebase | 6 | Cowork triển khai theo `docs/COWORK-DEPLOY.md` |
| 14 | Bàn giao mã, dữ liệu mẫu, tài liệu | 6 | Repo |

---

## 13. Chi phí ước tính (tham khảo)

Không có giọng nói nên rẻ hơn Game 1. Một phiên ~25 phút: ~10–15 lượt phỏng vấn + vài lượt trợ lý + 1 lần chấm (bài ~200 từ):
**~0,02–0,05 USD/phiên** với Gemini Flash. 200 SV × 6 vụ/tháng ≈ 1.200 phiên ≈ **25–60 USD/tháng**. Cloud Run, Firestore, Hosting gần
như trong mức miễn phí ở quy mô thử nghiệm (database `detective` không hưởng free tier của database mặc định – chênh lệch rất nhỏ).
Cần đối chiếu bảng giá hiện hành và đo thực tế bằng `usage_logs`.

---

## 14. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Nhân vật AI "bịa" dữ kiện quyết định | Prompt chỉ chứa dữ kiện đủ điều kiện; engine kiểm soát mở khóa; bộ lọc thông tin bị cấm; `eval-characters` với Gemini thật trước nghiệm thu |
| Khớp đoạn bôi đen với bằng chứng không chính xác | Ngưỡng độ phủ + test nhiều cách bôi; bằng chứng không khớp vẫn lưu thành manh mối để GV xem |
| Chấm bài viết thiếu nhất quán | Rubric chi tiết + ý chính trong dossier, temperature thấp, bắt buộc trích dẫn, GV thẩm định |
| Nội dung 6 vụ việc nhiều, duyệt chậm | Soạn sớm song song GĐ 2–3; có công cụ duyệt trong Admin; Case Generator để GV tự tạo thêm |
| Kéo-thả khó dùng trên điện thoại | Thao tác thay thế bằng nút; E2E trên khung điện thoại |
| Dùng chung project với Game 1 | Database, service account, Cloud Run, Hosting site riêng; hạn mức riêng; có thể tách project sau mà không đổi code (chỉ đổi cấu hình) |

---

## 15. Bước tiếp theo

1. Anh/chị duyệt kế hoạch, chọn **D1** (repo), **D2** (dùng chung project `k26game1` hay project mới), **D3** (mức tái sử dụng).
2. Tạo repo trống `k26game2` (hoặc cho phép tôi tạo) và thêm vào phiên làm việc.
3. Tôi bắt đầu GĐ 1 và làm lần lượt đến GĐ 6, báo cáo sau mỗi giai đoạn như Game 1.
