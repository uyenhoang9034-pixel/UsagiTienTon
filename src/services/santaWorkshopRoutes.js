import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import axios from 'axios';
import {
  buildSantaStatePayload,
  handleSantaCollect,
  handleSantaCheckin,
  handleSantaRiddle,
  handleSantaCraft,
  handleSantaDeliver,
  handleSantaUpgrade,
  handleSantaBuyItem,
  handleSantaEquipFrame,
  handleSantaSpinWheel,
  handleSantaHireHelper,
  handleSantaFeverBonus,
  handleSantaEquipCosmetic,
  handleSantaContributeTree,
  handleSantaVisitFriend,
  handleSantaRepelGrinch,
  handleSantaClaimQuest,
  cleanupGuestSantaData,
  handleSantaAckGifts,
  handleSantaAttackBoss,
  handleSantaExchangeMaterial,
  handleSantaOpenMysteryBox,
  handleSantaFeedPet,
  handleSantaOpenAdvent,
} from './santaWorkshopService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_ACTIVITY_DIR = path.resolve(__dirname, '../../public/santa-workshop');

const sessionCache = new Map();

async function resolveIdentityFromRequest(req, client = null) {
  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const fallbackGuildId = String(req.headers['x-guild-id'] || req.query.guildId || req.body?.guildId || 'global');

  if (bearerToken && bearerToken !== 'demo') {
    let user = null;
    const cached = sessionCache.get(bearerToken);
    if (cached && cached.expiresAt > Date.now()) {
      user = cached.user;
    } else {
      try {
        const userRes = await axios.get('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${bearerToken}` },
          timeout: 6000,
        });
        if (userRes.data?.id) {
          user = userRes.data;
          sessionCache.set(bearerToken, {
            user,
            expiresAt: Date.now() + 10 * 60 * 1000,
          });
        }
      } catch (err) {
        logger.warn('[SantaWorkshop] Không xác thực được Discord bearer token:', err?.message || err);
      }
    }

    if (user?.id) {
      let displayName = user.global_name || user.username;
      let avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : null;

      if (fallbackGuildId !== 'global' && client?.guilds) {
        const guild = client.guilds.cache.get(fallbackGuildId);
        const member = guild?.members?.cache?.get(user.id) || (guild ? await guild.members.fetch(user.id).catch(() => null) : null);
        if (member) {
          displayName = member.displayName || displayName;
          if (typeof member.displayAvatarURL === 'function') {
            avatarUrl = member.displayAvatarURL({ size: 128 });
          }
        }
      }

      return {
        userId: user.id,
        username: displayName,
        avatarUrl,
        guildId: fallbackGuildId,
        partySize: Math.max(1, Math.min(10, Number(req.headers['x-party-size']) || 1)),
      };
    }
  }

  // Fallback demo mode khi mở trực tiếp trên trình duyệt ngoài Discord
  const guestId = String(req.headers['x-guest-id'] || req.query.guestId || req.body?.guestId || 'guest_elf_01')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40) || 'guest_elf_01';

  return {
    userId: guestId,
    username: String(req.headers['x-guest-name'] || req.body?.guestName || 'Yêu Tinh Noel').slice(0, 32),
    avatarUrl: null,
    guildId: fallbackGuildId,
    partySize: Math.max(1, Math.min(10, Number(req.headers['x-party-size']) || 1)),
  };
}

export function registerSantaWorkshopRoutes(app, client) {
  let didCleanupGuests = false;
  app.use('/api/santa', express.json());
  app.use('/api/santa', (_req, _res, next) => {
    if (!didCleanupGuests) {
      didCleanupGuests = true;
      cleanupGuestSantaData(client).catch(() => {});
    }
    next();
  });

  // Cho phép nhúng vào iframe của Discord Activity & tắt cache để luôn nhận bản mới nhất
  app.use('/activity', (_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://discord.com https://*.discord.com https://*.discordsays.com;",
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.use('/activity', express.static(PUBLIC_ACTIVITY_DIR, { etag: false, maxAge: 0 }));

  app.get('/api/santa/config', (_req, res) => {
    const clientId = String(
      client?.config?.bot?.clientId || process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
    ).trim();
    res.json({ clientId });
  });

  app.post('/api/santa/token', async (req, res) => {
    const code = String(req.body?.code || '').trim();
    const clientId = String(
      client?.config?.bot?.clientId || process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
    ).trim();
    const clientSecret = String(
      process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '',
    ).trim();

    if (!code) {
      return res.status(400).json({ error: 'Missing OAuth2 code' });
    }
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Server missing CLIENT_ID or DISCORD_CLIENT_SECRET' });
    }

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      });

      const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000,
      });

      const accessToken = tokenRes.data?.access_token;
      if (!accessToken) {
        return res.status(502).json({ error: 'No access_token returned from Discord' });
      }

      const userRes = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 6000,
      });

      sessionCache.set(accessToken, {
        user: userRes.data,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return res.json({ access_token: accessToken, user: userRes.data });
    } catch (err) {
      const detail = err?.response?.data?.error_description || err?.response?.data?.error || err?.message || 'Unknown';
      logger.error('[SantaWorkshop] OAuth2 token exchange failed:', err?.response?.data || err?.message || err);
      return res.status(500).json({ error: `Token exchange failed: ${detail}` });
    }
  });

  app.get('/api/santa/state', async (req, res) => {
    try {
      const identity = await resolveIdentityFromRequest(req, client);
      const state = await buildSantaStatePayload(client, identity);
      res.json({ ok: true, state });
    } catch (err) {
      logger.error('[SantaWorkshop] /api/santa/state error:', err);
      res.status(500).json({ ok: false, message: 'Lỗi tải dữ liệu Xưởng Quà Noel.' });
    }
  });

  const actionRoutes = [
    ['/api/santa/collect', (req, id) => handleSantaCollect(client, id, { isTap: Boolean(req.body?.isTap) })],
    ['/api/santa/checkin', (_req, id) => handleSantaCheckin(client, id)],
    ['/api/santa/riddle', (req, id) => handleSantaRiddle(client, id, req.body?.optionIndex)],
    ['/api/santa/craft', (req, id) => handleSantaCraft(client, id, req.body?.toyId)],
    ['/api/santa/deliver', (req, id) => handleSantaDeliver(client, id, req.body?.orderId)],
    ['/api/santa/upgrade', (_req, id) => handleSantaUpgrade(client, id)],
    ['/api/santa/shop/buy', (req, id) => handleSantaBuyItem(client, id, req.body?.itemId)],
    ['/api/santa/equip-frame', (req, id) => handleSantaEquipFrame(client, id, req.body?.frameId)],
    ['/api/santa/wheel', (_req, id) => handleSantaSpinWheel(client, id)],
    ['/api/santa/hire-helper', (req, id) => handleSantaHireHelper(client, id, req.body?.helperId)],
    ['/api/santa/fever-claim', (req, id) => handleSantaFeverBonus(client, id, { hits: req.body?.hits })],
    ['/api/santa/equip', (req, id) => handleSantaEquipCosmetic(client, id, { kind: req.body?.kind, itemId: req.body?.itemId })],
    ['/api/santa/tree/contribute', (req, id) => handleSantaContributeTree(client, id, { mode: req.body?.mode, toyId: req.body?.toyId })],
    ['/api/santa/friend/visit', (req, id) => handleSantaVisitFriend(client, id, { targetUserId: req.body?.targetUserId, action: req.body?.action, toyId: req.body?.toyId })],
    ['/api/santa/grinch-repel', (_req, id) => handleSantaRepelGrinch(client, id)],
    ['/api/santa/quest/claim', (req, id) => handleSantaClaimQuest(client, id, req.body?.questId)],
    ['/api/santa/ack-gifts', (_req, id) => handleSantaAckGifts(client, id)],
    ['/api/santa/boss/attack', (req, id) => handleSantaAttackBoss(client, id, { mode: req.body?.mode, toyId: req.body?.toyId })],
    ['/api/santa/market/exchange', (req, id) => handleSantaExchangeMaterial(client, id, { fromMat: req.body?.fromMat, toMat: req.body?.toMat, mode: req.body?.mode })],
    ['/api/santa/mystery-box', (_req, id) => handleSantaOpenMysteryBox(client, id)],
    ['/api/santa/pet/feed', (req, id) => handleSantaFeedPet(client, id, { mode: req.body?.mode, toyId: req.body?.toyId })],
    ['/api/santa/advent/open', (req, id) => handleSantaOpenAdvent(client, id, req.body?.dayNumber)],
  ];

  for (const [routePath, handler] of actionRoutes) {
    app.post(routePath, async (req, res) => {
      try {
        const identity = await resolveIdentityFromRequest(req, client);
        const result = await handler(req, identity);
        res.json(result);
      } catch (err) {
        logger.error(`[SantaWorkshop] ${routePath} error:`, err);
        res.status(500).json({ ok: false, message: 'Có lỗi xảy ra, thử lại sau nha!' });
      }
    });
  }
}
