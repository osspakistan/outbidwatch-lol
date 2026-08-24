-- OutbidWatch D1 Database Schema v1.0.0
-- Master schema for pure outbid platform directory & lineage tracking

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
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

-- Submissions queue table for new community suggested platforms
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT,
  founder_x_handle TEXT,
  submitter_note TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Optimized query indexes
CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_country_code ON sites(country_code);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_domain_reg_date ON sites(domain_registration_date ASC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
