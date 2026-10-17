# Usagi Bot

Discord Bot tích hợp Music, Voice TTS, Kết Hôn (Marriage), và Trợ lý AI Thông Minh (Multi-Engine LLM & Image Generation).

## Các tính năng chính

- **Âm nhạc (Music):** Phát nhạc qua Lavalink, hỗ trợ prefix và các nút điều khiển âm nhạc.
- **Voice TTS (Text-to-Speech):** Nói thay trong voice channel, hỗ trợ đổi nhiều giọng đọc tự nhiên (tiếng Việt, tiếng Nhật Anime Waifu, tiếng Anh, v.v.).
- **Hệ thống Kết Hôn (Marriage):** Đăng ký kết hôn, chăm sóc tình yêu, điểm thân mật, chuỗi ngày bên nhau, tặng quà và bảng xếp hạng tình duyên.
- **Trợ lý AI (Usagi AI Assistant):** Trò chuyện tự nhiên, persona em bot Usagi múp rụp, xoay vòng nhiều API (Groq, Gemini, OpenRouter), tạo ảnh AI trong kênh chỉ định.

## Cài đặt & Khởi chạy

1. Copy `.env.example` thành `.env`, điền `DISCORD_TOKEN`, `CLIENT_ID`, các key AI và cấu hình cần thiết.
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Chạy bot:
   ```bash
   npm start
   ```

## Kiểm tra

Chạy bộ test kiểm thử:
```bash
npm test
```
