export type SiteStatus = 'live' | 'dead' | 'unclear';

export type Category =
  | 'Games & Competitive Battles'
  | 'SaaS & Apps'
  | 'Pixel Walls & Micro-Billboards'
  | 'Creator & Social Profiles'
  | 'Meta & Clones Directory'
  | 'Niche Verticals'
  | 'Regional & National Boards'
  | 'AI Tools & Agents'
  | 'Charity & Non-Profit'
  | 'Venture Capital & Funds';

export type LocationProvenance =
  | 'self_reported'
  | 'whois_registry'
  | 'inferred'
  | 'unspecified';

export interface Site {
  id: string;
  slug: string;
  domain: string;
  site_name: string;
  raw_title: string | null;
  raw_description: string | null;
  url: string;
  category: Category | string;
  founder_x_handle: string;
  founder_location: string;
  country_name: string;
  country_code: string;
  country_flag: string;
  location_provenance: LocationProvenance;
  location_notes: string | null;
  summary_256: string;
  domain_registration_date: string;
  logo_url: string | null;
  currency: string;
  status: SiteStatus;
  workflow_status: string;
  date_found: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteFilters {
  q?: string;
  category?: string;
  country_code?: string;
  status?: string;
  currency?: string;
  provenance?: string;
  order_by?: 'registration_date' | 'created_at' | 'site_name' | 'category';
  order_dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  domain: string;
  url: string;
  founder_x_handle: string;
  founder_location: string;
  launch_date: string;
  currency: string;
  submitter_note: string | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionInput {
  url: string;
  founder_x_handle: string;
  location: string;
  launch_date: string;
  currency?: string;
  submitter_note?: string;
}

export interface ApproveSubmissionPayload {
  category: Category | string;
  summary_256: string;
  site_name?: string;
  raw_title?: string;
  raw_description?: string;
  domain_registration_date?: string;
  currency?: string;
}
