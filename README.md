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

Mở `/admin` và đăng nhập bằng tên đăng nhập và mật khẩu quản trị hoặc bằng [tài khoản GitHub được cấp quyền](#cấp-quyền-đăng-nhập-github). Bạn có thể chọn nhiều ảnh và video trong một lần. Trang quản lý tải từng tệp trực tiếp lên Vercel Blob, tối đa 512 MB mỗi tệp. Tệp tải thành công xuất hiện trong kho công khai. Tải lại trang kho nếu đang mở từ trước.

Project Vercel cần một Blob Store loại Public và các biến Production `BLOB_READ_WRITE_TOKEN`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`. Đặt URL callback của GitHub OAuth App thành `https://phulon-archive.vercel.app/api/auth/callback/github` khi dùng tên miền chính của dự án. Giữ giá trị các biến bí mật trong Vercel.

Admin có thể đổi tên và xóa tệp Blob. Để bật hai thao tác này cho tệp cũ trong `public/files`, tạo một GitHub fine-grained personal access token chỉ cấp cho repo `nguyenngoduc/SiuuuPHULONArchive` với quyền **Contents: Read and write**. Lưu token dưới dạng biến Secret `ARCHIVE_GITHUB_TOKEN` trong môi trường Production của Vercel rồi triển khai lại. Thao tác với tệp GitHub tạo commit trên `main`, vì vậy tài khoản cấp token cần được phép ghi vào nhánh này.

Danh sách dùng ngày tải lên do Blob ghi nhận hoặc ngày commit sửa tệp trong GitHub. Các mục chưa lấy được ngày vẫn có thể xem và tải, đồng thời xuất hiện cuối khi sắp xếp theo ngày.

## Cấp quyền đăng nhập GitHub

Theo mặc định, `/admin` cho phép GitHub `nguyenngoduc` đăng nhập với ID `54198073`. Mỗi tài khoản được thêm sẽ có quyền quản trị kho.

1. Xác nhận đúng tên người dùng GitHub của người cần thêm. Mở `https://api.github.com/users/TEN_GITHUB` trong trình duyệt, kiểm tra trường `login`, rồi sao chép số trong trường `id`. ID số giữ nguyên khi người dùng đổi username.
2. Trong project `phulon-archive` trên Vercel, mở **Environment Variables**. Tạo hoặc cập nhật biến `ARCHIVE_ADMIN_GITHUB_IDS` cho **Production**. Điền toàn bộ ID được cấp quyền, cách nhau bằng dấu phẩy. Ví dụ `54198073,12345678`. Khi đã đặt biến này, hãy giữ `54198073` trong danh sách nếu muốn chủ kho tiếp tục đăng nhập bằng GitHub.
3. **Redeploy** bản Production rồi mở `/admin`. Người được cấp quyền bấm **Đăng nhập với GitHub** và xác nhận đúng tài khoản khi GitHub hỏi. Tài khoản chưa được cấp quyền sẽ chuyển sang luồng gửi yêu cầu nếu Neon đã được thiết lập.

Để thu hồi quyền cấp qua danh sách ID, xóa ID và triển khai lại. Quyền cấp qua yêu cầu được lưu riêng trong Neon. Người được cấp quyền đăng nhập Admin có thể dùng trang kho mà không cần được thêm vào repo GitHub hoặc project Vercel.

## Xét duyệt yêu cầu cấp quyền

Trước khi đẩy mã lên `main`, chạy [db/admin-access-requests.sql](db/admin-access-requests.sql), rồi chạy [db/admin-access-email.sql](db/admin-access-email.sql) trong **Neon → SQL Editor**. Chọn cùng branch và database đã chạy `db/admin-auth.sql`. Giữ Secret `DATABASE_URL` cho Production.

- **GitHub**. Tại `/admin`, bấm **Đăng nhập với GitHub** và chọn đúng tài khoản muốn liên kết. Lần đầu xác thực thành công với một tài khoản chưa có quyền sẽ tạo một yêu cầu. Sau khi quản trị viên duyệt, bấm nút GitHub lần nữa với cùng tài khoản để vào kho.
- **Username và mật khẩu**. Tại `/admin`, mở **Tạo tài khoản và gửi yêu cầu**, nhập tên, email nhận kết quả, mật khẩu và xác nhận. Sau khi được duyệt, đăng nhập bằng thông tin đã đăng ký. Hệ thống chỉ lưu hash của mật khẩu. Quản trị viên xác minh danh tính người gửi trước khi cấp quyền.
- **Quản trị viên**. Đăng nhập bằng tài khoản GitHub trong `ARCHIVE_ADMIN_GITHUB_IDS` hoặc tài khoản mật khẩu được tạo trực tiếp trong Neon. Mở mục **Yêu cầu cấp quyền** rồi bấm **Duyệt** hoặc **Từ chối**. Tài khoản được duyệt có quyền quản trị kho. Quyền xét duyệt dành cho các tài khoản quản trị đã được chỉ định.

Thông báo 72 giờ là thời gian dự kiến để quản trị viên xét duyệt. Quyền đăng nhập được cấp ngay khi quản trị viên bấm **Duyệt**.

### Email thông báo

Project dùng [Resend](https://resend.com/docs/dashboard/domains/introduction) để thông báo yêu cầu mới cho quản trị viên và gửi kết quả duyệt hoặc từ chối cho người gửi. Với GitHub, email kết quả dùng địa chỉ đã xác minh được GitHub trả về sau khi người dùng đồng ý cấp quyền đọc email. Với tài khoản mật khẩu, kết quả gửi đến địa chỉ người dùng nhập trong form.

Xác minh tên miền gửi trong Resend, tạo API key có quyền gửi, rồi thêm các biến sau vào **Environment Variables → Production** của project Vercel.

| Biến | Giá trị |
|---|---|
| `RESEND_API_KEY` | API key từ Resend, lưu dạng Secret |
| `ARCHIVE_EMAIL_FROM` | Địa chỉ gửi thuộc tên miền đã xác minh, ví dụ `PHULON Archive <archive@example.com>` |
| `ARCHIVE_REVIEW_EMAIL` | Địa chỉ quản trị viên nhận thông báo có yêu cầu mới |

Lỗi gửi email không làm mất yêu cầu hoặc thay đổi kết quả xét duyệt. Trong **Yêu cầu cấp quyền**, bấm **Thử gửi lại** nếu còn email chờ. Sau một lần thử lỗi, email có thể được thử lại sau một phút. Việc xét duyệt vẫn thực hiện trong `/admin`.

Để thu hồi một quyền GitHub đã cấp qua yêu cầu, chạy câu lệnh sau trong Neon và thay `ID_GITHUB` bằng ID cần thu hồi. Nếu ID cũng có trong biến môi trường cấp quyền, hãy xóa tại đó và triển khai lại.

```sql
UPDATE archive_auth.access_requests
SET status = 'rejected', reviewed_at = now()
WHERE provider = 'github' AND identity = 'ID_GITHUB' AND status = 'approved';
```

## Tài khoản quản trị bằng mật khẩu

1. Tạo PostgreSQL trên [Neon](https://console.neon.tech/). Trong **SQL Editor**, chạy toàn bộ [db/admin-auth.sql](db/admin-auth.sql) trên database dùng cho Production.
2. Mở **Connect** trong Neon, sao chép chuỗi kết nối PostgreSQL dạng **Pooled connection** và lưu vào Vercel dưới dạng Secret `DATABASE_URL` cho **Production**. Giữ `AUTH_SECRET` đã có. Sau khi triển khai lại, `/admin` sẽ hiển thị form tên đăng nhập và mật khẩu. Các biến OAuth hiện tại tiếp tục bật nút GitHub.
3. Trong terminal của bản checkout, chạy `npm run admin:hash`. Nhập mật khẩu mới hai lần. Terminal ẩn ký tự khi nhập và chỉ in hash. Mật khẩu cần ít nhất 14 ký tự và tối đa 256 byte UTF-8.
4. Trong **SQL Editor**, thay `admin_moi` bằng tên đăng nhập và thay `HASH_VUA_TAO` bằng hash ở bước 3. Tên đăng nhập dài 3–40 ký tự, dùng chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang, và bắt đầu bằng chữ hoặc số.

```sql
INSERT INTO archive_auth.admin_users (username, password_hash)
VALUES ('admin_moi', 'HASH_VUA_TAO');
```

Mỗi dòng được bật trong bảng này có quyền quản trị kho. Có thể thêm tài khoản bằng cùng câu lệnh sau khi tạo hash riêng. Thay đổi tài khoản có hiệu lực trên database đang chạy. Đổi mật khẩu hoặc khóa tài khoản sẽ chấm dứt các phiên đăng nhập bằng mật khẩu của tài khoản đó.

```sql
UPDATE archive_auth.admin_users
SET password_hash = 'HASH_MOI'
WHERE username = 'admin_moi';

UPDATE archive_auth.admin_users
SET enabled = false
WHERE username = 'admin_moi';
```

Giữ mật khẩu và chuỗi kết nối PostgreSQL ngoài Git. Trong SQL Editor chỉ nhập hash, tên đăng nhập và trạng thái tài khoản.
