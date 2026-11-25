import { christmasAudio } from './audio.js';

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
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 2800);
}

async function apiRequest(path, method = 'GET', body = null) {
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
  return res.json();
}

async function initDiscordActivitySdk() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('frame_id')) return;

  try {
    const cfgRes = await fetch('/api/santa/config');
    const cfg = await cfgRes.json();
    if (!cfg?.clientId) return;

    const { DiscordSDK } = await import('https://esm.sh/@discord/embedded-app-sdk@1.9.0');
    const discordSdk = new DiscordSDK(cfg.clientId);
    await discordSdk.ready();

    if (discordSdk.guildId) STATE.guildId = discordSdk.guildId;

    const { code } = await discordSdk.commands.authorize({
      client_id: cfg.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
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
    }
  } catch (err) {
    console.warn('Discord SDK fallback to browser mode:', err);
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

    this.drawBackground();
    this.createSnowParticles();
    this.createSantaSleighFlight();
    this.createElfCharacter();
    this.syncHelpersInScene();

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

    // Cây thông Noel bên trái
    const treeX = w * 0.16;
    g.fillStyle(0x4a2c18, 1);
    g.fillRect(treeX - 8, floorY - 26, 16, 26);
    g.fillStyle(0x1b4332, 1);
    g.fillTriangle(treeX, floorY - 130, treeX - 48, floorY - 24, treeX + 48, floorY - 24);
    g.fillStyle(0x2d6a4f, 1);
    g.fillTriangle(treeX, floorY - 165, treeX - 36, floorY - 76, treeX + 36, floorY - 76);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(treeX, floorY - 169, 8);

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
    const w = this.scale.width;
    const h = this.scale.height;
    this.elf = this.add.container(w * 0.42, h * 0.52);

    const g = this.add.graphics();
    g.fillStyle(0x2a9d8f, 1);
    g.fillRoundedRect(-22, 0, 44, 46, 10);
    g.fillStyle(0xffd166, 1);
    g.fillRect(-22, 22, 44, 7);
    g.fillStyle(0xffd6ba, 1);
    g.fillCircle(0, -16, 20);
    g.fillStyle(0x1d1d1d, 1);
    g.fillCircle(-7, -18, 3);
    g.fillCircle(7, -18, 3);
    g.fillStyle(0xff758f, 0.65);
    g.fillCircle(-12, -12, 4);
    g.fillCircle(12, -12, 4);
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

  syncHelpersInScene() {
    for (const spr of this.helperSprites) spr.destroy();
    this.helperSprites = [];
    if (!STATE.data?.player?.helpers) return;

    const helpers = STATE.data.player.helpers;
    const floorY = this.scale.height * 0.64;
    const spots = [
      { key: 'lumberjack', icon: '🪓🧝', xRatio: 0.25 },
      { key: 'tailor', icon: '🪡🧝', xRatio: 0.64 },
      { key: 'mage', icon: '🪄🧝', xRatio: 0.72 },
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
        this.tweens.add({
          targets: txt,
          y: txt.y - 4,
          duration: 700,
          yoyo: true,
          repeat: -1,
        });
        this.helperSprites.push(txt);
      }
    }
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
    showToast('🔥 GIỜ CAO ĐIỂM NOEL! Chạm nhanh vào các hộp quà rơi!');

    const giftIcons = ['🎁', '🍬', '❄️', '🎀'];
    const spawnEvent = this.time.addEvent({
      delay: 420,
      repeat: 30,
      callback: () => {
        const icon = giftIcons[Math.floor(Math.random() * giftIcons.length)];
        const x = Phaser.Math.Between(36, Math.max(80, this.scale.width - 36));
        const gift = this.add
          .text(x, -20, icon, { fontSize: '30px' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        gift.on('pointerdown', () => {
          STATE.feverHits += 1;
          christmasAudio.playCoinSfx();
          this.playElfTapEffect(gift.x, gift.y, '+3 ❄️');
          gift.destroy();
        });

        this.tweens.add({
          targets: gift,
          y: this.scale.height + 30,
          duration: 2800,
          onComplete: () => gift.destroy(),
        });
      },
    });

    this.time.delayedCall(14500, async () => {
      spawnEvent.remove(false);
      STATE.feverActive = false;
      STATE.feverProgress = 0;
      updateFeverHud();
      await runAction('/api/santa/fever-claim', { hits: Math.max(3, STATE.feverHits) });
    });
  }

  redrawLayout() {
    this.drawBackground();
    if (this.elf) {
      this.elf.setPosition(this.scale.width * 0.42, this.scale.height * 0.52);
    }
    this.syncHelpersInScene();
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
    if (STATE.scene) STATE.scene.syncHelpersInScene();
  }
}

async function runAction(path, body = {}, tapCoords = null) {
  const res = await apiRequest(path, 'POST', body);
  if (res?.state) {
    STATE.data = res.state;
    renderAll();
    if (STATE.scene) STATE.scene.syncHelpersInScene();
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
    document.getElementById('btn-upgrade').onclick = async () => {
      const r = await runAction('/api/santa/upgrade');
      if (r?.ok) christmasAudio.playCraftSfx();
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
      <div class="section-title"><span>🎁 Nhiệm Vụ Hàng Ngày</span></div>
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
  } else if (STATE.activeTab === 'shop') {
    container.innerHTML = `
      <div class="section-title">
        <span>🛒 Shop Giáng Sinh</span>
        <button class="btn btn-gold btn-sm" id="btn-open-wheel">🎡 Vòng Quay (${player.luckyTickets || 0} 🎟️)</button>
      </div>
      ${shopItems
        .map((item) => {
          const ownedFrame = item.type === 'frame' && player.ownedFrames.includes(item.id);
          const equipped = item.type === 'frame' && player.equippedFrame === item.id;
          const ownedRole = item.type === 'role' && player.hasEventRole;

          let actionHtml = `<button class="btn" data-buy="${item.id}">${item.price} ❄️</button>`;
          if (ownedFrame) {
            actionHtml = equipped
              ? `<button class="btn btn-outline" data-equip="">Đang đeo</button>`
              : `<button class="btn btn-green" data-equip="${item.id}">Trang bị</button>`;
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
      <div class="section-title" style="margin-top:6px;"><span>🏆 Bảng Xếp Hạng Yêu Tinh</span></div>
      ${leaderboard
        .slice(0, 5)
        .map(
          (entry, idx) => `
        <div class="mat-chip">
          <span>#${idx + 1} ${entry.username} (Lv.${entry.workshopLevel})</span>
          <strong>⭐ ${entry.reputation} • ❄️ ${entry.snowCoins}</strong>
        </div>
      `,
        )
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
    container.querySelectorAll('[data-equip]').forEach((btn) => {
      btn.onclick = () => runAction('/api/santa/equip-frame', { frameId: btn.dataset.equip || null });
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

  document.getElementById('btn-song').addEventListener('click', () => {
    const song = christmasAudio.nextSong();
    document.getElementById('song-name').textContent = song.title;
    showToast(`🎵 Đang phát: ${song.title}`);
  });

  document.getElementById('btn-mute').addEventListener('click', () => {
    const muted = christmasAudio.toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
  });

  document.getElementById('btn-close-wheel').addEventListener('click', () => {
    if (!STATE.wheelSpinning) {
      document.getElementById('wheel-modal').classList.add('hidden');
    }
  });

  document.getElementById('btn-spin-now').addEventListener('click', spinLuckyWheel);
}

async function bootstrap() {
  STATE.guestId = getOrCreateGuestId();
  document.getElementById('song-name').textContent = christmasAudio.getCurrentSong().title;
  bindEvents();
  bootPhaser();
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
