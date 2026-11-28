# Nhật ký thay đổi (Phiên bản 1.1.0)

## AI của bạn dùng trực tiếp được trang này
- Trang không gọi AI và không cần API key. Nút **Tạo bằng AI** tạo một prompt đầy đủ (nhiệm vụ, ngành, quy tắc viết, schema, CV hiện tại, JD, kết quả kiểm tra) để dán vào ChatGPT, Gemini hoặc Claude.
- AI trả về một **link `#cv=`** hoặc một khối JSON. Bấm link, dán câu trả lời vào hộp thoại, hoặc nhấn Ctrl+V ở bất kỳ đâu trên trang là CV được nạp. Mọi lần nhập đều có nút Hoàn tác.
- Agent điều khiển trình duyệt dùng được **`window.cvEditor`** (load, patch, audit, downloadPdf...). Hướng dẫn cho AI nằm ở `/llms.txt`.
- Dữ liệu trong link nằm sau dấu `#`, không bao giờ gửi lên máy chủ.

## Agent Skill
- Tải **cv-editor-skill.zip** trong "Tạo bằng AI" (hoặc `/cv-editor-skill.zip`). Skill cho Claude Code, ứng dụng Claude và các agent hỗ trợ skill quy tắc viết, schema và `cv_tool.py` (giải mã link, kiểm tra CV theo JD, tạo link nạp CV).
- "Tạo bằng AI" giờ đưa agent một yêu cầu ngắn kèm link CV hiện tại; prompt dài để copy-paste vẫn còn cho chat không hỗ trợ skill.

## Kiểm tra CV (ATS và mùi AI)
- Điểm kiểm tra luôn hiện trên thanh công cụ. Bảng kiểm tra chỉ ra bullet cùng khuôn "Nhãn:", độ dài bullet đều bất thường, từ sáo rỗng, kỹ năng chỉ liệt kê mà không có bằng chứng, bullet ít thông tin, định dạng ngày lẫn lộn, số trang, và từ khóa JD còn thiếu. Bấm "Đi tới" để mở đúng mục cần sửa.

## Mẫu Harvard
- Mẫu mặc định mới: tên và dòng liên hệ căn giữa, tiêu đề mục căn trái viết hoa có kẻ ngang, tên tổ chức in đậm kèm địa điểm, chức danh in nghiêng kèm thời gian. Mẫu cũ vẫn chọn được với tên Modern.
- Font mặc định là Times (font chuẩn của PDF): file khoảng 8 KB, ATS đọc chữ sạch. CV tiếng Việt hoặc CJK tự chuyển sang font Unicode nhúng.
- Sửa lỗi các từ bị dính nhau khi in đậm, và lỗi ký tự bullet ở mục Dự án.

## Ảnh đại diện
- Chọn hình dạng (vuông, bo góc, tròn), vị trí (trái, phải, trên tên), 3 kích thước, và kiểu cắt (lấp đầy hoặc vừa khung). Ảnh giữ đúng tỉ lệ, không còn bị kéo méo.
- Nhận mọi ảnh trình duyệt đọc được (JPG, PNG nền trong suốt, WebP, GIF, ảnh chụp lớn) và tự thu nhỏ.

## Giao diện mới
- Màn hình chào khi CV trống, thanh mục CV bên trái (kéo thả, Alt+mũi tên, nhấn đúp để đổi tên, ẩn/hiện), gợi ý viết cho từng mục, chế độ Sửa/Xem trước trên điện thoại.
- Tự động lưu: tải lại trang không mất CV. Thêm link chia sẻ CV.
- Tải PDF bằng một cú bấm. File DOCX dùng tab stop thay cho bảng ẩn nên ATS đọc đúng thứ tự.
- Font lớn chỉ tải khi cần, trang mở nhanh hơn rất nhiều.
