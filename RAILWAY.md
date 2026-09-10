# Chạy Usagi Tiên Tôn trên Railway

## Bot

Tạo service mới từ repo `uyenhoang9034-pixel/UsagiTienTon`, nhánh `codex/split-music-roles-cultivation` (hoặc `main` sau khi gộp PR). Giữ Root Directory là `/`, Config File là `/railway.json`. File này chọn Dockerfile Node 22 và healthcheck `/ready`. Chạy **một replica**, một vùng; không bật Serverless/sleep cho bot Discord.

Điền Variables của service mới:

| Biến | Giá trị |
| --- | --- |
| `DISCORD_TOKEN` | Token bot mới, nhập trực tiếp trên Railway |
| `CLIENT_ID` | Application ID bot mới |
| `GUILD_ID` | ID server Discord |
| `OWNER_IDS` | ID Discord của người quản lý |
| `NODE_ENV` | `production` |
| `PREFIX` | Prefix riêng của bot mới, ví dụ `?` |
| `DATABASE_URL` | Tham chiếu database đã chuẩn bị, ví dụ `${{PostgresUsagi.DATABASE_URL}}` |
| `AUTO_MIGRATE` | `true` với database riêng đã chuẩn bị |
| `ALLOW_MEMORY_DATABASE` | `false` |
| `LAVALINK_HOST` | `${{LavalinkUsagi.RAILWAY_PRIVATE_DOMAIN}}` |
| `LAVALINK_PORT` | `2333` |
| `LAVALINK_PASSWORD` | `${{LavalinkUsagi.LAVALINK_PASSWORD}}` |
| `LAVALINK_SECURE` | `false` khi dùng mạng nội bộ tới service bên dưới |

Tên `PostgresUsagi` và `LavalinkUsagi` là ví dụ: thay bằng đúng tên service trong project. Không đặt `POSTGRES_URL` trỏ về database khác vì code ưu tiên nó hơn `DATABASE_URL`. Dùng chế độ SSL phù hợp database thực tế; không chép `POSTGRES_SSL=false` của Docker Compose một cách máy móc lên Railway.

Railway cung cấp `PORT` cho bot. Không cần domain công khai chỉ để bot kết nối Discord. Giữ ID role/kênh/emoji từ repo nếu vẫn dùng cùng server; có thể đổi `GAME_ROLE_NOTIFICATION_CHANNEL_ID` và `CULTIVATION_CHANNEL_ID`.

## Lavalink

Nếu project đã có Lavalink v4 có YouTube plugin hoạt động, có thể dùng service đó sau khi kiểm tra cấu hình. Nếu tạo mới:

1. Thêm service từ cùng repo và nhánh, đặt tên ví dụ `LavalinkUsagi`.
2. Giữ Root Directory `/`; đặt **Config File `/lavalink/railway.json`**. Không dùng `/railway.json` của bot cho service này.
3. Đặt `LAVALINK_PASSWORD` thành mật khẩu riêng; `SERVER_PORT=2333`, `SERVER_ADDRESS=::` để lắng nghe mạng nội bộ Railway. Xóa Start Command/healthcheck của bot nếu đã copy service.
4. Chạy cùng project và environment với bot. Deploy Lavalink trước rồi deploy bot.

Dockerfile của Lavalink mang theo `application.yml` và YouTube plugin; chỉ deploy image Lavalink trống sẽ thiếu cấu hình này. Các biến `LAVALINK_NODES` hoặc `LAVALINK_NODES_FILE` cũ có thể ghi đè host ở bảng trên: xóa chúng nếu chuyển sang service nội bộ.

## Dữ liệu và bàn giao

Chưa xác định database của project hiện tại. Không khởi động game mới với database trống nếu muốn giữ tiến trình cũ.

- Sao lưu database cũ trước khi chuyển. Chuẩn bị PostgreSQL riêng, phục hồi dữ liệu rồi xác minh hồ sơ/vật phẩm người chơi. Backup volume Railway và bản dump PostgreSQL là hai loại backup khác nhau.
- Trong lần đồng bộ cuối, tạm ngừng ghi game trên bot cũ. Không cho hai bot cùng xử lý tu tiên trên một database vì khóa chống trùng trong code chỉ tồn tại trong từng tiến trình.
- Khi bot mới hoạt động, tắt nhóm nhạc/role/tu tiên ở bot cũ và tạo lại panel bằng `/reactroles setup` từ bot mới. Việc này chưa được thực hiện bởi cấu hình trong repo.
- Thử `/play`, reaction, thông báo và `/tutien`; restart bot rồi kiểm tra lại dữ liệu và reaction.

Tài liệu chính thức: [Config as Code](https://docs.railway.com/config-as-code/reference), [Variables](https://docs.railway.com/variables), [Private networking](https://docs.railway.com/networking/private-networking), [Backup/restore PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores).
