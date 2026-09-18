import crypto from 'node:crypto';

export const HEAVENLY_SECRET_EMOJI = '<:trangtri1:1546093044535660644>';

export const HEAVENLY_OMENS = {
  great_fortune: { label: 'ĐẠI CÁT', emoji: '<a:trangtrig46:1547240249761996812>', weight: 10 },
  fortune: { label: 'CÁT', emoji: '<a:trangtrig46:1547240249761996812>', weight: 35 },
  neutral: { label: 'BÌNH', emoji: '<a:chiikawag12:1541429044287897632>', weight: 30 },
  misfortune: { label: 'HUNG', emoji: '<a:ttdungnham:1547489239682383902>', weight: 20 },
  great_misfortune: { label: 'ĐẠI HUNG', emoji: '<a:ttdungnham:1547489239682383902>', weight: 5 },
};

export const HEAVENLY_SECRETS = [
  { id:'linh_mach_hung_thinh', omen:'great_fortune', name:'LINH MẠCH HƯNG THỊNH', lore:'Thiên địa linh khí hội tụ, linh mạch dưới Tiên Lộ đồng loạt thức tỉnh.', effects:[['cultivation_stones',0.15],['secret_realm_essence',0.20]], lines:[['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **+15%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Bí Cảnh Tinh Hoa nhận được **+20%**']] },
  { id:'tu_khi_dong_lai', omen:'great_fortune', name:'TỬ KHÍ ĐÔNG LAI', lore:'Tử khí từ phương đông kéo đến, đạo vận thịnh vượng, bình cảnh cũng trở nên mong manh.', effects:[['cultivation_gain',0.20],['breakthrough_chance',0.05]], lines:[['<a:tttuvi:1547448737377427550>','Tu Luyện','Tu Vi nhận được **+20%**'],['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Tỷ lệ thành công **+5%**']] },
  { id:'dan_ha_chieu_the', omen:'great_fortune', name:'ĐAN HÀ CHIẾU THẾ', lore:'Đan hà phủ trời, hỏa vận tương sinh, đan lô khắp Tiên Lộ cùng lúc cộng minh.', effects:[['alchemy_success',0.12],['alchemy_quality',0.05]], lines:[['<a:trangtrig34:1546906270108827718>','Luyện Đan','Tỷ lệ thành công **+12%**'],['<a:trangtrig34:1546906270108827718>','Luyện Đan','Cơ hội phẩm chất cao **+5%**']] },
  { id:'van_bao_quy_tang', omen:'great_fortune', name:'VẠN BẢO QUY TÀNG', lore:'Bảo quang hiện thế, cổ vật ngủ sâu đồng loạt lộ ra khí tức.', effects:[['secret_realm_drop',0.20],['adventure_rare',0.10]], lines:[['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Vật phẩm nhận được **+20%**'],['<a:ttlinhthao:1547464708318167122>','Thám Hiểm','Cơ duyên vật phẩm hiếm **+10%**']] },
  { id:'thien_dia_cong_minh', omen:'great_fortune', name:'THIÊN ĐỊA CỘNG MINH', lore:'Thiên địa đồng thanh, vạn pháp hòa hợp, mọi con đường tu hành đều được thiên đạo chiếu cố.', effects:[['cultivation_gain',0.10],['cultivation_stones',0.10],['secret_realm_essence',0.10]], lines:[['<a:tttuvi:1547448737377427550>','Tu Luyện','Tu Vi nhận được **+10%**'],['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **+10%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Bí Cảnh Tinh Hoa **+10%**']] },
  { id:'linh_vu_pho_hang', omen:'fortune', name:'LINH VŨ PHỔ HÀNG', lore:'Linh vũ rơi xuống cửu thiên, tẩy rửa kinh mạch của chúng sinh.', effects:[['cultivation_gain',0.15]], lines:[['<a:tttuvi:1547448737377427550>','Tu Luyện','Tu Vi nhận được **+15%**']] },
  { id:'linh_tuyen_khai_mach', omen:'fortune', name:'LINH TUYỀN KHAI MẠCH', lore:'Linh tuyền trào dâng, linh thạch kết tinh nhanh hơn thường nhật.', effects:[['cultivation_stones',0.15]], lines:[['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **+15%**']] },
  { id:'dia_mach_to_sinh', omen:'fortune', name:'ĐỊA MẠCH TÔ SINH', lore:'Địa mạch thức tỉnh, linh khí dưới lòng đất cuồn cuộn không dứt.', effects:[['spirit_vein_production',0.20]], lines:[['<:ttlinhmach:1548968111363858484>','Linh Mạch','Sản lượng Linh Thạch **+20%**']] },
  { id:'dan_hoa_dai_thinh', omen:'fortune', name:'ĐAN HỎA ĐẠI THỊNH', lore:'Đan hỏa ổn định, dược lực dung hợp thuận theo thiên thời.', effects:[['alchemy_success',0.10]], lines:[['<a:trangtrig34:1546906270108827718>','Luyện Đan','Tỷ lệ thành công **+10%**']] },
  { id:'tinh_ha_chieu_canh', omen:'fortune', name:'TINH HÀ CHIẾU CẢNH', lore:'Tinh quang soi xuống bí cảnh, tinh hoa thiên địa ngưng tụ dày đặc.', effects:[['secret_realm_essence',0.15]], lines:[['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Bí Cảnh Tinh Hoa **+15%**']] },
  { id:'van_thu_trieu_bai', omen:'fortune', name:'VẠN THÚ TRIỀU BÁI', lore:'Vạn thú cảm ứng thiên cơ, huyết mạch linh thú trở nên hưng thịnh.', effects:[['pet_effect',0.15]], lines:[['<:ttxichviemhoadieum:1547460192122314803>','Linh Thú','Hiệu quả trợ chiến **+15%**']] },
  { id:'phuc_dia_khai_mon', omen:'fortune', name:'PHÚC ĐỊA KHAI MÔN', lore:'Phúc địa tụ linh, động phủ được thiên địa chi khí bao phủ.', effects:[['cave_effect',0.15]], lines:[['🏯','Động Phủ','Hiệu quả buff **+15%**']] },
  { id:'am_duong_luan_chuyen', omen:'neutral', name:'ÂM DƯƠNG LUÂN CHUYỂN', lore:'Âm dương đổi chỗ, được một phần đạo vận thì phải trả một phần cơ duyên.', effects:[['cultivation_gain',0.15],['cultivation_stones',-0.10]], lines:[['<a:tttuvi:1547448737377427550>','Tu Luyện','Tu Vi nhận được **+15%**'],['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **-10%**']] },
  { id:'linh_khi_nghich_luu', omen:'neutral', name:'LINH KHÍ NGHỊCH LƯU', lore:'Linh khí nghịch lưu mang theo tài nguyên dồi dào, nhưng kinh mạch phải chịu áp lực lớn hơn.', effects:[['cultivation_stones',0.20],['cultivation_stamina_cost',0.15]], lines:[['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **+20%**'],['<a:tttheluc:1547448708537262090>','Tu Luyện','Thể Lực tiêu hao **+15%**']] },
  { id:'dan_kiep_giang_lam', omen:'neutral', name:'ĐAN KIẾP GIÁNG LÂM', lore:'Đan kiếp quấy nhiễu hỏa hầu; vượt qua kiếp khí, đan thành càng dễ sinh dị phẩm.', effects:[['alchemy_success',-0.08],['alchemy_quality',0.12]], lines:[['<a:trangtrig34:1546906270108827718>','Luyện Đan','Tỷ lệ thành công **-8%**'],['<a:trangtrig34:1546906270108827718>','Luyện Đan','Cơ hội phẩm chất cao **+12%**']] },
  { id:'bi_canh_di_dong', omen:'neutral', name:'BÍ CẢNH DỊ ĐỘNG', lore:'Không gian bí cảnh rung chuyển, hung hiểm tăng cao nhưng tinh hoa cũng bộc phát.', effects:[['secret_realm_difficulty',0.15],['secret_realm_essence',0.25]], lines:[['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Độ nguy hiểm **+15%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Tinh Hoa nhận được **+25%**']] },
  { id:'yeu_trieu_thuc_tinh', omen:'neutral', name:'YÊU TRIỀU THỨC TỈNH', lore:'Yêu khí trỗi dậy nơi hoang vực, nguy hiểm và cơ duyên cùng tăng.', effects:[['adventure_difficulty',0.15],['adventure_reward',0.20]], lines:[['<a:ttlinhthao:1547464708318167122>','Thám Hiểm','Nguy hiểm **+15%**'],['<a:ttlinhthao:1547464708318167122>','Thám Hiểm','Phần thưởng **+20%**']] },
  { id:'thien_loi_loan_the', omen:'misfortune', name:'THIÊN LÔI LOẠN THẾ', lore:'Thiên lôi giáng xuống không ngừng, bình cảnh khó phá nhưng người vượt kiếp được thiên đạo bù đắp.', effects:[['breakthrough_chance',-0.08],['breakthrough_reward',0.20]], lines:[['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Tỷ lệ thành công **-8%**'],['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Thành công: thưởng **+20%**']] },
  { id:'linh_mach_kho_kiet', omen:'misfortune', name:'LINH MẠCH KHÔ KIỆT', lore:'Linh mạch mặt đất suy kiệt, cơ duyên lại dồn sâu vào các bí cảnh.', effects:[['cultivation_stones',-0.15],['secret_realm_essence',0.20]], lines:[['<a:ttlinhthach:1547448522125869126>','Tu Luyện','Linh Thạch nhận được **-15%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Tinh Hoa nhận được **+20%**']] },
  { id:'dan_hoa_phan_phe', omen:'misfortune', name:'ĐAN HỎA PHẢN PHỆ', lore:'Hỏa vận bất ổn khiến luyện đan hung hiểm, nhưng đan thành hấp thu thêm thiên địa tinh khí.', effects:[['alchemy_success',-0.12],['alchemy_reward',0.20]], lines:[['<a:trangtrig34:1546906270108827718>','Luyện Đan','Tỷ lệ thành công **-12%**'],['<a:trangtrig34:1546906270108827718>','Luyện Đan','Luyện thành công: thưởng **+20%**']] },
  { id:'hung_thu_xuat_the', omen:'misfortune', name:'HUNG THÚ XUẤT THẾ', lore:'Hung thú hấp thu dị tượng thiên địa, sức mạnh tăng vọt nhưng chiến lợi phẩm cũng phong phú.', effects:[['boss_damage',0.15],['boss_reward',0.20]], lines:[['👹','Boss Thế Giới','Sát thương gây lên Boss **-15%**'],['👹','Boss Thế Giới','Phần thưởng **+20%**']] },
  { id:'ma_trieu_giang_the', omen:'great_misfortune', name:'MA TRIỀU GIÁNG THẾ', lore:'Ma khí che trời, quần ma thức tỉnh. Một trường đại kiếp đang bao phủ Tiên Lộ.', effects:[['boss_hp',0.20],['boss_damage',0.20],['boss_reward',0.35]], lines:[['👹','Boss Thế Giới','Sinh Mệnh Boss **+20%**'],['👹','Boss Thế Giới','Sát thương gây lên Boss **-20%**'],['👹','Boss Thế Giới','Phần thưởng Boss **+35%**']] },
  { id:'thien_dao_chan_no', omen:'great_misfortune', name:'THIÊN ĐẠO CHẤN NỘ', lore:'Thiên uy khóa chặt đạo đồ, chỉ kẻ thật sự nghịch thiên mới có thể phá cảnh.', effects:[['breakthrough_chance',-0.15],['breakthrough_reward',0.40]], lines:[['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Tỷ lệ thành công **-15%**'],['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Thành công: thưởng **+40%**']] },
  { id:'cuu_u_khai_mon', omen:'great_misfortune', name:'CỬU U KHAI MÔN', lore:'Cửu U mở cửa, âm khí xâm nhập bí cảnh; hung hiểm cực thịnh, tinh hoa cũng cực thịnh.', effects:[['secret_realm_difficulty',0.25],['secret_realm_essence',0.40]], lines:[['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Độ nguy hiểm **+25%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Tinh Hoa nhận được **+40%**']] },
  { id:'van_kiep_dong_sinh', omen:'great_misfortune', name:'VẠN KIẾP ĐỒNG SINH', lore:'Thiên địa pháp tắc hỗn loạn, vạn kiếp đồng thời giáng thế. Đại đạo càng hiểm — cơ duyên ẩn trong kiếp nạn càng lớn.', effects:[['breakthrough_chance',-0.10],['breakthrough_reward',0.25],['secret_realm_difficulty',0.20],['secret_realm_essence',0.30],['boss_hp',0.15],['boss_damage',0.15],['boss_reward',0.25],['adventure_difficulty',0.15],['adventure_reward',0.25]], lines:[['<a:ttcanhgioi:1547448784924180500>','Đột Phá','Tỷ lệ thành công **-10%** · Thành công thưởng **+25%**'],['<a:ttbicanhtinhhoa:1549001027259465738>','Bí Cảnh','Nguy hiểm **+20%** · Tinh Hoa **+30%**'],['👹','Boss Thế Giới','HP **+15%** · Sát thương gây lên Boss **-15%** · Thưởng **+25%**'],['<a:ttlinhthao:1547464708318167122>','Thám Hiểm','Nguy hiểm **+15%** · Phần thưởng **+25%**']] },
];

function vnDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function seededNumber(seed) {
  return parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12), 16);
}

export function getHeavenlySecret(guildId, now = new Date()) {
  const day = vnDateKey(now);
  const seed = `${guildId || 'global'}:${day}:usagi-heavenly-secret-v1`;
  const roll = seededNumber(seed + ':omen') % 100;
  let cursor = 0;
  let omenKey = 'neutral';
  for (const [key, omen] of Object.entries(HEAVENLY_OMENS)) {
    cursor += omen.weight;
    if (roll < cursor) { omenKey = key; break; }
  }
  const pool = HEAVENLY_SECRETS.filter(x => x.omen === omenKey);
  let secret = pool[seededNumber(seed + ':secret') % pool.length];

  // Tránh cùng một Thiên Cơ xuất hiện hai ngày liên tiếp trong cùng server.
  // Không cần lưu DB: ngày trước cũng được tính từ seed cố định nên restart bot không làm đổi kết quả.
  const previousDate = new Date(now);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDay = vnDateKey(previousDate);
  const previousSeed = `${guildId || 'global'}:${previousDay}:usagi-heavenly-secret-v1`;
  const previousRoll = seededNumber(previousSeed + ':omen') % 100;
  let previousCursor = 0;
  let previousOmenKey = 'neutral';
  for (const [key, omen] of Object.entries(HEAVENLY_OMENS)) {
    previousCursor += omen.weight;
    if (previousRoll < previousCursor) { previousOmenKey = key; break; }
  }
  const previousPool = HEAVENLY_SECRETS.filter(x => x.omen === previousOmenKey);
  const previousSecret = previousPool[seededNumber(previousSeed + ':secret') % previousPool.length];

  if (secret?.id === previousSecret?.id && pool.length > 1) {
    const currentIndex = pool.findIndex(x => x.id === secret.id);
    const offset = 1 + (seededNumber(seed + ':no-repeat') % (pool.length - 1));
    secret = pool[(currentIndex + offset) % pool.length];
  }

  return { ...secret, omenData: HEAVENLY_OMENS[secret.omen], dateKey: day };
}

export function getHeavenlyModifier(guildId, key, now = new Date()) {
  const secret = getHeavenlySecret(guildId, now);
  const found = secret.effects.find(([effectKey]) => effectKey === key);
  return found ? Number(found[1]) || 0 : 0;
}

export function applyHeavenlyModifier(value, guildId, key, now = new Date()) {
  const base = Number(value) || 0;
  return Math.max(0, Math.round(base * (1 + getHeavenlyModifier(guildId, key, now))));
}

export function getNextHeavenlyReset(now = new Date()) {
  const vn = new Date(now.toLocaleString('en-US', { timeZone:'Asia/Ho_Chi_Minh' }));
  const next = new Date(vn);
  next.setHours(24,0,0,0);
  return Math.max(0, next.getTime() - vn.getTime());
}
