import { christmasAudio, CHRISTMAS_SONGS } from './audio.js?v=20261126r';

const STATE = {
  token: 'demo',
  guildId: 'global',
  guestId: null,
  partySize: 1,
  activeTab: 'workshop',
  panelCollapsed: false,
  data: null,
  scene: null,
  combo: 0,
  lastTapTime: 0,
  feverProgress: 0,
  feverActive: false,
  feverHits: 0,
  wheelAngle: 0,
  wheelSpinning: false,
};

function getOrCreateGuestId() {
  let id = localStorage.getItem('santa_guest_id');
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('santa_guest_id', id);
  }
  return id;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 3200);
}

async function apiRequest(path, method = 'GET', body = null) {
  try {
    const headers = {
      Authorization: `Bearer ${STATE.token}`,
      'x-guild-id': STATE.guildId,
      'x-guest-id': STATE.guestId,
      'x-party-size': String(STATE.partySize || 1),
    };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    console.error('API error:', path, err);
    return { ok: false, message: 'Không kết nối được máy chủ (/api). Kiểm tra URL Mapping /api trên Discord Portal!' };
  }
}

async function initDiscordActivitySdk() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('frame_id')) return;

  let step = 'config';
  try {
    const cfgRes = await fetch('/api/santa/config');
    const cfg = await cfgRes.json();
    if (!cfg?.clientId) {
      showToast('⚠️ Thiếu CLIENT_ID trên server');
      return;
    }

    step = 'sdk';
    const { DiscordSDK } = await import('./vendor/discord-sdk.mjs?v=20261126a');
    const discordSdk = new DiscordSDK(cfg.clientId);
    await discordSdk.ready();

    if (discordSdk.guildId) STATE.guildId = discordSdk.guildId;

    step = 'authorize';
    const { code } = await discordSdk.commands.authorize({
      client_id: cfg.clientId,
      response_type: 'code',
      state: '',
      scope: ['identify'],
    });

    step = 'token';
    const tokenRes = await fetch('/api/santa/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData?.access_token) {
      step = 'authenticate';
      await discordSdk.commands.authenticate({ access_token: tokenData.access_token });
      STATE.token = tokenData.access_token;
      try {
        const parts = await discordSdk.commands.getInstanceConnectedParticipants();
        if (Array.isArray(parts?.participants) && parts.participants.length > 0) {
          STATE.partySize = parts.participants.length;
        }
        discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (evt) => {
          if (Array.isArray(evt?.participants) && evt.participants.length > 0) {
            STATE.partySize = evt.participants.length;
            refreshState();
          }
        });
      } catch {}
    } else {
      showToast(`⚠️ Lỗi token: ${tokenData?.error || 'Không rõ'}`);
    }
  } catch (err) {
    console.warn('Discord SDK fallback to browser mode:', step, err);
    showToast(`⚠️ Lỗi xác thực (${step}): ${err?.message || err}`);
  }
}

/* ---------------- PHASER 3 SCENE ---------------- */
class SantaWorkshopScene extends Phaser.Scene {
  constructor() {
    super('SantaWorkshopScene');
  }

  create() {
    STATE.scene = this;
    this.snowflakes = [];
    this.lightBulbs = [];
    this.helperSprites = [];
    this.petSprite = null;
    this.grinchContainer = null;

    this.drawBackground();
    this.createSnowParticles();
    this.createSantaSleighFlight();
    this.createElfCharacter();
    this.syncVisualCosmetics();
    this.scheduleGrinchEvent();

    this.input.on('pointerdown', (pointer) => {
      christmasAudio.startMusic();
      if (STATE.feverActive) return;

      this.playElfTapEffect(pointer.x, pointer.y);
      triggerTapCollect(pointer.x, pointer.y);
    });

    this.scale.on('resize', () => {
      this.redrawLayout();
    });
  }

  drawBackground() {
    if (this.bgGroup) this.bgGroup.destroy(true);
    this.bgGroup = this.add.group();
    this.lightBulbs = [];
    this.lastTreeLevel = STATE.data?.serverTree?.level || 0;

    const w = this.scale.width;
    const h = this.scale.height;
    const floorY = h * 0.64;
    const treeLevel = STATE.data?.serverTree?.level || 0;

    const g = this.add.graphics();
    g.fillGradientStyle(0x071224, 0x071224, 0x1a335c, 0x143d4d, 1);
    g.fillRect(0, 0, w, h);

    // Trăng tròn
    g.fillStyle(0xfff3b0, 0.92);
    g.fillCircle(w * 0.84, h * 0.16, Math.max(16, Math.min(w, h) * 0.065));

    // Tường & sàn gỗ xưởng
    g.fillStyle(0x3b2314, 0.92);
    g.fillRect(0, floorY - 70, w, 70);
    g.fillStyle(0x5c3a21, 1);
    g.fillRect(0, floorY, w, h - floorY);
    g.fillStyle(0x7f4f24, 1);
    g.fillRect(0, floorY, w, 10);

    // Lò sưởi bập bùng bên phải
    const fpX = w * 0.8;
    g.fillStyle(0x6c3d28, 1);
    g.fillRoundedRect(fpX - 42, floorY - 82, 84, 82, 6);
    g.fillStyle(0x1b120e, 1);
    g.fillRoundedRect(fpX - 28, floorY - 54, 56, 54, 6);
    g.fillStyle(0xe63946, 1);
    g.fillRoundedRect(fpX - 24, floorY - 78, 12, 18, 3);
    g.fillStyle(0x2a9d8f, 1);
    g.fillRoundedRect(fpX + 10, floorY - 78, 12, 18, 3);

    this.fireGfx = this.add.graphics();
    this.bgGroup.add(this.fireGfx);

    // Băng chuyền đồ chơi
    const beltX = w * 0.56;
    g.fillStyle(0x2b2d42, 1);
    g.fillRoundedRect(beltX - 65, floorY - 18, 130, 18, 6);
    g.fillStyle(0x8d99ae, 1);
    for (let i = -50; i <= 50; i += 25) {
      g.fillCircle(beltX + i, floorY - 9, 5);
    }

    // Cây Thông Chung Server bên trái (thay đổi theo treeLevel 0..4)
    const treeX = w * 0.16;
    if (treeLevel >= 4) {
      g.fillStyle(0xffd166, 0.15);
      g.fillCircle(treeX, floorY - 95, 72);
    }
    g.fillStyle(0x4a2c18, 1);
    g.fillRect(treeX - 8, floorY - 26, 16, 26);
    g.fillStyle(0x1b4332, 1);
    g.fillTriangle(treeX, floorY - 130, treeX - 48, floorY - 24, treeX + 48, floorY - 24);
    g.fillStyle(0x2d6a4f, 1);
    g.fillTriangle(treeX, floorY - 165, treeX - 36, floorY - 76, treeX + 36, floorY - 76);

    // Lv.1+: Đèn trên cây
    if (treeLevel >= 1) {
      g.fillStyle(0xffd166, 0.95);
      [-18, 0, 18].forEach((dx, i) => g.fillCircle(treeX + dx, floorY - 45 - i * 16, 4));
    }
    // Lv.2+: Quả châu đỏ & xanh
    if (treeLevel >= 2) {
      g.fillStyle(0xe63946, 1);
      g.fillCircle(treeX - 20, floorY - 40, 5);
      g.fillCircle(treeX + 14, floorY - 65, 5);
      g.fillStyle(0x90e0ef, 1);
      g.fillCircle(treeX + 20, floorY - 38, 5);
      g.fillCircle(treeX - 10, floorY - 92, 5);
    }
    // Lv.3+: Ngôi sao đỉnh cây lớn tỏa sáng
    g.fillStyle(0xffd166, 1);
    g.fillCircle(treeX, floorY - 169, treeLevel >= 3 ? 11 : 7);

    // Dây đèn LED nhấp nháy
    const bulbColors = [0xe63946, 0xffd166, 0x2a9d8f, 0x90e0ef];
    const bulbCount = Math.max(8, Math.floor(w / 48));
    g.lineStyle(2, 0x334155, 0.9);
    g.beginPath();
    g.moveTo(0, 18);
    for (let i = 0; i <= bulbCount; i += 1) {
      const bx = (w / bulbCount) * i;
      const by = 18 + Math.sin(i * 0.9) * 10;
      g.lineTo(bx, by);
      const bulb = this.add.circle(bx, by + 5, 4.5, bulbColors[i % bulbColors.length], 0.95);
      this.lightBulbs.push(bulb);
      this.bgGroup.add(bulb);
    }
    g.strokePath();
    this.bgGroup.add(g);
    this.bgGroup.setDepth(0);
  }

  createSnowParticles() {
    const w = this.scale.width;
    const h = this.scale.height;
    for (let i = 0; i < 48; i += 1) {
      const radius = Phaser.Math.FloatBetween(1, 3.2);
      const flake = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        radius,
        0xffffff,
        Phaser.Math.FloatBetween(0.4, 0.88),
      );
      flake.speedY = Phaser.Math.FloatBetween(0.45, 1.5);
      flake.driftX = Phaser.Math.FloatBetween(-0.25, 0.25);
      this.snowflakes.push(flake);
    }
  }

  createSantaSleighFlight() {
    this.santaFlight = this.add.text(-120, this.scale.height * 0.16, '🦌🦌🛷🎅', {
      fontSize: '26px',
    });
    this.time.addEvent({
      delay: 14000,
      loop: true,
      callback: () => {
        if (!this.santaFlight) return;
        this.santaFlight.setPosition(-120, this.scale.height * Phaser.Math.FloatBetween(0.1, 0.25));
        this.tweens.add({
          targets: this.santaFlight,
          x: this.scale.width + 120,
          duration: 5200,
          ease: 'Linear',
        });
      },
    });
  }

  createElfCharacter() {
    if (this.elf) this.elf.destroy();
    const w = this.scale.width;
    const h = this.scale.height;
    const isNarrow = w < 500;
    const skin = STATE.data?.player?.equippedSkin || 'skin_classic';

    this.elf = this.add.container(w * (isNarrow ? 0.36 : 0.42), h * 0.5).setDepth(5);
    this.lastElfSkin = skin;
    const g = this.add.graphics();

    // Cánh tiên băng giá hoặc Cánh Thiên Thần lớn
    if (skin === 'skin_fairy') {
      g.fillStyle(0x72efdd, 0.55);
      g.fillEllipse(-30, -4, 34, 24);
      g.fillEllipse(30, -4, 34, 24);
      g.fillEllipse(-24, 18, 26, 20);
      g.fillEllipse(24, 18, 26, 20);
      g.lineStyle(2, 0xffffff, 0.85);
      g.strokeEllipse(-30, -4, 34, 24);
      g.strokeEllipse(30, -4, 34, 24);
    } else if (skin === 'skin_angel') {
      g.fillStyle(0xffffff, 0.88);
      g.fillEllipse(-34, 2, 40, 26);
      g.fillEllipse(34, 2, 40, 26);
      g.fillEllipse(-26, 20, 28, 18);
      g.fillEllipse(26, 20, 28, 18);
      g.lineStyle(2, 0xffd166, 0.8);
      g.strokeEllipse(-34, 2, 40, 26);
      g.strokeEllipse(34, 2, 40, 26);
    }

    // Giày nhỏ
    g.fillStyle(0x2b2d42, 1);
    g.fillRoundedRect(-16, 42, 12, 8, 4);
    g.fillRoundedRect(4, 42, 12, 8, 4);

    // Hào quang vàng nếu đeo skin_golden
    if (skin === 'skin_golden') {
      g.fillStyle(0xffd166, 0.28);
      g.fillCircle(0, 0, 48);
    }

    // Thân áo theo skin
    const coatColor =
      skin === 'skin_santa'
        ? 0xd90429
        : skin === 'skin_fairy'
          ? 0x00b4d8
          : skin === 'skin_knight'
            ? 0x3a5a98
            : skin === 'skin_ginger'
              ? 0xb07d4f
              : skin === 'skin_golden'
                ? 0xffb703
                : skin === 'skin_reindeer_suit'
                  ? 0x8d5524
                  : skin === 'skin_wizard'
                    ? 0x3c096c
                    : skin === 'skin_angel'
                      ? 0xf8f9fa
                      : 0x2a9d8f;
    g.fillStyle(coatColor, 1);
    g.fillRoundedRect(-22, 0, 44, 44, 10);

    if (skin === 'skin_santa') {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-5, 0, 10, 44);
      g.fillRoundedRect(-24, 36, 48, 8, 4);
    } else if (skin === 'skin_ginger') {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-23, 35, 46, 7, 3);
      g.fillStyle(0xe63946, 1);
      g.fillCircle(0, 10, 4);
      g.fillStyle(0x2ecc71, 1);
      g.fillCircle(0, 31, 4);
    } else if (skin === 'skin_knight') {
      g.fillStyle(0x90e0ef, 1);
      g.fillRoundedRect(-12, 4, 24, 18, 4);
      g.fillStyle(0x48cae4, 1);
      g.fillRoundedRect(-36, 6, 14, 24, 5);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(-36, 6, 14, 24, 5);
    } else if (skin === 'skin_golden') {
      g.fillStyle(0xfff3b0, 1);
      g.fillRoundedRect(-12, 4, 24, 16, 4);
    } else if (skin === 'skin_reindeer_suit') {
      g.fillStyle(0xf1c27d, 1);
      g.fillEllipse(0, 20, 22, 26);
    } else if (skin === 'skin_wizard') {
      g.fillStyle(0xffd166, 1);
      g.fillCircle(-8, 12, 3);
      g.fillCircle(9, 30, 3);
    } else if (skin === 'skin_angel') {
      g.fillStyle(0xffd166, 1);
      g.fillRect(-4, 0, 8, 44);
    }
    g.fillStyle(0xffd166, 1);
    g.fillRect(-22, 22, 44, 6);

    // Tay trái & tay phải cầm vũ khí/phụ kiện theo skin
    g.fillStyle(coatColor, 1);
    g.fillRoundedRect(-31, 6, 11, 22, 5);
    g.fillRoundedRect(20, 6, 11, 22, 5);
    g.fillStyle(0xffd6ba, 1);
    g.fillCircle(-26, 28, 5);
    g.fillCircle(26, 28, 5);
    if (skin === 'skin_wizard' || skin === 'skin_angel') {
      g.fillStyle(0x9c6644, 1);
      g.fillRect(25, -4, 4, 34);
      g.fillStyle(skin === 'skin_wizard' ? 0x00bbf9 : 0xffd166, 1);
      g.fillCircle(27, -7, 7);
    } else {
      g.fillStyle(0x9c6644, 1);
      g.fillRect(25, 4, 4, 24);
      g.fillStyle(skin === 'skin_golden' ? 0xffd166 : 0xadb5bd, 1);
      g.fillRoundedRect(19, -2, 16, 9, 3);
    }

    // Tai nhọn Yêu Tinh 2 bên
    g.fillStyle(0xffcdb2, 1);
    g.fillTriangle(-20, -18, -34, -24, -18, -8);
    g.fillTriangle(20, -18, 34, -24, 18, -8);

    // Mặt, mắt, má hồng & nụ cười
    g.fillStyle(0xffd6ba, 1);
    g.fillCircle(0, -16, 20);
    g.fillStyle(0x1d1d1d, 1);
    g.fillCircle(-7, -19, 3);
    g.fillCircle(7, -19, 3);
    g.fillStyle(0xff758f, 0.65);
    g.fillCircle(-12, -13, 4);
    g.fillCircle(12, -13, 4);
    if (skin === 'skin_reindeer_suit') {
      g.fillStyle(0xe63946, 1);
      g.fillCircle(0, -14, 5);
    }
    g.lineStyle(2, 0x9e2a2b, 1);
    g.beginPath();
    g.arc(0, -10, 6, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // Mũ / Sừng / Hào quang theo skin
    if (skin === 'skin_reindeer_suit') {
      g.lineStyle(4, 0x6f4e37, 1);
      g.beginPath();
      g.moveTo(-10, -32);
      g.lineTo(-18, -54);
      g.moveTo(-14, -44);
      g.lineTo(-6, -50);
      g.moveTo(10, -32);
      g.lineTo(18, -54);
      g.moveTo(14, -44);
      g.lineTo(6, -50);
      g.strokePath();
    } else if (skin === 'skin_wizard') {
      g.fillStyle(0x5a189a, 1);
      g.fillTriangle(0, -64, -24, -26, 24, -26);
      g.fillRoundedRect(-28, -28, 56, 6, 3);
      g.fillStyle(0xffd166, 1);
      g.fillCircle(0, -42, 4);
    } else if (skin === 'skin_angel') {
      g.lineStyle(3, 0xffd166, 1);
      g.strokeEllipse(0, -46, 34, 10);
    } else {
      g.fillStyle(0xe63946, 1);
      g.fillTriangle(0, -56, -22, -26, 22, -26);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-24, -30, 48, 9, 4);
      g.fillCircle(0, -58, 6);
    }
    this.elf.add(g);

    const textRes = Math.min(2, window.devicePixelRatio || 1);
    const hint = this.add
      .text(0, isNarrow ? 74 : 66, isNarrow ? 'Chạm Xưởng gõ búa!' : 'Chạm vào Xưởng để gõ búa & tích Fever!', {
        fontSize: isNarrow ? '11px' : '12px',
        color: '#ffd166',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 8, y: 4 },
        resolution: textRes,
      })
      .setOrigin(0.5);
    this.elf.add(hint);

    this.tweens.add({
      targets: this.elf,
      y: this.elf.y - 6,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Hiệu ứng hạt phát sáng thật sự quanh Yêu Tinh theo từng trang phục đặc biệt
    if (this.elfAuraTimer) {
      this.elfAuraTimer.remove(false);
      this.elfAuraTimer = null;
    }
    const auraMap = {
      skin_fairy: '❄️',
      skin_golden: '✨',
      skin_wizard: '🪄',
      skin_angel: '⭐',
      skin_reindeer_suit: '🔴',
    };
    const auraChar = auraMap[skin];
    if (auraChar) {
      this.elfAuraTimer = this.time.addEvent({
        delay: 480,
        loop: true,
        callback: () => {
          if (!this.elf || !this.elf.active) return;
          const ox = this.elf.x + Phaser.Math.Between(-34, 34);
          const oy = this.elf.y + Phaser.Math.Between(-24, 30);
          const p = this.add.text(ox, oy, auraChar, { fontSize: '12px' }).setOrigin(0.5).setDepth(7);
          this.tweens.add({
            targets: p,
            y: oy - 26,
            alpha: 0,
            duration: 900,
            onComplete: () => p.destroy(),
          });
        },
      });
    }
  }

  syncVisualCosmetics(force = false) {
    const skin = STATE.data?.player?.equippedSkin || 'skin_classic';
    const petId = STATE.data?.player?.equippedPet || null;
    const helpersKey = JSON.stringify(STATE.data?.player?.helpers || {});

    if (force || !this.elf || this.lastElfSkin !== skin) {
      this.createElfCharacter();
    }

    if (force || this.lastHelpersKey !== helpersKey) {
      this.lastHelpersKey = helpersKey;
      for (const spr of this.helperSprites) spr.destroy();
      this.helperSprites = [];
      const helpers = STATE.data?.player?.helpers || {};
      const w = this.scale.width;
      const floorY = this.scale.height * 0.64;
      const isNarrow = w < 500;
      const textRes = Math.min(2, window.devicePixelRatio || 1);
      const spots = isNarrow
        ? [
            { key: 'lumberjack', icon: '🪓', xRatio: 0.14, yOffset: -24 },
            { key: 'tailor', icon: '✂️', xRatio: 0.62, yOffset: -30 },
            { key: 'mage', icon: '🌟', xRatio: 0.85, yOffset: 16 },
          ]
        : [
            { key: 'lumberjack', icon: '🪓🧝', xRatio: 0.22, yOffset: -26 },
            { key: 'tailor', icon: '✂️🧝', xRatio: 0.57, yOffset: -26 },
            { key: 'mage', icon: '🌟🧝', xRatio: 0.74, yOffset: -26 },
          ];
      for (const s of spots) {
        const lv = helpers[s.key] || 0;
        if (lv > 0) {
          const label = isNarrow ? `${s.icon}${lv}` : `${s.icon} Lv.${lv}`;
          const txt = this.add
            .text(w * s.xRatio, floorY + s.yOffset, label, {
              fontSize: isNarrow ? '12px' : '13px',
              backgroundColor: 'rgba(0,0,0,0.52)',
              padding: { x: 5, y: 2 },
              resolution: textRes,
            })
            .setOrigin(0.5)
            .setDepth(5);
          this.tweens.add({ targets: txt, y: txt.y - 4, duration: 700, yoyo: true, repeat: -1 });
          this.helperSprites.push(txt);
        }
      }
    }

    const petLv = STATE.data?.player?.petLevels?.[petId] || 1;
    const petStateKey = `${petId || 'none'}:${petLv}`;
    if (force || this.lastPetId !== petStateKey) {
      this.lastPetId = petStateKey;
      if (this.petSprite) {
        this.petSprite.destroy();
        this.petSprite = null;
      }
      if (petId) {
        const floorY = this.scale.height * 0.64;
        const shopPet = (STATE.data?.shopItems || []).find((i) => i.id === petId);
        const petIcon =
          shopPet?.icon ||
          (petId === 'pet_reindeer'
            ? '🦌'
            : petId === 'pet_penguin'
              ? '🐧'
              : petId === 'pet_snowman'
                ? '⛄'
                : petId === 'pet_fox'
                  ? '🦊'
                  : '🐰');
        const textRes = Math.min(2, window.devicePixelRatio || 1);
        const fontSize = `${24 + (petLv - 1) * 3}px`;
        const label = petLv > 1 ? `${petIcon}✨` : petIcon;
        this.petSprite = this.add
          .text(this.scale.width * 0.24, floorY + 12, label, {
            fontSize,
            resolution: textRes,
            shadow: petLv >= 3 ? { offsetX: 0, offsetY: 0, color: '#ffd166', blur: 10, fill: true } : undefined,
          })
          .setOrigin(0.5)
          .setDepth(6);
        const runDurationMap = {
          pet_dragon: 1300,
          pet_husky: 1800,
          pet_fox: 2300,
          pet_snowman: 2800,
          pet_reindeer: 3200,
          pet_penguin: 3400,
          pet_usagi: 4000,
        };
        const runDuration = Math.max(850, (runDurationMap[petId] || 3800) - (petLv - 1) * 180);
        this.tweens.add({
          targets: this.petSprite,
          x: this.scale.width * 0.6,
          duration: runDuration,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  scheduleGrinchEvent() {
    this.time.addEvent({
      delay: 42000,
      loop: true,
      callback: () => {
        if (!STATE.feverActive && !this.grinchContainer) {
          this.spawnGrinch();
        }
      },
    });
  }

  spawnGrinch() {
    const w = this.scale.width;
    const floorY = this.scale.height * 0.64;
    let hitsNeeded = 8;

    const gx = Phaser.Math.Between(Math.floor(w * 0.55), Math.floor(w * 0.85));
    const textRes = Math.min(2, window.devicePixelRatio || 1);
    this.grinchContainer = this.add.container(gx, floorY - 56).setDepth(15);
    const body = this.add.text(0, 0, '👺', { fontSize: '42px', resolution: textRes }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, -34, `Đuổi Grinch! (${hitsNeeded})`, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff',
        backgroundColor: '#d90429',
        padding: { x: 6, y: 3 },
        resolution: textRes,
      })
      .setOrigin(0.5);

    this.grinchContainer.add([body, label]);
    showToast('👺 Grinch đang lén trộm quà! Chạm liên tục 8 lần để đuổi đi!');

    const expireTimer = this.time.delayedCall(10000, () => {
      if (this.grinchContainer) {
        this.grinchContainer.destroy();
        this.grinchContainer = null;
        showToast('👺 Grinch chạy thoát mất rồi!');
      }
    });

    body.on('pointerdown', async (pointer) => {
      pointer.event?.stopPropagation?.();
      hitsNeeded -= 1;
      christmasAudio.playTapSfx(10 - hitsNeeded);
      this.tweens.add({ targets: body, scale: 1.25, duration: 70, yoyo: true });

      if (hitsNeeded <= 0) {
        expireTimer.remove(false);
        this.grinchContainer.destroy();
        this.grinchContainer = null;
        christmasAudio.playJackpotSfx();
        await runAction('/api/santa/grinch-repel');
      } else {
        label.setText(`Đuổi Grinch! (${hitsNeeded})`);
      }
    });
  }

  playConveyorCraftEffect(icon = '🎁') {
    const floorY = this.scale.height * 0.64;
    const startX = this.scale.width * 0.45;
    const endX = this.scale.width * 0.68;
    const item = this.add.text(startX, floorY - 30, icon, { fontSize: '26px' }).setOrigin(0.5);
    this.tweens.add({
      targets: item,
      x: endX,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.playElfTapEffect(endX, floorY - 40, '✨ Đóng gói xong!');
        item.destroy();
      },
    });
  }

  startFeverRain() {
    if (STATE.feverActive) return;
    STATE.feverActive = true;
    STATE.feverHits = 0;

    // Cứ mỗi 10 cơn mưa có 1 cơn mưa Giỏ Hứng Quà (lần thứ 10, 20, 30...)
    const currentFeverIndex = (STATE.data?.player?.feverCount || 0) + 1;
    const isBasketMode = currentFeverIndex % 10 === 0;

    showToast(
      isBasketMode
        ? '🧺 CƠN MƯA GIỎ HỨNG QUÀ ĐẶC BIỆT! Di chuyển giỏ hứng quà rơi!'
        : '🔥 MƯA QUÀ FEVER! Chạm vào các hộp quà to để hốt Xu Tuyết!',
    );

    const w = this.scale.width;
    const h = this.scale.height;
    const giftIcons = ['🎁', '🍬', '❄️', '🎀'];
    const activeGifts = [];
    let basket = null;
    let pointerMoveHandler = null;

    if (isBasketMode) {
      basket = this.add.text(w * 0.5, h - 38, '🧺', { fontSize: '46px' }).setOrigin(0.5).setDepth(21);
      pointerMoveHandler = (pointer) => {
        if (basket) {
          basket.x = Phaser.Math.Clamp(pointer.x, 30, this.scale.width - 30);
        }
      };
      this.input.on('pointermove', pointerMoveHandler);
    }

    const spawnEvent = this.time.addEvent({
      delay: 420,
      repeat: 30,
      callback: () => {
        const icon = giftIcons[Math.floor(Math.random() * giftIcons.length)];
        const x = Phaser.Math.Between(38, Math.max(80, this.scale.width - 38));
        // Quà to 48px ở chế độ click thường, giữ nguyên 28px ở chế độ Giỏ hứng quà
        const fontSize = isBasketMode ? '28px' : '48px';
        const gift = this.add
          .text(x, -24, icon, { fontSize, padding: isBasketMode ? undefined : { x: 8, y: 8 } })
          .setOrigin(0.5)
          .setDepth(20);

        activeGifts.push(gift);

        if (!isBasketMode) {
          gift.setInteractive({ useHandCursor: true });
          gift.on('pointerdown', () => {
            if (!gift.active) return;
            STATE.feverHits += 1;
            christmasAudio.playCoinSfx();
            this.playElfTapEffect(gift.x, gift.y, '+3 ❄️');
            gift.destroy();
          });
        }

        this.tweens.add({
          targets: gift,
          y: this.scale.height + 30,
          duration: 2900,
          onUpdate: () => {
            if (isBasketMode && basket && gift.active) {
              const dx = Math.abs(gift.x - basket.x);
              const dy = Math.abs(gift.y - basket.y);
              if (dx < 36 && dy < 30) {
                STATE.feverHits += 1;
                christmasAudio.playCoinSfx();
                this.playElfTapEffect(basket.x, basket.y - 24, '+3 ❄️');
                gift.destroy();
              }
            }
          },
          onComplete: () => gift.destroy(),
        });
      },
    });

    // Thú cưng tự động nhặt hộ quà rơi trong lúc Fever!
    let petTimer = null;
    const petId = STATE.data?.player?.equippedPet;
    if (petId) {
      const petLv = STATE.data?.player?.petLevels?.[petId] || 1;
      const baseInterval =
        petId === 'pet_dragon'
          ? 380
          : petId === 'pet_husky'
            ? 550
            : petId === 'pet_fox'
              ? 750
              : petId === 'pet_snowman'
                ? 950
                : petId === 'pet_reindeer'
                  ? 1150
                  : petId === 'pet_penguin'
                    ? 1250
                    : 1500;
      const petInterval = Math.max(250, baseInterval - (petLv - 1) * 50);
      const petEmoji =
        petId === 'pet_dragon'
          ? '🐲'
          : petId === 'pet_husky'
            ? '🐺'
            : petId === 'pet_fox'
              ? '🦊'
              : petId === 'pet_reindeer'
                ? '🦌'
                : petId === 'pet_snowman'
                  ? '⛄'
                  : petId === 'pet_penguin'
                    ? '🐧'
                    : '🐰';
      petTimer = this.time.addEvent({
        delay: petInterval,
        loop: true,
        callback: () => {
          const target = activeGifts.find((g) => g && g.active && g.y > 20 && g.y < this.scale.height - 40);
          if (target) {
            STATE.feverHits += 1;
            christmasAudio.playCoinSfx();
            this.playElfTapEffect(target.x, target.y, `${petEmoji} +3 ❄️`);
            target.destroy();
          }
        },
      });
    }

    this.time.delayedCall(14500, async () => {
      spawnEvent.remove(false);
      if (petTimer) petTimer.remove(false);
      if (pointerMoveHandler) this.input.off('pointermove', pointerMoveHandler);
      if (basket) basket.destroy();
      STATE.feverActive = false;
      STATE.feverProgress = 0;
      updateFeverHud();
      await runAction('/api/santa/fever-claim', { hits: Math.max(3, STATE.feverHits) });
    });
  }

  redrawLayout() {
    this.drawBackground();
    this.syncVisualCosmetics(true);
  }

  playElfTapEffect(x, y, label = '✨') {
    if (this.elf) {
      this.tweens.add({
        targets: this.elf,
        scaleX: 1.14,
        scaleY: 0.88,
        duration: 85,
        yoyo: true,
      });
    }
    const txt = this.add
      .text(x, y, label, {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffd166',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 48,
      alpha: 0,
      duration: 750,
      onComplete: () => txt.destroy(),
    });
  }

  update(time) {
    const w = this.scale.width;
    const h = this.scale.height;

    for (const flake of this.snowflakes) {
      flake.y += flake.speedY;
      flake.x += flake.driftX;
      if (flake.y > h) {
        flake.y = -4;
        flake.x = Phaser.Math.Between(0, w);
      }
    }

    for (let i = 0; i < this.lightBulbs.length; i += 1) {
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(time * 0.004 + i));
      this.lightBulbs[i].setAlpha(pulse);
    }

    if (this.fireGfx) {
      const floorY = h * 0.64;
      const fpX = w * 0.8;
      const flicker = Math.sin(time * 0.015) * 4;
      this.fireGfx.clear();
      this.fireGfx.fillStyle(0xf77f00, 0.9);
      this.fireGfx.fillTriangle(fpX - 16, floorY - 4, fpX + 16, floorY - 4, fpX + flicker * 0.5, floorY - 36 - flicker);
      this.fireGfx.fillStyle(0xfcbf49, 0.95);
      this.fireGfx.fillTriangle(fpX - 9, floorY - 4, fpX + 9, floorY - 4, fpX, floorY - 24 - flicker * 0.6);
    }
  }
}

function bootPhaser() {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-root',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: false,
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [SantaWorkshopScene],
  });
}

/* ---------------- FEVER, COMBO & WHEEL CANVAS ---------------- */
function updateFeverHud() {
  const fill = document.getElementById('fever-fill');
  const badge = document.getElementById('combo-badge');
  if (fill) fill.style.width = `${Math.min(100, STATE.feverProgress)}%`;
  if (badge) {
    if (STATE.combo > 1) {
      badge.textContent = `Combo x${STATE.combo}`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function drawWheelCanvas() {
  const canvas = document.getElementById('wheel-canvas');
  const segments = STATE.data?.wheelSegments || [];
  if (!canvas || segments.length === 0) return;

  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 8;
  const arc = (Math.PI * 2) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < segments.length; i += 1) {
    const start = STATE.wheelAngle + i * arc - Math.PI / 2;
    const end = start + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = segments[i].color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.fillText(segments[i].label, r - 14, 4);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.fillStyle = '#1b2a4a';
  ctx.font = 'bold 14px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('🎄', cx, cy + 5);
}

async function spinLuckyWheel() {
  if (STATE.wheelSpinning) return;
  const segments = STATE.data?.wheelSegments || [];
  if (segments.length === 0) return;

  STATE.wheelSpinning = true;
  document.getElementById('btn-spin-now').disabled = true;
  document.getElementById('wheel-result').textContent = 'Đang quay số... 🎶';

  const res = await apiRequest('/api/santa/wheel', 'POST', {});
  if (!res?.ok) {
    STATE.wheelSpinning = false;
    document.getElementById('btn-spin-now').disabled = false;
    document.getElementById('wheel-result').textContent = res?.message || 'Không thể quay!';
    return;
  }

  const targetIdx = res.wheelIndex ?? 0;
  const arc = (Math.PI * 2) / segments.length;
  const targetStopAngle = -(targetIdx * arc + arc / 2);
  const startAngle = STATE.wheelAngle % (Math.PI * 2);
  const finalAngle = Math.PI * 10 + targetStopAngle;
  const duration = 3400;
  const startTime = performance.now();
  let lastTickSlice = -1;

  function animate(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    STATE.wheelAngle = startAngle + (finalAngle - startAngle) * eased;
    drawWheelCanvas();

    const currentSlice = Math.floor((STATE.wheelAngle / arc) % segments.length);
    if (currentSlice !== lastTickSlice) {
      lastTickSlice = currentSlice;
      christmasAudio.playWheelTickSfx();
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      STATE.wheelSpinning = false;
      document.getElementById('btn-spin-now').disabled = false;
      christmasAudio.playJackpotSfx();
      document.getElementById('wheel-result').textContent = res.message;
      if (res.state) {
        STATE.data = res.state;
        renderAll();
      }
    }
  }
  requestAnimationFrame(animate);
}

/* ---------------- GAME ACTIONS & RENDERING ---------------- */
async function refreshState() {
  const res = await apiRequest('/api/santa/state');
  if (res?.ok && res.state) {
    STATE.data = res.state;
    renderAll();
    if (STATE.scene) {
      const treeLv = res.state?.serverTree?.level || 0;
      if (STATE.scene.lastTreeLevel !== treeLv) {
        STATE.scene.drawBackground();
      }
      STATE.scene.syncVisualCosmetics(false);
    }
  }
}

async function runAction(path, body = {}, tapCoords = null) {
  const res = await apiRequest(path, 'POST', body);
  if (res?.state) {
    STATE.data = res.state;
    renderAll();
    if (STATE.scene) {
      const treeLv = res.state?.serverTree?.level || 0;
      if (STATE.scene.lastTreeLevel !== treeLv) {
        STATE.scene.drawBackground();
      }
      STATE.scene.syncVisualCosmetics(false);
    }
  }
  if (res?.message) {
    if (tapCoords && res.ok && STATE.scene) {
      STATE.scene.playElfTapEffect(tapCoords.x, tapCoords.y, res.message);
    } else {
      showToast(res.message);
    }
  }
  return res;
}

let tapLock = false;
async function triggerTapCollect(x, y) {
  const now = Date.now();
  if (now - STATE.lastTapTime < 2200) {
    STATE.combo = Math.min(10, STATE.combo + 1);
  } else {
    STATE.combo = 1;
  }
  STATE.lastTapTime = now;
  STATE.feverProgress = Math.min(100, STATE.feverProgress + 10);
  updateFeverHud();
  christmasAudio.playTapSfx(STATE.combo);

  if (STATE.feverProgress >= 100 && STATE.scene) {
    STATE.scene.startFeverRain();
    return;
  }

  if (tapLock) return;
  tapLock = true;
  setTimeout(() => {
    tapLock = false;
  }, 1150);
  await runAction('/api/santa/collect', { isTap: true }, { x, y });
}

function renderHud() {
  if (!STATE.data) return;
  const { player } = STATE.data;
  document.getElementById('player-name').textContent = player.username || 'Yêu Tinh Noel';
  document.getElementById('workshop-level').textContent = `Xưởng Cấp ${player.workshopLevel} • Đã giao ${player.totalDelivered || 0}`;
  document.getElementById('snow-coins').textContent = player.snowCoins;
  document.getElementById('reputation').textContent = player.reputation;
  document.getElementById('wheel-tickets-count').textContent = player.luckyTickets || 0;

  const avatarImg = document.getElementById('player-avatar');
  const fallback = document.getElementById('player-avatar-fallback');
  if (player.avatarUrl) {
    avatarImg.src = player.avatarUrl;
    avatarImg.classList.remove('hidden');
    fallback.classList.add('hidden');
  }

  const wrapper = document.getElementById('avatar-wrapper');
  wrapper.className = 'avatar-wrapper';
  if (player.equippedFrame) {
    wrapper.classList.add(player.equippedFrame.replace('_', '-'));
  }
}

function formatCountdown(expiresAt) {
  if (!expiresAt) return '';
  const sec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${sec}s`;
}

function renderPanel() {
  const container = document.getElementById('panel-content');
  if (!STATE.data || !container) return;

  const {
    player,
    idle,
    recipes,
    materialsMeta,
    helpersMeta = [],
    achievementsMeta = [],
    dailyQuestsMeta = [],
    serverTree = { level: 0, points: 0, nextThreshold: 150, buffActive: false },
    serverBoss = { name: 'Người Tuyết Bão Tố Khổng Lồ', icon: '⛄', level: 1, hp: 2000, maxHp: 2000 },
    personalBuffActive = false,
    partySize = 1,
    coopBonusPct = 0,
    canOpenAdventToday = false,
    nextAdventDay = 1,
    bossTapLeft = 3,
    bossToyLeft = 2,
    shopItems,
    currentWeekKey,
    leaderboard,
    riddle,
    checkedInToday,
    riddleSolvedToday,
    upgradeCost,
  } = STATE.data;

  if (STATE.activeTab === 'workshop') {
    const pendingList = Object.entries(idle.pending)
      .map(([k, v]) => `${materialsMeta[k].icon} ${v}`)
      .join('  ');
    const treePct = Math.min(100, Math.round(((serverTree.points || 0) / Math.max(1, serverTree.nextThreshold)) * 100));

    container.innerHTML = `
      <div class="section-title">
        <span>🏠 Kho Nguyên Liệu Xưởng</span>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          ${partySize > 1 ? `<span class="tag tag-buff">👥 ${partySize} (+${coopBonusPct}%)</span>` : ''}
          <button class="btn btn-gold btn-sm" id="btn-upgrade" ${player.workshopLevel >= 100 ? 'disabled' : ''}>
            ${player.workshopLevel >= 100 ? 'Cấp Tối Đa (100)' : `Nâng Xưởng (${upgradeCost} ❄️)`}
          </button>
        </div>
      </div>
      <div class="grid-2">
        ${Object.entries(materialsMeta)
        .map(
          ([k, meta]) => `
          <div class="mat-chip">
            <span>${meta.icon} ${meta.name}</span>
            <strong>${player.materials[k] || 0}</strong>
          </div>`,
        )
        .join('')}
      </div>
      <div class="card-row">
        <div>
          <div><strong>Tích lũy Idle (${idle.elapsedMinutes}/${idle.maxMinutes} phút)</strong></div>
          <div class="muted">${pendingList}</div>
        </div>
        <button class="btn btn-green" id="btn-collect">Thu hoạch</button>
      </div>

      <div class="card">
        <div class="section-title">
          <span>🎄 Cây Thông Chung Server (Lv.${serverTree.level})</span>
          ${serverTree.buffActive ? '<span class="tag tag-buff">BUFF x2 ACTIVE!</span>' : ''}
        </div>
        <div class="muted">Tiến độ: ${serverTree.points}/${serverTree.nextThreshold} điểm (Lên cấp = x2 Xu & Quà 1 giờ)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${treePct}%"></div></div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="btn btn-green btn-sm" id="btn-tree-coins">Góp 40 ❄️ (+35đ)</button>
        </div>
      </div>

      <div class="card">
        <div class="section-title">
          <span>${serverBoss.icon} Boss Ngày: ${serverBoss.name} (Lv.${serverBoss.level})</span>
          ${
            serverBoss.status === 'defeated'
              ? '<span class="tag tag-buff">ĐÃ HẠ GỤC!</span>'
              : serverBoss.status === 'expired'
                ? '<span class="tag tag-rush">HẾT GIỜ (20H)</span>'
                : personalBuffActive
                  ? '<span class="tag tag-buff">x3 IDLE!</span>'
                  : ''
          }
        </div>
        <div class="muted">
          HP: ${serverBoss.hp}/${serverBoss.maxHp} •
          ${
            serverBoss.status === 'active' && serverBoss.closesAt
              ? `Còn ${Math.max(0, Math.ceil((serverBoss.closesAt - Date.now()) / 3600000))}h/20h`
              : 'Mở lại vào ngày mai'
          } •
          Thưởng: +${400 + (serverBoss.level || 1) * 120} ❄️ & +3 🎟️
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.round((serverBoss.hp / Math.max(1, serverBoss.maxHp)) * 100))}%;background:#e63946;"></div></div>
        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="btn-boss-tap" ${serverBoss.status !== 'active' || bossTapLeft <= 0 ? 'disabled' : ''}>
            ⚔️ Đánh (${bossTapLeft}/3)
          </button>
          <button class="btn btn-gold btn-sm" id="btn-boss-toy" ${serverBoss.status !== 'active' || bossToyLeft <= 0 ? 'disabled' : ''}>
            🧸 Ném đồ (${bossToyLeft}/2)
          </button>
        </div>
      </div>

      <div class="card">
        <div class="section-title"><span>🏪 Chợ Đổi Nguyên Liệu</span></div>
        <div class="muted">Đổi 2 nguyên liệu dư lấy 1 loại cần, hoặc bán 5 nguyên liệu lấy +20 ❄️</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px;">
          <select id="mkt-from" class="pill" style="background:#101b33;">
            ${Object.entries(materialsMeta).map(([k, m]) => `<option value="${k}">${m.icon} ${m.name}</option>`).join('')}
          </select>
          <span>→</span>
          <select id="mkt-to" class="pill" style="background:#101b33;">
            ${Object.entries(materialsMeta).map(([k, m], idx) => `<option value="${k}" ${idx === 1 ? 'selected' : ''}>${m.icon} ${m.name}</option>`).join('')}
          </select>
          <button class="btn btn-green btn-sm" id="btn-mkt-swap">Đổi (2→1)</button>
          <button class="btn btn-gold btn-sm" id="btn-mkt-sell">Bán 5 (+20❄️)</button>
        </div>
      </div>

      <div class="section-title" style="margin-top:4px;"><span>🧝 Đội Ngũ Yêu Tinh Phụ Việc</span></div>
      ${helpersMeta
        .map(
          (h) => `
        <div class="card-row">
          <div>
            <div><strong>${h.icon} ${h.name}</strong> <span class="tag">Lv.${h.level}/100</span></div>
            <div class="muted">${h.description}</div>
          </div>
          <button class="btn btn-gold btn-sm" data-hire="${h.id}" ${h.level >= 100 ? 'disabled' : ''}>
            ${h.level >= 100 ? 'MAX' : `${h.nextCost} ❄️`}
          </button>
        </div>
      `,
        )
        .join('')}
    `;
    document.getElementById('btn-collect').onclick = async () => {
      const r = await runAction('/api/santa/collect', { isTap: false });
      if (r?.ok) christmasAudio.playCoinSfx();
    };
    document.getElementById('btn-upgrade').onclick = () => {
      openUpgradeConfirmModal();
    };
    document.getElementById('btn-tree-coins').onclick = async () => {
      const r = await runAction('/api/santa/tree/contribute', { mode: 'coins' });
      if (r?.ok) christmasAudio.playJackpotSfx();
    };
    document.getElementById('btn-boss-tap').onclick = async () => {
      const r = await runAction('/api/santa/boss/attack', { mode: 'tap' });
      if (r?.ok) christmasAudio.playTapSfx(5);
    };
    document.getElementById('btn-boss-toy').onclick = async () => {
      const r = await runAction('/api/santa/boss/attack', { mode: 'toy' });
      if (r?.ok) christmasAudio.playJackpotSfx();
    };
    document.getElementById('btn-mkt-swap').onclick = async () => {
      const fromMat = document.getElementById('mkt-from').value;
      const toMat = document.getElementById('mkt-to').value;
      const r = await runAction('/api/santa/market/exchange', { mode: 'swap', fromMat, toMat });
      if (r?.ok) christmasAudio.playCoinSfx();
    };
    document.getElementById('btn-mkt-sell').onclick = async () => {
      const fromMat = document.getElementById('mkt-from').value;
      const r = await runAction('/api/santa/market/exchange', { mode: 'sell', fromMat });
      if (r?.ok) christmasAudio.playCoinSfx();
    };
    container.querySelectorAll('[data-hire]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/hire-helper', { helperId: btn.dataset.hire });
        if (r?.ok) christmasAudio.playCraftSfx();
      };
    });
  } else if (STATE.activeTab === 'craft') {
    const collected = player.shinyCollection || [];
    container.innerHTML = `
      <div class="card">
        <div class="section-title">
          <span>📖 Sổ Tay Hoàng Kim (${collected.length}/${recipes.length})</span>
          ${player.hasGoldenHands ? '<span class="tag tag-buff">🏆 Bàn Tay Vàng +20% Xu</span>' : `<span class="tag">Đủ ${recipes.length}/${recipes.length}: +20% Xu</span>`}
        </div>
        <div class="shiny-grid">
          ${recipes
            .map(
              (r) => `
            <div class="shiny-slot ${collected.includes(r.id) ? 'collected' : ''}">
              <div style="font-size:18px;">${r.icon}</div>
              <div>${collected.includes(r.id) ? '✨ Đã có' : '🔒'}</div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
      <div class="section-title">
        <span>🔨 Bàn Chế Tạo Đồ Chơi</span>
        <span class="tag">Lv.${player.workshopLevel} (Độ khó & Thưởng cao)</span>
      </div>
      ${recipes
        .map((r) => {
          const reqStr = Object.entries(r.ingredients)
            .map(([m, q]) => `${materialsMeta[m].icon} ${player.materials[m] || 0}/${q}`)
            .join(' • ');
          const unlocked = (player.workshopLevel || 1) >= (r.minLevel || 1);
          const canCraft = unlocked && Object.entries(r.ingredients).every(([m, q]) => (player.materials[m] || 0) >= q);
          const canCraft20 = unlocked && Object.entries(r.ingredients).every(([m, q]) => (player.materials[m] || 0) >= q * 20);
          const shinyCount = player.shinyToys?.[r.id] || 0;
          return `
            <div class="card-row">
              <div>
                <div>
                  <strong>${r.icon} ${r.name}</strong>
                  <span class="tag">Kho: ${player.toys[r.id] || 0}${shinyCount > 0 ? ` (+${shinyCount} ✨)` : ''}</span>
                  ${!unlocked ? `<span class="tag tag-rush">Mở ở Lv.${r.minLevel}</span>` : ''}
                </div>
                <div class="muted">${reqStr}</div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0;">
                <button class="btn ${canCraft ? 'btn-green' : ''} btn-sm" data-craft="${r.id}" data-count="1" ${canCraft ? '' : 'disabled'}>
                  ${unlocked ? 'Chế tạo' : `Lv.${r.minLevel}`}
                </button>
                ${
                  unlocked
                    ? `<button class="btn ${canCraft20 ? 'btn-gold' : ''} btn-sm" data-craft="${r.id}" data-count="20" ${canCraft20 ? '' : 'disabled'}>x20</button>`
                    : ''
                }
              </div>
            </div>
          `;
        })
        .join('')}
    `;
    container.querySelectorAll('[data-craft]').forEach((btn) => {
      btn.onclick = async () => {
        const toyId = btn.dataset.craft;
        const count = Number(btn.dataset.count) || 1;
        const r = await runAction('/api/santa/craft', { toyId, count });
        if (r?.ok) {
          christmasAudio.playCraftSfx();
          const rec = recipes.find((x) => x.id === toyId);
          if (STATE.scene && rec) STATE.scene.playConveyorCraftEffect(rec.icon);
        }
      };
    });
  } else if (STATE.activeTab === 'orders') {
    container.innerHTML = `
      <div class="section-title"><span>🛷 Đơn Hàng Giáng Sinh</span></div>
      ${player.orders
        .map((ord) => {
          const recipe = recipes.find((r) => r.id === ord.toyId);
          const have = (player.toys[ord.toyId] || 0) + (player.shinyToys?.[ord.toyId] || 0);
          const canDeliver = have >= ord.qty;
          const rushBadge = ord.isRush
            ? `<span class="tag tag-rush" data-expire="${ord.expiresAt}">⚡ Khẩn x2 (${formatCountdown(ord.expiresAt)})</span>`
            : ord.isSpecial
              ? '<span class="tag">Đặc Biệt x1.5</span>'
              : '';
          return `
            <div class="card-row ${ord.isRush ? 'rush-order' : ''}">
              <div>
                <div><strong>${ord.customerIcon} ${ord.customerName}</strong> ${rushBadge}</div>
                <div class="muted">Cần: ${ord.qty} ${recipe?.icon || ''} ${recipe?.name || ''} (Có: ${have}) • +${ord.rewardCoins} ❄️, +${ord.rewardRep} ⭐${ord.rewardTickets ? `, +${ord.rewardTickets} 🎟️` : ''}</div>
              </div>
              <button class="btn ${canDeliver ? 'btn-gold' : ''}" data-deliver="${ord.id}" ${canDeliver ? '' : 'disabled'}>Giao hàng</button>
            </div>
          `;
        })
        .join('')}
    `;
    container.querySelectorAll('[data-deliver]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/deliver', { orderId: btn.dataset.deliver });
        if (r?.ok) christmasAudio.playCoinSfx();
      };
    });
  } else if (STATE.activeTab === 'quests') {
    const openedAdv = player.adventOpened || [];
    const adventCells = Array.from({ length: 24 }, (_, idx) => {
      const day = idx + 1;
      const isOpened = openedAdv.includes(day);
      const isReady = !isOpened && canOpenAdventToday && day === nextAdventDay;
      const cls = isOpened ? 'opened' : isReady ? 'ready' : '';
      const icon = isOpened ? '✅' : isReady ? '🎁' : '🔒';
      return `<button class="advent-cell ${cls}" ${isReady ? `data-advent="${day}"` : 'disabled'}>${day}<br/>${icon}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="card">
        <div class="section-title">
          <span>📅 Lịch Quà Giáng Sinh (${openedAdv.length}/24)</span>
          <span class="tag">${canOpenAdventToday ? `Mở Ô ${nextAdventDay}!` : 'Mai quay lại'}</span>
        </div>
        <div class="advent-grid">${adventCells}</div>
      </div>
      <div class="section-title"><span>🎁 Nhiệm Vụ & Thành Tựu</span></div>
      <div class="card-row">
        <div>
          <div><strong>📅 Điểm danh Yêu Tinh (Chuỗi ${player.checkinStreak} ngày)</strong></div>
          <div class="muted">Nhận Xu Tuyết & đầy đủ 4 loại nguyên liệu mỗi ngày</div>
        </div>
        <button class="btn btn-green" id="btn-checkin" ${checkedInToday ? 'disabled' : ''}>
          ${checkedInToday ? 'Đã nhận' : 'Điểm danh'}
        </button>
      </div>
      <div class="card">
        <div><strong>🧩 Câu Đố Noel Hôm Nay</strong> ${riddleSolvedToday ? '<span class="tag">Đã hoàn thành</span>' : ''}</div>
        <div class="muted">${riddle.question}</div>
        <div class="riddle-options">
          ${riddle.options
        .map(
          (opt, idx) => `
            <button class="btn btn-outline" data-riddle="${idx}" ${riddleSolvedToday ? 'disabled' : ''}>${opt}</button>
          `,
        )
        .join('')}
        </div>
      </div>
      <div class="section-title" style="margin-top:4px;"><span>📋 10 Nhiệm Vụ Hàng Ngày</span></div>
      ${dailyQuestsMeta
        .map((q) => {
          const rewardParts = [];
          if (q.rewardCoins) rewardParts.push(`+${q.rewardCoins} ❄️`);
          if (q.rewardRep) rewardParts.push(`+${q.rewardRep} ⭐`);
          if (q.rewardTickets) rewardParts.push(`+${q.rewardTickets} 🎟️`);
          if (q.rewardMat) {
            for (const [m, amt] of Object.entries(q.rewardMat)) {
              rewardParts.push(`+${amt} ${materialsMeta[m]?.icon || ''}`);
            }
          }
          let btnHtml = `<span class="tag">${q.progress}/${q.target}</span>`;
          if (q.claimed) {
            btnHtml = `<span class="tag tag-buff">Đã nhận ✅</span>`;
          } else if (q.completed) {
            btnHtml = `<button class="btn btn-gold btn-sm" data-claim-quest="${q.id}">Nhận thưởng</button>`;
          }
          return `
            <div class="card-row">
              <div>
                <div><strong>${q.icon} ${q.name}</strong></div>
                <div class="muted">${q.description} • Thưởng: ${rewardParts.join(', ')}</div>
              </div>
              ${btnHtml}
            </div>
          `;
        })
        .join('')}
      <div class="section-title" style="margin-top:4px;"><span>🏆 Thành Tựu Xưởng Noel</span></div>
      ${achievementsMeta
        .map(
          (a) => `
        <div class="card-row">
          <div>
            <div><strong>${a.icon} ${a.name}</strong> ${a.unlocked ? '<span class="tag tag-buff">Đã đạt ✅</span>' : ''}</div>
            <div class="muted">${a.description} • Thưởng: +${a.rewardCoins} ❄️, +${a.rewardTickets} 🎟️</div>
          </div>
        </div>
      `,
        )
        .join('')}
    `;
    document.getElementById('btn-checkin').onclick = async () => {
      const r = await runAction('/api/santa/checkin');
      if (r?.ok) christmasAudio.playCoinSfx();
    };
    container.querySelectorAll('[data-riddle]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/riddle', { optionIndex: Number(btn.dataset.riddle) });
        if (r?.ok) christmasAudio.playJackpotSfx();
      };
    });
    container.querySelectorAll('[data-claim-quest]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/quest/claim', { questId: btn.dataset.claimQuest });
        if (r?.ok) christmasAudio.playCoinSfx();
      };
    });
    container.querySelectorAll('[data-advent]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/advent/open', { dayNumber: Number(btn.dataset.advent) });
        if (r?.ok) christmasAudio.playJackpotSfx();
      };
    });
  } else if (STATE.activeTab === 'shop') {
    const equippedPetObj = player.equippedPet ? shopItems.find((i) => i.id === player.equippedPet) : null;
    const equippedPetLv = player.equippedPet ? player.petLevels?.[player.equippedPet] || 1 : 1;
    const feedCost = 150 * equippedPetLv;

    container.innerHTML = `
      ${
        equippedPetObj
          ? `<div class="card">
              <div class="section-title">
                <span>🐾 Thú Cưng: ${equippedPetObj.icon} ${equippedPetObj.name}</span>
                <span class="tag">Lv.${equippedPetLv}/5</span>
              </div>
              <div class="muted">Cho ăn để tiến hóa, nhặt quà Fever nhanh hơn & phát sáng hào quang!</div>
              <div style="display:flex;gap:8px;margin-top:4px;">
                <button class="btn btn-gold btn-sm" id="btn-feed-coins" ${equippedPetLv >= 5 ? 'disabled' : ''}>
                  ${equippedPetLv >= 5 ? 'Đã Tối Đa' : `🍖 Cho ăn (${feedCost} ❄️)`}
                </button>
                <button class="btn btn-green btn-sm" id="btn-feed-toy" ${equippedPetLv >= 5 ? 'disabled' : ''}>
                  🧸 Cho ăn 1 Đồ Chơi
                </button>
              </div>
            </div>`
          : ''
      }
      <div class="section-title">
        <span>🛒 Shop, Thú Cưng & Tủ Đồ</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" id="btn-mystery-box">🎁 Hộp Bí Ẩn (150❄️)</button>
          <button class="btn btn-gold btn-sm" id="btn-open-wheel">🎡 Vòng Quay (${player.luckyTickets || 0} 🎟️)</button>
        </div>
      </div>
      ${shopItems
        .map((item) => {
          const isFrame = item.type === 'frame';
          const isPet = item.type === 'pet';
          const isSkin = item.type === 'skin';
          const owned =
            (isFrame && (player.ownedFrames || []).includes(item.id)) ||
            (isPet && (player.ownedPets || []).includes(item.id)) ||
            (isSkin && (player.ownedSkins || []).includes(item.id));
          const equipped =
            (isFrame && player.equippedFrame === item.id) ||
            (isPet && player.equippedPet === item.id) ||
            (isSkin && player.equippedSkin === item.id);
          const ownedRole = item.type === 'role' && player.hasEventRole;
          const boughtThisWeek = Boolean(item.weeklyLimit && currentWeekKey && player.weeklyPurchases?.[item.id] === currentWeekKey);
          const cooldownRemainMs = item.cooldownDays
            ? item.cooldownDays * 24 * 60 * 60 * 1000 - (Date.now() - (player.cooldownPurchases?.[item.id] || 0))
            : 0;

          let actionHtml = `<button class="btn" data-buy="${item.id}">${item.price} ❄️</button>`;
          if (owned) {
            actionHtml = equipped
              ? `<button class="btn btn-outline" data-equip-kind="${item.type}" data-equip-id="">Đang dùng</button>`
              : `<button class="btn btn-green" data-equip-kind="${item.type}" data-equip-id="${item.id}">Trang bị</button>`;
          } else if (ownedRole) {
            actionHtml = `<button class="btn btn-outline" disabled>Đã sở hữu</button>`;
          } else if (boughtThisWeek) {
            actionHtml = `<button class="btn btn-outline" disabled>Đã mua tuần này</button>`;
          } else if (cooldownRemainMs > 0) {
            const hrs = Math.ceil(cooldownRemainMs / (60 * 60 * 1000));
            actionHtml = `<button class="btn btn-outline" disabled>Chờ ${hrs}h</button>`;
          }

          return `
            <div class="card-row">
              <div>
                <div><strong>${item.icon} ${item.name}</strong></div>
                <div class="muted">${item.description}</div>
              </div>
              ${actionHtml}
            </div>
          `;
        })
        .join('')}
      <div class="section-title" style="margin-top:6px;"><span>🏆 BXH & Ghé Thăm Bạn Bè</span></div>
      ${leaderboard
        .slice(0, 8)
        .map((entry, idx) => {
          const isMe = String(entry.userId) === String(player.userId);
          const frameCls = entry.equippedFrame ? entry.equippedFrame.replace('_', '-') : '';
          const avaHtml = entry.avatarUrl
            ? `<img src="${entry.avatarUrl}" class="avatar-img" alt="" />`
            : `<div class="avatar-fallback" style="font-size:15px;">🧝</div>`;
          return `
            <div class="friend-row">
              <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                <div class="avatar-wrapper avatar-sm ${frameCls}">${avaHtml}</div>
                <div style="min-width:0;">
                  <div><strong>#${idx + 1} ${entry.username}</strong> (Lv.${entry.workshopLevel} • 📦 ${entry.totalDelivered || 0} đơn)</div>
                  <div class="muted">⭐ ${entry.reputation} • ❄️ ${entry.snowCoins}</div>
                </div>
              </div>
              ${isMe
              ? '<span class="tag">Bạn</span>'
              : `<div class="friend-actions">
                      <button class="btn btn-sm btn-outline" data-visit="like" data-target="${entry.userId}" title="Thả tim giúp xưởng bạn">❤️</button>
                      <button class="btn btn-sm btn-green" data-visit="gift" data-target="${entry.userId}" title="Tặng 1 đồ chơi trong kho">🎁</button>
                    </div>`
            }
            </div>
          `;
        })
        .join('')}
    `;
    if (document.getElementById('btn-feed-coins')) {
      document.getElementById('btn-feed-coins').onclick = async () => {
        const r = await runAction('/api/santa/pet/feed', { mode: 'coins' });
        if (r?.ok) christmasAudio.playJackpotSfx();
      };
    }
    if (document.getElementById('btn-feed-toy')) {
      document.getElementById('btn-feed-toy').onclick = async () => {
        const r = await runAction('/api/santa/pet/feed', { mode: 'toy' });
        if (r?.ok) christmasAudio.playJackpotSfx();
      };
    }
    document.getElementById('btn-mystery-box').onclick = async () => {
      const r = await runAction('/api/santa/mystery-box');
      if (r?.ok) christmasAudio.playJackpotSfx();
    };
    document.getElementById('btn-open-wheel').onclick = () => {
      const lv = player.workshopLevel || 1;
      const mult = (1 + (lv - 1) * 0.5).toFixed(1);
      document.getElementById('wheel-result').textContent = `Xưởng Lv.${lv}: Quà Vòng Quay đang nhân x${mult}!`;
      document.getElementById('wheel-modal').classList.remove('hidden');
      drawWheelCanvas();
    };
    container.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/shop/buy', { itemId: btn.dataset.buy });
        if (r?.ok) christmasAudio.playCoinSfx();
      };
    });
    container.querySelectorAll('[data-equip-kind]').forEach((btn) => {
      btn.onclick = () =>
        runAction('/api/santa/equip', {
          kind: btn.dataset.equipKind,
          itemId: btn.dataset.equipId || null,
        });
    });
    container.querySelectorAll('[data-visit]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/friend/visit', {
          targetUserId: btn.dataset.target,
          action: btn.dataset.visit,
        });
        if (r?.ok) christmasAudio.playCoinSfx();
      };
    });
  }
}

function checkPendingGiftNotices() {
  const notices = STATE.data?.player?.pendingGiftNotices;
  if (!Array.isArray(notices) || notices.length === 0) return;

  const modal = document.getElementById('gift-notice-modal');
  const body = document.getElementById('gift-notice-body');
  if (!modal || !body) return;

  body.innerHTML = notices
    .map(
      (g) => `
      <div class="card">
        <div style="font-size:16px;font-weight:800;color:var(--gold);">+${g.amount} ❄️ Xu Tuyết</div>
        <div>Người tặng: <strong>${g.fromName || 'Admin'}</strong></div>
        ${g.note ? `<div class="muted">"${g.note}"</div>` : ''}
      </div>
    `,
    )
    .join('');

  modal.classList.remove('hidden');
}

function renderAll() {
  renderHud();
  renderPanel();
  checkPendingGiftNotices();
}

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      christmasAudio.startMusic();
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      STATE.panelCollapsed = false;
      document.getElementById('panel-overlay').classList.remove('collapsed');
      document.getElementById('btn-toggle-panel').textContent = '▾ Thu gọn';
      renderPanel();
    });
  });

  document.getElementById('btn-toggle-panel').addEventListener('click', () => {
    STATE.panelCollapsed = !STATE.panelCollapsed;
    const panel = document.getElementById('panel-overlay');
    const btn = document.getElementById('btn-toggle-panel');
    panel.classList.toggle('collapsed', STATE.panelCollapsed);
    btn.textContent = STATE.panelCollapsed ? '▴ Mở bảng' : '▾ Thu gọn';
  });

  document.getElementById('btn-song').addEventListener('click', () => {
    const listEl = document.getElementById('music-list');
    const currentId = christmasAudio.getCurrentSong().id;
    listEl.innerHTML = CHRISTMAS_SONGS.map(
      (s) => `
      <button class="btn ${s.id === currentId ? 'btn-gold' : 'btn-outline'}" data-song-id="${s.id}" style="text-align:left;">
        ${s.id === currentId ? '🔊 ' : '🎵 '}${s.title}
      </button>
    `,
    ).join('');
    listEl.querySelectorAll('[data-song-id]').forEach((b) => {
      b.onclick = async () => {
        const song = await christmasAudio.selectSongById(b.dataset.songId);
        document.getElementById('song-name').textContent = song.title;
        document.getElementById('music-modal').classList.add('hidden');
        showToast(`🎵 Đang phát: ${song.title}`);
      };
    });
    document.getElementById('music-modal').classList.remove('hidden');
  });

  document.getElementById('btn-close-music').addEventListener('click', () => {
    document.getElementById('music-modal').classList.add('hidden');
  });

  document.getElementById('btn-mute').addEventListener('click', async () => {
    const muted = await christmasAudio.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  });

  const unlockAudio = () => {
    christmasAudio.startMusic();
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });

  document.getElementById('btn-close-wheel').addEventListener('click', () => {
    if (!STATE.wheelSpinning) {
      document.getElementById('wheel-modal').classList.add('hidden');
    }
  });

  document.getElementById('btn-spin-now').addEventListener('click', spinLuckyWheel);

  document.getElementById('btn-close-upgrade').addEventListener('click', () => {
    document.getElementById('upgrade-modal').classList.add('hidden');
  });
  document.getElementById('btn-cancel-upgrade').addEventListener('click', () => {
    document.getElementById('upgrade-modal').classList.add('hidden');
  });
  document.getElementById('btn-confirm-upgrade').addEventListener('click', async () => {
    document.getElementById('upgrade-modal').classList.add('hidden');
    const r = await runAction('/api/santa/upgrade');
    if (r?.ok) christmasAudio.playCraftSfx();
  });

  document.getElementById('btn-ack-gifts').addEventListener('click', async () => {
    document.getElementById('gift-notice-modal').classList.add('hidden');
    christmasAudio.playJackpotSfx();
    await runAction('/api/santa/ack-gifts');
  });
}

function openUpgradeConfirmModal() {
  if (!STATE.data) return;
  const { player, upgradeCost } = STATE.data;
  const curLv = player.workshopLevel || 1;
  if (curLv >= 100) return;

  const nextLv = curLv + 1;
  const curMult = (1 + (curLv - 1) * 0.35).toFixed(2);
  const nextMult = (1 + (nextLv - 1) * 0.35).toFixed(2);
  const canAfford = (player.snowCoins || 0) >= upgradeCost;

  document.getElementById('upgrade-modal-title').textContent = `🏠 Nâng Xưởng: Cấp ${curLv} → Cấp ${nextLv}`;

  const perks = [
    `<div class="mat-chip"><span>⚡ Tốc độ Idle tự động</span><strong>x${curMult} → x${nextMult}</strong></div>`,
    `<div class="mat-chip"><span>🎡 Thưởng Vòng Quay</span><strong>x${(1 + (curLv - 1) * 0.5).toFixed(1)} → x${(1 + (nextLv - 1) * 0.5).toFixed(1)}</strong></div>`,
  ];
  if (nextLv === 3) {
    perks.push(`<div class="mat-chip"><span>📦 Mở khóa mới</span><strong>Đơn hàng 2 món (x2 Thưởng!)</strong></div>`);
  } else if (nextLv < 3) {
    perks.push(`<div class="mat-chip"><span>📦 Mốc Cấp 3</span><span class="muted">Mở khóa đơn hàng 2 món</span></div>`);
  }
  if (nextLv === 4) {
    perks.push(`<div class="mat-chip"><span>🔨 Gõ búa chạm Xưởng</span><strong>+1 → +2 nguyên liệu/lần!</strong></div>`);
  } else if (nextLv === 8) {
    perks.push(`<div class="mat-chip"><span>🔨 Gõ búa chạm Xưởng</span><strong>+2 → +3 nguyên liệu/lần!</strong></div>`);
  } else if (nextLv === 12) {
    perks.push(`<div class="mat-chip"><span>📦 Mở khóa mới</span><strong>Đơn hàng 3 món (x3 Thưởng!)</strong></div>`);
  } else if (nextLv === 15) {
    perks.push(`<div class="mat-chip"><span>🔨 Gõ búa chạm Xưởng</span><strong>+3 → +4 nguyên liệu/lần!</strong></div>`);
  } else if (nextLv === 25 || nextLv === 40 || nextLv === 60) {
    perks.push(`<div class="mat-chip"><span>🔨 Gõ búa chạm Xưởng</span><strong>Tăng sản lượng gõ búa!</strong></div>`);
  } else if (nextLv < 4) {
    perks.push(`<div class="mat-chip"><span>🔨 Mốc Cấp 4</span><span class="muted">Gõ búa nhận x2 nguyên liệu</span></div>`);
  }
  perks.push(`<div class="mat-chip"><span>🏆 Bảng Xếp Hạng</span><strong>Hiển thị Lv.${nextLv}</strong></div>`);
  perks.push(
    `<div class="muted" style="text-align:center;margin-top:4px;">Chi phí: <strong>${upgradeCost} ❄️</strong> (Bạn đang có: <strong>${player.snowCoins} ❄️</strong>)</div>`,
  );

  document.getElementById('upgrade-modal-body').innerHTML = perks.join('');
  const confirmBtn = document.getElementById('btn-confirm-upgrade');
  confirmBtn.disabled = !canAfford;
  confirmBtn.textContent = canAfford ? `✅ Xác nhận (${upgradeCost} ❄️)` : `Thiếu ${upgradeCost - player.snowCoins} ❄️`;

  document.getElementById('upgrade-modal').classList.remove('hidden');
}

async function bootstrap() {
  STATE.guestId = getOrCreateGuestId();
  document.getElementById('song-name').textContent = christmasAudio.getCurrentSong().title;
  bindEvents();
  try {
    bootPhaser();
  } catch (err) {
    console.error('Phaser boot error:', err);
  }
  await initDiscordActivitySdk();
  await refreshState();
  setInterval(refreshState, 30000);
  setInterval(() => {
    document.querySelectorAll('[data-expire]').forEach((el) => {
      const exp = Number(el.dataset.expire);
      el.textContent = `⚡ Khẩn x2 (${formatCountdown(exp)})`;
    });
  }, 1000);
}

bootstrap();
