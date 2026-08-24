export interface DeviceInfo {
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot';
  os: string;
  browser: string;
  isBot: boolean;
}

export interface GeoInfo {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  city: string;
  region: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

// Convert 2-letter ISO country code to Emoji Flag
export function countryCodeToFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2 || countryCode === 'XX' || countryCode === 'GLOBAL') {
    return '🌐';
  }
  const code = countryCode.toUpperCase();
  const first = code.charCodeAt(0) - 65 + 0x1F1E6;
  const second = code.charCodeAt(1) - 65 + 0x1F1E6;
  try {
    return String.fromCodePoint(first, second);
  } catch {
    return '🌐';
  }
}

export function parseDevice(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent || '';

  // 1. Detect Bots
  const botPattern = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discordbot|twitterbot|headless|prerender|lighthouse|pingdom|google-inspectiontool|curl|wget|python-requests/i;
  if (botPattern.test(ua)) {
    return {
      deviceType: 'Bot',
      os: 'Bot',
      browser: 'Crawler / Bot',
      isBot: true,
    };
  }

  // 2. Detect OS
  let os = 'Unknown OS';
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = /ipad/i.test(ua) ? 'iPadOS' : 'iOS';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/windows nt 10/i.test(ua) || /windows nt 11/i.test(ua)) {
    os = 'Windows';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
  }

  // 3. Detect Browser
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera\//i.test(ua)) {
    browser = 'Opera';
  } else if (/brave/i.test(ua)) {
    browser = 'Brave';
  } else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  }

  // 4. Detect Device Type
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android/i.test(ua)) {
    deviceType = 'Mobile';
  }

  return {
    deviceType,
    os,
    browser,
    isBot: false,
  };
}

export function parseGeo(cf: any, headers?: Headers): GeoInfo {
  const countryCode = cf?.country || headers?.get('cf-ipcountry') || 'US';
  const city = cf?.city || headers?.get('cf-ipcity') || 'San Francisco';
  const region = cf?.region || cf?.regionCode || 'CA';
  const countryFlag = countryCodeToFlag(countryCode);

  return {
    countryCode: countryCode.toUpperCase(),
    countryName: cf?.country || countryCode,
    countryFlag,
    city: city || 'Global',
    region: region || '',
    postalCode: cf?.postalCode,
    latitude: cf?.latitude ? String(cf.latitude) : undefined,
    longitude: cf?.longitude ? String(cf.longitude) : undefined,
    timezone: cf?.timezone || 'UTC',
  };
}
