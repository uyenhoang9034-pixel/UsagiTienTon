# Usagi Tiên Tôn

Tách từ `uyenhoang9034-pixel/-` tại commit `64e2c0df968b522ac263927bf369774dec5e5102`, giữ cấu trúc `src/commands`, `src/services`, `src/interactions`, `src/config` và các phần dùng chung cần thiết.

Bot chỉ tải ba nhóm chức năng:

- **Âm nhạc:** `/play query:<link YouTube hoặc tên bài>`, `/join`, `/music`, `/queue`, `/nowplaying`, `/audio` và các nút điều khiển/search audio cũ. Người dùng cần vào voice trước khi phát nhạc.
- **Nhận role:** `/reactroles setup` tạo bảng chọn game với emoji. Thêm reaction cấp role, bỏ reaction gỡ role; khi cấp thành công bot gửi thông báo tới kênh cấu hình. Cần tạo panel bằng bot mới vì panel của bot cũ thuộc tài khoản bot cũ.
- **Tiên Lộ:** `/tutien`, các nút và menu tu luyện, thám hiểm, bí cảnh, luyện đan, trang bị, công pháp, linh thú và pháp bảo. Giữ các lệnh GM `/tutienitem`, `/tutientest`, `/testlinhthu` với kiểm tra quyền từ repo cũ.

Các sự kiện leveling, moderation, welcome, giveaway, birthday, ticket, nối từ, counting và cron của bot cũ không được tải. Một số cấu hình/schema database chung vẫn được giữ để tương thích với code gốc.

## Cài đặt

1. Tạo ứng dụng/bot Discord mới. Copy `.env.example` thành `.env`, đặt **token và CLIENT_ID của bot mới** cùng ID server/owner. Không commit `.env`.
2. Bật **Server Members Intent** và **Message Content Intent** trong Developer Portal. Mời bot với scope `bot` và `applications.commands`.
3. Cấp View Channel, Send Messages, Embed Links, Attach Files, Add Reactions, Read Message History, Use External Emojis, Manage Roles, Connect và Speak. Đặt role của bot cao hơn các role cần cấp.
4. Kiểm tra `src/config/gameRoles.js`: các ID role, kênh và emoji giữ nguyên từ server cũ. Quyền xem/chat trong các kênh game được cấu hình bằng role tại Discord. `GAME_ROLE_NOTIFICATION_CHANNEL_ID` đổi kênh nhận thông báo; `CULTIVATION_CHANNEL_ID` đổi kênh tu tiên. ID role GM được giữ tại ba file lệnh GM.
5. Với Docker: đặt mật khẩu PostgreSQL và Lavalink trong `.env`, chạy `docker compose up -d --build`. Compose tạo database riêng có volume lưu dữ liệu và Lavalink có YouTube plugin.
6. Hoặc dùng Node **22.12+**: `npm ci`, cấu hình PostgreSQL và Lavalink v4 riêng trong `.env`, rồi `npm start`.

Lavalink cần kết nối thành công để phát nhạc. YouTube có thể yêu cầu cấu hình xác thực/chống bot cho máy chủ Lavalink; code không tự cung cấp tài khoản YouTube. `/play` nhận link qua lệnh, không tự phát mọi link dán ở mọi kênh.

## Chuyển bot đang hoạt động

Repo chỉ chứa code, **không chứa tiến trình tu tiên đang lưu trong PostgreSQL**. Muốn giữ dữ liệu người chơi, sao lưu database cũ và phục hồi vào database của bot mới trước khi mở game. Các khóa `games:cultivation:*` được giữ nguyên. Có thể dùng `npm run backup:db` và `npm run restore:db` (cần công cụ PostgreSQL; đọc các script trước khi chạy).

Trong lúc bàn giao, tạm dừng nhóm lệnh tu tiên trên bot cũ để tránh hai bot cùng sửa một hồ sơ. Sau khi kiểm tra bot mới, tắt nhóm nhạc, role và tu tiên trên bot cũ; bản tách này không sửa repo cũ hay server Discord trực tiếp. Đặt hai bot dùng prefix khác nhau nếu cùng còn lệnh prefix. Tạo lại bảng `/reactroles setup` từ bot mới và ngừng dùng bảng cũ.

Bot từ chối khởi động nếu PostgreSQL mất kết nối để tránh ghi tiến trình vào RAM rồi mất khi restart. `ALLOW_MEMORY_DATABASE=true` chỉ dành cho thử nghiệm tạm, không dùng khi chơi thật.

## Kiểm tra

`npm test` kiểm tra danh sách lệnh/handler, giới hạn ba nhóm chức năng, thêm/gỡ reaction sau restart, quyền role, quyền điều khiển nhạc và đọc/ghi hồ sơ tu tiên bằng database giả lập. Các bài kiểm tra không đăng nhập Discord, gửi tin nhắn hay sửa database thật.

Sau khi deploy cần thử: `/play` với link YouTube, điều khiển nhạc, `/reactroles setup`, reaction và thông báo, restart rồi reaction lại, `/tutien` và các menu. Tiến trình đang thám hiểm trong RAM có thể cần mở lại sau khi chuyển bot.
