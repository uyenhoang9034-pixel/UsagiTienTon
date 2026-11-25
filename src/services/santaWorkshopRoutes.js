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
} from './santaWorkshopService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_ACTIVITY_DIR = path.resolve(__dirname, '../../public/santa-workshop');

const sessionCache = new Map();

async function resolveIdentityFromRequest(req) {
  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const fallbackGuildId = String(req.headers['x-guild-id'] || req.query.guildId || req.body?.guildId || 'global');

  if (bearerToken && bearerToken !== 'demo') {
    const cached = sessionCache.get(bearerToken);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        userId: cached.user.id,
        username: cached.user.global_name || cached.user.username,
        avatarUrl: cached.user.avatar
          ? `https://cdn.discordapp.com/avatars/${cached.user.id}/${cached.user.avatar}.png?size=128`
          : null,
        guildId: fallbackGuildId,
      };
    }

    try {
      const userRes = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${bearerToken}` },
        timeout: 6000,
      });
      const user = userRes.data;
      if (user?.id) {
        sessionCache.set(bearerToken, {
          user,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
        return {
          userId: user.id,
          username: user.global_name || user.username,
          avatarUrl: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : null,
          guildId: fallbackGuildId,
        };
      }
    } catch (err) {
      logger.warn('[SantaWorkshop] Không xác thực được Discord bearer token:', err?.message || err);
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
  };
}

export function registerSantaWorkshopRoutes(app, client) {
  app.use('/api/santa', express.json());

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
    res.json({
      clientId: process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
    });
  });

  app.post('/api/santa/token', async (req, res) => {
    const code = String(req.body?.code || '').trim();
    const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || '';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '';

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
      logger.error('[SantaWorkshop] OAuth2 token exchange failed:', err?.response?.data || err?.message || err);
      return res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  app.get('/api/santa/state', async (req, res) => {
    try {
      const identity = await resolveIdentityFromRequest(req);
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
  ];

  for (const [routePath, handler] of actionRoutes) {
    app.post(routePath, async (req, res) => {
      try {
        const identity = await resolveIdentityFromRequest(req);
        const result = await handler(req, identity);
        res.json(result);
      } catch (err) {
        logger.error(`[SantaWorkshop] ${routePath} error:`, err);
        res.status(500).json({ ok: false, message: 'Có lỗi xảy ra, thử lại sau nha!' });
      }
    });
  }
}
