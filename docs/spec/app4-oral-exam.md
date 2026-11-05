# MÔ TẢ PHẦN MỀM – K26 ORAL EXAM: THI VẤN ĐÁP TRỰC TUYẾN CÓ AI

> Bản mô tả để duyệt trước khi xây dựng. Các điểm cần anh/chị quyết định nằm ở **mục 2** (D1–D9), mỗi điểm có phương án đề xuất.

## 0. Tóm tắt

Ứng dụng web cho **thi và luyện thi vấn đáp** các học phần: Tiếng Anh, Marketing căn bản, Quản trị học và bất kỳ học phần nào
có ngân hàng câu hỏi.

**Cách một bài thi diễn ra:**
1. Hệ thống tạo đề vấn đáp ngẫu nhiên cho từng sinh viên từ ngân hàng câu hỏi, theo ma trận đề do giảng viên đặt.
2. Sinh viên đọc câu hỏi, có thời gian chuẩn bị, rồi **trả lời bằng lời nói, mỗi câu khoảng 3 phút**. Hệ thống ghi tiếng, hoặc ghi tiếng và hình nếu ca thi bật camera.
3. Hệ thống **lưu file**, **chuyển giọng nói thành văn bản** và **AI đề xuất điểm** dựa trên đáp án, ý chính và thang chấm.
4. Giảng viên **nghe lại file**, đọc văn bản, xác nhận hoặc sửa điểm, rồi công bố.

**Phần nâng cao:** xác thực người thi bằng ảnh thẻ (ID) so với ảnh chụp từ camera, có giám thị xác nhận.

**Hạ tầng:** Google Cloud (Cloud Run, Vertex AI Gemini, Speech-to-Text, Cloud Storage), Firebase (Authentication, Firestore, Hosting),
mã nguồn trên GitHub. Dùng lại các thành phần đã chạy tốt ở 3 app trước (mục 12).

| Con số chính (mặc định, cấu hình được) | |
|---|---|
| Số câu mỗi đề | 3 (1–10) |
| Thời gian chuẩn bị mỗi câu | 60 giây (0–300) |
| Thời gian trả lời tối đa mỗi câu | 3 phút (1–10) |
| Ghi hình | Tắt, bật, hoặc để sinh viên chọn (theo ca thi) |
| Ngôn ngữ trả lời | Theo học phần: tiếng Việt (Marketing, Quản trị…) hoặc tiếng Anh |
| Thời gian có điểm AI đề xuất | Khoảng 1–3 phút sau khi nộp |

## 1. Đối tượng và vai trò

| Vai trò | Việc chính |
|---|---|
| **Sinh viên** | Luyện thi, dự thi, xem điểm đã công bố, gửi yêu cầu phúc khảo |
| **Giảng viên** | Soạn và duyệt câu hỏi, đặt ma trận đề, tạo ca thi, chấm lại, công bố điểm |
| **Giám thị** (tùy chọn) | Theo dõi ca thi đang diễn ra, xác nhận danh tính khi AI không chắc, ghi biên bản |
| **Quản trị khoa/trường** | Người dùng, lớp, học phần, cấu hình AI và hạn mức, chi phí, nhật ký |
| **Quản trị nền tảng** | Tạo trường (nhiều trường dùng chung hệ thống, dữ liệu tách riêng) |

## 2. Quyết định cần anh/chị duyệt

| # | Nội dung | Đề xuất | Phương án khác |
|---|---|---|---|
| **D1** | Tên và repo | Tên **"K26 Oral Exam – Thi vấn đáp trực tuyến"**, repo mới `thoannv1976/k26oral` (anh/chị tạo repo trống như Game 2, 3) | Tên khác do trường đặt |
| **D2** | Hạ tầng | Giai đoạn thí điểm **dùng chung project `k26game1`**: database Firestore riêng `oral`, Cloud Run `oral-api`, Hosting `k26-oral.web.app`, bucket riêng `k26game1-oral-media`, dùng chung tài khoản với 3 game. Khi dùng cho **thi chính thức toàn trường** thì chuyển sang project riêng (dữ liệu điểm và sinh trắc học tách hẳn khỏi các game) | Project riêng ngay từ đầu (tài khoản riêng, cấu hình lại từ đầu, cách ly tốt hơn) |
| **D3** | Cách tạo đề | Hỗ trợ cả hai: **(a) đề ngẫu nhiên riêng cho từng sinh viên** theo ma trận (chương, mức độ, độ khó); **(b) "bốc thăm phiếu thi"**: tạo sẵn N phiếu cho giảng viên duyệt, sinh viên bốc ngẫu nhiên một phiếu (giống thi vấn đáp truyền thống) | Chỉ (a) |
| **D4** | Ghi hình | Giảng viên chọn theo ca thi: **chỉ ghi tiếng** (mặc định, nhẹ, ít vấn đề quyền riêng tư) / **ghi tiếng + hình** / **sinh viên tự chọn**. Âm thanh luôn ghi riêng để chuyển văn bản | Bắt buộc ghi hình mọi ca |
| **D5** | Ai quyết định điểm | **Thi chính thức:** AI chỉ *đề xuất*; điểm chính thức chỉ có khi giảng viên xác nhận (bắt buộc nghe lại các câu bị đánh dấu). **Luyện thi:** điểm AI hiện ngay, ghi rõ "tham khảo" | Cho phép công bố điểm AI không cần giảng viên (không khuyến nghị cho thi chính thức) |
| **D6** | Xác thực danh tính (nâng cao) | **v1.0:** ảnh thẻ + ảnh chụp từ camera + kiểm tra người thật (quay đầu theo yêu cầu). AI chỉ đưa ra *gợi ý* "khớp / không chắc / không khớp", **giám thị hoặc giảng viên luôn là người quyết định**, không tự động loại thí sinh. **v1.1:** nếu trường cần mức sinh trắc học chuẩn, tích hợp dịch vụ eKYC chuyên dụng (vd. VNPT eKYC, FPT.AI eKYC – có phí, có hợp đồng xử lý dữ liệu) | Làm eKYC chuyên dụng ngay v1.0 |
| **D7** | Chấm lại | Một giảng viên chấm; **tùy chọn chấm 2 vòng** (2 giảng viên, chênh lệch quá ngưỡng thì giảng viên thứ 3 hoặc trưởng bộ môn quyết định) | Luôn chấm 2 vòng |
| **D8** | Lưu trữ file | Bài **thi chính thức**: giữ theo quy chế lưu trữ bài thi của trường (mặc định 2 năm, cấu hình được). Bài **luyện thi**: tự xóa sau 30 ngày. Ảnh xác thực: tự xóa sau khi hết hạn phúc khảo (mặc định 90 ngày) | Thời hạn khác theo quy chế |
| **D9** | Nội dung mẫu | Mỗi học phần (Tiếng Anh, Marketing căn bản, Quản trị học) **30 câu mẫu** tự soạn, có đáp án và ý chính, ở trạng thái **nháp** để giảng viên bộ môn duyệt. Giảng viên nhập thêm qua Excel | Trường cung cấp ngân hàng câu hỏi thật ngay từ đầu |

### Quyết định kỹ thuật (đề xuất, rút từ kinh nghiệm 3 app trước)

| # | Nội dung | Đề xuất |
|---|---|---|
| T1 | Chuyển giọng nói thành văn bản | Speech-to-Text **xử lý bất đồng bộ (long-running) từ file trên Cloud Storage**, vì nhận dạng đồng bộ chỉ nhận khoảng 1 phút âm thanh. Câu trả lời 3 phút vượt giới hạn này (đây cũng là lỗi tôi vừa phát hiện ở Game 3, đã đề xuất việc sửa riêng). Có mốc thời gian từng từ để đồng bộ văn bản với audio và đo thời lượng nói thực |
| T2 | Tải file lên | Trình duyệt **tải thẳng lên Cloud Storage qua đường dẫn ký tạm thời, dạng tải tiếp tục được** (video 3 phút có thể 10–20 MB, vượt giới hạn 32 MB/yêu cầu của Cloud Run khi nhiều câu). File giữ trong trình duyệt (IndexedDB) đến khi máy chủ xác nhận đã nhận đủ, nên mất mạng không mất bài |
| T3 | Hàng đợi xử lý | **Cloud Tasks**: mỗi câu trả lời là một việc (chuyển văn bản rồi chấm AI), tự thử lại khi lỗi, không chấm trùng. Thêm Cloud Scheduler quét định kỳ (như Game 3) để gom các bài sót |
| T4 | Giờ thi | Máy chủ giữ giờ: thời điểm bắt đầu và hạn chót của từng câu. Câu trả lời nộp sau hạn (cộng vài giây bù mạng) bị đánh dấu. Hết giờ thì tự chuyển câu. Không quay lại câu trước |
| T5 | Mô hình AI | Gemini đang chạy ở project (`gemini-3-flash-preview`, location `global`), **giới hạn thinking** (bài học Game 1: không giới hạn thì JSON bị cắt). Đầu ra kiểm tra bằng schema (zod) |
| T6 | Định dạng ghi | Âm thanh **WAV 16 kHz mono** (đã chạy ổn trên mọi trình duyệt ở Game 1, 3; 3 phút ≈ 5,8 MB). Video ghi riêng bằng MediaRecorder (WebM, hoặc MP4 trên Safari), chỉ dùng để giảng viên xem lại |
| T7 | Dữ liệu | Theo trường (`tenants/{t}/…`), mọi thao tác ghi đi qua máy chủ, Firestore rules chặn ghi từ trình duyệt. File media chỉ mở bằng đường dẫn ký ngắn hạn |

## 3. Chức năng chính

### 3.1 Quản lý người học
- Thêm từng người hoặc nhập Excel/CSV (mã SV, họ tên, email, lớp). Tạo tài khoản, gửi mật khẩu tạm; hoặc đăng nhập Google theo tên miền trường.
- Hồ sơ: mã SV, lớp, **ảnh thẻ** (nếu dùng xác thực; nhà trường tải lên hàng loạt theo mã SV, hoặc sinh viên chụp thẻ lần đầu rồi giảng viên duyệt).
- Khóa/mở tài khoản, xóa dữ liệu theo yêu cầu (đúng quy định bảo vệ dữ liệu cá nhân).

### 3.2 Quản lý học phần và lớp
- **Học phần:** mã, tên, ngôn ngữ trả lời (vi-VN/en-US), danh sách chương/chủ đề, giảng viên phụ trách.
- **Lớp học phần:** giảng viên, danh sách sinh viên (nhập Excel), ca thi của lớp.

### 3.3 Ngân hàng câu hỏi
Mỗi câu hỏi gồm:
- **Phân loại:** học phần, chương/chủ đề, mức độ nhận thức (Nhớ, Hiểu, Vận dụng, Phân tích/Đánh giá), độ khó 1–5.
- **Nội dung câu hỏi**, có thể có câu hỏi phụ hoặc gợi ý mở rộng.
- **Đáp án mẫu**.
- **Các ý chính bắt buộc có trọng số**, ví dụ: "Nêu đúng 4P (3 điểm)", "Có ví dụ thực tế (2 điểm)".
- **Tiêu chí trình bày** (tùy chọn): mạch lạc, thuật ngữ; với Tiếng Anh thêm độ trôi chảy, từ vựng, ngữ pháp.
- **Thời gian** chuẩn bị và trả lời (theo câu, nếu khác mặc định).

**Vòng đời câu hỏi:** **phiên bản** (sửa thì tạo bản mới; bài đã thi giữ nguyên bản cũ), trạng thái **nháp → duyệt → lưu trữ**.
Chỉ câu đã duyệt mới vào đề.

**Nhập liệu:** từng câu, hoặc nhập **Excel theo mẫu**.

**AI hỗ trợ** (luôn tạo bản *nháp* để giảng viên duyệt):
- tách ý chính từ đáp án mẫu;
- gợi ý câu hỏi mới theo chương;
- phát hiện câu trùng hoặc gần trùng.

**Thống kê câu hỏi:** số lần ra đề, điểm trung bình thực tế, độ phân biệt. Từ đó phát hiện câu quá dễ, quá khó hoặc đáp án có vấn đề.

### 3.4 Ma trận đề và tạo đề ngẫu nhiên
- **Ma trận đề:** số câu theo chương, mức độ, độ khó; tổng điểm; thời gian.
  Ví dụ: 1 câu Nhớ/Hiểu chương 1–3, 1 câu Vận dụng chương 4–6, 1 câu Phân tích.
- **Tạo đề riêng cho từng sinh viên** từ máy chủ, có ghi lại để tái lập và kiểm tra được.
  - Ràng buộc: không lặp câu trong một đề; hạn chế lặp giữa các sinh viên cùng ca; cân bằng độ khó giữa các đề.
- **Chế độ bốc thăm phiếu thi** (D3): tạo sẵn N phiếu → giảng viên xem, sửa, duyệt → sinh viên bấm "Bốc thăm" → nhận một phiếu ngẫu nhiên.
- Hệ thống **kiểm tra ma trận** trước khi mở ca: đủ câu đã duyệt cho mọi ô của ma trận, có cảnh báo nếu ngân hàng quá ít câu so với số sinh viên.

### 3.5 Ca thi (thi chính thức)
- Thiết lập: lớp, ma trận hoặc bộ phiếu, thời gian mở và đóng, chế độ ghi (D4), có xác thực danh tính hay không (D6), số lần ghi lại cho phép (mặc định 0; có thể cho 1 lần ghi lại trong thời gian của câu), ngưỡng AI đánh dấu "cần nghe lại".
- Trạng thái: nháp → mở → đang thi → đóng → đang chấm → đã công bố.
- Màn hình giám sát: ai đang thi, đang ở câu mấy, cảnh báo (mất kết nối lâu, rời tab, xác thực chưa khớp).

### 3.6 Làm bài (sinh viên)
1. **Kiểm tra thiết bị:** micro (thanh mức âm, ghi thử 5 giây và nghe lại), camera (nếu cần), tốc độ mạng, trình duyệt hỗ trợ.
2. **Thông báo và đồng ý:** về ghi âm, ghi hình, ảnh xác thực (mục đích, thời hạn lưu, ai được xem).
3. **Xác thực danh tính** (nếu bật): xem mục 4.
4. **Bốc thăm hoặc nhận đề.** Câu hỏi chỉ được gửi về trình duyệt **khi đến lượt** câu đó.
5. **Từng câu:** đọc câu hỏi → **chuẩn bị** (đếm ngược, có thể bấm "Trả lời ngay") → **ghi** (tối đa 3 phút, có đồng hồ, tự dừng khi hết giờ, nút "Kết thúc câu trả lời") → tải lên (thanh tiến độ, tự thử lại) → câu tiếp theo.
6. **Nộp bài:** xác nhận đã tải đủ mọi câu. Màn hình "Đã nộp – điểm sẽ được công bố sau".

**Chống sự cố:**
- Mất mạng giữa chừng: tiếp tục ghi, bản ghi giữ trên máy, khi có mạng thì tải tiếp.
- Tải lại trang: quay về đúng câu đang làm, đồng hồ vẫn theo máy chủ.
- Máy hỏng: giám thị cấp lại lượt thi, có ghi biên bản.

### 3.7 Xử lý tự động sau mỗi câu
1. Lưu file vào Cloud Storage.
2. **Chuyển văn bản** (T1), theo ngôn ngữ của học phần: văn bản có mốc thời gian, độ tin cậy, thời lượng nói thực, các khoảng lặng dài.
3. **Kiểm tra chất lượng:** im lặng hoặc quá ngắn, độ tin cậy thấp, âm thanh rè. Gặp các trường hợp này thì đánh dấu "cần nghe lại" (không tự cho 0 điểm).
4. **AI chấm theo thang** (mục 5): xét từng ý chính, kèm **trích dẫn nguyên văn từ lời nói của sinh viên**, nhận xét ngắn. Trích dẫn không có trong văn bản thì bị loại.
5. **Điểm do code tính** từ kết quả từng ý chính (trọng số × đạt / đạt một phần / không đạt), không để AI tự cho tổng điểm. Mỗi bước đều lưu phiên bản (thang chấm, prompt, mô hình) để giải trình được.

### 3.8 Giảng viên chấm lại
- **Hàng chờ chấm** theo ca thi. Câu bị đánh dấu được xếp lên trước:
  - độ tin cậy chuyển văn bản thấp;
  - AI không chắc;
  - lệch xa so với điểm trung bình;
  - xác thực danh tính chưa khớp.
- **Màn hình chấm một câu:**
  - Trình phát audio (hoặc video) có **văn bản chạy theo**: bấm vào một từ thì nhảy tới đoạn đó.
  - Câu hỏi, đáp án mẫu, các ý chính kèm đề xuất của AI và trích dẫn.
  - Giảng viên tick đạt/không đạt từng ý, sửa điểm, ghi nhận xét. Phím tắt để chấm nhanh.
- **Chấm 2 vòng** (D7, tùy chọn): giảng viên thứ hai không thấy điểm của người thứ nhất; chênh lệch quá ngưỡng thì chuyển người phân xử.
- **Khóa và công bố điểm** theo ca. Mọi lần nghe file và mọi lần sửa điểm đều ghi nhật ký (ai, lúc nào, điểm trước/sau).
- **Phúc khảo:** sinh viên gửi yêu cầu trong thời hạn → giảng viên khác chấm → kết quả và lịch sử lưu lại.

### 3.9 Kết quả, báo cáo
- **Sinh viên:** điểm từng câu và nhận xét khi đã công bố. Nghe lại bài mình nếu trường cho phép.
- **Giảng viên và khoa:**
  - bảng điểm theo lớp/ca, **xuất Excel** theo mẫu nhập điểm;
  - thống kê phân bố điểm, câu hỏi khó/dễ, mức chênh giữa AI và giảng viên (đo độ tin cậy của AI theo thời gian);
  - biên bản ca thi.
- **API cho LMS** (dùng lại định dạng chung `k26-evidence-1.0` của các app K26) để đưa kết quả vào hệ thống quản lý học tập.

### 3.10 Luyện thi
- Sinh viên chọn học phần và chương → hệ thống tạo đề luyện tập (ngẫu nhiên, theo ma trận luyện tập của giảng viên) → trả lời như thi thật.
- **AI chấm ngay** (vài chục giây đến 2 phút). Sau đó sinh viên xem các ý đạt/thiếu, đáp án mẫu và gợi ý cải thiện.
- Có giới hạn lượt luyện mỗi ngày (kiểm soát chi phí). Lịch sử luyện tập, tiến bộ theo chương.
- Giảng viên xem tổng hợp luyện tập của lớp (chương nào sinh viên hay thiếu ý).

## 4. Nâng cao: xác thực người thi bằng ảnh ID và camera

**Quy trình:**
1. **Ảnh gốc:** ảnh thẻ sinh viên do trường cung cấp, hoặc sinh viên chụp thẻ lần đầu rồi giảng viên duyệt.
2. **Trước khi thi:** chụp ảnh khuôn mặt, kèm **kiểm tra người thật đơn giản** (làm theo yêu cầu ngẫu nhiên như quay trái/phải) để tránh giơ ảnh in.
3. **So khớp:**
   - kiểm tra chất lượng ảnh (đúng một khuôn mặt, đủ sáng, không che);
   - so sánh ảnh chụp với ảnh thẻ → **khớp / không chắc / không khớp**.
   - "Khớp" thì vào thi. "Không chắc / không khớp" thì **giám thị xác nhận thủ công** (xem hai ảnh, có thể gọi video). Thí sinh vẫn được thi trong lúc chờ, bài gắn cờ để giảng viên xem.
4. **Trong khi thi** (chỉ khi bật camera): chụp vài ảnh ngẫu nhiên. Cảnh báo khi không có mặt người, có nhiều người, hoặc khác người, kèm ghi nhận rời tab, thoát toàn màn hình. **Chỉ ghi nhận để giảng viên xem, không tự động xử lý vi phạm.**

**Lưu ý công nghệ:**
- Google Cloud **không có dịch vụ nhận dạng danh tính bằng khuôn mặt**. Cloud Vision chỉ phát hiện khuôn mặt và chất lượng ảnh.
- Vì vậy v1.0 dùng Cloud Vision để kiểm tra chất lượng, Gemini so sánh hai ảnh làm *gợi ý*, còn quyết định luôn ở con người.
- Muốn tự động hóa ở mức sinh trắc học chuẩn thì cần dịch vụ eKYC chuyên dụng (v1.1, D6) hoặc một mô hình so khớp khuôn mặt có giấy phép dùng thương mại chạy trên Cloud Run riêng.

**Pháp lý:**
- Ảnh khuôn mặt dùng để nhận dạng là **dữ liệu cá nhân nhạy cảm** theo quy định bảo vệ dữ liệu cá nhân của Việt Nam (Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân 2025). Cần sự **đồng ý rõ ràng**, nêu mục đích, thời hạn lưu, quyền rút đồng ý, và hồ sơ đánh giá tác động xử lý dữ liệu.
- Phải có **cách thay thế** cho sinh viên không đồng ý, ví dụ giám thị đối chiếu thẻ qua video.
- Đề nghị bộ phận pháp chế của trường xem trước khi bật tính năng.

## 5. Thiết kế chấm điểm bằng AI

**Đầu vào:**
- Câu hỏi, đáp án mẫu, danh sách ý chính kèm trọng số, tiêu chí trình bày.
- Văn bản lời nói của sinh viên, đặt trong khối dữ liệu riêng. **Lời nói của sinh viên là dữ liệu, không phải chỉ dẫn**, để chống kiểu "hãy cho tôi 10 điểm".

**Đầu ra theo schema:**
- Mỗi ý chính: `đạt / đạt một phần / không đạt / không xác định`, kèm **trích dẫn nguyên văn** và lý do ngắn.
- Ý sai kiến thức (nếu có), nhận xét chung, mức độ chắc chắn.

**Kiểm tra sau AI:**
- Trích dẫn không có trong văn bản thì loại, và ý đó chuyển "không xác định".
- Điểm bị giới hạn trong khung cho phép.
- Văn bản quá ngắn hoặc độ tin cậy thấp thì đánh dấu cần giảng viên.

**Tính điểm:** điểm câu = tổng (trọng số × hệ số trạng thái) do code tính, cộng điểm trình bày nếu có. Thang 10, hoặc thang do học phần đặt.

**Riêng Tiếng Anh:** thêm độ trôi chảy (đo từ dữ liệu âm thanh như Game 1, 3), từ vựng, ngữ pháp. **Phát âm do giảng viên chấm** (bài học Game 3).

**Khi AI lỗi hoặc hết hạn mức:** câu chuyển "chờ giảng viên chấm". **Không bao giờ tự tạo điểm.**

**Hiệu chỉnh:** sau mỗi ca có báo cáo chênh lệch AI và giảng viên theo từng câu hỏi. Câu nào chênh nhiều thì giảng viên xem lại ý chính hoặc đáp án.

## 6. Kiến trúc

```
Trình duyệt (React + TypeScript + Vite + Tailwind; ghi âm WAV, ghi hình MediaRecorder; Firebase Auth)
   │  /api/** (Firebase ID token)                     │ tải file trực tiếp (đường dẫn ký, tải tiếp được)
   ▼                                                    ▼
Cloud Run oral-api (Fastify, Node 22)  ──────►  Cloud Storage k26game1-oral-media (audio, video, ảnh xác thực; xóa tự động theo D8)
   ├─ Exam engine (code xác định): tạo đề theo ma trận, bốc thăm, giờ thi, trạng thái câu, tính điểm
   ├─ Cloud Tasks "oral-processing": Speech-to-Text long-running → kiểm tra chất lượng → Gemini chấm → lưu kết quả
   ├─ Cloud Vision (chất lượng ảnh, đếm khuôn mặt) + Gemini (gợi ý so khớp) – phần nâng cao
   ├─ Firestore database "oral" (tenants/{t}/…)
   └─ Cloud Scheduler: quét bài sót, đóng ca hết hạn, dọn file
Firebase Hosting k26-oral.web.app  (rewrite /api/** → Cloud Run)
```

Monorepo như 3 app trước: `packages/shared` (schema), `packages/exam-engine` (luật thi, tạo đề, tính điểm – có kiểm thử),
`packages/ai` (prompt, Gemini, bộ lọc), `apps/api`, `apps/web`, `content/` (câu hỏi mẫu), `infrastructure/`, `scripts/`, `docs/`.

**Dữ liệu chính** (Firestore `oral`, theo trường):
- người dùng, học phần, lớp;
- ngân hàng câu hỏi (có phiên bản), ma trận đề, phiếu thi;
- ca thi, lượt thi (đề đã tạo, giờ, trạng thái từng câu), câu trả lời (file, văn bản, kết quả AI);
- chấm của giảng viên, phúc khảo, ảnh xác thực và kết quả so khớp;
- bộ đếm hạn mức, nhật ký chi phí, nhật ký thao tác.

## 7. Bảo mật và liêm chính thi

- **Đề và đáp án:**
  - Đề tạo trên máy chủ. Câu hỏi chỉ gửi về khi đến lượt.
  - Đáp án, ý chính, thang chấm **không bao giờ gửi cho sinh viên** trong ca thi. Luyện thi chỉ hiện sau khi đã trả lời.
- **Giờ thi** do máy chủ giữ. Các sự kiện bất thường được ghi nhận để giảng viên xem: nộp muộn, nhiều thiết bị cùng lúc, rời tab, thoát toàn màn hình.
- **Quyền:**
  - Giảng viên chỉ thấy lớp mình. Quản trị nền tảng không xem dữ liệu bài thi.
  - File media chỉ mở qua đường dẫn ký ngắn hạn, mỗi lần mở đều ghi nhật ký.
- **Ghi dữ liệu:** mọi thao tác ghi đi qua máy chủ, Firestore rules chặn ghi từ trình duyệt.
- **Môi trường:** không có khóa bí mật trong mã nguồn. Bộ AI giả lập chỉ dùng khi phát triển và kiểm thử, bị từ chối ở môi trường production.
- **Dữ liệu cá nhân:** thông báo và đồng ý trước khi ghi âm, ghi hình, chụp ảnh. Xóa tự động theo thời hạn D8. Quyền xóa dữ liệu theo yêu cầu.
- **Chi phí:** hạn mức lượt luyện thi mỗi ngày, ngân sách tháng theo trường và theo lớp, cảnh báo khi gần chạm.

## 8. Giao diện (tiếng Việt và tiếng Anh, dùng tốt trên máy tính; điện thoại dùng được cho luyện thi)

| Vai trò | Màn hình |
|---|---|
| Sinh viên | Trang chủ (ca thi sắp tới, luyện thi), kiểm tra thiết bị, xác thực, phòng thi (câu hỏi, đồng hồ, ghi, tải lên), nộp bài, kết quả, phúc khảo, lịch sử luyện thi |
| Giảng viên | Học phần, ngân hàng câu hỏi (lọc, sửa, nhập Excel, AI hỗ trợ), ma trận đề, phiếu thi, ca thi (tạo, giám sát), hàng chờ chấm, màn hình chấm (audio/video + văn bản chạy theo), công bố điểm, phúc khảo, báo cáo, xuất Excel |
| Giám thị | Danh sách thí sinh đang thi, cảnh báo, xác nhận danh tính, biên bản |
| Quản trị | Người dùng, lớp, học phần, AI và hạn mức, chi phí, nhật ký |

## 9. Kiểm thử bắt buộc (như 3 app trước)

- **Exam engine:** tạo đề đúng ma trận, không trùng câu, bốc thăm công bằng, tái lập được; giờ thi (trước giờ, đúng hạn, quá hạn); tính điểm từ ý chính.
- **AI:** loại trích dẫn bịa; chống "câu lệnh" trong lời nói sinh viên; AI lỗi thì chuyển chờ giảng viên, không tạo điểm.
- **API** (với Firebase emulator):
  - toàn bộ luồng ca thi và luyện thi;
  - sinh viên không xem được câu chưa tới lượt hay đáp án;
  - tải lên bị gián đoạn rồi tải tiếp;
  - hai lần nộp trùng thì chỉ chấm một lần;
  - giảng viên lớp khác bị từ chối;
  - hạn mức, phúc khảo, chấm 2 vòng.
- **Speech-to-Text:** kiểm thử riêng nhánh **long-running cho câu 3 phút**, cả tiếng Việt và tiếng Anh, bằng file mẫu thật trước khi bàn giao. Đây là bài học trực tiếp từ lỗi của Game 3.
- **Trình duyệt (Playwright, micro và camera giả lập):** thi trọn một ca 3 câu, mất mạng giữa câu, tải lại trang, giảng viên chấm và công bố, sinh viên xem điểm; giao diện điện thoại cho luyện thi.
- **Firestore rules:** chặn ghi, chặn đọc chéo trường, lớp, sinh viên.

## 10. Kế hoạch thực hiện

| GĐ | Nội dung | Thời gian ước tính |
|---|---|---|
| 0 | Anh/chị duyệt D1–D9, tạo repo `k26oral` | 0,5 ngày |
| 1 | Nền tảng (sao chép từ Game 2/3): đăng nhập, trường, người dùng, lớp, học phần, quyền, hạn mức | 1 ngày |
| 2 | Ngân hàng câu hỏi (phiên bản, duyệt, nhập Excel, AI hỗ trợ), ma trận đề, tạo đề và bốc thăm (exam engine + kiểm thử) | 2 ngày |
| 3 | Ca thi, phòng thi (giờ máy chủ, ghi âm/ghi hình, tải lên tiếp tục được, chống mất bài) | 2 ngày |
| 4 | Xử lý tự động (Cloud Tasks, Speech-to-Text long-running vi/en, AI chấm theo ý chính, kiểm tra chất lượng) | 2 ngày |
| 5 | Chấm lại (hàng chờ, trình phát có văn bản chạy theo, chấm 2 vòng), công bố, phúc khảo, báo cáo, Excel, API LMS | 2 ngày |
| 6 | Luyện thi; nội dung mẫu 3 học phần × 30 câu (D9) | 1 ngày |
| 7 | Nâng cao: xác thực ảnh ID và camera, giám thị (D6 v1.0) | 1,5 ngày |
| 8 | Kiểm thử trình duyệt, tài liệu, bộ triển khai, hướng dẫn cho Claude Cowork | 1 ngày |

Thứ tự ưu tiên: GĐ1–6 là bản dùng được để **thí điểm thi vấn đáp không xác thực khuôn mặt**. GĐ7 có thể bật sau khi pháp chế đồng ý.

## 11. Chi phí vận hành ước tính (tham khảo, giá Google có thể thay đổi)

| Khoản | Ước tính |
|---|---|
| Speech-to-Text | khoảng 0,016–0,024 USD/phút → 1 bài thi 3 câu × 3 phút ≈ 0,15–0,22 USD |
| Gemini chấm (3 câu) | dưới 0,01 USD mỗi bài |
| Lưu trữ | chỉ tiếng ≈ 18 MB/bài; có hình ≈ 30–60 MB/bài; 1.000 bài có hình ≈ 50 GB ≈ 1–2 USD/tháng |
| Cloud Run, Firestore, Hosting | rất nhỏ ở quy mô một khoa (gói miễn phí phần lớn) |
| Ví dụ: 500 sinh viên thi 1 lần + mỗi người luyện 5 đề | ≈ 3.000 câu ≈ 9.000 phút nói ≈ **150–220 USD**, chủ yếu là chuyển giọng nói |

Hạn mức luyện thi và ngân sách tháng (mục 7) giữ chi phí trong mức trường đặt.

## 12. Bài học từ 3 app đã xây và áp dụng ở đây

| Bài học | Áp dụng |
|---|---|
| `gemini-2.5-flash` trả 404 trên project; model chạy được là `gemini-3-flash-preview` (location `global`) và phải **giới hạn thinking**, nếu không JSON bị cắt (Game 1) | Dùng đúng model và cấu hình đó, đặt được qua biến môi trường |
| Tổ chức chặn truy cập công khai Cloud Run, nên Hosting gọi API bị 403 | Script triển khai tự tắt invoker IAM check, API tự xác thực token |
| Dùng chung project bằng **database Firestore riêng + IAM có điều kiện** chạy tốt (Game 2, 3) | Database `oral`, tài khoản dịch vụ `oral-api` chỉ truy cập database và bucket của mình |
| Code quyết định, AI chỉ hỗ trợ; trích dẫn phải có trong bài; **không bịa điểm** (Game 2, 3) | Điểm tính từ ý chính bằng code; AI lỗi thì chờ giảng viên |
| Nhận dạng giọng nói đồng bộ chỉ ~1 phút (lỗi phát hiện ở Game 3 khi kiểm tra cho app này) | Speech-to-Text long-running từ Cloud Storage, có kiểm thử với file 3 phút thật |
| Ghi WAV qua AudioWorklet ổn định trên mọi trình duyệt (Game 1) | Giữ nguyên cho âm thanh; video ghi riêng |
| Chấm bất đồng bộ có khóa chống chấm trùng, cộng job định kỳ (Game 2, 3) | Cloud Tasks + Scheduler |
| Lưu từng thao tác ngay, nháp có phiên bản, hàng đợi khi mất mạng (Game 3) | Bản ghi giữ trên máy đến khi tải xong; trạng thái câu ở máy chủ |
| Image Docker phải chạy thử trước khi giao (Game 3 suýt lỗi khởi động) | Kiểm thử container trong quy trình bàn giao |
| Kiểm thử bằng bộ giả lập không phát hiện giới hạn của dịch vụ thật | Thêm kiểm thử "khói" với Speech-to-Text và Gemini thật ngay sau triển khai (Cowork làm) |
| Hướng dẫn Cowork từng bước, ghi rõ nhánh, có bước kiểm tra cụ thể | Giữ nguyên cách viết |

## 13. Rủi ro và cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Nhận dạng tiếng Việt sai thuật ngữ chuyên ngành | Gợi ý từ khóa từ ý chính câu hỏi cho Speech-to-Text; giảng viên luôn nghe lại khi độ tin cậy thấp |
| AI chấm lệch so với giảng viên | AI chỉ đề xuất; báo cáo chênh lệch; giảng viên chỉnh ý chính hoặc đáp án |
| Sinh viên đọc tài liệu có sẵn hoặc có người nhắc | Thời gian chuẩn bị ngắn, câu hỏi chỉ hiện khi đến lượt, ghi hình tùy chọn, câu hỏi phụ; đây là giới hạn chung của thi trực tuyến, nên ghi rõ trong quy chế |
| Mạng yếu khi thi | Bản ghi giữ trên máy và tải tiếp; giám thị cấp lại lượt có biên bản |
| Dữ liệu sinh trắc học | Phần nâng cao tách riêng, bật theo trường, đồng ý rõ ràng, xóa tự động, có cách thay thế |
| Ngân hàng câu hỏi ít so với số sinh viên | Cảnh báo khi kiểm tra ma trận; chế độ phiếu thi |

## 14. Ngoài phạm vi v1.0 (kiến trúc chừa sẵn)

- Thi vấn đáp trực tiếp có giảng viên hỏi qua video thời gian thực.
- Ứng dụng di động riêng.
- Đăng nhập SSO/LTI với LMS.
- AI tự sinh câu hỏi phụ trong lúc thi.
- eKYC chuyên dụng (v1.1, D6).
- Chấm phát âm tự động.

## 15. Bước tiếp theo

1. Anh/chị duyệt bản mô tả, chọn D1–D9 (hoặc "duyệt theo đề xuất").
2. Tạo repo trống `thoannv1976/k26oral` (hoặc tên theo D1).
3. Tôi xây theo các giai đoạn ở mục 10, đẩy lên GitHub, rồi viết hướng dẫn cho Claude Cowork triển khai.
