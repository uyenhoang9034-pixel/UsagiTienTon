/**
 * Configuration & Data for Healing Whisper Booking System (J4F)
 */

export const BOOKING_ADMIN_ROLE_ID = '1545295139390619768';
export const BOOKING_SUPPORT_ROLE_ID = '1568554130371383306';
export const BOOKING_CATEGORY_ID = '1568554690923331695';
export const BOOKING_LOG_CHANNEL_ID = '1568555066976116827';

export const BOOKING_EMOJIS = {
  HEADER_L1: '<a:trangtrig50:1567818385306165301>',
  HEADER_L2: '<a:trangtrig53:1567819189866201219>',
  HEADER_R1: '<a:trangtrig51:1567818549794439229>',
  HEADER_R2: '<a:trangtrig53:1567819189866201219>',
  BULLET: '<a:trangtrig10:1546047240265797682>',
  HEART_BUTTON: {
    name: 'heartg8',
    id: '1567818755793358928',
    animated: true,
  },
  ACTION_BUTTON: {
    name: 'trangtrig31',
    id: '1546905996893626440',
    animated: true,
  },
  STATUS_CONNECTING: '<a:trangtrig6:1546043036390260756>',
  STATUS_DISCONNECTED: '<a:animeg1:1546040066676101224>',
  WARNING: '<a:trangtrig49:1567818140375851018>',
  HIT_JOKE: '<a:hitg1:1541437857049346148>',
  ROLEICON_FAIL: '<:roleicon10:1568125663762845836>',
  ROLEICON_SUCCESS: '<:roleicon8:1568124305127112714>',

  // Emojis chuẩn từ repo cho hệ thống log ticket V2
  LOG_HEADER_L: '<a:trangtrig2:1546040703375904801>',
  LOG_HEADER_R: '<a:trangtrig3:1546040818261954610>',
  LOG_BULLET: '<a:trangtrig15:1546047955696488489>',
  LOG_EXTRA: '<a:trangtrig31:1546905996893626440>',
};

/**
 * Danh sách profile cố định do admin quản lý
 */
export const HEALING_WHISPER_PROFILES = {
  '1': {
    id: '1',
    userId: '852947314481299516',
    nickname: 'Công Chúa Sắc Nâu',
    game: 'Nhận mọi game - Kéo rank thua có quạu, test tướng có toxic, chết thì không nhận lỗi giùm, thanks.',
    price: 'Deal',
    rating: '5/5',
    likes: 12,
    images: [
      'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/hw1anh1.jpg',
      'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/hw1anh2.jpg',
    ],
    localImages: [
      'assets/booking/hw1anh1.jpg',
      'assets/booking/hw1anh2.jpg',
    ],
  },
};

