# Đặc tả gốc – Game 2: English Detective – AI Mystery Challenge

> Trích nguyên văn từ tài liệu "K26 - Apps và thư mời GPT.docx" (phần "Viết mô tả game 2…"). Chỉ bỏ hình minh họa và sửa đường dẫn API bị mất `:id` khi chuyển định dạng. Kế hoạch: xem [../game2/PLAN-GAME2.md](../game2/PLAN-GAME2.md).


**Đặc tả Game 2: English Detective – AI Mystery Challenge**

English Detective là game mô phỏng điều tra bằng tiếng Anh, trong đó sinh viên đóng vai thám tử, phóng viên hoặc chuyên viên phân tích để giải quyết những tình huống bí ẩn thông qua việc đọc tài liệu, tìm kiếm bằng chứng, phỏng vấn nhân vật AI và viết báo cáo kết luận.

Khác với English City Simulator tập trung vào Nghe – Nói, English Detective tập trung vào Đọc – Viết, tư duy phản biện và khả năng sử dụng tiếng Anh để giải quyết vấn đề.

Tôi đề xuất xây dựng phiên bản đầu tiên gồm 6 vụ việc ở hai trình độ B1 và B2, tổ chức thành các phiên chơi khoảng 20–30 phút. Game sử dụng chung kiến trúc người dùng, dữ liệu học tập và kết nối LMS-AI9 với Game 1, nhưng có giao diện và cơ chế chơi riêng.

**English Detective**

Mô hình trò chơi đề xuất


Kỹ năng

Reading & Writing

Trình độ

B1 – B2

Nội dung MVP

6 vụ việc

Nền tảng

GCP + Firebase

Tài liệu dưới đây được viết theo dạng yêu cầu phát triển phần mềm để có thể chuyển trực tiếp cho Claude Code. Phần cuối quy định cách quản lý GitHub, bàn giao cho Claude Cowork triển khai và các tiêu chí nghiệm thu.

**TÀI LIỆU ĐẶC TẢ PHẦN MỀM**

**ENGLISH DETECTIVE – AI MYSTERY CHALLENGE**

**Game mô phỏng điều tra, luyện đọc – viết và tư duy phản biện bằng tiếng Anh, tích hợp AI**

- Phiên bản: 1.0

- Nền tảng: Web Application

- Công nghệ: React, TypeScript, Google Cloud Platform, Firebase, Firestore, Gemini AI

- Công cụ phát triển: Claude Code

- Quản lý mã nguồn: GitHub

- Triển khai: Google Cloud và Firebase với sự hỗ trợ của Claude Cowork

- Tích hợp: LMS-AI9 và AI English Learning Portfolio

**I. MỤC TIÊU PHẦN MỀM**

**1. Mục tiêu**

Xây dựng game mô phỏng điều tra bằng tiếng Anh dành cho sinh viên đại học, trong đó người chơi giải quyết các vụ việc giả định thông qua hoạt động thu thập thông tin, đọc hiểu, phân tích bằng chứng, tương tác với nhân vật AI và viết báo cáo.

Ứng dụng kết hợp ba phương pháp đào tạo:

- Game-based Learning: Học tập thông qua trò chơi.

- Problem-based Learning: Học tập thông qua giải quyết vấn đề.

- AI-assisted Learning: Học tập với sự hỗ trợ của trí tuệ nhân tạo.

Game hướng tới phát triển năng lực tiếng Anh trình độ B1–B2, đặc biệt là kỹ năng Đọc và Viết, đồng thời hỗ trợ các hoạt động ôn luyện liên quan đến định dạng VSTEP.

**2. Mục tiêu cụ thể**

Sinh viên có thể:

- Đọc hiểu email, thông báo, báo cáo, tin tức và các tài liệu tiếng Anh.

- Tìm kiếm, lựa chọn và đối chiếu thông tin.

- Phân biệt dữ kiện, giả định và ý kiến.

- Phát triển kỹ năng đặt câu hỏi và tư duy phản biện.

- Tương tác với các nhân vật AI bằng tiếng Anh.

- Viết báo cáo, email hoặc bài luận để trình bày kết luận.

- Nhận phản hồi về năng lực sử dụng tiếng Anh và phương pháp giải quyết vấn đề.

Giảng viên có thể sử dụng game trong hoạt động giảng dạy trực tiếp, Blended Learning hoặc giao nhiệm vụ tự học.

**3. Đối tượng sử dụng**

Hệ thống có bốn nhóm người dùng:

**Sinh viên**

- Chọn vụ việc và cấp độ.

- Thực hiện các hoạt động điều tra.

- Tương tác với AI.

- Viết và nộp báo cáo.

- Xem kết quả học tập.

**Giảng viên**

- Tạo lớp và phân công vụ việc.

- Theo dõi tiến độ.

- Quản lý ngân hàng tình huống.

- Xem kết quả đánh giá AI.

- Chấm thẩm định hoặc điều chỉnh kết quả.

**Quản trị viên nhà trường**

- Quản lý người dùng.

- Quản lý nội dung và học phần.

- Theo dõi tình hình sử dụng.

- Quản lý chi phí AI và xuất báo cáo.

**Quản trị viên nền tảng**

- Quản lý cấu hình kỹ thuật.

- Quản lý các trường đại học sử dụng phần mềm.

- Quản lý hệ thống AI, phiên bản và vận hành.

**II. THIẾT KẾ TRÒ CHƠI**

**1. Mô hình trò chơi**

Sinh viên tham gia một cơ quan điều tra giả định mang tên **English Detective Agency**.

Sau khi đăng nhập, sinh viên được đưa vào văn phòng điều tra ảo.

Tại đây, sinh viên có thể:

- Xem bảng danh sách các vụ việc.

- Nhận nhiệm vụ mới.

- Mở hồ sơ vụ việc.

- Đọc tài liệu.

- Phỏng vấn nhân vật.

- Thu thập và phân loại bằng chứng.

- Viết báo cáo kết luận.

- Nhận kết quả đánh giá.

Trò chơi sử dụng giao diện 2D/2.5D hiện đại, sinh động, có tính tương tác nhưng không yêu cầu công nghệ game 3D phức tạp.

**2. Các khu vực chức năng**

**Detective Office**

Giao diện văn phòng chính, hiển thị các vụ việc đang được giao và tiến độ thực hiện.

**Case Board**

Bảng điều tra trực quan cho phép sinh viên sắp xếp, kết nối và phân tích các bằng chứng.

**Document Room**

Kho tài liệu của từng vụ việc. Sinh viên cần đọc và phân tích tài liệu tiếng Anh để tìm thông tin.

**Interview Room**

Phòng phỏng vấn các nhân vật AI liên quan đến vụ việc.

**Investigation Notebook**

Sổ tay điều tra, nơi sinh viên ghi chép, lưu các bằng chứng và xây dựng lập luận.

**Report Room**

Khu vực viết báo cáo kết luận bằng tiếng Anh và nộp bài.

**Detective Academy**

Trung tâm học tập, hiển thị kết quả, huy hiệu, điểm kinh nghiệm và các khuyến nghị luyện tập.

**III. NGÂN HÀNG VỤ VIỆC**

Phiên bản 1.0 xây dựng sáu vụ việc mẫu.

| **Mã** | **Vụ việc**                        | **Cấp độ** | **Kỹ năng trọng tâm**                               |
|--------|------------------------------------|------------|-----------------------------------------------------|
| CASE01 | The Missing Scholarship            | B1         | Đọc email, xác minh thông tin, viết báo cáo         |
| CASE02 | The Lost University Laptop         | B1         | Đọc thông báo, phân tích lịch trình, viết email     |
| CASE03 | The Mysterious Hotel Booking       | B1         | Đọc xác nhận đặt phòng, xác định thông tin sai lệch |
| CASE04 | The Suspicious Online Store        | B2         | Đánh giá thông tin thương mại điện tử và độ tin cậy |
| CASE05 | The International Business Dispute | B2         | Phân tích email kinh doanh, hợp đồng và bằng chứng  |
| CASE06 | The Environmental Investigation    | B2         | Phân tích thông tin môi trường, số liệu và lập luận |

Các vụ việc phải có nội dung tiếng Anh phù hợp với cấp độ.

Mỗi vụ việc gồm:

- Bối cảnh.

- Mục tiêu điều tra.

- Bộ tài liệu.

- Danh sách nhân vật AI.

- Ngân hàng câu hỏi đọc hiểu.

- Danh sách bằng chứng.

- Các nhánh diễn biến.

- Nhiệm vụ viết.

- Đáp án, dữ kiện chuẩn và tiêu chí đánh giá.

Các nội dung cần được lưu thành những phiên bản có kiểm soát để giảng viên có thể chỉnh sửa và phê duyệt.

**IV. KỊCH BẢN CHI TIẾT VỤ VIỆC MẪU**

**CASE01: THE MISSING SCHOLARSHIP**

**Cấp độ:** B1  
**Thời lượng:** 20–25 phút  
**Vai trò:** Student Detective  
**Bối cảnh:** International University

**1. Giới thiệu tình huống**

Một sinh viên nhận được email thông báo đã được trao học bổng quốc tế trị giá 5.000 USD.

Tuy nhiên, email yêu cầu sinh viên thanh toán một khoản phí xử lý hồ sơ và cung cấp thông tin cá nhân trước khi nhận học bổng.

Sinh viên nghi ngờ thông báo này và yêu cầu Detective Agency hỗ trợ điều tra.

Người chơi phải xác minh thông tin và đưa ra kết luận dựa trên bằng chứng.

Kịch bản mẫu được thiết kế sao cho thông báo là giả mạo và có những bằng chứng xác minh rõ ràng. Người chơi cần chứng minh nhận định này thay vì đưa ra kết luận chỉ dựa trên sự nghi ngờ.

**2. Giai đoạn 1: Reading Documents**

Sinh viên tiếp nhận hồ sơ gồm:

- Email thông báo học bổng.

- Bản sao thông báo học bổng chính thức.

- Email trao đổi giữa sinh viên và người gửi.

- Trích đoạn trang thông tin chính thức của trường.

- Hướng dẫn nộp hồ sơ học bổng.

Tất cả tài liệu được xây dựng bằng tiếng Anh.

Sinh viên đọc tài liệu và trả lời các câu hỏi đọc hiểu.

Ví dụ:

- What is the value of the scholarship?

- What information does the sender request?

- Which details are inconsistent with the official announcement?

- What evidence should be checked before making a decision?

Hệ thống tự động chấm những câu hỏi có đáp án xác định.

Các câu hỏi yêu cầu giải thích được AI hỗ trợ đánh giá.

**3. Giai đoạn 2: Collecting Evidence**

Sinh viên lựa chọn các thông tin quan trọng từ tài liệu và đưa lên Evidence Board.

Các bằng chứng có thể bao gồm:

- Địa chỉ email gửi thông báo.

- Tên miền của tổ chức.

- Nội dung yêu cầu thanh toán.

- Thời hạn nhận học bổng.

- Thông báo chính thức từ trường.

Một số dữ kiện đóng vai trò gây nhiễu, buộc sinh viên phân biệt thông tin liên quan và không liên quan.

Sinh viên phải giải thích vì sao một dữ kiện có thể được coi là bằng chứng quan trọng.

**4. Giai đoạn 3: Interviewing AI Characters**

Sinh viên có thể phỏng vấn ba nhân vật:

**Emma:** Sinh viên nhận email.

**Mr. David:** Cán bộ phụ trách học bổng.

**Ms. Anna:** Chuyên viên hỗ trợ công nghệ thông tin.

Sinh viên nhập câu hỏi bằng tiếng Anh. AI đóng vai nhân vật để trả lời.

Ví dụ:

Student: Did you apply for this scholarship?

Emma: Yes, I applied two weeks ago, but the email address looks different from the university's official address.

Student: Does the university require students to pay a processing fee?

Mr. David: No. The scholarship office does not charge any processing fee.

Các nhân vật chỉ được cung cấp thông tin nằm trong hồ sơ kịch bản hoặc những nội dung suy luận hợp lệ từ hồ sơ.

Không được tự tạo bằng chứng mới làm thay đổi đáp án của vụ việc.

**5. Giai đoạn 4: Building the Case**

Sinh viên phân loại bằng chứng thành ba nhóm:

- Verified Evidence: Bằng chứng đã được xác minh.

- Unverified Information: Thông tin chưa được xác minh.

- Irrelevant Information: Thông tin không liên quan.

Sinh viên lựa chọn những bằng chứng quan trọng và viết lời giải thích ngắn bằng tiếng Anh.

Game kiểm tra xem sinh viên đã tìm được các thông tin quan trọng hay chưa.

**6. Giai đoạn 5: Writing the Final Report**

Sinh viên hoàn thành báo cáo bằng tiếng Anh, khoảng 150–180 từ.

Báo cáo cần trình bày:

1.  Summary of the case.

2.  Evidence collected.

3.  Analysis of the findings.

4.  Conclusion.

5.  Recommendations.

Sinh viên nộp bài để AI đánh giá sơ bộ.

**7. Giai đoạn 6: Assessment and Feedback**

AI đưa ra:

- Đánh giá mức độ đọc hiểu.

- Đánh giá khả năng lựa chọn bằng chứng.

- Nhận xét về lập luận.

- Đánh giá bài viết theo rubric.

- Phân tích lỗi tiếng Anh.

- Gợi ý cách cải thiện.

Sinh viên có thể xem lại báo cáo, đọc phản hồi và thực hiện lại nhiệm vụ để cải thiện kết quả.

**V. CƠ CHẾ GAME**

**1. Các giai đoạn của mỗi vụ việc**

Mỗi vụ việc đi qua sáu giai đoạn:

1.  Case Introduction.

2.  Document Investigation.

3.  Evidence Collection.

4.  AI Interviews.

5.  Case Analysis.

6.  Final Report.

Game phải theo dõi trạng thái hoàn thành của từng giai đoạn.

Sinh viên được phép quay lại tài liệu, phỏng vấn bổ sung hoặc xem lại bằng chứng trước khi nộp báo cáo.

**2. Hệ thống điểm**

Đề xuất hệ thống đánh giá 100 điểm:

| **Tiêu chí**          | **Điểm tối đa** |
|-----------------------|-----------------|
| Reading Comprehension | 25              |
| Evidence Collection   | 25              |
| Critical Thinking     | 20              |
| English Writing       | 30              |
| **Tổng**              | **100**         |

Các tiêu chí chi tiết:

- Reading: Độ chính xác khi hiểu và khai thác thông tin.

- Evidence: Lựa chọn và phân loại bằng chứng.

- Critical Thinking: Khả năng đưa ra nhận định dựa trên dữ kiện và lập luận.

- Writing: Hoàn thành yêu cầu, tính mạch lạc, từ vựng và ngữ pháp.

Điểm AI chỉ mang tính đánh giá sơ bộ. Giảng viên có quyền thẩm định khi sử dụng kết quả trong quá trình đánh giá học phần.

**3. Hệ thống trò chơi hóa**

Phát triển:

- Detective Points.

- Experience Points.

- Achievement Badges.

- Case Completion Rewards.

- Level Progression.

- Class Leaderboard.

Phân biệt điểm trò chơi với điểm đánh giá năng lực tiếng Anh.

Điểm trò chơi được tính dựa trên việc hoàn thành hoạt động, giải quyết nhiệm vụ và thành tích theo luật chơi.

Không công khai bài viết và điểm đánh giá chi tiết của sinh viên trên bảng xếp hạng.

**4. Hệ thống gợi ý**

Sinh viên có thể sử dụng ba cấp độ gợi ý:

**Hint 1:** Gợi ý tài liệu hoặc nhân vật cần xem xét.

**Hint 2:** Gợi ý nhóm thông tin quan trọng.

**Hint 3:** Hướng dẫn cách tiếp cận vấn đề mà không cung cấp trực tiếp kết luận.

Số lần sử dụng gợi ý được ghi nhận.

Có thể trừ điểm thưởng của trò chơi khi sử dụng gợi ý, nhưng không tự động trừ điểm đánh giá năng lực ngôn ngữ.

**VI. HỆ THỐNG AI**

Thiết kế AI thành các thành phần độc lập để dễ nâng cấp.

Ưu tiên sử dụng Gemini qua Google Vertex AI.

**1. AI Character Engine**

AI đóng vai nhân vật trong từng vụ việc.

Mỗi nhân vật có hồ sơ:

- Character ID.

- Name.

- Role.

- Personality.

- Background.

- Known Information.

- Restricted Information.

- Permitted Responses.

Nhân vật trả lời bằng tiếng Anh phù hợp với cấp độ B1/B2.

Nhân vật không được tiết lộ thông tin chưa được mở khóa, tài liệu đáp án hoặc các chỉ dẫn hệ thống.

Backend kiểm tra quyền truy cập và trạng thái nhiệm vụ trước khi cung cấp thông tin cho AI.

**2. AI Investigation Assistant**

Trợ lý AI hỗ trợ sinh viên trong quá trình điều tra.

Các chức năng:

- Giải thích từ vựng.

- Giải thích cấu trúc ngữ pháp.

- Hướng dẫn phương pháp đọc hiểu.

- Đưa ra gợi ý thu thập bằng chứng.

- Gợi ý phương pháp phân tích thông tin.

Có chế độ hỗ trợ phù hợp với từng cấp độ.

Trợ lý không được tự động giải toàn bộ vụ việc hoặc viết hoàn chỉnh báo cáo thay cho sinh viên.

**3. AI Case Generator**

Cung cấp chức năng hỗ trợ giảng viên tạo vụ việc mới.

Giảng viên nhập:

- Chủ đề.

- Cấp độ.

- Mục tiêu học tập.

- Số lượng tài liệu.

- Số lượng nhân vật.

- Thời lượng.

- Dạng bài viết.

AI đề xuất kịch bản, tài liệu, nhân vật và câu hỏi.

Sau khi sinh nội dung, hệ thống tạo hồ sơ vụ việc gồm dữ kiện chuẩn, các bằng chứng, đáp án và rubric.

Vụ việc chỉ được công bố khi giảng viên kiểm tra và phê duyệt.

Không cho phép AI tự thay đổi dữ kiện chuẩn của một vụ việc trong khi sinh viên đang chơi.

**4. AI Writing Grader**

AI hỗ trợ chấm báo cáo và cung cấp phản hồi dựa trên rubric của từng nhiệm vụ.

Đối với thành phần Writing 30 điểm, đề xuất:

- Task Achievement: 10 điểm.

- Coherence and Cohesion: 7 điểm.

- Vocabulary: 7 điểm.

- Grammar: 6 điểm.

AI phải đưa ra điểm thành phần, nhận xét cụ thể và các ví dụ minh họa lấy từ bài viết của sinh viên.

Không được đưa ra nhận xét về những lỗi không xuất hiện trong bài viết.

Hệ thống lưu phiên bản rubric, phiên bản prompt, tên mô hình và kết quả AI để phục vụ việc thẩm định.

**5. AI Learning Recommendation**

Sau khi hoàn thành vụ việc, hệ thống tổng hợp những khó khăn của người học và đề xuất:

- Từ vựng cần ôn luyện.

- Kiến thức ngữ pháp cần cải thiện.

- Dạng bài đọc phù hợp.

- Nhiệm vụ viết tiếp theo.

- Những kỹ năng lập luận cần phát triển.

Dữ liệu này được chuẩn hóa để tích hợp với AI English Learning Portfolio.

**6. AI Grounding và kiểm soát dữ kiện**

Đây là yêu cầu quan trọng nhất của English Detective.

Mỗi vụ việc phải có **Canonical Case Dossier**, tức bộ hồ sơ dữ kiện chuẩn được giảng viên phê duyệt.

Hồ sơ này chứa:

- Các dữ kiện chính thức.

- Danh sách bằng chứng.

- Thông tin mà từng nhân vật được phép biết.

- Những bằng chứng có thể mở khóa.

- Các kết luận được hỗ trợ bởi bằng chứng.

- Những thông tin chưa đủ cơ sở để kết luận.

Game Engine quản lý việc mở khóa bằng chứng và trạng thái nhiệm vụ bằng logic xác định.

AI tạo ngôn ngữ hội thoại và phản hồi, nhưng không có quyền tự ý sửa hồ sơ hoặc tạo ra dữ kiện quyết định mới.

Đối với câu trả lời vượt ngoài dữ kiện, nhân vật cần thể hiện rằng mình không biết hoặc chưa thể xác nhận.

**VII. GIAO DIỆN NGƯỜI DÙNG**

**1. Student Dashboard**

Hiển thị:

- Hồ sơ sinh viên.

- Cấp độ.

- Điểm kinh nghiệm.

- Danh sách vụ việc.

- Thành tích.

- Tiến độ học tập.

**2. Detective Office**

Không gian văn phòng điều tra với bảng nhiệm vụ, bàn làm việc và các khu vực chức năng.

**3. Case Board**

Bảng điều tra tương tác.

Cho phép kéo thả bằng chứng vào các nhóm, tạo liên kết giữa những thông tin và ghi chú.

Cần cung cấp phương thức thao tác thay thế cho kéo thả trên điện thoại và cho người dùng bàn phím.

**4. Document Viewer**

Trình xem tài liệu tiếng Anh với những chức năng:

- Đọc tài liệu.

- Đánh dấu thông tin.

- Ghi chú.

- Tra từ vựng.

- Lưu đoạn trích vào hồ sơ bằng chứng.

**5. AI Interview Room**

Hiển thị hình đại diện nhân vật AI và khung hội thoại.

Sinh viên nhập câu hỏi bằng tiếng Anh, nhận câu trả lời và lưu những nội dung quan trọng.

Phiên bản 1.0 ưu tiên giao tiếp bằng văn bản. Kiến trúc có khả năng bổ sung giọng nói ở phiên bản sau.

**6. Report Editor**

Trình soạn thảo báo cáo bằng tiếng Anh với:

- Đề bài.

- Số từ.

- Thời gian.

- Khu vực ghi chú.

- Khu vực viết báo cáo.

- Nút lưu nháp.

- Nút nộp báo cáo.

Có cơ chế lưu nháp tự động và xác nhận trước khi nộp bài cuối cùng.

Không để lỗi kết nối mạng khiến sinh viên mất nội dung đã soạn.

**7. Teacher Dashboard**

Các chức năng:

- Quản lý lớp.

- Giao vụ việc.

- Theo dõi tiến độ.

- Xem quá trình điều tra.

- Xem bài viết và đánh giá AI.

- Chấm thẩm định.

- Xuất báo cáo.

**8. Administrator Dashboard**

Quản lý tài khoản, trường, học phần, vụ việc, cấu hình AI, hạn mức và thống kê sử dụng.

**VIII. KIẾN TRÚC CÔNG NGHỆ**

**1. Nguyên tắc kiến trúc**

English Detective là một ứng dụng độc lập nhưng phải có khả năng dùng chung các dịch vụ nền tảng với English City Simulator.

Các thành phần có thể sử dụng chung:

- Quản lý danh tính và phân quyền.

- Hồ sơ trường và lớp.

- Cấu hình AI.

- Theo dõi chi phí.

- Quản lý tiến độ học tập.

- Kết nối LMS-AI9.

- AI English Learning Portfolio.

Không phụ thuộc trực tiếp vào cơ sở dữ liệu hoặc cấu trúc mã nguồn nội bộ của Game 1.

Xây dựng API và định dạng dữ liệu tích hợp rõ ràng.

**2. Công nghệ**

**Frontend**

- React.

- TypeScript.

- Vite.

- Tailwind CSS.

- Firebase Hosting.

**Backend**

- Node.js.

- TypeScript.

- REST API.

- Google Cloud Run.

- Firebase Admin SDK.

**Database**

- Cloud Firestore.

**File Storage**

- Google Cloud Storage.

**Authentication**

- Firebase Authentication.

**AI**

- Google Vertex AI/Gemini.

Ưu tiên kiến trúc serverless để hạn chế chi phí hạ tầng cố định trong giai đoạn thử nghiệm.

**3. Cấu trúc Firestore**

Thiết kế dữ liệu theo cấu trúc multi-tenant, tách biệt dữ liệu giữa các trường.

Những collection chính:

**tenants**

- Thông tin trường.

- Cấu hình.

- Hạn mức sử dụng.

**users**

- Hồ sơ người dùng.

- Vai trò và tư cách thành viên.

**courses**

- Học phần.

- Giảng viên.

- Sinh viên.

- Danh sách nhiệm vụ.

**cases**

- Mã vụ việc.

- Tiêu đề.

- Cấp độ.

- Mô tả.

- Phiên bản nội dung.

- Trạng thái phê duyệt.

**case_documents**

- Tài liệu.

- Nội dung.

- Loại tài liệu.

- Phạm vi truy cập.

**case_characters**

- Thông tin nhân vật.

- Hồ sơ dữ kiện nhân vật.

- Quy tắc hội thoại.

**case_evidence**

- Bằng chứng.

- Nguồn.

- Điều kiện mở khóa.

- Phân loại chuẩn.

**investigation_sessions**

- Người chơi.

- Vụ việc.

- Trạng thái.

- Thời gian.

- Tiến độ.

**interview_messages**

- Phiên chơi.

- Nhân vật.

- Câu hỏi.

- Câu trả lời.

- Thời điểm.

**investigation_notes**

- Ghi chú.

- Bằng chứng.

- Liên kết giữa các bằng chứng.

**final_reports**

- Báo cáo của sinh viên.

- Số từ.

- Thời điểm nộp.

- Phiên bản bài viết.

**assessments**

- Điểm đọc hiểu.

- Điểm bằng chứng.

- Điểm lập luận.

- Điểm viết.

- Nhận xét AI.

- Kết quả thẩm định của giảng viên.

**usage_logs**

- Số lượt gọi AI.

- Token.

- Chi phí ước tính.

- Thời gian xử lý.

Các collection có quy mô lớn được triển khai dưới dạng subcollection phù hợp.

Hồ sơ đáp án chuẩn, dữ kiện bí mật và thông tin chưa mở khóa phải được bảo vệ riêng ở backend. Sinh viên không được truy cập toàn bộ dữ liệu gốc của vụ việc từ trình duyệt.

**IX. THIẾT KẾ API**

Các API chính:

| **API**                               | **Chức năng**                    |
|---------------------------------------|----------------------------------|
| GET /api/me                           | Thông tin người dùng             |
| GET /api/cases                        | Danh sách vụ việc                |
| GET /api/cases/:id                      | Thông tin vụ việc                |
| POST /api/sessions                    | Bắt đầu điều tra                 |
| GET /api/sessions/:id                   | Trạng thái phiên                 |
| GET /api/sessions/:id/documents          | Tài liệu được phép truy cập      |
| POST /api/sessions/:id/interviews        | Phỏng vấn nhân vật AI            |
| POST /api/sessions/:id/evidence          | Lựa chọn và phân loại bằng chứng |
| PUT /api/sessions/:id/notes              | Lưu sổ tay điều tra              |
| PUT /api/sessions/:id/draft              | Lưu nháp báo cáo                 |
| POST /api/sessions/:id/submit            | Nộp báo cáo                      |
| GET /api/sessions/:id/results            | Xem kết quả                      |
| GET /api/teacher/classes              | Quản lý lớp                      |
| POST /api/teacher/assessments/:id/review | Thẩm định điểm                   |
| GET /api/admin/usage                  | Theo dõi sử dụng                 |

Bổ sung API quản lý nội dung vụ việc, sinh nội dung bằng AI, phê duyệt và xuất dữ liệu.

Các API cần:

- Xác thực người dùng.

- Kiểm tra quyền tại backend.

- Kiểm tra quyền sở hữu phiên điều tra.

- Kiểm tra dữ liệu đầu vào.

- Chống gửi trùng yêu cầu.

- Giới hạn tần suất.

- Ghi nhật ký lỗi.

Đối với thao tác chấm bài, sử dụng cơ chế xử lý bất đồng bộ nếu thời gian AI phản hồi dài. Sinh viên có thể kiểm tra trạng thái xử lý mà không cần gửi lại bài.

**X. KIỂM SOÁT AI, BẢO MẬT VÀ CHI PHÍ**

**1. Kiểm soát AI**

Mỗi chức năng AI có prompt riêng:

- AI Character.

- AI Investigation Assistant.

- AI Case Generator.

- AI Writing Grader.

- AI Learning Recommendation.

Quy định rõ dữ liệu được phép sử dụng, nhiệm vụ và cấu trúc kết quả của từng chức năng.

Kiểm tra tính hợp lệ của dữ liệu AI trước khi lưu hoặc hiển thị.

Không cho phép AI thay đổi điểm, dữ kiện chuẩn hoặc quyền truy cập bằng lời thoại.

**2. Bảo mật**

- Firebase Authentication.

- Phân quyền theo vai trò.

- Phân tách dữ liệu theo trường.

- Kiểm tra quyền truy cập tại backend.

- Firebase Security Rules.

- Secret Manager.

- Quản lý quyền truy cập tệp trên Cloud Storage.

- Nhật ký hoạt động quản trị.

Dữ liệu trong tài liệu và hội thoại có thể chứa những nội dung cố tình yêu cầu AI bỏ qua chỉ dẫn hệ thống. Phải xử lý chúng như dữ liệu không đáng tin cậy.

Không công khai khóa API hoặc dữ liệu cá nhân trên GitHub.

**3. Quyền riêng tư**

Chỉ thu thập những dữ liệu cần thiết cho hoạt động học tập.

Quy định thời hạn lưu trữ báo cáo, hội thoại và dữ liệu học tập.

Cho phép quản trị viên xử lý yêu cầu truy cập hoặc xóa dữ liệu theo chính sách của trường.

Không mặc định sử dụng nội dung của sinh viên để huấn luyện mô hình AI.

**4. Kiểm soát chi phí**

Cho phép quản trị viên thiết lập:

- Số lượt phỏng vấn AI mỗi nhiệm vụ.

- Số lượt sử dụng trợ lý AI.

- Số lần yêu cầu chấm bài.

- Giới hạn token.

- Hạn mức chi phí theo người dùng, lớp và trường.

Ưu tiên lưu sẵn các tài liệu và tình huống mẫu, chỉ sử dụng AI khi cần tương tác hoặc đánh giá.

Lưu dữ liệu sử dụng để ước tính chi phí theo mô hình.

Cấu hình cảnh báo ngân sách Google Cloud, đồng thời triển khai cơ chế giới hạn tại backend để từ chối những yêu cầu AI vượt hạn mức nội bộ.

**XI. TÍCH HỢP LMS-AI9 VÀ AI ENGLISH LEARNING PORTFOLIO**

Ứng dụng cần có API chuẩn để đồng bộ:

- Thông tin sinh viên.

- Thông tin lớp và học phần.

- Nhiệm vụ được giao.

- Trạng thái hoàn thành.

- Kết quả đọc hiểu.

- Bài viết.

- Kết quả đánh giá.

- Những kỹ năng cần cải thiện.

Trong phiên bản đầu tiên, triển khai đăng nhập Firebase và xuất dữ liệu CSV.

Chuẩn bị kiến trúc tích hợp LTI 1.3 hoặc hệ thống SSO/API tập trung với LMS-AI9 ở giai đoạn tiếp theo.

Thiết kế một cấu trúc dữ liệu kết quả học tập thống nhất với English City Simulator để AI English Learning Portfolio có thể tổng hợp kết quả từ nhiều game.

Không đồng bộ điểm AI vào sổ điểm chính thức của Moodle nếu chưa có cấu hình và sự chấp thuận của giảng viên hoặc nhà trường.

**XII. KẾ HOẠCH PHÁT TRIỂN BẰNG CLAUDE CODE**

**Giai đoạn 1: Xây dựng nền tảng**

- Khởi tạo monorepo.

- Xây dựng frontend và backend.

- Thiết lập Firebase Authentication.

- Thiết kế Firestore.

- Phân quyền người dùng.

- Xây dựng giao diện văn phòng điều tra.

**Giai đoạn 2: Xây dựng Game Engine**

- Hệ thống quản lý vụ việc.

- Document Viewer.

- Evidence Board.

- Investigation Notebook.

- Quản lý trạng thái điều tra.

- Cơ chế mở khóa nội dung.

**Giai đoạn 3: Tích hợp AI**

- AI Character Engine.

- AI Investigation Assistant.

- AI Writing Grader.

- AI Learning Recommendation.

- Hệ thống kiểm soát dữ kiện chuẩn và phản hồi AI.

**Giai đoạn 4: Xây dựng nội dung**

Hoàn thiện đầy đủ sáu vụ việc mẫu.

Mỗi vụ việc phải có dữ kiện chuẩn, tài liệu, nhân vật, bằng chứng, các bước điều tra, nhiệm vụ viết và rubric.

Xây dựng công cụ cho giảng viên tạo và phê duyệt vụ việc mới.

**Giai đoạn 5: Dashboard và tích hợp**

- Student Dashboard.

- Teacher Dashboard.

- Administrator Dashboard.

- Báo cáo học tập.

- Xuất dữ liệu.

- API tích hợp LMS-AI9.

- Quản lý hạn mức AI.

**Giai đoạn 6: Kiểm thử**

Yêu cầu triển khai:

- Unit Test.

- Integration Test.

- End-to-End Test.

- Firebase Emulator Test.

- Kiểm thử phân quyền.

- Kiểm thử tách biệt dữ liệu giữa các trường.

- Kiểm thử AI Character tuân thủ dữ kiện.

- Kiểm thử lưu và nộp bài.

- Kiểm thử giới hạn chi phí.

Có thể sử dụng AI giả lập trong kiểm thử tự động để bảo đảm tính ổn định. Ngoài ra, phải có quy trình kiểm thử thủ công với AI thật trước khi nghiệm thu.

**XIII. GITHUB VÀ TRIỂN KHAI GOOGLE CLOUD**

**1. Repository**

Tên repository:

**english-detective**

Cấu trúc đề xuất:

- apps/web: Ứng dụng React.

- apps/api: Backend.

- packages/shared: Các kiểu dữ liệu và thư viện dùng chung.

- packages/game-engine: Logic điều tra.

- packages/ai: Các dịch vụ AI.

- firebase: Quy tắc và cấu hình Firebase.

- infrastructure: Cấu hình hạ tầng.

- scripts: Công cụ khởi tạo và dữ liệu mẫu.

- tests: Kiểm thử tích hợp và E2E.

- docs: Tài liệu.

- .github/workflows: CI/CD.

Bắt buộc tạo:

- README.md.

- ARCHITECTURE.md.

- DATABASE.md.

- API.md.

- DEPLOYMENT.md.

- TESTING.md.

- SECURITY.md.

- .env.example.

- .gitignore.

**2. Quy trình GitHub**

Claude Code thực hiện:

1.  Khởi tạo repository cục bộ.

2.  Phát triển từng giai đoạn.

3.  Chạy kiểm thử.

4.  Tạo commit có mô tả rõ ràng.

5.  Tạo pull request khi cần.

6.  Đẩy mã nguồn lên repository GitHub sau khi được cấp quyền.

Không đưa API Key, thông tin đăng nhập và dữ liệu người dùng thật vào repository.

**3. Triển khai bằng Claude Cowork**

Chuẩn bị tài liệu và cấu hình để Claude Cowork triển khai lên Google Cloud và Firebase khi có quyền truy cập được cấp.

Kiến trúc triển khai:

- Firebase Hosting: Frontend.

- Cloud Run: Backend API.

- Firestore: Cơ sở dữ liệu.

- Cloud Storage: Lưu tệp.

- Vertex AI: Gemini.

- Firebase Authentication: Xác thực người dùng.

- Secret Manager: Thông tin bí mật.

- GitHub Actions: CI/CD.

Tạo hai môi trường:

- Development/Staging.

- Production.

Ưu tiên Workload Identity Federation để GitHub Actions xác thực với Google Cloud.

Các tài nguyên đám mây, mức ngân sách, tài khoản dịch vụ và quyền truy cập phải được xác nhận trước khi triển khai Production.

**4. Bàn giao**

Sau khi hoàn thành, Claude Code phải cung cấp:

- Mã nguồn.

- Dữ liệu mẫu.

- Bộ kiểm thử.

- Tài liệu kỹ thuật.

- Tài liệu quản trị.

- Tài liệu sử dụng cho giảng viên và sinh viên.

- Hướng dẫn chạy ứng dụng cục bộ.

- Hướng dẫn triển khai.

- Hướng dẫn quản lý chi phí AI.

- API và cấu trúc dữ liệu tích hợp LMS-AI9.

**XIV. TIÊU CHÍ NGHIỆM THU**

Phiên bản 1.0 được coi là hoàn thành khi đáp ứng các điều kiện:

1.  Sinh viên đăng nhập và truy cập Detective Office.

2.  Sáu vụ việc mẫu hoạt động hoàn chỉnh.

3.  Sinh viên đọc được tài liệu và thực hiện các bài đọc hiểu.

4.  Có thể thu thập, phân loại và kết nối bằng chứng.

5.  Có thể phỏng vấn nhân vật AI bằng tiếng Anh.

6.  Nhân vật AI trả lời theo hồ sơ dữ kiện đã được phê duyệt.

7.  Sinh viên viết, lưu nháp và nộp báo cáo.

8.  AI thực hiện đánh giá sơ bộ, cung cấp điểm và phản hồi.

9.  Giảng viên theo dõi tiến độ và thẩm định kết quả.

10. Quản trị viên theo dõi được hoạt động, người dùng và mức sử dụng AI.

11. Hệ thống thực thi đúng quyền truy cập và phân tách dữ liệu các trường.

12. Hoàn thành kiểm thử kỹ thuật và bảo mật.

13. Ứng dụng có thể triển khai trên Google Cloud và Firebase.

14. Mã nguồn, dữ liệu mẫu và tài liệu được bàn giao đầy đủ.

**Yêu cầu:** Không chỉ xây dựng bản trình diễn giao diện. Claude Code phải tạo ứng dụng có khả năng hoạt động thực tế, sử dụng dữ liệu lưu trữ thật, thực hiện hội thoại AI, quản lý quá trình điều tra và cung cấp kết quả đánh giá có thể kiểm tra, thẩm định.

Mục tiêu cuối cùng là xây dựng English Detective thành một game học tiếng Anh có khả năng sử dụng độc lập, triển khai ở nhiều trường đại học và kết nối vào hệ sinh thái LMS-AI9.

**Một điểm thiết kế quan trọng**

Với English Detective, tôi đề xuất ưu tiên Game Engine quản lý bằng chứng độc lập với AI. Đây là điểm khác biệt cốt lõi so với chatbot thông thường: mỗi vụ việc có một hồ sơ dữ kiện chuẩn, hệ thống kiểm soát tiến trình điều tra, còn AI đóng vai nhân vật và hỗ trợ học tập. Nhờ đó, các sinh viên có thể hỏi những câu khác nhau nhưng vẫn được đánh giá trên cùng hệ thống bằng chứng và mục tiêu học tập.

