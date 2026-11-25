const STATE = {
  token: 'demo',
  guildId: 'global',
  guestId: null,
  activeTab: 'workshop',
  data: null,
  scene: null,
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
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function initDiscordActivitySdk() {
  const params = new URLSearchParams(window.location.search);
  const inDiscordFrame = params.has('frame_id');
  if (!inDiscordFrame) {
    return;
  }

  try {
    const cfgRes = await fetch('/api/santa/config');
    const cfg = await cfgRes.json();
    if (!cfg?.clientId) return;

    const { DiscordSDK } = await import('https://esm.sh/@discord/embedded-app-sdk@1.9.0');
    const discordSdk = new DiscordSDK(cfg.clientId);
    await discordSdk.ready();

    if (discordSdk.guildId) {
      STATE.guildId = discordSdk.guildId;
    }

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
    this.drawBackground();
    this.createSnowParticles();
    this.createElfCharacter();

    this.input.on('pointerdown', (pointer) => {
      // Chỉ tính tap nếu chạm ở nửa trên sân khấu
      if (pointer.y < this.scale.height * 0.62) {
        this.playElfTapEffect(pointer.x, pointer.y);
        triggerTapCollect(pointer.x, pointer.y);
      }
    });

    this.scale.on('resize', () => {
      this.redrawLayout();
    });
  }

  drawBackground() {
    if (this.bgGroup) this.bgGroup.destroy(true);
    this.bgGroup = this.add.group();

    const w = this.scale.width;
    const h = this.scale.height;

    const g = this.add.graphics();
    // Bầu trời đêm Bắc Cực
    g.fillGradientStyle(0x0b162c, 0x0b162c, 0x1d3557, 0x1d3557, 1);
    g.fillRect(0, 0, w, h);

    // Trăng tròn
    g.fillStyle(0xfff3b0, 0.92);
    g.fillCircle(w * 0.82, h * 0.14, Math.min(w, h) * 0.06);

    // Sàn gỗ xưởng ấm áp
    const floorY = h * 0.45;
    g.fillStyle(0x5c3a21, 1);
    g.fillRect(0, floorY, w, h - floorY);
    g.fillStyle(0x7f4f24, 1);
    g.fillRect(0, floorY, w, 10);

    // Cây thông Noel bên trái
    const treeX = w * 0.18;
    const treeY = floorY;
    g.fillStyle(0x2d6a4f, 1);
    g.fillTriangle(treeX, treeY - 120, treeX - 45, treeY - 25, treeX + 45, treeY - 25);
    g.fillTriangle(treeX, treeY - 150, treeX - 34, treeY - 75, treeX + 34, treeY - 75);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(treeX, treeY - 154, 7);
    g.fillStyle(0xe63946, 1);
    g.fillCircle(treeX - 14, treeY - 60, 5);
    g.fillCircle(treeX + 16, treeY - 42, 5);

    // Bàn chế tạo bên phải
    const tableX = w * 0.72;
    g.fillStyle(0x9c6644, 1);
    g.fillRoundedRect(tableX - 48, floorY - 38, 96, 38, 6);

    this.bgGroup.add(g);
  }

  createSnowParticles() {
    const w = this.scale.width;
    const h = this.scale.height;
    for (let i = 0; i < 36; i += 1) {
      const flake = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 3),
        0xffffff,
        0.7,
      );
      flake.speedY = Phaser.Math.FloatBetween(0.4, 1.3);
      this.snowflakes.push(flake);
    }
  }

  createElfCharacter() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.elf = this.add.container(w * 0.5, h * 0.36);

    const g = this.add.graphics();
    // Thân áo xanh yêu tinh
    g.fillStyle(0x2a9d8f, 1);
    g.fillRoundedRect(-22, 0, 44, 46, 10);
    // Thắt lưng vàng
    g.fillStyle(0xffd166, 1);
    g.fillRect(-22, 22, 44, 7);
    // Mặt
    g.fillStyle(0xffd6ba, 1);
    g.fillCircle(0, -16, 20);
    // Mắt
    g.fillStyle(0x1d1d1d, 1);
    g.fillCircle(-7, -18, 3);
    g.fillCircle(7, -18, 3);
    // Má hồng
    g.fillStyle(0xff758f, 0.65);
    g.fillCircle(-12, -12, 4);
    g.fillCircle(12, -12, 4);
    // Mũ Noel đỏ
    g.fillStyle(0xe63946, 1);
    g.fillTriangle(0, -56, -22, -26, 22, -26);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-24, -30, 48, 9, 4);
    g.fillCircle(0, -58, 6);

    this.elf.add(g);

    const hint = this.add
      .text(0, 60, 'Chạm vào Xưởng để Yêu Tinh tìm nguyên liệu!', {
        fontSize: '12px',
        color: '#ffd166',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    this.elf.add(hint);

    this.tweens.add({
      targets: this.elf,
      y: this.elf.y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  redrawLayout() {
    this.drawBackground();
    if (this.elf) {
      this.elf.setPosition(this.scale.width * 0.5, this.scale.height * 0.36);
    }
  }

  playElfTapEffect(x, y, label = '✨') {
    if (this.elf) {
      this.tweens.add({
        targets: this.elf,
        scaleX: 1.12,
        scaleY: 0.9,
        duration: 90,
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

  update() {
    const w = this.scale.width;
    const h = this.scale.height;
    for (const flake of this.snowflakes) {
      flake.y += flake.speedY;
      if (flake.y > h) {
        flake.y = -4;
        flake.x = Phaser.Math.Between(0, w);
      }
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

/* ---------------- GAME ACTIONS & RENDERING ---------------- */
async function refreshState() {
  const res = await apiRequest('/api/santa/state');
  if (res?.ok && res.state) {
    STATE.data = res.state;
    renderAll();
  }
}

async function runAction(path, body = {}, tapCoords = null) {
  const res = await apiRequest(path, 'POST', body);
  if (res?.state) {
    STATE.data = res.state;
    renderAll();
  }
  if (res?.message) {
    if (tapCoords && res.ok && STATE.scene) {
      STATE.scene.playElfTapEffect(tapCoords.x, tapCoords.y, res.message);
    } else {
      showToast(res.message);
    }
  }
}

let tapLock = false;
async function triggerTapCollect(x, y) {
  if (tapLock) return;
  tapLock = true;
  setTimeout(() => {
    tapLock = false;
  }, 1100);
  await runAction('/api/santa/collect', { isTap: true }, { x, y });
}

function renderHud() {
  if (!STATE.data) return;
  const { player } = STATE.data;
  document.getElementById('player-name').textContent = player.username || 'Yêu Tinh Noel';
  document.getElementById('workshop-level').textContent = `Xưởng Cấp ${player.workshopLevel} • Đã giao ${player.totalDelivered || 0}`;
  document.getElementById('snow-coins').textContent = player.snowCoins;
  document.getElementById('reputation').textContent = player.reputation;

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

function renderPanel() {
  const container = document.getElementById('panel-content');
  const overlay = document.getElementById('panel-overlay');
  if (!STATE.data || !container) return;

  const { player, idle, recipes, materialsMeta, shopItems, leaderboard, riddle, checkedInToday, riddleSolvedToday, upgradeCost } =
    STATE.data;

  overlay.classList.toggle('compact', STATE.activeTab === 'workshop');

  if (STATE.activeTab === 'workshop') {
    const pendingList = Object.entries(idle.pending)
      .map(([k, v]) => `${materialsMeta[k].icon} ${v}`)
      .join('  ');

    container.innerHTML = `
      <div class="section-title">
        <span>🏠 Kho Nguyên Liệu Xưởng</span>
        <button class="btn btn-gold" id="btn-upgrade" ${player.workshopLevel >= 10 ? 'disabled' : ''}>
          ${player.workshopLevel >= 10 ? 'Cấp Tối Đa' : `Nâng cấp (${upgradeCost} ❄️)`}
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
          <div><strong>Sản lượng tích lũy (${idle.elapsedMinutes}/${idle.maxMinutes} phút)</strong></div>
          <div class="muted">${pendingList}</div>
        </div>
        <button class="btn btn-green" id="btn-collect">Thu hoạch</button>
      </div>
    `;
    document.getElementById('btn-collect').onclick = () => runAction('/api/santa/collect', { isTap: false });
    document.getElementById('btn-upgrade').onclick = () => runAction('/api/santa/upgrade');
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
                <div><strong>${r.icon} ${r.name}</strong> <span class="tag">Trong kho: ${player.toys[r.id] || 0}</span></div>
                <div class="muted">${reqStr}</div>
              </div>
              <button class="btn ${canCraft ? 'btn-green' : ''}" data-craft="${r.id}" ${canCraft ? '' : 'disabled'}>Chế tạo</button>
            </div>
          `;
        })
        .join('')}
    `;
    container.querySelectorAll('[data-craft]').forEach((btn) => {
      btn.onclick = () => runAction('/api/santa/craft', { toyId: btn.dataset.craft });
    });
  } else if (STATE.activeTab === 'orders') {
    container.innerHTML = `
      <div class="section-title"><span>🛷 Đơn Hàng Giáng Sinh</span></div>
      ${player.orders
        .map((ord) => {
          const recipe = recipes.find((r) => r.id === ord.toyId);
          const have = player.toys[ord.toyId] || 0;
          const canDeliver = have >= ord.qty;
          return `
            <div class="card-row">
              <div>
                <div>
                  <strong>${ord.customerIcon} ${ord.customerName}</strong>
                  ${ord.isSpecial ? '<span class="tag">Đơn Đặc Biệt x1.5</span>' : ''}
                </div>
                <div class="muted">Cần: ${ord.qty} ${recipe?.icon || ''} ${recipe?.name || ''} (Có: ${have}) • Thưởng: +${ord.rewardCoins} ❄️, +${ord.rewardRep} ⭐</div>
              </div>
              <button class="btn ${canDeliver ? 'btn-gold' : ''}" data-deliver="${ord.id}" ${canDeliver ? '' : 'disabled'}>Giao hàng</button>
            </div>
          `;
        })
        .join('')}
    `;
    container.querySelectorAll('[data-deliver]').forEach((btn) => {
      btn.onclick = () => runAction('/api/santa/deliver', { orderId: btn.dataset.deliver });
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
    document.getElementById('btn-checkin').onclick = () => runAction('/api/santa/checkin');
    container.querySelectorAll('[data-riddle]').forEach((btn) => {
      btn.onclick = () => runAction('/api/santa/riddle', { optionIndex: Number(btn.dataset.riddle) });
    });
  } else if (STATE.activeTab === 'shop') {
    container.innerHTML = `
      <div class="section-title">
        <span>🛒 Shop Giáng Sinh</span>
        <button class="btn btn-gold" id="btn-wheel">🎡 Quay số (${player.luckyTickets || 0} 🎟️)</button>
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
    document.getElementById('btn-wheel').onclick = () => runAction('/api/santa/wheel');
    container.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.onclick = () => runAction('/api/santa/shop/buy', { itemId: btn.dataset.buy });
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

function bindNavigation() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      renderPanel();
    });
  });
}

async function bootstrap() {
  STATE.guestId = getOrCreateGuestId();
  bindNavigation();
  bootPhaser();
  await initDiscordActivitySdk();
  await refreshState();
  setInterval(refreshState, 30000);
}

bootstrap();
