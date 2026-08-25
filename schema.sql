-- OutbidWatch D1 Database Schema v1.3.0
-- Master schema with raw website title & meta description support

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  raw_title TEXT,
  raw_description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  founder_x_handle TEXT NOT NULL,
  founder_location TEXT DEFAULT 'Global',
  country_name TEXT DEFAULT 'Global',
  country_code TEXT DEFAULT 'GLOBAL',
  country_flag TEXT DEFAULT '🌐',
  location_provenance TEXT DEFAULT 'unspecified',
  location_notes TEXT,
  summary_256 TEXT NOT NULL,
  domain_registration_date TEXT NOT NULL,
  logo_url TEXT,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'live',
  workflow_status TEXT DEFAULT 'complete',
  date_found TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  founder_x_handle TEXT NOT NULL,
  founder_location TEXT NOT NULL,
  launch_date TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  submitter_note TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_country_code ON sites(country_code);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_domain_reg_date ON sites(domain_registration_date ASC);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_domain ON submissions(domain);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

CREATE TABLE IF NOT EXISTS timeline_cache (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  tweets_json TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Analytics Module Tables (Zero-JS, HttpOnly Cookie Server Analytics)
CREATE TABLE IF NOT EXISTS analytics_users (
  id TEXT PRIMARY KEY,
  codename TEXT NOT NULL,
  first_seen_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now')),
  total_visits INTEGER DEFAULT 1,
  country_code TEXT,
  country_name TEXT,
  city TEXT,
  region TEXT,
  os TEXT,
  browser TEXT,
  device_type TEXT
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  codename TEXT NOT NULL,
  referrer TEXT,
  ref_tag TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  initial_path TEXT NOT NULL,
  country_code TEXT,
  city TEXT,
  os TEXT,
  browser TEXT,
  device_type TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  last_active_at TEXT DEFAULT (datetime('now')),
  pageview_count INTEGER DEFAULT 1,
  event_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES analytics_users(id)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  codename TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES analytics_sessions(id),
  FOREIGN KEY (user_id) REFERENCES analytics_users(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_users_codename ON analytics_users(codename);
CREATE INDEX IF NOT EXISTS idx_analytics_users_last_seen ON analytics_users(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_uid ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_ref ON analytics_sessions(ref_tag);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_active ON analytics_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_sid ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_uid ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);

-- Per-board view counters (incremented on every board open, both SSR and client SPA)
CREATE TABLE IF NOT EXISTS board_view_counts (
  slug TEXT PRIMARY KEY,
  total_views INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_board_view_counts_total ON board_view_counts(total_views DESC);

-- Per-user "viewed this board" set, so we can increment unique_viewers per uid
CREATE TABLE IF NOT EXISTS board_view_viewers (
  slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  first_viewed_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (slug, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_view_viewers_slug ON board_view_viewers(slug);
