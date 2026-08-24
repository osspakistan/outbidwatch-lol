import type { AnalyticsUser, AnalyticsSession, AnalyticsEvent, LiveTrafficSummary, AnalyticsOverview, UserDossier, CampaignTrackItem } from '../types/analytics';
import type { DeviceInfo, GeoInfo } from '../lib/device-geo';
import { getEmojiForCodename } from '../lib/codename';
import { countryCodeToFlag } from '../lib/device-geo';

export class AnalyticsRepository {
  constructor(private db: D1Database) {}

  /**
   * Records a pageview or event hit on the server
   */
  async recordHit(params: {
    userId: string;
    sessionId: string;
    codename: string;
    path: string;
    referrer?: string;
    refTag?: string;
    utmSource?: string;
    utmCampaign?: string;
    geo: GeoInfo;
    device: DeviceInfo;
    isNewSession: boolean;
    isNewUser: boolean;
    eventType?: 'pageview' | 'click' | 'custom';
    eventName?: string;
    metadata?: any;
  }): Promise<void> {
    const {
      userId,
      sessionId,
      codename,
      path,
      referrer,
      refTag,
      utmSource,
      utmCampaign,
      geo,
      device,
      isNewSession,
      isNewUser,
      eventType = 'pageview',
      eventName = 'page_load',
      metadata
    } = params;

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    try {
      // 1. Guaranteed User Record Upsert (Ensures parent user row always exists)
      const visitIncrement = isNewSession ? 1 : 0;
      await this.db.prepare(`
        INSERT INTO analytics_users (
          id, codename, first_seen_at, last_seen_at, total_visits,
          country_code, country_name, city, region, os, browser, device_type
        ) VALUES (?, ?, datetime('now'), datetime('now'), 1, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen_at = datetime('now'),
          total_visits = total_visits + ?,
          country_code = COALESCE(excluded.country_code, country_code),
          country_name = COALESCE(excluded.country_name, country_name),
          city = COALESCE(excluded.city, city),
          region = COALESCE(excluded.region, region),
          os = COALESCE(excluded.os, os),
          browser = COALESCE(excluded.browser, browser),
          device_type = COALESCE(excluded.device_type, device_type)
      `).bind(
        userId,
        codename,
        geo.countryCode,
        geo.countryName,
        geo.city,
        geo.region,
        device.os,
        device.browser,
        device.deviceType,
        visitIncrement
      ).run();

      // 2. Guaranteed Session Record Upsert (Ensures parent session row always exists)
      const isPageView = eventType === 'pageview' ? 1 : 0;
      const isEvent = eventType !== 'pageview' ? 1 : 0;

      await this.db.prepare(`
        INSERT INTO analytics_sessions (
          id, user_id, codename, referrer, ref_tag, utm_source, utm_campaign, initial_path,
          country_code, city, os, browser, device_type,
          started_at, last_active_at, pageview_count, event_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_active_at = datetime('now'),
          ref_tag = COALESCE(excluded.ref_tag, ref_tag),
          utm_source = COALESCE(excluded.utm_source, utm_source),
          utm_campaign = COALESCE(excluded.utm_campaign, utm_campaign),
          pageview_count = pageview_count + ?,
          event_count = event_count + ?
      `).bind(
        sessionId,
        userId,
        codename,
        referrer || null,
        refTag || null,
        utmSource || null,
        utmCampaign || null,
        path,
        geo.countryCode,
        geo.city,
        device.os,
        device.browser,
        device.deviceType,
        isPageView,
        isEvent,
        isPageView,
        isEvent
      ).run();

      // 3. Insert specific Event
      await this.db.prepare(`
        INSERT INTO analytics_events (
          session_id, user_id, codename, event_type, event_name, path, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        sessionId,
        userId,
        codename,
        eventType,
        eventName,
        path,
        metadataJson
      ).run();
    } catch (err) {
      console.error('[Analytics] Failed to record hit:', err);
    }
  }

  /**
   * Get Real-time live traffic (last active within N minutes)
   */
  async getLiveTraffic(activeMinutes: number = 3): Promise<LiveTrafficSummary> {
    const timeThreshold = `-${activeMinutes} minutes`;

    // 1. Fetch active sessions with user details
    const activeSessionsSql = `
      SELECT 
        s.id AS session_id,
        s.user_id,
        s.codename,
        s.started_at,
        s.last_active_at,
        s.country_code,
        s.city,
        s.os,
        s.browser,
        s.device_type,
        u.total_visits,
        (
          SELECT e.path 
          FROM analytics_events e 
          WHERE e.session_id = s.id 
          ORDER BY e.created_at DESC, e.id DESC 
          LIMIT 1
        ) AS current_path
      FROM analytics_sessions s
      LEFT JOIN analytics_users u ON s.user_id = u.id
      WHERE s.last_active_at >= datetime('now', '${timeThreshold}')
      ORDER BY s.last_active_at DESC
      LIMIT 100
    `;

    const { results: rawSessions } = await this.db.prepare(activeSessionsSql).all<any>();

    const activeUsers = (rawSessions || []).map((row: any) => ({
      userId: row.user_id,
      codename: row.codename,
      emoji: getEmojiForCodename(row.codename),
      currentPath: row.current_path || '/',
      lastActive: row.last_active_at,
      countryCode: row.country_code || 'US',
      countryFlag: countryCodeToFlag(row.country_code),
      city: row.city || 'Global',
      os: row.os || 'Unknown',
      browser: row.browser || 'Unknown',
      deviceType: row.device_type || 'Desktop',
      isReturning: (row.total_visits || 1) > 1,
      totalVisits: row.total_visits || 1,
      sessionStartedAt: row.started_at
    }));

    // 2. Group users by active page
    const pageMap = new Map<string, { codename: string; emoji: string; countryCode: string; countryFlag: string }[]>();
    for (const u of activeUsers) {
      const p = u.currentPath;
      if (!pageMap.has(p)) {
        pageMap.set(p, []);
      }
      pageMap.get(p)!.push({
        codename: u.codename,
        emoji: u.emoji,
        countryCode: u.countryCode,
        countryFlag: u.countryFlag
      });
    }

    const activePages = Array.from(pageMap.entries()).map(([path, users]) => ({
      path,
      count: users.length,
      users
    })).sort((a, b) => b.count - a.count);

    // 3. Fetch recent events stream
    const recentEventsSql = `
      SELECT id, codename, event_type, event_name, path, metadata_json, created_at
      FROM analytics_events
      ORDER BY id DESC
      LIMIT 25
    `;
    const { results: rawEvents } = await this.db.prepare(recentEventsSql).all<any>();

    const recentEvents = (rawEvents || []).map((e: any) => {
      let meta = null;
      try {
        if (e.metadata_json) meta = JSON.parse(e.metadata_json);
      } catch {}
      return {
        id: e.id,
        codename: e.codename,
        emoji: getEmojiForCodename(e.codename),
        eventType: e.event_type,
        eventName: e.event_name,
        path: e.path,
        createdAt: e.created_at,
        metadata: meta
      };
    });

    return {
      activeCount: activeUsers.length,
      activeUsers,
      activePages,
      recentEvents
    };
  }

  /**
   * Get 24-hour summary overview
   */
  async getOverview(hours: number = 24): Promise<AnalyticsOverview> {
    const timeFilter = `-${hours} hours`;

    const [
      visitorsRes,
      sessionsRes,
      pageviewsRes,
      returningRes,
      topPagesRes,
      topReferrersRes,
      topCountriesRes,
      topCitiesRes,
      deviceRes,
      osRes,
      browserRes
    ] = await Promise.all([
      // Total Distinct Visitors
      this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as val 
        FROM analytics_events 
        WHERE created_at >= datetime('now', '${timeFilter}')
      `).first<{ val: number }>(),

      // Total Sessions
      this.db.prepare(`
        SELECT COUNT(*) as val 
        FROM analytics_sessions 
        WHERE started_at >= datetime('now', '${timeFilter}')
      `).first<{ val: number }>(),

      // Total Pageviews
      this.db.prepare(`
        SELECT COUNT(*) as val 
        FROM analytics_events 
        WHERE event_type = 'pageview' AND created_at >= datetime('now', '${timeFilter}')
      `).first<{ val: number }>(),

      // Returning Users Count
      this.db.prepare(`
        SELECT COUNT(DISTINCT u.id) as val
        FROM analytics_users u
        JOIN analytics_sessions s ON u.id = s.user_id
        WHERE u.total_visits > 1 AND s.started_at >= datetime('now', '${timeFilter}')
      `).first<{ val: number }>(),

      // Top Pages
      this.db.prepare(`
        SELECT path, COUNT(*) as views
        FROM analytics_events
        WHERE event_type = 'pageview' AND created_at >= datetime('now', '${timeFilter}')
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `).all<{ path: string; views: number }>(),

      // Top Referrers
      this.db.prepare(`
        SELECT COALESCE(NULLIF(referrer, ''), 'Direct') as referrer, COUNT(*) as count
        FROM analytics_sessions
        WHERE started_at >= datetime('now', '${timeFilter}')
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 8
      `).all<{ referrer: string; count: number }>(),

      // Top Countries
      this.db.prepare(`
        SELECT country_code, country_name, COUNT(*) as count
        FROM analytics_users
        WHERE last_seen_at >= datetime('now', '${timeFilter}') AND country_code IS NOT NULL
        GROUP BY country_code, country_name
        ORDER BY count DESC
        LIMIT 8
      `).all<{ country_code: string; country_name: string; count: number }>(),

      // Top Cities
      this.db.prepare(`
        SELECT city, country_code, COUNT(*) as count
        FROM analytics_users
        WHERE last_seen_at >= datetime('now', '${timeFilter}') AND city IS NOT NULL AND city != 'Global'
        GROUP BY city, country_code
        ORDER BY count DESC
        LIMIT 8
      `).all<{ city: string; country_code: string; count: number }>(),

      // Device Breakdown
      this.db.prepare(`
        SELECT device_type, COUNT(*) as count
        FROM analytics_sessions
        WHERE started_at >= datetime('now', '${timeFilter}') AND device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
      `).all<{ device_type: string; count: number }>(),

      // OS Breakdown
      this.db.prepare(`
        SELECT os, COUNT(*) as count
        FROM analytics_sessions
        WHERE started_at >= datetime('now', '${timeFilter}') AND os IS NOT NULL
        GROUP BY os
        ORDER BY count DESC
        LIMIT 6
      `).all<{ os: string; count: number }>(),

      // Browser Breakdown
      this.db.prepare(`
        SELECT browser, COUNT(*) as count
        FROM analytics_sessions
        WHERE started_at >= datetime('now', '${timeFilter}') AND browser IS NOT NULL
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 6
      `).all<{ browser: string; count: number }>()
    ]);

    const totalVisitors = visitorsRes?.val ?? 0;
    const totalSessions = sessionsRes?.val ?? 0;
    const totalPageviews = pageviewsRes?.val ?? 0;
    const returningVisitors = returningRes?.val ?? 0;
    const newVisitors = Math.max(totalVisitors - returningVisitors, 0);

    const rawDevices = deviceRes?.results || [];
    const totalDeviceCount = rawDevices.reduce((sum, d) => sum + d.count, 0) || 1;
    const deviceBreakdown = rawDevices.map(d => ({
      deviceType: d.device_type,
      count: d.count,
      percentage: Math.round((d.count / totalDeviceCount) * 100)
    }));

    return {
      totalVisitors,
      totalSessions,
      totalPageviews,
      returningVisitors,
      newVisitors,
      topPages: topPagesRes?.results || [],
      topReferrers: topReferrersRes?.results || [],
      topCountries: (topCountriesRes?.results || []).map(c => ({
        countryCode: c.country_code,
        countryName: c.country_name || c.country_code,
        flag: countryCodeToFlag(c.country_code),
        count: c.count
      })),
      topCities: (topCitiesRes?.results || []).map(c => ({
        city: c.city,
        countryCode: c.country_code,
        count: c.count
      })),
      deviceBreakdown,
      osBreakdown: (osRes?.results || []).map(o => ({ os: o.os, count: o.count })),
      browserBreakdown: (browserRes?.results || []).map(b => ({ browser: b.browser, count: b.count }))
    };
  }

  /**
   * Get single User Dossier by Codename or User ID
   */
  async getUserDossier(identifier: string): Promise<UserDossier | null> {
    const clean = identifier.trim();

    // Find user by codename or ID
    const user = await this.db.prepare(`
      SELECT * FROM analytics_users 
      WHERE codename = ? OR id = ?
      LIMIT 1
    `).bind(clean, clean).first<AnalyticsUser>();

    if (!user) return null;

    // Fetch user's sessions
    const { results: sessions } = await this.db.prepare(`
      SELECT * FROM analytics_sessions
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT 50
    `).bind(user.id).all<AnalyticsSession>();

    // Fetch user's events
    const { results: events } = await this.db.prepare(`
      SELECT * FROM analytics_events
      WHERE user_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT 500
    `).bind(user.id).all<AnalyticsEvent>();

    const eventsBySession = new Map<string, AnalyticsEvent[]>();
    for (const ev of events || []) {
      if (!eventsBySession.has(ev.session_id)) {
        eventsBySession.set(ev.session_id, []);
      }
      eventsBySession.get(ev.session_id)!.push(ev);
    }

    const sessionsWithEvents = (sessions || []).map(s => {
      const sEvents = eventsBySession.get(s.id) || [];
      let durationSeconds = 0;
      if (sEvents.length > 1) {
        const first = new Date(sEvents[0].created_at).getTime();
        const last = new Date(sEvents[sEvents.length - 1].created_at).getTime();
        durationSeconds = Math.max(Math.round((last - first) / 1000), 0);
      }
      return {
        ...s,
        events: sEvents,
        durationSeconds
      };
    });

    return {
      user: {
        ...user,
        emoji: getEmojiForCodename(user.codename),
        countryFlag: countryCodeToFlag(user.country_code)
      },
      sessions: sessionsWithEvents,
      totalEvents: (events || []).length
    };
  }

  /**
   * Get tracked campaign links / ref tags
   */
  async getCampaigns(): Promise<CampaignTrackItem[]> {
    const sql = `
      SELECT 
        s.id AS session_id,
        s.user_id,
        s.codename,
        s.ref_tag,
        s.utm_campaign,
        s.initial_path,
        s.started_at,
        s.last_active_at,
        s.country_code,
        s.city,
        u.country_name,
        u.region,
        u.total_visits
      FROM analytics_sessions s
      LEFT JOIN analytics_users u ON s.user_id = u.id
      WHERE s.ref_tag IS NOT NULL OR s.utm_campaign IS NOT NULL
      ORDER BY s.started_at DESC
      LIMIT 500
    `;

    const { results } = await this.db.prepare(sql).all<any>();
    if (!results || results.length === 0) return [];

    const map = new Map<string, {
      refTag: string;
      founderHandle?: string;
      totalVisits: number;
      initialPath: string;
      firstSeenAt: string;
      lastActiveAt: string;
      countryCode?: string;
      countryName?: string;
      countryFlag: string;
      city: string;
      visitorsMap: Map<string, any>;
    }>();

    for (const row of results) {
      const tag = row.ref_tag || row.utm_campaign || 'unknown';
      const cFlag = countryCodeToFlag(row.country_code);
      const cCity = row.city || 'Global';
      const cName = row.country_name || row.country_code || 'Global';

      if (!map.has(tag)) {
        let handle = undefined;
        if (tag.startsWith('x_')) {
          handle = `@${tag.replace(/^x_/, '')}`;
        }
        map.set(tag, {
          refTag: tag,
          founderHandle: handle,
          totalVisits: 0,
          initialPath: row.initial_path || '/',
          firstSeenAt: row.started_at,
          lastActiveAt: row.last_active_at,
          countryCode: row.country_code,
          countryName: cName,
          countryFlag: cFlag,
          city: cCity,
          visitorsMap: new Map()
        });
      }

      const item = map.get(tag)!;
      item.totalVisits += 1;
      if (new Date(row.started_at).getTime() < new Date(item.firstSeenAt).getTime()) {
        item.firstSeenAt = row.started_at;
      }
      if (new Date(row.last_active_at).getTime() > new Date(item.lastActiveAt).getTime()) {
        item.lastActiveAt = row.last_active_at;
      }

      if (!item.visitorsMap.has(row.user_id)) {
        item.visitorsMap.set(row.user_id, {
          userId: row.user_id,
          codename: row.codename,
          emoji: getEmojiForCodename(row.codename),
          countryFlag: cFlag,
          countryName: cName,
          city: cCity,
          isReturning: (row.total_visits || 1) > 1,
          totalVisits: row.total_visits || 1
        });
      }
    }

    return Array.from(map.values()).map(item => ({
      refTag: item.refTag,
      founderHandle: item.founderHandle,
      totalVisits: item.totalVisits,
      uniqueVisitors: item.visitorsMap.size,
      initialPath: item.initialPath,
      firstSeenAt: item.firstSeenAt,
      lastActiveAt: item.lastActiveAt,
      countryCode: item.countryCode,
      countryName: item.countryName,
      countryFlag: item.countryFlag,
      city: item.city,
      visitors: Array.from(item.visitorsMap.values())
    })).sort((a, b) => b.totalVisits - a.totalVisits);
  }

  /**
   * Get all 192 platforms and generate their 1-click tracked outreach links
   */
  async getFounderOutreachLinks(): Promise<{
    domain: string;
    siteName: string;
    founderX: string;
    flag: string;
    category: string;
    refTag: string;
    targetUrl: string;
  }[]> {
    const { results } = await this.db.prepare(`
      SELECT domain, site_name, founder_x_handle, country_flag, category
      FROM sites
      ORDER BY domain_registration_date ASC
    `).all<any>();

    return (results || []).map((s: any) => {
      const cleanHandle = (s.founder_x_handle || 'anonymous').replace(/^@/, '').trim().toLowerCase();
      const refTag = `x_${cleanHandle}`;
      const targetUrl = `https://outbidwatch.lol/boards/${encodeURIComponent(s.domain)}?ref=${encodeURIComponent(refTag)}`;
      return {
        domain: s.domain,
        siteName: s.site_name || s.domain,
        founderX: s.founder_x_handle,
        flag: s.country_flag || '🌐',
        category: s.category || 'Directory',
        refTag,
        targetUrl
      };
    });
  }
}
