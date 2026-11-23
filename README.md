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

## Tải lên từ trình duyệt

Mở `/admin` và đăng nhập bằng tài khoản GitHub `nguyenngoduc`. Bạn có thể chọn nhiều ảnh và video trong một lần. Trang quản lý tải từng tệp trực tiếp lên Vercel Blob, tối đa 512 MB mỗi tệp. Tệp tải thành công xuất hiện trong kho công khai. Tải lại trang kho nếu đang mở từ trước.

Project Vercel cần một Blob Store loại Public và các biến Production `BLOB_READ_WRITE_TOKEN`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`. Đặt URL callback của GitHub OAuth App thành `https://phulon-archive.vercel.app/api/auth/callback/github` khi dùng tên miền chính của dự án. Giữ giá trị các biến bí mật trong Vercel.

Admin có thể đổi tên và xóa tệp Blob. Để bật hai thao tác này cho tệp cũ trong `public/files`, tạo một GitHub fine-grained personal access token chỉ cấp cho repo `nguyenngoduc/SiuuuPHULONArchive` với quyền **Contents: Read and write**. Lưu token dưới dạng biến Secret `ARCHIVE_GITHUB_TOKEN` trong môi trường Production của Vercel rồi triển khai lại. Thao tác với tệp GitHub tạo commit trên `main`, vì vậy tài khoản cấp token cần được phép ghi vào nhánh này.

Danh sách dùng ngày tải lên do Blob ghi nhận hoặc ngày commit sửa tệp trong GitHub. Các mục chưa lấy được ngày vẫn có thể xem và tải, đồng thời xuất hiện cuối khi sắp xếp theo ngày.
