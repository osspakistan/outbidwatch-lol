import type { Site, SiteFilters, Submission, SubmissionInput, SubmissionStatus, ApproveSubmissionPayload } from '../types/site';
import type { DirectoryStats, PaginationMeta } from '../types/api';
import { resolveGeo } from '../lib/geo';
import { AnalyticsRepository } from './analytics-queries';

export class DbRepository {
  public readonly analytics: AnalyticsRepository;

  constructor(private db: D1Database) {
    this.analytics = new AnalyticsRepository(db);
  }

  async listSites(filters: SiteFilters = {}): Promise<{ sites: Site[]; meta: PaginationMeta }> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.category) {
      conditions.push(`category = ?`);
      params.push(filters.category);
    }

    if (filters.country_code) {
      conditions.push(`country_code = ?`);
      params.push(filters.country_code.toUpperCase());
    }

    if (filters.status) {
      conditions.push(`status = ?`);
      params.push(filters.status.toLowerCase());
    }

    if (filters.currency) {
      conditions.push(`currency = ?`);
      params.push(filters.currency.toUpperCase());
    }

    if (filters.provenance) {
      conditions.push(`location_provenance = ?`);
      params.push(filters.provenance.toLowerCase());
    }

    if (filters.q) {
      const searchParam = `%${filters.q.trim()}%`;
      conditions.push(`(
        domain LIKE ? OR
        site_name LIKE ? OR
        raw_title LIKE ? OR
        raw_description LIKE ? OR
        summary_256 LIKE ? OR
        founder_x_handle LIKE ? OR
        founder_location LIKE ? OR
        country_name LIKE ?
      )`);
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM sites ${whereClause}`;
    const countResult = await this.db.prepare(countSql).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 250);
    const page = Math.max(Number(filters.page) || 1, 1);
    const offset = filters.offset !== undefined ? Number(filters.offset) : (page - 1) * limit;

    let orderByColumn = 'domain_registration_date';
    if (filters.order_by === 'created_at') orderByColumn = 'created_at';
    if (filters.order_by === 'site_name') orderByColumn = 'site_name';
    if (filters.order_by === 'category') orderByColumn = 'category';

    const orderDir = (filters.order_dir?.toLowerCase() === 'desc') ? 'DESC' : 'ASC';

    const querySql = `
      SELECT * FROM sites
      ${whereClause}
      ORDER BY ${orderByColumn} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const { results } = await this.db.prepare(querySql).bind(...queryParams).all<Site>();

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      sites: results || [],
      meta: {
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      },
    };
  }

  async getSiteBySlug(slug: string): Promise<Site | null> {
    const result = await this.db
      .prepare(`SELECT * FROM sites WHERE slug = ?`)
      .bind(slug.toLowerCase().trim())
      .first<Site>();
    return result || null;
  }

  /**
   * Increment per-board view counters.
   * Called from BOTH the SSR /boards/:domain route and the client SPA openBoardProfile() flow.
   * `userId` is the analytics uid (cookie ob_uid); if null we only bump total_views.
   */
  async recordBoardView(slug: string, userId: string | null): Promise<{ total_views: number; unique_viewers: number }> {
    const cleanSlug = slug.toLowerCase().trim();
    try {
      // 1. Always bump total_views on the aggregate row
      await this.db.prepare(`
        INSERT INTO board_view_counts (slug, total_views, unique_viewers, last_viewed_at)
        VALUES (?, 1, 0, datetime('now'))
        ON CONFLICT(slug) DO UPDATE SET
          total_views = total_views + 1,
          last_viewed_at = datetime('now')
      `).bind(cleanSlug).run();

      // 2. If we have a userId, mark them as a viewer (PK protects against double-counting)
      if (userId) {
        const inserted = await this.db.prepare(`
          INSERT INTO board_view_viewers (slug, user_id)
          VALUES (?, ?)
          ON CONFLICT(slug, user_id) DO NOTHING
        `).bind(cleanSlug, userId).run();

        const meta: any = inserted?.meta || {};
        const changes = typeof meta.changes === 'number' ? meta.changes : 0;
        if (changes > 0) {
          await this.db.prepare(`
            UPDATE board_view_counts
            SET unique_viewers = unique_viewers + 1
            WHERE slug = ?
          `).bind(cleanSlug).run();
        }
      }

      const row = await this.db.prepare(`
        SELECT total_views, unique_viewers FROM board_view_counts WHERE slug = ?
      `).bind(cleanSlug).first<{ total_views: number; unique_viewers: number }>();

      return {
        total_views: row?.total_views ?? 1,
        unique_viewers: row?.unique_viewers ?? 0,
      };
    } catch (err) {
      console.warn('[recordBoardView]', err);
      return { total_views: 0, unique_viewers: 0 };
    }
  }

  /**
   * Bulk-fetch view counts for a list of slugs (used by the directory view).
   * Returns Map<slug, { total_views, unique_viewers }>; missing rows are absent.
   */
  async getBoardViews(slugs: string[]): Promise<Map<string, { total_views: number; unique_viewers: number }>> {
    const map = new Map<string, { total_views: number; unique_viewers: number }>();
    if (!slugs.length) return map;

    const cleanSlugs = [...new Set(slugs.map((s) => s.toLowerCase().trim()))].filter(Boolean);
    if (!cleanSlugs.length) return map;

    try {
      const placeholders = cleanSlugs.map(() => '?').join(',');
      const { results } = await this.db
        .prepare(`SELECT slug, total_views, unique_viewers FROM board_view_counts WHERE slug IN (${placeholders})`)
        .bind(...cleanSlugs)
        .all<{ slug: string; total_views: number; unique_viewers: number }>();

      for (const r of results || []) {
        map.set(r.slug, { total_views: r.total_views, unique_viewers: r.unique_viewers });
      }
    } catch (err) {
      console.warn('[getBoardViews]', err);
    }
    return map;
  }

  async getSiteByDomain(domain: string): Promise<Site | null> {
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    const result = await this.db
      .prepare(`SELECT * FROM sites WHERE domain = ?`)
      .bind(cleanDomain)
      .first<Site>();
    return result || null;
  }

  async getStats(): Promise<DirectoryStats> {
    const totalRow = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live_count,
          SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) as dead_count,
          SUM(CASE WHEN founder_x_handle IS NOT NULL AND founder_x_handle != 'null' THEN 1 ELSE 0 END) as verified_founders
        FROM sites
      `)
      .first<{ total: number; live_count: number; dead_count: number; verified_founders: number }>();

    const total = totalRow?.total || 0;
    const liveCount = totalRow?.live_count || 0;
    const deadCount = totalRow?.dead_count || 0;
    const verifiedFounders = totalRow?.verified_founders || 0;

    const { results: categoryRows } = await this.db
      .prepare(`
        SELECT category, COUNT(*) as count 
        FROM sites 
        GROUP BY category 
        ORDER BY count DESC
      `)
      .all<{ category: string; count: number }>();

    const categories = (categoryRows || []).map(r => ({
      category: r.category,
      count: r.count,
      percentage: total > 0 ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    }));

    const { results: countryRows } = await this.db
      .prepare(`
        SELECT country_name, country_code, country_flag, COUNT(*) as count 
        FROM sites 
        GROUP BY country_code 
        ORDER BY count DESC
      `)
      .all<{ country_name: string; country_code: string; country_flag: string; count: number }>();

    const { results: currencyRows } = await this.db
      .prepare(`
        SELECT currency, COUNT(*) as count 
        FROM sites 
        GROUP BY currency 
        ORDER BY count DESC
      `)
      .all<{ currency: string; count: number }>();

    const { results: provenanceRows } = await this.db
      .prepare(`
        SELECT location_provenance as provenance, COUNT(*) as count 
        FROM sites 
        GROUP BY location_provenance 
        ORDER BY count DESC
      `)
      .all<{ provenance: string; count: number }>();

    const oldestRow = await this.db
      .prepare(`SELECT domain, domain_registration_date FROM sites ORDER BY domain_registration_date ASC LIMIT 1`)
      .first<{ domain: string; domain_registration_date: string }>();

    const newestRow = await this.db
      .prepare(`SELECT domain, domain_registration_date FROM sites ORDER BY domain_registration_date DESC LIMIT 1`)
      .first<{ domain: string; domain_registration_date: string }>();

    return {
      total_sites: total,
      live_sites: liveCount,
      dead_sites: deadCount,
      verified_founders_count: verifiedFounders,
      verified_founders_percentage: total > 0 ? Number(((verifiedFounders / total) * 100).toFixed(1)) : 100,
      categories,
      countries: countryRows || [],
      currencies: currencyRows || [],
      provenance: provenanceRows || [],
      oldest_domain: oldestRow ? { domain: oldestRow.domain, registration_date: oldestRow.domain_registration_date } : null,
      newest_domain: newestRow ? { domain: newestRow.domain, registration_date: newestRow.domain_registration_date } : null,
    };
  }

  async getCategories() {
    const { results } = await this.db
      .prepare(`
        SELECT category, COUNT(*) as count,
          SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live_count
        FROM sites
        GROUP BY category
        ORDER BY count DESC
      `)
      .all<{ category: string; count: number; live_count: number }>();
    return results || [];
  }

  async getCountries() {
    const { results } = await this.db
      .prepare(`
        SELECT country_name, country_code, country_flag, COUNT(*) as count
        FROM sites
        GROUP BY country_code
        ORDER BY count DESC
      `)
      .all<{ country_name: string; country_code: string; country_flag: string; count: number }>();
    return results || [];
  }

  async getCurrencies() {
    const { results } = await this.db
      .prepare(`
        SELECT currency, COUNT(*) as count
        FROM sites
        GROUP BY currency
        ORDER BY count DESC
      `)
      .all<{ currency: string; count: number }>();
    return results || [];
  }

  // SUBMISSIONS
  async checkDomainStatus(domain: string): Promise<{
    exists: boolean;
    location: 'sites' | 'submissions' | 'none';
    data?: any;
    message: string;
  }> {
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();

    const site = await this.getSiteByDomain(cleanDomain);
    if (site) {
      return {
        exists: true,
        location: 'sites',
        data: { slug: site.slug, domain: site.domain, status: site.status },
        message: `Platform '${cleanDomain}' is already indexed in OutbidWatch`,
      };
    }

    const submission = await this.db
      .prepare(`SELECT * FROM submissions WHERE domain = ? AND status = 'pending'`)
      .bind(cleanDomain)
      .first<Submission>();

    if (submission) {
      return {
        exists: true,
        location: 'submissions',
        data: { id: submission.id, domain: submission.domain, status: submission.status },
        message: `Platform '${cleanDomain}' is already pending review in the submissions queue`,
      };
    }

    return {
      exists: false,
      location: 'none',
      message: `Domain '${cleanDomain}' is available for submission`,
    };
  }

  async createSubmission(input: SubmissionInput): Promise<Submission> {
    const cleanUrl = input.url.trim().startsWith('http') ? input.url.trim() : `https://${input.url.trim()}`;
    const domain = new URL(cleanUrl).hostname.replace(/^www\./, '').toLowerCase();
    const cleanHandle = input.founder_x_handle.replace(/^@/, '').trim();
    const cleanCurrency = (input.currency || 'USD').toUpperCase().trim();
    const id = crypto.randomUUID();

    await this.db
      .prepare(`
        INSERT INTO submissions (
          id, domain, url, founder_x_handle, founder_location,
          launch_date, currency, submitter_note, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, 'pending', datetime('now'), datetime('now')
        )
      `)
      .bind(
        id,
        domain,
        cleanUrl,
        cleanHandle,
        input.location.trim(),
        input.launch_date.trim(),
        cleanCurrency,
        input.submitter_note || null
      )
      .run();

    const created = await this.db
      .prepare(`SELECT * FROM submissions WHERE id = ?`)
      .bind(id)
      .first<Submission>();

    return created!;
  }

  async listSubmissions(status: SubmissionStatus = 'pending'): Promise<Submission[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC`)
      .bind(status)
      .all<Submission>();
    return results || [];
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    const result = await this.db
      .prepare(`SELECT * FROM submissions WHERE id = ?`)
      .bind(id)
      .first<Submission>();
    return result || null;
  }

  async approveSubmission(id: string, payload: ApproveSubmissionPayload): Promise<Site> {
    const submission = await this.getSubmissionById(id);
    if (!submission) {
      throw new Error(`Submission with id '${id}' not found`);
    }

    const geo = resolveGeo(submission.founder_location);
    const domain = submission.domain;
    const slug = domain.replace(/\./g, '-').toLowerCase();
    const siteId = slug;

    const cleanSummary = payload.summary_256.replace(/—|–/g, ', ').slice(0, 256).trim();
    const regDate = payload.domain_registration_date || submission.launch_date;
    const currency = payload.currency || submission.currency || 'USD';
    const siteName = payload.site_name || domain;
    const rawTitle = payload.raw_title || siteName;
    const rawDesc = payload.raw_description || cleanSummary;
    const locationNotes = `Self-reported by founder @${submission.founder_x_handle} during submission.`;

    await this.db
      .prepare(`
        INSERT OR REPLACE INTO sites (
          id, slug, domain, site_name, raw_title, raw_description, url, category, founder_x_handle,
          founder_location, country_name, country_code, country_flag,
          location_provenance, location_notes, summary_256,
          domain_registration_date, logo_url, currency, status,
          workflow_status, date_found, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          'self_reported', ?, ?,
          ?, ?, ?, 'live',
          'complete', datetime('now'), datetime('now'), datetime('now')
        )
      `)
      .bind(
        siteId,
        slug,
        domain,
        siteName,
        rawTitle,
        rawDesc,
        submission.url,
        payload.category,
        submission.founder_x_handle,
        submission.founder_location,
        geo.name,
        geo.code,
        geo.flag,
        locationNotes,
        cleanSummary,
        regDate,
        `/api/logos/${encodeURIComponent(domain)}.png`,
        currency
      )
      .run();

    await this.db
      .prepare(`UPDATE submissions SET status = 'approved', updated_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();

    const site = await this.getSiteBySlug(slug);
    return site!;
  }

  async rejectSubmission(id: string, reason: string): Promise<Submission> {
    await this.db
      .prepare(`
        UPDATE submissions 
        SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now') 
        WHERE id = ?
      `)
      .bind(reason.trim(), id)
      .run();

    const updated = await this.getSubmissionById(id);
    if (!updated) throw new Error(`Submission '${id}' not found`);
    return updated;
  }

  /**
   * Public-safe recent submissions across all statuses, newest first.
   * Excludes submitter_note (may contain private context).
   */
  async listRecentSubmissions(limit = 50): Promise<Submission[]> {
    const capped = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const { results } = await this.db
      .prepare(`
        SELECT id, domain, url, founder_x_handle, founder_location,
               launch_date, currency, status, rejection_reason, created_at
        FROM submissions
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(capped)
      .all<Submission>();
    return results || [];
  }

  async getTimelineCache(key: string): Promise<{ id: string; query: string; tweets_json: string; cached_at: string } | null> {
    try {
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS timeline_cache (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          tweets_json TEXT NOT NULL,
          cached_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      const result = await this.db
        .prepare(`SELECT * FROM timeline_cache WHERE id = ?`)
        .bind(key)
        .first<{ id: string; query: string; tweets_json: string; cached_at: string }>();

      return result ?? null;
    } catch {
      return null;
    }
  }

  async setTimelineCache(key: string, query: string, tweetsJson: string): Promise<void> {
    try {
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS timeline_cache (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          tweets_json TEXT NOT NULL,
          cached_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      await this.db
        .prepare(`
          INSERT INTO timeline_cache (id, query, tweets_json, cached_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            query = excluded.query,
            tweets_json = excluded.tweets_json,
            cached_at = datetime('now')
        `)
        .bind(key, query, tweetsJson)
        .run();
    } catch (err) {
      console.warn('[Timeline Cache Error]', err);
    }
  }
}
