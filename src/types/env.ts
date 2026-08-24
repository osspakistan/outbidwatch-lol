export interface Env {
  DB: D1Database;
  SCRAPE_QUEUE?: Queue<{ id: string; url: string }>;
  CONTEXT_PUBLIC_ID?: string;
  ENVIRONMENT?: string;
  ADMIN_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  X_BEARER_TOKEN?: string;
  TWITTER_BEARER_TOKEN?: string;
  TREG_TOKEN?: string;
  TREG_ORG?: string;
}

export interface AppVariables {
  requestId: string;
  startTime: number;
  analytics?: {
    userId: string;
    sessionId: string;
    codename: string;
    emoji: string;
  };
}
