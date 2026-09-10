export const GAME_ROLE_NOTIFICATION_CHANNEL_ID = '1547128793737728111';
export const GAME_ROLE_EMBED_COLOR = 0xFF9EAF;

export const GAME_ROLES = [
  { key: 'tft', label: 'TFT', roleId: '1541302682218659920', channelId: '1541298786243186739', image: 'tft.png', emoji: { name: 'TFT', id: '1547141653498962030' } },
  { key: 'valorant', label: 'VALORANT', roleId: '1541303079188824134', channelId: '1541298887158140949', image: 'valo.png', emoji: { name: 'VALORANT', id: '1547141686738821130' } },
  { key: 'goose_goose_duck', label: 'GOOSE GOOSE DUCK', roleId: '1541303290187485245', channelId: '1541298976920309840', image: 'ggd.png', emoji: { name: 'GOOSEGOOSEDUCK', id: '1547141717143191623' } },
  { key: 'lien_quan_mobile', label: 'LIÊN QUÂN MOBILE', roleId: '1541303409783611413', channelId: '1541299056922329179', image: 'lqm.png', emoji: { name: 'LIENQUANMOBILE', id: '1547141742132863068' } },
  { key: 'wuthering_waves', label: 'WUTHERING WAVES', roleId: '1547137177241133096', channelId: '1547136173707628554', image: 'ww.png', emoji: { name: 'WUTHERINGWAVES', id: '1547141897590411304' } },
  { key: 'genshin_impact', label: 'GENSHIN IMPACT', roleId: '1547136938237104148', channelId: '1547135884414029836', image: 'genshin.png', emoji: { name: 'GENSHINIMPACT', id: '1547142008936730685' } },
  { key: 'pubg', label: 'PUBG', roleId: '1547137074036084747', channelId: '1547135517739712522', image: 'pubg.png', emoji: { name: 'PUBG', id: '1547142137576038410' } },
  { key: 'roblox', label: 'ROBLOX', roleId: '1547137137885839430', channelId: '1547135661201432586', image: 'roblox.png', emoji: { name: 'ROBLOX', id: '1547142198036926464' } },
  { key: 'minecraft', label: 'MINECRAFT', roleId: '1547137027156349018', channelId: '1547135607401091193', image: 'minecraft.png', emoji: { name: 'MINECRAFT', id: '1547142255800885258' } },
  { key: 'other_games', label: 'CÁC GAME KHÁC', roleId: '1541314416052674620', channelId: '1541299196391465110', image: 'cacgamekhac.png', emoji: { name: 'cacgamekhac', id: '1547142299870306365' } },
  { key: 'no_game', label: 'KHÔNG THÍCH CHƠI GAME', roleId: '1541303573281767484', channelId: null, image: 'khongthichchoigame.png', emoji: { name: 'khongthichchoigame', id: '1547142328932634635' } },
];

export const GAME_ROLE_IDS = GAME_ROLES.map((entry) => entry.roleId);
export function getGameRoleByRoleId(roleId) { return GAME_ROLES.find((entry) => entry.roleId === roleId) ?? null; }
export function getGameRoleByEmoji(emoji) {
  if (!emoji) return null;
  return GAME_ROLES.find((entry) => entry.emoji.id ? emoji.id === entry.emoji.id : (!emoji.id && emoji.name === entry.emoji.name)) ?? null;
}
export function getReactionToken(entry) { return entry.emoji.id ?? entry.emoji.name; }
export function getEmojiDisplay(entry) { return entry.emoji.id ? `<:${entry.emoji.name}:${entry.emoji.id}>` : entry.emoji.name; }
