// Standard geographic normalization dictionary for instant, zero-latency lookup
export interface GeoLocation {
  name: string;
  code: string;
  flag: string;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

const CITY_COORDINATES: Record<string, GeoCoordinates> = {
  // India
  'pune': { lat: 18.5204, lng: 73.8567 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },

  // USA
  'boulder': { lat: 40.0150, lng: -105.2705 },
  'san mateo': { lat: 37.5630, lng: -122.3255 },
  'solana beach': { lat: 32.9912, lng: -117.2711 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'florida': { lat: 27.6648, lng: -81.5158 },
  'georgia': { lat: 32.1656, lng: -82.9001 },
  'pennsylvania': { lat: 41.2033, lng: -77.1945 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },

  // United Kingdom
  'london': { lat: 51.5074, lng: -0.1278 },
  'york': { lat: 53.9590, lng: -1.0815 },
  'lancashire': { lat: 53.8690, lng: -2.6840 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'wrexham': { lat: 53.0460, lng: -2.9930 },

  // Spain
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'valencia': { lat: 39.4699, lng: -0.3763 },
  'galicia': { lat: 42.5751, lng: -8.1339 },
  'asturias': { lat: 43.3614, lng: -5.8593 },
  'barcelona': { lat: 41.3879, lng: 2.16992 },

  // France
  'lille': { lat: 50.6292, lng: 3.0573 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'paris': { lat: 48.8566, lng: 2.3522 },

  // Germany
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'munich': { lat: 48.1351, lng: 11.5820 },
  'hamburg': { lat: 53.5511, lng: 9.9937 },

  // Switzerland
  'lugano': { lat: 46.0037, lng: 8.9511 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'geneva': { lat: 46.2044, lng: 6.1432 },

  // Turkey
  'bursa': { lat: 40.1885, lng: 29.0610 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'ankara': { lat: 39.9334, lng: 32.8597 },

  // China
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'hefei': { lat: 31.8206, lng: 117.2272 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'shenzhen': { lat: 22.5431, lng: 114.0579 },

  // Poland
  'warsaw': { lat: 52.2297, lng: 21.0122 },
  'krakow': { lat: 50.0647, lng: 19.9450 },

  // Portugal
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'porto': { lat: 41.1579, lng: -8.6291 },

  // Australia
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },

  // Canada
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'montreal': { lat: 45.5017, lng: -73.5673 },

  // Argentina
  'tucuman': { lat: -26.8083, lng: -65.2176 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },

  // UAE
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },

  // Bulgaria
  'sofia': { lat: 42.6977, lng: 23.3219 },

  // Japan
  'tokyo': { lat: 35.6762, lng: 139.6503 },
};

const COUNTRY_MAP: Record<string, GeoLocation & { coords?: GeoCoordinates }> = {
  'us': { name: 'United States', code: 'US', flag: '🇺🇸', coords: { lat: 37.0902, lng: -95.7129 } },
  'usa': { name: 'United States', code: 'US', flag: '🇺🇸', coords: { lat: 37.0902, lng: -95.7129 } },
  'united states': { name: 'United States', code: 'US', flag: '🇺🇸', coords: { lat: 37.0902, lng: -95.7129 } },
  'uk': { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', coords: { lat: 55.3781, lng: -3.4360 } },
  'united kingdom': { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', coords: { lat: 55.3781, lng: -3.4360 } },
  'england': { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', coords: { lat: 52.3555, lng: -1.1743 } },
  'in': { name: 'India', code: 'IN', flag: '🇮🇳', coords: { lat: 20.5937, lng: 78.9629 } },
  'india': { name: 'India', code: 'IN', flag: '🇮🇳', coords: { lat: 20.5937, lng: 78.9629 } },
  'de': { name: 'Germany', code: 'DE', flag: '🇩🇪', coords: { lat: 51.1657, lng: 10.4515 } },
  'germany': { name: 'Germany', code: 'DE', flag: '🇩🇪', coords: { lat: 51.1657, lng: 10.4515 } },
  'deutschland': { name: 'Germany', code: 'DE', flag: '🇩🇪', coords: { lat: 51.1657, lng: 10.4515 } },
  'fr': { name: 'France', code: 'FR', flag: '🇫🇷', coords: { lat: 46.2276, lng: 2.2137 } },
  'france': { name: 'France', code: 'FR', flag: '🇫🇷', coords: { lat: 46.2276, lng: 2.2137 } },
  'es': { name: 'Spain', code: 'ES', flag: '🇪🇸', coords: { lat: 40.4637, lng: -3.7492 } },
  'spain': { name: 'Spain', code: 'ES', flag: '🇪🇸', coords: { lat: 40.4637, lng: -3.7492 } },
  'br': { name: 'Brazil', code: 'BR', flag: '🇧🇷', coords: { lat: -14.2350, lng: -51.9253 } },
  'brazil': { name: 'Brazil', code: 'BR', flag: '🇧🇷', coords: { lat: -14.2350, lng: -51.9253 } },
  'brasil': { name: 'Brazil', code: 'BR', flag: '🇧🇷', coords: { lat: -14.2350, lng: -51.9253 } },
  'tr': { name: 'Turkey', code: 'TR', flag: '🇹🇷', coords: { lat: 38.9637, lng: 35.2433 } },
  'turkey': { name: 'Turkey', code: 'TR', flag: '🇹🇷', coords: { lat: 38.9637, lng: 35.2433 } },
  'türkiye': { name: 'Turkey', code: 'TR', flag: '🇹🇷', coords: { lat: 38.9637, lng: 35.2433 } },
  'ae': { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', coords: { lat: 23.4241, lng: 53.8478 } },
  'uae': { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', coords: { lat: 23.4241, lng: 53.8478 } },
  'dubai': { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', coords: { lat: 25.2048, lng: 55.2708 } },
  'ch': { name: 'Switzerland', code: 'CH', flag: '🇨🇭', coords: { lat: 46.8182, lng: 8.2275 } },
  'switzerland': { name: 'Switzerland', code: 'CH', flag: '🇨🇭', coords: { lat: 46.8182, lng: 8.2275 } },
  'ca': { name: 'Canada', code: 'CA', flag: '🇨🇦', coords: { lat: 56.1304, lng: -106.3468 } },
  'canada': { name: 'Canada', code: 'CA', flag: '🇨🇦', coords: { lat: 56.1304, lng: -106.3468 } },
  'au': { name: 'Australia', code: 'AU', flag: '🇦🇺', coords: { lat: -25.2744, lng: 133.7751 } },
  'australia': { name: 'Australia', code: 'AU', flag: '🇦🇺', coords: { lat: -25.2744, lng: 133.7751 } },
  'pl': { name: 'Poland', code: 'PL', flag: '🇵🇱', coords: { lat: 51.9194, lng: 19.1451 } },
  'poland': { name: 'Poland', code: 'PL', flag: '🇵🇱', coords: { lat: 51.9194, lng: 19.1451 } },
  'pt': { name: 'Portugal', code: 'PT', flag: '🇵🇹', coords: { lat: 39.3999, lng: -8.2245 } },
  'portugal': { name: 'Portugal', code: 'PT', flag: '🇵🇹', coords: { lat: 39.3999, lng: -8.2245 } },
  'nl': { name: 'Netherlands', code: 'NL', flag: '🇳🇱', coords: { lat: 52.1326, lng: 5.2913 } },
  'netherlands': { name: 'Netherlands', code: 'NL', flag: '🇳🇱', coords: { lat: 52.1326, lng: 5.2913 } },
  'se': { name: 'Sweden', code: 'SE', flag: '🇸🇪', coords: { lat: 60.1282, lng: 18.6435 } },
  'sweden': { name: 'Sweden', code: 'SE', flag: '🇸🇪', coords: { lat: 60.1282, lng: 18.6435 } },
  'fi': { name: 'Finland', code: 'FI', flag: '🇫🇮', coords: { lat: 61.9241, lng: 25.7482 } },
  'finland': { name: 'Finland', code: 'FI', flag: '🇫🇮', coords: { lat: 61.9241, lng: 25.7482 } },
  'id': { name: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: { lat: -0.7893, lng: 113.9213 } },
  'indonesia': { name: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: { lat: -0.7893, lng: 113.9213 } },
  'ar': { name: 'Argentina', code: 'AR', flag: '🇦🇷', coords: { lat: -38.4161, lng: -63.6167 } },
  'argentina': { name: 'Argentina', code: 'AR', flag: '🇦🇷', coords: { lat: -38.4161, lng: -63.6167 } },
  'cn': { name: 'China', code: 'CN', flag: '🇨🇳', coords: { lat: 35.8617, lng: 104.1954 } },
  'china': { name: 'China', code: 'CN', flag: '🇨🇳', coords: { lat: 35.8617, lng: 104.1954 } },
  'jp': { name: 'Japan', code: 'JP', flag: '🇯🇵', coords: { lat: 36.2048, lng: 138.2529 } },
  'japan': { name: 'Japan', code: 'JP', flag: '🇯🇵', coords: { lat: 36.2048, lng: 138.2529 } },
  'pk': { name: 'Pakistan', code: 'PK', flag: '🇵🇰', coords: { lat: 30.3753, lng: 69.3451 } },
  'pakistan': { name: 'Pakistan', code: 'PK', flag: '🇵🇰', coords: { lat: 30.3753, lng: 69.3451 } },
  'sg': { name: 'Singapore', code: 'SG', flag: '🇸🇬', coords: { lat: 1.3521, lng: 103.8198 } },
  'singapore': { name: 'Singapore', code: 'SG', flag: '🇸🇬', coords: { lat: 1.3521, lng: 103.8198 } },
  'mx': { name: 'Mexico', code: 'MX', flag: '🇲🇽', coords: { lat: 23.6345, lng: -102.5528 } },
  'mexico': { name: 'Mexico', code: 'MX', flag: '🇲🇽', coords: { lat: 23.6345, lng: -102.5528 } },
  'be': { name: 'Belgium', code: 'BE', flag: '🇧🇪', coords: { lat: 50.5039, lng: 4.4699 } },
  'belgium': { name: 'Belgium', code: 'BE', flag: '🇧🇪', coords: { lat: 50.5039, lng: 4.4699 } },
  'ro': { name: 'Romania', code: 'RO', flag: '🇷🇴', coords: { lat: 45.9432, lng: 24.9668 } },
  'romania': { name: 'Romania', code: 'RO', flag: '🇷🇴', coords: { lat: 45.9432, lng: 24.9668 } },
  'bg': { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', coords: { lat: 42.7339, lng: 25.4858 } },
  'bulgaria': { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', coords: { lat: 42.7339, lng: 25.4858 } },
  'il': { name: 'Israel', code: 'IL', flag: '🇮🇱', coords: { lat: 31.0461, lng: 34.8516 } },
  'israel': { name: 'Israel', code: 'IL', flag: '🇮🇱', coords: { lat: 31.0461, lng: 34.8516 } },
  'it': { name: 'Italy', code: 'IT', flag: '🇮🇹', coords: { lat: 41.8719, lng: 12.5674 } },
  'italy': { name: 'Italy', code: 'IT', flag: '🇮🇹', coords: { lat: 41.8719, lng: 12.5674 } },
};

// Words that indicate non-geographic or global locations
const GLOBAL_INDICATORS = [
  'global', 'remote', 'everywhere', 'earth', 'world', 'building in public',
  'online', 'cloud', 'promised island', 'utopia', 'mars', 'lore', 'post now',
  'anywhere', 'codex', 'here'
];

export function resolveGeo(locationStr: string): GeoLocation {
  const clean = (locationStr || '').toLowerCase().trim();
  if (!clean) return { name: 'Global', code: 'GLOBAL', flag: '🌐' };

  for (const ind of GLOBAL_INDICATORS) {
    if (clean === ind || clean.startsWith(ind + ' ') || clean.endsWith(' ' + ind)) {
      return { name: 'Global', code: 'GLOBAL', flag: '🌐' };
    }
  }

  // Try exact or parts
  for (const part of clean.split(/[,/|-]/).map(s => s.trim())) {
    if (COUNTRY_MAP[part]) {
      return { name: COUNTRY_MAP[part].name, code: COUNTRY_MAP[part].code, flag: COUNTRY_MAP[part].flag };
    }
  }

  for (const [key, val] of Object.entries(COUNTRY_MAP)) {
    if (clean.includes(key)) {
      return { name: val.name, code: val.code, flag: val.flag };
    }
  }

  return { name: 'Global', code: 'GLOBAL', flag: '🌐' };
}

// Generate small deterministic offset based on domain to disperse pins in the same city
function getJitter(seed: string = ''): { latOffset: number; lngOffset: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distance = ((Math.abs(hash >> 3) % 100) / 100) * 0.08; // small radius ~5-8km
  return {
    latOffset: Math.sin(angle) * distance,
    lngOffset: Math.cos(angle) * distance,
  };
}

export function resolveCoordinates(
  locationStr: string,
  countryName?: string,
  seedDomain?: string
): { lat: number; lng: number; isCityMatch: boolean } | null {
  const clean = (locationStr || '').toLowerCase().trim();
  if (!clean) return null;

  for (const ind of GLOBAL_INDICATORS) {
    if (clean === ind || clean.startsWith(ind + ' ') || clean.endsWith(' ' + ind)) {
      return null;
    }
  }

  // 1. Check City level match first
  for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(cityName)) {
      const jitter = getJitter(seedDomain || locationStr);
      return {
        lat: Number((coords.lat + jitter.latOffset).toFixed(5)),
        lng: Number((coords.lng + jitter.lngOffset).toFixed(5)),
        isCityMatch: true,
      };
    }
  }

  // 2. Check Country level match
  const parts = clean.split(/[,/|-]/).map(s => s.trim());
  for (const part of parts) {
    if (COUNTRY_MAP[part]?.coords) {
      const coords = COUNTRY_MAP[part].coords!;
      const jitter = getJitter(seedDomain || locationStr);
      return {
        lat: Number((coords.lat + jitter.latOffset * 1.5).toFixed(5)),
        lng: Number((coords.lng + jitter.lngOffset * 1.5).toFixed(5)),
        isCityMatch: false,
      };
    }
  }

  for (const [key, val] of Object.entries(COUNTRY_MAP)) {
    if (clean.includes(key) && val.coords) {
      const jitter = getJitter(seedDomain || locationStr);
      return {
        lat: Number((val.coords.lat + jitter.latOffset * 1.5).toFixed(5)),
        lng: Number((val.coords.lng + jitter.lngOffset * 1.5).toFixed(5)),
        isCityMatch: false,
      };
    }
  }

  // 3. Fallback to countryName if provided
  if (countryName) {
    const cClean = countryName.toLowerCase().trim();
    if (COUNTRY_MAP[cClean]?.coords) {
      const jitter = getJitter(seedDomain || locationStr);
      return {
        lat: Number((COUNTRY_MAP[cClean].coords!.lat + jitter.latOffset * 1.5).toFixed(5)),
        lng: Number((COUNTRY_MAP[cClean].coords!.lng + jitter.lngOffset * 1.5).toFixed(5)),
        isCityMatch: false,
      };
    }
  }

  return null;
}

