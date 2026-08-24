import type { Env } from '../types/env';
import { getDb } from '../db/index';

export interface TimelineTweet {
  id: string;
  text: string;
  created_at: string;
  author_name: string;
  author_username: string;
  author_profile_image?: string;
  author_verified?: boolean;
  url: string;
  media_url?: string;
  media_type?: 'photo' | 'video';
  video_url?: string;
  urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
  metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
  };
}

export interface TimelineResult {
  tweets: TimelineTweet[];
  source: 'cache' | 'treg' | 'api' | 'fallback';
  cached_at: string;
  query: string;
}

export const TIMELINE_QUERIES = [
  'outbid.lol OR "pay to outbid"',
  '@jonathan_wilke'
];
export const TIMELINE_QUERY = 'outbid.lol OR "pay to outbid" OR @jonathan_wilke';
const CACHE_KEY = 'x_search_outbid_v4';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (12 cycles / day)

const FALLBACK_TWEETS: TimelineTweet[] = [
  {
    id: '1826991000000000001',
    text: 'Shipped a vertical leaderboard for indie makers. The bidding mechanic picked up immediate activity, hitting $120 in the first three hours.',
    created_at: '2026-08-24T08:30:00Z',
    author_name: 'Indie Builder',
    author_username: 'indiebuilder',
    author_profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces',
    author_verified: true,
    url: 'https://x.com/indiebuilder/status/1826991000000000001',
    metrics: { retweet_count: 5, reply_count: 8, like_count: 42 },
  },
  {
    id: '1826991000000000002',
    text: 'Discussing bid competition on outbid.lol, noting the top price jumped twice in one afternoon as bidders competed for rank #1.',
    created_at: '2026-08-24T06:15:00Z',
    author_name: 'Startup Watcher',
    author_username: 'startupwatcher',
    author_profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces',
    author_verified: false,
    url: 'https://x.com/startupwatcher/status/1826991000000000002',
    metrics: { retweet_count: 2, reply_count: 4, like_count: 19 },
  },
  {
    id: '1826991000000000003',
    text: 'Shared an analysis on why pay-to-outbid boards spread quickly, pointing to low operating overhead and quick feedback loops for creators.',
    created_at: '2026-08-24T03:45:00Z',
    author_name: 'Growth Hacker',
    author_username: 'growthhacker',
    author_profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces',
    author_verified: true,
    url: 'https://x.com/growthhacker/status/1826991000000000003',
    metrics: { retweet_count: 14, reply_count: 12, like_count: 89 },
  }
];

export async function fetchTimelineTweets(env: Env): Promise<TimelineResult> {
  const db = getDb(env.DB);
  const now = Date.now();

  // 1. Check existing D1 cache
  const cached = await db.getTimelineCache(CACHE_KEY);
  if (cached) {
    const cachedTime = new Date(cached.cached_at).getTime();
    const isFresh = !isNaN(cachedTime) && (now - cachedTime) < CACHE_TTL_MS;

    if (isFresh) {
      try {
        const parsed = JSON.parse(cached.tweets_json) as TimelineTweet[];
        const isDummy = Array.isArray(parsed) && parsed.some(t => t.id === '1826991000000000001' || t.author_username === 'indiebuilder');
        const hasMediaOrUrls = Array.isArray(parsed) && parsed.some(t => Boolean(t.media_url || (t.urls && t.urls.length > 0)));
        if (Array.isArray(parsed) && parsed.length > 0 && !isDummy && hasMediaOrUrls) {
          return {
            tweets: parsed,
            source: 'cache',
            cached_at: cached.cached_at,
            query: TIMELINE_QUERY,
          };
        }
      } catch (e) {
        console.warn('[Timeline Cache Parse Error]', e);
      }
    }
  }

  // 2. Primary: Fetch via treg.to TikHub X endpoint across core queries
  const tregToken = env.TREG_TOKEN || "eyJ1aWQiOjI5NDAsImV4cCI6MTc5MDA5ODY1NywidHYiOjAsIm9yZyI6ImFtaWNvZGVyIn0.D0CFcqhss9RjsLAKYUo_h2OqZ92mi87UHMQXlsXiKhY";
  const tregOrg = env.TREG_ORG || "amicoder";

  if (tregToken) {
    try {
      const rawTweets: any[] = [];

      // Query both keywords and founder mentions in parallel
      await Promise.all(TIMELINE_QUERIES.map(async (q) => {
        try {
          const tregUrl = `https://treg.to/call/tikhub.x.twitter-web-fetch-search-timeline?keyword=${encodeURIComponent(q)}&search_type=Latest`;
          const res = await fetch(tregUrl, {
            headers: {
              'X-Treg-Token': tregToken.trim(),
              'X-Treg-Org': tregOrg.trim(),
              'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(9000)
          });

          if (res.ok) {
            const json = await res.json() as any;
            const timelineList = json.data?.timeline;
            if (Array.isArray(timelineList)) {
              rawTweets.push(...timelineList);
            }
          }
        } catch (subErr) {
          console.warn(`[Treg Sub-query Error for ${q}]`, subErr);
        }
      }));

      if (rawTweets.length > 0) {
        const seenIds = new Set<string>();
        const freshTweets: TimelineTweet[] = [];

        for (const item of rawTweets) {
          if (!item || (!item.text && !item.full_text)) continue;
          const tweetId = String(item.tweet_id || item.id_str || '');
          if (!tweetId || seenIds.has(tweetId)) continue;
          seenIds.add(tweetId);

          const username = item.screen_name || item.user_info?.screen_name || 'user';
          const name = item.user_info?.name || item.name || username;
          const avatar = item.user_info?.avatar || item.profile_image_url_https || item.user_info?.profile_image_url || undefined;
          const verified = Boolean(item.user_info?.verified || item.user_info?.blue_verified || item.verified);

          const photoMedia = item.media?.photo?.[0]?.media_url_https || item.entities?.media?.[0]?.media_url_https;
          const videoObj = item.media?.video?.[0];
          const videoMedia = videoObj?.media_url_https;
          const videoVariants: any[] = videoObj?.variants || [];
          const bestVideoMp4 = videoVariants
            .filter((v: any) => v && v.content_type === 'video/mp4' && v.url)
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url;

          const mediaUrl = photoMedia || videoMedia || undefined;
          const mediaType = photoMedia ? 'photo' : (videoMedia ? 'video' : undefined);
          const videoUrl = bestVideoMp4 || undefined;

          const tweetUrls = (item.entities?.urls || item.urls || []).map((u: any) => ({
            url: u.url || '',
            expanded_url: u.expanded_url || u.url || '',
            display_url: u.display_url || u.url || '',
          })).filter((u: any) => Boolean(u.url));

          freshTweets.push({
            id: tweetId,
            text: item.text || item.full_text || '',
            created_at: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            author_name: name,
            author_username: username,
            author_profile_image: avatar,
            author_verified: verified,
            url: `https://x.com/${username}/status/${tweetId}`,
            media_url: mediaUrl,
            media_type: mediaType,
            video_url: videoUrl,
            urls: tweetUrls.length > 0 ? tweetUrls : undefined,
            metrics: {
              retweet_count: Number(item.retweets || item.retweet_count) || 0,
              reply_count: Number(item.replies || item.reply_count) || 0,
              like_count: Number(item.favorites || item.favorite_count) || 0,
            }
          });
        }

        // Sort reverse chronological (newest first)
        freshTweets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (freshTweets.length > 0) {
          // Save to D1 cache
          await db.setTimelineCache(CACHE_KEY, TIMELINE_QUERY, JSON.stringify(freshTweets));

          return {
            tweets: freshTweets,
            source: 'treg',
            cached_at: new Date().toISOString(),
            query: TIMELINE_QUERY,
          };
        }
      }
    } catch (tregErr) {
      console.warn('[Treg API Exception]', tregErr);
    }
  }

  // 3. Secondary: Fetch from X API v2 if Bearer token is available
  const bearerToken = env.X_BEARER_TOKEN || env.TWITTER_BEARER_TOKEN;
  if (bearerToken) {
    try {
      const searchUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
      searchUrl.searchParams.set('query', `(${TIMELINE_QUERY}) -is:retweet`);
      searchUrl.searchParams.set('max_results', '25');
      searchUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
      searchUrl.searchParams.set('expansions', 'author_id');
      searchUrl.searchParams.set('user.fields', 'name,username,profile_image_url,verified');

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${bearerToken.trim()}`,
          'User-Agent': 'OutbidWatch/1.2.0',
        },
      });

      if (response.ok) {
        const json = await response.json() as any;
        const usersMap = new Map<string, any>();
        if (json.includes?.users && Array.isArray(json.includes.users)) {
          for (const u of json.includes.users) {
            usersMap.set(u.id, u);
          }
        }

        if (Array.isArray(json.data) && json.data.length > 0) {
          const freshTweets: TimelineTweet[] = json.data.map((item: any) => {
            const author = usersMap.get(item.author_id) || {};
            const username = author.username || 'user';
            return {
              id: item.id,
              text: item.text,
              created_at: item.created_at || new Date().toISOString(),
              author_name: author.name || username,
              author_username: username,
              author_profile_image: author.profile_image_url || undefined,
              author_verified: Boolean(author.verified),
              url: `https://x.com/${username}/status/${item.id}`,
              metrics: item.public_metrics ? {
                retweet_count: item.public_metrics.retweet_count || 0,
                reply_count: item.public_metrics.reply_count || 0,
                like_count: item.public_metrics.like_count || 0,
              } : undefined,
            };
          });

          // Save to D1 cache
          await db.setTimelineCache(CACHE_KEY, TIMELINE_QUERY, JSON.stringify(freshTweets));

          return {
            tweets: freshTweets,
            source: 'api',
            cached_at: new Date().toISOString(),
            query: TIMELINE_QUERY,
          };
        }
      }
    } catch (apiErr) {
      console.warn('[X API Exception]', apiErr);
    }
  }

  // 4. Fallback: If cache existed (even if older than 30m), return cached data
  if (cached?.tweets_json) {
    try {
      const parsed = JSON.parse(cached.tweets_json) as TimelineTweet[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          tweets: parsed,
          source: 'cache',
          cached_at: cached.cached_at,
          query: TIMELINE_QUERY,
        };
      }
    } catch {}
  }

  // Seed cache with initial fallback tweets so subsequent visits hit D1
  await db.setTimelineCache(CACHE_KEY, TIMELINE_QUERY, JSON.stringify(FALLBACK_TWEETS));

  return {
    tweets: FALLBACK_TWEETS,
    source: 'fallback',
    cached_at: new Date().toISOString(),
    query: TIMELINE_QUERY,
  };
}
