import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IS_COMPONENTS_V2,
  SERVICE_TOS_CHANNEL_IDS,
  buildServiceTosPayloadsV2,
  handleServiceTicketMessage,
} from '../src/services/serviceTicketService.js';

function getContainerTextLength(payload) {
  const container = payload?.components?.[0];
  if (!container || !Array.isArray(container.components)) return 0;
  return container.components
    .filter((c) => c.type === 10 && typeof c.content === 'string')
    .reduce((sum, c) => sum + c.content.length, 0);
}

test('&dichvu: buildServiceTosPayloadsV2 tạo đúng 3 card Components V2 hợp lệ và dưới giới hạn 4000 ký tự', () => {
  const payloads = buildServiceTosPayloadsV2();
  assert.equal(payloads.length, 3);

  for (const payload of payloads) {
    assert.equal(payload.flags, IS_COMPONENTS_V2);
    assert.equal(payload.components.length, 1);
    assert.equal(payload.components[0].type, 17);
    assert.ok(payload.components[0].components.length <= 10);
    assert.ok(getContainerTextLength(payload) < 4000);
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  }

  const card1Text = payloads[0].components[0].components.map((c) => c.content || '').join('\n');
  assert.ok(card1Text.includes('ĐIỀU KHOẢN DỊCH VỤ (TOS) & QUY ĐỊNH GIAO DỊCH'));
  assert.ok(card1Text.includes(`<#${SERVICE_TOS_CHANNEL_IDS.TICKET_CHANNEL_ID}>`));
  assert.ok(card1Text.includes('1. Dịch vụ Vibe Code Bot Discord theo yêu cầu'));

  const card2Text = payloads[1].components[0].components.map((c) => c.content || '').join('\n');
  assert.ok(card2Text.includes('2. Dịch vụ Mua hộ Discord Nitro & Decoration (Cozy Store)'));
  assert.ok(card2Text.includes('Quy định Mua hàng'));
  assert.ok(card2Text.includes('Chính sách Refund'));

  const card3Text = payloads[2].components[0].components.map((c) => c.content || '').join('\n');
  assert.ok(card3Text.includes('3. Dịch vụ Dạy kèm Tiếng Trung 1:1'));
  assert.ok(card3Text.includes('# III. LƯU Ý KHÁC'));
  assert.ok(card3Text.includes(`<#${SERVICE_TOS_CHANNEL_IDS.FEEDBACK_CHANNEL_ID}>`));
});

test('MessageCreate Trigger: &dichvu gửi liền 3 card Components V2 rồi mới tự động xóa tin nhắn lệnh', async () => {
  const events = [];

  const mockMessage = {
    content: '&dichvu',
    channel: {
      id: 'channel_tos_1',
      send: async (payload) => {
        events.push({ type: 'send', payload });
        return payload;
      },
    },
    delete: async () => {
      events.push({ type: 'delete' });
    },
  };

  const handled = await handleServiceTicketMessage(mockMessage);
  assert.equal(handled, true);
  assert.equal(events.length, 4);
  assert.equal(events[0].type, 'send');
  assert.equal(events[1].type, 'send');
  assert.equal(events[2].type, 'send');
  assert.equal(events[3].type, 'delete');
});

test('MessageCreate Trigger: bỏ qua tin nhắn không phải &dichvu', async () => {
  let called = false;
  const handled = await handleServiceTicketMessage({
    content: '&dichvu test',
    channel: {
      send: async () => {
        called = true;
      },
    },
    delete: async () => {
      called = true;
    },
  });

  assert.equal(handled, false);
  assert.equal(called, false);
});
