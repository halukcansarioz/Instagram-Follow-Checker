/**
 * Instagram Follow Checker Pro — Tam Sürüm (v10 Pro — Kusursuz Responsive Header, Modern Segmented Tabs & Tarayıcı Teması)
 *
 * v10 Pro Yenilikleri ve Düzeltmeleri:
 * 1. Pencere Daraltıldığında Üst Butonların Kaybolması Kesin Olarak Çözüldü (Resim 2 Çözümü):
 *    - Üst başlık çubuğu (`igfc-header`) esnek yapıya (`flex-wrap: wrap`) kavuşturuldu ve
 *      pencere kontrol butonları (`A-`, `A+`, `—`, `⛶`, `✕`) sağ tarafa sabitlendi (`margin-left: auto`).
 *    - İstatistik kartları sabit 7 sütun yerine `grid-template-columns: repeat(auto-fit, minmax(115px, 1fr))`
 *      yapısına geçirildi; pencereyi ne kadar daraltırsanız daraltın hiçbir kart veya buton sağdan kesilmez!
 * 2. Sekme ve Seçim Butonlarının Tasarımı Yenilendi (Resim 1 Çözümü):
 *    - Sekmeler dağınık balonlar yerine modern, ikonlu ve sayı rozetli bir Segmented Control
 *      (Sekme Şeridi) içine alındı.
 *    - "Tümünü Seç | Tersini Seç | Temizle" butonları birleşik kapsül (Segmented Pill Toolbar)
 *      tasarımına dönüştürüldü; böylece sekmelerle asla karışmaz ve çok şık durur.
 * 3. İlk Açılışta Otomatik Tarayıcı / Sistem Teması Algılama (`system` — Açık & Koyu Mod):
 *    - İlk açılışta tarayıcınızın / işletim sisteminizin temasını (`prefers-color-scheme`) ve
 *      Instagram'ın aktif modunu otomatik algılar. Tarayıcınız Açık (Light) temadaysa ferah Açık Tema,
 *      Koyu (Dark) temadaysa Koyu Tema ile açılır ve canlı olarak değişimi takip eder.
 * 4. Yeni Eklenen "Karşılaştır & Araçlar" Bölümü:
 *    - İki farklı tarama zamanını veya listeyi karşılaştırma, Hızlı Beyaz Liste (Toplu kullanıcı adı
 *      yapıştırarak koruma), ve Tek Tıkla Güvenli Temizlik Sihirbazı eklendi.
 */

(() => {
  'use strict';

  const EXISTING_ID = 'ig-follow-checker-root';
  const existingEl = document.getElementById(EXISTING_ID);
  if (existingEl) existingEl.remove();

  // Sabitler
  const IG_APP_ID = '936619743392459';
  const FOLLOWERS_QUERY_HASH = 'c76146de99bb02f6415203be841dd25a';
  const FOLLOWING_QUERY_HASH = 'd04b0a864b4b54837c0d870b0e77e076';
  const TIMELINE_DOC_ID = '9310670392322965';
  const PAGE_SIZE = 50;

  // LocalStorage Anahtarları
  const STORAGE_WHITELIST = 'ig_fc_whitelist_v5';
  const STORAGE_SNAPSHOT = 'ig_fc_snapshot_v5';
  const STORAGE_UNFOLLOW_LOG = 'ig_fc_unfollow_log_v5';
  const STORAGE_LAST_SCAN = 'ig_fc_last_scan_v6';
  const STORAGE_USER_NOTES = 'ig_fc_user_notes_v8';
  const STORAGE_SETTINGS = 'ig_fc_settings_v10';
  const STORAGE_DAILY_QUOTA = 'ig_fc_daily_quota_v9';

  // Sürüm Geçmişi (Changelog) Verisi
  const CHANGELOG_HISTORY = [
    {
      version: 'v10 Pro (Güncel Sürüm)',
      date: 'Ekim 2026',
      badge: 'Kusursuz Tasarım',
      items: [
        'Pencere küçültüldüğünde veya daraltıldığında üst bardaki butonların ve sağdaki istatistik kartlarının ekran dışına taşması tamamen giderildi (Tam Responsive Header & Grid).',
        'Sekme butonları sayı rozetli modern Segmented Bar tasarımına kavuşturuldu; "Tümünü Seç / Tersini Seç / Temizle" butonları birleşik kapsül (Pill Toolbar) haline getirildi.',
        'İlk açılışta Tarayıcı / Sistem Temasını (Açık Mod veya Koyu Mod) otomatik algılayan dinamik tema motoru eklendi.',
        'Toplu Kullanıcı Adı ile Koruma Ekleme ve Akıllı Temizlik Sihirbazı araçları eklendi.',
      ],
    },
    {
      version: 'v9 Pro Ultimate',
      date: 'Ekim 2026',
      badge: 'Ultimate',
      items: [
        'Canlı Profil Detay Kartı (🔍): Sayfadan ayrılmadan kullanıcının biyografisini, takipçi/takip/gönderi sayılarını ve hesap detaylarını görüntüleme eklendi.',
        'Akıllı Şüpheli / Bot / İnaktif Hesap Tespiti (👻): Profil resmi olmayan, isimsiz veya çok rakamlı kullanıcı adına sahip hesapları otomatik tespit eden algoritma ve sekme eklendi.',
        'Anti-Ban Otomatik Soğuma Molası & Günlük Kota Takibi: Toplu işlemde her 10 işlemde bir otomatik dinlenme molası ve günlük işlem sayacı eklendi.',
      ],
    },
    {
      version: 'v8 Pro',
      date: 'Ekim 2026',
      badge: 'Pencere & Analiz',
      items: [
        'Küçültme (Minimize) modunda özel "▢ Büyüt" butonu ve 8 yönlü (tüm kenar ve köşelerden) fareyle boyutlandırma eklendi.',
        'Sürüm Geçmişi (Changelog) penceresi, Hesap Analiz Raporu (📊) ve kullanıcılara özel Not Ekleme (📝) özellikleri eklendi.',
      ],
    },
    {
      version: 'v5 — v7 Pro',
      date: 'Ekim 2026',
      badge: 'Pro Özellikler',
      items: [
        'Kırık profil resimleri için crossOrigin + Blob yükleyici ve renkli SVG Baş Harf Avatar yedeği eklendi.',
        'Tam genişlikte 14px ilerleme çubuğu, A-/A+ ölçeklendirme ve Snapshot karşılaştırma eklendi.',
      ],
    },
    {
      version: 'v1 — v4',
      date: 'Ekim 2026',
      badge: '429 & 404 Çözümü',
      items: [
        'Instagram tarafından kapatılan web_profile_info (429) ve eski arama/feed (404) uç noktaları kaldırılıp ds_user_id, data-sjs ve GraphQL/REST v1 yedekli mimari kuruldu.',
      ],
    },
  ];

  // Hız Profilleri
  const SPEED_PROFILES = {
    fast: { min: 2000, max: 3800, batchPauseEvery: 15, batchPauseSec: 20, label: 'Hızlı (2-4 sn)' },
    safe: { min: 4000, max: 7000, batchPauseEvery: 10, batchPauseSec: 30, label: 'Güvenli (4-7 sn + Mola)' },
    ultra: { min: 7000, max: 12000, batchPauseEvery: 8, batchPauseSec: 45, label: 'Çok Güvenli (7-12 sn)' },
  };

  // Kayıtlı Ayarları Yükle (Varsayılan tema: 'system' -> Tarayıcı teması)
  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{}');

  // Durum (State)
  const state = {
    isRunning: false,
    isBulkRunning: false,
    abortController: null,
    bulkAbort: false,
    username: '',
    userId: '',
    lastScannedAt: null,
    followers: [],
    following: [],
    nonFollowers: [],
    fans: [],
    mutuals: [],
    suspicious: [],
    lostFollowers: [],
    newFollowers: [],
    whitelist: new Set(JSON.parse(localStorage.getItem(STORAGE_WHITELIST) || '[]')),
    unfollowHistory: JSON.parse(localStorage.getItem(STORAGE_UNFOLLOW_LOG) || '[]'),
    userNotes: JSON.parse(localStorage.getItem(STORAGE_USER_NOTES) || '{}'),
    selectedIds: new Set(),
    lastClickedIndex: -1,
    activeTab: 'nonFollowers',
    searchQuery: '',
    filterType: 'all',
    sortBy: 'default',
    viewMode: savedSettings.viewMode || 'grid',
    speedMode: savedSettings.speedMode || 'safe',
    theme: savedSettings.theme || 'system', // system (Tarayıcı Teması) | light | midnight | oled | cyber | sunset
    autoCooldown: savedSettings.autoCooldown !== false,
    isMaximized: false,
    isMinimized: false,
    savedBounds: null,
    uiScale: savedSettings.uiScale || 100,
    isLogOpen: false,
    avatarBlobCache: new Map(),
    profileDetailsCache: new Map(),
  };

  // Yardımcı Fonksiyonlar
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomDelay = (min = 700, max = 1400) =>
    sleep(Math.floor(Math.random() * (max - min + 1)) + min);

  /**
   * Tarayıcının / Sistemin aktif temasını algılar (Light vs Dark)
   */
  function resolveEffectiveTheme(themePref) {
    if (themePref && themePref !== 'system') return themePref;
    const igIsDark =
      document.documentElement.classList.contains('_aa4d') ||
      getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)';
    const browserPrefersLight =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (browserPrefersLight && !igIsDark) {
      return 'light';
    }
    return 'midnight';
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_SETTINGS,
        JSON.stringify({
          viewMode: state.viewMode,
          speedMode: state.speedMode,
          theme: state.theme,
          autoCooldown: state.autoCooldown,
          uiScale: state.uiScale,
        })
      );
    } catch (_) {}
  }

  function getTodayQuota() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_DAILY_QUOTA) || '{}');
      if (raw.date === today) return raw.count || 0;
    } catch (_) {}
    return 0;
  }

  function incrementTodayQuota() {
    const today = new Date().toISOString().slice(0, 10);
    const next = getTodayQuota() + 1;
    try {
      localStorage.setItem(STORAGE_DAILY_QUOTA, JSON.stringify({ date: today, count: next }));
    } catch (_) {}
    const el = document.getElementById('igfc-quota-badge');
    if (el) el.textContent = `Bugün: ${next} işlem`;
    return next;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getCsrfToken() {
    return getCookie('csrftoken') || '';
  }

  function getDefaultUsername() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const reserved = new Set([
      'explore',
      'direct',
      'reels',
      'stories',
      'accounts',
      'p',
      'tv',
      'challenge',
      'legal',
      'about',
    ]);
    if (pathParts.length === 1 && !reserved.has(pathParts[0])) {
      return pathParts[0];
    }
    return '';
  }

  function saveWhitelist() {
    localStorage.setItem(STORAGE_WHITELIST, JSON.stringify([...state.whitelist]));
  }

  function saveUserNotes() {
    localStorage.setItem(STORAGE_USER_NOTES, JSON.stringify(state.userNotes));
  }

  function saveUnfollowHistory() {
    localStorage.setItem(
      STORAGE_UNFOLLOW_LOG,
      JSON.stringify(state.unfollowHistory.slice(0, 500))
    );
  }

  function saveLastScanCache() {
    try {
      const payload = {
        username: state.username,
        userId: state.userId,
        lastScannedAt: state.lastScannedAt,
        followers: state.followers,
        following: state.following,
        lostFollowers: state.lostFollowers,
        newFollowers: state.newFollowers,
      };
      localStorage.setItem(STORAGE_LAST_SCAN, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadLastScanCache() {
    try {
      const raw = localStorage.getItem(STORAGE_LAST_SCAN);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.followers) && Array.isArray(data.following)) {
        state.username = data.username || '';
        state.userId = data.userId || '';
        state.lastScannedAt = data.lastScannedAt || null;
        state.followers = data.followers;
        state.following = data.following;
        state.lostFollowers = data.lostFollowers || [];
        state.newFollowers = data.newFollowers || [];
        return true;
      }
    } catch (_) {}
    return false;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function computeSuspicionInfo(user, isNonFollower) {
    let score = 0;
    const reasons = [];
    const uname = String(user.username || '');
    const fname = String(user.full_name || '').trim();
    const pic = String(user.profile_pic_url || '');

    if (
      !pic ||
      pic.includes('44884218_345707102882519') ||
      pic.includes('default_profile') ||
      pic.includes('anonymous')
    ) {
      score += 45;
      reasons.push('Profil resmi yok');
    }

    const digitCount = (uname.match(/\d/g) || []).length;
    if (digitCount >= 4) {
      score += 25;
      reasons.push('Çok rakamlı kullanıcı adı');
    }

    if (!fname) {
      score += 20;
      reasons.push('İsim alanı boş');
    }

    if (isNonFollower && !user.is_verified) {
      score += 15;
    }

    if (user.is_verified) {
      score = 0;
      reasons.length = 0;
    }

    return {
      score: Math.min(100, score),
      isSuspicious: score >= 45,
      reasons,
    };
  }

  function generateSvgAvatar(username, fullName) {
    const label = (fullName || username || '?').trim().replace(/^@/, '');
    const parts = label.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : label.slice(0, 2).toUpperCase();

    const palettes = [
      ['#6366f1', '#a855f7'],
      ['#ec4899', '#f43f5e'],
      ['#3b82f6', '#06b6d4'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#ef4444'],
      ['#8b5cf6', '#ec4899'],
      ['#14b8a6', '#3b82f6'],
    ];
    let hash = 0;
    for (let i = 0; i < (username || '').length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const [c1, c2] = palettes[Math.abs(hash) % palettes.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="40" fill="url(#g)"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="700">${escapeHtml(
        initials
      )}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  async function hydrateAvatarImage(imgEl, picUrl, username, fullName) {
    const fallbackSvg = generateSvgAvatar(username, fullName);
    if (!picUrl) {
      imgEl.src = fallbackSvg;
      return;
    }

    if (state.avatarBlobCache.has(picUrl)) {
      imgEl.src = state.avatarBlobCache.get(picUrl);
      return;
    }

    imgEl.onerror = async () => {
      imgEl.onerror = null;
      try {
        const res = await fetch(picUrl, { mode: 'cors', credentials: 'omit' });
        if (res.ok) {
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          state.avatarBlobCache.set(picUrl, objectUrl);
          imgEl.src = objectUrl;
          return;
        }
      } catch (_) {}
      imgEl.src = fallbackSvg;
    };

    imgEl.crossOrigin = 'anonymous';
    imgEl.src = picUrl;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('igfc-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `igfc-toast igfc-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function addLog(message, type = 'info') {
    const logContainer = document.getElementById('igfc-log-list');
    const lastLogPreview = document.getElementById('igfc-last-log-preview');
    const time = new Date().toLocaleTimeString('tr-TR');
    if (lastLogPreview) {
      lastLogPreview.textContent = `[${time}] ${message}`;
    }
    if (!logContainer) return;
    const item = document.createElement('div');
    item.className = `igfc-log-item igfc-log-${type}`;
    item.textContent = `[${time}] ${message}`;
    logContainer.prepend(item);
  }

  function findStrictUserInJson(obj, targetUsername) {
    if (!obj || typeof obj !== 'object') return null;

    if (obj.xig_user_by_username && typeof obj.xig_user_by_username === 'object') {
      const u = obj.xig_user_by_username;
      if (
        (u.id || u.pk) &&
        (!targetUsername || String(u.username || '').toLowerCase() === targetUsername.toLowerCase())
      ) {
        return u;
      }
    }

    if (
      obj.username &&
      (obj.id || obj.pk) &&
      (!targetUsername || String(obj.username).toLowerCase() === targetUsername.toLowerCase()) &&
      (typeof obj.follower_count === 'number' ||
        typeof obj.following_count === 'number' ||
        obj.edge_followed_by?.count !== undefined ||
        obj.edge_follow?.count !== undefined)
    ) {
      return obj;
    }

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const found = findStrictUserInJson(val, targetUsername);
        if (found) return found;
      }
    }
    return null;
  }

  function getLoggedInViewerFromDOM() {
    const cookieId = getCookie('ds_user_id');
    const html = document.documentElement.innerHTML;

    if (cookieId) {
      const escapedId = cookieId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const viewerMatch =
        html.match(
          new RegExp(`"id"\\s*:\\s*"${escapedId}"[^}]{0,400}?"username"\\s*:\\s*"([^"]+)"`)
        ) ||
        html.match(
          new RegExp(`"username"\\s*:\\s*"([^"]+)"[^}]{0,400}?"id"\\s*:\\s*"${escapedId}"`)
        ) ||
        html.match(
          new RegExp(`"pk"\\s*:\\s*"?${escapedId}"?[^}]{0,400}?"username"\\s*:\\s*"([^"]+)"`)
        );

      if (viewerMatch && viewerMatch[1]) {
        return { id: String(cookieId), username: viewerMatch[1] };
      }
    }

    return cookieId ? { id: String(cookieId), username: '' } : null;
  }

  function extractStrictProfileFromScripts(scriptsNodeList, targetUsername, rawHtml = '') {
    const cleanTarget = (targetUsername || '').toLowerCase();

    for (const script of scriptsNodeList) {
      const text = script.textContent || '';
      if (!text || !text.trim().startsWith('{')) continue;
      if (cleanTarget && !text.toLowerCase().includes(cleanTarget)) continue;

      try {
        const parsed = JSON.parse(text);
        const found = findStrictUserInJson(parsed, cleanTarget);
        if (found && (found.id || found.pk)) {
          return {
            id: String(found.id || found.pk),
            username: found.username || targetUsername,
            fullName: found.full_name || '',
            biography: found.biography || '',
            externalUrl: found.external_url || '',
            profilePicUrl: found.profile_pic_url_hd || found.profile_pic_url || '',
            followerCount: found.follower_count ?? found.edge_followed_by?.count ?? 0,
            followingCount: found.following_count ?? found.edge_follow?.count ?? 0,
            mediaCount: found.media_count ?? found.edge_owner_to_timeline_media?.count ?? 0,
            isVerified: Boolean(found.is_verified),
            isPrivate: Boolean(found.is_private),
          };
        }
      } catch (_) {}
    }

    if (rawHtml) {
      const profilePageMatch =
        rawHtml.match(/"profilePage_(\d+)"/) ||
        rawHtml.match(/instagram:\/\/user\?username=[^"&]+&amp;userid=(\d+)/);
      if (profilePageMatch && profilePageMatch[1]) {
        return {
          id: String(profilePageMatch[1]),
          username: targetUsername,
          fullName: '',
          biography: '',
          externalUrl: '',
          profilePicUrl: '',
          followerCount: 0,
          followingCount: 0,
          mediaCount: 0,
        };
      }
    }

    return null;
  }

  async function fetchWithRetry(url, options = {}, maxRetries = 4) {
    const headers = {
      'X-IG-App-ID': IG_APP_ID,
      'X-CSRFToken': getCsrfToken(),
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers || {}),
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (state.abortController?.signal.aborted) {
        throw new Error('İşlem kullanıcı tarafından durduruldu.');
      }

      const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers,
        signal: state.abortController?.signal,
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        const waitSec = Math.pow(2, attempt) * 4;
        addLog(`Rate limit (429) algılandı, ${waitSec} saniye bekleniyor...`, 'warn');
        for (let s = waitSec; s > 0; s--) {
          if (state.abortController?.signal.aborted) {
            throw new Error('İşlem kullanıcı tarafından durduruldu.');
          }
          updateStatus(`Rate limit (429). Deneme ${attempt}/${maxRetries} — ${s}s bekleniyor...`);
          await sleep(1000);
        }
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    }

    throw new Error('Maksimum deneme sayısına ulaşıldı (429 Too Many Requests).');
  }

  async function resolveUserProfile(username) {
    const cleanUser = username.trim().replace(/^@/, '');
    const cookieUserId = getCookie('ds_user_id');
    const viewer = getLoggedInViewerFromDOM();

    if (
      cookieUserId &&
      (!cleanUser ||
        (viewer?.username && viewer.username.toLowerCase() === cleanUser.toLowerCase()))
    ) {
      return {
        id: String(cookieUserId),
        username: cleanUser || viewer?.username || getDefaultUsername() || 'aktif_hesap',
        fullName: 'Aktif Oturum',
        profilePicUrl: '',
        followerCount: 0,
        followingCount: 0,
      };
    }

    if (cleanUser) {
      const domProfile = extractStrictProfileFromScripts(
        document.querySelectorAll('script[type="application/json"]'),
        cleanUser,
        window.location.pathname.toLowerCase().includes(`/${cleanUser.toLowerCase()}`)
          ? document.documentElement.innerHTML
          : ''
      );
      if (domProfile?.id) {
        return domProfile;
      }

      try {
        updateStatus(`@${cleanUser} GraphQL üzerinden doğrulanıyor...`);
        const variables = JSON.stringify({
          data: {
            count: 1,
            include_relationship_info: true,
            latest_besties_reel_media: true,
            latest_reel_media: true,
          },
          username: cleanUser,
          __relay_internal__pv__PolarisIsLoggedInrelayprovider: true,
        });
        const gqlUrl = `https://www.instagram.com/graphql/query/?doc_id=${TIMELINE_DOC_ID}&variables=${encodeURIComponent(
          variables
        )}`;
        const gqlRes = await fetchWithRetry(gqlUrl, {}, 2);
        const gqlJson = await gqlRes.json();
        const edges =
          gqlJson?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges || [];
        const firstUser = edges[0]?.node?.user || edges[0]?.node?.owner;
        if (firstUser && (firstUser.pk || firstUser.id)) {
          return {
            id: String(firstUser.pk || firstUser.id),
            username: firstUser.username || cleanUser,
            fullName: firstUser.full_name || '',
            profilePicUrl: firstUser.profile_pic_url || '',
            followerCount: 0,
            followingCount: 0,
          };
        }
      } catch (_) {}

      try {
        updateStatus(`@${cleanUser} profil sayfası okunuyor...`);
        const htmlRes = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUser)}/`, {
          credentials: 'include',
          signal: state.abortController?.signal,
        });
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const extracted = extractStrictProfileFromScripts(
            doc.querySelectorAll('script[type="application/json"]'),
            cleanUser,
            html
          );
          if (extracted?.id) {
            return extracted;
          }
        }
      } catch (_) {}
    }

    if (cookieUserId) {
      return {
        id: String(cookieUserId),
        username: cleanUser || viewer?.username || 'aktif_hesap',
        fullName: 'Aktif Oturum',
        profilePicUrl: '',
        followerCount: 0,
        followingCount: 0,
      };
    }

    throw new Error(
      'Kullanıcı ID çözümlenemedi. Lütfen Instagram hesabınıza giriş yaptığınızdan emin olun.'
    );
  }

  async function fetchViaRestApi(userId, type, expectedTotal, progressStart, progressEnd) {
    const list = [];
    const seenIds = new Set();
    const isFollowers = type === 'followers';
    const label = isFollowers ? 'Takipçiler' : 'Takip edilenler';
    let maxId = null;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({ count: String(PAGE_SIZE) });
      if (maxId) params.set('max_id', String(maxId));

      const url = `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(
        userId
      )}/${type}/?${params.toString()}`;
      const res = await fetchWithRetry(url);
      const data = await res.json();

      const users = data?.users || [];
      for (const u of users) {
        const uid = String(u.pk || u.id || '');
        if (uid && !seenIds.has(uid)) {
          seenIds.add(uid);
          list.push({
            id: uid,
            username: u.username || '',
            full_name: u.full_name || '',
            profile_pic_url: u.profile_pic_url_hd || u.profile_pic_url || '',
            is_verified: Boolean(u.is_verified),
            is_private: Boolean(u.is_private),
          });
        }
      }

      const ratio = expectedTotal > 0 ? Math.min(1, list.length / expectedTotal) : 0.5;
      const pct = Math.round(progressStart + ratio * (progressEnd - progressStart));
      updateProgress(pct);
      updateStatus(
        `${label} çekiliyor... (${list.length}${expectedTotal ? ' / ' + expectedTotal : ''})`
      );

      if (data?.next_max_id) {
        maxId = data.next_max_id;
        await randomDelay(750, 1450);
      } else {
        hasMore = false;
      }
    }

    return list;
  }

  async function fetchViaGraphQL(userId, type, expectedTotal, progressStart, progressEnd) {
    const list = [];
    const seenIds = new Set();
    const isFollowers = type === 'followers';
    const label = isFollowers ? 'Takipçiler' : 'Takip edilenler';
    let hasNextPage = true;
    let endCursor = null;
    let totalCount = expectedTotal || 0;
    const queryHash = isFollowers ? FOLLOWERS_QUERY_HASH : FOLLOWING_QUERY_HASH;
    const edgeKey = isFollowers ? 'edge_followed_by' : 'edge_follow';

    while (hasNextPage) {
      const variables = {
        id: String(userId),
        include_reel: true,
        fetch_mutual: false,
        first: PAGE_SIZE,
      };
      if (endCursor) variables.after = endCursor;

      const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(
        JSON.stringify(variables)
      )}`;

      const res = await fetchWithRetry(url);
      const json = await res.json();
      const edgeObj = json?.data?.user?.[edgeKey];

      if (!edgeObj) {
        throw new Error('GraphQL edge verisi bulunamadı.');
      }

      if (!totalCount && typeof edgeObj.count === 'number') {
        totalCount = edgeObj.count;
      }

      const edges = edgeObj.edges || [];
      for (const edge of edges) {
        const node = edge?.node;
        if (node && node.id && !seenIds.has(String(node.id))) {
          seenIds.add(String(node.id));
          list.push({
            id: String(node.id),
            username: node.username || '',
            full_name: node.full_name || '',
            profile_pic_url: node.profile_pic_url || '',
            is_verified: Boolean(node.is_verified),
            is_private: Boolean(node.is_private),
          });
        }
      }

      const ratio = totalCount > 0 ? Math.min(1, list.length / totalCount) : 0.5;
      const pct = Math.round(progressStart + ratio * (progressEnd - progressStart));
      updateProgress(pct);
      updateStatus(
        `${label} çekiliyor... (${list.length}${totalCount ? ' / ' + totalCount : ''})`
      );

      hasNextPage = Boolean(edgeObj.page_info?.has_next_page && edgeObj.page_info?.end_cursor);
      endCursor = edgeObj.page_info?.end_cursor || null;

      if (hasNextPage) {
        await randomDelay(700, 1350);
      }
    }

    return list;
  }

  async function fetchFriendshipList(userId, type, expectedTotal, progressStart, progressEnd) {
    try {
      const restList = await fetchViaRestApi(
        userId,
        type,
        expectedTotal,
        progressStart,
        progressEnd
      );
      if (restList.length > 0) {
        return restList;
      }
    } catch (restErr) {
      if (state.abortController?.signal.aborted) throw restErr;
    }

    return fetchViaGraphQL(userId, type, expectedTotal, progressStart, progressEnd);
  }

  // Etkileşim API Fonksiyonları
  async function unfollowUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/destroy/${encodeURIComponent(
      userId
    )}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    incrementTodayQuota();
    return res.json();
  }

  async function followUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/create/${encodeURIComponent(
      userId
    )}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    incrementTodayQuota();
    return res.json();
  }

  async function removeFollowerUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/remove_follower/${encodeURIComponent(
      userId
    )}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    incrementTodayQuota();
    return res.json();
  }

  function compareAndSaveSnapshot(userId, currentFollowers) {
    const allSnapshots = JSON.parse(localStorage.getItem(STORAGE_SNAPSHOT) || '{}');
    const prev = allSnapshots[userId];

    if (prev && Array.isArray(prev.followers)) {
      const currIds = new Set(currentFollowers.map((u) => String(u.id)));
      const prevIds = new Set(prev.followers.map((u) => String(u.id)));

      state.lostFollowers = prev.followers.filter((u) => !currIds.has(String(u.id)));
      state.newFollowers = currentFollowers.filter((u) => !prevIds.has(String(u.id)));

      if (state.lostFollowers.length > 0 || state.newFollowers.length > 0) {
        addLog(
          `Önceki taramayla karşılaştırıldı: ${state.lostFollowers.length} kişi takipten çıkmış, ${state.newFollowers.length} yeni takipçi var.`,
          'info'
        );
      }
    } else {
      state.lostFollowers = [];
      state.newFollowers = [];
    }

    allSnapshots[userId] = {
      updatedAt: new Date().toISOString(),
      followers: currentFollowers.map((u) => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        profile_pic_url: u.profile_pic_url,
        is_verified: u.is_verified,
        is_private: u.is_private,
      })),
    };
    try {
      localStorage.setItem(STORAGE_SNAPSHOT, JSON.stringify(allSnapshots));
    } catch (_) {}
  }

  // CANLI PROFİL DETAY & BİYOGRAFİ İNCELEME KARTI
  async function openUserDetailModal(user, avatarSrc) {
    const existing = document.getElementById('igfc-submodal');
    if (existing) existing.remove();

    const uid = String(user.id);
    const isFollower = state.followers.some((u) => String(u.id) === uid);
    const isFollowing = state.following.some((u) => String(u.id) === uid);
    const suspicion = computeSuspicionInfo(user, isFollowing && !isFollower);

    const box = document.createElement('div');
    box.id = 'igfc-submodal';
    box.className = 'igfc-submodal-backdrop';

    box.innerHTML = `
      <div class="igfc-submodal-box" style="max-width:540px;" onclick="event.stopPropagation()">
        <div class="igfc-submodal-header">
          <span style="font-size:16px; font-weight:800;">🔍 Kullanıcı Detay Kartı — @${escapeHtml(
            user.username
          )}</span>
          <button class="igfc-win-btn close" id="igfc-submodal-close">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${avatarSrc}" style="width:92px; height:92px; border-radius:50%; object-fit:cover; border:3px solid #3b82f6; flex-shrink:0;" />
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <a href="https://www.instagram.com/${encodeURIComponent(
                  user.username
                )}/" target="_blank" rel="noopener noreferrer" style="font-size:18px; font-weight:800; color:var(--text-primary); text-decoration:none;">
                  @${escapeHtml(user.username)} ↗
                </a>
                ${user.is_verified ? '<span class="igfc-tag igfc-tag-verified">✓ Onaylı</span>' : ''}
                ${user.is_private ? '<span class="igfc-tag igfc-tag-private">🔒 Gizli</span>' : ''}
              </div>
              <div style="font-size:14px; color:var(--text-secondary); margin-top:4px;">${escapeHtml(
                user.full_name || 'İsim belirtilmemiş'
              )}</div>
              <div style="font-size:11.5px; color:#64748b; margin-top:4px;">Instagram User ID: ${escapeHtml(
                uid
              )}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center;">
            <div class="igfc-cl-card" style="padding:10px;">
              <div style="font-size:11px; color:var(--text-secondary);">Takipçileri</div>
              <div id="igfc-detail-followers" style="font-size:17px; font-weight:800; color:var(--text-primary); margin-top:2px;">...</div>
            </div>
            <div class="igfc-cl-card" style="padding:10px;">
              <div style="font-size:11px; color:var(--text-secondary);">Takip Ettikleri</div>
              <div id="igfc-detail-following" style="font-size:17px; font-weight:800; color:var(--text-primary); margin-top:2px;">...</div>
            </div>
            <div class="igfc-cl-card" style="padding:10px;">
              <div style="font-size:11px; color:var(--text-secondary);">Gönderileri</div>
              <div id="igfc-detail-posts" style="font-size:17px; font-weight:800; color:var(--text-primary); margin-top:2px;">...</div>
            </div>
          </div>

          <div class="igfc-cl-card">
            <div style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Biyografi & Bağlantı</div>
            <div id="igfc-detail-bio" style="font-size:13px; color:var(--text-primary); white-space:pre-wrap; line-height:1.45;">Profil sayfasından canlı okunuyor...</div>
          </div>

          <div class="igfc-cl-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:12px; color:var(--text-secondary);">İlişki Durumu</div>
              <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-top:2px;">
                ${
                  isFollowing && isFollower
                    ? '🟢 Karşılıklı Takipleşiyorsunuz'
                    : isFollowing && !isFollower
                    ? '🔴 Sen Takip Ediyorsun, O Seni Takip Etmiyor'
                    : !isFollowing && isFollower
                    ? '🔵 O Seni Takip Ediyor, Sen Takip Etmiyorsun'
                    : '⚪ Takipleşmiyorsunuz'
                }
              </div>
            </div>
            <div>
              <span class="igfc-tag" style="background:${
                suspicion.isSuspicious ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'
              }; color:${suspicion.isSuspicious ? '#ef4444' : '#10b981'}; padding:4px 10px;">
                Bot/İnaktif Riski: %${suspicion.score}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    box.addEventListener('click', () => box.remove());
    box.querySelector('#igfc-submodal-close').addEventListener('click', () => box.remove());
    document.getElementById('igfc-modal')?.appendChild(box);

    try {
      let details = state.profileDetailsCache.get(user.username);
      if (!details) {
        const res = await fetch(`https://www.instagram.com/${encodeURIComponent(user.username)}/`, {
          credentials: 'include',
        });
        if (res.ok) {
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          details = extractStrictProfileFromScripts(
            doc.querySelectorAll('script[type="application/json"]'),
            user.username,
            html
          );
          if (details) state.profileDetailsCache.set(user.username, details);
        }
      }

      const fEl = box.querySelector('#igfc-detail-followers');
      const flwEl = box.querySelector('#igfc-detail-following');
      const pEl = box.querySelector('#igfc-detail-posts');
      const bioEl = box.querySelector('#igfc-detail-bio');

      if (details) {
        if (fEl) fEl.textContent = details.followerCount?.toLocaleString('tr-TR') ?? '—';
        if (flwEl) flwEl.textContent = details.followingCount?.toLocaleString('tr-TR') ?? '—';
        if (pEl) pEl.textContent = details.mediaCount?.toLocaleString('tr-TR') ?? '—';
        if (bioEl) {
          bioEl.innerHTML = `${escapeHtml(details.biography || 'Biyografi boş.')}${
            details.externalUrl
              ? `<br><a href="${escapeHtml(
                  details.externalUrl
                )}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;">🔗 ${escapeHtml(
                  details.externalUrl
                )}</a>`
              : ''
          }`;
        }
      } else if (bioEl) {
        bioEl.textContent = 'Detaylı biyografi verisi gizli veya erişilemedi.';
      }
    } catch (_) {}
  }

  // SÜRÜM GEÇMİŞİ (CHANGELOG) PENCERESİ
  function openChangelogModal() {
    const existing = document.getElementById('igfc-submodal');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'igfc-submodal';
    box.className = 'igfc-submodal-backdrop';

    const versionsHtml = CHANGELOG_HISTORY.map(
      (entry, index) => `
      <div class="igfc-cl-card ${index === 0 ? 'igfc-cl-latest' : ''}">
        <div class="igfc-cl-head">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="igfc-cl-ver">${escapeHtml(entry.version)}</span>
            <span class="igfc-cl-badge">${escapeHtml(entry.badge)}</span>
          </div>
          <span class="igfc-cl-date">${escapeHtml(entry.date)}</span>
        </div>
        <ul class="igfc-cl-list">
          ${entry.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `
    ).join('');

    box.innerHTML = `
      <div class="igfc-submodal-box" onclick="event.stopPropagation()">
        <div class="igfc-submodal-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:17px; font-weight:800;">🚀 Sürüm Geçmişi & Geliştirme Notları</span>
            <span class="igfc-badge" style="cursor:default;">v1 → v10 Pro</span>
          </div>
          <button class="igfc-win-btn close" id="igfc-submodal-close">✕</button>
        </div>
        <div class="igfc-submodal-body">
          ${versionsHtml}
        </div>
      </div>
    `;

    box.addEventListener('click', () => box.remove());
    box.querySelector('#igfc-submodal-close').addEventListener('click', () => box.remove());
    document.getElementById('igfc-modal')?.appendChild(box);
  }

  // HESAP ANALİZİ, AKILLI KORUMA & TOPLU KULLANICI ADI İLE KORUMA PENCERESİ
  function openAnalyticsModal() {
    const existing = document.getElementById('igfc-submodal');
    if (existing) existing.remove();

    const totalF = state.followers.length;
    const totalFlw = state.following.length;
    const ratio = totalFlw > 0 ? ((totalF / totalFlw) * 100).toFixed(1) : '0.0';
    const mutualRate = totalFlw > 0 ? Math.round((state.mutuals.length / totalFlw) * 100) : 0;
    const nonFollowRate =
      totalFlw > 0 ? Math.round((state.nonFollowers.length / totalFlw) * 100) : 0;

    const box = document.createElement('div');
    box.id = 'igfc-submodal';
    box.className = 'igfc-submodal-backdrop';

    box.innerHTML = `
      <div class="igfc-submodal-box" onclick="event.stopPropagation()">
        <div class="igfc-submodal-header">
          <span style="font-size:17px; font-weight:800;">📊 Hesap Analizi, Akıllı Koruma & Araçlar</span>
          <button class="igfc-win-btn close" id="igfc-submodal-close">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
            <div class="igfc-cl-card">
              <div style="font-size:11.5px; color:var(--text-secondary);">Takipçi / Takip Oranı</div>
              <div style="font-size:22px; font-weight:800; color:#3b82f6; margin-top:4px;">%${ratio}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${totalF} Takipçi / ${totalFlw} Takip</div>
            </div>
            <div class="igfc-cl-card">
              <div style="font-size:11.5px; color:var(--text-secondary);">Karşılıklı Sadakat Oranı</div>
              <div style="font-size:22px; font-weight:800; color:#10b981; margin-top:4px;">%${mutualRate}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${state.mutuals.length} karşılıklı hesap</div>
            </div>
            <div class="igfc-cl-card">
              <div style="font-size:11.5px; color:var(--text-secondary);">Geri Takip Etmeyen Oranı</div>
              <div style="font-size:22px; font-weight:800; color:#ef4444; margin-top:4px;">%${nonFollowRate}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${state.nonFollowers.length} kişi</div>
            </div>
            <div class="igfc-cl-card">
              <div style="font-size:11.5px; color:var(--text-secondary);">Şüpheli / İnaktif Hesap</div>
              <div style="font-size:22px; font-weight:800; color:#a855f7; margin-top:4px;">${state.suspicious.length}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Resimsiz / çok rakamlı</div>
            </div>
          </div>

          <div class="igfc-cl-card">
            <div style="font-size:13.5px; font-weight:700; margin-bottom:8px;">⚡ Tek Tıkla Akıllı Seçim & Koruma Sihirbazı</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <button class="igfc-btn igfc-btn-secondary" id="igfc-auto-wl-verified">✓ Onaylı Hesapları Koru (${
                state.following.filter((u) => u.is_verified).length
              })</button>
              <button class="igfc-btn igfc-btn-secondary" id="igfc-auto-wl-mutuals">🤝 Karşılıklı Takipleşenleri Koru (${
                state.mutuals.length
              })</button>
              <button class="igfc-btn" id="igfc-select-suspicious-btn">👻 Tüm Şüphelileri Seç (${
                state.suspicious.length
              })</button>
              <button class="igfc-btn igfc-btn-danger" id="igfc-clear-wl-btn">🗑️ Korumayı Sıfırla</button>
            </div>
          </div>

          <div class="igfc-cl-card">
            <div style="font-size:13.5px; font-weight:700; margin-bottom:6px;">✍️ Kullanıcı Adı Yazarak Toplu Korumaya Ekle</div>
            <div style="display:flex; gap:8px;">
              <input type="text" id="igfc-wl-usernames-input" class="igfc-input" style="flex:1;" placeholder="Virgül veya boşlukla kullanıcı adları yazın (örn: galatasaray, akindil)..." />
              <button class="igfc-btn igfc-btn-success" id="igfc-wl-usernames-btn">Korumaya Ekle</button>
            </div>
          </div>

          <div class="igfc-cl-card">
            <div style="font-size:13.5px; font-weight:700; margin-bottom:6px;">🛡️ Koruma Listesi (Whitelist) JSON Yedekle / Geri Yükle</div>
            <textarea id="igfc-wl-textarea" class="igfc-input" style="width:100%; height:64px; font-family:monospace; font-size:11.5px; resize:vertical;">${JSON.stringify(
              [...state.whitelist]
            )}</textarea>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <button class="igfc-btn igfc-btn-success" id="igfc-wl-save-btn">Listeyi Güncelle & Kaydet</button>
              <button class="igfc-btn igfc-btn-secondary" id="igfc-wl-copy-btn">Panoya Kopyala</button>
            </div>
          </div>
        </div>
      </div>
    `;

    box.addEventListener('click', () => box.remove());
    box.querySelector('#igfc-submodal-close').addEventListener('click', () => box.remove());

    box.querySelector('#igfc-auto-wl-verified').addEventListener('click', () => {
      let added = 0;
      for (const u of state.following) {
        if (u.is_verified && !state.whitelist.has(String(u.id))) {
          state.whitelist.add(String(u.id));
          added++;
        }
      }
      saveWhitelist();
      computeCategories();
      renderList();
      showToast(`${added} onaylı hesap korumaya alındı!`, 'success');
      box.remove();
    });

    box.querySelector('#igfc-auto-wl-mutuals').addEventListener('click', () => {
      let added = 0;
      for (const u of state.mutuals) {
        if (!state.whitelist.has(String(u.id))) {
          state.whitelist.add(String(u.id));
          added++;
        }
      }
      saveWhitelist();
      computeCategories();
      renderList();
      showToast(`${added} karşılıklı hesap korumaya alındı!`, 'success');
      box.remove();
    });

    box.querySelector('#igfc-select-suspicious-btn').addEventListener('click', () => {
      state.activeTab = 'suspicious';
      state.selectedIds.clear();
      for (const u of state.suspicious) state.selectedIds.add(String(u.id));
      document.querySelectorAll('.igfc-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === 'suspicious');
      });
      updateBulkButtons();
      renderList();
      showToast(`${state.suspicious.length} şüpheli hesap seçildi.`, 'info');
      box.remove();
    });

    box.querySelector('#igfc-wl-usernames-btn').addEventListener('click', () => {
      const raw = box.querySelector('#igfc-wl-usernames-input').value;
      const names = raw
        .split(/[\s,;]+/)
        .map((s) => s.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean);
      if (names.length === 0) return;
      const allKnown = [...state.following, ...state.followers];
      let added = 0;
      for (const u of allKnown) {
        if (names.includes(String(u.username || '').toLowerCase())) {
          state.whitelist.add(String(u.id));
          added++;
        }
      }
      saveWhitelist();
      computeCategories();
      renderList();
      showToast(`${added} eşleşen kullanıcı korumaya alındı ★`, 'success');
      box.remove();
    });

    box.querySelector('#igfc-clear-wl-btn').addEventListener('click', () => {
      state.whitelist.clear();
      saveWhitelist();
      computeCategories();
      renderList();
      showToast('Koruma listesi sıfırlandı.', 'warn');
      box.remove();
    });

    box.querySelector('#igfc-wl-save-btn').addEventListener('click', () => {
      try {
        const val = JSON.parse(box.querySelector('#igfc-wl-textarea').value.trim() || '[]');
        if (Array.isArray(val)) {
          state.whitelist = new Set(val.map(String));
          saveWhitelist();
          computeCategories();
          renderList();
          showToast(`Koruma listesi güncellendi (${state.whitelist.size} kişi).`, 'success');
          box.remove();
        }
      } catch (_) {
        showToast('Geçersiz JSON formatı!', 'error');
      }
    });

    box.querySelector('#igfc-wl-copy-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(box.querySelector('#igfc-wl-textarea').value);
        showToast('Koruma listesi panoya kopyalandı!', 'success');
      } catch (_) {}
    });

    document.getElementById('igfc-modal')?.appendChild(box);
  }

  /**
   * 8-YÖNLÜ KENARDAN VE KÖŞEDEN BOYUTLANDIRMA + SÜRÜKLENEBİLİR PENCERE YÖNETİCİSİ
   */
  function initWindowDragAndResize(modalEl, headerEl) {
    let isDragging = false;
    let isResizing = false;
    let currentDir = '';
    let startX = 0,
      startY = 0,
      startW = 0,
      startH = 0,
      startL = 0,
      startT = 0;

    const ensureAbsolutePosition = () => {
      const rect = modalEl.getBoundingClientRect();
      if (modalEl.style.position !== 'fixed') {
        modalEl.style.position = 'fixed';
        modalEl.style.left = `${rect.left}px`;
        modalEl.style.top = `${rect.top}px`;
        modalEl.style.width = `${rect.width}px`;
        modalEl.style.height = `${rect.height}px`;
        modalEl.style.margin = '0';
      }
    };

    headerEl.addEventListener('mousedown', (e) => {
      if (state.isMaximized || state.isMinimized) return;
      if (e.target.closest('button, select, input, .igfc-badge')) return;
      ensureAbsolutePosition();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = modalEl.getBoundingClientRect();
      startL = rect.left;
      startT = rect.top;
      modalEl.style.transition = 'none';
      e.preventDefault();
    });

    modalEl.querySelectorAll('.igfc-resizer').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        if (state.isMaximized || state.isMinimized) return;
        e.stopPropagation();
        e.preventDefault();
        ensureAbsolutePosition();
        isResizing = true;
        currentDir = handle.dataset.dir;
        startX = e.clientX;
        startY = e.clientY;
        const rect = modalEl.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;
        startL = rect.left;
        startT = rect.top;
        modalEl.style.transition = 'none';
      });
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(0, Math.min(window.innerWidth - 120, startL + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - 60, startT + dy));
        modalEl.style.left = `${newLeft}px`;
        modalEl.style.top = `${newTop}px`;
      } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const minW = 540;
        const minH = 420;

        let newW = startW;
        let newH = startH;
        let newL = startL;
        let newT = startT;

        if (currentDir.includes('e')) {
          newW = Math.max(minW, Math.min(window.innerWidth - startL, startW + dx));
        }
        if (currentDir.includes('s')) {
          newH = Math.max(minH, Math.min(window.innerHeight - startT, startH + dy));
        }
        if (currentDir.includes('w')) {
          const possibleW = startW - dx;
          if (possibleW >= minW && startL + dx >= 0) {
            newW = possibleW;
            newL = startL + dx;
          }
        }
        if (currentDir.includes('n')) {
          const possibleH = startH - dy;
          if (possibleH >= minH && startT + dy >= 0) {
            newH = possibleH;
            newT = startT + dy;
          }
        }

        modalEl.style.width = `${newW}px`;
        modalEl.style.height = `${newH}px`;
        modalEl.style.left = `${newL}px`;
        modalEl.style.top = `${newT}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
      }
    });
  }

  // Arayüz (UI) Oluşturma
  function createUI() {
    const effectiveTheme = resolveEffectiveTheme(state.theme);
    const root = document.createElement('div');
    root.id = EXISTING_ID;
    root.innerHTML = `
      <style>
        #${EXISTING_ID} {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(6, 9, 15, 0.78);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
        }
        #${EXISTING_ID}.minimized-root {
          inset: auto 24px 24px auto !important;
          width: auto !important;
          height: auto !important;
          background: transparent !important;
          backdrop-filter: none !important;
          pointer-events: none !important;
        }
        #${EXISTING_ID} * {
          box-sizing: border-box;
        }

        /* Özel İnce ve Şık Scrollbar */
        #${EXISTING_ID} ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }
        #${EXISTING_ID} ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.25);
          border-radius: 999px;
        }
        #${EXISTING_ID} ::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.45);
          border-radius: 999px;
        }
        #${EXISTING_ID} ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }

        /* Ana Pencere ve Tam Tema Değişkenleri (Açık ve Koyu Mod Tam Uyumlu) */
        .igfc-modal {
          --bg-main: linear-gradient(180deg, #0f172a 0%, #0b1120 100%);
          --bg-header: rgba(30, 41, 59, 0.92);
          --bg-sub: rgba(15, 23, 42, 0.88);
          --bg-card: rgba(24, 34, 53, 0.9);
          --bg-card-hover: rgba(32, 46, 72, 0.98);
          --bg-input: #0b1120;
          --bg-tab-bar: rgba(15, 23, 42, 0.95);
          --bg-tab-inactive: rgba(30, 41, 59, 0.75);
          --border-color: rgba(51, 65, 85, 0.8);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --btn-sec-bg: rgba(51, 65, 85, 0.7);
          --btn-sec-text: #e2e8f0;

          width: min(1280px, 95vw);
          height: min(890px, 92vh);
          min-width: 540px;
          min-height: 420px;
          background: var(--bg-main);
          color: var(--text-primary);
          border: 1px solid rgba(59, 130, 246, 0.45);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06);
          position: relative;
          pointer-events: auto;
        }

        /* Tarayıcı Açık (Light) Teması */
        .igfc-modal[data-theme="light"] {
          --bg-main: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          --bg-header: rgba(255, 255, 255, 0.95);
          --bg-sub: rgba(241, 245, 249, 0.92);
          --bg-card: #ffffff;
          --bg-card-hover: #f8fafc;
          --bg-input: #ffffff;
          --bg-tab-bar: #e2e8f0;
          --bg-tab-inactive: #ffffff;
          --border-color: #cbd5e1;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --btn-sec-bg: #e2e8f0;
          --btn-sec-text: #1e293b;
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08);
        }
        .igfc-modal[data-theme="oled"] {
          --bg-main: linear-gradient(180deg, #050505 0%, #000000 100%);
          --bg-header: rgba(16, 16, 18, 0.96);
          --bg-sub: rgba(10, 10, 12, 0.95);
          --bg-card: rgba(18, 18, 22, 0.95);
          --bg-card-hover: rgba(28, 28, 35, 0.98);
          --bg-input: #08080a;
          --border-color: rgba(45, 45, 55, 0.85);
        }
        .igfc-modal[data-theme="cyber"] {
          --bg-main: linear-gradient(180deg, #170f2e 0%, #0d071c 100%);
          --bg-header: rgba(38, 22, 74, 0.9);
          --bg-sub: rgba(24, 14, 48, 0.9);
          --bg-card: rgba(34, 21, 66, 0.88);
          --bg-card-hover: rgba(48, 30, 92, 0.95);
          --bg-input: #120a26;
          --border-color: rgba(139, 92, 246, 0.42);
        }
        .igfc-modal[data-theme="sunset"] {
          --bg-main: linear-gradient(180deg, #1f1124 0%, #120917 100%);
          --bg-header: rgba(48, 22, 46, 0.9);
          --bg-sub: rgba(32, 14, 32, 0.9);
          --bg-card: rgba(42, 20, 42, 0.88);
          --bg-card-hover: rgba(58, 28, 56, 0.95);
          --bg-input: #160b18;
          --border-color: rgba(236, 72, 153, 0.42);
        }

        /* 8 Yönlü Kenar ve Köşe Boyutlandırma Tutamaçları */
        .igfc-resizer { position: absolute; z-index: 40; }
        .igfc-resizer-n  { top: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
        .igfc-resizer-s  { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
        .igfc-resizer-e  { right: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
        .igfc-resizer-w  { left: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
        .igfc-resizer-ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
        .igfc-resizer-nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
        .igfc-resizer-se { bottom: 0; right: 0; width: 14px; height: 14px; cursor: nwse-resize; }
        .igfc-resizer-sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }

        .igfc-modal.maximized {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .igfc-modal.maximized .igfc-resizer { display: none !important; }

        .igfc-modal.minimized {
          position: relative !important;
          left: auto !important;
          top: auto !important;
          width: 440px !important;
          height: 58px !important;
          min-width: 360px !important;
          min-height: 58px !important;
          border-radius: 999px !important;
          border: 2px solid #3b82f6 !important;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(59, 130, 246, 0.35) !important;
        }
        .igfc-modal.minimized .igfc-body-wrap,
        .igfc-modal.minimized .igfc-resizer,
        .igfc-modal.minimized .igfc-hide-on-min {
          display: none !important;
        }
        .igfc-modal.minimized .igfc-header {
          padding: 0 18px !important;
          height: 100% !important;
          border-bottom: none !important;
          cursor: pointer !important;
          flex-wrap: nowrap !important;
        }

        .igfc-body-wrap {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        /* TAM RESPONSIVE ÜST BAŞLIK — DARALTILDIĞINDA HİÇBİR BUTON KAYBOLMAZ (Resim 2 Çözümü) */
        .igfc-header {
          padding: 10px 18px;
          background: var(--bg-header);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          cursor: move;
        }
        .igfc-title {
          font-size: 15.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }
        .igfc-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.25);
          transition: transform 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .igfc-badge:hover {
          transform: scale(1.05);
        }
        .igfc-quota-pill {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #10b981;
          font-weight: 700;
          white-space: nowrap;
        }
        .igfc-cache-info {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }
        .igfc-header-right {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-left: auto;
        }
        .igfc-win-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          padding-left: 6px;
          border-left: 1px solid var(--border-color);
          margin-left: auto;
        }
        .igfc-win-btn {
          background: var(--btn-sec-bg);
          border: 1px solid var(--border-color);
          color: var(--btn-sec-text);
          border-radius: 8px;
          height: 30px;
          padding: 0 9px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .igfc-win-btn:hover {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #fff;
        }
        .igfc-win-btn.close:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }

        /* RESPONSIVE ÖZET İSTATİSTİK KARTLARI (Pencere Daraldığında Otomatik Alt Satıra Geçer, Kesilmez) */
        .igfc-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          gap: 8px;
          padding: 10px 18px;
          background: var(--bg-sub);
          border-bottom: 1px solid var(--border-color);
        }
        .igfc-stat-box {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 11px;
          padding: 7px 11px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .igfc-stat-box:hover {
          border-color: #3b82f6;
          transform: translateY(-1px);
        }
        .igfc-stat-box.active-stat {
          border-color: #3b82f6;
          background: rgba(37, 99, 235, 0.15);
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.4);
        }
        .igfc-stat-label {
          font-size: 10px;
          color: var(--text-secondary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .igfc-stat-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }

        /* Üst Kontroller */
        .igfc-controls {
          padding: 9px 18px;
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          align-items: center;
        }
        .igfc-input, .igfc-select {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 6px 10px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 500;
          outline: none;
        }
        .igfc-input:focus, .igfc-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .igfc-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 6px 12px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
        }
        .igfc-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-0.5px);
        }
        .igfc-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
        .igfc-btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.22);
        }
        .igfc-btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.22);
        }
        .igfc-btn-secondary {
          background: var(--btn-sec-bg);
          border-color: var(--border-color);
          color: var(--btn-sec-text);
          box-shadow: none;
        }
        .igfc-btn-secondary:hover:not(:disabled) {
          border-color: #3b82f6;
        }

        /* BÜYÜTÜLMÜŞ TAM GENİŞLİKTE İLERLEME ÇUBUĞU */
        .igfc-status-bar {
          padding: 9px 18px;
          background: var(--bg-sub);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .igfc-status-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .igfc-status-text {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .igfc-progress-pct {
          font-size: 13px;
          font-weight: 800;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 2px 10px;
          border-radius: 999px;
          min-width: 54px;
          text-align: center;
        }
        .igfc-progress-track {
          width: 100%;
          height: 13px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          overflow: hidden;
          padding: 2px;
        }
        .igfc-progress-fill {
          width: 0%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%);
          transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* YENİ NESİL SEGMENTED TAB BAR VE BİRLEŞİK SEÇİM ARAÇ ÇUBUĞU (Resim 1 Çözümü) */
        .igfc-subbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 8px 12px;
          padding: 9px 18px;
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
        }
        .igfc-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          flex: 1;
          min-width: 280px;
          background: var(--bg-sub);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        .igfc-tab {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.16s ease;
        }
        .igfc-tab:hover {
          color: var(--text-primary);
          background: var(--bg-card);
        }
        .igfc-tab.active {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
        }
        .igfc-tab-count {
          font-size: 10.5px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.18);
          color: inherit;
          font-weight: 800;
        }
        .igfc-tab.active .igfc-tab-count {
          background: rgba(255, 255, 255, 0.24);
          color: #ffffff;
        }

        /* Birleşik Kapsül Seçim Grubu (Tümünü Seç | Tersini Seç | Temizle) */
        .igfc-quick-select {
          display: inline-flex;
          align-items: center;
          background: var(--bg-sub);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
          flex-shrink: 0;
          margin-left: auto;
        }
        .igfc-seg-btn {
          background: transparent;
          color: var(--text-secondary);
          border: none;
          padding: 5px 10px;
          border-radius: 7px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .igfc-seg-btn:hover {
          background: var(--bg-card);
          color: #3b82f6;
        }
        .igfc-seg-divider {
          width: 1px;
          height: 16px;
          background: var(--border-color);
        }

        /* Kullanıcı Kart Listesi */
        .igfc-list-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .igfc-list {
          flex: 1;
          overflow-y: auto;
          padding: 14px 18px 86px 18px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 10px;
          align-content: start;
        }
        .igfc-list.compact-mode {
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 7px;
        }
        .igfc-list.compact-mode .igfc-card {
          padding: 7px 13px;
          border-radius: 10px;
        }
        .igfc-list.compact-mode .igfc-avatar {
          width: 38px;
          height: 38px;
        }
        .igfc-list.compact-mode .igfc-names {
          flex-direction: row;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Kullanıcı Kartı */
        .igfc-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 13px;
          padding: 11px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          cursor: pointer;
        }
        .igfc-card:hover {
          border-color: rgba(59, 130, 246, 0.65);
          background: var(--bg-card-hover);
          box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.25);
        }
        .igfc-card.selected {
          border-color: #3b82f6;
          background: rgba(37, 99, 235, 0.14);
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
        }
        .igfc-user-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          flex: 1;
        }
        .igfc-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #3b82f6;
          flex-shrink: 0;
        }
        .igfc-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          object-fit: cover;
          background: #0f172a;
          border: 2px solid var(--border-color);
          flex-shrink: 0;
          display: block;
          cursor: zoom-in;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .igfc-avatar:hover {
          border-color: #3b82f6;
          transform: scale(1.07);
        }
        .igfc-names {
          min-width: 120px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .igfc-username-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
        }
        .igfc-username {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
          text-decoration: none;
          white-space: nowrap;
          line-height: 1.3;
        }
        .igfc-username:hover {
          color: #3b82f6;
          text-decoration: underline;
        }
        .igfc-fullname {
          font-size: 12px;
          color: var(--text-secondary);
          word-break: normal;
          overflow-wrap: anywhere;
          line-height: 1.3;
        }
        .igfc-note-badge {
          font-size: 11px;
          color: #eab308;
          background: rgba(234, 179, 8, 0.14);
          border: 1px solid rgba(234, 179, 8, 0.35);
          padding: 2px 7px;
          border-radius: 6px;
          margin-top: 2px;
          display: inline-block;
          max-width: fit-content;
          font-weight: 600;
        }
        .igfc-tag {
          font-size: 10px;
          padding: 1.5px 6px;
          border-radius: 999px;
          font-weight: 700;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .igfc-tag-verified {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.35);
        }
        .igfc-tag-private {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .igfc-tag-suspicious {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.35);
        }
        .igfc-card-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .igfc-mini-btn {
          background: var(--btn-sec-bg);
          color: var(--btn-sec-text);
          border: 1px solid var(--border-color);
          padding: 5px 9px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .igfc-mini-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
        }
        .igfc-mini-btn.whitelisted {
          background: rgba(234, 179, 8, 0.18);
          border-color: rgba(234, 179, 8, 0.5);
          color: #ca8a04;
        }
        .igfc-mini-btn.unfollow {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: rgba(239, 68, 68, 0.85);
          color: #fff;
        }
        .igfc-mini-btn.unfollow:hover:not(:disabled) {
          filter: brightness(1.1);
          color: #fff;
        }
        .igfc-mini-btn.follow {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-color: #3b82f6;
          color: #fff;
        }
        .igfc-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 64px 20px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        /* Alt Pencereler */
        .igfc-submodal-backdrop {
          position: absolute;
          inset: 0;
          z-index: 80;
          background: rgba(4, 7, 15, 0.78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .igfc-submodal-box {
          width: min(760px, 94%);
          max-height: 84vh;
          background: var(--bg-main);
          color: var(--text-primary);
          border: 1px solid rgba(59, 130, 246, 0.45);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
        }
        .igfc-submodal-header {
          padding: 14px 20px;
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .igfc-submodal-body {
          padding: 18px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .igfc-cl-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .igfc-cl-latest {
          border-color: #3b82f6;
          background: rgba(37, 99, 235, 0.1);
        }
        .igfc-cl-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .igfc-cl-ver {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .igfc-cl-badge {
          font-size: 10.5px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          font-weight: 700;
        }
        .igfc-cl-date {
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        .igfc-cl-list {
          margin: 0;
          padding-left: 18px;
          color: var(--text-secondary);
          font-size: 12.5px;
          line-height: 1.55;
        }
        .igfc-cl-list li {
          margin-bottom: 4px;
        }

        /* Yüzen Toplu İşlem Çubuğu */
        .igfc-floating-bar {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translate(-50%, 130%);
          opacity: 0;
          pointer-events: none;
          background: var(--bg-header);
          backdrop-filter: blur(12px);
          border: 1px solid #3b82f6;
          border-radius: 999px;
          padding: 8px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 20px rgba(37, 99, 235, 0.25);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
          z-index: 20;
        }
        .igfc-floating-bar.visible {
          transform: translate(-50%, 0);
          opacity: 1;
          pointer-events: auto;
        }
        .igfc-floating-count {
          font-size: 13px;
          font-weight: 700;
          color: #3b82f6;
          padding-right: 8px;
          border-right: 1px solid var(--border-color);
        }

        /* Açılır / Kapanır Günlük Çekmecesi */
        .igfc-footer-drawer {
          background: var(--bg-sub);
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        .igfc-footer-header {
          padding: 6px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        .igfc-footer-header:hover {
          color: var(--text-primary);
        }
        .igfc-footer-body {
          max-height: 0;
          overflow-y: auto;
          padding: 0 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11.5px;
          transition: max-height 0.25s ease, padding 0.25s ease;
        }
        .igfc-footer-drawer.open .igfc-footer-body {
          max-height: 120px;
          padding: 8px 18px;
          border-top: 1px solid var(--border-color);
        }
        .igfc-log-item { padding: 2px 0; color: var(--text-secondary); }
        .igfc-log-info { color: #3b82f6; }
        .igfc-log-success { color: #10b981; }
        .igfc-log-warn { color: #f59e0b; }
        .igfc-log-error { color: #ef4444; }

        /* Bildirim (Toast) */
        .igfc-toast-container {
          position: absolute;
          top: 68px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 90;
          pointer-events: none;
        }
        .igfc-toast {
          background: var(--bg-header);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0,0,0,0.35);
          transition: all 0.25s ease;
        }
        .igfc-toast-success { border-color: #10b981; color: #10b981; }
        .igfc-toast-warn { border-color: #f59e0b; color: #f59e0b; }
        .igfc-toast-error { border-color: #ef4444; color: #ef4444; }
      </style>

      <div class="igfc-modal" id="igfc-modal" data-theme="${escapeHtml(effectiveTheme)}">
        <!-- 8 Yönlü Kenar ve Köşe Boyutlandırma Tutamaçları -->
        <div class="igfc-resizer igfc-resizer-n" data-dir="n"></div>
        <div class="igfc-resizer igfc-resizer-s" data-dir="s"></div>
        <div class="igfc-resizer igfc-resizer-e" data-dir="e"></div>
        <div class="igfc-resizer igfc-resizer-w" data-dir="w"></div>
        <div class="igfc-resizer igfc-resizer-ne" data-dir="ne"></div>
        <div class="igfc-resizer igfc-resizer-nw" data-dir="nw"></div>
        <div class="igfc-resizer igfc-resizer-se" data-dir="se"></div>
        <div class="igfc-resizer igfc-resizer-sw" data-dir="sw"></div>

        <div class="igfc-toast-container" id="igfc-toast-container"></div>

        <!-- Tam Responsive Üst Başlık ve Sabit Pencere Kontrolleri -->
        <div class="igfc-header" id="igfc-header">
          <div class="igfc-title">
            <span>Instagram Follow Checker</span>
            <span class="igfc-badge" id="igfc-changelog-btn" title="Sürüm Geçmişini ve Yenilikleri Gör">v10 Pro • Yenilikler</span>
            <span class="igfc-quota-pill igfc-hide-on-min" id="igfc-quota-badge" title="Bugün yapılan toplam işlem sayısı">Bugün: ${getTodayQuota()} işlem</span>
            <span class="igfc-cache-info igfc-hide-on-min" id="igfc-cache-info"></span>
          </div>

          <div class="igfc-header-right">
            <button class="igfc-btn igfc-btn-secondary igfc-hide-on-min" id="igfc-analytics-btn" title="Hesap Analizi, Otomatik Koruma ve Yedekleme">📊 Analiz & Araçlar</button>

            <select id="igfc-theme-select" class="igfc-select igfc-hide-on-min" title="Uygulama Teması (Varsayılan: Tarayıcı Teması)">
              <option value="system" ${state.theme === 'system' ? 'selected' : ''}>🖥️ Tarayıcı Teması (Oto)</option>
              <option value="light" ${state.theme === 'light' ? 'selected' : ''}>☀️ Açık Tema (Light)</option>
              <option value="midnight" ${state.theme === 'midnight' ? 'selected' : ''}>🌙 Gece Mavisi (Dark)</option>
              <option value="oled" ${state.theme === 'oled' ? 'selected' : ''}>🌑 OLED Siyah</option>
              <option value="cyber" ${state.theme === 'cyber' ? 'selected' : ''}>🔮 Siber Mor</option>
              <option value="sunset" ${state.theme === 'sunset' ? 'selected' : ''}>🌅 IG Gradyan</option>
            </select>

            <select id="igfc-speed-select" class="igfc-select igfc-hide-on-min" title="Toplu İşlem Hız & Anti-Ban Modu">
              <option value="fast" ${state.speedMode === 'fast' ? 'selected' : ''}>⚡ Hızlı (2-4 sn)</option>
              <option value="safe" ${state.speedMode === 'safe' ? 'selected' : ''}>🛡️ Güvenli (4-7 sn)</option>
              <option value="ultra" ${state.speedMode === 'ultra' ? 'selected' : ''}>🔒 Çok Güvenli (7-12 sn)</option>
            </select>

            <button class="igfc-btn igfc-btn-secondary igfc-hide-on-min" id="igfc-view-toggle-btn" title="Liste görünümünü değiştir">
              ${state.viewMode === 'grid' ? 'Görünüm: Kart' : 'Görünüm: Kompakt'}
            </button>

            <!-- Pencere Boyutlandırma ve Ölçek Kontrolleri (Asla Kaybolmaz) -->
            <div class="igfc-win-controls">
              <button class="igfc-win-btn igfc-hide-on-min" id="igfc-zoom-out-btn" title="Yazı ve Kart Boyutunu Küçült">A-</button>
              <button class="igfc-win-btn igfc-hide-on-min" id="igfc-zoom-in-btn" title="Yazı ve Kart Boyutunu Büyüt">A+</button>
              <button class="igfc-win-btn" id="igfc-minimize-btn" title="Pencereyi Küçült / Geri Yükle">—</button>
              <button class="igfc-win-btn igfc-hide-on-min" id="igfc-maximize-btn" title="Tam Ekran Yap / Normal Boyut">⛶</button>
              <button class="igfc-win-btn close" id="igfc-close-btn" title="Uygulamayı Kapat">✕</button>
            </div>
          </div>
        </div>

        <!-- Gövde Alanı -->
        <div class="igfc-body-wrap" id="igfc-body-wrap">
          <!-- Tıklanabilir Responsive Özet İstatistik Kartları -->
          <div class="igfc-stats-row">
            <div class="igfc-stat-box active-stat" data-stat-tab="nonFollowers" title="Seni takip etmeyenleri göster">
              <span class="igfc-stat-label">Takip Etmeyen</span>
              <span class="igfc-stat-value" id="igfc-stat-nonfollowers" style="color:#ef4444;">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="suspicious" title="Profil resmi olmayan / şüpheli / inaktif hesapları göster">
              <span class="igfc-stat-label">👻 Şüpheli / Bot</span>
              <span class="igfc-stat-value" id="igfc-stat-suspicious" style="color:#a855f7;">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="fans" title="Senin takip etmediklerini göster">
              <span class="igfc-stat-label">Takip Etmediğin</span>
              <span class="igfc-stat-value" id="igfc-stat-fans" style="color:#3b82f6;">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="mutuals" title="Karşılıklı takipleştiklerini göster">
              <span class="igfc-stat-label">Karşılıklı</span>
              <span class="igfc-stat-value" id="igfc-stat-mutuals" style="color:#10b981;">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="lostFollowers" title="Son taramadan beri takipten çıkanları göster">
              <span class="igfc-stat-label">Yeni Çıkanlar</span>
              <span class="igfc-stat-value" id="igfc-stat-lost" style="color:#f59e0b;">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="allFollowers" title="Tüm takipçilerini göster">
              <span class="igfc-stat-label">Tüm Takipçiler</span>
              <span class="igfc-stat-value" id="igfc-stat-followers">0</span>
            </div>
            <div class="igfc-stat-box" data-stat-tab="allFollowing" title="Tüm takip ettiklerini göster">
              <span class="igfc-stat-label">Tüm Takip Edilen</span>
              <span class="igfc-stat-value" id="igfc-stat-following">0</span>
            </div>
          </div>

          <!-- Arama, Tarama ve Dışa Aktarma Kontrolleri -->
          <div class="igfc-controls">
            <input type="text" id="igfc-username-input" class="igfc-input" placeholder="Kullanıcı adı (boşsa kendi hesabın)" value="${escapeHtml(
              getDefaultUsername()
            )}" style="width:175px;" />
            <button class="igfc-btn igfc-btn-success" id="igfc-my-account-btn">⚡ Kendi Hesabımı Tara</button>
            <button class="igfc-btn" id="igfc-start-btn">🔍 Kullanıcıyı Tara</button>
            <button class="igfc-btn igfc-btn-danger" id="igfc-stop-btn" disabled>■ Durdur</button>

            <input type="text" id="igfc-search-input" class="igfc-input" placeholder="🔍 İsim, @kullanıcı veya not ara..." style="margin-left:auto; min-width:190px; flex:1; max-width:260px;" />

            <select id="igfc-filter-select" class="igfc-select" title="Hesap Türüne Göre Filtrele">
              <option value="all">Filtre: Tümü</option>
              <option value="verified">✓ Onaylı Hesaplar</option>
              <option value="private">🔒 Gizli Hesaplar</option>
              <option value="public">🌐 Açık Hesaplar</option>
              <option value="suspicious">👻 Şüpheli / Resimsiz</option>
              <option value="noted">📝 Not Eklenenler</option>
            </select>

            <select id="igfc-sort-select" class="igfc-select" title="Sıralama Ölçütü">
              <option value="default">Sırala: Varsayılan</option>
              <option value="az">Kullanıcı Adı (A → Z)</option>
              <option value="za">Kullanıcı Adı (Z → A)</option>
              <option value="name">Tam İsim (A → Z)</option>
              <option value="suspicious">Şüphe Puanı (Yüksek → Düşük)</option>
            </select>

            <button class="igfc-btn igfc-btn-secondary" id="igfc-copy-btn" title="Aktif listedeki kullanıcıları kopyala">📋 Kopyala</button>
            <button class="igfc-btn igfc-btn-secondary" id="igfc-csv-btn" title="Excel uyumlu CSV olarak indir">📊 CSV</button>
            <button class="igfc-btn igfc-btn-secondary" id="igfc-export-btn" title="Detaylı JSON olarak indir">📦 JSON</button>
          </div>

          <!-- BÜYÜTÜLMÜŞ TAM GENİŞLİKTE İLERLEME ÇUBUĞU -->
          <div class="igfc-status-bar">
            <div class="igfc-status-top">
              <div class="igfc-status-text" id="igfc-status-msg">Hazır. "Kendi Hesabımı Tara" butonuna tıklayarak başlayabilirsiniz.</div>
              <span class="igfc-progress-pct" id="igfc-progress-pct">%0</span>
            </div>
            <div class="igfc-progress-track">
              <div class="igfc-progress-fill" id="igfc-progress-fill"></div>
            </div>
          </div>

          <!-- YENİ NESİL SEGMENTED TAB BAR VE BİRLEŞİK SEÇİM ARAÇ ÇUBUĞU (Resim 1 Çözümü) -->
          <div class="igfc-subbar">
            <div class="igfc-tabs">
              <button class="igfc-tab active" data-tab="nonFollowers" id="igfc-tab-nonFollowers">
                <span>🚫 Takip Etmeyenler</span>
                <span class="igfc-tab-count" id="igfc-cnt-nonFollowers">0</span>
              </button>
              <button class="igfc-tab" data-tab="suspicious" id="igfc-tab-suspicious">
                <span>👻 Şüpheli / Bot</span>
                <span class="igfc-tab-count" id="igfc-cnt-suspicious">0</span>
              </button>
              <button class="igfc-tab" data-tab="fans" id="igfc-tab-fans">
                <span>💙 Takip Etmediklerin</span>
                <span class="igfc-tab-count" id="igfc-cnt-fans">0</span>
              </button>
              <button class="igfc-tab" data-tab="mutuals" id="igfc-tab-mutuals">
                <span>🤝 Karşılıklı</span>
                <span class="igfc-tab-count" id="igfc-cnt-mutuals">0</span>
              </button>
              <button class="igfc-tab" data-tab="lostFollowers" id="igfc-tab-lostFollowers">
                <span>📉 Yeni Çıkanlar</span>
                <span class="igfc-tab-count" id="igfc-cnt-lostFollowers">0</span>
              </button>
              <button class="igfc-tab" data-tab="newFollowers" id="igfc-tab-newFollowers">
                <span>📈 Yeni Gelenler</span>
                <span class="igfc-tab-count" id="igfc-cnt-newFollowers">0</span>
              </button>
              <button class="igfc-tab" data-tab="whitelist" id="igfc-tab-whitelist">
                <span>★ Korunanlar</span>
                <span class="igfc-tab-count" id="igfc-cnt-whitelist">${state.whitelist.size}</span>
              </button>
              <button class="igfc-tab" data-tab="history" id="igfc-tab-history">
                <span>🕒 Geçmiş</span>
                <span class="igfc-tab-count" id="igfc-cnt-history">${state.unfollowHistory.length}</span>
              </button>
            </div>

            <div class="igfc-quick-select">
              <button class="igfc-seg-btn" id="igfc-select-all-btn" title="Listedeki tüm kullanıcıları seç">☑ Tümünü Seç</button>
              <div class="igfc-seg-divider"></div>
              <button class="igfc-seg-btn" id="igfc-invert-select-btn" title="Seçili olanları bırak, seçili olmayanları seç">⇄ Tersini Seç</button>
              <div class="igfc-seg-divider"></div>
              <button class="igfc-seg-btn" id="igfc-deselect-all-btn" title="Tüm seçimleri kaldır">✕ Temizle</button>
            </div>
          </div>

          <!-- Kullanıcı Kart Listesi + Yüzen Toplu İşlem Barı -->
          <div class="igfc-list-wrapper">
            <div class="igfc-list ${state.viewMode === 'compact' ? 'compact-mode' : ''}" id="igfc-list-container">
              <div class="igfc-empty">Henüz tarama yapılmadı. Başlamak için üstteki "Kendi Hesabımı Tara" butonuna tıklayın.</div>
            </div>

            <div class="igfc-floating-bar" id="igfc-floating-bar">
              <span class="igfc-floating-count" id="igfc-floating-count">0 kişi seçildi</span>
              <button class="igfc-btn igfc-btn-secondary" id="igfc-bulk-whitelist-btn">★ Seçilenleri Koru</button>
              <button class="igfc-btn" id="igfc-bulk-follow-btn">➕ Seçilenleri Takip Et</button>
              <button class="igfc-btn igfc-btn-danger" id="igfc-bulk-unfollow-btn">Seçilenleri Takipten Çık</button>
              <button class="igfc-btn igfc-btn-secondary" id="igfc-floating-cancel-btn">İptal</button>
            </div>
          </div>

          <!-- Açılır / Kapanır Günlük (Log) Çekmecesi -->
          <div class="igfc-footer-drawer" id="igfc-footer-drawer">
            <div class="igfc-footer-header" id="igfc-footer-toggle">
              <span id="igfc-last-log-preview">[Sistem] Instagram Follow Checker v10 Pro hazır. (Tarayıcı teması otomatik algılandı)</span>
              <span id="igfc-footer-arrow">▲ Günlüğü Göster</span>
            </div>
            <div class="igfc-footer-body" id="igfc-log-list">
              <div class="igfc-log-item igfc-log-info">[Sistem] Instagram Follow Checker v10 Pro hazır.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const modalEl = document.getElementById('igfc-modal');
    const headerEl = document.getElementById('igfc-header');
    const minBtn = document.getElementById('igfc-minimize-btn');

    if (state.uiScale !== 100) {
      modalEl.style.zoom = `${state.uiScale}%`;
    }

    // Tarayıcı teması değiştiğinde ('system' seçiliyse) canlı güncelle
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if (state.theme === 'system') {
          modalEl.setAttribute('data-theme', resolveEffectiveTheme('system'));
        }
      });
    }

    // 8 Yönlü Kenar/Köşe Boyutlandırma ve Başlıktan Sürükleme Başlat
    initWindowDragAndResize(modalEl, headerEl);

    // Klavye Kısayolları
    window.addEventListener('keydown', (e) => {
      if (!document.getElementById(EXISTING_ID)) return;
      if (e.key === 'Escape') {
        const sub = document.getElementById('igfc-submodal');
        if (sub) sub.remove();
      } else if (e.key === '/' && !e.target.closest('input, textarea')) {
        e.preventDefault();
        document.getElementById('igfc-search-input')?.focus();
      }
    });

    // Sürüm Geçmişi ve Analiz Pencereleri
    document.getElementById('igfc-changelog-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.isMinimized) toggleMinimize();
      openChangelogModal();
    });

    document.getElementById('igfc-analytics-btn').addEventListener('click', () => {
      openAnalyticsModal();
    });

    // Tema Değiştirici
    document.getElementById('igfc-theme-select').addEventListener('change', (e) => {
      state.theme = e.target.value;
      modalEl.setAttribute('data-theme', resolveEffectiveTheme(state.theme));
      saveSettings();
      showToast('Tema güncellendi 🎨', 'info');
    });

    // Pencere Kapatma
    document.getElementById('igfc-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      state.bulkAbort = true;
      if (state.isRunning && state.abortController) {
        state.abortController.abort();
      }
      root.remove();
    });

    // Küçültme / Geri Büyütme
    const toggleMinimize = () => {
      state.isMinimized = !state.isMinimized;
      if (state.isMinimized) {
        if (state.isMaximized) {
          state.isMaximized = false;
          modalEl.classList.remove('maximized');
          document.getElementById('igfc-maximize-btn').textContent = '⛶';
        }
        state.savedBounds = {
          position: modalEl.style.position,
          left: modalEl.style.left,
          top: modalEl.style.top,
          width: modalEl.style.width,
          height: modalEl.style.height,
        };
        modalEl.style.position = '';
        modalEl.style.left = '';
        modalEl.style.top = '';
        modalEl.style.width = '';
        modalEl.style.height = '';
        modalEl.classList.add('minimized');
        root.classList.add('minimized-root');
        minBtn.textContent = '▢ Büyüt';
        minBtn.title = 'Pencereyi Eski Boyutuna Büyüt';
      } else {
        modalEl.classList.remove('minimized');
        root.classList.remove('minimized-root');
        if (state.savedBounds && state.savedBounds.position === 'fixed') {
          modalEl.style.position = state.savedBounds.position;
          modalEl.style.left = state.savedBounds.left;
          modalEl.style.top = state.savedBounds.top;
          modalEl.style.width = state.savedBounds.width;
          modalEl.style.height = state.savedBounds.height;
        }
        minBtn.textContent = '—';
        minBtn.title = 'Pencereyi Küçült';
      }
    };

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    headerEl.addEventListener('click', (e) => {
      if (state.isMinimized && !e.target.closest('button')) {
        toggleMinimize();
      }
    });

    // Tam Ekran
    document.getElementById('igfc-maximize-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      state.isMaximized = !state.isMaximized;
      modalEl.classList.toggle('maximized', state.isMaximized);
      e.currentTarget.textContent = state.isMaximized ? '❐' : '⛶';
    });

    // UI Ölçeklendirme
    const applyZoom = () => {
      modalEl.style.zoom = `${state.uiScale}%`;
      saveSettings();
      showToast(`Görünüm ölçeği: %${state.uiScale}`, 'info');
    };
    document.getElementById('igfc-zoom-out-btn').addEventListener('click', () => {
      state.uiScale = Math.max(80, state.uiScale - 5);
      applyZoom();
    });
    document.getElementById('igfc-zoom-in-btn').addEventListener('click', () => {
      state.uiScale = Math.min(120, state.uiScale + 5);
      applyZoom();
    });

    // Kart / Kompakt Liste Görünümü Değiştirme
    document.getElementById('igfc-view-toggle-btn').addEventListener('click', (e) => {
      state.viewMode = state.viewMode === 'grid' ? 'compact' : 'grid';
      const listEl = document.getElementById('igfc-list-container');
      listEl.classList.toggle('compact-mode', state.viewMode === 'compact');
      e.currentTarget.textContent =
        state.viewMode === 'grid' ? 'Görünüm: Kart' : 'Görünüm: Kompakt';
      saveSettings();
    });

    document.getElementById('igfc-speed-select').addEventListener('change', (e) => {
      state.speedMode = e.target.value;
      saveSettings();
      const p = SPEED_PROFILES[state.speedMode] || SPEED_PROFILES.safe;
      showToast(`Toplu işlem hızı: ${p.label}`, 'info');
    });

    document.getElementById('igfc-footer-toggle').addEventListener('click', () => {
      state.isLogOpen = !state.isLogOpen;
      const drawer = document.getElementById('igfc-footer-drawer');
      const arrow = document.getElementById('igfc-footer-arrow');
      drawer.classList.toggle('open', state.isLogOpen);
      arrow.textContent = state.isLogOpen ? '▼ Günlüğü Gizle' : '▲ Günlüğü Göster';
    });

    document.getElementById('igfc-start-btn').addEventListener('click', () => startScan(false));
    document.getElementById('igfc-my-account-btn').addEventListener('click', () => startScan(true));

    document.getElementById('igfc-stop-btn').addEventListener('click', () => {
      state.bulkAbort = true;
      if (state.abortController) {
        state.abortController.abort();
      }
      addLog('Durdurma komutu gönderildi.', 'warn');
      showToast('İşlem durduruldu.', 'warn');
    });

    document.getElementById('igfc-search-input').addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderList();
    });

    document.getElementById('igfc-filter-select').addEventListener('change', (e) => {
      state.filterType = e.target.value;
      renderList();
    });

    document.getElementById('igfc-sort-select').addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderList();
    });

    document.getElementById('igfc-copy-btn').addEventListener('click', copyActiveListUsernames);
    document.getElementById('igfc-csv-btn').addEventListener('click', exportCsv);
    document.getElementById('igfc-export-btn').addEventListener('click', exportResults);

    document.getElementById('igfc-select-all-btn').addEventListener('click', () => {
      const visible = getFilteredAndSortedList();
      for (const u of visible) state.selectedIds.add(String(u.id));
      updateBulkButtons();
      renderList();
    });

    document.getElementById('igfc-invert-select-btn').addEventListener('click', () => {
      const visible = getFilteredAndSortedList();
      for (const u of visible) {
        const uid = String(u.id);
        if (state.selectedIds.has(uid)) state.selectedIds.delete(uid);
        else state.selectedIds.add(uid);
      }
      updateBulkButtons();
      renderList();
    });

    const clearSelection = () => {
      state.selectedIds.clear();
      state.lastClickedIndex = -1;
      updateBulkButtons();
      renderList();
    };

    document.getElementById('igfc-deselect-all-btn').addEventListener('click', clearSelection);
    document.getElementById('igfc-floating-cancel-btn').addEventListener('click', clearSelection);

    document.getElementById('igfc-bulk-whitelist-btn').addEventListener('click', () => {
      if (state.selectedIds.size === 0) return;
      const count = state.selectedIds.size;
      for (const id of state.selectedIds) {
        state.whitelist.add(String(id));
      }
      addLog(`${count} kullanıcı koruma (beyaz) listesine eklendi.`, 'success');
      showToast(`${count} kullanıcı korumaya alındı ★`, 'success');
      state.selectedIds.clear();
      saveWhitelist();
      computeCategories();
      updateBulkButtons();
      renderList();
    });

    document.getElementById('igfc-bulk-unfollow-btn').addEventListener('click', () =>
      runBulkAction('unfollow')
    );
    document.getElementById('igfc-bulk-follow-btn').addEventListener('click', () =>
      runBulkAction('follow')
    );

    const switchTab = (tabName) => {
      state.activeTab = tabName;
      state.selectedIds.clear();
      state.lastClickedIndex = -1;
      document.querySelectorAll('.igfc-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tabName);
      });
      document.querySelectorAll('.igfc-stat-box').forEach((box) => {
        box.classList.toggle('active-stat', box.dataset.statTab === tabName);
      });
      updateBulkButtons();
      renderList();
    };

    document.querySelectorAll('.igfc-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('.igfc-stat-box').forEach((box) => {
      box.addEventListener('click', () => switchTab(box.dataset.statTab));
    });

    // Önbellekte önceki tarama varsa otomatik yükle
    if (loadLastScanCache()) {
      computeCategories();
      renderList();
      updateProgress(100);
      const cacheInfoEl = document.getElementById('igfc-cache-info');
      if (cacheInfoEl && state.lastScannedAt) {
        const dt = new Date(state.lastScannedAt).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        cacheInfoEl.textContent = `(Son: @${state.username} • ${dt})`;
      }
      updateStatus(
        `Tamamlandı! Takipçi: ${state.followers.length} | Takip Edilen: ${state.following.length} | Seni Takip Etmeyen: ${state.nonFollowers.length}`
      );
    }
  }

  function updateStatus(message) {
    const el = document.getElementById('igfc-status-msg');
    if (el) el.textContent = message;
  }

  function updateProgress(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    const pctEl = document.getElementById('igfc-progress-pct');
    const fillEl = document.getElementById('igfc-progress-fill');
    if (pctEl) pctEl.textContent = `%${clamped}`;
    if (fillEl) fillEl.style.width = `${clamped}%`;
  }

  function updateBulkButtons() {
    const count = state.selectedIds.size;
    const floatingBar = document.getElementById('igfc-floating-bar');
    const countEl = document.getElementById('igfc-floating-count');
    if (countEl) countEl.textContent = `${count} kişi seçildi`;
    if (floatingBar) {
      floatingBar.classList.toggle('visible', count > 0);
    }
  }

  function computeCategories() {
    const followerIdSet = new Set(state.followers.map((u) => String(u.id)));
    const followingIdSet = new Set(state.following.map((u) => String(u.id)));

    state.nonFollowers = state.following.filter(
      (u) => !followerIdSet.has(String(u.id)) && !state.whitelist.has(String(u.id))
    );
    state.fans = state.followers.filter((u) => !followingIdSet.has(String(u.id)));
    state.mutuals = state.following.filter((u) => followerIdSet.has(String(u.id)));

    state.suspicious = state.following.filter((u) => {
      if (state.whitelist.has(String(u.id))) return false;
      const isNonFlw = !followerIdSet.has(String(u.id));
      const info = computeSuspicionInfo(u, isNonFlw);
      return info.isSuspicious;
    });

    // İstatistik Kartları
    document.getElementById('igfc-stat-followers').textContent = state.followers.length;
    document.getElementById('igfc-stat-following').textContent = state.following.length;
    document.getElementById('igfc-stat-nonfollowers').textContent = state.nonFollowers.length;
    document.getElementById('igfc-stat-suspicious').textContent = state.suspicious.length;
    document.getElementById('igfc-stat-fans').textContent = state.fans.length;
    document.getElementById('igfc-stat-mutuals').textContent = state.mutuals.length;
    document.getElementById('igfc-stat-lost').textContent = state.lostFollowers.length;

    // Sekme Rozet Sayıları
    document.getElementById('igfc-cnt-nonFollowers').textContent = state.nonFollowers.length;
    document.getElementById('igfc-cnt-suspicious').textContent = state.suspicious.length;
    document.getElementById('igfc-cnt-fans').textContent = state.fans.length;
    document.getElementById('igfc-cnt-mutuals').textContent = state.mutuals.length;
    document.getElementById('igfc-cnt-lostFollowers').textContent = state.lostFollowers.length;
    document.getElementById('igfc-cnt-newFollowers').textContent = state.newFollowers.length;
    document.getElementById('igfc-cnt-whitelist').textContent = state.whitelist.size;
    document.getElementById('igfc-cnt-history').textContent = state.unfollowHistory.length;
  }

  function getActiveList() {
    if (state.activeTab === 'nonFollowers') return state.nonFollowers;
    if (state.activeTab === 'suspicious') return state.suspicious;
    if (state.activeTab === 'fans') return state.fans;
    if (state.activeTab === 'mutuals') return state.mutuals;
    if (state.activeTab === 'lostFollowers') return state.lostFollowers;
    if (state.activeTab === 'newFollowers') return state.newFollowers;
    if (state.activeTab === 'allFollowers') return state.followers;
    if (state.activeTab === 'allFollowing') return state.following;
    if (state.activeTab === 'history') return state.unfollowHistory;
    if (state.activeTab === 'whitelist') {
      const allKnown = [...state.following, ...state.followers];
      const map = new Map(allKnown.map((u) => [String(u.id), u]));
      return [...state.whitelist].map(
        (id) =>
          map.get(String(id)) || {
            id: String(id),
            username: `id_${id}`,
            full_name: 'Korunan Kullanıcı',
            profile_pic_url: '',
          }
      );
    }
    return [];
  }

  function getFilteredAndSortedList() {
    let list = [...getActiveList()];
    const followerIdSet = new Set(state.followers.map((u) => String(u.id)));

    if (state.searchQuery) {
      list = list.filter((u) => {
        const note = (state.userNotes[String(u.id)] || '').toLowerCase();
        return (
          u.username?.toLowerCase().includes(state.searchQuery) ||
          u.full_name?.toLowerCase().includes(state.searchQuery) ||
          note.includes(state.searchQuery)
        );
      });
    }

    if (state.filterType === 'verified') {
      list = list.filter((u) => Boolean(u.is_verified));
    } else if (state.filterType === 'private') {
      list = list.filter((u) => Boolean(u.is_private));
    } else if (state.filterType === 'public') {
      list = list.filter((u) => !u.is_private);
    } else if (state.filterType === 'noted') {
      list = list.filter((u) => Boolean(state.userNotes[String(u.id)]));
    } else if (state.filterType === 'suspicious') {
      list = list.filter(
        (u) => computeSuspicionInfo(u, !followerIdSet.has(String(u.id))).isSuspicious
      );
    }

    if (state.sortBy === 'az') {
      list.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    } else if (state.sortBy === 'za') {
      list.sort((a, b) => (b.username || '').localeCompare(a.username || ''));
    } else if (state.sortBy === 'name') {
      list.sort((a, b) =>
        (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '')
      );
    } else if (state.sortBy === 'suspicious') {
      list.sort(
        (a, b) =>
          computeSuspicionInfo(b, !followerIdSet.has(String(b.id))).score -
          computeSuspicionInfo(a, !followerIdSet.has(String(a.id))).score
      );
    }

    return list;
  }

  function renderList() {
    const container = document.getElementById('igfc-list-container');
    if (!container) return;

    const filtered = getFilteredAndSortedList();

    if (filtered.length === 0) {
      container.innerHTML = `<div class="igfc-empty">Bu kategoride veya aramada gösterilecek kullanıcı bulunamadı.</div>`;
      return;
    }

    const followingIdSet = new Set(state.following.map((u) => String(u.id)));
    const followerIdSet = new Set(state.followers.map((u) => String(u.id)));
    container.innerHTML = '';

    filtered.forEach((user, idx) => {
      const uid = String(user.id);
      const isSelected = state.selectedIds.has(uid);
      const isWhitelisted = state.whitelist.has(uid);
      const isCurrentlyFollowing = followingIdSet.has(uid);
      const isFollower = followerIdSet.has(uid);
      const userNote = state.userNotes[uid] || '';
      const suspicion = computeSuspicionInfo(user, isCurrentlyFollowing && !isFollower);

      const card = document.createElement('div');
      card.className = `igfc-card${isSelected ? ' selected' : ''}`;

      card.innerHTML = `
        <div class="igfc-user-left">
          <input type="checkbox" class="igfc-checkbox" ${isSelected ? 'checked' : ''} />
          <img class="igfc-avatar" alt="${escapeHtml(user.username)}" title="Detaylı incelemek için tıklayın" />
          <div class="igfc-names">
            <div class="igfc-username-row">
              <a class="igfc-username" href="https://www.instagram.com/${encodeURIComponent(
                user.username
              )}/" target="_blank" rel="noopener noreferrer">
                @${escapeHtml(user.username)}
              </a>
              ${user.is_verified ? '<span class="igfc-tag igfc-tag-verified">✓ Onaylı</span>' : ''}
              ${user.is_private ? '<span class="igfc-tag igfc-tag-private">🔒 Gizli</span>' : ''}
              ${
                suspicion.isSuspicious
                  ? `<span class="igfc-tag igfc-tag-suspicious" title="${escapeHtml(
                      suspicion.reasons.join(', ')
                    )}">👻 %${suspicion.score}</span>`
                  : ''
              }
            </div>
            ${
              user.full_name
                ? `<div class="igfc-fullname">${escapeHtml(user.full_name)}</div>`
                : ''
            }
            ${
              userNote
                ? `<div class="igfc-note-badge">📝 ${escapeHtml(userNote)}</div>`
                : ''
            }
          </div>
        </div>
        <div class="igfc-card-actions">
          <button class="igfc-mini-btn inspect-btn" title="Canlı Biyografi ve Hesap Detaylarını İncele">🔍</button>
          <button class="igfc-mini-btn note-btn" title="Bu kullanıcıya özel not ekle / düzenle">📝</button>
          <button class="igfc-mini-btn whitelist-btn ${isWhitelisted ? 'whitelisted' : ''}" title="Koruma Listesine Ekle / Çıkar">
            ${isWhitelisted ? '★ Korunuyor' : '☆ Koru'}
          </button>
          ${
            isCurrentlyFollowing
              ? `<button class="igfc-mini-btn unfollow">Takibi Bırak</button>`
              : `<button class="igfc-mini-btn follow">Takip Et</button>`
          }
          ${
            state.activeTab === 'fans' || state.activeTab === 'allFollowers'
              ? `<button class="igfc-mini-btn remove-follower" title="Bu kişiyi takipçilerinden çıkar">✕</button>`
              : ''
          }
        </div>
      `;

      const imgEl = card.querySelector('.igfc-avatar');
      hydrateAvatarImage(imgEl, user.profile_pic_url, user.username, user.full_name);

      const openInspect = (e) => {
        e.stopPropagation();
        openUserDetailModal(user, imgEl.src);
      };
      imgEl.addEventListener('click', openInspect);
      card.querySelector('.inspect-btn').addEventListener('click', openInspect);

      const toggleCardSelection = (shiftKey) => {
        const shouldSelect = !state.selectedIds.has(uid);
        if (shiftKey && state.lastClickedIndex !== -1) {
          const start = Math.min(state.lastClickedIndex, idx);
          const end = Math.max(state.lastClickedIndex, idx);
          for (let i = start; i <= end; i++) {
            const rangeUid = String(filtered[i].id);
            if (shouldSelect) state.selectedIds.add(rangeUid);
            else state.selectedIds.delete(rangeUid);
          }
          state.lastClickedIndex = idx;
          updateBulkButtons();
          renderList();
          return;
        }

        state.lastClickedIndex = idx;
        if (shouldSelect) {
          state.selectedIds.add(uid);
          card.classList.add('selected');
          card.querySelector('.igfc-checkbox').checked = true;
        } else {
          state.selectedIds.delete(uid);
          card.classList.remove('selected');
          card.querySelector('.igfc-checkbox').checked = false;
        }
        updateBulkButtons();
      };

      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, img')) return;
        toggleCardSelection(e.shiftKey);
      });

      const checkbox = card.querySelector('.igfc-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardSelection(e.shiftKey);
      });

      card.querySelector('.note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const current = state.userNotes[uid] || '';
        const entered = window.prompt(
          `@${user.username} için kişisel notunuz (silmek için boş bırakın):`,
          current
        );
        if (entered === null) return;
        const trimmed = entered.trim();
        if (trimmed) {
          state.userNotes[uid] = trimmed;
          showToast(`@${user.username} için not kaydedildi 📝`, 'success');
        } else {
          delete state.userNotes[uid];
          showToast(`@${user.username} notu silindi.`, 'info');
        }
        saveUserNotes();
        renderList();
      });

      card.querySelector('.whitelist-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.whitelist.has(uid)) {
          state.whitelist.delete(uid);
          showToast(`@${user.username} korumadan çıkarıldı.`, 'info');
        } else {
          state.whitelist.add(uid);
          showToast(`@${user.username} korumaya alındı ★`, 'success');
        }
        saveWhitelist();
        computeCategories();
        renderList();
      });

      const unfollowBtn = card.querySelector('.unfollow');
      if (unfollowBtn) {
        unfollowBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          unfollowBtn.disabled = true;
          unfollowBtn.textContent = '...';
          try {
            await unfollowUser(uid);
            state.following = state.following.filter((u) => String(u.id) !== uid);
            state.selectedIds.delete(uid);
            state.unfollowHistory.unshift({
              ...user,
              actionAt: new Date().toISOString(),
            });
            saveUnfollowHistory();
            saveLastScanCache();
            computeCategories();
            updateBulkButtons();
            renderList();
            showToast(`@${user.username} takipten çıkarıldı.`, 'success');
            addLog(`@${user.username} takipten çıkarıldı.`, 'success');
          } catch (err) {
            unfollowBtn.disabled = false;
            unfollowBtn.textContent = 'Hata!';
            showToast(`Hata: ${err.message}`, 'error');
            addLog(`@${user.username} takipten çıkarılamadı: ${err.message}`, 'error');
          }
        });
      }

      const followBtn = card.querySelector('.follow');
      if (followBtn) {
        followBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          followBtn.disabled = true;
          followBtn.textContent = '...';
          try {
            await followUser(uid);
            followBtn.textContent = 'İstek Gönderildi ✓';
            showToast(`@${user.username} takip edildi.`, 'success');
            addLog(`@${user.username} takip edildi.`, 'success');
          } catch (err) {
            followBtn.disabled = false;
            followBtn.textContent = 'Hata!';
            showToast(`Hata: ${err.message}`, 'error');
          }
        });
      }

      const removeFollowerBtn = card.querySelector('.remove-follower');
      if (removeFollowerBtn) {
        removeFollowerBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          removeFollowerBtn.disabled = true;
          try {
            await removeFollowerUser(uid);
            state.followers = state.followers.filter((u) => String(u.id) !== uid);
            saveLastScanCache();
            computeCategories();
            renderList();
            showToast(`@${user.username} takipçilerden çıkarıldı.`, 'success');
            addLog(`@${user.username} takipçilerden çıkarıldı.`, 'success');
          } catch (err) {
            removeFollowerBtn.disabled = false;
            showToast(`Hata: ${err.message}`, 'error');
          }
        });
      }

      container.appendChild(card);
    });
  }

  async function runBulkAction(actionType = 'unfollow') {
    if (state.isBulkRunning || state.selectedIds.size === 0) return;

    const isUnfollow = actionType === 'unfollow';
    const pool = isUnfollow ? state.following : state.fans;
    const targets = pool.filter((u) => state.selectedIds.has(String(u.id)));

    if (targets.length === 0) {
      showToast('Seçilen kullanıcılar bu işlem için uygun değil.', 'warn');
      return;
    }

    const speed = SPEED_PROFILES[state.speedMode] || SPEED_PROFILES.safe;
    state.isBulkRunning = true;
    state.bulkAbort = false;

    const stopBtn = document.getElementById('igfc-stop-btn');
    const bulkUnfBtn = document.getElementById('igfc-bulk-unfollow-btn');
    const bulkFlwBtn = document.getElementById('igfc-bulk-follow-btn');
    if (stopBtn) stopBtn.disabled = false;
    if (bulkUnfBtn) bulkUnfBtn.disabled = true;
    if (bulkFlwBtn) bulkFlwBtn.disabled = true;

    addLog(
      `Toplu ${isUnfollow ? 'takipten çıkma' : 'takip etme'} başlatıldı (${
        targets.length
      } kişi — ${speed.label}).`,
      'info'
    );
    showToast(`${targets.length} kişi için güvenli toplu işlem başladı.`, 'info');

    let done = 0;
    for (const user of targets) {
      if (state.bulkAbort) {
        addLog('Toplu işlem kullanıcı tarafından durduruldu.', 'warn');
        break;
      }

      try {
        updateStatus(`Toplu işlem (${done + 1}/${targets.length}): @${user.username}...`);

        if (isUnfollow) {
          await unfollowUser(user.id);
          state.following = state.following.filter((u) => String(u.id) !== String(user.id));
          state.unfollowHistory.unshift({
            ...user,
            actionAt: new Date().toISOString(),
          });
          saveUnfollowHistory();
        } else {
          await followUser(user.id);
          state.following.push(user);
        }

        done++;
        state.selectedIds.delete(String(user.id));
        saveLastScanCache();
        computeCategories();
        updateBulkButtons();
        renderList();
        updateProgress(Math.round((done / targets.length) * 100));
        addLog(
          `[${done}/${targets.length}] @${user.username} ${
            isUnfollow ? 'takipten çıkarıldı' : 'takip edildi'
          }.`,
          'success'
        );

        if (
          done < targets.length &&
          !state.bulkAbort &&
          state.autoCooldown &&
          done % speed.batchPauseEvery === 0
        ) {
          addLog(
            `🛡️ Anti-Ban Koruması: ${done} işlem tamamlandı, ${speed.batchPauseSec} sn mola veriliyor...`,
            'warn'
          );
          for (let s = speed.batchPauseSec; s > 0; s--) {
            if (state.bulkAbort) break;
            updateStatus(
              `🛡️ Güvenlik Molası (${done}/${targets.length} tamamlandı) — ${s} sn sonra devam edecek...`
            );
            await sleep(1000);
          }
        } else if (done < targets.length && !state.bulkAbort) {
          await randomDelay(speed.min, speed.max);
        }
      } catch (err) {
        addLog(`@${user.username} hata: ${err.message}`, 'error');
        showToast(`Hata oluştu: ${err.message}`, 'error');
        break;
      }
    }

    state.isBulkRunning = false;
    if (stopBtn) stopBtn.disabled = true;
    if (bulkUnfBtn) bulkUnfBtn.disabled = false;
    if (bulkFlwBtn) bulkFlwBtn.disabled = false;
    updateStatus(`Toplu işlem tamamlandı (${done} kişi).`);
    showToast(`Toplu işlem tamamlandı (${done} kişi).`, 'success');
  }

  async function copyActiveListUsernames() {
    const list = getFilteredAndSortedList();
    if (list.length === 0) return;
    const text = list.map((u) => `@${u.username} (${u.full_name || '-'})`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${list.length} kullanıcı panoya kopyalandı!`, 'success');
      addLog(`${list.length} kullanıcı panoya kopyalandı.`, 'success');
    } catch (_) {
      showToast('Panoya kopyalanamadı.', 'error');
    }
  }

  function exportCsv() {
    const list = getFilteredAndSortedList();
    const header = [
      'User ID',
      'Kullanici Adi',
      'Tam Isim',
      'Onayli',
      'Gizli Hesap',
      'Not',
      'Profil Linki',
    ];
    const rows = list.map((u) => [
      u.id,
      u.username,
      `"${String(u.full_name || '').replace(/"/g, '""')}"`,
      u.is_verified ? 'Evet' : 'Hayir',
      u.is_private ? 'Evet' : 'Hayir',
      `"${String(state.userNotes[String(u.id)] || '').replace(/"/g, '""')}"`,
      `https://www.instagram.com/${u.username}/`,
    ]);

    const csvContent =
      '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-${state.activeTab}-${state.username || 'liste'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${list.length} kayıt CSV olarak indirildi.`, 'success');
  }

  function exportResults() {
    const payload = {
      scannedAt: new Date().toISOString(),
      username: state.username,
      userId: state.userId,
      counts: {
        followers: state.followers.length,
        following: state.following.length,
        nonFollowers: state.nonFollowers.length,
        suspicious: state.suspicious.length,
        fans: state.fans.length,
        mutuals: state.mutuals.length,
        lostFollowers: state.lostFollowers.length,
        newFollowers: state.newFollowers.length,
      },
      nonFollowers: state.nonFollowers,
      suspicious: state.suspicious,
      fans: state.fans,
      mutuals: state.mutuals,
      lostFollowers: state.lostFollowers,
      newFollowers: state.newFollowers,
      whitelist: [...state.whitelist],
      userNotes: state.userNotes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-follow-check-${state.username || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON raporu indirildi.', 'success');
  }

  async function startScan(forceMyAccount = false) {
    if (state.isRunning) return;

    const inputEl = document.getElementById('igfc-username-input');
    const startBtn = document.getElementById('igfc-start-btn');
    const myAccBtn = document.getElementById('igfc-my-account-btn');
    const stopBtn = document.getElementById('igfc-stop-btn');

    state.isRunning = true;
    state.abortController = new AbortController();
    state.selectedIds.clear();
    updateBulkButtons();

    startBtn.disabled = true;
    myAccBtn.disabled = true;
    stopBtn.disabled = false;
    updateProgress(0);

    try {
      const cookieUserId = getCookie('ds_user_id');
      let profile;

      if (forceMyAccount && cookieUserId) {
        const viewer = getLoggedInViewerFromDOM();
        profile = {
          id: String(cookieUserId),
          username: viewer?.username || inputEl.value.trim() || 'aktif_hesap',
          followerCount: 0,
          followingCount: 0,
        };
      } else {
        const requestedUsername = inputEl.value.trim();
        profile = await resolveUserProfile(requestedUsername);
      }

      state.userId = profile.id;
      state.username = profile.username;

      updateProgress(5);
      updateStatus(
        `Kullanıcı doğrulandı: @${profile.username} (ID: ${profile.id}). Takipçiler alınıyor...`
      );
      addLog(`Tarama başlatıldı: @${profile.username} (ID: ${profile.id})`, 'info');

      state.followers = await fetchFriendshipList(
        profile.id,
        'followers',
        profile.followerCount,
        5,
        50
      );
      addLog(`${state.followers.length} takipçi çekildi.`, 'success');

      state.following = await fetchFriendshipList(
        profile.id,
        'following',
        profile.followingCount,
        50,
        98
      );
      addLog(`${state.following.length} takip edilen çekildi.`, 'success');

      if (
        state.followers.length === 0 &&
        state.following.length === 0 &&
        cookieUserId &&
        String(profile.id) !== String(cookieUserId)
      ) {
        addLog(
          `İlk ID (${profile.id}) boş döndü, aktif oturum ID'si (${cookieUserId}) ile yeniden taranıyor...`,
          'warn'
        );
        state.userId = String(cookieUserId);
        state.followers = await fetchFriendshipList(cookieUserId, 'followers', 0, 5, 50);
        state.following = await fetchFriendshipList(cookieUserId, 'following', 0, 50, 98);
      }

      state.lastScannedAt = new Date().toISOString();
      compareAndSaveSnapshot(state.userId, state.followers);
      saveLastScanCache();
      computeCategories();
      renderList();
      updateProgress(100);

      const cacheInfoEl = document.getElementById('igfc-cache-info');
      if (cacheInfoEl) {
        const dt = new Date(state.lastScannedAt).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        cacheInfoEl.textContent = `(Son: @${state.username} • ${dt})`;
      }

      updateStatus(
        `Tamamlandı! Takipçi: ${state.followers.length} | Takip Edilen: ${state.following.length} | Seni Takip Etmeyen: ${state.nonFollowers.length} | Şüpheli: ${state.suspicious.length}`
      );
      showToast(
        `Tarama tamamlandı! ${state.nonFollowers.length} kişi seni geri takip etmiyor.`,
        'success'
      );
    } catch (err) {
      updateStatus(`Hata: ${err.message}`);
      addLog(`Hata: ${err.message}`, 'error');
      showToast(`Hata: ${err.message}`, 'error');
    } finally {
      state.isRunning = false;
      startBtn.disabled = false;
      myAccBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }

  createUI();
})();
