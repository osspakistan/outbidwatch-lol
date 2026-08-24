export interface AnalyticsUser {
  id: string;
  codename: string;
  first_seen_at: string;
  last_seen_at: string;
  total_visits: number;
  country_code?: string;
  country_name?: string;
  city?: string;
  region?: string;
  os?: string;
  browser?: string;
  device_type?: string;
}

export interface AnalyticsSession {
  id: string;
  user_id: string;
  codename: string;
  referrer?: string;
  ref_tag?: string;
  utm_source?: string;
  utm_campaign?: string;
  initial_path: string;
  country_code?: string;
  city?: string;
  os?: string;
  browser?: string;
  device_type?: string;
  started_at: string;
  last_active_at: string;
  pageview_count: number;
  event_count: number;
}

export interface CampaignTrackItem {
  refTag: string;
  founderHandle?: string;
  totalVisits: number;
  uniqueVisitors: number;
  initialPath: string;
  firstSeenAt: string;
  lastActiveAt: string;
  countryCode?: string;
  countryName?: string;
  countryFlag: string;
  city: string;
  visitors: {
    userId: string;
    codename: string;
    emoji: string;
    countryFlag: string;
    countryName?: string;
    city: string;
    isReturning: boolean;
    totalVisits: number;
  }[];
}

export interface AnalyticsEvent {
  id?: number;
  session_id: string;
  user_id: string;
  codename: string;
  event_type: 'pageview' | 'click' | 'custom';
  event_name: string;
  path: string;
  metadata_json?: string;
  created_at: string;
}

export interface LiveActiveUser {
  userId: string;
  codename: string;
  emoji: string;
  currentPath: string;
  lastActive: string;
  countryCode: string;
  countryFlag: string;
  city: string;
  os: string;
  browser: string;
  deviceType: string;
  isReturning: boolean;
  totalVisits: number;
  sessionStartedAt: string;
}

export interface LiveTrafficSummary {
  activeCount: number;
  activeUsers: LiveActiveUser[];
  activePages: {
    path: string;
    count: number;
    users: { codename: string; emoji: string; countryCode: string; countryFlag: string }[];
  }[];
  recentEvents: {
    id: number;
    codename: string;
    emoji: string;
    eventType: string;
    eventName: string;
    path: string;
    createdAt: string;
    metadata?: any;
  }[];
}

export interface AnalyticsOverview {
  totalVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  returningVisitors: number;
  newVisitors: number;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; count: number }[];
  topCountries: { countryCode: string; countryName: string; flag: string; count: number }[];
  topCities: { city: string; countryCode: string; count: number }[];
  deviceBreakdown: { deviceType: string; count: number; percentage: number }[];
  osBreakdown: { os: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
}

export interface UserDossier {
  user: AnalyticsUser & { emoji: string; countryFlag: string };
  sessions: (AnalyticsSession & { events: AnalyticsEvent[]; durationSeconds: number })[];
  totalEvents: number;
}
