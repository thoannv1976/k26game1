# Đặc tả gốc – Game 1: English City Simulator

> Trích nguyên văn từ tài liệu "K26 - Apps và thư mời GPT.docx" (phần "Viết mô tả game 1…"). Chỉ bỏ hình minh họa và sửa đường dẫn API bị mất `:id` khi chuyển định dạng. Kế hoạch triển khai: xem [../../PLAN.md](../../PLAN.md).

**Đặc tả phần mềm: English City Simulator – AI English Speaking Game**

English City Simulator là trò chơi mô phỏng thành phố thông minh, trong đó sinh viên thực hiện các nhiệm vụ giao tiếp bằng tiếng Anh với những nhân vật AI tại sân bay, khách sạn, nhà hàng, trường đại học và các địa điểm khác.

Mục tiêu là phát triển kỹ năng Nghe – Nói, khả năng phản xạ, từ vựng và sự tự tin trong giao tiếp; đồng thời bổ trợ ôn luyện trình độ B1–B2 theo định dạng VSTEP.


Định hướng phát triển: Xây dựng một ứng dụng web độc lập, tích hợp được vào LMS-AI9, có khả năng mở rộng cho nhiều trường đại học. Claude Code phụ trách xây dựng mã nguồn và đưa lên GitHub; Claude Cowork được sử dụng để hỗ trợ triển khai, kiểm thử trên Google Cloud và Firebase sau khi được cấp quyền thích hợp.

Phiên bản đầu tiên tập trung vào ba địa điểm với sáu nhiệm vụ hoàn chỉnh. Các địa điểm khác và hệ thống giải đấu sẽ phát triển sau khi phiên bản đầu tiên được nghiệm thu.

**TÀI LIỆU ĐẶC TẢ PHẦN MỀM**

**ENGLISH CITY SIMULATOR**

**Game mô phỏng giao tiếp tiếng Anh tích hợp trí tuệ nhân tạo**

Phiên bản: 1.0  
Nền tảng: Web Application  
Công nghệ: React, TypeScript, Google Cloud Platform, Firebase, Firestore và Gemini AI  
Phương thức phát triển: Claude Code  
Quản lý mã nguồn: GitHub  
Triển khai: Google Cloud và Firebase, với sự hỗ trợ của Claude Cowork

**I. MỤC TIÊU VÀ PHẠM VI**

**1. Mục tiêu**

Xây dựng trò chơi mô phỏng thành phố ảo, giúp sinh viên rèn luyện kỹ năng giao tiếp tiếng Anh thông qua các tình huống thực tế.

Sinh viên điều khiển một nhân vật, di chuyển giữa những địa điểm trong thành phố và hoàn thành các nhiệm vụ bằng cách giao tiếp trực tiếp với những nhân vật AI.

AI đóng vai người đối thoại, lắng nghe, phản hồi và điều chỉnh hội thoại theo khả năng của sinh viên.

Hệ thống hỗ trợ:

- Luyện kỹ năng nghe hiểu.

- Luyện kỹ năng giao tiếp và phản xạ bằng tiếng Anh.

- Phát triển từ vựng và ngữ pháp theo ngữ cảnh.

- Đánh giá quá trình học tập và gợi ý cải thiện.

- Bổ trợ ôn luyện tiếng Anh trình độ B1–B2 và các dạng tình huống giao tiếp liên quan đến VSTEP.

- Tích hợp dữ liệu với LMS-AI9 và AI English Learning Portfolio.

Điểm số của trò chơi mang tính đánh giá quá trình, không thay thế kết quả thi hoặc chứng chỉ VSTEP chính thức.

**2. Đối tượng sử dụng**

Hệ thống gồm bốn nhóm người dùng:

**Sinh viên**

- Tham gia trò chơi.

- Lựa chọn nhiệm vụ và cấp độ.

- Giao tiếp với AI.

- Xem điểm và nhận phản hồi.

- Theo dõi tiến độ học tập.

**Giảng viên**

- Tạo và quản lý lớp học.

- Giao nhiệm vụ.

- Thiết lập yêu cầu học tập.

- Theo dõi kết quả sinh viên.

- Xem lại hội thoại và thẩm định kết quả đánh giá AI.

**Quản trị viên nhà trường**

- Quản lý người dùng và phân quyền.

- Quản lý ngân hàng nhiệm vụ.

- Quản lý cấu hình AI.

- Theo dõi báo cáo, chi phí và tình trạng hệ thống.

**Quản trị viên nền tảng**

- Thiết lập và quản lý các trường.

- Quản lý cấu hình chung.

- Giám sát kỹ thuật và vận hành.

- Không mặc định có quyền xem dữ liệu học tập cá nhân khi chưa được phân quyền.

Thiết kế cấu trúc dữ liệu theo hướng hỗ trợ nhiều trường đại học (multi-tenant), bảo đảm phân tách dữ liệu.

**II. THIẾT KẾ THẾ GIỚI TRÒ CHƠI**

**1. Thành phố ảo English City**

Thiết kế thành phố theo phong cách đồ họa 2.5D hoặc isometric, hiện đại, sinh động và phù hợp với sinh viên đại học.

Giao diện chính là bản đồ thành phố với các tòa nhà có thể lựa chọn.

Mỗi địa điểm tương ứng với một nhóm tình huống giao tiếp.

Trong phiên bản hoàn chỉnh, thành phố có sáu địa điểm:

| **Địa điểm**      | **Các tình huống tiêu biểu**                            |
|-------------------|---------------------------------------------------------|
| Airport           | Làm thủ tục, hành lý thất lạc, hỏi thông tin            |
| Restaurant & Café | Gọi món, thanh toán, xử lý khiếu nại                    |
| University        | Giao tiếp với giảng viên, thảo luận nhóm, hỏi thông tin |
| Hotel             | Đặt phòng, nhận phòng, giải quyết tình huống            |
| Office            | Phỏng vấn xin việc, họp nhóm, thuyết trình              |
| Shopping Mall     | Mua sắm, đổi trả hàng và dịch vụ khách hàng             |

Mỗi địa điểm được thể hiện bằng một tòa nhà hoặc khu vực tương ứng trên bản đồ.

Khi sinh viên chọn địa điểm, hệ thống hiển thị những nhiệm vụ hiện có.

**2. Thiết kế nhân vật**

Mỗi địa điểm có các nhân vật AI phù hợp, chẳng hạn:

- Airport: nhân viên sân bay và hành khách.

- Restaurant: nhân viên phục vụ và quản lý nhà hàng.

- University: giảng viên và sinh viên quốc tế.

- Hotel: nhân viên lễ tân và quản lý.

- Office: nhà tuyển dụng và đồng nghiệp.

Nhân vật có tên, hình đại diện, giọng nói, vai trò, đặc điểm giao tiếp và nhiệm vụ cụ thể.

Ở phiên bản đầu tiên, sử dụng hình ảnh 2D hoặc 2.5D kết hợp âm thanh và khung hội thoại. Chưa cần phát triển nhân vật 3D có hoạt ảnh chuyển động phức tạp.

Thiết kế sẵn khả năng nâng cấp hình đại diện, hoạt ảnh và các tính năng tương tác trong tương lai.

**III. CƠ CHẾ VÀ QUY TRÌNH CHƠI**

**1. Quy trình chung**

**Bước 1: Đăng nhập**

Sinh viên đăng nhập bằng tài khoản được cấp hoặc tài khoản tích hợp với hệ thống quản lý học tập.

**Bước 2: Lựa chọn cấp độ**

Hai cấp độ ban đầu:

- B1: Giao tiếp trong các tình huống quen thuộc.

- B2: Giao tiếp trong những tình huống phức tạp hơn, yêu cầu giải thích, lập luận và giải quyết vấn đề.

**Bước 3: Vào thành phố**

Sinh viên nhìn thấy bản đồ thành phố và những địa điểm đang mở khóa.

**Bước 4: Lựa chọn nhiệm vụ**

Mỗi nhiệm vụ hiển thị:

- Tên nhiệm vụ.

- Bối cảnh.

- Mục tiêu giao tiếp.

- Thời lượng dự kiến.

- Cấp độ.

- Điểm thưởng.

**Bước 5: Thực hiện nhiệm vụ**

Sinh viên tương tác bằng giọng nói với nhân vật AI. Có thể nghe lại những câu thoại được cho phép, yêu cầu nhân vật nhắc lại hoặc sử dụng gợi ý.

Các lựa chọn trợ giúp được ghi nhận để phục vụ đánh giá quá trình học tập.

**Bước 6: Hoàn thành nhiệm vụ**

Hệ thống xác định việc hoàn thành các mục tiêu giao tiếp.

**Bước 7: Nhận kết quả**

AI phân tích hội thoại, đưa ra nhận xét, điểm đánh giá sơ bộ và đề xuất cải thiện.

**Bước 8: Lưu hồ sơ học tập**

Kết quả được lưu vào Firestore và sẵn sàng đồng bộ với AI English Learning Portfolio.

**2. Quy định phiên chơi**

Mỗi nhiệm vụ dự kiến kéo dài 10–20 phút.

Hỗ trợ:

- Tạm dừng và tiếp tục.

- Chơi lại nhiệm vụ.

- Thực hiện nhiệm vụ bằng giọng nói.

- Chế độ văn bản dự phòng khi không sử dụng được microphone.

- Phát lại câu thoại AI theo giới hạn của nhiệm vụ.

- Lưu lịch sử hội thoại.

Chế độ văn bản không được tính là minh chứng đánh giá kỹ năng Nói.

**IV. KỊCH BẢN NHIỆM VỤ MẪU**

**Mission 01: Lost Luggage at the Airport**

**Địa điểm:** Airport  
**Cấp độ:** B1  
**Thời gian dự kiến:** 15 phút  
**Kỹ năng trọng tâm:** Listening và Speaking

**Bối cảnh**

Sinh viên vừa đến một sân bay quốc tế nhưng không tìm thấy hành lý tại khu vực nhận hành lý.

Sinh viên phải đến quầy hỗ trợ, trình bày tình huống, cung cấp thông tin và đề nghị nhân viên hỗ trợ giải quyết.

**Các giai đoạn của nhiệm vụ**

**Giai đoạn 1: Asking for Help**

Sinh viên tìm đến quầy thông tin và giải thích vấn đề.

AI đóng vai nhân viên sân bay, hỏi sinh viên cần hỗ trợ vấn đề gì.

**Giai đoạn 2: Providing Information**

Nhân viên AI hỏi các thông tin như:

- Chuyến bay.

- Thời gian đến.

- Đặc điểm hành lý.

- Mã hành lý.

- Thông tin liên hệ.

Sinh viên cần nghe hiểu và cung cấp thông tin chính xác theo hồ sơ chuyến bay giả định mà trò chơi đã cấp.

**Giai đoạn 3: Unexpected Situation**

AI tạo một tình huống phát sinh có kiểm soát.

Ví dụ: hành lý được chuyển nhầm sang chuyến bay khác.

Sinh viên phải hỏi thêm, yêu cầu phương án giải quyết và cung cấp địa chỉ nhận hành lý.

**Giai đoạn 4: Completing the Mission**

Sinh viên xác nhận thông tin, hỏi thời gian dự kiến nhận lại hành lý và kết thúc cuộc hội thoại.

**Điều kiện hoàn thành**

- Trình bày được vấn đề.

- Cung cấp những thông tin cần thiết.

- Hiểu và phản hồi các câu hỏi quan trọng.

- Đề nghị giải pháp.

- Xác nhận được phương án giải quyết.

Nếu sinh viên trả lời không phù hợp, AI cần diễn đạt lại câu hỏi, yêu cầu làm rõ hoặc đưa ra gợi ý phù hợp. Không được tự động coi nhiệm vụ đã hoàn thành.

**Kết thúc**

Hiển thị kết quả, bản ghi hội thoại, điểm đánh giá và đề xuất luyện tập.

**Ngân hàng nhiệm vụ phiên bản 1.0**

Phiên bản đầu tiên phải triển khai đầy đủ sáu nhiệm vụ, không chỉ tạo giao diện mẫu.

| **Mã** | **Địa điểm** | **Nhiệm vụ**                           | **Cấp độ** |
|--------|--------------|----------------------------------------|------------|
| M01    | Airport      | Airport Check-in                       | B1         |
| M02    | Airport      | Lost Luggage                           | B1         |
| M03    | Restaurant   | Ordering Food                          | B1         |
| M04    | Restaurant   | Handling a Wrong Bill                  | B2         |
| M05    | University   | Asking for Academic Information        | B1         |
| M06    | University   | International Group Project Discussion | B2         |

Mỗi nhiệm vụ có kịch bản, các mục tiêu giao tiếp, thông tin bối cảnh, câu hỏi dự kiến, tình huống phát sinh, điều kiện hoàn thành và tiêu chí đánh giá riêng.

Nội dung cố định của nhiệm vụ phải được giảng viên kiểm duyệt trước khi đưa vào sử dụng.

**V. HỆ THỐNG AI**

Thiết kế AI theo kiến trúc module, có thể thay đổi nhà cung cấp và mô hình.

Ưu tiên Google Gemini qua Vertex AI trong phiên bản đầu tiên.

Các chức năng AI:

**1. AI Conversation Engine**

Đóng vai nhân vật, tương tác bằng tiếng Anh và phát triển hội thoại theo tình huống.

Yêu cầu:

- Ghi nhớ nội dung trong phạm vi phiên chơi.

- Điều chỉnh ngôn ngữ theo cấp độ B1/B2.

- Phản hồi tự nhiên dựa trên câu trả lời của sinh viên.

- Đưa ra tình huống phát sinh phù hợp.

- Dẫn dắt sinh viên hoàn thành mục tiêu.

- Không cung cấp sẵn toàn bộ câu trả lời.

- Không tự ý thay đổi những thông tin cố định của nhiệm vụ.

Để bảo đảm tính nhất quán, sử dụng Scenario Engine quản lý mục tiêu và trạng thái nhiệm vụ. AI Conversation Engine chỉ tạo hội thoại trong phạm vi trạng thái và dữ liệu được phép.

**2. Speech-to-Text**

Tích hợp Google Cloud Speech-to-Text để chuyển giọng nói của sinh viên thành văn bản.

Yêu cầu:

- Hỗ trợ tiếng Anh.

- Có khả năng sử dụng qua trình duyệt máy tính hoặc điện thoại.

- Hiển thị trạng thái ghi âm và xử lý.

- Thông báo khi âm thanh không rõ.

- Cho phép ghi âm lại theo cấu hình nhiệm vụ.

Không sử dụng riêng văn bản nhận diện giọng nói để suy ra điểm phát âm chính xác.

**3. Text-to-Speech**

Tích hợp Google Cloud Text-to-Speech để nhân vật AI giao tiếp bằng giọng nói.

Cho phép lựa chọn giọng Anh-Anh hoặc Anh-Mỹ khi dịch vụ hỗ trợ.

Đối với các câu thoại cố định, ưu tiên tạo và lưu tệp âm thanh sẵn để giảm thời gian phản hồi và chi phí.

**4. AI Assessment Engine**

Sau khi hoàn thành nhiệm vụ, AI tiến hành đánh giá sơ bộ.

Rubric đánh giá quá trình được đề xuất như sau:

| **Tiêu chí**                      | **Điểm tối đa** |
|-----------------------------------|-----------------|
| Hoàn thành mục tiêu giao tiếp     | 30              |
| Hiểu nội dung và phản hồi phù hợp | 20              |
| Sử dụng ngữ pháp                  | 20              |
| Sử dụng từ vựng                   | 15              |
| Độ trôi chảy trong giao tiếp      | 15              |
| **Tổng**                          | **100**         |

Độ trôi chảy chỉ được đánh giá khi có đủ dữ liệu âm thanh và thời gian nói đáng tin cậy. Nếu không đủ dữ liệu, hệ thống phải ghi rõ tiêu chí chưa được đánh giá thay vì tự tạo điểm.

Phát âm được nhận xét định tính khi có công cụ và dữ liệu phù hợp; không tự tạo điểm phát âm chỉ dựa vào bản phiên âm.

Kết quả là phản hồi học tập do AI hỗ trợ, không phải điểm thi VSTEP chính thức.

Giảng viên có quyền xem lại, điều chỉnh và thẩm định kết quả.

**5. AI Learning Recommendation**

Sau mỗi nhiệm vụ, AI đề xuất:

- Những lỗi ngữ pháp cần khắc phục.

- Những từ vựng và mẫu câu cần ôn luyện.

- Những nội dung cần luyện nghe.

- Những hoạt động thực hành giao tiếp tiếp theo.

- Nhiệm vụ và cấp độ phù hợp.

Kết quả phân tích được lưu để AI English Learning Portfolio có thể sử dụng.

**6. Kiểm soát hoạt động AI**

Toàn bộ lời gọi AI phải thực hiện từ backend.

Bắt buộc có:

- Prompt hệ thống riêng cho từng nhiệm vụ.

- Schema dữ liệu đầu ra có kiểm tra hợp lệ.

- Giới hạn độ dài và số lượt hội thoại.

- Giới hạn token và số lần gọi AI.

- Cơ chế xử lý lỗi và thử lại có giới hạn.

- Phương án phản hồi dự phòng khi dịch vụ AI không khả dụng.

- Bộ lọc nội dung không phù hợp với môi trường giáo dục.

Nội dung do sinh viên nhập và lời thoại bên ngoài phải được xử lý như dữ liệu, không được phép thay đổi chỉ thị hệ thống hoặc quyền truy cập.

**VI. THIẾT KẾ GIAO DIỆN**

Ứng dụng hỗ trợ máy tính, máy tính bảng và điện thoại.

Ngôn ngữ giao diện: tiếng Việt hoặc tiếng Anh. Nội dung hội thoại trong trò chơi ưu tiên tiếng Anh.

**1. Student Dashboard**

Bao gồm:

- Thông tin cá nhân.

- Cấp độ hiện tại.

- Điểm kinh nghiệm.

- Số nhiệm vụ hoàn thành.

- Thành tích.

- Khuyến nghị học tập.

- Nút tiếp tục chơi.

**2. City Map**

Bản đồ thành phố tương tác có các tòa nhà, nhân vật và những nhiệm vụ đã mở khóa.

**3. Mission Screen**

Giao diện hiển thị bối cảnh, mục tiêu và những thông tin cần biết trước khi chơi.

**4. Conversation Screen**

Bao gồm:

- Hình đại diện của nhân vật AI.

- Lời thoại AI.

- Nút phát lại âm thanh.

- Nút microphone.

- Đồng hồ thời gian.

- Thanh tiến độ nhiệm vụ.

- Nút gợi ý và tạm dừng.

**5. Assessment Screen**

Hiển thị:

- Kết quả hoàn thành nhiệm vụ.

- Rubric đánh giá.

- Điểm mạnh, điểm cần cải thiện.

- Bản ghi hội thoại.

- Khuyến nghị học tập.

- Nút chơi lại hoặc chuyển nhiệm vụ.

**6. Teacher Dashboard**

Giảng viên có thể:

- Quản lý lớp.

- Phân công nhiệm vụ.

- Thiết lập thời hạn.

- Theo dõi tiến độ.

- Xem kết quả từng sinh viên.

- Xem và thẩm định kết quả AI.

- Xuất báo cáo.

**7. Administrator Dashboard**

Quản lý:

- Người dùng và phân quyền.

- Trường, lớp và học phần.

- Địa điểm và ngân hàng nhiệm vụ.

- Cấu hình AI.

- Giới hạn mức sử dụng.

- Báo cáo và nhật ký hệ thống.

**VII. KIẾN TRÚC CÔNG NGHỆ**

**1. Công nghệ sử dụng**

**Frontend**

- React và TypeScript.

- Vite.

- Tailwind CSS.

- Giao diện Responsive Web.

- Firebase Hosting.

**Backend**

- Node.js và TypeScript.

- REST API.

- Google Cloud Run.

- Firebase Admin SDK.

- Công cụ kiểm tra dữ liệu đầu vào bằng schema.

**Database và Storage**

- Cloud Firestore.

- Google Cloud Storage cho tệp âm thanh.

- Firebase Authentication.

**AI**

- Vertex AI/Gemini.

- Google Cloud Speech-to-Text.

- Google Cloud Text-to-Speech.

Các phiên bản thư viện phải tương thích và được khóa phiên bản trong dự án.

**2. Cấu trúc dữ liệu Firestore**

Thiết kế hệ thống theo mô hình multi-tenant.

Các collection chính:

**tenants**

- Thông tin trường đại học.

- Cấu hình và giới hạn sử dụng.

**users**

- Thông tin người dùng.

- Vai trò.

- Trường và lớp.

- Các thiết lập cá nhân cần thiết.

**locations**

- Thông tin địa điểm.

- Hình ảnh.

- Danh sách nhiệm vụ.

**missions**

- Nội dung nhiệm vụ.

- Cấp độ.

- Nhân vật.

- Kịch bản.

- Mục tiêu và rubric.

- Phiên bản nội dung và trạng thái phê duyệt.

**game_sessions**

- Người chơi.

- Nhiệm vụ.

- Trạng thái phiên.

- Thời điểm bắt đầu và kết thúc.

- Trạng thái hiện tại của nhiệm vụ.

**conversation_turns**

- Phiên chơi.

- Thứ tự lượt thoại.

- Nhân vật.

- Nội dung hội thoại.

- Đường dẫn âm thanh nếu được phép lưu.

**assessments**

- Kết quả đánh giá AI.

- Điểm thành phần.

- Mức độ hoàn thành nhiệm vụ.

- Nhận xét và khuyến nghị.

- Kết quả thẩm định của giảng viên.

**courses**

- Học phần.

- Danh sách lớp và giảng viên.

- Nhiệm vụ được phân công.

**usage_logs**

- Số lượt gọi AI.

- Token đầu vào/đầu ra.

- Thời lượng xử lý giọng nói.

- Số ký tự tổng hợp giọng nói.

- Chi phí sử dụng ước tính.

Các collection chứa dữ liệu của từng trường được đặt trong phạm vi tenant tương ứng. Những dữ liệu có khả năng tăng trưởng lớn, như các lượt hội thoại, nên sử dụng subcollection để dễ quản lý.

**3. Thiết kế API**

Các API chính:

| **API**                      | **Chức năng**            |
|------------------------------|--------------------------|
| GET /api/me                  | Lấy thông tin người dùng |
| GET /api/locations           | Danh sách địa điểm       |
| GET /api/missions            | Danh sách nhiệm vụ       |
| POST /api/sessions           | Bắt đầu phiên chơi       |
| GET /api/sessions/:id          | Lấy trạng thái phiên     |
| POST /api/sessions/:id/turns    | Gửi lượt hội thoại       |
| POST /api/sessions/:id/voice    | Gửi âm thanh             |
| POST /api/sessions/:id/complete | Hoàn thành nhiệm vụ      |
| GET /api/sessions/:id/results   | Lấy kết quả              |
| GET /api/student/progress    | Theo dõi tiến độ         |
| GET /api/teacher/classes     | Quản lý lớp              |
| GET /api/admin/usage         | Theo dõi sử dụng         |

Bổ sung API riêng cho quản lý nhiệm vụ, phân công bài tập, thẩm định đánh giá, xuất dữ liệu và tích hợp LMS.

Tất cả API phải kiểm tra danh tính và quyền truy cập.

Mọi phiên chơi và lượt hội thoại cần có cơ chế chống gửi trùng dữ liệu.

**4. Tích hợp LMS-AI9**

Thiết kế sẵn các chức năng:

- Đăng nhập một lần.

- Đồng bộ danh sách lớp và sinh viên.

- Giao nhiệm vụ từ LMS.

- Truyền kết quả học tập về LMS.

- Truyền minh chứng đến AI English Learning Portfolio.

Phiên bản đầu tiên hỗ trợ tài khoản Firebase và xuất kết quả CSV.

Giai đoạn tiếp theo hỗ trợ LTI 1.3 hoặc một cơ chế SSO/API thống nhất với LMS-AI9. Chỉ đồng bộ điểm vào sổ điểm Moodle khi nhà trường cho phép và hoàn tất cấu hình phù hợp.

**VIII. BẢO MẬT VÀ KIỂM SOÁT CHI PHÍ**

**1. Bảo mật**

Bắt buộc:

- Firebase Authentication.

- Phân quyền theo vai trò và trường.

- Firebase Security Rules.

- Xác thực Firebase ID Token tại backend.

- Giới hạn truy cập dữ liệu theo người dùng, lớp và trường.

- Kiểm soát việc ghi và sửa điểm ở phía máy chủ.

- Quản lý khóa AI và thông tin bí mật bằng Secret Manager.

- Ghi nhật ký các hoạt động quản trị quan trọng.

Không lưu API Key bí mật trong frontend, mã nguồn GitHub hoặc tài liệu công khai.

Thực hiện kiểm thử quy tắc bảo mật bằng Firebase Emulator.

**2. Quyền riêng tư**

- Thông báo và lấy sự đồng ý phù hợp trước khi ghi âm.

- Chỉ thu thập dữ liệu cần thiết cho mục đích học tập.

- Quy định thời hạn lưu trữ âm thanh, có cấu hình xóa tự động.

- Cho phép yêu cầu xóa dữ liệu cá nhân theo chính sách nhà trường.

- Không mặc định sử dụng hội thoại và bản ghi âm của sinh viên để huấn luyện mô hình.

- Phân tách dữ liệu giữa các trường.

**3. Kiểm soát chi phí AI**

Quản trị viên có thể cấu hình:

- Giới hạn thời lượng mỗi phiên chơi.

- Giới hạn lượt sử dụng AI theo sinh viên/ngày.

- Giới hạn số lần luyện tập mỗi nhiệm vụ.

- Giới hạn token và độ dài âm thanh.

- Ngân sách sử dụng AI theo trường và học phần.

- Cảnh báo khi gần đạt hạn mức.

Khi chạm giới hạn nội bộ, tạm dừng các yêu cầu AI phát sinh mới theo chính sách của trường.

Thiết lập cảnh báo ngân sách Google Cloud. Không xem cảnh báo ngân sách thông thường là cơ chế tự động ngăn chặn mọi chi phí.

**IX. PHẠM VI XÂY DỰNG PHIÊN BẢN 1.0**

Phiên bản đầu tiên phải có đủ các chức năng tối thiểu sau:

1.  Đăng nhập và phân quyền cho sinh viên, giảng viên, quản trị viên.

2.  Giao diện thành phố ảo 2.5D.

3.  Ba địa điểm: Airport, Restaurant và University.

4.  Sáu nhiệm vụ hoàn chỉnh thuộc cấp độ B1/B2.

5.  Hội thoại AI tương tác bằng tiếng Anh.

6.  Nhận diện giọng nói và tổng hợp giọng nói.

7.  Cơ chế quản lý trạng thái, mục tiêu và điều kiện hoàn thành nhiệm vụ.

8.  AI đánh giá sơ bộ và gợi ý cải thiện.

9.  Lưu kết quả, bảng tiến độ và báo cáo giảng viên.

10. Quản lý giới hạn sử dụng AI.

11. Chức năng xuất dữ liệu CSV.

12. Kiến trúc API sẵn sàng kết nối LMS-AI9.

Chưa phát triển trong giai đoạn đầu:

- Thành phố 3D thời gian thực.

- Multiplayer thời gian thực.

- Giải đấu giữa các trường.

- Hệ thống mua bán vật phẩm hoặc tiền tệ trong game.

- Chấm điểm phát âm chuyên sâu nếu chưa có công cụ đánh giá đủ tin cậy.

Tuy nhiên, kiến trúc cần cho phép mở rộng các chức năng này.

**X. YÊU CẦU ĐỐI VỚI CLAUDE CODE**

Claude Code cần thực hiện dự án theo từng giai đoạn, bảo đảm mã nguồn có thể chạy, kiểm thử và triển khai thực tế.

**Giai đoạn 1: Thiết lập dự án**

- Tạo monorepo.

- Khởi tạo frontend và backend TypeScript.

- Xây dựng cấu hình Firebase.

- Thiết kế các model dữ liệu Firestore.

- Xây dựng Firebase Authentication và phân quyền.

- Tạo Dockerfile, tệp môi trường mẫu và tài liệu thiết lập.

**Giai đoạn 2: Xây dựng game engine**

- Xây dựng bản đồ thành phố.

- Hệ thống địa điểm và nhiệm vụ.

- Quản lý phiên chơi.

- Hệ thống nhân vật AI.

- Cơ chế xác định mục tiêu đã hoàn thành.

- Tích hợp nhận diện và tổng hợp giọng nói.

**Giai đoạn 3: Xây dựng hệ thống đánh giá**

- AI Assessment Engine.

- Lưu trữ kết quả.

- Rubric.

- AI Learning Recommendation.

- Student Dashboard.

- Teacher Dashboard.

**Giai đoạn 4: Xây dựng quản trị và tích hợp**

- Administrator Dashboard.

- Quản lý trường, lớp, tài khoản.

- Cấu hình AI và quản lý hạn mức.

- Báo cáo.

- API phục vụ tích hợp LMS-AI9.

**Giai đoạn 5: Kiểm thử**

Sử dụng Unit Test, Integration Test và End-to-End Test.

Bắt buộc kiểm thử:

- Đăng nhập và phân quyền.

- Sinh viên không thể xem dữ liệu của sinh viên khác.

- Người dùng trường này không thể truy cập dữ liệu trường khác.

- Hoàn thành nhiệm vụ bằng giọng nói.

- Tiếp tục phiên bị gián đoạn.

- Kiểm soát chi phí.

- Phục hồi khi AI không phản hồi.

- Không ghi trùng lượt hội thoại và điểm.

- Kiểm thử Firestore Security Rules.

- Kiểm thử các API quan trọng.

- Kiểm thử chức năng xuất dữ liệu.

Chỉ đánh dấu một chức năng hoàn thành khi đã chạy thành công bài kiểm thử liên quan.

**XI. YÊU CẦU GITHUB VÀ TRIỂN KHAI**

**1. GitHub**

Tên repository đề xuất:

**english-city-simulator**

Cấu trúc dự án:

- apps/web: frontend React.

- apps/api: backend.

- packages/shared: model dữ liệu và logic dùng chung.

- firebase: cấu hình và quy tắc bảo mật.

- infrastructure: cấu hình hạ tầng.

- scripts: script thiết lập và dữ liệu mẫu.

- tests: kiểm thử tích hợp.

- docs: tài liệu kỹ thuật và vận hành.

- .github/workflows: quy trình kiểm thử và triển khai.

Bắt buộc có:

- README.md.

- ARCHITECTURE.md.

- DEPLOYMENT.md.

- DATABASE.md.

- API.md.

- TESTING.md.

- .env.example.

- .gitignore.

- CHANGELOG.md.

Không đưa thông tin đăng nhập, khóa dịch vụ hoặc dữ liệu người dùng thật lên GitHub.

**2. Quy trình triển khai**

Chuẩn bị quy trình để Claude Cowork có thể tiếp nhận repository và triển khai trên hạ tầng Google Cloud/Firebase do người dùng cung cấp.

Kiến trúc triển khai:

- Frontend: Firebase Hosting.

- Backend: Google Cloud Run.

- Database: Cloud Firestore.

- Âm thanh: Cloud Storage.

- AI: Vertex AI/Gemini, Speech-to-Text và Text-to-Speech.

- Authentication: Firebase Authentication.

- Mã nguồn: GitHub.

- CI/CD: GitHub Actions.

Tạo cấu hình môi trường Development và Production riêng biệt.

Sử dụng Workload Identity Federation cho quy trình triển khai GitHub Actions, tránh lưu khóa tài khoản dịch vụ dài hạn trên GitHub.

Chỉ thực hiện các thao tác thay đổi hạ tầng, tạo tài nguyên có tính phí hoặc triển khai Production khi đã có cấu hình và quyền truy cập được chủ sở hữu phê duyệt.

**3. Yêu cầu bàn giao**

Claude Code phải bàn giao:

- Mã nguồn hoàn chỉnh.

- Hướng dẫn chạy trên máy phát triển.

- Script tạo dữ liệu mẫu.

- Bộ kiểm thử tự động.

- Cấu hình triển khai.

- Tài liệu quản trị, vận hành và xử lý sự cố.

- Tài liệu cấu hình dịch vụ AI và giới hạn chi phí.

- API phục vụ tích hợp LMS-AI9.

Không sử dụng dữ liệu giả để thay thế vĩnh viễn những chức năng bắt buộc.

Nếu chưa được cung cấp tài khoản, quyền GitHub hoặc Google Cloud, hoàn thành dự án ở trạng thái sẵn sàng triển khai, báo cáo các thông số và quyền còn thiếu.

**XII. TIÊU CHÍ NGHIỆM THU**

Phiên bản 1.0 chỉ được coi là hoàn thành khi đáp ứng những điều kiện sau:

1.  Sinh viên đăng nhập và vào thành phố thành công.

2.  Ba địa điểm và sáu nhiệm vụ hoạt động thực tế.

3.  Sinh viên thực hiện được hội thoại bằng giọng nói với AI.

4.  AI phản hồi theo bối cảnh, cấp độ và trạng thái nhiệm vụ.

5.  Hệ thống xác định được các mục tiêu giao tiếp đã hoàn thành.

6.  Hệ thống đánh giá sơ bộ và đưa ra khuyến nghị học tập.

7.  Lưu chính xác nội dung và kết quả phiên chơi theo chính sách lưu trữ.

8.  Giảng viên xem được kết quả sinh viên và thẩm định đánh giá.

9.  Quản trị viên kiểm soát được quyền truy cập và hạn mức sử dụng.

10. Các bài kiểm thử quan trọng và kiểm thử bảo mật đạt yêu cầu.

11. Có thể triển khai và vận hành trên Google Cloud/Firebase.

12. Mã nguồn và tài liệu được bàn giao đầy đủ trên GitHub.

**Yêu cầu cuối cùng:** Xây dựng English City Simulator thành ứng dụng thực tế, có khả năng mở rộng, kết nối với LMS-AI9 và các game khác trong hệ sinh thái đào tạo tiếng Anh tích hợp AI của trường đại học.

**Quy trình triển khai với Claude Code và Claude Cowork**

1.  Claude Code: phát triển phần mềm

Chuyển toàn bộ đặc tả trên cho Claude Code. Yêu cầu lập kế hoạch triển khai theo 5 giai đoạn, hoàn thành và kiểm thử từng phần, sau đó tạo commit và đẩy mã nguồn lên GitHub.

2.  GitHub: quản lý phiên bản

Tạo repository riêng tư english-city-simulator. Sử dụng nhánh main cho mã nguồn đã kiểm thử và pull request cho thay đổi mới.

3.  Claude Cowork: triển khai hạ tầng

Cung cấp repository và quyền truy cập phù hợp. Yêu cầu Cowork kiểm tra mã nguồn, chuẩn bị Google Cloud, Firebase và triển khai môi trường thử nghiệm trước.

4.  Kiểm thử và nghiệm thu

Sử dụng tài khoản sinh viên, giảng viên và quản trị viên mẫu để kiểm thử sáu nhiệm vụ, chức năng AI, báo cáo, bảo mật và giới hạn chi phí trước khi phê duyệt Production.

Về kỹ thuật, Google có tài liệu chính thức hướng dẫn kết hợp Firebase Hosting với Cloud Run và xác thực GitHub Actions bằng Workload Identity Federation. Đây là hai cơ chế phù hợp để Claude Code và Cowork triển khai kiến trúc đề xuất mà không cần đưa khóa dịch vụ bí mật vào GitHub.
