# Chạy Usagi Tiên Tôn trên Railway

## Bot

Tạo service mới từ repo:

`uyenhoang9034-pixel/UsagiTienTon`

Sử dụng nhánh:

`main`

Giữ:

- Root Directory: `/`
- Config File: `/railway.json`

File `railway.json` sử dụng Dockerfile Node 22 và healthcheck:

`/health`

Chạy **một replica**, một vùng.

Không bật Serverless / Sleep cho bot Discord.

---

## Variables của Bot

Điền các Variables sau cho service bot:

| Biến | Giá trị |
| --- | --- |
| `DISCORD_TOKEN` | Token bot mới, nhập trực tiếp trên Railway |
| `CLIENT_ID` | Application ID của bot mới |
| `GUILD_ID` | ID server Discord |
| `OWNER_IDS` | ID Discord của người quản lý |
| `NODE_ENV` | `production` |
| `PREFIX` | Prefix riêng của bot mới, ví dụ `?` |
| `DATABASE_URL` | Tham chiếu database PostgreSQL đã chuẩn bị |
| `AUTO_MIGRATE` | `true` với database riêng đã chuẩn bị |
| `ALLOW_MEMORY_DATABASE` | `false` |
| `LAVALINK_HOST` | Private Domain của service Lavalink |
| `LAVALINK_PORT` | `2333` |
| `LAVALINK_PASSWORD` | Cùng mật khẩu với service Lavalink |
| `LAVALINK_SECURE` | `false` khi dùng mạng nội bộ Railway |

Ví dụ nếu service PostgreSQL có tên:

`PostgresUsagi`

thì:

```text
DATABASE_URL=${{PostgresUsagi.DATABASE_URL}}
