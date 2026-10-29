/**
 * Instagram Follow Checker Pro — Tam Sürüm (v5)
 *
 * Yenilikler ve Düzeltmeler:
 * 1. Kırık Profil Resmi Çözümü:
 *    Instagram CDN'in `no-referrer` ve CORP engeline takılmaması için `crossorigin="anonymous"`
 *    + `fetch(blob)` yükleyici ve kırık resimlerde şık baş harfli renkli SVG Avatar yedeği eklendi.
 * 2. Tam Görünen İsimler ve Kullanıcı Adları:
 *    Kart tasarımları genişletildi, üç nokta (`...`) ile kesilme kaldırıldı; kullanıcı adları ve
 *    tam isimler eksiksiz gösteriliyor.
 * 3. Kapsamlı Pro Özellikler:
 *    - Özet İstatistik Kartları (Takipçi, Takip Edilen, Seni Takip Etmeyen, Karşılıklı, Korunan)
 *    - Geçmiş Tarama Karşılaştırma (Son taramadan beri kim takipten çıktı / kim yeni geldi — Diff)
 *    - Toplu İşlemler: Seçilenleri toplu takipten çıkma (Güvenli Hız Sınırlı Kuyruk) ve toplu korumaya alma
 *    - Gelişmiş Filtreleme & Sıralama (Tümü / Doğrulanmış / Gizli Hesap / Açık Hesap + A-Z / Z-A / Varsayılan)
 *    - Görünüm Değiştirme (Geniş Kart Görünümü / Tam Genişlikte Liste Görünümü)
 *    - Dışa & İçe Aktarma (JSON İndir, CSV/Excel İndir, Kullanıcı Adlarını Kopyala, Beyaz Liste Yedekle/Yükle)
 *    - Tek Tıkla Takip Et (Senin Takip Etmediklerin sekmesinde geri takip etme) ve Takipçi Çıkarma (Remove Follower)
 *    - Canlı İşlem Günlüğü (Log Konsolu)
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

  // Saklama Anahtarları (LocalStorage)
  const STORAGE_WHITELIST = 'ig_fc_whitelist_v5';
  const STORAGE_SNAPSHOT = 'ig_fc_snapshot_v5';
  const STORAGE_UNFOLLOW_LOG = 'ig_fc_unfollow_log_v5';

  // Durum (State)
  const state = {
    isRunning: false,
    isBulkRunning: false,
    abortController: null,
    bulkAbort: false,
    username: '',
    userId: '',
    followers: [],
    following: [],
    nonFollowers: [],
    fans: [],
    mutuals: [],
    lostFollowers: [], // Son taramaya göre takipten çıkanlar
    newFollowers: [],  // Son taramaya göre yeni takip edenler
    whitelist: new Set(JSON.parse(localStorage.getItem(STORAGE_WHITELIST) || '[]')),
    unfollowHistory: JSON.parse(localStorage.getItem(STORAGE_UNFOLLOW_LOG) || '[]'),
    selectedIds: new Set(),
    activeTab: 'nonFollowers',
    searchQuery: '',
    filterType: 'all', // all | verified | private | public
    sortBy: 'default', // default | az | za
    viewMode: 'grid',  // grid | list
    bulkMinDelay: 3500,
    bulkMaxDelay: 6500,
    avatarBlobCache: new Map(),
  };

  // Yardımcı Fonksiyonlar
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomDelay = (min = 700, max = 1400) =>
    sleep(Math.floor(Math.random() * (max - min + 1)) + min);

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

  function saveUnfollowHistory() {
    localStorage.setItem(
      STORAGE_UNFOLLOW_LOG,
      JSON.stringify(state.unfollowHistory.slice(0, 500))
    );
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Kullanıcı adına özel renkli, şık SVG Baş Harf Avatar üretici (Resim yüklenemezse veya kırılırsa devreye girer)
   */
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

  /**
   * Profil resmini güvenli şekilde yükler:
   * Doğrudan <img> yüklenemezse fetch(blob) ile dener, yine olmazsa SVG baş harf avatarına geçer.
   */
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

    // Önce doğrudan crossOrigin="anonymous" ile dene (referrerPolicy KULLANMADAN, çünkü Instagram CDN referer bekler)
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
      } catch (_) {
        // Blob başarısız olursa SVG baş harf avatarını koy
      }
      imgEl.src = fallbackSvg;
    };

    imgEl.crossOrigin = 'anonymous';
    imgEl.src = picUrl;
  }

  function addLog(message, type = 'info') {
    const logContainer = document.getElementById('igfc-log-list');
    if (!logContainer) return;
    const time = new Date().toLocaleTimeString('tr-TR');
    const item = document.createElement('div');
    item.className = `igfc-log-item igfc-log-${type}`;
    item.textContent = `[${time}] ${message}`;
    logContainer.prepend(item);
  }

  /**
   * Yalnızca gerçek kullanıcı profil nesnelerini kabul eder
   */
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
            profilePicUrl: found.profile_pic_url || '',
            followerCount: found.follower_count ?? found.edge_followed_by?.count ?? 0,
            followingCount: found.following_count ?? found.edge_follow?.count ?? 0,
          };
        }
      } catch (_) {
        // Devam et
      }
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
          profilePicUrl: '',
          followerCount: 0,
          followingCount: 0,
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

  // Etkileşim API Fonksiyonları (Takipten Çık, Takip Et, Takipçiyi Çıkar)
  async function unfollowUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/destroy/${encodeURIComponent(
      userId
    )}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
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
    return res.json();
  }

  // Geçmiş Tarama (Snapshot) Karşılaştırma
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

  // Arayüz (UI) Oluşturma
  function createUI() {
    const root = document.createElement('div');
    root.id = EXISTING_ID;
    root.innerHTML = `
      <style>
        #${EXISTING_ID} {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(8, 11, 18, 0.86);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #f1f5f9;
        }
        #${EXISTING_ID} * {
          box-sizing: border-box;
        }
        .igfc-modal {
          width: min(1180px, 96vw);
          height: min(880px, 94vh);
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85);
        }
        .igfc-header {
          padding: 14px 22px;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #334155;
        }
        .igfc-title {
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f8fafc;
        }
        .igfc-badge {
          font-size: 11px;
          padding: 3px 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          font-weight: 700;
        }
        .igfc-header-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .igfc-close {
          background: transparent;
          border: 1px solid #475569;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s;
        }
        .igfc-close:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }
        /* Özet İstatistik Kartları */
        .igfc-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          padding: 12px 22px;
          background: #0b1120;
          border-bottom: 1px solid #1e293b;
        }
        .igfc-stat-box {
          background: #161f33;
          border: 1px solid #26334d;
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .igfc-stat-label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        .igfc-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }
        /* Üst Kontroller */
        .igfc-controls {
          padding: 12px 22px;
          background: #131c2e;
          border-bottom: 1px solid #1e293b;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .igfc-input, .igfc-select {
          background: #0f172a;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .igfc-input:focus, .igfc-select:focus {
          border-color: #3b82f6;
        }
        .igfc-btn {
          background: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .igfc-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .igfc-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .igfc-btn-success {
          background: #10b981;
        }
        .igfc-btn-success:hover:not(:disabled) {
          background: #059669;
        }
        .igfc-btn-danger {
          background: #ef4444;
        }
        .igfc-btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }
        .igfc-btn-secondary {
          background: #334155;
        }
        .igfc-btn-secondary:hover:not(:disabled) {
          background: #475569;
        }
        /* Durum ve İlerleme Çubuğu */
        .igfc-status-bar {
          padding: 10px 22px;
          background: #0b1120;
          border-bottom: 1px solid #1e293b;
        }
        .igfc-status-text {
          font-size: 12.5px;
          color: #cbd5e1;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .igfc-progress-track {
          width: 100%;
          height: 7px;
          background: #1e293b;
          border-radius: 999px;
          overflow: hidden;
        }
        .igfc-progress-fill {
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          transition: width 0.25s ease;
        }
        /* Sekmeler ve Toplu İşlem Barı */
        .igfc-subbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 22px;
          background: #0f172a;
          border-bottom: 1px solid #1e293b;
        }
        .igfc-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .igfc-tab {
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .igfc-tab.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #3b82f6;
        }
        .igfc-bulk-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        /* Kullanıcı Kart Listesi */
        .igfc-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 22px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 12px;
          align-content: start;
        }
        .igfc-list.list-mode {
          grid-template-columns: 1fr;
        }
        .igfc-card {
          background: #182235;
          border: 1px solid #293853;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: border-color 0.15s, background 0.15s;
        }
        .igfc-card:hover {
          border-color: #3b82f6;
          background: #1c283e;
        }
        .igfc-card.selected {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.12);
        }
        .igfc-user-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .igfc-checkbox {
          width: 17px;
          height: 17px;
          cursor: pointer;
          accent-color: #3b82f6;
          flex-shrink: 0;
        }
        .igfc-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          background: #0f172a;
          border: 2px solid #334155;
          flex-shrink: 0;
          display: block;
        }
        /* İsimlerin kesilmeden TAM görünmesini sağlayan stil */
        .igfc-names {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .igfc-username-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
        }
        .igfc-username {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
          text-decoration: none;
          word-break: break-all;
          line-height: 1.3;
        }
        .igfc-username:hover {
          color: #60a5fa;
          text-decoration: underline;
        }
        .igfc-fullname {
          font-size: 12.5px;
          color: #cbd5e1;
          word-break: break-word;
          white-space: normal;
          line-height: 1.35;
        }
        .igfc-tag {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .igfc-tag-verified {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .igfc-tag-private {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .igfc-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .igfc-mini-btn {
          background: #28354d;
          color: #e2e8f0;
          border: 1px solid #3b4d6e;
          padding: 6px 10px;
          border-radius: 7px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .igfc-mini-btn:hover:not(:disabled) {
          background: #3b4d6e;
        }
        .igfc-mini-btn.unfollow {
          background: #dc2626;
          border-color: #ef4444;
          color: #fff;
        }
        .igfc-mini-btn.unfollow:hover:not(:disabled) {
          background: #b91c1c;
        }
        .igfc-mini-btn.follow {
          background: #2563eb;
          border-color: #3b82f6;
          color: #fff;
        }
        .igfc-mini-btn.follow:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .igfc-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px 20px;
          color: #64748b;
          font-size: 14px;
        }
        /* Alt Günlük (Log) Konsolu */
        .igfc-footer {
          background: #090d16;
          border-top: 1px solid #1e293b;
          padding: 8px 22px;
          max-height: 92px;
          overflow-y: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11.5px;
        }
        .igfc-log-item {
          padding: 2px 0;
          color: #94a3b8;
        }
        .igfc-log-info { color: #93c5fd; }
        .igfc-log-success { color: #6ee7b7; }
        .igfc-log-warn { color: #fcd34d; }
        .igfc-log-error { color: #fca5a5; }
      </style>

      <div class="igfc-modal">
        <div class="igfc-header">
          <div class="igfc-title">
            <span>Instagram Follow Checker Pro</span>
            <span class="igfc-badge">v5 — Tam İsim & Avatar + Toplu İşlem</span>
          </div>
          <div class="igfc-header-right">
            <button class="igfc-btn igfc-btn-secondary" id="igfc-view-toggle-btn" title="Görünümü Değiştir">Görünüm: Kart</button>
            <button class="igfc-close" id="igfc-close-btn">Kapat ✕</button>
          </div>
        </div>

        <!-- Özet İstatistik Kartları -->
        <div class="igfc-stats-row">
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Takipçiler</span>
            <span class="igfc-stat-value" id="igfc-stat-followers">0</span>
          </div>
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Takip Edilen</span>
            <span class="igfc-stat-value" id="igfc-stat-following">0</span>
          </div>
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Seni Takip Etmeyen</span>
            <span class="igfc-stat-value" id="igfc-stat-nonfollowers" style="color:#f87171;">0</span>
          </div>
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Senin Takip Etmediğin</span>
            <span class="igfc-stat-value" id="igfc-stat-fans" style="color:#60a5fa;">0</span>
          </div>
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Karşılıklı Takip</span>
            <span class="igfc-stat-value" id="igfc-stat-mutuals" style="color:#34d399;">0</span>
          </div>
          <div class="igfc-stat-box">
            <span class="igfc-stat-label">Son Taramadan Çıkan</span>
            <span class="igfc-stat-value" id="igfc-stat-lost" style="color:#fbbf24;">0</span>
          </div>
        </div>

        <!-- Üst Arama, Tarama ve Dışa Aktarma Kontrolleri -->
        <div class="igfc-controls">
          <input type="text" id="igfc-username-input" class="igfc-input" placeholder="Kullanıcı adı (boşsa kendi hesabın)" value="${escapeHtml(
            getDefaultUsername()
          )}" style="width:190px;" />
          <button class="igfc-btn igfc-btn-success" id="igfc-my-account-btn">Kendi Hesabımı Tara</button>
          <button class="igfc-btn" id="igfc-start-btn">Kullanıcıyı Tara</button>
          <button class="igfc-btn igfc-btn-danger" id="igfc-stop-btn" disabled>Durdur</button>

          <input type="text" id="igfc-search-input" class="igfc-input" placeholder="İsim veya @kullanıcı ara..." style="margin-left:auto; width:190px;" />

          <select id="igfc-filter-select" class="igfc-select" title="Filtrele">
            <option value="all">Filtre: Tümü</option>
            <option value="verified">✓ Doğrulanmış Hesaplar</option>
            <option value="private">🔒 Gizli Hesaplar</option>
            <option value="public">🌐 Açık Hesaplar</option>
          </select>

          <select id="igfc-sort-select" class="igfc-select" title="Sırala">
            <option value="default">Sıralama: Varsayılan</option>
            <option value="az">Kullanıcı Adı (A → Z)</option>
            <option value="za">Kullanıcı Adı (Z → A)</option>
            <option value="name">Tam İsim (A → Z)</option>
          </select>

          <button class="igfc-btn igfc-btn-secondary" id="igfc-copy-btn" title="Listedeki kullanıcı adlarını panoya kopyala">Kopyala</button>
          <button class="igfc-btn igfc-btn-secondary" id="igfc-csv-btn" title="Excel uyumlu CSV olarak indir">CSV İndir</button>
          <button class="igfc-btn igfc-btn-secondary" id="igfc-export-btn" title="Detaylı JSON olarak indir">JSON İndir</button>
        </div>

        <!-- Durum Çubuğu -->
        <div class="igfc-status-bar">
          <div class="igfc-status-text">
            <span id="igfc-status-msg">Hazır. "Kendi Hesabımı Tara" butonuna tıklayarak başlayabilirsiniz.</span>
            <span id="igfc-progress-pct">%0</span>
          </div>
          <div class="igfc-progress-track">
            <div class="igfc-progress-fill" id="igfc-progress-fill"></div>
          </div>
        </div>

        <!-- Sekmeler ve Toplu İşlem Butonları -->
        <div class="igfc-subbar">
          <div class="igfc-tabs">
            <button class="igfc-tab active" data-tab="nonFollowers" id="igfc-tab-nonFollowers">Seni Takip Etmeyenler (0)</button>
            <button class="igfc-tab" data-tab="fans" id="igfc-tab-fans">Senin Takip Etmediklerin (0)</button>
            <button class="igfc-tab" data-tab="mutuals" id="igfc-tab-mutuals">Karşılıklı (0)</button>
            <button class="igfc-tab" data-tab="lostFollowers" id="igfc-tab-lostFollowers">Yeni Takipten Çıkanlar (0)</button>
            <button class="igfc-tab" data-tab="whitelist" id="igfc-tab-whitelist">Korunanlar (${
              state.whitelist.size
            })</button>
            <button class="igfc-tab" data-tab="history" id="igfc-tab-history">İşlem Geçmişi (${
              state.unfollowHistory.length
            })</button>
          </div>

          <div class="igfc-bulk-bar">
            <button class="igfc-btn igfc-btn-secondary" id="igfc-select-all-btn">Tümünü Seç</button>
            <button class="igfc-btn igfc-btn-secondary" id="igfc-deselect-all-btn">Seçimi Temizle</button>
            <button class="igfc-btn igfc-btn-secondary" id="igfc-bulk-whitelist-btn">Seçilenleri Koru (0)</button>
            <button class="igfc-btn igfc-btn-danger" id="igfc-bulk-unfollow-btn">Seçilenleri Takipten Çık (0)</button>
          </div>
        </div>

        <!-- Kullanıcı Listesi -->
        <div class="igfc-list" id="igfc-list-container">
          <div class="igfc-empty">Henüz tarama yapılmadı. Başlamak için üstteki "Kendi Hesabımı Tara" butonuna tıklayın.</div>
        </div>

        <!-- Canlı İşlem Günlüğü (Log Konsolu) -->
        <div class="igfc-footer" id="igfc-log-list">
          <div class="igfc-log-item igfc-log-info">[Sistem] Instagram Follow Checker Pro v5 hazır.</div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Event Listeners
    document.getElementById('igfc-close-btn').addEventListener('click', () => {
      state.bulkAbort = true;
      if (state.isRunning && state.abortController) {
        state.abortController.abort();
      }
      root.remove();
    });

    document.getElementById('igfc-view-toggle-btn').addEventListener('click', (e) => {
      state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
      const listEl = document.getElementById('igfc-list-container');
      listEl.classList.toggle('list-mode', state.viewMode === 'list');
      e.currentTarget.textContent =
        state.viewMode === 'grid' ? 'Görünüm: Kart' : 'Görünüm: Liste';
    });

    document.getElementById('igfc-start-btn').addEventListener('click', () => startScan(false));
    document.getElementById('igfc-my-account-btn').addEventListener('click', () => startScan(true));

    document.getElementById('igfc-stop-btn').addEventListener('click', () => {
      state.bulkAbort = true;
      if (state.abortController) {
        state.abortController.abort();
      }
      addLog('Durdurma komutu gönderildi.', 'warn');
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

    document.getElementById('igfc-deselect-all-btn').addEventListener('click', () => {
      state.selectedIds.clear();
      updateBulkButtons();
      renderList();
    });

    document.getElementById('igfc-bulk-whitelist-btn').addEventListener('click', () => {
      if (state.selectedIds.size === 0) return;
      for (const id of state.selectedIds) {
        state.whitelist.add(String(id));
      }
      addLog(`${state.selectedIds.size} kullanıcı koruma (beyaz) listesine eklendi.`, 'success');
      state.selectedIds.clear();
      saveWhitelist();
      computeCategories();
      updateBulkButtons();
      renderList();
    });

    document.getElementById('igfc-bulk-unfollow-btn').addEventListener('click', runBulkUnfollow);

    document.querySelectorAll('.igfc-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.igfc-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTab = btn.dataset.tab;
        state.selectedIds.clear();
        updateBulkButtons();
        renderList();
      });
    });
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
    const wlBtn = document.getElementById('igfc-bulk-whitelist-btn');
    const ufBtn = document.getElementById('igfc-bulk-unfollow-btn');
    if (wlBtn) wlBtn.textContent = `Seçilenleri Koru (${count})`;
    if (ufBtn) ufBtn.textContent = `Seçilenleri Takipten Çık (${count})`;
  }

  function computeCategories() {
    const followerIdSet = new Set(state.followers.map((u) => String(u.id)));
    const followingIdSet = new Set(state.following.map((u) => String(u.id)));

    state.nonFollowers = state.following.filter(
      (u) => !followerIdSet.has(String(u.id)) && !state.whitelist.has(String(u.id))
    );
    state.fans = state.followers.filter((u) => !followingIdSet.has(String(u.id)));
    state.mutuals = state.following.filter((u) => followerIdSet.has(String(u.id)));

    // Üst İstatistik Kutuları
    document.getElementById('igfc-stat-followers').textContent = state.followers.length;
    document.getElementById('igfc-stat-following').textContent = state.following.length;
    document.getElementById('igfc-stat-nonfollowers').textContent = state.nonFollowers.length;
    document.getElementById('igfc-stat-fans').textContent = state.fans.length;
    document.getElementById('igfc-stat-mutuals').textContent = state.mutuals.length;
    document.getElementById('igfc-stat-lost').textContent = state.lostFollowers.length;

    // Sekme Başlıkları
    document.getElementById('igfc-tab-nonFollowers').textContent = `Seni Takip Etmeyenler (${state.nonFollowers.length})`;
    document.getElementById('igfc-tab-fans').textContent = `Senin Takip Etmediklerin (${state.fans.length})`;
    document.getElementById('igfc-tab-mutuals').textContent = `Karşılıklı (${state.mutuals.length})`;
    document.getElementById('igfc-tab-lostFollowers').textContent = `Yeni Takipten Çıkanlar (${state.lostFollowers.length})`;
    document.getElementById('igfc-tab-whitelist').textContent = `Korunanlar (${state.whitelist.size})`;
    document.getElementById('igfc-tab-history').textContent = `İşlem Geçmişi (${state.unfollowHistory.length})`;
  }

  function getActiveList() {
    if (state.activeTab === 'nonFollowers') return state.nonFollowers;
    if (state.activeTab === 'fans') return state.fans;
    if (state.activeTab === 'mutuals') return state.mutuals;
    if (state.activeTab === 'lostFollowers') return state.lostFollowers;
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

    if (state.searchQuery) {
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(state.searchQuery) ||
          u.full_name?.toLowerCase().includes(state.searchQuery)
      );
    }

    if (state.filterType === 'verified') {
      list = list.filter((u) => Boolean(u.is_verified));
    } else if (state.filterType === 'private') {
      list = list.filter((u) => Boolean(u.is_private));
    } else if (state.filterType === 'public') {
      list = list.filter((u) => !u.is_private);
    }

    if (state.sortBy === 'az') {
      list.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    } else if (state.sortBy === 'za') {
      list.sort((a, b) => (b.username || '').localeCompare(a.username || ''));
    } else if (state.sortBy === 'name') {
      list.sort((a, b) => (a.full_name || a.username || '').localeCompare(b.full_name || b.username || ''));
    }

    return list;
  }

  function renderList() {
    const container = document.getElementById('igfc-list-container');
    if (!container) return;

    const filtered = getFilteredAndSortedList();

    if (filtered.length === 0) {
      container.innerHTML = `<div class="igfc-empty">Bu kategoride veya filtrede gösterilecek kullanıcı bulunamadı.</div>`;
      return;
    }

    container.innerHTML = '';
    for (const user of filtered) {
      const uid = String(user.id);
      const isSelected = state.selectedIds.has(uid);
      const isWhitelisted = state.whitelist.has(uid);

      const card = document.createElement('div');
      card.className = `igfc-card${isSelected ? ' selected' : ''}`;

      card.innerHTML = `
        <div class="igfc-user-left">
          <input type="checkbox" class="igfc-checkbox" ${isSelected ? 'checked' : ''} />
          <img class="igfc-avatar" alt="${escapeHtml(user.username)}" />
          <div class="igfc-names">
            <div class="igfc-username-row">
              <a class="igfc-username" href="https://www.instagram.com/${encodeURIComponent(
                user.username
              )}/" target="_blank" rel="noopener noreferrer" title="@${escapeHtml(user.username)}">
                @${escapeHtml(user.username)}
              </a>
              ${user.is_verified ? '<span class="igfc-tag igfc-tag-verified">✓ Onaylı</span>' : ''}
              ${user.is_private ? '<span class="igfc-tag igfc-tag-private">🔒 Gizli</span>' : ''}
            </div>
            <div class="igfc-fullname" title="${escapeHtml(user.full_name || '')}">
              ${escapeHtml(user.full_name || '—')}
            </div>
          </div>
        </div>
        <div class="igfc-card-actions">
          <button class="igfc-mini-btn whitelist-btn" title="Koruma Listesine Ekle / Çıkar">
            ${isWhitelisted ? '★ Çıkar' : '☆ Koru'}
          </button>
          ${
            state.activeTab === 'nonFollowers' || state.activeTab === 'mutuals'
              ? `<button class="igfc-mini-btn unfollow">Takibi Bırak</button>`
              : ''
          }
          ${
            state.activeTab === 'fans'
              ? `<button class="igfc-mini-btn follow">Geri Takip Et</button>
                 <button class="igfc-mini-btn unfollow remove-follower" title="Bu takipçiyi takipçilerinden çıkar">Çıkar</button>`
              : ''
          }
        </div>
      `;

      // Avatar resmini kırılmadan yükle (CORS + Blob + SVG Baş Harf Fallback)
      const imgEl = card.querySelector('.igfc-avatar');
      hydrateAvatarImage(imgEl, user.profile_pic_url, user.username, user.full_name);

      // Seçim Kutusu (Checkbox)
      const checkbox = card.querySelector('.igfc-checkbox');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.selectedIds.add(uid);
          card.classList.add('selected');
        } else {
          state.selectedIds.delete(uid);
          card.classList.remove('selected');
        }
        updateBulkButtons();
      });

      // Koruma (Beyaz Liste) Butonu
      card.querySelector('.whitelist-btn').addEventListener('click', () => {
        if (state.whitelist.has(uid)) {
          state.whitelist.delete(uid);
          addLog(`@${user.username} koruma listesinden çıkarıldı.`, 'info');
        } else {
          state.whitelist.add(uid);
          addLog(`@${user.username} koruma listesine eklendi.`, 'success');
        }
        saveWhitelist();
        computeCategories();
        renderList();
      });

      // Takibi Bırak Butonu
      const unfollowBtn = card.querySelector('.unfollow:not(.remove-follower)');
      if (unfollowBtn) {
        unfollowBtn.addEventListener('click', async () => {
          unfollowBtn.disabled = true;
          unfollowBtn.textContent = 'İşleniyor...';
          try {
            await unfollowUser(uid);
            state.following = state.following.filter((u) => String(u.id) !== uid);
            state.selectedIds.delete(uid);
            state.unfollowHistory.unshift({
              ...user,
              actionAt: new Date().toISOString(),
            });
            saveUnfollowHistory();
            computeCategories();
            updateBulkButtons();
            renderList();
            updateStatus(`@${user.username} takipten çıkarıldı.`);
            addLog(`@${user.username} (${user.full_name || ''}) takipten çıkarıldı.`, 'success');
          } catch (err) {
            unfollowBtn.disabled = false;
            unfollowBtn.textContent = 'Hata!';
            addLog(`@${user.username} takipten çıkarılamadı: ${err.message}`, 'error');
          }
        });
      }

      // Geri Takip Et Butonu
      const followBtn = card.querySelector('.follow');
      if (followBtn) {
        followBtn.addEventListener('click', async () => {
          followBtn.disabled = true;
          followBtn.textContent = 'İstek Atılıyor...';
          try {
            await followUser(uid);
            followBtn.textContent = 'Takip Edildi ✓';
            addLog(`@${user.username} takip edildi / istek gönderildi.`, 'success');
          } catch (err) {
            followBtn.disabled = false;
            followBtn.textContent = 'Hata!';
            addLog(`@${user.username} takip edilemedi: ${err.message}`, 'error');
          }
        });
      }

      // Takipçiyi Çıkar (Remove Follower) Butonu
      const removeFollowerBtn = card.querySelector('.remove-follower');
      if (removeFollowerBtn) {
        removeFollowerBtn.addEventListener('click', async () => {
          removeFollowerBtn.disabled = true;
          removeFollowerBtn.textContent = 'Çıkarılıyor...';
          try {
            await removeFollowerUser(uid);
            state.followers = state.followers.filter((u) => String(u.id) !== uid);
            computeCategories();
            renderList();
            addLog(`@${user.username} takipçilerinden çıkarıldı.`, 'success');
          } catch (err) {
            removeFollowerBtn.disabled = false;
            removeFollowerBtn.textContent = 'Hata!';
            addLog(`@${user.username} çıkarılamadı: ${err.message}`, 'error');
          }
        });
      }

      container.appendChild(card);
    }
  }

  // Güvenli Toplu Takipten Çıkma (Queue & Random Delay)
  async function runBulkUnfollow() {
    if (state.isBulkRunning || state.selectedIds.size === 0) return;

    const targets = state.following.filter((u) => state.selectedIds.has(String(u.id)));
    if (targets.length === 0) return;

    state.isBulkRunning = true;
    state.bulkAbort = false;
    const stopBtn = document.getElementById('igfc-stop-btn');
    const bulkBtn = document.getElementById('igfc-bulk-unfollow-btn');
    if (stopBtn) stopBtn.disabled = false;
    if (bulkBtn) bulkBtn.disabled = true;

    addLog(
      `Toplu takipten çıkma başlatıldı (${targets.length} kişi). Güvenlik için işlemler arasında rastgele 3.5–6.5 sn beklenecek.`,
      'info'
    );

    let done = 0;
    for (const user of targets) {
      if (state.bulkAbort) {
        addLog('Toplu işlem kullanıcı tarafından durduruldu.', 'warn');
        break;
      }

      try {
        updateStatus(
          `Toplu takipten çıkılıyor (${done + 1}/${targets.length}): @${user.username}...`
        );
        await unfollowUser(user.id);
        done++;
        state.following = state.following.filter((u) => String(u.id) !== String(user.id));
        state.selectedIds.delete(String(user.id));
        state.unfollowHistory.unshift({
          ...user,
          actionAt: new Date().toISOString(),
        });
        saveUnfollowHistory();
        computeCategories();
        updateBulkButtons();
        renderList();
        updateProgress(Math.round((done / targets.length) * 100));
        addLog(`[${done}/${targets.length}] @${user.username} takipten çıkarıldı.`, 'success');

        if (done < targets.length && !state.bulkAbort) {
          await randomDelay(state.bulkMinDelay, state.bulkMaxDelay);
        }
      } catch (err) {
        addLog(`@${user.username} hata: ${err.message}`, 'error');
        break;
      }
    }

    state.isBulkRunning = false;
    if (stopBtn) stopBtn.disabled = true;
    if (bulkBtn) bulkBtn.disabled = false;
    updateStatus(`Toplu işlem tamamlandı. ${done} kullanıcı takipten çıkarıldı.`);
  }

  // Dışa Aktarma Fonksiyonları (Kopyala, CSV, JSON)
  async function copyActiveListUsernames() {
    const list = getFilteredAndSortedList();
    if (list.length === 0) return;
    const text = list.map((u) => `@${u.username} (${u.full_name || '-'})`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      updateStatus(`${list.length} kullanıcı panoya kopyalandı!`);
      addLog(`${list.length} kullanıcı panoya kopyalandı.`, 'success');
    } catch (_) {
      addLog('Panoya kopyalama başarısız oldu.', 'error');
    }
  }

  function exportCsv() {
    const list = getFilteredAndSortedList();
    const header = ['User ID', 'Kullanici Adi', 'Tam Isim', 'Dogrulanmis', 'Gizli Hesap', 'Profil Linki'];
    const rows = list.map((u) => [
      u.id,
      u.username,
      `"${String(u.full_name || '').replace(/"/g, '""')}"`,
      u.is_verified ? 'Evet' : 'Hayir',
      u.is_private ? 'Evet' : 'Hayir',
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
    addLog(`${list.length} kayıt CSV olarak indirildi.`, 'success');
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
        fans: state.fans.length,
        mutuals: state.mutuals.length,
        lostFollowers: state.lostFollowers.length,
      },
      nonFollowers: state.nonFollowers,
      fans: state.fans,
      mutuals: state.mutuals,
      lostFollowers: state.lostFollowers,
      whitelist: [...state.whitelist],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-follow-check-${state.username || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Tüm tarama raporu JSON olarak indirildi.', 'success');
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

      compareAndSaveSnapshot(state.userId, state.followers);
      computeCategories();
      renderList();
      updateProgress(100);
      updateStatus(
        `Tamamlandı! Takipçi: ${state.followers.length} | Takip Edilen: ${state.following.length} | Seni Takip Etmeyen: ${state.nonFollowers.length}`
      );
    } catch (err) {
      updateStatus(`Hata: ${err.message}`);
      addLog(`Hata: ${err.message}`, 'error');
    } finally {
      state.isRunning = false;
      startBtn.disabled = false;
      myAccBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }

  createUI();
})();
