export const API_ENDPOINTS = {
  ANITGRAVITY_BASE: 'https://antigravity.google',
  USAGE_API: '/api/v1/usage',
  USER_INFO: '/api/v1/user'
};

export const CHROME_PATHS = [
  '%LOCALAPPDATA%\\Google\\Chrome\\User Data',
  '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data'
];

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

export const NOTIFICATION_THRESHOLDS = {
  EIGHTY: 80,
  NINETY: 90,
  NINETY_FIVE: 95,
  NINETY_NINE: 99
};

export const STATUS_BAR_PRIORITY = 100;
