import { christmasAudio } from './audio.js?v=20261125i';

const STATE = {
  token: 'demo',
  guildId: 'global',
  guestId: null,
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

  try {
    const cfgRes = await fetch('/api/santa/config');
    const cfg = await cfgRes.json();
    if (!cfg?.clientId) return;

    const { DiscordSDK } = await import('./vendor/discord-sdk.mjs?v=20261125e');
    const discordSdk = new DiscordSDK(cfg.clientId);
    await discordSdk.ready();

    if (discordSdk.guildId) STATE.guildId = discordSdk.guildId;

    const { code } = await discordSdk.commands.authorize({
      client_id: cfg.clientId,
      response_type: 'code',
      state: '',
      scope: ['identify', 'guilds'],
    });

    const tokenRes = await fetch('/api/santa/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData?.access_token) {
      await discordSdk.commands.authenticate({ access_token: tokenData.access_token });
      STATE.token = tokenData.access_token;
    } else if (tokenData?.error) {
      showToast(`⚠️ Chưa lấy được tên Discord: ${tokenData.error}`);
    }
  } catch (err) {
    console.warn('Discord SDK fallback to browser mode:', err);
    showToast('⚠️ Chưa xác thực được tên Discord (kiểm tra DISCORD_CLIENT_SECRET)');
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
    const skin = STATE.data?.player?.equippedSkin || 'skin_classic';

    this.elf = this.add.container(w * 0.42, h * 0.52);
    const g = this.add.graphics();

    // Cánh tiên băng giá nếu đeo skin_fairy (4 cánh phát sáng)
    if (skin === 'skin_fairy') {
      g.fillStyle(0x72efdd, 0.55);
      g.fillEllipse(-30, -4, 34, 24);
      g.fillEllipse(30, -4, 34, 24);
      g.fillEllipse(-24, 18, 26, 20);
      g.fillEllipse(24, 18, 26, 20);
      g.lineStyle(2, 0xffffff, 0.85);
      g.strokeEllipse(-30, -4, 34, 24);
      g.strokeEllipse(30, -4, 34, 24);
    }

    // Giày nhỏ
    g.fillStyle(0x2b2d42, 1);
    g.fillRoundedRect(-16, 42, 12, 8, 4);
    g.fillRoundedRect(4, 42, 12, 8, 4);

    // Thân áo theo skin
    const coatColor = skin === 'skin_santa' ? 0xd90429 : skin === 'skin_fairy' ? 0x00b4d8 : 0x2a9d8f;
    g.fillStyle(coatColor, 1);
    g.fillRoundedRect(-22, 0, 44, 44, 10);
    if (skin === 'skin_santa') {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-5, 0, 10, 44);
      g.fillRoundedRect(-24, 36, 48, 8, 4);
    }
    g.fillStyle(0xffd166, 1);
    g.fillRect(-22, 22, 44, 6);

    // Tay trái & tay phải cầm búa gỗ
    g.fillStyle(coatColor, 1);
    g.fillRoundedRect(-31, 6, 11, 22, 5);
    g.fillRoundedRect(20, 6, 11, 22, 5);
    g.fillStyle(0xffd6ba, 1);
    g.fillCircle(-26, 28, 5);
    g.fillCircle(26, 28, 5);
    // Cây búa gỗ trên tay phải
    g.fillStyle(0x9c6644, 1);
    g.fillRect(25, 4, 4, 24);
    g.fillStyle(0xadb5bd, 1);
    g.fillRoundedRect(19, -2, 16, 9, 3);

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
    g.lineStyle(2, 0x9e2a2b, 1);
    g.beginPath();
    g.arc(0, -12, 6, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // Mũ Noel đỏ
    g.fillStyle(0xe63946, 1);
    g.fillTriangle(0, -56, -22, -26, 22, -26);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-24, -30, 48, 9, 4);
    g.fillCircle(0, -58, 6);
    this.elf.add(g);

    const hint = this.add
      .text(0, 62, 'Chạm vào Xưởng để gõ búa & tích Fever!', {
        fontSize: '12px',
        color: '#ffd166',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.48)',
        padding: { x: 8, y: 4 },
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
  }

  syncVisualCosmetics() {
    this.createElfCharacter();

    // Helpers
    for (const spr of this.helperSprites) spr.destroy();
    this.helperSprites = [];
    const helpers = STATE.data?.player?.helpers || {};
    const floorY = this.scale.height * 0.64;
    const spots = [
      { key: 'lumberjack', icon: '🪓🧝', xRatio: 0.24 },
      { key: 'tailor', icon: '✂️🧝', xRatio: 0.56 },
      { key: 'mage', icon: '🌟🧝', xRatio: 0.72 },
    ];
    for (const s of spots) {
      const lv = helpers[s.key] || 0;
      if (lv > 0) {
        const txt = this.add
          .text(this.scale.width * s.xRatio, floorY - 26, `${s.icon} Lv.${lv}`, {
            fontSize: '14px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 4, duration: 700, yoyo: true, repeat: -1 });
        this.helperSprites.push(txt);
      }
    }

    // Pet
    if (this.petSprite) {
      this.petSprite.destroy();
      this.petSprite = null;
    }
    const petId = STATE.data?.player?.equippedPet;
    if (petId) {
      const petIcon = petId === 'pet_reindeer' ? '🦌' : '🐰';
      this.petSprite = this.add.text(this.scale.width * 0.32, floorY + 14, petIcon, { fontSize: '28px' }).setOrigin(0.5);
      this.tweens.add({
        targets: this.petSprite,
        x: this.scale.width * 0.6,
        duration: 3800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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

    const gx = Phaser.Math.Between(Math.floor(w * 0.2), Math.floor(w * 0.8));
    this.grinchContainer = this.add.container(gx, floorY - 24);
    const body = this.add.text(0, 0, '👺', { fontSize: '44px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, -36, `Đuổi Grinch! (${hitsNeeded})`, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff',
        backgroundColor: '#d90429',
        padding: { x: 6, y: 3 },
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
      basket = this.add.text(w * 0.5, h - 38, '🧺', { fontSize: '46px' }).setOrigin(0.5);
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
          .setOrigin(0.5);

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
      const petInterval = petId === 'pet_reindeer' ? 1100 : 1600;
      petTimer = this.time.addEvent({
        delay: petInterval,
        loop: true,
        callback: () => {
          const target = activeGifts.find((g) => g && g.active && g.y > 20 && g.y < this.scale.height - 40);
          if (target) {
            STATE.feverHits += 1;
            christmasAudio.playCoinSfx();
            this.playElfTapEffect(target.x, target.y, `${petId === 'pet_reindeer' ? '🦌' : '🐰'} +3 ❄️`);
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
    this.syncVisualCosmetics();
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
      STATE.scene.drawBackground();
      STATE.scene.syncVisualCosmetics();
    }
  }
}

async function runAction(path, body = {}, tapCoords = null) {
  const res = await apiRequest(path, 'POST', body);
  if (res?.state) {
    STATE.data = res.state;
    renderAll();
    if (STATE.scene) {
      STATE.scene.drawBackground();
      STATE.scene.syncVisualCosmetics();
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
    shopItems,
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
        <button class="btn btn-gold btn-sm" id="btn-upgrade" ${player.workshopLevel >= 10 ? 'disabled' : ''}>
          ${player.workshopLevel >= 10 ? 'Cấp Tối Đa' : `Nâng Xưởng (${upgradeCost} ❄️)`}
        </button>
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

      <div class="section-title" style="margin-top:4px;"><span>🧝 Đội Ngũ Yêu Tinh Phụ Việc</span></div>
      ${helpersMeta
        .map(
          (h) => `
        <div class="card-row">
          <div>
            <div><strong>${h.icon} ${h.name}</strong> <span class="tag">Lv.${h.level}/10</span></div>
            <div class="muted">${h.description}</div>
          </div>
          <button class="btn btn-gold btn-sm" data-hire="${h.id}" ${h.level >= 10 ? 'disabled' : ''}>
            ${h.level >= 10 ? 'MAX' : `${h.nextCost} ❄️`}
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
    container.querySelectorAll('[data-hire]').forEach((btn) => {
      btn.onclick = async () => {
        const r = await runAction('/api/santa/hire-helper', { helperId: btn.dataset.hire });
        if (r?.ok) christmasAudio.playCraftSfx();
      };
    });
  } else if (STATE.activeTab === 'craft') {
    container.innerHTML = `
      <div class="section-title"><span>🔨 Bàn Chế Tạo Đồ Chơi</span></div>
      ${recipes
        .map((r) => {
          const reqStr = Object.entries(r.ingredients)
            .map(([m, q]) => `${materialsMeta[m].icon} ${player.materials[m] || 0}/${q}`)
            .join(' • ');
          const canCraft = Object.entries(r.ingredients).every(([m, q]) => (player.materials[m] || 0) >= q);
          return `
            <div class="card-row">
              <div>
                <div><strong>${r.icon} ${r.name}</strong> <span class="tag">Kho: ${player.toys[r.id] || 0}</span></div>
                <div class="muted">${reqStr}</div>
              </div>
              <button class="btn ${canCraft ? 'btn-green' : ''}" data-craft="${r.id}" ${canCraft ? '' : 'disabled'}>Chế tạo</button>
            </div>
          `;
        })
        .join('')}
    `;
    container.querySelectorAll('[data-craft]').forEach((btn) => {
      btn.onclick = async () => {
        const toyId = btn.dataset.craft;
        const r = await runAction('/api/santa/craft', { toyId });
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
          const have = player.toys[ord.toyId] || 0;
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
    container.innerHTML = `
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
  } else if (STATE.activeTab === 'shop') {
    container.innerHTML = `
      <div class="section-title">
        <span>🛒 Shop, Thú Cưng & Tủ Đồ</span>
        <button class="btn btn-gold btn-sm" id="btn-open-wheel">🎡 Vòng Quay (${player.luckyTickets || 0} 🎟️)</button>
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

          let actionHtml = `<button class="btn" data-buy="${item.id}">${item.price} ❄️</button>`;
          if (owned) {
            actionHtml = equipped
              ? `<button class="btn btn-outline" data-equip-kind="${item.type}" data-equip-id="">Đang dùng</button>`
              : `<button class="btn btn-green" data-equip-kind="${item.type}" data-equip-id="${item.id}">Trang bị</button>`;
          } else if (ownedRole) {
            actionHtml = `<button class="btn btn-outline" disabled>Đã sở hữu</button>`;
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
                  <div><strong>#${idx + 1} ${entry.username}</strong> (Lv.${entry.workshopLevel})</div>
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
    document.getElementById('btn-open-wheel').onclick = () => {
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

function renderAll() {
  renderHud();
  renderPanel();
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

  document.getElementById('btn-song').addEventListener('click', async () => {
    const song = await christmasAudio.nextSong();
    document.getElementById('song-name').textContent = song.title;
    showToast(`🎵 Đang phát: ${song.title}`);
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
}

function openUpgradeConfirmModal() {
  if (!STATE.data) return;
  const { player, upgradeCost } = STATE.data;
  const curLv = player.workshopLevel || 1;
  if (curLv >= 10) return;

  const nextLv = curLv + 1;
  const curMult = (1 + (curLv - 1) * 0.35).toFixed(2);
  const nextMult = (1 + (nextLv - 1) * 0.35).toFixed(2);
  const canAfford = (player.snowCoins || 0) >= upgradeCost;

  document.getElementById('upgrade-modal-title').textContent = `🏠 Nâng Xưởng: Cấp ${curLv} → Cấp ${nextLv}`;

  const perks = [
    `<div class="mat-chip"><span>⚡ Tốc độ Idle tự động</span><strong>x${curMult} → x${nextMult}</strong></div>`,
  ];
  if (nextLv === 3) {
    perks.push(`<div class="mat-chip"><span>📦 Mở khóa mới</span><strong>Đơn hàng 2 món (x2 Thưởng!)</strong></div>`);
  } else if (nextLv < 3) {
    perks.push(`<div class="mat-chip"><span>📦 Mốc Cấp 3</span><span class="muted">Mở khóa đơn hàng 2 món</span></div>`);
  }
  if (nextLv === 4) {
    perks.push(`<div class="mat-chip"><span>🔨 Gõ búa chạm Xưởng</span><strong>+1 → +2 nguyên liệu/lần!</strong></div>`);
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
