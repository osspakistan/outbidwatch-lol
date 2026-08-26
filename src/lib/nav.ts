export type NavSection = "directory" | "timeline" | "map" | "analytics" | "story" | "about" | "developers";

export interface NavOptions {
  active?: NavSection;
  isBoardProfile?: boolean;
}

export function renderHeader(options: NavOptions = {}): string {
  const active = options.active || "directory";
  const isBoard = options.isBoardProfile || false;

  return `
  <!-- Header -->
  <header class="pt-5 pb-3.5 flex items-center justify-between sticky top-0 bg-[var(--paper)]/95 backdrop-blur z-30 border-b border-transparent">
    <a href="/" id="headerLogoLink" class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[15px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[17px] tracking-tight text-[var(--ink)]">outbidwatch</span>
    </a>

    <!-- Desktop Navigation (>= 640px) -->
    <div class="hidden sm:flex items-center gap-1.5">
      ${isBoard ? `
        <a href="/" class="pill px-2.5 py-1 text-[12px] font-bold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors flex items-center gap-1">
          <i class="ph-bold ph-arrow-left text-[10px]"></i> Directory
        </a>
      ` : `
        <a href="/" id="headerDirLink" class="pill px-2.5 py-1 text-[12px] ${active === "directory" ? "font-bold bg-[var(--ink)] text-white shadow-sm" : "font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]"} transition-colors">
          Directory
        </a>
      `}
      <a href="/timeline" class="pill px-2.5 py-1 text-[12px] ${active === "timeline" ? "font-bold bg-[var(--ink)] text-white shadow-sm" : "font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]"} transition-colors">
        Timeline
      </a>
      <a href="/map" class="pill px-2.5 py-1 text-[12px] ${active === "map" ? "font-bold bg-[var(--ink)] text-white shadow-sm" : "font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]"} transition-colors">
        Map
      </a>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" title="View Source on GitHub" class="pill px-2.5 py-1 text-[12px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-colors flex items-center gap-1">
        <i class="ph-bold ph-github-logo text-[13.5px]"></i>
        <span>GitHub</span>
      </a>
    </div>

    <!-- Mobile Header Triggers (< 640px) -->
    <div class="flex sm:hidden items-center gap-1.5">
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" title="GitHub Repository" class="w-8 h-8 rounded-xl border border-[#E4E1D4] bg-white flex items-center justify-center text-[var(--ink)] hover:bg-[#F5F4EC] transition-colors shadow-2xs">
        <i class="ph-bold ph-github-logo text-[16px]"></i>
        <span class="sr-only">GitHub</span>
      </a>
      <button onclick="document.getElementById('mobileNavOverlay').classList.add('open'); document.body.style.overflow='hidden';" aria-label="Open Navigation Menu" class="w-8 h-8 rounded-xl border border-[#E4E1D4] bg-white flex items-center justify-center text-[var(--ink)] hover:bg-[#F5F4EC] transition-colors shadow-2xs">
        <i class="ph-bold ph-list text-[17px]"></i>
      </button>
    </div>
  </header>
`;
}

export function renderMobileNavDrawer(options: NavOptions = {}): string {
  const active = options.active || "directory";

  return `
<!-- Mobile Navigation Drawer -->
<div id="mobileNavOverlay" onclick="if(event.target===this){this.classList.remove(open);document.body.style.overflow=;}">
  <div id="mobileNavSheet">
    <div class="sheet-handle"></div>
    <div class="flex items-center justify-between mb-3 pb-3 border-b border-[#ECEAE0]">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: var(--mosambi);">
          <i class="ph-fill ph-gavel text-[14px]" style="color:#1E2417;"></i>
        </div>
        <span class="display font-extrabold text-[17px] text-[var(--ink)]">Menu</span>
      </div>
      <button onclick="document.getElementById(mobileNavOverlay).classList.remove(open); document.body.style.overflow=;" class="w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F4EC] text-[#5B5A4E] hover:bg-[#EAE7DC] transition-colors" aria-label="Close Menu">
        <i class="ph-bold ph-x text-[15px]"></i>
      </button>
    </div>

    <nav class="flex flex-col gap-1.5 mb-4">
      <a href="/" class="flex items-center justify-between p-3 rounded-2xl ${active === "directory" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-squares-four text-[18px]"></i>
          <span class="text-[14.5px]">Directory</span>
        </div>
        <span class="text-[12px] opacity-70">192 boards</span>
      </a>

      <a href="/timeline" class="flex items-center justify-between p-3 rounded-2xl ${active === "timeline" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-clock-counter-clockwise text-[18px]"></i>
          <span class="text-[14.5px]">Timeline</span>
        </div>
        <span class="pill px-2 py-0.5 text-[10.5px] font-bold bg-[#BACB45] text-[#1E2417]">Live</span>
      </a>

      <a href="/map" class="flex items-center justify-between p-3 rounded-2xl ${active === "map" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-map-pin text-[18px]"></i>
          <span class="text-[14.5px]">Builder Map</span>
        </div>
        <span class="text-[12px] opacity-70">World</span>
      </a>

      <a href="/analytics" class="flex items-center justify-between p-3 rounded-2xl ${active === "analytics" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-chart-bar text-[18px]"></i>
          <span class="text-[14.5px]">Analytics</span>
        </div>
        <span class="text-[12px] opacity-70">Pulse</span>
      </a>

      <a href="/story" class="flex items-center justify-between p-3 rounded-2xl ${active === "story" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-book-open text-[18px]"></i>
          <span class="text-[14.5px]">Founder Story</span>
        </div>
      </a>

      <a href="/about" class="flex items-center justify-between p-3 rounded-2xl ${active === "about" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-info text-[18px]"></i>
          <span class="text-[14.5px]">About</span>
        </div>
      </a>

      <a href="/developers" class="flex items-center justify-between p-3 rounded-2xl ${active === "developers" ? "bg-[var(--ink)] text-white font-bold" : "bg-[#F9F8F3] hover:bg-[#F2EFE5] text-[var(--ink)] font-semibold"} transition-colors">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-code text-[18px]"></i>
          <span class="text-[14.5px]">Developers & API</span>
        </div>
      </a>
    </nav>

    <div class="pt-3 border-t border-[#ECEAE0] flex items-center justify-between gap-2.5">
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" class="btn-primary pill py-2.5 px-4 text-[13px] font-bold flex-1 flex items-center justify-center gap-2 shadow-sm">
        <i class="ph-bold ph-github-logo text-[16px]"></i>
        <span>GitHub Repo</span>
      </a>
      <a href="/api/feed.json" target="_blank" class="pill py-2.5 px-4 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] flex items-center gap-1.5">
        <i class="ph-bold ph-rss text-[14px]"></i>
        <span>Feed</span>
      </a>
    </div>
  </div>
</div>
`;
}

export function renderFooter(options: NavOptions = {}): string {
  return `
  <!-- Footer -->
  <footer class="pb-8 pt-5 border-t border-[#ECEAE0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11.5px] text-[#8A8574]">
    <div class="text-center sm:text-left flex flex-col gap-0.5">
      <span class="font-bold text-[13px] text-[var(--ink)] tracking-tight">outbidwatch</span>
      <span class="text-[11px] text-[#8A8574]">Verified pay-to-rank platform directory</span>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-2.5 gap-y-1 font-medium">
      <a href="/story" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-semibold text-[var(--ink)]">
        <i class="ph-bold ph-book-open text-[12px]"></i> Story
      </a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="/about" class="hover:text-[var(--ink)] transition-colors">About</a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="/developers" class="hover:text-[var(--ink)] transition-colors">Developers</a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="/analytics" class="hover:text-[var(--ink)] transition-colors">Analytics</a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="/submissions" class="hover:text-[var(--ink)] transition-colors">Queue</a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1">
        <i class="ph-bold ph-github-logo text-[12px]"></i> GitHub
      </a>
      <span class="text-[#D0CDBF]">·</span>
      <a href="/api/feed.json" target="_blank" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1">
        <i class="ph-bold ph-rss text-[12px]"></i> Feed
      </a>
    </div>
  </footer>
`;
}
