import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCodeRequest,
  sanitizeCodeFromResponse,
  cleanDialoguePrefix,
} from '../src/services/ai/aiTextService.js';
import { isImageGenerationRequest, extractImagePrompt } from '../src/services/ai/imageService.js';
import { aiHistoryManager } from '../src/services/ai/aiHistoryManager.js';
import { AI_CONFIG } from '../src/services/ai/aiConfig.js';
import { handleAIChatMessage } from '../src/services/ai/aiChatManager.js';

test('AI Dialogue Prefix Cleaner: removes annoying EM: or Usagi: speaker tags', () => {
  assert.equal(cleanDialoguePrefix('EM: Chào bác nha!'), 'Chào bác nha!');
  assert.equal(cleanDialoguePrefix('Em: Bác hỏi câu này chán thế!'), 'Bác hỏi câu này chán thế!');
  assert.equal(cleanDialoguePrefix('**EM:** Chào bác nha!'), 'Chào bác nha!');
  assert.equal(cleanDialoguePrefix('**Em:** Chào bác nha!'), 'Chào bác nha!');
  assert.equal(cleanDialoguePrefix('Usagi: Bác ăn cơm chưa?'), 'Bác ăn cơm chưa?');
  assert.equal(cleanDialoguePrefix('Em bot Usagi múp rụp: Bác khỏe không?'), 'Bác khỏe không?');
  assert.equal(cleanDialoguePrefix('Bot: Xin chào!'), 'Xin chào!');
  assert.equal(cleanDialoguePrefix('AI: Trả lời bác nè.'), 'Trả lời bác nè.');
  
  // Không xóa chữ "em" nếu nó là một phần bình thường của câu
  assert.equal(cleanDialoguePrefix('Em chào bác nha!'), 'Em chào bác nha!');
  assert.equal(cleanDialoguePrefix('Em bot Usagi múp rụp chúc bác vui vẻ!'), 'Em bot Usagi múp rụp chúc bác vui vẻ!');

  // Xóa hành động nhại lại kịch bản và chuẩn hóa Em viết hoa giữa câu (trường hợp screenshot)
  assert.equal(
    cleanDialoguePrefix('Em: *hì* 🐰❤️ Chào bác, có gì cần Em giúp không? 😏✨'),
    '🐰❤️ Chào bác, có gì cần em giúp không? 😏✨',
  );
  assert.equal(
    cleanDialoguePrefix('Em chào bác, có gì cần em bot Usagi múp rụp giúp đỡ không ạ?'),
    'Em chào bác, có gì cần em bot Usagi múp rụp giúp đỡ không ạ?',
  );
});

test('AI Code Interception: accurately identifies code writing requests and ignores normal questions', () => {
  // Những câu hỏi yêu cầu code -> Phải bị phát hiện
  assert.equal(isCodeRequest('Viết cho tôi đoạn code python tính số nguyên tố'), true);
  assert.equal(isCodeRequest('Lập trình giúp mình một con bot discord bằng js'), true);
  assert.equal(isCodeRequest('Code hộ hàm sắp xếp mảng trong C++'), true);
  assert.equal(isCodeRequest('Hãy viết script bash tự động backup database'), true);
  assert.equal(isCodeRequest('Write some python code to scrape a website'), true);
  assert.equal(isCodeRequest('Giải bài tập lập trình leetcode two sum'), true);

  // Những câu hỏi kiến thức / đời sống bình thường -> KHÔNG bị chặn
  assert.equal(isCodeRequest('Thủ đô của nước Pháp là gì thế Usagi?'), false);
  assert.equal(isCodeRequest('Giải thích cho mình thuyết tương đối của Einstein'), false);
  assert.equal(isCodeRequest('Hôm nay thời tiết thế nào, có nên đi chơi không?'), false);
  assert.equal(isCodeRequest('Làm thế nào để học giỏi tiếng Anh hơn?'), false);
  assert.equal(isCodeRequest('Kể cho mình nghe một câu chuyện cười đi'), false);
});

test('AI Code Interception: sanitizes code blocks from AI response', () => {
  const responseWithCode = `
Chào bạn! Đây là câu trả lời:
\`\`\`python
def hello():
    print("Hello world")
\`\`\`
Hy vọng giúp ích cho bạn!
  `.trim();

  const sanitized = sanitizeCodeFromResponse(responseWithCode);
  assert.equal(sanitized.includes('def hello():'), false);
  assert.equal(sanitized.includes('Em bot Usagi múp rụp xin phép không cung cấp mã nguồn/code'), true);
  assert.equal(sanitized.includes('bác'), true);
});

test('AI Persona: verifies sassy em-bac persona and dynamic adaptability in system prompt', () => {
  assert.equal(AI_CONFIG.systemPrompt.includes('Em bot Usagi múp rụp'), true);
  assert.equal(AI_CONFIG.systemPrompt.includes('Bác'), true);
  assert.equal(AI_CONFIG.systemPrompt.includes('XÉO SẮC'), true);
  assert.equal(AI_CONFIG.systemPrompt.includes('CỤC SÚC'), true);
  assert.equal(AI_CONFIG.systemPrompt.includes('CUTE'), true);
  assert.equal(AI_CONFIG.refusalMessage.includes('Em bot Usagi múp rụp'), true);
  assert.equal(AI_CONFIG.refusalMessage.includes('bác'), true);
});

test('AI Image Service: accurately identifies image design requests and extracts clean prompt', () => {
  // Yêu cầu vẽ ảnh
  assert.equal(isImageGenerationRequest('Vẽ cho tôi một chú mèo đang uống trà sữa'), true);
  assert.equal(isImageGenerationRequest('Tạo ảnh hoàng hôn trên bờ biển phong cách anime'), true);
  assert.equal(isImageGenerationRequest('Design ảnh một phi hành gia thỏ trong vũ trụ'), true);
  assert.equal(isImageGenerationRequest('Draw a cute cat with flowers'), true);

  // Câu hỏi thông tin / không phải yêu cầu vẽ
  assert.equal(isImageGenerationRequest('Ai đã vẽ bức tranh nàng Mona Lisa?'), false);
  assert.equal(isImageGenerationRequest('Tại sao bầu trời lại có màu xanh?'), false);

  // Trích xuất prompt
  const prompt1 = extractImagePrompt('Vẽ cho tôi một chú mèo đang uống trà sữa');
  assert.equal(prompt1, 'chú mèo đang uống trà sữa');

  const prompt2 = extractImagePrompt('Tạo ảnh hoàng hôn trên bờ biển');
  assert.equal(prompt2, 'hoàng hôn trên bờ biển');
});

test('AI History Manager: maintains session context and limits message capacity', () => {
  const channelId = '1542899821189267516';
  const userId = 'user_test_999';

  aiHistoryManager.clearHistory(channelId, userId);
  assert.deepEqual(aiHistoryManager.getHistory(channelId, userId), []);

  aiHistoryManager.addUserMessage(channelId, userId, 'Xin chào Usagi');
  aiHistoryManager.addAssistantMessage(channelId, userId, 'Dạ chào bạn nha!');

  const history = aiHistoryManager.getHistory(channelId, userId);
  assert.equal(history.length, 2);
  assert.equal(history[0].role, 'user');
  assert.equal(history[0].content, 'Xin chào Usagi');
  assert.equal(history[1].role, 'assistant');
  assert.equal(history[1].content, 'Dạ chào bạn nha!');

  aiHistoryManager.clearHistory(channelId, userId);
});

test('AI Channel Filter: ignores messages outside the configured AI channel or from bots', async () => {
  const fakeClient = {};

  // Tin nhắn từ bot -> bỏ qua
  const botMessage = {
    guild: {},
    author: { bot: true },
    channelId: '1542899821189267516',
    content: 'Hello',
  };
  assert.equal(await handleAIChatMessage(botMessage, fakeClient), false);

  // Tin nhắn từ kênh khác -> bỏ qua
  const otherChannelMessage = {
    guild: {},
    author: { bot: false },
    channelId: '1111111111111111111',
    content: 'Hello Usagi',
  };
  assert.equal(await handleAIChatMessage(otherChannelMessage, fakeClient), false);

  // Tin nhắn rỗng -> bỏ qua
  const emptyMessage = {
    guild: {},
    author: { bot: false },
    channelId: '1542899821189267516',
    content: '   ',
  };
  assert.equal(await handleAIChatMessage(emptyMessage, fakeClient), false);

  // Tin nhắn prefix command -> bỏ qua
  const commandMessage = {
    guild: {},
    author: { bot: false },
    channelId: '1542899821189267516',
    content: '!help',
  };
  assert.equal(await handleAIChatMessage(commandMessage, fakeClient), false);
});
