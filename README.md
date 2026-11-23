# SiuuuPHULONArchive

Kho lưu trữ Siuuu, PHULON, DUYLON Song cho

## Đặc điểm

SiuuuPHULONArchive
Kho luu tru Siuuu, PHULON, DUYLON Song cho
PHULON Song chp
DUYLON Lua chua
Song cho Siuuu

## Thêm ảnh hoặc video

1. Chép tệp vào `public/files` trong bản checkout. Video MP4 dùng H.264/AAC là lựa chọn tương thích rộng, và tệp có metadata MP4 ở đầu sẽ bắt đầu phát sớm hơn.
2. Cài FFmpeg có bộ mã hoá libwebp và chạy `npm run thumbnails`.
3. Commit cả tệp gốc và thumbnail WebP mới trong cùng commit rồi đẩy lên `main`. Thumbnail được đặt tên theo mã nội dung Git. Tệp chưa có thumbnail sẽ hiện biểu tượng trong danh sách.

Trang chủ hiển thị ngay danh sách từ bản triển khai. Khi GitHub phản hồi, trang đồng bộ danh sách và dùng URL gắn với chính commit chứa tệp mới. Tệp đã có trong bản triển khai được phục vụ trực tiếp từ tài nguyên tĩnh của Vercel. Tệp có trên GitHub và chưa có trong bản triển khai được stream qua route media, kể cả khi trình duyệt yêu cầu một đoạn dữ liệu để tua video. Kho GitHub công khai phải cho phép đọc qua `api.github.com` và `raw.githubusercontent.com`.

`npm run build` không cần FFmpeg hoặc kết nối Google Fonts. Video và ảnh gốc chỉ được yêu cầu khi xem hoặc tải xuống.
