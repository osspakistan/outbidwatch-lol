import type { Site } from './site';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface DirectoryStats {
  total_sites: number;
  live_sites: number;
  dead_sites: number;
  verified_founders_count: number;
  verified_founders_percentage: number;
  categories: {
    category: string;
    count: number;
    percentage: number;
  }[];
  countries: {
    country_name: string;
    country_code: string;
    country_flag: string;
    count: number;
  }[];
  currencies: {
    currency: string;
    count: number;
  }[];
  provenance: {
    provenance: string;
    count: number;
  }[];
  oldest_domain: {
    domain: string;
    registration_date: string;
  } | null;
  newest_domain: {
    domain: string;
    registration_date: string;
  } | null;
}
