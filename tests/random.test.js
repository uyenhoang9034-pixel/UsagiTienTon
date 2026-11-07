import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRandomInput,
  getRandomInteger,
  buildNumberPayloadV2,
  buildChoicePayloadV2,
  buildGuidePayloadV2,
  handleRandomMessage,
  IS_COMPONENTS_V2,
  USAGI_COLOR,
  RANDOM_EMOJIS,
} from '../src/services/randomService.js';

test('Random Parser: nhận diện chính xác các kiểu cú pháp', () => {
  // Khoảng số có dấu gạch ngang
  const r1 = parseRandomInput('1 - 10000');
  assert.equal(r1.type, 'number');
  assert.equal(r1.min, 1);
  assert.equal(r1.max, 10000);

  const r2 = parseRandomInput('1-50');
  assert.equal(r2.type, 'number');
  assert.equal(r2.min, 1);
  assert.equal(r2.max, 50);

  // Nhập ngược: tự hoán vị
  const r3 = parseRandomInput('10000 - 1');
  assert.equal(r3.type, 'number');
  assert.equal(r3.min, 1);
  assert.equal(r3.max, 10000);

  // Số âm
  const r4 = parseRandomInput('-10 - 10');
  assert.equal(r4.type, 'number');
  assert.equal(r4.min, -10);
  assert.equal(r4.max, 10);

  // Cú pháp rút gọn: chỉ nhập 1 số
  const r5 = parseRandomInput('100');
  assert.equal(r5.type, 'number');
  assert.equal(r5.min, 1);
  assert.equal(r5.max, 100);

  // Danh sách phân cách bằng dấu gạch ngang
  const c1 = parseRandomInput('Trà sữa - Cơm tấm - Bún bò');
  assert.equal(c1.type, 'choice');
  assert.deepEqual(c1.items, ['Trà sữa', 'Cơm tấm', 'Bún bò']);

  // Danh sách phân cách bằng dấu phẩy
  const c2 = parseRandomInput('Lẩu Thái, Gà Rán, Pizza');
  assert.equal(c2.type, 'choice');
  assert.deepEqual(c2.items, ['Lẩu Thái', 'Gà Rán', 'Pizza']);

  // Danh sách phân cách bằng dấu gạch đứng
  const c3 = parseRandomInput('Có | Không');
  assert.equal(c3.type, 'choice');
  assert.deepEqual(c3.items, ['Có', 'Không']);

  // Nhập rỗng hoặc chỉ có 1 mục -> chuyển sang hướng dẫn
  assert.equal(parseRandomInput('').type, 'guide');
  assert.equal(parseRandomInput('   ').type, 'guide');
  assert.equal(parseRandomInput('Chỉ một mình').type, 'guide');
});

test('Random Engine: luôn trả về số nguyên hợp lệ, không số thập phân', () => {
  for (let i = 0; i < 100; i++) {
    const val = getRandomInteger(1, 10000);
    assert.ok(Number.isInteger(val), `Giá trị ${val} phải là số nguyên`);
    assert.ok(val >= 1 && val <= 10000, `Giá trị ${val} phải nằm trong khoảng [1, 10000]`);
    assert.ok(!String(val).includes('.'), `Giá trị ${val} không được có dấu chấm thập phân`);
    assert.ok(!String(val).includes(','), `Giá trị ${val} không được có dấu phẩy thập phân`);
  }
});

test('Giao diện V2 Random Số: tuân thủ 100% cấu trúc Discord Components V2, không title, không footer', () => {
  const userId = '1546905996893626440';
  const payload = buildNumberPayloadV2(7852, 1, 10000, userId);

  // 1. Kiểm tra Flag V2
  assert.equal(payload.flags, IS_COMPONENTS_V2);

  // 2. Kiểm tra Container
  const container = payload.components[0];
  assert.equal(container.type, 17); // Container type
  assert.equal(container.accent_color, USAGI_COLOR);

  // 3. Kiểm tra Text Display 1: Kết quả
  const text1 = container.components[0];
  assert.equal(text1.type, 10);
  assert.ok(text1.content.includes(RANDOM_EMOJIS.TITLE));
  assert.ok(text1.content.includes('**KẾT QUẢ RANDOM**'));
  assert.ok(text1.content.includes(RANDOM_EMOJIS.INDICATOR));
  assert.ok(text1.content.includes('` 7852 `'));

  // 4. Kiểm tra Separator
  const sep = container.components[1];
  assert.equal(sep.type, 14);
  assert.equal(sep.divider, true);

  // 5. Kiểm tra Text Display 2: Phạm vi & Người quay
  const text2 = container.components[2];
  assert.equal(text2.type, 10);
  assert.ok(text2.content.includes('1 - 10000'));
  assert.ok(text2.content.includes(`<@${userId}>`));
  assert.ok(text2.content.includes(`ID: ${userId}`));

  // 6. Kiểm tra Nút bấm xám (Quay lại)
  const actionRow = container.components[3];
  assert.equal(actionRow.type, 1);
  const btn = actionRow.components[0];
  assert.equal(btn.type, 2);
  assert.equal(btn.style, 2); // Secondary = xám
  assert.equal(btn.label, 'Quay lại');
  assert.deepEqual(btn.emoji, RANDOM_EMOJIS.BUTTON_DICE);
  assert.equal(btn.custom_id, `rd_reroll_num:1:10000:${userId}`);

  // 7. Tuyệt đối không có footer
  assert.equal(payload.footer, undefined);
  assert.ok(!text2.content.includes('-#'));
});

test('Giao diện V2 Random Danh sách: tuân thủ format > - và nút chọn lại', () => {
  const userId = '1546905996893626440';
  const items = ['Trà Sữa', 'Cơm Tấm', 'Bún Bò'];
  const payload = buildChoicePayloadV2('Trà Sữa', items, userId, 'test_sid');

  assert.equal(payload.flags, IS_COMPONENTS_V2);

  const container = payload.components[0];
  assert.equal(container.type, 17);

  const text1 = container.components[0];
  assert.ok(text1.content.includes(RANDOM_EMOJIS.TITLE));
  assert.ok(text1.content.includes('**VẬN MAY ĐÃ MỈM CƯỜI VỚI**'));
  assert.ok(text1.content.includes(RANDOM_EMOJIS.INDICATOR));
  assert.ok(text1.content.includes('` Trà Sữa `'));

  const text2 = container.components[2];
  assert.ok(text2.content.includes('Danh sách tham gia (3 mục):'));
  assert.ok(text2.content.includes('> - Trà Sữa'));
  assert.ok(text2.content.includes('> - Cơm Tấm'));
  assert.ok(text2.content.includes('> - Bún Bò'));
  assert.ok(text2.content.includes(`<@${userId}>`));
  assert.ok(text2.content.includes(`ID: ${userId}`));

  const actionRow = container.components[3];
  const btn = actionRow.components[0];
  assert.equal(btn.type, 2);
  assert.equal(btn.style, 2); // Xám
  assert.equal(btn.label, 'Chọn lại');
  assert.deepEqual(btn.emoji, RANDOM_EMOJIS.BUTTON_DICE);
  assert.equal(btn.custom_id, 'rd_reroll_choice:test_sid');
});

test('Giao diện V2 Hướng dẫn: hiển thị chuẩn khi cú pháp chưa chính xác, không footer', () => {
  const payload = buildGuidePayloadV2();
  assert.equal(payload.flags, IS_COMPONENTS_V2);

  const container = payload.components[0];
  assert.equal(container.type, 17);

  const text1 = container.components[0];
  assert.ok(text1.content.includes(RANDOM_EMOJIS.WARNING));
  assert.ok(text1.content.includes('**Cú pháp chưa chính xác!**'));
  assert.ok(text1.content.includes(RANDOM_EMOJIS.INDICATOR));
  assert.ok(text1.content.includes('**Gợi ý cú pháp siêu nhanh từ Usagi:**'));
  assert.ok(text1.content.includes('> - `&random <số> - <số>`'));

  // Đảm bảo không chứa từ vợ trong error payload
  assert.ok(!text1.content.toLowerCase().includes('vợ'));
});

test('MessageCreate Trigger: nhận diện &random và &rd', async () => {
  let repliedPayload = null;
  const mockMessage = {
    content: '&random 1 - 10000',
    author: { id: '999888777' },
    reply: async (p) => {
      repliedPayload = p;
      return p;
    },
  };

  const handled = await handleRandomMessage(mockMessage, {});
  assert.equal(handled, true);
  assert.ok(repliedPayload);
  assert.equal(repliedPayload.flags, IS_COMPONENTS_V2);

  // Tin nhắn không liên quan -> false
  const notHandled = await handleRandomMessage({ content: 'Hello Usagi', author: { id: '1' } }, {});
  assert.equal(notHandled, false);
});
