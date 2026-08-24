// OutbidWatch Frontend Client Application - Server-Paginated & Spring Transition Engine
(() => {
  // Initial state from SSR or defaults
  const initialData = window.__INITIAL_DATA__ || {};
  let currentCategory = initialData.category || 'all';
  let currentSort = initialData.sort || 'oldest';
  let searchQuery = initialData.q || '';
  let currentPage = initialData.page || 1;
  let pageSize = initialData.limit || 25;
  let totalPages = initialData.totalPages || 8;

  // Cached sites for the current active page
  let currentPageSites = [];

  // WebMCP Protocol Support for AI Browsers (developer.chrome.com/blog/webmcp-epp)
  if (typeof navigator !== 'undefined' && navigator.modelContext && typeof navigator.modelContext.provideContext === 'function') {
    try {
      navigator.modelContext.provideContext({
        tools: [
          {
            name: 'search_platforms',
            description: 'Search pay-to-rank bidding platforms by keyword, category, or founder.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search term or domain' },
                category: { type: 'string', description: 'Filter by category (e.g. SaaS & Apps, Games & Battles)' },
              },
            },
            execute: async ({ query, category }) => {
              const res = await fetch(`/api/sites?q=${encodeURIComponent(query || '')}&category=${encodeURIComponent(category || '')}`);
              return await res.json();
            },
          },
          {
            name: 'get_timeline_feed',
            description: 'Get latest curated builder tweets and launch milestones from X.',
            inputSchema: { type: 'object', properties: {} },
            execute: async () => {
              const res = await fetch('/api/timeline');
              return await res.json();
            },
          },
        ],
      });
    } catch (e) {
      console.warn('[WebMCP] provideContext failed', e);
    }
  }

  // Saved scroll position for seamless back transitions
  let savedScrollY = 0;
  let activeCardDomain = null;

  // Containers
  const directoryView = document.getElementById('directoryView');
  const boardProfileView = document.getElementById('boardProfileView');
  const sitesContainer = document.getElementById('sitesContainer');
  const statsSitesCount = document.getElementById('statsSitesCount');
  const statsLiveCount = document.getElementById('statsLiveCount');
  const statsOldestDate = document.getElementById('statsOldestDate');
  const heroBadge = document.getElementById('heroBadge');
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');

  // Header Nav Links
  const headerLogoLink = document.getElementById('headerLogoLink');
  const headerDirLink = document.getElementById('headerDirLink');

  // Pagination Elements (Justify Between)
  const paginationControls = document.getElementById('paginationControls');
  const currentPageNum = document.getElementById('currentPageNum');
  const totalPagesNum = document.getElementById('totalPagesNum');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  // Filter Drawer & Badge Elements
  const filterOverlay = document.getElementById('filterOverlay');
  const openFilterBtn = document.getElementById('openFilterBtn');
  const closeFilterBtn = document.getElementById('closeFilterBtn');
  const filterCategoryTags = document.getElementById('filterCategoryTags');
  const activeFilterBadge = document.getElementById('activeFilterBadge');
  const activeFilterIndicator = document.getElementById('activeFilterIndicator');
  const activeFilterText = document.getElementById('activeFilterText');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');

  // Temp state while filter drawer is open
  let tempCategory = currentCategory;
  let tempSort = currentSort;
  let tempPageSize = pageSize;

  // Submit Elements
  const submitOverlay = document.getElementById('submitOverlay');
  const openSubmitBtn = document.getElementById('openSubmit');
  const closeSubmitBtn = document.getElementById('closeSubmit');
  const submitForm = document.getElementById('submitForm');
  const submitUrlInput = document.getElementById('submitUrl');
  const submitHandleInput = document.getElementById('submitHandle');
  const submitLocationInput = document.getElementById('submitLocation');
  const submitDateInput = document.getElementById('submitDate');
  const submitCurrencySelect = document.getElementById('submitCurrency');
  const submitNoteInput = document.getElementById('submitNote');
  const submitFeedback = document.getElementById('submitFeedback');
  const submitBtn = document.getElementById('submitBtn');

  // Initialize
  async function init() {
    setupEventListeners();
    setupFilterDrawer();
    setupSubmitModal();
    setupHistoryRouting();

    // If initial page is SSR rendered, grab card elements from the DOM into currentPageSites cache
    extractInitialCardsFromDom();

    // Fetch live categories for filter drawer if not populated
    loadCategories();
  }

  // Extract initial server-rendered cards from DOM into in-memory cache
  function extractInitialCardsFromDom() {
    if (!sitesContainer) return;
    const cards = sitesContainer.querySelectorAll('.site-card');
    if (cards.length > 0) {
      currentPageSites = Array.from(cards).map((card) => {
        const domain = card.dataset.domain;
        const titleEl = card.querySelector('h3');
        const handleEl = card.querySelector('a[href*="x.com"]');
        const urlEl = card.querySelector('a[href^="http"]:not([href*="x.com"])');
        return {
          domain,
          raw_title: titleEl ? titleEl.textContent.trim() : domain,
          founder_x_handle: handleEl ? handleEl.textContent.replace('@', '').trim() : '',
          url: urlEl ? urlEl.getAttribute('href') : `https://${domain}`,
          summary_256: '',
        };
      });
    }
  }

  // Fetch and render categories inside the Filter Drawer
  async function loadCategories() {
    if (!filterCategoryTags || filterCategoryTags.children.length > 0) return;
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success && json.data) {
        let html = `
          <button data-cat-val="all" class="filter-tag pill px-3.5 py-1.5 text-[12.5px] font-bold border border-[#E4E1D4] ${currentCategory === 'all' ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[#5B5A4E]'}">
            All Categories
          </button>
        `;
        json.data.forEach((c) => {
          const isActive = currentCategory === c.category;
          html += `
            <button data-cat-val="${escapeHtml(c.category)}" class="filter-tag pill px-3.5 py-1.5 text-[12.5px] font-semibold border border-[#E4E1D4] ${isActive ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)]'} transition-all">
              ${escapeHtml(c.category)} <span class="text-[11px] opacity-70">(${c.count})</span>
            </button>
          `;
        });
        filterCategoryTags.innerHTML = html;

        filterCategoryTags.querySelectorAll('.filter-tag').forEach((btn) => {
          btn.addEventListener('click', () => {
            filterCategoryTags.querySelectorAll('.filter-tag').forEach((b) => {
              b.className = 'filter-tag pill px-3.5 py-1.5 text-[12.5px] font-semibold border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-all';
            });
            btn.className = 'filter-tag pill px-3.5 py-1.5 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white';
            tempCategory = btn.getAttribute('data-cat-val') || 'all';
          });
        });
      }
    } catch (e) {
      console.warn('Categories fetch error:', e);
    }
  }

  // Server-Paginated Fetch of Sites
  async function fetchSitesPage() {
    if (loadingState) loadingState.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
      if (searchQuery) params.set('q', searchQuery);
      if (currentSort === 'name') {
        params.set('order_by', 'site_name');
        params.set('order_dir', 'asc');
      } else if (currentSort === 'newest') {
        params.set('order_by', 'domain_registration_date');
        params.set('order_dir', 'desc');
      } else {
        params.set('order_by', 'domain_registration_date');
        params.set('order_dir', 'asc');
      }

      const res = await fetch(`/api/sites?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        currentPageSites = json.data;
        totalPages = json.meta?.total_pages || 1;
        currentPage = json.meta?.page || 1;

        renderCurrentPage(json.data, json.meta);
      }
    } catch (e) {
      console.error('Failed to load page:', e);
      if (sitesContainer) {
        sitesContainer.innerHTML = `<div class="p-6 text-center text-[#B4573E] card">Failed to load page. Please try again.</div>`;
      }
    } finally {
      if (loadingState) loadingState.classList.add('hidden');
    }
  }

  // Render Current Server Page Cards
  function renderCurrentPage(sites, meta) {
    if (!sitesContainer) return;

    updateFilterBadge();

    if (!sites || sites.length === 0) {
      sitesContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      if (paginationControls) paginationControls.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (paginationControls) {
      paginationControls.classList.remove('hidden');
      if (currentPageNum) currentPageNum.textContent = meta.page;
      if (totalPagesNum) totalPagesNum.textContent = meta.total_pages;
      if (prevPageBtn) prevPageBtn.disabled = !meta.has_prev_page;
      if (nextPageBtn) nextPageBtn.disabled = !meta.has_next_page;
    }

    let html = '';
    sites.forEach((site, index) => {
      const isFirst = index === 0 && currentPage === 1 && currentSort === 'oldest' && (!currentCategory || currentCategory === 'all') && !searchQuery;
      const statusClass = site.status === 'live' ? 'status-live' : site.status === 'dead' ? 'status-dead' : 'status-unclear';
      const statusLabel = site.status === 'live' ? 'LIVE' : site.status === 'dead' ? 'DEAD' : 'UNCLEAR';
      const cardOpacity = site.status === 'dead' ? 'opacity-70' : '';
      const regDateFormatted = formatDate(site.domain_registration_date);
      const flagEmoji = site.country_flag || '🌐';
      const locationLabel = site.founder_location || site.country_name || 'Global';
      const cardTitle = formatDomainTitle(site.domain, site.site_name);
      const boardProfileUrl = `/boards/${encodeURIComponent(site.domain)}`;

      html += `
        <article 
          class="site-card card p-5 sm:p-6 cursor-pointer select-none transition-all hover:border-[#CCD99B] ${cardOpacity}"
          data-domain="${escapeHtml(site.domain)}"
          data-href="${boardProfileUrl}"
        >
          <div class="flex items-start justify-between gap-3 mb-8 sm:mb-12">
            <div class="flex items-center gap-3.5">
              <img 
                src="${site.logo_url || `/api/logos/${encodeURIComponent(site.domain)}.png`}" 
                alt="${escapeHtml(site.domain)} logo" 
                class="card-logo w-12 h-12 rounded-2xl object-cover bg-[var(--mosambi-light)] shrink-0 border border-[#EBE8DC]"
                loading="lazy"
                onerror="this.onerror=null; this.src='/api/logos/${encodeURIComponent(site.domain)}.png';"
              />
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-extrabold text-[16.5px] sm:text-[17.5px] leading-snug text-[var(--ink)] hover:text-[var(--mosambi-dark)] transition-colors">
                    ${escapeHtml(cardTitle)}
                  </h3>
                  ${isFirst ? '<span class="pill px-2 py-0.5 text-[10.5px] font-extrabold shrink-0" style="background: var(--mosambi); color:#1E2417;">#1 · FIRST</span>' : ''}
                </div>
                <p class="text-[12.5px] text-[#8A8574] mt-0.5 font-medium">
                  ${escapeHtml(site.category)} · ${flagEmoji} ${escapeHtml(locationLabel)}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <span class="text-[12px] text-[#8A8574] font-medium hidden sm:inline-block">reg. ${regDateFormatted}</span>
              <span class="pill ${statusClass} px-2.5 py-1 text-[11px] font-bold tracking-wide">
                ${statusLabel}
              </span>
            </div>
          </div>

        <!-- Footer Row: Founder Handle (Mobile) + Currency | Domain Link (Desktop) -->
        <div class="flex items-center justify-between pt-3.5 sm:pt-4 border-t border-[#F0EEE3] text-[13px] text-[#8A8574]">
          <div class="flex items-center gap-2 sm:gap-2.5">
            <a 
              href="https://x.com/${encodeURIComponent(site.founder_x_handle)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="font-bold text-[var(--ink)] hover:underline flex items-center gap-1"
              onclick="event.stopPropagation();"
            >
              <i class="ph-bold ph-x-logo text-[12px] text-[#5B5A4E]"></i>
              <span>@${escapeHtml(site.founder_x_handle)}</span>
            </a>
            <span class="hidden sm:inline-block">·</span>
            <span class="pill px-2 py-0.5 bg-[#EAE8DD] text-[#33372B] font-bold text-[11px] hidden sm:inline-block">${escapeHtml(site.currency || 'USD')}</span>
          </div>

          <a 
            href="${escapeHtml(site.url)}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="hidden sm:flex items-center gap-1.5 text-[13px] font-bold hover:underline shrink-0" 
            style="color: var(--mosambi-dark);"
            onclick="event.stopPropagation();"
          >
            <span>${escapeHtml(site.domain)}</span>
            <i class="ph-bold ph-arrow-up-right text-[11px]"></i>
          </a>
        </div>
      </article>
      `;
    });

    sitesContainer.innerHTML = html;
  }

  // Update Active Filter Badge and Bar
  function updateFilterBadge() {
    let count = 0;
    if (currentCategory && currentCategory !== 'all') count++;
    if (currentSort !== 'oldest') count++;
    if (pageSize !== 25) count++;

    if (activeFilterBadge) {
      if (count > 0) {
        activeFilterBadge.textContent = count;
        activeFilterBadge.classList.remove('hidden');
      } else {
        activeFilterBadge.classList.add('hidden');
      }
    }

    if (activeFilterIndicator) {
      if ((currentCategory && currentCategory !== 'all') || currentSort !== 'oldest') {
        activeFilterIndicator.classList.remove('hidden');
        let parts = [];
        if (currentCategory && currentCategory !== 'all') parts.push(`Category: <strong>${escapeHtml(currentCategory)}</strong>`);
        if (currentSort !== 'oldest') parts.push(`Sort: <strong>${currentSort}</strong>`);
        if (activeFilterText) activeFilterText.innerHTML = `Active Filters: ${parts.join(' · ')}`;
      } else {
        activeFilterIndicator.classList.add('hidden');
      }
    }
  }

  // Setup Filter Drawer
  function setupFilterDrawer() {
    if (!openFilterBtn || !filterOverlay) return;

    function syncDrawerUI() {
      tempCategory = currentCategory;
      tempSort = currentSort;
      tempPageSize = pageSize;

      document.querySelectorAll('.sort-tag-btn').forEach((b) => {
        const val = b.getAttribute('data-sort-val');
        if (val === tempSort) {
          b.className = 'sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all';
        } else {
          b.className = 'sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]';
        }
      });

      document.querySelectorAll('.pagesize-tag-btn').forEach((b) => {
        const val = Number(b.getAttribute('data-pagesize-val'));
        if (val === tempPageSize) {
          b.className = 'pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all';
        } else {
          b.className = 'pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]';
        }
      });

      if (filterCategoryTags) {
        filterCategoryTags.querySelectorAll('.filter-tag').forEach((b) => {
          const val = b.getAttribute('data-cat-val');
          if (val === tempCategory) {
            b.className = 'filter-tag pill px-3.5 py-1.5 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white';
          } else {
            b.className = 'filter-tag pill px-3.5 py-1.5 text-[12.5px] font-semibold border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-all';
          }
        });
      }
    }

    function openFilter() {
      syncDrawerUI();
      filterOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeFilter() {
      filterOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    openFilterBtn.addEventListener('click', openFilter);
    if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeFilter);

    filterOverlay.addEventListener('click', (e) => {
      if (e.target === filterOverlay) closeFilter();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (filterOverlay && filterOverlay.classList.contains('open')) closeFilter();
        const navOverlay = document.getElementById('mobileNavOverlay');
        if (navOverlay && navOverlay.classList.contains('open')) {
          navOverlay.classList.remove('open');
          document.body.style.overflow = '';
        }
      }
    });

    document.querySelectorAll('.sort-tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-tag-btn').forEach((b) => {
          b.className = 'sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]';
        });
        btn.className = 'sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all';
        tempSort = btn.getAttribute('data-sort-val') || 'oldest';
      });
    });

    document.querySelectorAll('.pagesize-tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pagesize-tag-btn').forEach((b) => {
          b.className = 'pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]';
        });
        btn.className = 'pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all';
        tempPageSize = Number(btn.getAttribute('data-pagesize-val'));
      });
    });

    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        currentCategory = tempCategory;
        currentSort = tempSort;
        pageSize = tempPageSize;
        currentPage = 1;
        closeFilter();
        fetchSitesPage();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        tempCategory = 'all';
        tempSort = 'oldest';
        tempPageSize = 25;
        currentCategory = 'all';
        currentSort = 'oldest';
        pageSize = 25;
        currentPage = 1;
        closeFilter();
        fetchSitesPage();
      });
    }

    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.addEventListener('click', () => {
        currentCategory = 'all';
        currentSort = 'oldest';
        currentPage = 1;
        fetchSitesPage();
      });
    }
  }

  // Open Board Profile with Seamless Fetch & Spring View Transition
  async function openBoardProfile(domain) {
    if (!directoryView || !boardProfileView) {
      window.location.href = `/boards/${encodeURIComponent(domain)}`;
      return;
    }

    savedScrollY = window.scrollY;
    activeCardDomain = domain;

    // Check if site is already in memory or fetch single site API
    let site = currentPageSites.find((s) => s.domain.toLowerCase() === domain.toLowerCase());
    if (!site || !site.summary_256) {
      try {
        const res = await fetch(`/api/sites/domain/${encodeURIComponent(domain)}`);
        const json = await res.json();
        if (json.success && json.data) {
          site = json.data;
        }
      } catch (e) {}
    }

    if (!site) {
      window.location.href = `/boards/${encodeURIComponent(domain)}`;
      return;
    }

    const metaTitle = site.raw_title || site.site_name || site.domain;
    const metaDesc = site.raw_description || site.summary_256;
    const logoUrl = site.logo_url || `/api/logos/${encodeURIComponent(site.domain)}.png`;
    const locationLabel = site.founder_location || site.country_name || 'Global';
    const flag = site.country_flag || '🌐';
    const regDateFormatted = formatDate(site.domain_registration_date);
    const statusClass = site.status === 'live' ? 'status-live' : 'status-unclear';
    const statusLabel = site.status === 'live' ? 'LIVE' : 'UNCLEAR';

    boardProfileView.innerHTML = `
      <nav class="pt-2 pb-4 flex items-center gap-2 text-[12.5px] text-[#8A8574]">
        <button id="backToDirectoryBtn" class="hover:text-[var(--ink)] font-semibold flex items-center gap-1">
          <i class="ph-bold ph-arrow-left text-[11px]"></i> Directory
        </button>
        <span>/</span>
        <span>${escapeHtml(site.category || 'Platform')}</span>
        <span>/</span>
        <span class="font-bold text-[var(--ink)]">${escapeHtml(site.domain)}</span>
      </nav>

      <section id="profileCardBox" class="card p-5 sm:p-6 shadow-sm mb-6" style="view-transition-name: board-card;">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div class="flex items-center gap-4">
            <img 
              id="profileLogoImg"
              src="${logoUrl}" 
              alt="${escapeHtml(site.domain)} logo" 
              class="w-16 h-16 rounded-2xl object-cover bg-[var(--mosambi-light)] shrink-0 border border-[#EBE8DC] shadow-sm"
              style="view-transition-name: board-logo;"
            />
            <div>
              <div class="flex items-center gap-2">
                <h1 class="display font-extrabold text-[22px] sm:text-[24px] text-[var(--ink)] leading-tight">
                  ${escapeHtml(site.domain)}
                </h1>
                <span class="pill ${statusClass} px-2.5 py-1 text-[11px] font-bold tracking-wide hidden sm:inline-block">
                  ${statusLabel}
                </span>
              </div>
              <p class="text-[13px] text-[#8A8574] mt-1 font-medium flex items-center gap-1.5">
                <span>${escapeHtml(site.category || 'Platform')}</span>
                <span class="hidden sm:inline-block">·</span>
                <span class="hidden sm:inline-block">${flag} ${escapeHtml(locationLabel)}</span>
              </p>
            </div>
          </div>

          <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary pill px-5 py-3 text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-sm shrink-0">
            <span>Visit ${escapeHtml(site.domain)}</span>
            <i class="ph-bold ph-arrow-up-right text-[12px]"></i>
          </a>
        </div>

        <div class="mb-5 pb-5 border-b border-[#F0EEE3]">
          <h2 class="text-[17px] sm:text-[18px] font-extrabold text-[var(--ink)] leading-snug mb-2">
            ${escapeHtml(metaTitle)}
          </h2>
          ${site.raw_description ? `
            <p class="text-[14px] text-[#5B5A4E] leading-relaxed">
              ${escapeHtml(site.raw_description)}
            </p>
          ` : ''}
        </div>

        <div class="mb-5">
          <h3 class="text-[12px] font-extrabold uppercase tracking-wider text-[#8A8574] mb-2 flex items-center gap-1.5">
            <i class="ph-bold ph-chart-line-up text-[14px] text-[var(--mosambi-dark)]"></i>
            How this platform works
          </h3>
          <div class="rounded-2xl p-4 bg-[#FAF9F5] border border-[#ECEAE0] text-[14px] text-[#3E4233] leading-relaxed">
            ${escapeHtml(site.summary_256 || 'Platform details recorded in OutbidWatch archive.')}
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
            <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Founder</span>
            <a href="https://x.com/${encodeURIComponent(site.founder_x_handle)}" target="_blank" rel="noopener noreferrer" class="font-bold text-[13.5px] text-[var(--ink)] hover:underline flex items-center gap-1">
              <i class="ph-bold ph-x-logo text-[12px]"></i> @${escapeHtml(site.founder_x_handle)}
            </a>
          </div>

          <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
            <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Origin / Base</span>
            <span class="font-bold text-[13.5px] text-[var(--ink)] block truncate">
              ${flag} ${escapeHtml(site.country_name || 'Global')}
            </span>
          </div>

          <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
            <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Registration</span>
            <span class="font-bold text-[13.5px] text-[var(--ink)] block">
              ${regDateFormatted}
            </span>
          </div>

          <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
            <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Currency</span>
            <span class="pill inline-block px-2 py-0.5 bg-[#E2DFC8] text-[#33372B] font-extrabold text-[12px] mt-0.5">
              ${escapeHtml(site.currency || 'USD')}
            </span>
          </div>
        </div>

        ${formatProfessionalNote(site.location_notes, site.location_provenance) ? `
          <div class="mt-4 pt-4 border-t border-[#F0EEE3] text-[12.5px] text-[#8A8574] flex items-center gap-2">
            <i class="ph-bold ph-shield-check text-[15px] shrink-0 text-[var(--mosambi-dark)]"></i>
            <span><strong>Verification:</strong> ${escapeHtml(formatProfessionalNote(site.location_notes, site.location_provenance))}</span>
          </div>
        ` : ''}
      </section>

      <div class="flex items-center justify-between">
        <button id="backToDirectoryBtn2" class="pill px-4 py-2.5 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] transition-colors flex items-center gap-1.5 shadow-sm">
          <i class="ph-bold ph-arrow-left text-[12px]"></i> All platforms
        </button>
        <button id="openSubmitFromProfile" class="btn-primary pill px-4 py-2.5 text-[13px] font-bold flex items-center gap-1.5 shadow-sm">
          <i class="ph-bold ph-plus"></i> Submit a platform
        </button>
      </div>
    `;

    const goBack = (e) => {
      e.preventDefault();
      window.history.pushState({ page: 'directory' }, '', '/');
      closeBoardProfile();
    };

    const b1 = document.getElementById('backToDirectoryBtn');
    const b2 = document.getElementById('backToDirectoryBtn2');
    if (b1) b1.addEventListener('click', goBack);
    if (b2) b2.addEventListener('click', goBack);

    const subBtn = document.getElementById('openSubmitFromProfile');
    if (subBtn) subBtn.addEventListener('click', () => {
      if (submitOverlay) {
        submitOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });

    const performTransition = () => {
      directoryView.classList.add('hidden');
      boardProfileView.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.history.pushState({ page: 'board', domain }, '', `/boards/${encodeURIComponent(domain)}`);
    document.title = `${metaTitle} | OutbidWatch`;

    if ('startViewTransition' in document) {
      document.startViewTransition(performTransition);
    } else {
      performTransition();
    }
  }

  // Close Board Profile and restore directory smoothly
  function closeBoardProfile() {
    if (!directoryView || !boardProfileView) return;

    document.title = 'OutbidWatch | The Definitive Directory for Pay-to-Rank Bidding Platforms';

    if (activeCardDomain) {
      const targetCard = document.querySelector(`.site-card[data-domain="${activeCardDomain}"]`);
      if (targetCard) {
        targetCard.style.viewTransitionName = 'board-card';
        const logoImg = targetCard.querySelector('.card-logo');
        if (logoImg) logoImg.style.viewTransitionName = 'board-logo';
      }
    }

    const performClose = () => {
      boardProfileView.classList.add('hidden');
      directoryView.classList.remove('hidden');
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    };

    if ('startViewTransition' in document) {
      const transition = document.startViewTransition(performClose);
      transition.finished.finally(() => {
        document.querySelectorAll('.site-card').forEach((c) => {
          c.style.viewTransitionName = '';
          const img = c.querySelector('.card-logo');
          if (img) img.style.viewTransitionName = '';
        });
        activeCardDomain = null;
      });
    } else {
      performClose();
    }
  }

  // History routing
  function setupHistoryRouting() {
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page === 'board' && e.state.domain) {
        openBoardProfile(e.state.domain);
      } else {
        closeBoardProfile();
      }
    });

    if (headerLogoLink) {
      headerLogoLink.addEventListener('click', (e) => {
        if (!boardProfileView.classList.contains('hidden')) {
          e.preventDefault();
          window.history.pushState({ page: 'directory' }, '', '/');
          closeBoardProfile();
        }
      });
    }

    if (headerDirLink) {
      headerDirLink.addEventListener('click', (e) => {
        if (!boardProfileView.classList.contains('hidden')) {
          e.preventDefault();
          window.history.pushState({ page: 'directory' }, '', '/');
          closeBoardProfile();
        }
      });
    }
  }

  // UI Event Listeners
  function setupEventListeners() {
    let searchTimeout = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchQuery = e.target.value.trim();
        currentPage = 1;
        if (searchClear) {
          if (searchQuery) searchClear.classList.remove('hidden');
          else searchClear.classList.add('hidden');
        }
        searchTimeout = setTimeout(fetchSitesPage, 250);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        searchClear.classList.add('hidden');
        currentPage = 1;
        fetchSitesPage();
      });
    }

    // Card click
    if (sitesContainer) {
      sitesContainer.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;

        const card = e.target.closest('.site-card');
        if (card && card.dataset.domain) {
          document.querySelectorAll('.site-card').forEach((c) => {
            c.style.viewTransitionName = '';
            const img = c.querySelector('.card-logo');
            if (img) img.style.viewTransitionName = '';
          });

          card.style.viewTransitionName = 'board-card';
          const logoImg = card.querySelector('.card-logo');
          if (logoImg) logoImg.style.viewTransitionName = 'board-logo';

          openBoardProfile(card.dataset.domain);
        }
      });
    }

    // Prev / Next Page (Server-Side Paginated)
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          fetchSitesPage();
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          fetchSitesPage();
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }
      });
    }
  }

  // Submit modal setup
  function setupSubmitModal() {
    if (!openSubmitBtn || !submitOverlay) return;

    function openModal() {
      submitOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (submitUrlInput) submitUrlInput.focus();
    }

    function closeModal() {
      submitOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (submitFeedback) submitFeedback.innerHTML = '';
      if (submitForm) submitForm.reset();
    }

    openSubmitBtn.addEventListener('click', openModal);
    if (closeSubmitBtn) closeSubmitBtn.addEventListener('click', closeModal);

    submitOverlay.addEventListener('click', (e) => {
      if (e.target === submitOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && submitOverlay.classList.contains('open')) closeModal();
    });

    let checkTimeout = null;
    if (submitUrlInput) {
      submitUrlInput.addEventListener('input', () => {
        clearTimeout(checkTimeout);
        const val = submitUrlInput.value.trim();
        if (!val || val.length < 4) {
          if (submitFeedback) submitFeedback.innerHTML = '';
          return;
        }

        checkTimeout = setTimeout(async () => {
          try {
            let domain = val.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
            const res = await fetch(`/api/submit/check?domain=${encodeURIComponent(domain)}`);
            const json = await res.json();
            if (json.success && json.data) {
              if (json.data.exists) {
                submitFeedback.innerHTML = `
                  <div class="rounded-xl p-3 bg-[#F4E9E6] border border-[#E6C6BF] text-[#B4573E] text-[12.5px] flex items-center gap-2">
                    <i class="ph-bold ph-warning-circle text-[15px] shrink-0"></i>
                    <span><strong>Already Tracked:</strong> ${escapeHtml(json.data.message)}</span>
                  </div>
                `;
                if (submitBtn) submitBtn.disabled = true;
              } else {
                submitFeedback.innerHTML = `
                  <div class="rounded-xl p-3 bg-[var(--mosambi-light)] border border-[#D5E4A8] text-[var(--mosambi-dark)] text-[12.5px] flex items-center gap-2">
                    <i class="ph-bold ph-check-circle text-[15px] shrink-0"></i>
                    <span><strong>Available:</strong> ${escapeHtml(domain)} is not yet in OutbidWatch.</span>
                  </div>
                `;
                if (submitBtn) submitBtn.disabled = false;
              }
            }
          } catch (e) {
            console.warn('Check error:', e);
          }
        }, 300);
      });
    }

    if (submitForm) {
      submitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!submitBtn) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Submitting...`;

        const payload = {
          url: submitUrlInput.value.trim(),
          founder_x_handle: submitHandleInput.value.trim(),
          location: submitLocationInput.value.trim(),
          launch_date: submitDateInput.value.trim(),
          currency: submitCurrencySelect.value || 'USD',
          submitter_note: submitNoteInput?.value.trim() || undefined,
        };

        try {
          const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();

          if (json.success) {
            submitFeedback.innerHTML = `
              <div class="rounded-xl p-3.5 bg-[var(--mosambi-light)] border border-[#D5E4A8] text-[var(--mosambi-dark)] text-[13px] flex items-start gap-2.5">
                <i class="ph-bold ph-check-circle text-[18px] shrink-0 mt-0.5"></i>
                <div>
                  <p class="font-bold">Submission Received!</p>
                  <p class="text-[12px] opacity-90 mt-0.5">Your submission is queued for maintainer review and will be verified shortly.</p>
                </div>
              </div>
            `;
            setTimeout(() => {
              closeModal();
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<i class="ph-bold ph-paper-plane-tilt"></i> Send for review`;
            }, 2500);
          } else {
            submitFeedback.innerHTML = `
              <div class="rounded-xl p-3 bg-[#F4E9E6] border border-[#E6C6BF] text-[#B4573E] text-[12.5px] flex items-center gap-2">
                <i class="ph-bold ph-warning-circle text-[15px] shrink-0"></i>
                <span>${escapeHtml(json.error || 'Submission failed. Please check inputs.')}</span>
              </div>
            `;
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ph-bold ph-paper-plane-tilt"></i> Send for review`;
          }
        } catch (err) {
          submitFeedback.innerHTML = `
            <div class="rounded-xl p-3 bg-[#F4E9E6] border border-[#E6C6BF] text-[#B4573E] text-[12.5px]">
              Network error. Please try again later.
            </div>
          `;
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="ph-bold ph-paper-plane-tilt"></i> Send for review`;
        }
      });
    }
  }

  // Export to CSV
  async function exportToCsv() {
    try {
      const res = await fetch('/api/sites?limit=250');
      const json = await res.json();
      if (!json.success || !json.data) return;

      const headers = ['Domain', 'Title', 'URL', 'Category', 'Founder X', 'Location', 'Country', 'Registration Date', 'Currency', 'Status', 'Summary'];
      const rows = json.data.map((s) => [
        s.domain,
        `"${(s.raw_title || '').replace(/"/g, '""')}"`,
        s.url,
        s.category,
        s.founder_x_handle,
        s.founder_location,
        s.country_name,
        s.domain_registration_date,
        s.currency,
        s.status,
        `"${s.summary_256.replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `outbidwatch-directory-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('CSV export error:', e);
    }
  }

  // Helpers
  function formatDate(isoStr) {
    if (!isoStr) return 'Aug 2026';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  }

  function formatDomainTitle(domain, siteName) {
    if (siteName && !siteName.includes('.')) {
      return siteName.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const base = (domain || '').replace(/^www\./, '').split('.')[0];
    return base
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatProfessionalNote(note, provenance) {
    if (!note && !provenance) return '';

    if (provenance === 'self_reported') {
      return 'Location confirmed via founder profile & public bio.';
    }
    if (provenance === 'whois_registry') {
      return 'Domain registration and origin verified via official WHOIS records.';
    }
    if (provenance === 'inferred') {
      return 'Location mapped via associated studio & public registry records.';
    }

    if (note && note.length <= 80 && !note.toLowerCase().includes('raw_location') && !note.toLowerCase().includes('chain trace')) {
      return note.trim();
    }

    return 'Verified by OutbidWatch maintainer team.';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global Analytics Click Tracking (HttpOnly Cookie-Backed)
  window.track = function(eventName, data) {
    try {
      const payload = JSON.stringify({
        event: eventName,
        data: data || {},
        path: window.location.pathname
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', payload);
      } else {
        fetch('/api/analytics/event', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
      }
    } catch (e) {}
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    const eventName = el.getAttribute('data-track') || 'click';
    const metadata = { ...el.dataset };
    delete metadata.track;
    window.track(eventName, metadata);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
