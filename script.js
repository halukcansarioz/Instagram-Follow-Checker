// ==UserScript==
// @name         Instagram Follow Checker Pro Ultimate
// @namespace    https://github.com/halukcansarioz/Instagram-Follow-Checker
// @version      10.22
// @description  Instagram takipçi/takip edilen analizi, geri takip etmeyenler, gizli hesap derin tamamlama, toplu işlem ve mobil tarayıcı uyumlu arayüz.
// @author       halukcansarioz
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @icon         https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      cdninstagram.com
// @connect      fbcdn.net
// @connect      instagram.com
// @connect      i.instagram.com
// @run-at       document-idle
// ==/UserScript==

/**
- Instagram Follow Checker Pro – Tam Sürüm (v10.22 Pro Ultimate)
- Sade, Hızlı & Kararlı Sürüm:
- - Takip edilen gizli hesaplarda eksik veri sorunu düzeltildi (özel başlıklar, geçersiz order temizliği, çift geçiş + otomatik a-z/0-9 arama tamamlama)
- - Başka profil tarama (isScanningSelf) hatası düzeltildi
- - Durdur sonrası AbortController kilitlenmesi giderildi
- - HTTP 429 hız sınırında anında durdurma + görünür hata şeridi eklendi
- - İmleç (cursor) sonsuz döngü koruması ve O(N) hızlı liste render eklendi
- - Konsolda tekrar çalıştırmada event sızıntısı ve localStorage kota taşması engellendi
 */

(function __igfcMain() {
  'use strict';

  const EXISTING_ID = 'ig-follow-checker-root';
  if (typeof window.__igfcCleanup === 'function') {
    try {
      window.__igfcCleanup();
    } catch (_) {}
  }
  const existingEl = document.getElementById(EXISTING_ID);
  if (existingEl) existingEl.remove();

  // Sabitler (Instagram GraphQL Query Hashes & API Parameters)
  const IG_APP_ID = '936619743392459';
  const IG_MOBILE_WEB_APP_ID = '1217981644879628';
  const IG_MOBILE_API_ORIGIN = 'https://i.instagram.com';
  const IG_ASBD_ID = '129477';
  const FOLLOWERS_QUERY_HASH = 'c76146de99bb02f6415203be841dd25a';
  const FOLLOWING_QUERY_HASH = 'd04b0a864b4b54837c0d870b0e77e076';
  const FOLLOWERS_QUERY_HASH_ALT = '37479f2b8209594dde7facb0d904896a';
  const FOLLOWING_QUERY_HASH_ALT = '58712303d941c6855d4e888c5f0cd22f';
  const TIMELINE_DOC_ID = '9310670392322965';
  const REST_FOLLOWERS_PAGE_SIZE = 12;
  const REST_FOLLOWING_PAGE_SIZE = 24;
  const GQL_PAGE_SIZE = 50;

  // LocalStorage Anahtarları
  const STORAGE_WHITELIST = 'ig_fc_whitelist_v5';
  const STORAGE_SNAPSHOT = 'ig_fc_snapshot_v5';
  const STORAGE_SCAN_HISTORY = 'ig_fc_scan_history_v7';
  const STORAGE_UNFOLLOW_LOG = 'ig_fc_unfollow_log_v5';
  const STORAGE_LAST_SCAN = 'ig_fc_last_scan_v6';
  const STORAGE_USER_NOTES = 'ig_fc_user_notes_v8';
  const STORAGE_USER_TAGS = 'ig_fc_user_tags_v10';
  const STORAGE_FAVORITES = 'ig_fc_favorites_v11';
  const STORAGE_SETTINGS = 'ig_fc_settings_v10';
  const STORAGE_DAILY_QUOTA = 'ig_fc_daily_quota_v9';

  // Hız Modu Yapılandırması
  const SPEED_CONFIGS = {
    safe: {
      label: '🛡️ Güvenli Mod (Önerilen)',
      scanDelayMin: 600,
      scanDelayMax: 1050,
      scanConcurrency: 2,
      actionDelayMin: 4000,
      actionDelayMax: 7500,
      batchSize: 10,
      batchPauseSec: 45,
    },
    normal: {
      label: '⚖️ Dengeli Mod',
      scanDelayMin: 350,
      scanDelayMax: 650,
      scanConcurrency: 3,
      actionDelayMin: 2200,
      actionDelayMax: 4200,
      batchSize: 15,
      batchPauseSec: 25,
    },
    fast: {
      label: '⚡ Hızlı Mod',
      scanDelayMin: 180,
      scanDelayMax: 360,
      scanConcurrency: 4,
      actionDelayMin: 1100,
      actionDelayMax: 2200,
      batchSize: 25,
      batchPauseSec: 15,
    },
    ultra: {
      label: '🐢 Ultra Güvenli Mod',
      scanDelayMin: 1100,
      scanDelayMax: 1800,
      scanConcurrency: 1,
      actionDelayMin: 6000,
      actionDelayMax: 11000,
      batchSize: 8,
      batchPauseSec: 60,
    },
  };

  const uiAbortController = new AbortController();
  const uiSignal = uiAbortController.signal;

  // Uygulama Durumu (State)
  const state = {
    isRunning: false,
    isBulkRunning: false,
    abortController: null,
    bulkAbort: false,
    lastRateLimitError: '',
    apiMode: 'web',
    isScanningSelf: true,
    username: '',
    userId: '',
    lastScannedAt: null,
    expectedFollowersCount: null,
    expectedFollowingCount: null,
    followers: [],
    following: [],
    nonFollowers: [],
    fans: [],
    mutuals: [],
    suspicious: [],
    lostFollowers: [],
    newFollowers: [],
    lostFollowing: [],
    newFollowing: [],
    whitelist: new Set(),
    favorites: new Set(),
    unfollowHistory: [],
    scanHistory: [],
    userNotes: {},
    userTags: {},
    lang: 'tr',
    renderLimit: 200,
    selectedIds: new Set(),
    lastClickedIndex: -1,
    activeTab: 'nonFollowers',
    searchQuery: '',
    filterType: 'all',
    sortBy: 'default',
    viewMode: 'grid',
    speedMode: 'safe',
    theme: 'system',
    autoCooldown: true,
    dailyLimitMax: 150,
    isMaximized: false,
    isMinimized: false,
    savedBounds: null,
    uiScale: 100,
    isLogOpen: false,
    avatarBlobCache: new Map(),
    profileDetailsCache: new Map(),
  };

  window.__igfcCleanup = () => {
    uiAbortController.abort();
    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (_) {}
      state.abortController = null;
    }
    state.avatarBlobCache.forEach((blobUrl) => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    });
    state.avatarBlobCache.clear();
    document.getElementById(EXISTING_ID)?.remove();
    document.getElementById('igfc-launcher-fab')?.remove();
  };

  // ============================================================================
  // YARDIMCI FONKSİYONLAR & LOCALSTORAGE YÖNETİMİ
  // ============================================================================

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function safeSetItem(key, valueStr) {
    try {
      localStorage.setItem(key, valueStr);
      return true;
    } catch (_) {
      try {
        localStorage.removeItem(STORAGE_SCAN_HISTORY);
        if (state.scanHistory.length > 2) state.scanHistory.length = 2;
        localStorage.setItem(key, valueStr);
        return true;
      } catch (__) {
        return false;
      }
    }
  }

  async function safeParseJson(res) {
    if (!res) return null;
    try {
      const txt = await res.text();
      if (!txt || txt.trim().startsWith('<')) return null;
      return JSON.parse(txt);
    } catch (_) {
      return null;
    }
  }

  async function copyTextSafe(text) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  function generateRankToken(userId) {
    const rand = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return userId ? `${userId}_${rand}` : rand;
  }

  function getRateLimitDelay(mode = 'scan') {
    const cfg = SPEED_CONFIGS[state.speedMode] || SPEED_CONFIGS.safe;
    if (mode === 'action') {
      return randomBetween(cfg.actionDelayMin, cfg.actionDelayMax);
    }
    return randomBetween(cfg.scanDelayMin, cfg.scanDelayMax);
  }

  function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function getTodayQuota() {
    try {
      const raw = localStorage.getItem(STORAGE_DAILY_QUOTA);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.date === getTodayKey()) {
        return Number(parsed.count) || 0;
      }
    } catch (_) {}
    return 0;
  }

  function incrementTodayQuota() {
    try {
      const current = getTodayQuota() + 1;
      safeSetItem(
        STORAGE_DAILY_QUOTA,
        JSON.stringify({ date: getTodayKey(), count: current })
      );
      updateQuotaBadgeUI();
      return current;
    } catch (_) {
      return 0;
    }
  }

  function resetTodayQuota() {
    try {
      safeSetItem(
        STORAGE_DAILY_QUOTA,
        JSON.stringify({ date: getTodayKey(), count: 0 })
      );
      updateQuotaBadgeUI();
    } catch (_) {}
  }

  function updateQuotaBadgeUI() {
    const badge = document.getElementById('igfc-quota-badge');
    if (!badge) return;
    const count = getTodayQuota();
    const max = state.dailyLimitMax || 150;
    badge.textContent = `Günlük Kota: ${count}/${max}`;
    badge.classList.toggle('warning', count >= Math.floor(max * 0.55) && count < Math.floor(max * 0.85));
    badge.classList.toggle('danger', count >= Math.floor(max * 0.85));
  }
  function updateApiModeUI() {
    const pill = document.getElementById('igfc-apimode-badge');
    if (!pill) return;
    const isMob = state.apiMode === 'mobile';
    pill.textContent = isMob ? '📱 Mobil Mod' : '💻 Web Mod';
    pill.title = isMob
      ? 'Mobil Web Modu aktif (tıklayarak Web moduna dönebilirsin)'
      : 'Web Modu aktif (429 gelirse otomatik Mobil Web moduna geçer; tıklayarak manuel değiştirebilirsin)';
    pill.style.background = isMob ? 'rgba(16, 185, 129, 0.22)' : '';
    pill.style.color = isMob ? '#34d399' : '';
    pill.style.borderColor = isMob ? 'rgba(16, 185, 129, 0.5)' : '';
  }

  function switchToMobileMode(reason = 'auto_429') {
    if (state.apiMode === 'mobile') return false;
    state.apiMode = 'mobile';
    updateApiModeUI();
    const isEn = state.lang === 'en';
    const msg =
      reason === 'auto_429'
        ? isEn
          ? '📱 HTTP 429 on Web — Switched automatically to Mobile Web Mode! Continuing scan...'
          : '📱 Web hız sınırı (429) algılandı — Otomatik Mobil Web Moduna geçildi! Tarama mobil modda devam ediyor...'
        : isEn
        ? '📱 Switched to Mobile Web Mode.'
        : '📱 Mobil Web Moduna geçildi.';
    showMobileSwitchBanner(msg);
    updateStatus(msg);
    addLog(msg, 'warn');
    showToast(
      reason === 'auto_429'
        ? isEn
          ? '📱 429 detected — Switched to Mobile Mode!'
          : '📱 429 algılandı — Otomatik Mobil Moda geçildi!'
        : msg,
      'warning'
    );
    return true;
  }
  function getGmXhr() {
    if (typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest;
    if (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function') return GM.xmlHttpRequest;
    return null;
  }

  function showMobileSwitchBanner(text) {
    const banner = document.getElementById('igfc-mobile-banner');
    const txtEl = document.getElementById('igfc-mobile-banner-text');
    if (txtEl) txtEl.textContent = text;
    if (banner) banner.classList.add('visible');
  }

  function hideMobileSwitchBanner() {
    document.getElementById('igfc-mobile-banner')?.classList.remove('visible');
  }

  function fetchViaMobileGmXhr(url, options = {}) {
    const gmXhr = getGmXhr();
    if (!gmXhr) return null;
    const mobileUrl = String(url).replace('https://www.instagram.com/api/v1/', `${IG_MOBILE_API_ORIGIN}/api/v1/`);
    const headers = {
      ...getAppHeaders(options.headers || {}),
      'X-IG-App-ID': IG_MOBILE_WEB_APP_ID,
      'Accept': '*/*',
    };
    return new Promise((resolve, reject) => {
      gmXhr({
        method: options.method || 'GET',
        url: mobileUrl,
        headers,
        data: options.body || undefined,
        withCredentials: true,
        timeout: 20000,
        onload: (r) => {
          resolve({
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            headers: {
              get: (name) => {
                const m = String(r.responseHeaders || '').match(new RegExp(`^${name}:\s*(.+)$`, 'im'));
                return m ? m[1].trim() : null;
              },
            },
            text: async () => r.responseText || '',
            json: async () => JSON.parse(r.responseText || '{}'),
          });
        },
        onerror: () => reject(new Error('Mobil uç nokta ağ hatası')),
        ontimeout: () => reject(new Error('Mobil uç nokta zaman aşımı')),
      });
    });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

  function getAppCSRFToken() {
    return getCookie('csrftoken') || '';
  }

  function getJazoest(csrfToken) {
    let sum = 0;
    const str = String(csrfToken || '');
    for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
    return `2${sum}`;
  }

  function getAppIGAppID() {
    return state.apiMode === 'mobile' ? IG_MOBILE_WEB_APP_ID : IG_APP_ID;
  }

  let cachedWWWClaim = '';

  function getWWWClaim() {
    if (cachedWWWClaim) return cachedWWWClaim;
    try {
      return sessionStorage.getItem('www-claim-v2') || '0';
    } catch (_) {
      return '0';
    }
  }

  function getAppHeaders(extra = {}) {
    const base = {
      'X-IG-App-ID': getAppIGAppID(),
      'X-IG-WWW-Claim': getWWWClaim(),
      'X-CSRFToken': getAppCSRFToken(),
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (state.apiMode !== 'mobile') {
      base['X-ASBD-ID'] = IG_ASBD_ID;
    }
    return { ...base, ...extra };
  }

  function getDefaultUsername() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const reserved = new Set([
      'explore',
      'direct',
      'reels',
      'reel',
      'stories',
      'accounts',
      'p',
      'tv',
      'challenge',
      'legal',
      'about',
      'saved',
      'archive',
      'settings',
    ]);
    if (pathParts.length >= 1 && !reserved.has(pathParts[0].toLowerCase())) {
      return pathParts[0];
    }
    return '';
  }

  function getWhitelist() {
    try {
      const raw = localStorage.getItem(STORAGE_WHITELIST);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          state.whitelist = new Set(arr.map(String));
        }
      }
    } catch (_) {}
    return state.whitelist;
  }

  function saveWhitelist(customList) {
    try {
      if (customList instanceof Set) state.whitelist = customList;
      else if (Array.isArray(customList)) state.whitelist = new Set(customList.map(String));
      safeSetItem(STORAGE_WHITELIST, JSON.stringify([...state.whitelist]));
    } catch (_) {}
  }

  function isWhitelisted(userId) {
    return state.whitelist.has(String(userId));
  }

  function toggleWhitelist(userId) {
    const uid = String(userId);
    if (state.whitelist.has(uid)) {
      state.whitelist.delete(uid);
      state.selectedIds.delete(uid);
    } else {
      state.whitelist.add(uid);
      state.selectedIds.delete(uid);
    }
    saveWhitelist();
    updateStatsUI();
    updateBulkButtons();
    return state.whitelist.has(uid);
  }

  function getNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_USER_NOTES);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          state.userNotes = obj;
        }
      }
    } catch (_) {}
    return state.userNotes;
  }

  function saveNotes(customNotes) {
    try {
      if (customNotes && typeof customNotes === 'object') {
        state.userNotes = customNotes;
      }
      safeSetItem(STORAGE_USER_NOTES, JSON.stringify(state.userNotes));
    } catch (_) {}
  }

  function getUserNote(userId) {
    return state.userNotes[String(userId)] || '';
  }

  function setUserNote(userId, note) {
    const uid = String(userId);
    const trimmed = String(note || '').trim();
    if (trimmed) state.userNotes[uid] = trimmed;
    else delete state.userNotes[uid];
    saveNotes();
  }

  function loadUserTags() {
    try {
      const raw = localStorage.getItem(STORAGE_USER_TAGS);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') state.userTags = obj;
      }
    } catch (_) {}
    return state.userTags;
  }

  function saveUserTags() {
    try {
      safeSetItem(STORAGE_USER_TAGS, JSON.stringify(state.userTags));
    } catch (_) {}
  }

  function getUserTag(userId) {
    return state.userTags[String(userId)] || '';
  }

  function setUserTag(userId, tag) {
    const uid = String(userId);
    const trimmed = String(tag || '').trim();
    if (trimmed) state.userTags[uid] = trimmed;
    else delete state.userTags[uid];
    saveUserTags();
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_FAVORITES);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) state.favorites = new Set(arr.map(String));
      }
    } catch (_) {}
    return state.favorites;
  }

  function saveFavorites() {
    try {
      safeSetItem(STORAGE_FAVORITES, JSON.stringify([...state.favorites]));
    } catch (_) {}
  }

  function isFavorite(userId) {
    return state.favorites.has(String(userId));
  }

  function toggleFavorite(userId) {
    const uid = String(userId);
    if (state.favorites.has(uid)) state.favorites.delete(uid);
    else state.favorites.add(uid);
    saveFavorites();
    updateStatsUI();
    return state.favorites.has(uid);
  }

  function computeAccountHealth() {
    const flw = state.followers.length;
    const flwing = state.following.length;
    if (flw === 0 && flwing === 0) {
      return { score: 0, grade: '-', summary: 'Henüz veri yok' };
    }
    const mutualRatio = flwing > 0 ? state.mutuals.length / flwing : 0;
    const nonFollowRatio = flwing > 0 ? state.nonFollowers.length / flwing : 0;
    const suspRatio = flwing > 0 ? state.suspicious.length / flwing : 0;
    const balanceBonus = flw >= flwing ? 20 : Math.max(0, Math.round((flw / Math.max(1, flwing)) * 20));

    let score = Math.round(mutualRatio * 60 + (1 - nonFollowRatio) * 20 + balanceBonus - suspRatio * 25);
    score = Math.max(5, Math.min(100, score));

    let grade = 'C';
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else grade = 'D';

    let summary = 'Dengeli Hesap';
    if (score >= 85) summary = 'Mükemmel Etkileşim & Sadakat';
    else if (score >= 70) summary = 'İyi Takip Dengesi';
    else if (nonFollowRatio > 0.45) summary = 'Yüksek Geri Takip Etmeyen Oranı';

    return { score, grade, summary };
  }

  function exportSummaryReportTxt() {
    const health = computeAccountHealth();
    const lines = [
      '====================================================',
      'INSTAGRAM FOLLOW CHECKER PRO - HESAP ANALİZ RAPORU',
      '====================================================',
      `Hesap: @${state.username || 'belirtilmedi'}`,
      `Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`,
      `Hesap Sağlık Puanı: ${health.score}/100 (${health.grade}) - ${health.summary}`,
      '',
      '--- ÖZET İSTATİSTİKLER ---',
      `• Tüm Takipçiler: ${state.followers.length}`,
      `• Tüm Takip Edilenler: ${state.following.length}`,
      `• Karşılıklı Takipleşilenler: ${state.mutuals.length}`,
      `• Seni Geri Takip Etmeyenler: ${state.nonFollowers.length}`,
      `• Senin Takip Etmediklerin (Hayranlar): ${state.fans.length}`,
      `• Şüpheli / Bot Görünümlü Hesaplar: ${state.suspicious.length}`,
      `• Son Taramadan Beri Takipten Çıkanlar: ${state.lostFollowers.length}`,
      `• Son Taramadan Beri Yeni Gelenler: ${state.newFollowers.length}`,
      `• Koruma Listesi (Whitelist): ${state.whitelist.size}`,
      `• Favoriler: ${state.favorites.size}`,
      '',
      `--- GERİ TAKİP ETMEYENLER (${state.nonFollowers.length}) ---`,
      ...state.nonFollowers.map((u, i) => `${i + 1}. @${u.username} (${u.full_name || '-'})`),
      '',
      `--- SON TARAMADAN BERİ TAKİPTEN ÇIKANLAR (${state.lostFollowers.length}) ---`,
      ...state.lostFollowers.map((u, i) => `${i + 1}. @${u.username} (${u.full_name || '-'})`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-analiz-raporu-${state.username || 'hesap'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Detaylı TXT analiz raporu indirildi.', 'success');
  }

  function importOfficialJsonFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const importedFollowers = [];
    const importedFollowing = [];

    const parseOfficialStructure = (parsed, fname) => {
      const extractArr = (arr, target) => {
        arr.forEach((item, idx) => {
          const sld = item?.string_list_data?.[0];
          const uname = sld?.value || item?.username || item?.title || '';
          if (!uname) return;
          const cleanUname = String(uname).replace(/^@/, '').trim();
          target.push({
            id: String(item?.id || item?.pk || cleanUname),
            username: cleanUname,
            full_name: item?.full_name || '',
            profile_pic_url: item?.profile_pic_url || '',
            is_verified: Boolean(item?.is_verified),
            is_private: Boolean(item?.is_private),
            followOrderIndex: idx,
          });
        });
      };

      if (Array.isArray(parsed)) {
        if (fname.includes('following')) extractArr(parsed, importedFollowing);
        else extractArr(parsed, importedFollowers);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.relationships_following)) extractArr(parsed.relationships_following, importedFollowing);
        if (Array.isArray(parsed.relationships_followers)) extractArr(parsed.relationships_followers, importedFollowers);
        if (Array.isArray(parsed.following)) extractArr(parsed.following, importedFollowing);
        if (Array.isArray(parsed.followers)) extractArr(parsed.followers, importedFollowers);
      }
    };

    Promise.all(
      files.map(async (file) => {
        try {
          const txt = await file.text();
          const parsed = JSON.parse(txt);
          parseOfficialStructure(parsed, file.name.toLowerCase());
        } catch (_) {
          showToast(`${file.name} okunamadı!`, 'error');
        }
      })
    ).then(() => {
      if (importedFollowers.length === 0 && importedFollowing.length === 0) {
        showToast('Seçilen JSON dosyasında takipçi veya takip edilen verisi bulunamadı.', 'warning');
        return;
      }
      clearRateLimitError();
      if (importedFollowers.length > 0) state.followers = importedFollowers;
      if (importedFollowing.length > 0) state.following = importedFollowing;
      state.lastScannedAt = new Date().toISOString();
      if (!state.username) state.username = getDefaultUsername() || 'json_import';
      computeCategories();
      saveLastScanCache();
      renderList();
      updateStatus(`JSON İçe Aktarıldı! Takipçi: ${state.followers.length} | Takip Edilen: ${state.following.length}`);
      showToast(`JSON yüklendi: ${state.followers.length} takipçi, ${state.following.length} takip edilen.`, 'success');
    });
  }

  function loadUnfollowHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_UNFOLLOW_LOG);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          state.unfollowHistory = arr;
        }
      }
    } catch (_) {}
  }

  function saveUnfollowHistory(user, actionType = 'unfollow') {
    try {
      const entry = {
        id: String(user.id),
        username: user.username,
        full_name: user.full_name || '',
        profile_pic_url: user.profile_pic_url || '',
        is_verified: Boolean(user.is_verified),
        is_private: Boolean(user.is_private),
        actionType,
        timestamp: new Date().toISOString(),
      };
      state.unfollowHistory.unshift(entry);
      if (state.unfollowHistory.length > 400) {
        state.unfollowHistory.length = 400;
      }
      safeSetItem(STORAGE_UNFOLLOW_LOG, JSON.stringify(state.unfollowHistory));
    } catch (_) {}
  }

  function getScanHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_SCAN_HISTORY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          state.scanHistory = arr;
        }
      }
    } catch (_) {}
    return state.scanHistory;
  }

  function saveScanHistory(entry) {
    try {
      getScanHistory();
      const compactUser = (u) => ({
        id: String(u.id),
        username: u.username,
        full_name: u.full_name || '',
        is_verified: Boolean(u.is_verified),
        is_private: Boolean(u.is_private),
      });
      const snapshotEntry = entry || {
        id: `${state.userId || state.username}_${Date.now()}`,
        username: state.username,
        userId: state.userId,
        timestamp: new Date().toISOString(),
        followersCount: state.followers.length,
        followingCount: state.following.length,
        nonFollowersCount: state.nonFollowers.length,
        followers: state.followers.map(compactUser),
        following: state.following.map(compactUser),
      };
      state.scanHistory.unshift(snapshotEntry);
      if (state.scanHistory.length > 8) {
        state.scanHistory.length = 8;
      }
      safeSetItem(STORAGE_SCAN_HISTORY, JSON.stringify(state.scanHistory));
    } catch (_) {}
  }

  function clearScanHistory() {
    try {
      state.scanHistory = [];
      localStorage.removeItem(STORAGE_SCAN_HISTORY);
      localStorage.removeItem(STORAGE_SNAPSHOT);
      showToast('Tarama geçmişi ve anlık görüntüler temizlendi.', 'info');
    } catch (_) {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        if (s.viewMode) state.viewMode = s.viewMode;
        if (s.speedMode && SPEED_CONFIGS[s.speedMode]) state.speedMode = s.speedMode;
        if (s.theme) state.theme = s.theme;
        if (typeof s.autoCooldown === 'boolean') state.autoCooldown = s.autoCooldown;
        if (typeof s.dailyLimitMax === 'number') state.dailyLimitMax = Math.max(20, s.dailyLimitMax);
        if (typeof s.uiScale === 'number') state.uiScale = Math.min(125, Math.max(75, s.uiScale));
      }
    } catch (_) {}
  }

  function saveSettings() {
    try {
      safeSetItem(
        STORAGE_SETTINGS,
        JSON.stringify({
          viewMode: state.viewMode,
          speedMode: state.speedMode,
          theme: state.theme,
          autoCooldown: state.autoCooldown,
          dailyLimitMax: state.dailyLimitMax,
          uiScale: state.uiScale,
        })
      );
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
        state.isScanningSelf = typeof data.isScanningSelf === 'boolean' ? data.isScanningSelf : true;
        state.lastScannedAt = data.lastScannedAt || null;
        state.followers = data.followers;
        state.following = data.following;
        state.lostFollowers = data.lostFollowers || [];
        state.newFollowers = data.newFollowers || [];
        state.lostFollowing = data.lostFollowing || [];
        state.newFollowing = data.newFollowing || [];
        return true;
      }
    } catch (_) {}
    return false;
  }

  function saveLastScanCache() {
    try {
      const payload = {
        isScanningSelf: state.isScanningSelf,
        username: state.username,
        userId: state.userId,
        lastScannedAt: state.lastScannedAt,
        followers: state.followers,
        following: state.following,
        lostFollowers: state.lostFollowers,
        newFollowers: state.newFollowers,
        lostFollowing: state.lostFollowing,
        newFollowing: state.newFollowing,
      };
      safeSetItem(STORAGE_LAST_SCAN, JSON.stringify(payload));
      updateCacheInfoUI();
    } catch (_) {}
  }

  function clearScanCache() {
    try {
      localStorage.removeItem(STORAGE_LAST_SCAN);
      state.lastScannedAt = null;
      updateCacheInfoUI();
      showToast('Son taranan kişi önbellek kaydı temizlendi.', 'info');
      addLog('Son tarama önbelleği (STORAGE_LAST_SCAN) temizlendi.', 'info');
    } catch (_) {}
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

  // ============================================================================
  // ŞÜPHELİ / BOT HESAP PUANLAMA VE AVATAR YÜKLEYİCİ
  // ============================================================================

  function isMissingAvatarUrl(picUrl, userObj = null) {
    if (userObj && userObj.has_anonymous_profile_picture === true) return true;
    const s = String(picUrl || '');
    return (
      !s ||
      s.includes('44884218_345707102882519') ||
      s.includes('464760996_1254146839119862') ||
      s.includes('YW5vbnltb3VzX3Byb2ZpbGVfcGlj') ||
      s.includes('default_profile') ||
      s.includes('anonymous')
    );
  }

  function computeSuspicionInfo(user, isNonFollower = false) {
    if (!user || user.is_verified) {
      return { score: 0, isSuspicious: false, reasons: [] };
    }
    let score = 0;
    const reasons = [];
    const picUrl = String(user.profile_pic_url || '');
    const uname = String(user.username || '');
    const fullName = String(user.full_name || '').trim();
    const missingAvatar = isMissingAvatarUrl(picUrl, user);

    if (missingAvatar) {
      score += 50;
      reasons.push('Profil resmi yok');
    }

    const digits = uname.match(/\d/g);
    if (digits && digits.length >= 4) {
      score += 30;
      reasons.push('Çok rakamlı kullanıcı adı');
    } else if (digits && digits.length === 3) {
      score += 15;
      reasons.push('Rakamlı kullanıcı adı');
    }

    if (/\d{3,}$/.test(uname) || /(?:_.*_|\..*\.)/.test(uname)) {
      score += 15;
      reasons.push('Bot tipi kullanıcı adı dizilimi');
    }

    if (!fullName) {
      score += 15;
      reasons.push('İsim alanı boş');
    } else if (fullName.toLowerCase() === uname.toLowerCase()) {
      score += 10;
      reasons.push('İsim ile kullanıcı adı aynı');
    }

    if (isNonFollower) {
      score += 15;
      reasons.push('Geri takip etmiyor');
    }

    if (user.is_private && missingAvatar && !fullName) {
      score += 15;
      reasons.push('Gizli ve profil resmi/ismi yok');
    }

    const finalScore = Math.min(100, score);
    return {
      score: finalScore,
      isSuspicious: finalScore >= 50,
      reasons,
    };
  }

  function generateSvgAvatar(username, fullName = '') {
    const label = (fullName || username || 'IG').trim().slice(0, 2).toUpperCase();
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < (username || '').length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bg = colors[Math.abs(hash) % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="40" fill="${bg}"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="700">${escapeHtml(label)}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function fetchImageBlobViaGM(url) {
    return new Promise((resolve, reject) => {
      const gmXhr =
        typeof GM_xmlhttpRequest === 'function'
          ? GM_xmlhttpRequest
          : typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function'
          ? GM.xmlHttpRequest
          : null;
      if (!gmXhr) return reject(new Error('no_gm'));
      gmXhr({
        method: 'GET',
        url,
        responseType: 'blob',
        timeout: 8000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300 && res.response) {
            resolve(URL.createObjectURL(res.response));
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('gm_err')),
        ontimeout: () => reject(new Error('gm_timeout')),
      });
    });
  }

  function hydrateAvatarImage(imgEl, user) {
    if (!imgEl || !user) return;
    const fallbackSvg = generateSvgAvatar(user.username, user.full_name);
    const picUrl = String(user.profile_pic_url_hd || user.profile_pic_url || '').trim();
    if (!picUrl || isMissingAvatarUrl(picUrl, user)) {
      imgEl.src = fallbackSvg;
      return;
    }
    if (state.avatarBlobCache.has(picUrl)) {
      imgEl.src = state.avatarBlobCache.get(picUrl);
      return;
    }

    const hasGm =
      typeof GM_xmlhttpRequest === 'function' ||
      (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function');

    if (hasGm) {
      imgEl.src = fallbackSvg;
      fetchImageBlobViaGM(picUrl)
        .then((blobUrl) => {
          state.avatarBlobCache.set(picUrl, blobUrl);
          imgEl.src = blobUrl;
        })
        .catch(() => {
          imgEl.crossOrigin = 'anonymous';
          imgEl.referrerPolicy = 'no-referrer';
          imgEl.src = picUrl;
        });
      return;
    }

    // Instagram COEP (require-corp) politikası için crossOrigin='anonymous' zorunludur
    imgEl.crossOrigin = 'anonymous';
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.onerror = async () => {
      imgEl.onerror = null;
      try {
        const res = await fetch(picUrl, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error('img_fetch_fail');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        state.avatarBlobCache.set(picUrl, blobUrl);
        imgEl.removeAttribute('crossorigin');
        imgEl.src = blobUrl;
      } catch (_) {
        imgEl.removeAttribute('crossorigin');
        imgEl.src = fallbackSvg;
      }
    };
    imgEl.src = picUrl;
  }

  // ============================================================================
  // DOM & SCRIPT ÜZERİNDEN KULLANICI ÇÖZÜMLEME
  // ============================================================================

  function getLoggedInViewerFromDOM() {
    const cookieMatch = document.cookie.match(/ds_user_id=([^;]+)/);
    const viewerId = cookieMatch ? cookieMatch[1].trim() : '';
    if (!viewerId) return null;

    const escapedId = viewerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`"id"\\s*:\\s*"${escapedId}"[^{}]{0,300}?"username"\\s*:\\s*"([a-zA-Z0-9._]{1,30})"`),
      new RegExp(`"username"\\s*:\\s*"([a-zA-Z0-9._]{1,30})"[^{}]{0,300}?"id"\\s*:\\s*"${escapedId}"`),
      new RegExp(`"pk"\\s*:\\s*"${escapedId}"[^{}]{0,300}?"username"\\s*:\\s*"([a-zA-Z0-9._]{1,30})"`),
    ];

    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const text = s.textContent || '';
      if (!text.includes(viewerId)) continue;
      for (const rgx of patterns) {
        const m = text.match(rgx);
        if (m && m[1]) {
          return { id: viewerId, username: m[1] };
        }
      }
    }
    return { id: viewerId, username: '' };
  }

  function findStrictUserInJson(obj, targetUsername, depth = 0, seen = new WeakSet()) {
    if (!obj || typeof obj !== 'object' || depth > 14) return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (
      typeof obj.username === 'string' &&
      obj.username.toLowerCase() === targetUsername.toLowerCase() &&
      (obj.id || obj.pk)
    ) {
      const followedByViewer =
        typeof obj.followed_by_viewer === 'boolean'
          ? obj.followed_by_viewer
          : typeof obj.friendship_status?.following === 'boolean'
          ? obj.friendship_status.following
          : null;
      return {
        id: String(obj.id || obj.pk),
        username: obj.username,
        fullName: obj.full_name || '',
        profilePicUrl: obj.profile_pic_url_hd || obj.profile_pic_url || '',
        followerCount: obj.edge_followed_by?.count ?? obj.follower_count ?? null,
        followingCount: obj.edge_follow?.count ?? obj.following_count ?? null,
        mediaCount: obj.edge_owner_to_timeline_media?.count ?? obj.media_count ?? null,
        isVerified: Boolean(obj.is_verified),
        isPrivate: Boolean(obj.is_private),
        followedByViewer,
        biography: obj.biography || '',
        externalUrl: obj.external_url || '',
      };
    }
    for (const key of Object.keys(obj)) {
      const found = findStrictUserInJson(obj[key], targetUsername, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  function extractStrictProfileFromScripts(targetUsername) {
    if (!targetUsername) return null;
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const txt = (s.textContent || '').trim();
      if (!txt.startsWith('{') || !txt.toLowerCase().includes(targetUsername.toLowerCase())) {
        continue;
      }
      try {
        const parsed = JSON.parse(txt);
        const found = findStrictUserInJson(parsed, targetUsername);
        if (found) return found;
      } catch (_) {}
    }

    const html = document.documentElement.innerHTML;
    const idMatch =
      html.match(/profilePage_(\d+)/) ||
      html.match(/instagram:\/\/user\?username=[^&]+&amp;userid=(\d+)/);
    if (idMatch && idMatch[1] && getDefaultUsername().toLowerCase() === targetUsername.toLowerCase()) {
      return {
        id: String(idMatch[1]),
        username: targetUsername,
        fullName: '',
        profilePicUrl: '',
        followerCount: null,
        followingCount: null,
        mediaCount: null,
        isVerified: false,
        isPrivate: false,
        followedByViewer: null,
        biography: '',
        externalUrl: '',
      };
    }
    return null;
  }

  function parseFormattedCount(rawStr) {
    if (rawStr == null) return null;
    const s = String(rawStr).trim();
    if (!s) return null;
    const abbr = s.match(/^([\d]+(?:[.,]\d+)?)\s*(b|bin|k|m|mn|milyon)$/i);
    if (abbr) {
      const num = parseFloat(abbr[1].replace(',', '.'));
      if (Number.isNaN(num)) return null;
      const unit = abbr[2].toLowerCase();
      if (unit === 'b' || unit === 'bin' || unit === 'k') return Math.round(num * 1000);
      if (unit === 'm' || unit === 'mn' || unit === 'milyon') return Math.round(num * 1000000);
    }
    if (/[a-zA-Z]/.test(s)) return null;
    const digits = s.replace(/[.,\s\u00a0]/g, '');
    return /^\d+$/.test(digits) ? Number(digits) : null;
  }

  function extractVisibleCountsFromDOM(targetUsername) {
    try {
      if (!targetUsername) return null;
      const lowerU = targetUsername.toLowerCase();
      if ((getDefaultUsername() || '').toLowerCase() !== lowerU) return null;
      let followerCount = null;
      let followingCount = null;

      // 1) Bağlantı (a[href]) üzerinden okuma
      const links = Array.from(document.querySelectorAll('header a[href], main a[href]'));
      for (const a of links) {
        if (a.closest(`#${EXISTING_ID}`)) continue;
        const href = (a.getAttribute('href') || '').split('?')[0].replace(/\/+$/, '').toLowerCase();
        if (href.endsWith('/followers')) {
          const titled = a.querySelector('[title]') || (a.hasAttribute('title') ? a : null);
          const raw = titled ? titled.getAttribute('title') : (a.textContent || '').match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)/i)?.[1];
          const parsed = parseFormattedCount(raw);
          if (parsed != null) followerCount = parsed;
        } else if (href.endsWith('/following')) {
          const titled = a.querySelector('[title]') || (a.hasAttribute('title') ? a : null);
          const raw = titled ? titled.getAttribute('title') : (a.textContent || '').match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)/i)?.[1];
          const parsed = parseFormattedCount(raw);
          if (parsed != null) followingCount = parsed;
        }
      }

      // 2) Başlık (header) metninden doğrudan okuma ("446 takipçi", "580 takip" / "446 followers", "580 following")
      if (followerCount == null || followingCount == null) {
        const headerEl = document.querySelector('main header') || document.querySelector('header');
        if (headerEl && !headerEl.closest(`#${EXISTING_ID}`)) {
          const headerText = (headerEl.innerText || headerEl.textContent || '').replace(/\s+/g, ' ');
          if (followerCount == null) {
            const mFlw = headerText.match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)\s*(?:takipçi|followers?)\b/i);
            if (mFlw) followerCount = parseFormattedCount(mFlw[1]);
          }
          if (followingCount == null) {
            const mFlwing = headerText.match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)\s*(?:takip(?!çi)|following)\b/i);
            if (mFlwing) followingCount = parseFormattedCount(mFlwing[1]);
          }
        }
      }

      // 3) Meta description yedeği
      if (followerCount == null || followingCount == null) {
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute('content') ||
          document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          '';
        if (metaDesc) {
          if (followerCount == null) {
            const mFlw = metaDesc.match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)\s*(?:takipçi|followers?)\b/i);
            if (mFlw) followerCount = parseFormattedCount(mFlw[1]);
          }
          if (followingCount == null) {
            const mFlwing = metaDesc.match(/([\d.,]+(?:\s*(?:b|bin|k|m|mn|milyon))?)\s*(?:takip(?!çi)|following)\b/i);
            if (mFlwing) followingCount = parseFormattedCount(mFlwing[1]);
          }
        }
      }

      return followerCount != null || followingCount != null ? { followerCount, followingCount } : null;
    } catch (_) {
      return null;
    }
  }

  // ============================================================================
  // INSTAGRAM REST & GRAPHQL API MOTORU (ANINDA 429 DURDURMA + GİZLİ HESAP DESTEĞİ)
  // ============================================================================

  async function fetchWithRetry(url, options = {}, maxRetries = 2) {
    const useScanSignal = Boolean(options._ignoreScanAbort !== true && state.isRunning && state.abortController);
    const softRateLimit = Boolean(options._softRateLimit);
    const cleanOptions = { ...options };
    delete cleanOptions._ignoreScanAbort;
    delete cleanOptions._softRateLimit;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (useScanSignal && state.abortController?.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      try {
        const reqHeaders = getAppHeaders(cleanOptions.headers || {});
        const useGmMobile =
          state.apiMode === 'mobile' &&
          Boolean(getGmXhr()) &&
          String(url).includes('/api/v1/');

        const res = useGmMobile
          ? await fetchViaMobileGmXhr(url, cleanOptions)
          : await fetch(url, {
              ...cleanOptions,
              headers: reqHeaders,
              credentials: 'include',
              signal: useScanSignal && state.abortController ? state.abortController.signal : undefined,
            });

        const newClaim = res?.headers?.get?.('x-ig-set-www-claim');
        if (newClaim && newClaim !== '0') {
          cachedWWWClaim = newClaim;
          try {
            sessionStorage.setItem('www-claim-v2', newClaim);
          } catch (_) {}
        }

        // HTTP 429 geldiğinde: Web modundaysa anında uyarı verip otomatik Mobil Moda geç ve yeniden dene
        if (res.status === 429) {
          if (softRateLimit) return res;
          if (state.apiMode !== 'mobile') {
            switchToMobileMode('auto_429');
            await sleep(1800);
            const mobileRes =
              Boolean(getGmXhr()) && String(url).includes('/api/v1/')
                ? await fetchViaMobileGmXhr(url, cleanOptions)
                : await fetch(url, {
                    ...cleanOptions,
                    headers: getAppHeaders(cleanOptions.headers || {}),
                    credentials: 'include',
                    signal: useScanSignal && state.abortController ? state.abortController.signal : undefined,
                  });
            if (mobileRes && mobileRes.status !== 429) {
              const mClaim = mobileRes?.headers?.get?.('x-ig-set-www-claim');
              if (mClaim && mClaim !== '0') {
                cachedWWWClaim = mClaim;
                try {
                  sessionStorage.setItem('www-claim-v2', mClaim);
                } catch (_) {}
              }
              return mobileRes;
            }
          }
          notifyRateLimitError(url);
          if (useScanSignal) {
            throw new DOMException('HTTP 429 Rate Limit', 'AbortError');
          }
          return res;
        }

        if (res.status >= 500) {
          if (attempt >= maxRetries) return res;
          const waitSec = (attempt + 1) * 3 + randomBetween(1, 3);
          addLog(`⚠️ Sunucu hatası (${res.status}). ${waitSec} sn bekleniyor...`, 'warn');
          await sleep(waitSec * 1000);
          continue;
        }
        return res;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (attempt >= maxRetries) throw err;
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  async function fetchProfileViaWebInfo(cleanUsername, ignoreScanAbort = false) {
    try {
      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`;
      const res = await fetchWithRetry(url, { _ignoreScanAbort: ignoreScanAbort, _softRateLimit: true }, 0);
      if (res && res.ok) {
        const json = await safeParseJson(res);
        const u = json?.data?.user;
        if (u && (u.id || u.pk)) {
          return {
            id: String(u.id || u.pk),
            username: u.username || cleanUsername,
            fullName: u.full_name || '',
            profilePicUrl: u.profile_pic_url_hd || u.profile_pic_url || '',
            followerCount: u.edge_followed_by?.count ?? u.follower_count ?? null,
            followingCount: u.edge_follow?.count ?? u.following_count ?? null,
            mediaCount: u.edge_owner_to_timeline_media?.count ?? u.media_count ?? null,
            isVerified: Boolean(u.is_verified),
            isPrivate: Boolean(u.is_private),
            followedByViewer:
              typeof u.followed_by_viewer === 'boolean'
                ? u.followed_by_viewer
                : typeof u.friendship_status?.following === 'boolean'
                ? u.friendship_status.following
                : null,
            biography: u.biography || '',
            externalUrl: u.external_url || '',
          };
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
    return null;
  }

  async function fetchProfileViaUserInfoById(userId, fallbackUsername = '', ignoreScanAbort = false) {
    // /api/v1/users/{id}/info/ web oturumlarında anında HTTP 429 döndürdüğü için devre dışı bırakıldı
    return null;
    if (!userId || !/^\d+$/.test(String(userId))) return null;
    try {
      const url = `https://www.instagram.com/api/v1/users/${encodeURIComponent(userId)}/info/`;
      const res = await fetchWithRetry(url, { _ignoreScanAbort: ignoreScanAbort, _softRateLimit: true }, 0);
      if (res && res.ok) {
        const json = await safeParseJson(res);
        const u = json?.user;
        if (u && (u.pk || u.id)) {
          return {
            id: String(u.pk || u.id),
            username: u.username || fallbackUsername,
            fullName: u.full_name || '',
            profilePicUrl: u.hd_profile_pic_url_info?.url || u.profile_pic_url || '',
            followerCount: typeof u.follower_count === 'number' ? u.follower_count : null,
            followingCount: typeof u.following_count === 'number' ? u.following_count : null,
            mediaCount: typeof u.media_count === 'number' ? u.media_count : null,
            isVerified: Boolean(u.is_verified),
            isPrivate: Boolean(u.is_private),
            followedByViewer: typeof u.friendship_status?.following === 'boolean' ? u.friendship_status.following : null,
            biography: u.biography || '',
            externalUrl: u.external_url || '',
          };
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
    return null;
  }

  async function checkViewerFollowsUser(userId) {
    if (!userId || !/^\d+$/.test(String(userId))) return null;
    try {
      const url = `https://www.instagram.com/api/v1/friendships/show/${encodeURIComponent(userId)}/`;
      const res = await fetchWithRetry(url, { _softRateLimit: true }, 0);
      if (res && res.ok) {
        const json = await safeParseJson(res);
        if (typeof json?.following === 'boolean') return json.following;
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
    return null;
  }

  async function resolveUserProfile(usernameInput, options = {}) {
    const cleanUsername = String(usernameInput || '').trim().replace(/^@/, '');
    const cookieUserId = getCookie('ds_user_id');
    const viewer = getLoggedInViewerFromDOM();
    const ignoreScanAbort = Boolean(options.forceLiveBio);

    if (!cleanUsername && cookieUserId) {
      return {
        id: String(cookieUserId),
        username: viewer?.username || 'aktif_hesap',
        fullName: '',
        profilePicUrl: '',
        followerCount: null,
        followingCount: null,
        mediaCount: null,
        isVerified: false,
        isPrivate: false,
        followedByViewer: null,
        biography: '',
        externalUrl: '',
      };
    }

    if (!cleanUsername) throw new Error('Geçerli bir kullanıcı adı girin.');

    const lower = cleanUsername.toLowerCase();
    const cached = !options.forceLiveBio ? state.profileDetailsCache.get(lower) : null;
    if (cached && cached.id && (!options.requireCounts || (cached.followerCount != null && cached.followingCount != null))) {
      return cached;
    }

    let candidate = null;

    // 1. ADIM (0 Ağ İsteği): Sayfa İçi DOM / Script JSON Taraması + Ekrandaki Sayaçlar
    const domProfile = extractStrictProfileFromScripts(cleanUsername);
    if (domProfile && domProfile.id) {
      const domCounts = extractVisibleCountsFromDOM(cleanUsername);
      if (domProfile.followerCount == null && domCounts?.followerCount != null) {
        domProfile.followerCount = domCounts.followerCount;
      }
      if (domProfile.followingCount == null && domCounts?.followingCount != null) {
        domProfile.followingCount = domCounts.followingCount;
      }
      candidate = domProfile;
      if (!options.forceLiveBio) {
        state.profileDetailsCache.set(lower, domProfile);
        return domProfile;
      }
    }

    // 2. ADIM (0 Ağ İsteği): Kendi Hesabımız veya Önbellekteki Hesap
    if (!options.forceLiveBio && !options.requireCounts) {
      if (viewer && viewer.id && viewer.username && viewer.username.toLowerCase() === lower) {
        const selfProfile = {
          id: String(viewer.id),
          username: viewer.username,
          fullName: '',
          profilePicUrl: '',
          followerCount: null,
          followingCount: null,
          mediaCount: null,
          isVerified: false,
          isPrivate: false,
          followedByViewer: null,
          biography: '',
          externalUrl: '',
        };
        state.profileDetailsCache.set(lower, selfProfile);
        return selfProfile;
      }

      if (state.userId && state.username && state.username.toLowerCase() === lower) {
        return {
          id: String(state.userId),
          username: state.username,
          fullName: '',
          profilePicUrl: '',
          followerCount: state.followers?.length || null,
          followingCount: state.following?.length || null,
          mediaCount: null,
          isVerified: false,
          isPrivate: false,
          followedByViewer: null,
          biography: '',
          externalUrl: '',
        };
      }
    }

    // 3. ADIM: Web Profile Info REST Uç Noktası (Gizli hesaplarda kesin takipçi/takip sayısı ve isPrivate verir)
    const webInfoProfile = await fetchProfileViaWebInfo(cleanUsername, ignoreScanAbort);
    if (webInfoProfile && webInfoProfile.id) {
      state.profileDetailsCache.set(lower, webInfoProfile);
      return webInfoProfile;
    }

    // 4. ADIM: ID elimizde varsa /api/v1/users/{id}/info/ ile sayıları ve gizlilik durumunu tamamla
    if (candidate && candidate.id) {
      const infoById = await fetchProfileViaUserInfoById(candidate.id, cleanUsername, ignoreScanAbort);
      if (infoById) {
        const merged = { ...candidate, ...infoById };
        state.profileDetailsCache.set(lower, merged);
        return merged;
      }
    }

    // 5. ADIM: GraphQL TIMELINE_DOC_ID
    try {
      const variables = {
        data: { count: 1, include_relationship_info: true },
        username: cleanUsername,
        __relay_internal__pv__PolarisFeedShareMenurelayprovider: false,
      };
      const gqlUrl = `https://www.instagram.com/graphql/query/?doc_id=${TIMELINE_DOC_ID}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      const res = await fetchWithRetry(gqlUrl, { _ignoreScanAbort: ignoreScanAbort }, 0);
      if (res && res.ok) {
        const json = await safeParseJson(res);
        const edges = json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges;
        const owner = edges?.[0]?.node?.user || edges?.[0]?.node?.owner;
        if (owner && (owner.pk || owner.id)) {
          const profile = {
            id: String(owner.pk || owner.id),
            username: owner.username || cleanUsername,
            fullName: owner.full_name || '',
            profilePicUrl: owner.profile_pic_url || '',
            followerCount: null,
            followingCount: null,
            mediaCount: null,
            isVerified: Boolean(owner.is_verified),
            isPrivate: Boolean(owner.is_private),
            followedByViewer: null,
            biography: '',
            externalUrl: '',
          };
          const enriched = await fetchProfileViaUserInfoById(profile.id, cleanUsername, ignoreScanAbort);
          const finalProfile = enriched ? { ...profile, ...enriched } : profile;
          state.profileDetailsCache.set(lower, finalProfile);
          if (!options.forceLiveBio) return finalProfile;
          candidate = finalProfile;
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    // 6. ADIM: Profil HTML Sayfasından JSON/ID Ayıklama
    try {
      const pageRes = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`, {
        credentials: 'include',
        signal: !ignoreScanAbort && state.isRunning && state.abortController ? state.abortController.signal : undefined,
      });
      if (pageRes && pageRes.ok) {
        const htmlText = await pageRes.text();
        const idMatch =
          htmlText.match(/"profilePage_(\d+)"/) ||
          htmlText.match(/profilePage_(\d+)/) ||
          htmlText.match(/"user_id"\s*:\s*"(\d+)"/) ||
          htmlText.match(/"pk"\s*:\s*"(\d+)"[^}]{0,200}"username"\s*:\s*"([^"]+)"/i);
        const fCountMatch = htmlText.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
        const flwCountMatch = htmlText.match(/"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
        const privMatch = htmlText.match(/"is_private"\s*:\s*(true|false)/);
        const bioMatch = htmlText.match(/"biography"\s*:\s*"([^"]*)"/);
        if (idMatch && idMatch[1]) {
          let parsedBio = '';
          if (bioMatch && bioMatch[1]) {
            try {
              parsedBio = JSON.parse(`"${bioMatch[1]}"`);
            } catch (_) {
              parsedBio = bioMatch[1];
            }
          }
          const profile = {
            id: String(idMatch[1]),
            username: cleanUsername,
            fullName: '',
            profilePicUrl: '',
            followerCount: fCountMatch ? Number(fCountMatch[1]) : null,
            followingCount: flwCountMatch ? Number(flwCountMatch[1]) : null,
            mediaCount: null,
            isVerified: false,
            isPrivate: privMatch ? privMatch[1] === 'true' : false,
            followedByViewer: null,
            biography: parsedBio,
            externalUrl: '',
          };
          const enriched =
            profile.followerCount == null || profile.followingCount == null
              ? await fetchProfileViaUserInfoById(profile.id, cleanUsername, ignoreScanAbort)
              : null;
          const finalProfile = enriched ? { ...profile, ...enriched } : profile;
          state.profileDetailsCache.set(lower, finalProfile);
          return finalProfile;
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }

    if (candidate && candidate.id) {
      state.profileDetailsCache.set(lower, candidate);
      return candidate;
    }

    throw new Error(`"@${cleanUsername}" profili çözümlenemedi. Kullanıcı adını kontrol edin veya "⚡ Kendi Hesabımı Tara" butonunu kullanın.`);
  }

  async function fetchUserFullDetails(userId, usernameHint = '') {
    if (usernameHint) {
      return resolveUserProfile(usernameHint, { forceLiveBio: true });
    }
    return null;
  }

  function addUserToMap(raw, sharedMap, seenUsernames) {
    if (!raw || typeof raw !== 'object') return false;
    const uid = String(raw.pk || raw.id || raw.pk_id || raw.strong_id__ || '').trim();
    const uname = String(raw.username || '').trim();
    const unameLow = uname.toLowerCase();
    if (!uid || !uname) return false;
    if (sharedMap.has(uid) || seenUsernames.has(unameLow)) return false;
    seenUsernames.add(unameLow);
    sharedMap.set(uid, {
      id: uid,
      username: uname,
      full_name: raw.full_name || '',
      profile_pic_url: raw.profile_pic_url_hd || raw.profile_pic_url || '',
      has_anonymous_profile_picture: Boolean(raw.has_anonymous_profile_picture),
      is_verified: Boolean(raw.is_verified),
      is_private: Boolean(raw.is_private),
      followOrderIndex: sharedMap.size,
    });
    return true;
  }

  function extractUsersFromRestPayload(data) {
    const out = [];
    if (Array.isArray(data?.users)) {
      out.push(...data.users);
    }
    if (Array.isArray(data?.groups)) {
      for (const g of data.groups) {
        if (Array.isArray(g?.users)) out.push(...g.users);
      }
    }
    return out;
  }

  // 1. YÖNTEM: REST API ile Takipçi / Takip Edilen Listesi Çekme (Canlı Güncellemeli + Gizli Hesap Uyumlu)
  async function fetchViaRestApi(userId, type, expectedTotal, progressStart, progressEnd, sharedMap, seenUsernames, onPageUpdate, passOpts = {}) {
    const visitedCursors = new Set();
    let maxId = '';
    let page = 0;
    let emptyPages = 0;
    let consecutiveZeroNew = 0;
    const pageSize = passOpts.count || (type === 'followers' ? REST_FOLLOWERS_PAGE_SIZE : REST_FOLLOWING_PAGE_SIZE);
    const useSurface = passOpts.useSurface ?? false;
    const useRankToken = Boolean(passOpts.useRankToken);
    const rankToken = useRankToken ? generateRankToken(userId) : '';
    const orderParam = passOpts.order ? `&order=${encodeURIComponent(passOpts.order)}` : '';
    const isSecondaryPass = Boolean(passOpts.isSecondary);

    while (true) {
      if (state.abortController?.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal) break;

      const surfaceParam = useSurface ? '&search_surface=follow_list_page' : '';
      const rankParam = rankToken ? `&rank_token=${encodeURIComponent(rankToken)}` : '';
      const url = `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(userId)}/${type}/?count=${pageSize}${surfaceParam}${orderParam}${rankParam}${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ''}`;
      const res = await fetchWithRetry(url, { _softRateLimit: state.apiMode === 'mobile' && page === 0 }, 1);
      if (!res || !res.ok) {
        throw new Error(`REST API ${type} hatası (${res?.status || 'Ağ'})`);
      }

      const data = await safeParseJson(res);
      if (!data || (data.status && data.status !== 'ok')) {
        throw new Error(`REST API ${type} geçersiz yanıt döndürdü (${data?.message || 'oturum doğrulaması gerekebilir'})`);
      }

      const users = extractUsersFromRestPayload(data);
      let addedNow = 0;
      for (const u of users) {
        if (addUserToMap(u, sharedMap, seenUsernames)) addedNow++;
      }

      if (users.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) break;
      } else {
        emptyPages = 0;
        if (isSecondaryPass) {
          if (addedNow === 0) {
            consecutiveZeroNew++;
            const zeroLimit = Math.max(15, Math.ceil(sharedMap.size / Math.max(1, pageSize)) + 4);
            if (consecutiveZeroNew >= zeroLimit) break;
          } else {
            consecutiveZeroNew = 0;
          }
        }
      }

      page++;
      const totalEst = expectedTotal && expectedTotal > 0 ? expectedTotal : Math.max(sharedMap.size + pageSize, 100);
      const ratio = Math.min(1, sharedMap.size / totalEst);
      const currentPct = Math.round(progressStart + ratio * (progressEnd - progressStart));
      updateProgress(currentPct);
      updateStatus(
        `${type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'} çekiliyor: ${sharedMap.size}${expectedTotal ? ` / ${expectedTotal}` : ''} (Sayfa ${page})`
      );

      if (typeof onPageUpdate === 'function') {
        onPageUpdate(Array.from(sharedMap.values()));
      }

      let nextCursor = data?.next_max_id != null && String(data.next_max_id) !== '' ? String(data.next_max_id) : '';
      if (!nextCursor && (data?.big_list === true || data?.has_more === true) && users.length > 0 && (maxId === '' || /^\d+$/.test(maxId))) {
        const nextNum = (maxId === '' ? 0 : Number(maxId)) + users.length;
        nextCursor = String(nextNum);
      }

      if (!nextCursor || visitedCursors.has(nextCursor) || page >= 500) break;
      visitedCursors.add(nextCursor);
      maxId = nextCursor;
      await sleep(getRateLimitDelay('scan'));
    }

    return Array.from(sharedMap.values());
  }

  // 2. YÖNTEM: GraphQL ile Takipçi / Takip Edilen Listesi Çekme (Canlı Güncellemeli)
  async function fetchViaGraphQL(userId, type, expectedTotal, progressStart, progressEnd, sharedMap, seenUsernames, onPageUpdate, useAltHash = false) {
    const visitedCursors = new Set();
    let afterCursor = null;
    let hasNextPage = true;
    let page = 0;
    const queryHash =
      type === 'followers'
        ? useAltHash
          ? FOLLOWERS_QUERY_HASH_ALT
          : FOLLOWERS_QUERY_HASH
        : useAltHash
        ? FOLLOWING_QUERY_HASH_ALT
        : FOLLOWING_QUERY_HASH;
    const edgeKey = type === 'followers' ? 'edge_followed_by' : 'edge_follow';

    while (hasNextPage) {
      if (state.abortController?.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal) break;

      const variables = {
        id: String(userId),
        include_reel: true,
        fetch_mutual: false,
        first: GQL_PAGE_SIZE,
        after: afterCursor,
      };
      const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      const res = await fetchWithRetry(url, {}, 1);
      if (!res || !res.ok) {
        throw new Error(`GraphQL ${type} hatası (${res?.status || 'Ağ'})`);
      }

      const json = await safeParseJson(res);
      const connection = json?.data?.user?.[edgeKey];
      if (!connection) break;

      if (typeof connection.count === 'number' && connection.count > 0) {
        expectedTotal = connection.count;
        if (type === 'followers') state.expectedFollowersCount = connection.count;
        if (type === 'following') state.expectedFollowingCount = connection.count;
      }

      const edges = Array.isArray(connection.edges) ? connection.edges : [];
      for (const edge of edges) {
        if (edge?.node) addUserToMap(edge.node, sharedMap, seenUsernames);
      }

      page++;
      const totalEst = connection.count || expectedTotal || Math.max(sharedMap.size + GQL_PAGE_SIZE, 100);
      const ratio = Math.min(1, sharedMap.size / totalEst);
      const currentPct = Math.round(progressStart + ratio * (progressEnd - progressStart));
      updateProgress(currentPct);
      updateStatus(
        `${type === 'followers' ? 'Takipçiler (GQL)' : 'Takip Edilenler (GQL)'}: ${sharedMap.size} / ${totalEst} (Sayfa ${page})`
      );

      if (typeof onPageUpdate === 'function') {
        onPageUpdate(Array.from(sharedMap.values()));
      }

      hasNextPage = Boolean(connection.page_info?.has_next_page);
      const nextCursor = connection.page_info?.end_cursor || null;
      if (!nextCursor || visitedCursors.has(nextCursor) || page >= 500) break;
      visitedCursors.add(nextCursor);
      afterCursor = nextCursor;
      await sleep(getRateLimitDelay('scan'));
    }

    return Array.from(sharedMap.values());
  }

  // 3. YÖNTEM: Takip Edilen (Gizli / Açık) Hesaplarda Eksik Kalanları 1-Harf + Doygun 2-Harf Arama Taramasıyla (?query=) Tamamlama
  async function fetchSingleQueryPrefix(userId, type, q, expectedTotal, sharedMap, seenUsernames, onPageUpdate) {
    let maxId = '';
    let page = 0;
    let totalMatched = 0;
    let totalAdded = 0;
    const visited = new Set();

    while (page < 4) {
      if (state.lastRateLimitError || state.abortController?.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal) {
        break;
      }

      const url = `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(userId)}/${type}/?count=50&query=${encodeURIComponent(q)}&search_surface=follow_list_page${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ''}`;
      const res = await fetchWithRetry(url, {}, 0);
      if (!res || !res.ok) break;

      const data = await safeParseJson(res);
      const users = extractUsersFromRestPayload(data);
      totalMatched += users.length;

      let addedNow = 0;
      for (const u of users) {
        if (addUserToMap(u, sharedMap, seenUsernames)) addedNow++;
      }
      if (addedNow > 0) {
        totalAdded += addedNow;
        if (typeof onPageUpdate === 'function') {
          onPageUpdate(Array.from(sharedMap.values()));
        }
      }

      page++;
      const nextCursor = data?.next_max_id != null && String(data.next_max_id) !== '' ? String(data.next_max_id) : '';
      if (!nextCursor || visited.has(nextCursor) || users.length === 0) break;
      visited.add(nextCursor);
      maxId = nextCursor;
      await sleep(Math.max(350, Math.round(getRateLimitDelay('scan') * 0.6)));
    }

    return { matched: totalMatched, added: totalAdded };
  }

  async function fetchViaQueryPrefixSweep(userId, type, expectedTotal, progressStart, progressEnd, sharedMap, seenUsernames, onPageUpdate) {
    const primaryChars = 'aeirnlkstmoudbychgpzvfwjxq0123456789_.çğıöşü'.split('');
    const secondChars = 'aeiournlkstmydbchgpzvfwjxq0123456789_.'.split('');
    const label = type === 'followers' ? 'Takipçiler' : 'Takip Edilenler';
    const cfg = SPEED_CONFIGS[state.speedMode] || SPEED_CONFIGS.safe;
    const concurrency = state.apiMode === 'mobile' ? 1 : Math.max(1, cfg.scanConcurrency || 2);
    let recoveredTotal = 0;
    const saturatedPrefixes = [];

    addLog(
      `🔎 ${label} eksik kaldı (${sharedMap.size}/${expectedTotal ?? '?'}). Hızlı 1-harf + 2-harf arama tamamlaması (x${concurrency} paralel) başlatılıyor...`,
      'info'
    );

    for (let i = 0; i < primaryChars.length; i += concurrency) {
      if (state.lastRateLimitError || state.abortController?.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal) {
        break;
      }

      const batch = primaryChars.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (q) => {
          try {
            const resInfo = await fetchSingleQueryPrefix(userId, type, q, expectedTotal, sharedMap, seenUsernames, onPageUpdate);
            return { q, ...resInfo };
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            return { q, matched: 0, added: 0 };
          }
        })
      );

      for (const r of results) {
        recoveredTotal += r.added;
        if (r.matched >= 18 && /^[a-z0-9]$/.test(r.q)) {
          saturatedPrefixes.push(r.q);
        }
      }

      const doneCount = Math.min(primaryChars.length, i + batch.length);
      const ratio = doneCount / primaryChars.length;
      const currentPct = Math.round(progressStart + ratio * Math.max(1, (progressEnd - progressStart) * 0.55));
      updateProgress(currentPct);
      updateStatus(
        `${label} eksikler tamamlanıyor ("${batch.join(',')}"): ${sharedMap.size}${expectedTotal ? ` / ${expectedTotal}` : ''} (+${recoveredTotal})`
      );

      if (doneCount < primaryChars.length && !(typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal)) {
        await sleep(Math.max(250, Math.round(getRateLimitDelay('scan') * 0.6)));
      }
    }

    // 2. Aşama: Hâlâ eksik varsa TÜM doygun harfler arasında dönüşümlü (round-robin) 2 karakterli derin arama yap
    const stillMissing =
      !state.lastRateLimitError &&
      saturatedPrefixes.length > 0 &&
      (expectedTotal == null || (typeof expectedTotal === 'number' && sharedMap.size < expectedTotal));

    if (stillMissing) {
      const deepQueue = [];
      for (const ch2 of secondChars) {
        for (const ch1 of saturatedPrefixes) {
          deepQueue.push(`${ch1}${ch2}`);
        }
      }
      const maxDeepQueries = Math.min(deepQueue.length, expectedTotal != null ? 300 : 150);
      addLog(
        `🔍 ${label} için ${saturatedPrefixes.length} doygun harfte hızlı 2 karakterli derin arama (en fazla ${maxDeepQueries} sorgu, x${concurrency} paralel)...`,
        'info'
      );

      let deepAdded = 0;
      let consecutiveEmptyDeep = 0;
      for (let i = 0; i < maxDeepQueries; i += concurrency) {
        if (state.lastRateLimitError || state.abortController?.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        if (typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal) {
          break;
        }

        const batch = deepQueue.slice(i, Math.min(maxDeepQueries, i + concurrency));
        const results = await Promise.all(
          batch.map(async (q2) => {
            try {
              const resInfo = await fetchSingleQueryPrefix(userId, type, q2, expectedTotal, sharedMap, seenUsernames, onPageUpdate);
              return { q2, ...resInfo };
            } catch (err) {
              if (err.name === 'AbortError') throw err;
              return { q2, matched: 0, added: 0 };
            }
          })
        );

        let batchAdded = 0;
        for (const r of results) {
          batchAdded += r.added;
        }
        if (batchAdded > 0) {
          recoveredTotal += batchAdded;
          deepAdded += batchAdded;
          consecutiveEmptyDeep = 0;
        } else {
          consecutiveEmptyDeep += batch.length;
        }

        const doneCount = Math.min(maxDeepQueries, i + batch.length);
        const ratio = doneCount / maxDeepQueries;
        const currentPct = Math.round(progressStart + (progressEnd - progressStart) * (0.55 + ratio * 0.45));
        updateProgress(currentPct);
        updateStatus(
          `${label} derin arama ("${batch.join(',')}"): ${sharedMap.size}${expectedTotal ? ` / ${expectedTotal}` : ''} (+${recoveredTotal})`
        );

        if (consecutiveEmptyDeep >= (expectedTotal == null ? 24 : 75)) break;
        if (doneCount < maxDeepQueries && !(typeof expectedTotal === 'number' && expectedTotal > 0 && sharedMap.size >= expectedTotal)) {
          await sleep(Math.max(250, Math.round(getRateLimitDelay('scan') * 0.6)));
        }
      }

      if (deepAdded > 0) {
        addLog(`✅ 2 karakterli derin arama ile +${deepAdded} ek ${label.toLowerCase()} kurtarıldı.`, 'success');
      }
    }

    if (recoveredTotal > 0) {
      addLog(`✅ Arama tamamlaması ile toplam +${recoveredTotal} eksik ${label.toLowerCase()} kurtarıldı (Toplam: ${sharedMap.size}/${expectedTotal ?? '?'}).`, 'success');
    }

    return Array.from(sharedMap.values());
  }

  // Akıllı Veri Çekme Motoru (REST -> İkincil REST -> GraphQL -> 1/2-Harfli Derin Arama Tamamlama)
  async function fetchFriendshipList(targetUserId, listType, countHint, startProgress, endProgress, onPageUpdate, options = {}) {
    const sharedMap = new Map();
    const seenUsernames = new Set();
    const isSelf = Boolean(options.isScanningSelf);
    const label = listType === 'followers' ? 'Takipçiler' : 'Takip Edilenler';

    const getExp = () =>
      listType === 'followers'
        ? state.expectedFollowersCount ?? countHint
        : state.expectedFollowingCount ?? countHint;

    const isMissing = () => {
      const exp = getExp();
      if (exp === 0) return false;
      if (sharedMap.size === 0) return true;
      if (typeof exp === 'number' && exp > 0) return sharedMap.size < exp;
      return true;
    };

    try {
      // 1. Geçiş: Kendi hesabımızda order=date_followed_latest çalışır; başka hesapta order ve rank_token GÖNDERİLMEZ
      await fetchViaRestApi(
        targetUserId,
        listType,
        getExp(),
        startProgress,
        endProgress,
        sharedMap,
        seenUsernames,
        onPageUpdate,
        {
          count: isSelf ? 24 : REST_FOLLOWERS_PAGE_SIZE,
          useSurface: !isSelf || listType === 'followers',
          useRankToken: false,
          order: isSelf && listType === 'following' ? 'date_followed_latest' : '',
        }
      );
      addLog(`📊 ${label} — REST Geçiş 1: ${sharedMap.size}${getExp() ? ` / ${getExp()}` : ''} kişi.`, 'info');

      // 2. Geçiş: Eksik kaldıysa alternatif REST geçişi
      const exp1 = getExp();
      if (!state.lastRateLimitError && (exp1 == null || sharedMap.size < exp1)) {
        const beforePass2 = sharedMap.size;
        if (isSelf && listType === 'following') {
          addLog(`ℹ️ Takip Edilenler ters sıradan (en eskiden) tamamlanıyor (${sharedMap.size}/${exp1 ?? '?'})...`, 'info');
          await fetchViaRestApi(
            targetUserId,
            listType,
            exp1,
            startProgress,
            endProgress,
            sharedMap,
            seenUsernames,
            onPageUpdate,
            { count: 24, useSurface: false, order: 'date_followed_earliest', isSecondary: true }
          );
          if (!state.lastRateLimitError && typeof exp1 === 'number' && sharedMap.size < exp1) {
            await fetchViaRestApi(
              targetUserId,
              listType,
              exp1,
              startProgress,
              endProgress,
              sharedMap,
              seenUsernames,
              onPageUpdate,
              { count: 12, useSurface: true, order: '', isSecondary: true }
            );
          }
        } else {
          addLog(
            `ℹ️ ${label} alternatif REST geçişiyle (count=50) tamamlanıyor (${sharedMap.size}/${exp1 ?? '?'})...`,
            'info'
          );
          await fetchViaRestApi(
            targetUserId,
            listType,
            exp1,
            startProgress,
            endProgress,
            sharedMap,
            seenUsernames,
            onPageUpdate,
            { count: 50, useSurface: false, useRankToken: false, order: '', isSecondary: true }
          );
        }
        if (sharedMap.size > beforePass2) {
          addLog(`📊 ${label} — REST Geçiş 2: +${sharedMap.size - beforePass2} yeni kişi (Toplam: ${sharedMap.size}).`, 'info');
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      addLog(`REST API (${listType}) yedek yönteme (GraphQL) geçiyor: ${err.message}`, 'warn');
    }

    // 3. Geçiş: Hâlâ eksik varsa veya toplam sayı bilinmiyorsa çift hash destekli GraphQL ile tamamla
    if (!state.lastRateLimitError && isMissing()) {
      const beforeGql = sharedMap.size;
      const expNow = getExp();
      if (beforeGql > 0) {
        addLog(`ℹ️ GraphQL (${listType}) ile eksikler tamamlanıyor (${beforeGql}/${expNow ?? '?'})...`, 'info');
      }
      try {
        await fetchViaGraphQL(targetUserId, listType, expNow, startProgress, endProgress, sharedMap, seenUsernames, onPageUpdate, false);
        if (!state.lastRateLimitError && isMissing()) {
          await fetchViaGraphQL(targetUserId, listType, getExp(), startProgress, endProgress, sharedMap, seenUsernames, onPageUpdate, true);
        }
        if (sharedMap.size > beforeGql) {
          addLog(`📊 ${label} — GraphQL: +${sharedMap.size - beforeGql} yeni kişi (Toplam: ${sharedMap.size}).`, 'info');
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (sharedMap.size === 0) throw err;
      }
    }

    // 4. Geçiş: Hem kendi hesabınızda hem başka hesaplarda REST ve GraphQL eksik kaldıysa (veya beklenen sayı bilinmiyorsa) 1-harf + 2-harf arama tamamlaması
    const expAfterGql = getExp();
    const shouldRunQuerySweep =
      !state.lastRateLimitError &&
      (expAfterGql == null || (typeof expAfterGql === 'number' && expAfterGql > 0 && sharedMap.size < expAfterGql));

    if (shouldRunQuerySweep) {
      try {
        await fetchViaQueryPrefixSweep(
          targetUserId,
          listType,
          expAfterGql,
          Math.max(startProgress, endProgress - 10),
          endProgress,
          sharedMap,
          seenUsernames,
          onPageUpdate
        );
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        addLog(`⚠️ Arama tamamlaması sırasında uyarı: ${err.message}`, 'warn');
      }
    }

    return Array.from(sharedMap.values());
  }

  // Etkileşim API Fonksiyonları (_ignoreScanAbort: true ile Durdur sonrası da çalışır)
  async function unfollowUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/destroy/${encodeURIComponent(userId)}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${encodeURIComponent(userId)}`,
      _ignoreScanAbort: true,
    }, 1);
    if (!res || !res.ok) {
      throw new Error(`HTTP ${res?.status || 'Hata'}`);
    }
    incrementTodayQuota();
    return (await safeParseJson(res)) || { status: 'ok' };
  }

  async function followUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/create/${encodeURIComponent(userId)}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${encodeURIComponent(userId)}`,
      _ignoreScanAbort: true,
    }, 1);
    if (!res || !res.ok) {
      throw new Error(`HTTP ${res?.status || 'Hata'}`);
    }
    incrementTodayQuota();
    return (await safeParseJson(res)) || { status: 'ok' };
  }

  async function removeFollowerUser(userId) {
    const url = `https://www.instagram.com/api/v1/friendships/remove_follower/${encodeURIComponent(userId)}/`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${encodeURIComponent(userId)}`,
      _ignoreScanAbort: true,
    }, 1);
    if (!res || !res.ok) {
      throw new Error(`HTTP ${res?.status || 'Hata'}`);
    }
    incrementTodayQuota();
    return (await safeParseJson(res)) || { status: 'ok' };
  }

  // ============================================================================
  // SON TAKİP KİŞİSİNİ ÇIKART MODÜLÜ
  // ============================================================================

  function getLastFollowedPerson() {
    return Array.isArray(state.following) && state.following.length > 0 ? state.following[0] : null;
  }

  function getLastFollowerPerson() {
    return Array.isArray(state.followers) && state.followers.length > 0 ? state.followers[0] : null;
  }

  async function unfollowLastFollowedPerson(targetUser = null) {
    const person = targetUser || getLastFollowedPerson();
    if (!person) {
      showToast('Önce hesabınızı tarayın veya takip edilen listesi boş!', 'error');
      return false;
    }

    if (isWhitelisted(person.id)) {
      showToast(`@${person.username} koruma listesinde (Whitelist)! Önce korumadan çıkarın.`, 'warning');
      return false;
    }

    try {
      updateStatus(`Son takip edilen kişi (@${person.username}) takipten çıkarılıyor...`);
      await unfollowUser(person.id);
      saveUnfollowHistory(person, 'unfollow_last');

      state.following = state.following.filter((u) => String(u.id) !== String(person.id));
      state.selectedIds.delete(String(person.id));
      computeCategories();
      saveLastScanCache();
      renderList();

      addLog(`✅ Son takip edilen kişi takipten çıkarıldı: @${person.username} (ID: ${person.id})`, 'success');
      updateStatus(`Son takip edilen kişi (@${person.username}) başarıyla takipten çıkarıldı.`);
      showToast(`@${person.username} takipten çıkarıldı!`, 'success');
      return true;
    } catch (err) {
      addLog(`❌ Son takip kişisi çıkarılamadı (@${person.username}): ${err.message}`, 'error');
      showToast(`Hata: @${person.username} çıkarılamadı (${err.message})`, 'error');
      return false;
    }
  }

  async function removeLastFollowerPerson(targetUser = null) {
    const person = targetUser || getLastFollowerPerson();
    if (!person) {
      showToast('Önce hesabınızı tarayın veya takipçi listesi boş!', 'error');
      return false;
    }

    if (isWhitelisted(person.id)) {
      showToast(`@${person.username} koruma listesinde (Whitelist)! Önce korumadan çıkarın.`, 'warning');
      return false;
    }

    try {
      updateStatus(`Son takipçi (@${person.username}) takipçilerden çıkarılıyor...`);
      await removeFollowerUser(person.id);
      saveUnfollowHistory(person, 'remove_last_follower');

      state.followers = state.followers.filter((u) => String(u.id) !== String(person.id));
      state.selectedIds.delete(String(person.id));
      computeCategories();
      saveLastScanCache();
      renderList();

      addLog(`✅ Son takipçi takipçilerden çıkarıldı: @${person.username} (ID: ${person.id})`, 'success');
      updateStatus(`Son takipçi (@${person.username}) takipçilerinizden çıkarıldı.`);
      showToast(`@${person.username} takipçilerden çıkarıldı!`, 'success');
      return true;
    } catch (err) {
      addLog(`❌ Son takipçi çıkarılamadı (@${person.username}): ${err.message}`, 'error');
      showToast(`Hata: @${person.username} çıkarılamadı (${err.message})`, 'error');
      return false;
    }
  }

  function closeAllSubModals() {
    document.querySelectorAll('.igfc-submodal-overlay').forEach((el) => el.remove());
  }

  function openLastFollowModal() {
    closeAllSubModals();

    const lastFollowed = getLastFollowedPerson();
    const lastFollower = getLastFollowerPerson();
    const recentFollowing = state.following.slice(0, 5);
    const recentFollowers = state.followers.slice(0, 5);

    const overlay = document.createElement('div');
    overlay.id = 'igfc-modal-overlay';
    overlay.className = 'igfc-submodal-overlay';

    const renderMiniPersonCard = (person, roleTitle, actionBtnId, actionBtnLabel, emptyText) => {
      if (!person) {
        return `
          <div class="igfc-last-person-box empty">
            <div class="igfc-last-person-role">${escapeHtml(roleTitle)}</div>
            <div class="igfc-last-person-empty">${escapeHtml(emptyText)}</div>
          </div>
        `;
      }
      const isProtected = isWhitelisted(person.id);
      return `
        <div class="igfc-last-person-box">
          <div class="igfc-last-person-role">${escapeHtml(roleTitle)}</div>
          <div class="igfc-last-person-row">
            <img id="${actionBtnId}-avatar" class="igfc-avatar" alt="@${escapeHtml(person.username)}" />
            <div class="igfc-last-person-meta">
              <a href="https://www.instagram.com/${encodeURIComponent(person.username)}/" target="_blank" rel="noopener noreferrer" class="igfc-username">
                @${escapeHtml(person.username)}
                ${person.is_verified ? '<span class="igfc-tag-verified" title="Onaylı Hesap">✓</span>' : ''}
                ${person.is_private ? '<span class="igfc-tag-private" title="Gizli Hesap">🔒</span>' : ''}
              </a>
              <div class="igfc-fullname">${escapeHtml(person.full_name || 'İsim belirtilmemiş')}</div>
              <div class="igfc-userid">ID: ${escapeHtml(person.id)} ${isProtected ? '• ★ Korunanlarda' : ''}</div>
            </div>
          </div>
          <div class="igfc-last-person-actions">
            <button id="${actionBtnId}" class="igfc-btn igfc-btn-danger" ${isProtected ? 'disabled title="Koruma listesindeki kullanıcı çıkarılamaz"' : ''}>
              ${escapeHtml(actionBtnLabel)}
            </button>
          </div>
        </div>
      `;
    };

    const renderRecentRows = (items, mode) => {
      if (!items.length) return '<div style="color:var(--text-secondary);font-size:12px;">Liste boş (önce tarama yapın).</div>';
      return items
        .map(
          (u, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;">
            <div style="min-width:0;">
              <strong>#${idx + 1}</strong>
              <a href="https://www.instagram.com/${encodeURIComponent(u.username)}/" target="_blank" rel="noopener noreferrer" class="igfc-username">@${escapeHtml(u.username)}</a>
              <span style="color:var(--text-secondary);font-size:11.5px;">${escapeHtml(u.full_name || '')}</span>
            </div>
            <button class="igfc-btn igfc-btn-danger igfc-recent-act-btn" data-mode="${mode}" data-uid="${escapeHtml(u.id)}" ${isWhitelisted(u.id) ? 'disabled' : ''}>
              ${mode === 'following' ? '🚫 Takipten Çık' : '❌ Takipçiden Çıkar'}
            </button>
          </div>
        `
        )
        .join('');
    };

    overlay.innerHTML = `
      <div class="igfc-submodal-card wide">
        <div class="igfc-submodal-header">
          <h3>🎯 Son Takip Kişisini Çıkart (Hızlı Modül)</h3>
          <button id="igfc-submodal-close" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <p class="igfc-submodal-desc">
            Instagram API sıralamasına göre <strong>en son takip ettiğiniz</strong> hesabı (#1) veya <strong>sizi en son takip eden</strong> hesabı (#1) tek tıkla çıkarabilirsiniz.
          </p>
          <div class="igfc-last-person-grid">
            ${renderMiniPersonCard(
              lastFollowed,
              '📤 En Son Takip Ettiğiniz Kişi (Following #1)',
              'igfc-modal-unfollow-last-btn',
              '🚫 Son Takip Edileni Takipten Çıkart',
              'Henüz tarama yapılmadı veya takip edilen kimse yok.'
            )}
            ${renderMiniPersonCard(
              lastFollower,
              '📥 Sizi En Son Takip Eden Kişi (Follower #1)',
              'igfc-modal-remove-last-follower-btn',
              '❌ Son Takipçiyi Takipçilerden Çıkart',
              'Henüz tarama yapılmadı veya takipçi listesi boş.'
            )}
          </div>

          <div class="igfc-last-person-grid" style="margin-top:14px;">
            <div class="igfc-last-person-box">
              <div class="igfc-last-person-role">📋 Son 5 Takip Ettiğiniz Kişi</div>
              <div style="display:flex;flex-direction:column;gap:6px;">${renderRecentRows(recentFollowing, 'following')}</div>
            </div>
            <div class="igfc-last-person-box">
              <div class="igfc-last-person-role">📋 Sizi Son Takip Eden 5 Kişi</div>
              <div style="display:flex;flex-direction:column;gap:6px;">${renderRecentRows(recentFollowers, 'follower')}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);

    if (lastFollowed) {
      hydrateAvatarImage(document.getElementById('igfc-modal-unfollow-last-btn-avatar'), lastFollowed);
    }
    if (lastFollower) {
      hydrateAvatarImage(document.getElementById('igfc-modal-remove-last-follower-btn-avatar'), lastFollower);
    }

    overlay.querySelector('#igfc-submodal-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#igfc-modal-unfollow-last-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Çıkarılıyor...';
      await unfollowLastFollowedPerson();
      if (document.body.contains(overlay)) openLastFollowModal();
    });

    overlay.querySelector('#igfc-modal-remove-last-follower-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Çıkarılıyor...';
      await removeLastFollowerPerson();
      if (document.body.contains(overlay)) openLastFollowModal();
    });

    overlay.querySelectorAll('.igfc-recent-act-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const mode = btn.dataset.mode;
        btn.disabled = true;
        btn.textContent = '⏳...';
        if (mode === 'following') {
          const target = state.following.find((u) => String(u.id) === String(uid));
          if (target) await unfollowLastFollowedPerson(target);
        } else {
          const target = state.followers.find((u) => String(u.id) === String(uid));
          if (target) await removeLastFollowerPerson(target);
        }
        if (document.body.contains(overlay)) openLastFollowModal();
      });
    });
  }

  // ============================================================================
  // ANLIK TAKİPÇİ GÖRÜNTÜSÜ (SNAPSHOT) KARŞILAŞTIRMA & KAYDETME
  // ============================================================================

  function compareAndSaveSnapshot(userId, currentFollowers, currentFollowing = []) {
    try {
      const raw = localStorage.getItem(STORAGE_SNAPSHOT);
      const allSnapshots = raw ? JSON.parse(raw) : {};
      const prev = allSnapshots[userId];

      if (prev && Array.isArray(prev.followers)) {
        const currentIds = new Set(currentFollowers.map((u) => String(u.id)));
        const prevIds = new Set(prev.followers.map((u) => String(u.id)));
        state.lostFollowers = prev.followers.filter((u) => !currentIds.has(String(u.id)));
        state.newFollowers = currentFollowers.filter((u) => !prevIds.has(String(u.id)));
      } else {
        state.lostFollowers = [];
        state.newFollowers = [];
      }

      if (prev && Array.isArray(prev.following) && Array.isArray(currentFollowing)) {
        const curFlwingIds = new Set(currentFollowing.map((u) => String(u.id)));
        const prevFlwingIds = new Set(prev.following.map((u) => String(u.id)));
        state.lostFollowing = prev.following.filter((u) => !curFlwingIds.has(String(u.id)));
        state.newFollowing = currentFollowing.filter((u) => !prevFlwingIds.has(String(u.id)));
      } else {
        state.lostFollowing = [];
        state.newFollowing = [];
      }

      const compact = (u) => ({
        id: String(u.id),
        username: u.username,
        full_name: u.full_name || '',
        profile_pic_url: u.profile_pic_url || '',
        is_verified: Boolean(u.is_verified),
        is_private: Boolean(u.is_private),
      });

      allSnapshots[userId] = {
        updatedAt: new Date().toISOString(),
        followers: currentFollowers.map(compact),
        following: Array.isArray(currentFollowing) ? currentFollowing.map(compact) : [],
      };
      safeSetItem(STORAGE_SNAPSHOT, JSON.stringify(allSnapshots));
    } catch (_) {}
  }

  // ============================================================================
  // TÜM ALT MODALLAR (DETAY, SÜRÜM GEÇMİŞİ, ANALİZ, KARŞILAŞTIRMA, AYARLAR)
  // ============================================================================

  function closeUserDetailModal() {
    document.getElementById('igfc-user-detail-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  async function openUserDetailModal(user) {
    closeAllSubModals();

    const followerIds = new Set(state.followers.map((u) => String(u.id)));
    const followingIds = new Set(state.following.map((u) => String(u.id)));
    const uid = String(user.id);
    const followsYou = followerIds.has(uid);
    const youFollow = followingIds.has(uid);
    const isProtected = isWhitelisted(uid);

    let relationLabel = 'Takipleşmiyorsunuz';
    if (followsYou && youFollow) relationLabel = '🤝 Karşılıklı Takipleşiyorsunuz';
    else if (youFollow && !followsYou) relationLabel = '🚫 Sen Takip Ediyorsun, O Seni Takip Etmiyor';
    else if (!youFollow && followsYou) relationLabel = '💙 O Seni Takip Ediyor, Sen Takip Etmiyorsun';

    const susp = computeSuspicionInfo(user, youFollow && !followsYou);
    const currentNote = getUserNote(uid);

    const overlay = document.createElement('div');
    overlay.id = 'igfc-modal-overlay';
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-user-detail-modal" class="igfc-submodal-card">
        <div class="igfc-submodal-header">
          <h3>👤 Canlı Profil İnceleme: @${escapeHtml(user.username)}</h3>
          <button id="igfc-modal-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div class="igfc-detail-top">
            <img id="igfc-detail-avatar" class="igfc-detail-avatar" alt="@${escapeHtml(user.username)}" />
            <div class="igfc-detail-meta">
              <div class="igfc-detail-uname">
                <a href="https://www.instagram.com/${encodeURIComponent(user.username)}/" target="_blank" rel="noopener noreferrer" class="igfc-username">@${escapeHtml(user.username)}</a>
                ${user.is_verified ? '<span class="igfc-tag-verified">✓ Onaylı</span>' : ''}
                ${user.is_private ? '<span class="igfc-tag-private">🔒 Gizli</span>' : ''}
              </div>
              <div class="igfc-detail-fname">${escapeHtml(user.full_name || 'İsim belirtilmemiş')}</div>
              <div class="igfc-detail-id">Instagram User ID: ${escapeHtml(uid)}</div>
              <div class="igfc-detail-rel">${relationLabel}</div>
            </div>
          </div>

          <div id="igfc-detail-live-stats" class="igfc-detail-stats">
            <div class="igfc-detail-stat"><span>Takipçi</span><strong id="igfc-d-followers">...</strong></div>
            <div class="igfc-detail-stat"><span>Takip</span><strong id="igfc-d-following">...</strong></div>
            <div class="igfc-detail-stat"><span>Gönderi</span><strong id="igfc-d-media">...</strong></div>
            <div class="igfc-detail-stat"><span>Şüphe Skoru</span><strong>%${susp.score}</strong></div>
          </div>

          <div id="igfc-detail-bio" class="igfc-detail-bio">Canlı profil biyografisi yükleniyor...</div>

          ${
            susp.reasons.length > 0
              ? `<div class="igfc-detail-reasons"><strong>Şüphe Sebepleri:</strong> ${susp.reasons.map(escapeHtml).join(', ')}</div>`
              : ''
          }

          <div class="igfc-detail-note-box" style="margin-top:12px;">
            <label for="igfc-user-note-input">📝 Özel Kullanıcı Notu:</label>
            <textarea id="igfc-user-note-input" rows="2" class="igfc-textarea" placeholder="Bu hesap hakkında özel not ekleyin...">${escapeHtml(currentNote)}</textarea>
            <div class="igfc-tools-btn-row" style="margin-top:8px;">
              <button id="igfc-save-note-btn" class="igfc-btn igfc-btn-primary">💾 Notu Kaydet</button>
              <button id="igfc-modal-whitelist-btn" class="igfc-btn ${isProtected ? 'igfc-btn-warning' : 'igfc-btn-secondary'}">
                ${isProtected ? '★ Korumadan Çıkar' : '☆ Koruma Listesine Ekle'}
              </button>
              ${
                youFollow
                  ? `<button id="igfc-modal-unfollow-btn" class="igfc-btn igfc-btn-danger" ${isProtected ? 'disabled' : ''}>🚫 Takipten Çık</button>`
                  : `<button id="igfc-modal-follow-btn" class="igfc-btn igfc-btn-success">➕ Takip Et</button>`
              }
              ${
                followsYou
                  ? `<button id="igfc-modal-remove-follower-btn" class="igfc-btn igfc-btn-warning" ${isProtected ? 'disabled' : ''}>❌ Takipçilerden Çıkar</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);
    hydrateAvatarImage(document.getElementById('igfc-detail-avatar'), user);

    overlay.querySelector('#igfc-modal-close-btn')?.addEventListener('click', closeUserDetailModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeUserDetailModal();
    });

    overlay.querySelector('#igfc-save-note-btn')?.addEventListener('click', () => {
      const val = overlay.querySelector('#igfc-user-note-input')?.value || '';
      setUserNote(uid, val);
      renderList();
      showToast('Kullanıcı notu kaydedildi.', 'success');
    });

    overlay.querySelector('#igfc-modal-whitelist-btn')?.addEventListener('click', () => {
      toggleWhitelist(uid);
      renderList();
      openUserDetailModal(user);
    });

    overlay.querySelector('#igfc-modal-unfollow-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Çıkarılıyor...';
      try {
        await unfollowUser(uid);
        saveUnfollowHistory(user, 'unfollow');
        state.following = state.following.filter((item) => String(item.id) !== uid);
        state.selectedIds.delete(uid);
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${user.username} takipten çıkarıldı.`, 'success');
        closeUserDetailModal();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '🚫 Takipten Çık';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    overlay.querySelector('#igfc-modal-follow-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Takip Ediliyor...';
      try {
        await followUser(uid);
        saveUnfollowHistory(user, 'follow');
        if (!state.following.some((item) => String(item.id) === uid)) {
          state.following.unshift(user);
        }
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${user.username} takip edildi.`, 'success');
        closeUserDetailModal();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '➕ Takip Et';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    overlay.querySelector('#igfc-modal-remove-follower-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Çıkarılıyor...';
      try {
        await removeFollowerUser(uid);
        saveUnfollowHistory(user, 'remove_follower');
        state.followers = state.followers.filter((item) => String(item.id) !== uid);
        state.selectedIds.delete(uid);
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${user.username} takipçilerden çıkarıldı.`, 'success');
        closeUserDetailModal();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '❌ Takipçilerden Çıkar';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    try {
      const live = await fetchUserFullDetails(uid, user.username);
      const fEl = document.getElementById('igfc-d-followers');
      const flEl = document.getElementById('igfc-d-following');
      const mEl = document.getElementById('igfc-d-media');
      const bioEl = document.getElementById('igfc-detail-bio');
      if (fEl) fEl.textContent = live?.followerCount != null ? live.followerCount.toLocaleString('tr-TR') : '-';
      if (flEl) flEl.textContent = live?.followingCount != null ? live.followingCount.toLocaleString('tr-TR') : '-';
      if (mEl) mEl.textContent = live?.mediaCount != null ? live.mediaCount.toLocaleString('tr-TR') : '-';
      if (bioEl) {
        bioEl.innerHTML = live?.biography
          ? `${escapeHtml(live.biography)}${live.externalUrl ? `<br><a href="${escapeHtml(live.externalUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(live.externalUrl)}</a>` : ''}`
          : '<em>Biyografi bulunmuyor veya gizli.</em>';
      }
    } catch (_) {
      const bioEl = document.getElementById('igfc-detail-bio');
      if (bioEl) bioEl.textContent = 'Canlı detay bilgisi şu an alınamadı.';
    }
  }

  function closeChangelogModal() {
    document.getElementById('igfc-changelog-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  function openChangelogModal() {
    closeAllSubModals();

    const overlay = document.createElement('div');
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-changelog-modal" class="igfc-submodal-card">
        <div class="igfc-submodal-header">
          <h3>🚀 Sürüm Geçmişi (v10.22 Pro Ultimate)</h3>
          <button id="igfc-changelog-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <ul class="igfc-changelog-list">
            <li><strong>v10.22 Pro:</strong> Takip edilenlerdeki değişiklik takibi eklendi: artık taramalar arasında ve Karşılaştır aracında <strong>Takipten Çıkardıkları</strong> (<code>lostFollowing</code>) ve <strong>Yeni Takip Ettikleri</strong> (<code>newFollowing</code>) otomatik olarak tespit edilip ayrı sekmelerde gösteriliyor.</li>
            <li><strong>v10.21 Pro:</strong> Beklenen takipçi/takip sayısı bilindiğinde son 1–5 eksik kişiyi de yakalamak için derin arama limiti 300'e, boş seri eşiği 75'e çıkarıldı (hedef sayıya ulaşıldığı milisaniyede anında durur).</li>
            <li><strong>v10.20 Pro:</strong> Harici Python köprüsü kaldırıldı; tek <code>.js</code> dosyası içinde Web 429 algılandığında otomatik uyarı verip doğrudan <strong>📱 Mobil Mod</strong>'a (Tampermonkey'de <code>i.instagram.com</code> CORS-free mobil uç noktası, konsolda Mobil Web + GraphQL yedeği) geçen tek parça yapıya geçildi.</li>
            <li><strong>v10.19 Pro:</strong> Yerel PC Mobil API Köprüsü (<code>ig_mobile_bridge.py</code>, <code>http://127.0.0.1:8765</code>) desteği eklendi: Web 429 algılandığında köprü açıksa otomatik olarak mobil uygulama API'sine geçip verileri çekiyor ve <strong>📱 Mobil Köprü Aktif</strong> olarak gösteriyor.</li>
            <li><strong>v10.18 Pro:</strong> Web API'de HTTP 429 algılandığında taramayı hemen kesmek yerine otomatik <strong>📱 Mobil Web Modu</strong>'na (Mobil Web App ID + tekli güvenli tempo + GraphQL yedeği) geçiş ve üst çubukta görünür <code>📱 Mobil Mod</code> göstergesi eklendi.</li>
            <li><strong>v10.17 Pro:</strong> Uygulama içine <strong>📲 Kurulum / Mobil</strong> merkezi eklendi: tek tıkla <code>.user.js</code> dosyası indirme, Tampermonkey/Mobil kodunu panoya kopyalama, GitHub tek tık kurulum bağlantısı ve PC/Android/iOS kurulum adımları artık doğrudan panel içinden yapılabiliyor.</li>
            <li><strong>v10.16 Pro:</strong> Tampermonkey / Violentmonkey için <code>==UserScript==</code> başlığı, mobil tarayıcılar (Kiwi, Mises, Firefox Android) için tam ekran duyarlı arayüz, dokunmatik kaydırılabilir sekmeler ve yüzen başlatıcı buton eklendi.</li>
            <li><strong>v10.15 Pro:</strong> Profil üstündeki takipçi/takip sayılarının (<code>446 takipçi / 580 takip</code>) DOM'dan okunamaması (? görünmesi) ve bu yüzden hedefe ulaşıldıktan sonra gereksiz derin arama yapılıp HTTP 429'a düşülmesi giderildi; derin arama kotası 429 korumalı hale getirildi.</li>
            <li><strong>v10.14 Pro:</strong> Başka hesap tarandığında üst kart ve sekme başlıkları dinamik olarak değişiyor (Onu Takip Etmeyen / Onun Takip Etmediği / Hesabın Takipçileri / Takip Ettikleri), REST 2. geçişteki erken durma hatası düzeltildi ve paralel arama gruplarıyla tarama 2–3 kat hızlandırıldı.</li>
            <li><strong>v10.13 Pro:</strong> Kendi hesabınızda beklenen sayı DOM'da bulunamadığında (ör. ana sayfadan veya başka profilden tarama başlatıldığında) derin arama tamamlamasının atlanması sorunu giderildi; kendi hesabınızda da beklenen sayılar otomatik alınıp eksikler tamamlanıyor.</li>
            <li><strong>v10.12 Pro:</strong> 1-harf + 2-harf derin arama tamamlama motoru artık kendi hesabınızda eksik kaldığında da otomatik devreye giriyor.</li>
            <li><strong>v10.11 Pro:</strong> Gizli hesaplarda kalan son birkaç eksik hesabı da yakalamak için Türkçe karakterler (<code>ç, ğ, ı, ö, ş, ü</code>) eklendi, doygunluk eşiği 40'tan 25'e düşürüldü ve tüm doygun harfler arasında dönüşümlü (round-robin) 2 karakterli derin arama eklendi.</li>
            <li><strong>v10.10 Pro:</strong> Tarama başında anında 429/404 hatasına yol açan <code>/api/v1/users/{id}/info/</code> çağrısı kaldırıldı; profil ID ve sayıları önce 0 ağ isteğiyle DOM'dan alınıyor, isteğe bağlı profil bilgi çağrıları artık taramayı durdurmuyor.</li>
            <li><strong>v10.9 Pro:</strong> Takip edilen tüm (gizli ve açık) hesaplarda eksik veri gelmesini gidermek için geçersiz <code>rank_token</code> kaldırıldı, dinamik <code>X-IG-WWW-Claim</code> yenileme eklendi, Türkçe/İngilizce kısaltılmış sayaç (<code>1,2 B</code> / <code>1.2K</code>) ayrıştırması eklendi ve kırpılan listeler için <code>next_max_id</code> sayfalamalı + doygun harflerde otomatik 2 harfli derin <code>?query=</code> tamamlama motoru eklendi.</li>
            <li><strong>v10.8 Pro:</strong> Takip edilen gizli hesaplarda eksik veri gelme sorunu düzeltildi: geçersiz <code>order=date_followed_*</code> parametresi başka hesaplarda devre dışı bırakıldı, <code>X-IG-WWW-Claim</code> &amp; <code>X-ASBD-ID</code> başlıkları ve <code>rank_token</code> eklendi, profil sayıları kesinleştirildi ve kırpılan listeler için otomatik <code>?query=a..z,0..9</code> tamamlama motoru eklendi.</li>
            <li><strong>v10.7 Pro:</strong> Başka profil tararken kendi hesabını tarama hatası düzeltildi, Durdur sonrası AbortError kilitlenmesi giderildi, HTTP 429'da anında durdurma + hata şeridi eklendi, O(N) hızlı liste çizimi ve sayfalama eklendi.</li>
            <li><strong>v10.2 Pro:</strong> 429 hız sınırı koruması, Son Takip Kişisini Çıkart sihirbazı, Karşılaştırma Modalı ve Ayarlar Modalı tamamlandı.</li>
          </ul>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);
    overlay.querySelector('#igfc-changelog-close-btn')?.addEventListener('click', closeChangelogModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeChangelogModal();
    });
  }

  function closeAnalyticsModal() {
    document.getElementById('igfc-analytics-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  function openAnalyticsModal() {
    closeAllSubModals();

    const flwCount = state.followers.length;
    const flwingCount = state.following.length;
    const ratio = flwingCount > 0 ? (flwCount / flwingCount).toFixed(2) : '0.00';
    const mutualRate = flwingCount > 0 ? Math.round((state.mutuals.length / flwingCount) * 100) : 0;
    const nonFollowRate = flwingCount > 0 ? Math.round((state.nonFollowers.length / flwingCount) * 100) : 0;
    const health = computeAccountHealth();

    const overlay = document.createElement('div');
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-analytics-modal" class="igfc-submodal-card wide">
        <div class="igfc-submodal-header">
          <h3>🛠 Hesap Analizi, Akıllı Temizlik & Koruma Araçları</h3>
          <button id="igfc-analytics-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div class="igfc-detail-stats">
            <div class="igfc-detail-stat"><span>Hesap Sağlık Puanı</span><strong style="color:#10b981;">${health.score}/100 (${health.grade})</strong></div>
            <div class="igfc-detail-stat"><span>Takipçi / Takip Oranı</span><strong>${ratio}x</strong></div>
            <div class="igfc-detail-stat"><span>Karşılıklı Sadakat Oranı</span><strong>%${mutualRate} (${state.mutuals.length})</strong></div>
            <div class="igfc-detail-stat"><span>Geri Takip Etmeyen Oranı</span><strong>%${nonFollowRate} (${state.nonFollowers.length})</strong></div>
            <div class="igfc-detail-stat"><span>Şüpheli / İnaktif Hesap</span><strong>${state.suspicious.length}</strong></div>
          </div>

          <div class="igfc-tools-section" style="background:var(--bg-secondary);padding:12px;border-radius:10px;border:1px solid var(--border);">
            <h4>📊 Görsel Takip Dağılım Grafiği</h4>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;">
              <div>
                <div style="display:flex;justify-content:space-between;"><span>🤝 Karşılıklı Takip (${state.mutuals.length})</span><strong>%${mutualRate}</strong></div>
                <div style="height:8px;background:var(--bg-tertiary);border-radius:999px;overflow:hidden;margin-top:3px;">
                  <div style="height:100%;width:${mutualRate}%;background:#10b981;"></div>
                </div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;"><span>🚫 Geri Takip Etmeyenler (${state.nonFollowers.length})</span><strong>%${nonFollowRate}</strong></div>
                <div style="height:8px;background:var(--bg-tertiary);border-radius:999px;overflow:hidden;margin-top:3px;">
                  <div style="height:100%;width:${nonFollowRate}%;background:#ef4444;"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="igfc-tools-section">
            <h4>⚡ Tek Tıkla Hızlı İşlem & Temizlik Sihirbazları</h4>
            <div class="igfc-tools-btn-row">
              <button id="igfc-tool-unfollow-last-btn" class="igfc-btn igfc-btn-danger">🎯 Son Takip Edilen Kişiyi Çıkart</button>
              <button id="igfc-tool-remove-last-follower-btn" class="igfc-btn igfc-btn-warning">❌ Son Takipçiyi Çıkart</button>
              <button id="igfc-safe-clean-wizard-btn" class="igfc-btn igfc-btn-primary">🧹 Tek Tıkla Güvenli Temizlik Sihirbazı</button>
              <button id="igfc-select-notfollowing-btn" class="igfc-btn igfc-btn-secondary">🚫 Geri Takip Etmeyenleri Toplu Seç</button>
              <button id="igfc-select-suspicious-btn" class="igfc-btn igfc-btn-secondary">👻 Şüpheli Hesapları Toplu Seç</button>
              <button id="igfc-compare-btn" class="igfc-btn igfc-btn-secondary">🔀 Geçmiş Taramaları Karşılaştır</button>
            </div>
          </div>

          <div class="igfc-tools-section">
            <h4>★ Toplu Kullanıcı Adı ile Koruma (Whitelist) Ekleme</h4>
            <div class="igfc-tools-inline">
              <input id="igfc-wl-usernames-input" type="text" class="igfc-input" style="flex:1;" placeholder="kullanici1, kullanici2, @kullanici3..." />
              <button id="igfc-wl-usernames-btn" class="igfc-btn igfc-btn-primary">Kullanıcı Adı İle Ekle</button>
              <button id="igfc-clear-wl-btn" class="igfc-btn igfc-btn-danger">Koruma Listesini Sıfırla</button>
            </div>
          </div>

          <div class="igfc-tools-section">
            <h4>📦 Koruma Listesi JSON Yedekleme / İçe Aktarma</h4>
            <textarea id="igfc-wl-textarea" rows="3" class="igfc-textarea">${escapeHtml(JSON.stringify([...state.whitelist]))}</textarea>
            <div class="igfc-tools-btn-row">
              <button id="igfc-wl-save-btn" class="igfc-btn igfc-btn-primary">JSON Formatında Kaydet</button>
              <button id="igfc-wl-copy-btn" class="igfc-btn igfc-btn-secondary">Koruma Listesini Kopyala</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);

    overlay.querySelector('#igfc-analytics-close-btn')?.addEventListener('click', closeAnalyticsModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAnalyticsModal();
    });

    overlay.querySelector('#igfc-tool-unfollow-last-btn')?.addEventListener('click', async () => {
      closeAnalyticsModal();
      await unfollowLastFollowedPerson();
    });

    overlay.querySelector('#igfc-tool-remove-last-follower-btn')?.addEventListener('click', async () => {
      closeAnalyticsModal();
      await removeLastFollowerPerson();
    });

    overlay.querySelector('#igfc-safe-clean-wizard-btn')?.addEventListener('click', () => {
      closeAnalyticsModal();
      switchTab('nonFollowers');
      state.selectedIds.clear();
      const candidates = state.nonFollowers.filter((u) => !u.is_verified && !isWhitelisted(u.id)).slice(0, 25);
      candidates.forEach((u) => state.selectedIds.add(String(u.id)));
      renderList();
      updateBulkButtons();
      showToast(`Güvenli temizlik için ${candidates.length} onaylanmamış geri takip etmeyen hesap seçildi.`, 'info');
    });

    overlay.querySelector('#igfc-select-notfollowing-btn')?.addEventListener('click', () => {
      closeAnalyticsModal();
      switchTab('nonFollowers');
      state.nonFollowers.forEach((u) => {
        if (!isWhitelisted(u.id)) state.selectedIds.add(String(u.id));
      });
      renderList();
      updateBulkButtons();
    });

    overlay.querySelector('#igfc-select-suspicious-btn')?.addEventListener('click', () => {
      closeAnalyticsModal();
      switchTab('suspicious');
      state.suspicious.forEach((u) => {
        if (!isWhitelisted(u.id)) state.selectedIds.add(String(u.id));
      });
      renderList();
      updateBulkButtons();
    });

    overlay.querySelector('#igfc-compare-btn')?.addEventListener('click', () => {
      closeAnalyticsModal();
      openCompareModal();
    });

    overlay.querySelector('#igfc-wl-usernames-btn')?.addEventListener('click', () => {
      const raw = overlay.querySelector('#igfc-wl-usernames-input')?.value || '';
      const names = raw
        .split(/[\s,;]+/)
        .map((s) => s.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean);
      if (!names.length) return;

      const allKnown = [...state.following, ...state.followers];
      let added = 0;
      for (const uname of names) {
        const match = allKnown.find((u) => (u.username || '').toLowerCase() === uname);
        if (match) {
          state.whitelist.add(String(match.id));
          added++;
        }
      }
      saveWhitelist();
      const ta = overlay.querySelector('#igfc-wl-textarea');
      if (ta) ta.value = JSON.stringify([...state.whitelist]);
      updateStatsUI();
      renderList();
      showToast(`${added} kullanıcı koruma listesine eklendi.`, 'success');
    });

    overlay.querySelector('#igfc-clear-wl-btn')?.addEventListener('click', () => {
      state.whitelist.clear();
      saveWhitelist();
      const ta = overlay.querySelector('#igfc-wl-textarea');
      if (ta) ta.value = '[]';
      updateStatsUI();
      renderList();
      showToast('Koruma listesi sıfırlandı.', 'info');
    });

    overlay.querySelector('#igfc-wl-save-btn')?.addEventListener('click', () => {
      try {
        const arr = JSON.parse(overlay.querySelector('#igfc-wl-textarea')?.value || '[]');
        if (!Array.isArray(arr)) throw new Error('Dizi değil');
        saveWhitelist(arr);
        updateStatsUI();
        renderList();
        showToast('Koruma listesi güncellendi.', 'success');
      } catch (_) {
        showToast('Geçersiz JSON formatı!', 'error');
      }
    });

    overlay.querySelector('#igfc-wl-copy-btn')?.addEventListener('click', async () => {
      await copyTextSafe(JSON.stringify([...state.whitelist]));
      showToast('Koruma listesi panoya kopyalandı.', 'success');
    });
  }

  function closeCompareModal() {
    document.getElementById('igfc-compare-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  function openCompareModal() {
    closeAllSubModals();
    getScanHistory();

    const historyOptions = state.scanHistory
      .map((h, i) => {
        const dt = new Date(h.timestamp).toLocaleString('tr-TR');
        return `<option value="${i}">@${escapeHtml(h.username)} — ${escapeHtml(dt)} (Takipçi: ${h.followersCount}, Takip: ${h.followingCount})</option>`;
      })
      .join('');

    const overlay = document.createElement('div');
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-compare-modal" class="igfc-submodal-card wide">
        <div class="igfc-submodal-header">
          <h3>🔀 Tarama Geçmişi & JSON Karşılaştırma Aracı</h3>
          <button id="igfc-compare-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <p class="igfc-submodal-desc">
            Mevcut taramanızı daha önce kaydedilmiş bir tarama geçmişiyle veya dışa aktardığınız bir JSON raporuyla karşılaştırarak takipten çıkanları ve yeni gelenleri tespit edin.
          </p>

          <div class="igfc-tools-section">
            <h4>1. Kayıtlı Tarama Geçmişinden Seç</h4>
            <div class="igfc-tools-inline">
              <select id="igfc-compare-history-select" class="igfc-select" style="flex:1;">
                ${historyOptions || '<option value="">Kayıtlı geçmiş tarama bulunamadı</option>'}
              </select>
              <button id="igfc-run-compare-btn" class="igfc-btn igfc-btn-primary" ${state.scanHistory.length === 0 ? 'disabled' : ''}>🔍 Geçmiş İle Karşılaştır</button>
              <button id="igfc-clear-history-btn" class="igfc-btn igfc-btn-danger">🗑 Geçmişi Sil</button>
            </div>
          </div>

          <div class="igfc-tools-section">
            <h4>2. Veya Eski JSON Raporunu Yapıştırıp Karşılaştır</h4>
            <textarea id="igfc-compare-json-input" rows="4" class="igfc-textarea" placeholder='Daha önce indirdiğiniz JSON içeriğini buraya yapıştırın ({"followers": [...]})...'></textarea>
            <div class="igfc-tools-btn-row">
              <button id="igfc-run-json-compare-btn" class="igfc-btn igfc-btn-primary">📊 JSON Verisi İle Karşılaştır</button>
            </div>
          </div>

          <div id="igfc-compare-results" style="margin-top:12px;"></div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);

    overlay.querySelector('#igfc-compare-close-btn')?.addEventListener('click', closeCompareModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCompareModal();
    });

    const applyComparison = (oldFollowers, oldFollowing = null) => {
      if (!Array.isArray(oldFollowers)) {
        showToast('Geçerli bir takipçi listesi bulunamadı!', 'error');
        return;
      }
      const currentIds = new Set(state.followers.map((u) => String(u.id)));
      const oldIds = new Set(oldFollowers.map((u) => String(u.id)));

      state.lostFollowers = oldFollowers.filter((u) => !currentIds.has(String(u.id)));
      state.newFollowers = state.followers.filter((u) => !oldIds.has(String(u.id)));

      if (Array.isArray(oldFollowing)) {
        const curFlwingIds = new Set(state.following.map((u) => String(u.id)));
        const oldFlwingIds = new Set(oldFollowing.map((u) => String(u.id)));
        state.lostFollowing = oldFollowing.filter((u) => !curFlwingIds.has(String(u.id)));
        state.newFollowing = state.following.filter((u) => !oldFlwingIds.has(String(u.id)));
      }

      updateStatsUI();
      saveLastScanCache();

      const resBox = document.getElementById('igfc-compare-results');
      if (resBox) {
        resBox.innerHTML = `
          <div class="igfc-detail-stats">
            <div class="igfc-detail-stat"><span>📉 Takipten Çıkanlar</span><strong>${state.lostFollowers.length} kişi</strong></div>
            <div class="igfc-detail-stat"><span>📈 Yeni Gelen Takipçiler</span><strong>${state.newFollowers.length} kişi</strong></div>
            <div class="igfc-detail-stat"><span>➖ Takipten Çıkardıkları</span><strong>${state.lostFollowing.length} kişi</strong></div>
            <div class="igfc-detail-stat"><span>➕ Yeni Takip Ettikleri</span><strong>${state.newFollowing.length} kişi</strong></div>
          </div>
          <div class="igfc-tools-btn-row">
            <button id="igfc-goto-lost-btn" class="igfc-btn igfc-btn-danger">📉 Yeni Çıkanlar (${state.lostFollowers.length})</button>
            <button id="igfc-goto-new-btn" class="igfc-btn igfc-btn-success">📈 Yeni Gelenler (${state.newFollowers.length})</button>
            <button id="igfc-goto-lost-flwing-btn" class="igfc-btn igfc-btn-warning">➖ Takipten Çıkardıkları (${state.lostFollowing.length})</button>
            <button id="igfc-goto-new-flwing-btn" class="igfc-btn igfc-btn-primary">➕ Yeni Takip Ettikleri (${state.newFollowing.length})</button>
          </div>
        `;
        resBox.querySelector('#igfc-goto-lost-btn')?.addEventListener('click', () => {
          closeCompareModal();
          switchTab('lostFollowers');
        });
        resBox.querySelector('#igfc-goto-new-btn')?.addEventListener('click', () => {
          closeCompareModal();
          switchTab('newFollowers');
        });
        resBox.querySelector('#igfc-goto-lost-flwing-btn')?.addEventListener('click', () => {
          closeCompareModal();
          switchTab('lostFollowing');
        });
        resBox.querySelector('#igfc-goto-new-flwing-btn')?.addEventListener('click', () => {
          closeCompareModal();
          switchTab('newFollowing');
        });
      }
      showToast(
        `Karşılaştırma tamamlandı: ${state.lostFollowers.length} çıkan takipçi, ${state.lostFollowing.length} takipten çıkarılan.`,
        'success'
      );
    };

    overlay.querySelector('#igfc-run-compare-btn')?.addEventListener('click', () => {
      const idx = Number(overlay.querySelector('#igfc-compare-history-select')?.value || 0);
      const selected = state.scanHistory[idx];
      if (selected && Array.isArray(selected.followers)) {
        applyComparison(selected.followers, selected.following || null);
      }
    });

    overlay.querySelector('#igfc-clear-history-btn')?.addEventListener('click', () => {
      clearScanHistory();
      closeCompareModal();
    });

    overlay.querySelector('#igfc-run-json-compare-btn')?.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(overlay.querySelector('#igfc-compare-json-input')?.value || '{}');
        const list = Array.isArray(parsed) ? parsed : parsed.followers || parsed.nonFollowers;
        const flwingList = Array.isArray(parsed?.following) ? parsed.following : null;
        applyComparison(list, flwingList);
      } catch (_) {
        showToast('JSON ayrıştırılamadı! Geçerli bir JSON yapıştırın.', 'error');
      }
    });
  }

  function closeSettingsModal() {
    document.getElementById('igfc-settings-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  function openSettingsModal() {
    closeAllSubModals();

    const overlay = document.createElement('div');
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-settings-modal" class="igfc-submodal-card">
        <div class="igfc-submodal-header">
          <h3>⚙ Ayarlar, Anti-Ban & Önbellek Yönetimi</h3>
          <button id="igfc-settings-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div class="igfc-tools-section">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input id="igfc-set-cooldown" type="checkbox" ${state.autoCooldown ? 'checked' : ''} />
              <span>🛡️ Anti-Ban Otomatik Soğuma Molası (Toplu işlemlerde her sette otomatik mola ver)</span>
            </label>
          </div>

          <div class="igfc-tools-section">
            <label for="igfc-set-dailymax">Günlük Güvenli İşlem Kotası Sınırı:</label>
            <input id="igfc-set-dailymax" type="number" min="20" max="500" class="igfc-input" value="${state.dailyLimitMax || 150}" />
          </div>

          <div class="igfc-tools-section">
            <h4>🗄️ Önbellek ve Veri Yönetimi</h4>
            <div class="igfc-tools-btn-row">
              <button id="igfc-save-settings-btn" class="igfc-btn igfc-btn-primary">💾 Ayarları Kaydet</button>
              <button id="igfc-reset-quota-btn" class="igfc-btn igfc-btn-secondary">🔄 Günlük Kotayı Sıfırla</button>
              <button id="igfc-clear-cache-btn" class="igfc-btn igfc-btn-danger">🗑 Önbelleği ve Geçmişi Temizle</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);

    overlay.querySelector('#igfc-settings-close-btn')?.addEventListener('click', closeSettingsModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettingsModal();
    });

    overlay.querySelector('#igfc-save-settings-btn')?.addEventListener('click', () => {
      state.autoCooldown = Boolean(overlay.querySelector('#igfc-set-cooldown')?.checked);
      state.dailyLimitMax = Math.max(20, Number(overlay.querySelector('#igfc-set-dailymax')?.value) || 150);
      saveSettings();
      updateQuotaBadgeUI();
      showToast('Ayarlar kaydedildi.', 'success');
      closeSettingsModal();
    });

    overlay.querySelector('#igfc-reset-quota-btn')?.addEventListener('click', () => {
      resetTodayQuota();
      showToast('Günlük işlem kotası sıfırlandı.', 'info');
    });

    overlay.querySelector('#igfc-clear-cache-btn')?.addEventListener('click', () => {
      clearScanCache();
      clearScanHistory();
      state.unfollowHistory = [];
      localStorage.removeItem(STORAGE_UNFOLLOW_LOG);
      updateStatsUI();
      renderList();
      closeSettingsModal();
    });
  }
  const USERSCRIPT_META_HEADER = [
    '// ==UserScript==',
    '// @name         Instagram Follow Checker Pro Ultimate',
    '// @namespace    https://github.com/halukcansarioz/Instagram-Follow-Checker',
    '// @version      10.22',
    '// @description  Instagram takipçi/takip edilen analizi, geri takip etmeyenler, gizli hesap derin tamamlama, toplu işlem ve mobil tarayıcı uyumlu arayüz.',
    '// @author       halukcansarioz',
    '// @match        https://www.instagram.com/*',
    '// @match        https://instagram.com/*',
    '// @icon         https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png',
    '// @grant        GM_xmlhttpRequest',
    '// @grant        GM_registerMenuCommand',
    '// @connect      cdninstagram.com',
    '// @connect      fbcdn.net',
    '// @connect      instagram.com',
    '// @connect      i.instagram.com',
    '// @run-at       document-idle',
    '// ==/UserScript==',
  ].join('\n');

  function buildUserscriptBundle() {
    return `${USERSCRIPT_META_HEADER}\n\n(${__igfcMain.toString()})();\n`;
  }

  function downloadUserscriptFile() {
    try {
      const bundle = buildUserscriptBundle();
      const blob = new Blob([bundle], { type: 'text/javascript;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'instagram-follow-checker-pro.user.js';
      a.click();
      URL.revokeObjectURL(url);
      showToast('instagram-follow-checker-pro.user.js indirildi!', 'success');
    } catch (err) {
      showToast(`Dosya oluşturulamadı: ${err.message}`, 'error');
    }
  }

  function closeInstallModal() {
    document.getElementById('igfc-install-modal')?.closest('.igfc-submodal-overlay')?.remove();
  }

  function openInstallModal() {
    closeAllSubModals();
    const isUserscript =
      typeof GM_info !== 'undefined' ||
      typeof GM_registerMenuCommand === 'function' ||
      typeof GM_xmlhttpRequest === 'function';

    const overlay = document.createElement('div');
    overlay.className = 'igfc-submodal-overlay';
    overlay.innerHTML = `
      <div id="igfc-install-modal" class="igfc-submodal-card wide">
        <div class="igfc-submodal-header">
          <h3>📲 PC & Mobil Kalıcı Kurulum Merkezi (Tampermonkey / Userscript)</h3>
          <button id="igfc-install-close-btn" class="igfc-win-btn close" title="Kapat">✕</button>
        </div>
        <div class="igfc-submodal-body">
          <div style="padding:10px 12px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border);font-size:12.5px;line-height:1.5;">
            <strong>Mevcut Çalışma Modu:</strong> ${
              isUserscript
                ? '<span style="color:#10b981;font-weight:700;">✅ Userscript (Tampermonkey / Violentmonkey) aktif!</span>'
                : '<span style="color:#fbbf24;font-weight:700;">⚡ Tarayıcı Konsolu modu (geçici). Kalıcı kurulum için aşağıdaki butonları kullanabilirsin.</span>'
            }
          </div>

          <div class="igfc-tools-section">
            <h4>⚡ Tek Tıkla Kurulum Araçları</h4>
            <div class="igfc-tools-btn-row">
              <button id="igfc-dl-userscript-btn" class="igfc-btn igfc-btn-success">📥 .user.js Dosyasını İndir</button>
              <button id="igfc-copy-userscript-btn" class="igfc-btn igfc-btn-primary">📋 Tampermonkey Kodunu Kopyala</button>
              <a href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank" rel="noopener noreferrer" class="igfc-btn igfc-btn-secondary" style="text-decoration:none;">🧩 Chrome Tampermonkey</a>
              <a href="https://raw.githubusercontent.com/halukcansarioz/Instagram-Follow-Checker/main/script.user.js" target="_blank" rel="noopener noreferrer" class="igfc-btn igfc-btn-secondary" style="text-decoration:none;">🔗 GitHub Tek Tık Kurulum</a>
            </div>
          </div>

          <div class="igfc-last-person-grid" style="margin-top:14px;">
            <div class="igfc-last-person-box">
              <div class="igfc-last-person-role">💻 PC (Chrome / Edge / Brave)</div>
              <ol style="margin:0;padding-left:18px;font-size:12px;line-height:1.55;color:var(--text-secondary);">
                <li><strong>Chrome Tampermonkey</strong> eklentisini kur (veya Edge/Firefox mağazasından ekle).</li>
                <li>Yukarıdan <strong>📋 Tampermonkey Kodunu Kopyala</strong> butonuna bas.</li>
                <li>Tampermonkey → <strong>Yeni betik oluştur</strong> → içeriği silip yapıştır → <strong>Ctrl + S</strong> ile kaydet.</li>
                <li>Artık <code>instagram.com</code> açıldığında sağ altta <strong>📸 IG Checker</strong> butonu hep hazır durur.</li>
              </ol>
            </div>

            <div class="igfc-last-person-box">
              <div class="igfc-last-person-role">📱 Android & iPhone (Mobil Tarayıcı)</div>
              <ol style="margin:0;padding-left:18px;font-size:12px;line-height:1.55;color:var(--text-secondary);">
                <li><strong>Android:</strong> Play Store'dan <strong>Mises Browser</strong> veya <strong>Firefox</strong> indirip <strong>Tampermonkey / Violentmonkey</strong> ekle.</li>
                <li><strong>iPhone:</strong> App Store'dan <strong>Userscripts</strong> (Safari eklentisi) kur.</li>
                <li>İndirdiğin <code>.user.js</code> dosyasını içe aktar veya kopyaladığın kodu yeni betik olarak kaydet.</li>
                <li><strong>429 İpucu:</strong> Web hız sınırına takılırsan PC'yi telefonun <strong>Hotspot</strong> internetine bağla veya mobilde hücresel veriyle aç.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(EXISTING_ID);
    (root || document.body).appendChild(overlay);

    overlay.querySelector('#igfc-install-close-btn')?.addEventListener('click', closeInstallModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeInstallModal();
    });

    overlay.querySelector('#igfc-dl-userscript-btn')?.addEventListener('click', downloadUserscriptFile);
    overlay.querySelector('#igfc-copy-userscript-btn')?.addEventListener('click', async () => {
      const ok = await copyTextSafe(buildUserscriptBundle());
      if (ok) showToast('Tampermonkey / Mobil Userscript kodu panoya kopyalandı!', 'success');
      else showToast('Panoya kopyalanamadı.', 'error');
    });
  }


  // ============================================================================
  // 8-YÖNLÜ KENARDAN VE KÖŞEDEN BOYUTLANDIRMA + SÜRÜKLENEBİLİR PENCERE YÖNETİCİSİ
  // ============================================================================

  function initWindowDragAndResize(modalEl, headerEl) {
    if (!modalEl || !headerEl) return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initLeft = 0;
    let initTop = 0;

    headerEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, select, input, a')) return;
      if (state.isMaximized) return;
      isDragging = true;
      const rect = modalEl.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initLeft = rect.left;
      initTop = rect.top;
      modalEl.style.transform = 'none';
      modalEl.style.left = `${initLeft}px`;
      modalEl.style.top = `${initTop}px`;
      document.body.style.userSelect = 'none';
    });

    let activeResizeDir = null;
    let rStartX = 0;
    let rStartY = 0;
    let rRect = null;

    modalEl.querySelectorAll('.igfc-resizer').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        if (state.isMaximized || state.isMinimized) return;
        e.stopPropagation();
        activeResizeDir = handle.dataset.dir;
        rStartX = e.clientX;
        rStartY = e.clientY;
        rRect = modalEl.getBoundingClientRect();
        modalEl.style.transform = 'none';
        modalEl.style.left = `${rRect.left}px`;
        modalEl.style.top = `${rRect.top}px`;
        document.body.style.userSelect = 'none';
      });
    });

    window.addEventListener(
      'mousemove',
      (e) => {
        if (isDragging) {
          const dx = e.clientX - dragStartX;
          const dy = e.clientY - dragStartY;
          const newLeft = Math.max(0, Math.min(window.innerWidth - 120, initLeft + dx));
          const newTop = Math.max(0, Math.min(window.innerHeight - 60, initTop + dy));
          modalEl.style.left = `${newLeft}px`;
          modalEl.style.top = `${newTop}px`;
        } else if (activeResizeDir && rRect) {
          const dx = e.clientX - rStartX;
          const dy = e.clientY - rStartY;
          let { left, top, width, height } = rRect;
          const minW = 500;
          const minH = 380;

          if (activeResizeDir.includes('e')) width = Math.max(minW, width + dx);
          if (activeResizeDir.includes('s')) height = Math.max(minH, height + dy);
          if (activeResizeDir.includes('w')) {
            const possibleW = width - dx;
            if (possibleW >= minW) {
              width = possibleW;
              left += dx;
            }
          }
          if (activeResizeDir.includes('n')) {
            const possibleH = height - dy;
            if (possibleH >= minH) {
              height = possibleH;
              top += dy;
            }
          }

          modalEl.style.left = `${left}px`;
          modalEl.style.top = `${top}px`;
          modalEl.style.width = `${width}px`;
          modalEl.style.height = `${height}px`;
        }
      },
      { signal: uiSignal }
    );

    window.addEventListener(
      'mouseup',
      () => {
        if (isDragging || activeResizeDir) {
          isDragging = false;
          activeResizeDir = null;
          document.body.style.userSelect = '';
        }
      },
      { signal: uiSignal }
    );
  }

  // ============================================================================
  // TEMA VE ANA ARAYÜZ (UI) OLUŞTURMA
  // ============================================================================

  function resolveEffectiveTheme() {
    if (state.theme && state.theme !== 'system') return state.theme;
    const igDark =
      document.documentElement.classList.contains('_aa4d') ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return igDark ? 'midnight' : 'light';
  }

  function applyTheme() {
    const modal = document.getElementById('igfc-modal');
    if (!modal) return;
    const eff = resolveEffectiveTheme();
    modal.setAttribute('data-theme', eff);
  }

  function applyZoom() {
    const modal = document.getElementById('igfc-modal');
    if (!modal) return;
    modal.style.setProperty('--igfc-scale', String(state.uiScale / 100));
    const zoomLabel = document.getElementById('igfc-zoom-label');
    if (zoomLabel) zoomLabel.textContent = `%${state.uiScale}`;
  }

  function toggleMinimize() {
    const modal = document.getElementById('igfc-modal');
    if (!modal) return;
    state.isMinimized = !state.isMinimized;
    modal.classList.toggle('minimized', state.isMinimized);
  }

  function toggleMaximize() {
    const modal = document.getElementById('igfc-modal');
    if (!modal) return;
    state.isMaximized = !state.isMaximized;
    modal.classList.toggle('maximized', state.isMaximized);
  }

  function toggleFooterDrawer() {
    state.isLogOpen = !state.isLogOpen;
    document.getElementById('igfc-log-list')?.classList.toggle('open', state.isLogOpen);
    const arrow = document.getElementById('igfc-footer-arrow');
    if (arrow) arrow.textContent = state.isLogOpen ? '▼ Günlüğü Gizle' : '▲ Günlüğü Göster';
  }

  function updateCacheInfoUI() {
    const el = document.getElementById('igfc-cache-info');
    if (!el) return;
    if (state.username && state.lastScannedAt) {
      const dt = new Date(state.lastScannedAt).toLocaleString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      el.innerHTML = `(Son: @${escapeHtml(state.username)} • ${escapeHtml(dt)}) <button id="igfc-clear-last-scan-btn" class="igfc-clear-cache-btn" title="Son taranan kişi önbellek kaydını temizle">✕</button>`;
      el.querySelector('#igfc-clear-last-scan-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearScanCache();
      });
    } else {
      el.textContent = '';
    }
  }

  function createUI() {
    const root = document.createElement('div');
    root.id = EXISTING_ID;

    root.innerHTML = `
      <style>
        #${EXISTING_ID} {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --accent: #6366f1;
          --accent-hover: #4f46e5;
          --danger: #ef4444;
          --warning: #f59e0b;
          --success: #10b981;
          --border: rgba(148, 163, 184, 0.18);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          z-index: 999999;
        }
        #igfc-modal[data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f1f5f9;
          --bg-tertiary: #e2e8f0;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --accent: #4f46e5;
          --accent-hover: #4338ca;
          --border: rgba(15, 23, 42, 0.12);
        }
        #igfc-modal[data-theme="oled"] {
          --bg-primary: #000000;
          --bg-secondary: #0a0a0a;
          --bg-tertiary: #171717;
          --text-primary: #fafafa;
          --text-secondary: #a3a3a3;
          --accent: #8b5cf6;
          --border: rgba(255, 255, 255, 0.14);
        }
        #igfc-modal[data-theme="cyber"] {
          --bg-primary: #090d16;
          --bg-secondary: #131b2e;
          --bg-tertiary: #1e293b;
          --text-primary: #e0f2fe;
          --text-secondary: #38bdf8;
          --accent: #ec4899;
          --border: rgba(56, 189, 248, 0.25);
        }
        #igfc-modal[data-theme="sunset"] {
          --bg-primary: #1c1018;
          --bg-secondary: #2d1926;
          --bg-tertiary: #422437;
          --text-primary: #fff1f2;
          --text-secondary: #fda4af;
          --accent: #f97316;
          --border: rgba(251, 113, 133, 0.22);
        }

        #igfc-modal {
          position: fixed;
          top: 32px;
          left: max(8px, calc(50% - 540px));
          width: 1080px;
          height: 750px;
          max-width: 96vw;
          max-height: 92vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 999999;
          font-size: calc(13px * var(--igfc-scale, 1));
        }
        #igfc-modal.maximized {
          top: 8px !important;
          left: 8px !important;
          width: calc(100vw - 16px) !important;
          height: calc(100vh - 16px) !important;
        }
        #igfc-modal.minimized {
          height: 52px !important;
          width: 440px !important;
          overflow: hidden !important;
        }
        #igfc-modal.minimized .igfc-hide-on-min,
        #igfc-modal.minimized #igfc-body-wrap,
        #igfc-modal.minimized #igfc-footer-drawer {
          display: none !important;
        }

        .igfc-resizer { position: absolute; z-index: 10; }
        .igfc-resizer-n { top: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
        .igfc-resizer-s { bottom: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
        .igfc-resizer-e { right: 0; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
        .igfc-resizer-w { left: 0; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
        .igfc-resizer-nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; }
        .igfc-resizer-ne { top: 0; right: 0; width: 10px; height: 10px; cursor: nesw-resize; }
        .igfc-resizer-sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: nesw-resize; }
        .igfc-resizer-se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; }

        .igfc-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          cursor: move;
          user-select: none;
        }
        .igfc-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }
        .igfc-title {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
          min-width: 0;
        }
        .igfc-badge {
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .igfc-quota-pill {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }
        .igfc-quota-pill.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); }
        .igfc-quota-pill.danger { background: rgba(239, 68, 68, 0.25); color: #f87171; border-color: rgba(239, 68, 68, 0.45); }

        .igfc-header-right {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding-top: 6px;
          border-top: 1px solid var(--border);
        }
        .igfc-win-controls {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-left: auto;
          flex-shrink: 0;
        }
        .igfc-win-btn {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 8px;
          min-width: 32px;
          height: 30px;
          padding: 0 9px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .igfc-win-btn:hover {
          background: var(--accent);
          color: #ffffff;
          border-color: var(--accent);
        }
        .igfc-win-btn.close {
          background: rgba(239, 68, 68, 0.18);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.5);
          font-size: 14px;
        }
        .igfc-win-btn.close:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }

        .igfc-body-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .igfc-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
        }
        .igfc-stat-box {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 7px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: border-color 0.15s ease;
        }
        .igfc-stat-box.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .igfc-stat-label { font-size: 11px; color: var(--text-secondary); }
        .igfc-stat-value { font-size: 16px; font-weight: 700; }

        .igfc-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border);
        }
        .igfc-input, .igfc-select {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid rgba(148, 163, 184, 0.32);
          border-radius: 8px;
          height: 32px;
          padding: 0 10px;
          font-size: 12.5px;
          box-sizing: border-box;
        }
        .igfc-input:focus, .igfc-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
        }
        .igfc-btn {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          height: 32px;
          padding: 0 11px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          transition: filter 0.15s ease, border-color 0.15s ease;
          box-sizing: border-box;
        }
        .igfc-btn:hover:not(:disabled) {
          filter: brightness(1.12);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .igfc-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .igfc-btn-primary { background: var(--accent); color: #fff; }
        .igfc-btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
        .igfc-btn-danger { background: var(--danger); color: #fff; }
        .igfc-btn-warning { background: var(--warning); color: #111827; }
        .igfc-btn-success { background: var(--success); color: #fff; }

        .igfc-clear-cache-btn {
          background: transparent;
          border: none;
          color: var(--danger);
          cursor: pointer;
          font-weight: 700;
          padding: 0 4px;
        }

        .igfc-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 14px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          font-size: 12px;
        }
        .igfc-status-text { flex: 1; color: var(--text-secondary); }
        .igfc-error-banner {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.16);
          border-bottom: 1px solid rgba(239, 68, 68, 0.55);
          color: #fecaca;
          font-size: 12.5px;
          line-height: 1.45;
          flex-shrink: 0;
        }
        #igfc-modal[data-theme="light"] .igfc-error-banner {
          background: #fee2e2;
          color: #991b1b;
          border-bottom-color: #f87171;
        }
        .igfc-error-banner.visible { display: flex; }
        .igfc-mobile-banner {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 14px;
          background: rgba(16, 185, 129, 0.16);
          border-bottom: 1px solid rgba(16, 185, 129, 0.55);
          color: #a7f3d0;
          font-size: 12.5px;
          font-weight: 600;
          flex-shrink: 0;
        }
        #igfc-modal[data-theme="light"] .igfc-mobile-banner {
          background: #d1fae5;
          color: #065f46;
        }
        .igfc-mobile-banner.visible { display: flex; }
        .igfc-error-banner-body { flex: 1; }
        .igfc-error-banner-title { font-weight: 700; margin-bottom: 2px; }
        .igfc-error-banner-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .igfc-progress-track {
          width: 180px;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 999px;
          overflow: hidden;
        }
        .igfc-progress-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, var(--accent), #ec4899);
          transition: width 0.2s ease;
        }
        .igfc-progress-pct { font-weight: 700; font-size: 11.5px; min-width: 36px; text-align: right; }

        .igfc-subbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 14px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border);
        }
        .igfc-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .igfc-tab {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .igfc-tab.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .igfc-tab-badge {
          background: rgba(0, 0, 0, 0.25);
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 10.5px;
        }

        .igfc-quick-select {
          display: inline-flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
        }
        .igfc-seg-btn {
          background: transparent;
          color: var(--text-primary);
          border: none;
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .igfc-seg-btn:hover { background: var(--bg-tertiary); }

        .igfc-list-wrapper {
          flex: 1;
          position: relative;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .igfc-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 10px;
          align-content: start;
        }
        .igfc-list.compact-mode {
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .igfc-user-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.12s ease;
        }
        .igfc-user-card.selected { border-color: var(--accent); background: rgba(99, 102, 241, 0.12); }
        .igfc-card-top { display: flex; align-items: center; gap: 10px; }
        .igfc-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; cursor: pointer; }
        .igfc-card-info { flex: 1; min-width: 0; }
        .igfc-username {
          color: var(--text-primary);
          font-weight: 700;
          text-decoration: none;
          word-break: break-all;
        }
        .igfc-fullname { color: var(--text-secondary); font-size: 12px; word-break: break-word; }
        .igfc-userid { color: var(--text-secondary); font-size: 10.5px; }
        .igfc-tag-verified { color: #38bdf8; margin-left: 4px; font-weight: 700; }
        .igfc-tag-private { color: #fbbf24; margin-left: 4px; }
        .igfc-tag-last {
          display: inline-block;
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 10.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 6px;
          margin-top: 2px;
          margin-right: 4px;
        }
        .igfc-card-actions { display: flex; flex-wrap: wrap; gap: 5px; }

        .igfc-floating-bar {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 14px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border);
        }
        .igfc-floating-bar.visible { display: flex; }
        .igfc-floating-count { font-weight: 700; }

        .igfc-footer-drawer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
        }
        .igfc-footer-header {
          padding: 7px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .igfc-footer-body {
          display: none;
          max-height: 130px;
          overflow-y: auto;
          background: #020617;
          color: #94a3b8;
          font-family: monospace;
          font-size: 11px;
          padding: 8px 14px;
          border-top: 1px solid var(--border);
        }
        .igfc-footer-body.open { display: block; }

        .igfc-submodal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000001;
        }
        .igfc-submodal-card {
          background: var(--bg-primary, #0f172a);
          color: var(--text-primary, #f8fafc);
          border: 1px solid var(--border, rgba(255,255,255,0.2));
          border-radius: 14px;
          width: 580px;
          max-width: 94vw;
          max-height: 88vh;
          overflow-y: auto;
          padding: 16px;
        }
        .igfc-submodal-card.wide { width: 760px; }
        .igfc-submodal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .igfc-detail-top { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
        .igfc-detail-avatar { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; }
        .igfc-detail-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin: 12px 0;
        }
        .igfc-detail-stat {
          background: var(--bg-secondary, #1e293b);
          padding: 8px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
        }
        .igfc-last-person-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }
        .igfc-last-person-box {
          background: var(--bg-secondary, #1e293b);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .igfc-last-person-role { font-weight: 700; font-size: 12px; color: var(--text-secondary); }
        .igfc-last-person-row { display: flex; align-items: center; gap: 10px; }
        .igfc-tools-section { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .igfc-tools-btn-row, .igfc-tools-inline { display: flex; flex-wrap: wrap; gap: 8px; }
        .igfc-textarea {
          width: 100%;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          box-sizing: border-box;
        }
        .igfc-toast-container {
          position: fixed;
          top: 18px;
          right: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1000005;
        }
        .igfc-toast {
          background: #1e293b;
          color: #fff;
          padding: 10px 14px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          font-size: 13px;
          border-left: 4px solid var(--accent);
        }
        .igfc-toast.success { border-left-color: #10b981; }
        .igfc-toast.error { border-left-color: #ef4444; }
        .igfc-toast.warning { border-left-color: #f59e0b; }
        @media (max-width: 768px) {
          #igfc-modal {
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            max-width: 100vw !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            font-size: 12.5px !important;
          }
          #igfc-modal.minimized {
            top: auto !important;
            bottom: 12px !important;
            right: 12px !important;
            left: auto !important;
            width: 240px !important;
            height: 48px !important;
            border-radius: 14px !important;
            border: 1px solid var(--border) !important;
          }
          .igfc-resizer,
          #igfc-zoom-out-btn,
          #igfc-zoom-label,
          #igfc-zoom-in-btn,
          #igfc-maximize-btn {
            display: none !important;
          }
          .igfc-header {
            padding: 8px 10px;
            gap: 6px;
            cursor: default;
          }
          .igfc-header-right {
            gap: 5px;
            padding-top: 5px;
          }
          .igfc-stats-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 5px;
            padding: 7px 10px;
          }
          .igfc-stat-box {
            padding: 5px 7px;
          }
          .igfc-stat-label {
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .igfc-stat-value {
            font-size: 14px;
          }
          .igfc-controls {
            padding: 7px 10px;
            gap: 5px;
          }
          .igfc-controls .igfc-input,
          .igfc-controls .igfc-select {
            height: 34px;
            font-size: 12px;
          }
          #igfc-username-input {
            width: 100% !important;
            flex: 1 1 140px;
          }
          .igfc-btn {
            min-height: 34px;
            padding: 0 9px;
            font-size: 11.5px;
          }
          .igfc-subbar {
            padding: 6px 10px;
            gap: 6px;
          }
          .igfc-tabs {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            padding-bottom: 2px;
          }
          .igfc-tab {
            flex-shrink: 0;
          }
          .igfc-list {
            grid-template-columns: 1fr;
            padding: 8px 10px;
            gap: 8px;
          }
          .igfc-progress-track {
            width: 90px;
          }
          .igfc-floating-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
          }
        }
      </style>

      <div id="igfc-toast-container" class="igfc-toast-container"></div>

      <div id="igfc-modal" class="igfc-modal" data-theme="midnight">
        <div class="igfc-resizer igfc-resizer-n" data-dir="n"></div>
        <div class="igfc-resizer igfc-resizer-s" data-dir="s"></div>
        <div class="igfc-resizer igfc-resizer-e" data-dir="e"></div>
        <div class="igfc-resizer igfc-resizer-w" data-dir="w"></div>
        <div class="igfc-resizer igfc-resizer-nw" data-dir="nw"></div>
        <div class="igfc-resizer igfc-resizer-ne" data-dir="ne"></div>
        <div class="igfc-resizer igfc-resizer-sw" data-dir="sw"></div>
        <div class="igfc-resizer igfc-resizer-se" data-dir="se"></div>

        <div id="igfc-header" class="igfc-header">
          <div class="igfc-header-top">
            <div class="igfc-title">
              <span>📸 IG Follow Checker</span>
              <button id="igfc-changelog-btn" class="igfc-badge" title="Sürüm Geçmişi ve Yenilikler">v10.22 Pro</button>
              <button id="igfc-apimode-badge" class="igfc-quota-pill igfc-hide-on-min" style="cursor:pointer;" title="Web / Mobil Web modu">💻 Web Mod</button>
              <span id="igfc-quota-badge" class="igfc-quota-pill igfc-hide-on-min">Günlük Kota: 0/150</span>
              <span id="igfc-cache-info" class="igfc-cache-info igfc-hide-on-min" style="font-size:11.5px;color:var(--text-secondary);"></span>
            </div>

            <div class="igfc-win-controls">
              <button id="igfc-zoom-out-btn" class="igfc-win-btn igfc-hide-on-min" title="Yazıyı Küçült">A-</button>
              <span id="igfc-zoom-label" class="igfc-hide-on-min" style="font-size:12px;font-weight:700;padding:0 2px;">%100</span>
              <button id="igfc-zoom-in-btn" class="igfc-win-btn igfc-hide-on-min" title="Yazıyı Büyüt">A+</button>
              <button id="igfc-minimize-btn" class="igfc-win-btn" title="Simge Durumuna Küçült">-</button>
              <button id="igfc-maximize-btn" class="igfc-win-btn igfc-hide-on-min" title="Tam Ekran Yap / Normale Dön">□</button>
              <button id="igfc-close-btn" class="igfc-win-btn close" title="Uygulamayı Kapat">✖</button>
            </div>
          </div>

          <div class="igfc-header-right igfc-hide-on-min">
            <button id="igfc-last-follow-modal-btn" class="igfc-btn igfc-btn-danger" title="Son takip edilen veya son takipçi kişiyi çıkart">🎯 Son Takip Çıkart</button>
            <button id="igfc-analytics-btn" class="igfc-btn igfc-btn-secondary" title="Hesap Analizi & Temizlik Sihirbazı">🛠 Araçlar</button>
            <button id="igfc-compare-modal-btn" class="igfc-btn igfc-btn-secondary" title="Geçmiş Taramaları Karşılaştır">🔀 Karşılaştır</button>
            <button id="igfc-settings-btn" class="igfc-btn igfc-btn-secondary" title="Ayarlar & Önbellek">⚙ Ayarlar</button>
            <button id="igfc-install-btn" class="igfc-btn igfc-btn-primary" title="PC & Mobil Tampermonkey / Userscript Kurulum Merkezi">📲 Kurulum / Mobil</button>
            <button id="igfc-lang-btn" class="igfc-btn igfc-btn-secondary" title="Dil Değiştir (TR / EN)">🌐 TR</button>

            <div style="margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
              <select id="igfc-theme-select" class="igfc-select" title="Tema Seçimi">
                <option value="system">🌗 Otomatik (Sistem)</option>
                <option value="midnight">🌙 Koyu (Midnight)</option>
                <option value="light">☀️ Açık (Light)</option>
                <option value="oled">🖤 Zifiri Koyu (OLED)</option>
                <option value="cyber">⚡ Cyberpunk</option>
                <option value="sunset">🌅 Gün Batımı</option>
              </select>

              <select id="igfc-speed-select" class="igfc-select" title="İşlem Hızı / Anti-Ban Modu">
                <option value="safe" selected>🛡️ Güvenli Mod (Önerilen)</option>
                <option value="normal">⚖️ Dengeli Mod</option>
                <option value="fast">⚡ Hızlı Mod</option>
                <option value="ultra">🐢 Ultra Güvenli</option>
              </select>

              <button id="igfc-view-toggle-btn" class="igfc-btn igfc-btn-secondary" title="Kart / Kompakt Liste Görünümü">⊞ Görünüm</button>
            </div>
          </div>
        </div>

        <div id="igfc-body-wrap" class="igfc-body-wrap">
          <div class="igfc-stats-row">
            <div id="igfc-box-nonFollowers" class="igfc-stat-box active" data-stat-tab="nonFollowers" title="Seni takip etmeyenleri göster">
              <span id="igfc-lbl-nonFollowers" class="igfc-stat-label">Takip Etmeyen</span>
              <span id="igfc-stat-nonfollowers" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-suspicious" class="igfc-stat-box" data-stat-tab="suspicious" title="Şüpheli / Bot hesapları göster">
              <span id="igfc-lbl-suspicious" class="igfc-stat-label">Şüpheli / Bot</span>
              <span id="igfc-stat-suspicious" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-fans" class="igfc-stat-box" data-stat-tab="fans" title="Senin takip etmediklerini göster">
              <span id="igfc-lbl-fans" class="igfc-stat-label">Takip Etmediğin</span>
              <span id="igfc-stat-fans" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-mutuals" class="igfc-stat-box" data-stat-tab="mutuals" title="Karşılıklı takipleştiklerini göster">
              <span id="igfc-lbl-mutuals" class="igfc-stat-label">Karşılıklı</span>
              <span id="igfc-stat-mutuals" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-lostFollowers" class="igfc-stat-box" data-stat-tab="lostFollowers" title="Son taramadan beri takipten çıkanlar">
              <span id="igfc-lbl-lostFollowers" class="igfc-stat-label">Yeni Çıkanlar</span>
              <span id="igfc-stat-lost" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-allFollowers" class="igfc-stat-box" data-stat-tab="allFollowers" title="Tüm takipçilerini göster">
              <span id="igfc-lbl-allFollowers" class="igfc-stat-label">Tüm Takipçiler</span>
              <span id="igfc-stat-followers" class="igfc-stat-value">0</span>
            </div>
            <div id="igfc-box-allFollowing" class="igfc-stat-box" data-stat-tab="allFollowing" title="Tüm takip ettiklerini göster">
              <span id="igfc-lbl-allFollowing" class="igfc-stat-label">Tüm Takip Edilen</span>
              <span id="igfc-stat-following" class="igfc-stat-value">0</span>
            </div>
          </div>

          <div class="igfc-controls">
            <input id="igfc-username-input" type="text" class="igfc-input" style="width:140px;" placeholder="@kullanici..." value="${escapeHtml(getDefaultUsername() || state.username)}" />
            <button id="igfc-my-account-btn" class="igfc-btn igfc-btn-success">⚡ Kendi Hesabımı Tara</button>
            <button id="igfc-start-btn" class="igfc-btn igfc-btn-primary">🔍 Kullanıcıyı Tara</button>
            <button id="igfc-unfollow-last-btn" class="igfc-btn igfc-btn-danger" title="En son takip edilen kişiyi hemen çıkart">🎯 Son Takip Kişisini Çıkart</button>
            <button id="igfc-stop-btn" class="igfc-btn igfc-btn-warning" disabled>⏹ Durdur</button>

            <input id="igfc-search-input" type="text" class="igfc-input" style="flex:1;min-width:140px;" placeholder="Ara: @isim, not veya hariç tut (!kelime)..." />

            <select id="igfc-filter-select" class="igfc-select">
              <option value="all">Filtre: Tümü</option>
              <option value="verified">✔ Onaylı Hesaplar</option>
              <option value="unverified">✖ Onaysız Hesaplar</option>
              <option value="private">🔒 Gizli Hesaplar</option>
              <option value="public">🌐 Açık Hesaplar</option>
              <option value="suspicious">👻 Şüpheli / Resimsiz</option>
              <option value="whitelist">★ Korunanlar</option>
              <option value="hasNote">📝 Not Eklenenler</option>
              <option value="tag:Arkadaş">🟢 Etiket: Arkadaş</option>
              <option value="tag:İş">🔵 Etiket: İş</option>
              <option value="tag:Aile">🟣 Etiket: Aile</option>
              <option value="tag:VIP">⭐ Etiket: VIP</option>
            </select>

            <select id="igfc-sort-select" class="igfc-select">
              <option value="default">Sırala: En Son Takip Sırası (Varsayılan)</option>
              <option value="oldest">Sırala: En Eski Takip Sırası (Ters)</option>
              <option value="az">Kullanıcı Adı (A → Z)</option>
              <option value="za">Kullanıcı Adı (Z → A)</option>
              <option value="name">Tam İsim (A → Z)</option>
              <option value="suspicious">Şüphe Puanı (Yüksek → Düşük)</option>
            </select>

            <button id="igfc-copy-btn" class="igfc-btn igfc-btn-secondary" title="Aktif listedeki kullanıcıları kopyala">📋 Kopyala</button>
            <button id="igfc-csv-btn" class="igfc-btn igfc-btn-secondary" title="Excel uyumlu CSV olarak indir">📊 CSV</button>
            <button id="igfc-export-btn" class="igfc-btn igfc-btn-secondary" title="Detaylı JSON olarak indir">📦 JSON</button>
            <button id="igfc-report-btn" class="igfc-btn igfc-btn-secondary" title="Detaylı Hesap Sağlık ve Analiz Raporunu (.txt) indir">📄 Rapor</button>
            <button id="igfc-import-json-btn" class="igfc-btn igfc-btn-secondary" title="Resmi Instagram followers_1.json / following.json veya yedek JSON yükle">📂 JSON Yükle</button>
            <input id="igfc-import-json-input" type="file" multiple accept=".json" style="display:none;" />
          </div>

          <div class="igfc-status-bar">
            <span id="igfc-status-msg" class="igfc-status-text">Hazır. "⚡ Kendi Hesabımı Tara" butonuna tıklayarak hemen başlayabilirsiniz.</span>
            <div class="igfc-progress-track">
              <div id="igfc-progress-fill" class="igfc-progress-fill"></div>
            </div>
            <span id="igfc-progress-pct" class="igfc-progress-pct">0%</span>
          </div>

          <div id="igfc-mobile-banner" class="igfc-mobile-banner" role="status">
            <span id="igfc-mobile-banner-text">📱 Mobil Moda geçildi! Tarama mobil modda devam ediyor...</span>
            <button id="igfc-mobile-banner-close" class="igfc-win-btn close" title="Gizle">✕</button>
          </div>

          <div id="igfc-error-banner" class="igfc-error-banner" role="alert">
            <div class="igfc-error-banner-body">
              <div id="igfc-error-banner-title" class="igfc-error-banner-title">⛔ Hata: Instagram Hız Sınırı (HTTP 429 – Too Many Requests)</div>
              <div id="igfc-error-banner-text">Instagram oturumunuza geçici istek sınırı uyguladığı için tarama otomatik durduruldu. 30–60 dakika bekleyip Güvenli Mod ile deneyin veya resmi JSON dosyanızı yükleyin.</div>
            </div>
            <div class="igfc-error-banner-actions">
              <button id="igfc-error-install-btn" class="igfc-btn igfc-btn-success">📲 Tampermonkey / Mobil</button>
              <button id="igfc-error-json-btn" class="igfc-btn igfc-btn-primary">📂 JSON Yükle</button>
              <button id="igfc-error-close-btn" class="igfc-win-btn close" title="Uyarıyı Kapat">✕</button>
            </div>
          </div>

          <div class="igfc-subbar">
            <div class="igfc-tabs">
              <button id="igfc-tab-nonFollowers" class="igfc-tab active" data-tab="nonFollowers">🚫 Takip Etmeyenler <span class="igfc-tab-badge" id="igfc-cnt-nonFollowers">0</span></button>
              <button id="igfc-tab-suspicious" class="igfc-tab" data-tab="suspicious">👻 Şüpheli / Bot <span class="igfc-tab-badge" id="igfc-cnt-suspicious">0</span></button>
              <button id="igfc-tab-fans" class="igfc-tab" data-tab="fans">💙 Takip Etmediklerin <span class="igfc-tab-badge" id="igfc-cnt-fans">0</span></button>
              <button id="igfc-tab-mutuals" class="igfc-tab" data-tab="mutuals">🤝 Karşılıklı <span class="igfc-tab-badge" id="igfc-cnt-mutuals">0</span></button>
              <button id="igfc-tab-allFollowers" class="igfc-tab" data-tab="allFollowers">👥 Tüm Takipçiler <span class="igfc-tab-badge" id="igfc-cnt-allFollowers">0</span></button>
              <button id="igfc-tab-allFollowing" class="igfc-tab" data-tab="allFollowing">📤 Tüm Takip Edilen <span class="igfc-tab-badge" id="igfc-cnt-allFollowing">0</span></button>
              <button id="igfc-tab-lostFollowers" class="igfc-tab" data-tab="lostFollowers">📉 Yeni Çıkanlar <span class="igfc-tab-badge" id="igfc-cnt-lostFollowers">0</span></button>
              <button id="igfc-tab-newFollowers" class="igfc-tab" data-tab="newFollowers">📈 Yeni Gelenler <span class="igfc-tab-badge" id="igfc-cnt-newFollowers">0</span></button>
              <button id="igfc-tab-lostFollowing" class="igfc-tab" data-tab="lostFollowing">➖ Takipten Çıkardıkların <span class="igfc-tab-badge" id="igfc-cnt-lostFollowing">0</span></button>
              <button id="igfc-tab-newFollowing" class="igfc-tab" data-tab="newFollowing">➕ Yeni Takip Ettiklerin <span class="igfc-tab-badge" id="igfc-cnt-newFollowing">0</span></button>
              <button id="igfc-tab-favorites" class="igfc-tab" data-tab="favorites">💛 Favoriler <span class="igfc-tab-badge" id="igfc-cnt-favorites">0</span></button>
              <button id="igfc-tab-whitelist" class="igfc-tab" data-tab="whitelist">★ Korunanlar <span class="igfc-tab-badge" id="igfc-cnt-whitelist">0</span></button>
              <button id="igfc-tab-history" class="igfc-tab" data-tab="history">🕒 Geçmiş <span class="igfc-tab-badge" id="igfc-cnt-history">0</span></button>
            </div>

            <div class="igfc-quick-select">
              <button id="igfc-select-all-btn" class="igfc-seg-btn">☑ Tümünü Seç</button>
              <button id="igfc-invert-select-btn" class="igfc-seg-btn">🔀 Tersini Seç</button>
              <button id="igfc-deselect-all-btn" class="igfc-seg-btn">☐ Temizle</button>
            </div>
          </div>

          <div class="igfc-list-wrapper">
            <div id="igfc-list-container" class="igfc-list"></div>

            <div id="igfc-floating-bar" class="igfc-floating-bar">
              <span id="igfc-floating-count" class="igfc-floating-count">0 kişi seçildi</span>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="igfc-bulk-whitelist-btn" class="igfc-btn igfc-btn-secondary">★ Seçilenleri Koru</button>
                <button id="igfc-bulk-follow-btn" class="igfc-btn igfc-btn-success">➕ Seçilenleri Takip Et</button>
                <button id="igfc-bulk-unfollow-btn" class="igfc-btn igfc-btn-danger">🚫 Seçilenleri Takipten Çık</button>
                <button id="igfc-bulk-remove-follower-btn" class="igfc-btn igfc-btn-warning">❌ Takipçilerden Çıkar</button>
                <button id="igfc-floating-cancel-btn" class="igfc-btn igfc-btn-secondary">İptal</button>
              </div>
            </div>
          </div>
        </div>

        <div id="igfc-footer-drawer" class="igfc-footer-drawer">
          <div id="igfc-footer-toggle" class="igfc-footer-header">
            <span id="igfc-last-log-preview">📜 İşlem günlüğü hazır.</span>
            <span id="igfc-footer-arrow">▲ Günlüğü Göster</span>
          </div>
          <div id="igfc-log-list" class="igfc-footer-body"></div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const modalEl = document.getElementById('igfc-modal');
    const headerEl = document.getElementById('igfc-header');
    initWindowDragAndResize(modalEl, headerEl);

    const themeSel = document.getElementById('igfc-theme-select');
    if (themeSel) themeSel.value = state.theme;
    const speedSel = document.getElementById('igfc-speed-select');
    if (speedSel) speedSel.value = state.speedMode;
    document.getElementById('igfc-list-container')?.classList.toggle('compact-mode', state.viewMode === 'compact');
    applyTheme();
    applyZoom();
    updateApiModeUI();
    updateQuotaBadgeUI();
    updateCacheInfoUI();

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          closeAllSubModals();
        } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('igfc-search-input')?.focus();
        }
      },
      { signal: uiSignal }
    );

    document.getElementById('igfc-username-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        startScan(false);
      }
    });

    document.getElementById('igfc-last-follow-modal-btn')?.addEventListener('click', openLastFollowModal);
    document.getElementById('igfc-unfollow-last-btn')?.addEventListener('click', openLastFollowModal);
    document.getElementById('igfc-changelog-btn')?.addEventListener('click', openChangelogModal);
    document.getElementById('igfc-analytics-btn')?.addEventListener('click', openAnalyticsModal);
    document.getElementById('igfc-compare-modal-btn')?.addEventListener('click', openCompareModal);
    document.getElementById('igfc-settings-btn')?.addEventListener('click', openSettingsModal);
    document.getElementById('igfc-install-btn')?.addEventListener('click', openInstallModal);
    document.getElementById('igfc-error-install-btn')?.addEventListener('click', openInstallModal);
    document.getElementById('igfc-mobile-banner-close')?.addEventListener('click', hideMobileSwitchBanner);
    document.getElementById('igfc-apimode-badge')?.addEventListener('click', () => {
      if (state.apiMode === 'mobile') {
        state.apiMode = 'web';
        updateApiModeUI();
        showToast('💻 Web Moduna geçildi.', 'info');
      } else {
        switchToMobileMode('manual');
      }
    });

    document.getElementById('igfc-theme-select')?.addEventListener('change', (e) => {
      state.theme = e.target.value;
      applyTheme();
      saveSettings();
    });

    document.getElementById('igfc-speed-select')?.addEventListener('change', (e) => {
      state.speedMode = e.target.value;
      saveSettings();
    });

    document.getElementById('igfc-view-toggle-btn')?.addEventListener('click', () => {
      state.viewMode = state.viewMode === 'grid' ? 'compact' : 'grid';
      document.getElementById('igfc-list-container')?.classList.toggle('compact-mode', state.viewMode === 'compact');
      saveSettings();
    });

    document.getElementById('igfc-zoom-out-btn')?.addEventListener('click', () => {
      state.uiScale = Math.max(80, state.uiScale - 5);
      applyZoom();
      saveSettings();
    });

    document.getElementById('igfc-zoom-in-btn')?.addEventListener('click', () => {
      state.uiScale = Math.min(120, state.uiScale + 5);
      applyZoom();
      saveSettings();
    });

    document.getElementById('igfc-minimize-btn')?.addEventListener('click', toggleMinimize);
    headerEl?.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button, select, input')) toggleMinimize();
    });
    document.getElementById('igfc-maximize-btn')?.addEventListener('click', toggleMaximize);
    document.getElementById('igfc-close-btn')?.addEventListener('click', () => {
      window.__igfcCleanup();
    });

    document.getElementById('igfc-footer-toggle')?.addEventListener('click', toggleFooterDrawer);

    document.getElementById('igfc-start-btn')?.addEventListener('click', () => startScan(false));
    document.getElementById('igfc-my-account-btn')?.addEventListener('click', () => startScan(true));
    document.getElementById('igfc-stop-btn')?.addEventListener('click', stopScan);

    document.getElementById('igfc-search-input')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.renderLimit = 200;
      renderList();
    });

    document.getElementById('igfc-filter-select')?.addEventListener('change', (e) => {
      state.filterType = e.target.value;
      state.renderLimit = 200;
      renderList();
    });

    document.getElementById('igfc-sort-select')?.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderList();
    });

    document.getElementById('igfc-select-all-btn')?.addEventListener('click', () => {
      const visible = getFilteredAndSortedList();
      visible.forEach((u) => {
        if (!isWhitelisted(u.id)) state.selectedIds.add(String(u.id));
      });
      renderList();
      updateBulkButtons();
    });

    document.getElementById('igfc-invert-select-btn')?.addEventListener('click', () => {
      const visible = getFilteredAndSortedList();
      visible.forEach((u) => {
        const uid = String(u.id);
        if (state.selectedIds.has(uid)) state.selectedIds.delete(uid);
        else if (!isWhitelisted(uid)) state.selectedIds.add(uid);
      });
      renderList();
      updateBulkButtons();
    });

    const clearSelections = () => {
      state.selectedIds.clear();
      state.lastClickedIndex = -1;
      renderList();
      updateBulkButtons();
    };
    document.getElementById('igfc-deselect-all-btn')?.addEventListener('click', clearSelections);
    document.getElementById('igfc-floating-cancel-btn')?.addEventListener('click', clearSelections);

    document.getElementById('igfc-bulk-whitelist-btn')?.addEventListener('click', () => runBulkAction('whitelist'));
    document.getElementById('igfc-bulk-unfollow-btn')?.addEventListener('click', () => runBulkAction('unfollow'));
    document.getElementById('igfc-bulk-follow-btn')?.addEventListener('click', () => runBulkAction('follow'));
    document.getElementById('igfc-bulk-remove-follower-btn')?.addEventListener('click', () => runBulkAction('remove_follower'));

    document.getElementById('igfc-copy-btn')?.addEventListener('click', copyListToClipboard);
    document.getElementById('igfc-csv-btn')?.addEventListener('click', exportToCSV);
    document.getElementById('igfc-export-btn')?.addEventListener('click', exportToJSON);
    document.getElementById('igfc-report-btn')?.addEventListener('click', exportSummaryReportTxt);
    document.getElementById('igfc-import-json-btn')?.addEventListener('click', () => {
      document.getElementById('igfc-import-json-input')?.click();
    });
    document.getElementById('igfc-import-json-input')?.addEventListener('change', (e) => {
      importOfficialJsonFiles(e.target.files);
    });
    document.getElementById('igfc-error-json-btn')?.addEventListener('click', () => {
      document.getElementById('igfc-import-json-input')?.click();
    });
    document.getElementById('igfc-error-close-btn')?.addEventListener('click', clearRateLimitError);

    document.getElementById('igfc-lang-btn')?.addEventListener('click', (e) => {
      state.lang = state.lang === 'tr' ? 'en' : 'tr';
      const isEn = state.lang === 'en';
      e.currentTarget.textContent = isEn ? '🌐 EN' : '🌐 TR';
      const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };
      setTxt('igfc-my-account-btn', isEn ? '⚡ Scan My Account' : '⚡ Kendi Hesabımı Tara');
      setTxt('igfc-start-btn', isEn ? '🔍 Scan User' : '🔍 Kullanıcıyı Tara');
      setTxt('igfc-unfollow-last-btn', isEn ? '🎯 Unfollow Last' : '🎯 Son Takip Kişisini Çıkart');
      setTxt('igfc-stop-btn', isEn ? '⏹ Stop' : '⏹ Durdur');
      setTxt('igfc-select-all-btn', isEn ? '☑ Select All' : '☑ Tümünü Seç');
      setTxt('igfc-invert-select-btn', isEn ? '🔀 Invert' : '🔀 Tersini Seç');
      setTxt('igfc-deselect-all-btn', isEn ? '☐ Clear' : '☐ Temizle');
      updatePerspectiveLabels();
      showToast(isEn ? 'Language switched to English.' : 'Dil Türkçe olarak değiştirildi.', 'info');
    });

    document.querySelectorAll('.igfc-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('.igfc-stat-box').forEach((box) => {
      box.addEventListener('click', () => switchTab(box.dataset.statTab));
    });
  }

  // ============================================================================
  // LİSTE HESAPLAMA, FİLTRELEME, SIRALAMA VE RENDER FONKSİYONLARI
  // ============================================================================

  function updateStatus(message) {
    const el = document.getElementById('igfc-status-msg');
    if (el) el.textContent = message;
  }

  function updateProgress(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    const fill = document.getElementById('igfc-progress-fill');
    const lbl = document.getElementById('igfc-progress-pct');
    if (fill) fill.style.width = `${clamped}%`;
    if (lbl) lbl.textContent = `${clamped}%`;
  }

  function addLog(msg, type = 'info') {
    const list = document.getElementById('igfc-log-list');
    const preview = document.getElementById('igfc-last-log-preview');
    const time = new Date().toLocaleTimeString('tr-TR');
    const lineText = `[${time}] ${msg}`;

    if (preview) preview.textContent = lineText;
    if (!list) return;

    const div = document.createElement('div');
    if (type === 'error') div.style.color = '#f87171';
    else if (type === 'warn') div.style.color = '#fbbf24';
    else if (type === 'success') div.style.color = '#34d399';
    div.textContent = lineText;
    list.prepend(div);
  }

  let last429ToastAt = 0;

  function notifyRateLimitError(sourceUrl = '') {
    const isEn = state.lang === 'en';
    const title = isEn
      ? '⛔ Error: Instagram Rate Limit (HTTP 429 – Too Many Requests)'
      : '⛔ Hata: Instagram Hız Sınırı (HTTP 429 – Too Many Requests)';
    const text = isEn
      ? 'Instagram temporarily rate-limited your session so the scan was stopped. Wait 30–60 minutes and try Safe Mode, or load your official Instagram JSON.'
      : 'Hem Web hem Mobil Web modunda Instagram hız sınırı (429) algılandığı için tarama durduruldu. Farklı IP (mobil hotspot) ile deneyebilir, 30–60 dk bekleyebilir veya resmi JSON yükleyebilirsiniz.';

    state.lastRateLimitError = text;
    const banner = document.getElementById('igfc-error-banner');
    const titleEl = document.getElementById('igfc-error-banner-title');
    const textEl = document.getElementById('igfc-error-banner-text');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (banner) banner.classList.add('visible');

    state.bulkAbort = true;
    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (_) {}
    }

    updateStatus(title);
    const now = Date.now();
    if (now - last429ToastAt > 6000) {
      last429ToastAt = now;
      addLog(`⛔ HTTP 429 algılandı${sourceUrl ? ` (${sourceUrl.split('?')[0]})` : ''} — tarama durduruldu.`, 'error');
      showToast(isEn ? '⛔ HTTP 429! Scan stopped.' : '⛔ HTTP 429 algılandı! Tarama durduruldu.', 'error');
    }
  }

  function clearRateLimitError() {
    state.lastRateLimitError = '';
    document.getElementById('igfc-error-banner')?.classList.remove('visible');
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('igfc-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `igfc-toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  function updateBulkButtons() {
    const bar = document.getElementById('igfc-floating-bar');
    const lbl = document.getElementById('igfc-floating-count');
    if (!bar || !lbl) return;
    const count = state.selectedIds.size;
    lbl.textContent = `${count} kişi seçildi`;
    bar.classList.toggle('visible', count > 0);
  }

  function computeCategories() {
    const followerSet = new Set(state.followers.map((u) => String(u.id)));
    const followerNames = new Set(state.followers.map((u) => (u.username || '').toLowerCase()).filter(Boolean));
    const followingSet = new Set(state.following.map((u) => String(u.id)));
    const followingNames = new Set(state.following.map((u) => (u.username || '').toLowerCase()).filter(Boolean));

    state.nonFollowers = [];
    state.mutuals = [];
    state.suspicious = [];
    state.fans = [];
    const suspSeen = new Set();

    for (const u of state.following) {
      const uid = String(u.id);
      const uLow = (u.username || '').toLowerCase();
      const isFollower = followerSet.has(uid) || (uLow && followerNames.has(uLow));
      const isNonFollower = !isFollower;
      const susp = computeSuspicionInfo(u, isNonFollower);
      u.suspicionScore = susp.score;
      u.suspicionReasons = susp.reasons;

      if (isNonFollower) state.nonFollowers.push(u);
      else state.mutuals.push(u);

      if (susp.isSuspicious && !suspSeen.has(uid)) {
        suspSeen.add(uid);
        state.suspicious.push(u);
      }
    }

    for (const u of state.followers) {
      const uid = String(u.id);
      const uLow = (u.username || '').toLowerCase();
      const inFollowing = followingSet.has(uid) || (uLow && followingNames.has(uLow));
      const susp = computeSuspicionInfo(u, false);
      u.suspicionScore = susp.score;
      u.suspicionReasons = susp.reasons;

      if (!inFollowing) {
        state.fans.push(u);
      }
      if (susp.isSuspicious && !suspSeen.has(uid)) {
        suspSeen.add(uid);
        state.suspicious.push(u);
      }
    }

    updateStatsUI();
  }

  function updatePerspectiveLabels() {
    const isSelf = state.isScanningSelf !== false;
    const isEn = state.lang === 'en';
    const uname = state.username && state.username !== 'aktif_hesap' ? `@${state.username}` : 'bu hesap';

    const setLbl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const setTitle = (id, title) => {
      const el = document.getElementById(id);
      if (el) el.title = title;
    };
    const setTabLabel = (tabId, prefixText) => {
      const btn = document.getElementById(tabId);
      if (!btn) return;
      const badge = btn.querySelector('.igfc-tab-badge');
      if (badge) {
        btn.childNodes[0].textContent = `${prefixText} `;
      }
    };

    if (isEn) {
      if (isSelf) {
        setLbl('igfc-lbl-nonFollowers', 'Not Following Back');
        setLbl('igfc-lbl-fans', "You Don't Follow");
        setLbl('igfc-lbl-mutuals', 'Mutuals');
        setLbl('igfc-lbl-lostFollowers', 'Lost Followers');
        setLbl('igfc-lbl-allFollowers', 'All Followers');
        setLbl('igfc-lbl-allFollowing', 'All Following');
        setTabLabel('igfc-tab-nonFollowers', '🚫 Not Following Back');
        setTabLabel('igfc-tab-fans', "💙 You Don't Follow");
        setTabLabel('igfc-tab-allFollowers', '👥 All Followers');
        setTabLabel('igfc-tab-allFollowing', '📤 All Following');
      } else {
        setLbl('igfc-lbl-nonFollowers', 'Not Following Them');
        setLbl('igfc-lbl-fans', "They Don't Follow");
        setLbl('igfc-lbl-mutuals', 'Mutuals');
        setLbl('igfc-lbl-lostFollowers', 'Lost Followers');
        setLbl('igfc-lbl-allFollowers', 'Their Followers');
        setLbl('igfc-lbl-allFollowing', 'Their Following');
        setTabLabel('igfc-tab-nonFollowers', '🚫 Not Following Them');
        setTabLabel('igfc-tab-fans', "💙 They Don't Follow");
        setTabLabel('igfc-tab-allFollowers', '👥 Their Followers');
        setTabLabel('igfc-tab-allFollowing', '📤 Their Following');
      }
      return;
    }

    if (isSelf) {
      setLbl('igfc-lbl-nonFollowers', 'Takip Etmeyen');
      setLbl('igfc-lbl-fans', 'Takip Etmediğin');
      setLbl('igfc-lbl-mutuals', 'Karşılıklı');
      setLbl('igfc-lbl-lostFollowers', 'Yeni Çıkanlar');
      setLbl('igfc-lbl-allFollowers', 'Tüm Takipçiler');
      setLbl('igfc-lbl-allFollowing', 'Tüm Takip Edilen');

      setTitle('igfc-box-nonFollowers', 'Seni takip etmeyenleri göster');
      setTitle('igfc-box-fans', 'Senin takip etmediklerini göster');
      setTitle('igfc-box-mutuals', 'Karşılıklı takipleştiklerini göster');
      setTitle('igfc-box-allFollowers', 'Tüm takipçilerini göster');
      setTitle('igfc-box-allFollowing', 'Tüm takip ettiklerini göster');

      setTabLabel('igfc-tab-nonFollowers', '🚫 Takip Etmeyenler');
      setTabLabel('igfc-tab-fans', '💙 Takip Etmediklerin');
      setTabLabel('igfc-tab-lostFollowers', '📉 Yeni Çıkanlar');
      setTabLabel('igfc-tab-lostFollowing', '➖ Takipten Çıkardıkların');
      setTabLabel('igfc-tab-newFollowing', '➕ Yeni Takip Ettiklerin');
      setTabLabel('igfc-tab-allFollowers', '👥 Tüm Takipçiler');
      setTabLabel('igfc-tab-allFollowing', '📤 Tüm Takip Edilen');
    } else {
      setLbl('igfc-lbl-nonFollowers', 'Onu Takip Etmeyen');
      setLbl('igfc-lbl-fans', 'Onun Takip Etmediği');
      setLbl('igfc-lbl-mutuals', 'Karşılıklı');
      setLbl('igfc-lbl-lostFollowers', 'Takipten Çıkanlar');
      setLbl('igfc-lbl-allFollowers', 'Hesabın Takipçileri');
      setLbl('igfc-lbl-allFollowing', 'Takip Ettikleri');

      setTitle('igfc-box-nonFollowers', `${uname} hesabını geri takip etmeyenler`);
      setTitle('igfc-box-fans', `${uname} hesabının geri takip etmedikleri`);
      setTitle('igfc-box-mutuals', `${uname} ile karşılıklı takipleşenler`);
      setTitle('igfc-box-allFollowers', `${uname} hesabının tüm takipçileri`);
      setTitle('igfc-box-allFollowing', `${uname} hesabının tüm takip ettikleri`);

      setTabLabel('igfc-tab-nonFollowers', '🚫 Onu Takip Etmeyenler');
      setTabLabel('igfc-tab-fans', '💙 Onun Takip Etmedikleri');
      setTabLabel('igfc-tab-lostFollowers', '📉 Takipten Çıkanlar');
      setTabLabel('igfc-tab-lostFollowing', '➖ Takipten Çıkardıkları');
      setTabLabel('igfc-tab-newFollowing', '➕ Yeni Takip Ettikleri');
      setTabLabel('igfc-tab-allFollowers', '👥 Takipçileri');
      setTabLabel('igfc-tab-allFollowing', '📤 Takip Ettikleri');
    }
  }

  function updateStatsUI() {
    updatePerspectiveLabels();
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setTxt('igfc-stat-nonfollowers', state.nonFollowers.length);
    setTxt('igfc-stat-suspicious', state.suspicious.length);
    setTxt('igfc-stat-fans', state.fans.length);
    setTxt('igfc-stat-mutuals', state.mutuals.length);
    setTxt('igfc-stat-lost', state.lostFollowers.length);
    const flwDisplay =
      typeof state.expectedFollowersCount === 'number' && state.expectedFollowersCount > 0 && state.followers.length !== state.expectedFollowersCount
        ? `${state.followers.length} / ${state.expectedFollowersCount}`
        : `${state.followers.length}`;
    const flwingDisplay =
      typeof state.expectedFollowingCount === 'number' && state.expectedFollowingCount > 0 && state.following.length !== state.expectedFollowingCount
        ? `${state.following.length} / ${state.expectedFollowingCount}`
        : `${state.following.length}`;

    setTxt('igfc-stat-followers', flwDisplay);
    setTxt('igfc-stat-following', flwingDisplay);

    setTxt('igfc-cnt-nonFollowers', state.nonFollowers.length);
    setTxt('igfc-cnt-suspicious', state.suspicious.length);
    setTxt('igfc-cnt-fans', state.fans.length);
    setTxt('igfc-cnt-mutuals', state.mutuals.length);
    setTxt('igfc-cnt-allFollowers', state.followers.length);
    setTxt('igfc-cnt-allFollowing', state.following.length);
    setTxt('igfc-cnt-lostFollowers', state.lostFollowers.length);
    setTxt('igfc-cnt-newFollowers', state.newFollowers.length);
    setTxt('igfc-cnt-lostFollowing', state.lostFollowing.length);
    setTxt('igfc-cnt-newFollowing', state.newFollowing.length);
    setTxt('igfc-cnt-favorites', state.favorites.size);
    setTxt('igfc-cnt-whitelist', state.whitelist.size);
    setTxt('igfc-cnt-history', state.unfollowHistory.length);
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    state.renderLimit = 200;
    state.selectedIds.clear();
    state.lastClickedIndex = -1;
    updateBulkButtons();

    document.querySelectorAll('.igfc-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.igfc-stat-box').forEach((b) => {
      b.classList.toggle('active', b.dataset.statTab === tabName);
    });
    renderList();
  }

  function getActiveList() {
    switch (state.activeTab) {
      case 'nonFollowers':
        return state.nonFollowers;
      case 'suspicious':
        return state.suspicious;
      case 'fans':
        return state.fans;
      case 'mutuals':
        return state.mutuals;
      case 'lostFollowers':
        return state.lostFollowers;
      case 'newFollowers':
        return state.newFollowers;
      case 'lostFollowing':
        return state.lostFollowing;
      case 'newFollowing':
        return state.newFollowing;
      case 'allFollowers':
        return state.followers;
      case 'allFollowing':
        return state.following;
      case 'favorites': {
        const mapFav = new Map();
        [...state.following, ...state.followers].forEach((u) => mapFav.set(String(u.id), u));
        return [...state.favorites].map(
          (id) => mapFav.get(String(id)) || { id, username: `user_${id}`, full_name: 'Favori Hesap' }
        );
      }
      case 'whitelist': {
        const map = new Map();
        [...state.following, ...state.followers].forEach((u) => map.set(String(u.id), u));
        return [...state.whitelist].map(
          (id) => map.get(String(id)) || { id, username: `user_${id}`, full_name: 'Korunan Hesap' }
        );
      }
      case 'history':
        return state.unfollowHistory;
      default:
        return state.nonFollowers;
    }
  }

  function getFilteredAndSortedList() {
    let list = [...getActiveList()];
    const q = state.searchQuery.trim().toLowerCase();

    if (q) {
      const tokens = q.split(',').map((t) => t.trim()).filter(Boolean);
      const includeTerms = tokens.filter((t) => !t.startsWith('!'));
      const excludeTerms = tokens.filter((t) => t.startsWith('!') && t.length > 1).map((t) => t.slice(1));

      list = list.filter((u) => {
        const hay = `${u.username || ''} ${u.full_name || ''} ${u.id || ''} ${getUserNote(u.id) || ''} ${getUserTag(u.id) || ''}`.toLowerCase();
        if (excludeTerms.some((ex) => hay.includes(ex))) return false;
        if (includeTerms.length === 0) return true;
        return includeTerms.some((inc) => hay.includes(inc));
      });
    }

    if (state.filterType === 'verified') list = list.filter((u) => u.is_verified);
    else if (state.filterType === 'unverified') list = list.filter((u) => !u.is_verified);
    else if (state.filterType === 'private') list = list.filter((u) => u.is_private);
    else if (state.filterType === 'public') list = list.filter((u) => !u.is_private);
    else if (state.filterType === 'suspicious') list = list.filter((u) => (u.suspicionScore || 0) >= 45);
    else if (state.filterType === 'whitelist') list = list.filter((u) => isWhitelisted(u.id));
    else if (state.filterType === 'hasNote' || state.filterType === 'noted') {
      list = list.filter((u) => Boolean(getUserNote(u.id)));
    } else if (state.filterType.startsWith('tag:')) {
      const targetTag = state.filterType.slice(4);
      list = list.filter((u) => getUserTag(u.id) === targetTag);
    }

    if (state.sortBy === 'oldest') {
      list.reverse();
    } else if (state.sortBy === 'az') {
      list.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    } else if (state.sortBy === 'za') {
      list.sort((a, b) => (b.username || '').localeCompare(a.username || ''));
    } else if (state.sortBy === 'name') {
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    } else if (state.sortBy === 'suspicious') {
      list.sort((a, b) => (b.suspicionScore || 0) - (a.suspicionScore || 0));
    }

    return list;
  }

  function toggleCardSelection(index, uid, checked, shiftKey, currentVisibleList) {
    if (shiftKey && state.lastClickedIndex !== -1 && state.lastClickedIndex !== index) {
      const start = Math.min(state.lastClickedIndex, index);
      const end = Math.max(state.lastClickedIndex, index);
      for (let i = start; i <= end; i++) {
        const item = currentVisibleList[i];
        if (!item) continue;
        const itemUid = String(item.id);
        if (checked && !isWhitelisted(itemUid)) {
          state.selectedIds.add(itemUid);
        } else if (!checked) {
          state.selectedIds.delete(itemUid);
        }
      }
      state.lastClickedIndex = index;
      renderList();
      updateBulkButtons();
      return;
    }

    state.lastClickedIndex = index;
    if (checked && !isWhitelisted(uid)) state.selectedIds.add(uid);
    else state.selectedIds.delete(uid);
    updateBulkButtons();
  }

  function openInspect(user) {
    openUserDetailModal(user);
  }

  function renderUserCard(u, index, currentVisibleList, followingIds, followerIds) {
    const uid = String(u.id);
    const isSelected = state.selectedIds.has(uid);
    const isProtected = isWhitelisted(uid);
    const isFav = isFavorite(uid);
    const note = getUserNote(uid);
    const userTag = getUserTag(uid);
    const isLastFollowed = state.following[0] && String(state.following[0].id) === uid;
    const isLastFollower = state.followers[0] && String(state.followers[0].id) === uid;

    const youFollow = followingIds.has(uid);
    const followsYou = followerIds.has(uid);

    const card = document.createElement('div');
    card.className = `igfc-user-card${isSelected ? ' selected' : ''}`;
    card.dataset.userid = uid;

    let historyInfoHtml = '';
    if (state.activeTab === 'history' && u.timestamp) {
      const dt = new Date(u.timestamp).toLocaleString('tr-TR');
      const actLabel =
        u.actionType === 'follow'
          ? '➕ Takip Edildi'
          : u.actionType === 'remove_follower' || u.actionType === 'remove_last_follower'
          ? '❌ Takipçilerden Çıkarıldı'
          : '🚫 Takipten Çıkarıldı';
      historyInfoHtml = `<div style="color:#a78bfa;font-size:11px;">🕒 ${actLabel} • ${escapeHtml(dt)}</div>`;
    }

    card.innerHTML = `
      <div class="igfc-card-top">
        <input type="checkbox" class="igfc-card-check" ${isSelected ? 'checked' : ''} title="Seç (Shift tuşu ile aralık seçimi)" />
        <img class="igfc-avatar" alt="@${escapeHtml(u.username)}" title="Canlı profil detayını incele" />
        <div class="igfc-card-info">
          <div>
            <a href="https://www.instagram.com/${encodeURIComponent(u.username)}/" target="_blank" rel="noopener noreferrer" class="igfc-username">
              @${escapeHtml(u.username)}
            </a>
            ${u.is_verified ? '<span class="igfc-tag-verified" title="Onaylı Hesap">✓ Onaylı</span>' : ''}
            ${u.is_private ? '<span class="igfc-tag-private" title="Gizli Hesap">🔒 Gizli</span>' : ''}
          </div>
          <div class="igfc-fullname">${escapeHtml(u.full_name || 'İsim belirtilmemiş')}</div>
          <div class="igfc-userid">ID: ${escapeHtml(uid)}</div>
          <div>
            ${isLastFollowed ? '<span class="igfc-tag-last">🕒 Son Takip Edilen (#1)</span>' : ''}
            ${isLastFollower ? '<span class="igfc-tag-last">🆕 Son Takipçi (#1)</span>' : ''}
          </div>
          ${u.suspicionScore >= 45 ? `<div style="color:#f87171;font-size:11px;">⚠️ Şüphe: %${u.suspicionScore} (${escapeHtml((u.suspicionReasons || []).join(', '))})</div>` : ''}
          ${note ? `<div style="color:#38bdf8;font-size:11px;">📝 ${escapeHtml(note)}</div>` : ''}
          ${historyInfoHtml}
        </div>
      </div>
      <div class="igfc-card-actions">
        <button class="igfc-btn igfc-btn-secondary igfc-act-inspect" title="Canlı profil ve biyografi incele">🔍 İncele</button>
        <select class="igfc-select igfc-act-tag" style="padding:3px 6px;font-size:11px;" title="Kategori Etiketi Ata">
          <option value="">🏷️ Etiket</option>
          <option value="Arkadaş" ${userTag === 'Arkadaş' ? 'selected' : ''}>🟢 Arkadaş</option>
          <option value="İş" ${userTag === 'İş' ? 'selected' : ''}>🔵 İş</option>
          <option value="Aile" ${userTag === 'Aile' ? 'selected' : ''}>🟣 Aile</option>
          <option value="VIP" ${userTag === 'VIP' ? 'selected' : ''}>⭐ VIP</option>
        </select>
        <button class="igfc-btn ${isFav ? 'igfc-btn-primary' : 'igfc-btn-secondary'} igfc-act-fav" title="Favorilere ekle/çıkar">
          ${isFav ? '💛 Favori' : '🤍 Favori'}
        </button>
        <button class="igfc-btn ${isProtected ? 'igfc-btn-warning' : 'igfc-btn-secondary'} igfc-act-whitelist" title="Koruma listesine ekle/çıkar">
          ${isProtected ? '★ Korunuyor' : '☆ Koru'}
        </button>
        ${
          youFollow
            ? `<button class="igfc-btn igfc-btn-danger igfc-act-unfollow" ${isProtected ? 'disabled' : ''}>🚫 Takipten Çık</button>`
            : `<button class="igfc-btn igfc-btn-success igfc-act-follow">➕ Takip Et</button>`
        }
        ${
          followsYou && (state.activeTab === 'fans' || state.activeTab === 'allFollowers' || state.activeTab === 'suspicious')
            ? `<button class="igfc-btn igfc-btn-warning igfc-act-remove-follower" ${isProtected ? 'disabled' : ''} title="Seni takip etmesini engelle / takipçilerden çıkar">❌ Takipçiden Çıkar</button>`
            : ''
        }
      </div>
    `;

    hydrateAvatarImage(card.querySelector('.igfc-avatar'), u);

    const checkbox = card.querySelector('.igfc-card-check');
    checkbox?.addEventListener('click', (e) => {
      toggleCardSelection(index, uid, e.target.checked, e.shiftKey, currentVisibleList);
      card.classList.toggle('selected', state.selectedIds.has(uid));
    });

    card.querySelector('.igfc-avatar')?.addEventListener('click', () => openInspect(u));
    card.querySelector('.igfc-act-inspect')?.addEventListener('click', () => openInspect(u));
    card.querySelector('.igfc-act-tag')?.addEventListener('change', (e) => {
      setUserTag(uid, e.target.value);
      showToast(`@${u.username} etiketi güncellendi.`, 'info');
    });

    card.querySelector('.igfc-act-fav')?.addEventListener('click', () => {
      toggleFavorite(uid);
      renderList();
    });

    card.querySelector('.igfc-act-whitelist')?.addEventListener('click', () => {
      toggleWhitelist(uid);
      renderList();
    });

    card.querySelector('.igfc-act-unfollow')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳...';
      try {
        await unfollowUser(uid);
        saveUnfollowHistory(u, 'unfollow');
        state.following = state.following.filter((item) => String(item.id) !== uid);
        state.selectedIds.delete(uid);
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${u.username} takipten çıkarıldı.`, 'success');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '🚫 Takipten Çık';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    card.querySelector('.igfc-act-follow')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳...';
      try {
        await followUser(uid);
        saveUnfollowHistory(u, 'follow');
        if (!state.following.some((item) => String(item.id) === uid)) {
          state.following.unshift(u);
        }
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${u.username} takip edildi.`, 'success');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '➕ Takip Et';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    card.querySelector('.igfc-act-remove-follower')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳...';
      try {
        await removeFollowerUser(uid);
        saveUnfollowHistory(u, 'remove_follower');
        state.followers = state.followers.filter((item) => String(item.id) !== uid);
        state.selectedIds.delete(uid);
        computeCategories();
        saveLastScanCache();
        renderList();
        showToast(`@${u.username} takipçilerden çıkarıldı.`, 'success');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '❌ Takipçiden Çıkar';
        showToast(`Hata: ${err.message}`, 'error');
      }
    });

    return card;
  }

  function renderList() {
    const container = document.getElementById('igfc-list-container');
    if (!container) return;
    container.innerHTML = '';

    const users = getFilteredAndSortedList();
    if (users.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);';
      if (state.lastRateLimitError && state.followers.length === 0 && state.following.length === 0) {
        empty.style.color = '#f87171';
        empty.innerHTML = `
          <div style="font-size:26px;margin-bottom:8px;">⛔</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Hata: Instagram Hız Sınırı (HTTP 429 – Too Many Requests)</div>
          <div style="font-size:12.5px;max-width:560px;margin:0 auto;line-height:1.5;color:var(--text-secondary);">${escapeHtml(state.lastRateLimitError)}</div>
        `;
      } else {
        empty.textContent = 'Bu sekmede veya filtrede gösterilecek kullanıcı bulunamadı.';
      }
      container.appendChild(empty);
      return;
    }

    const followingIds = new Set(state.following.map((item) => String(item.id)));
    const followerIds = new Set(state.followers.map((item) => String(item.id)));

    const limit = state.renderLimit || 200;
    const fragment = document.createDocumentFragment();
    users.slice(0, limit).forEach((u, idx) => {
      fragment.appendChild(renderUserCard(u, idx, users, followingIds, followerIds));
    });

    if (users.length > limit) {
      const remaining = users.length - limit;
      const loadMoreWrap = document.createElement('div');
      loadMoreWrap.style.cssText = 'grid-column: 1 / -1; display: flex; justify-content: center; gap: 10px; padding: 12px 0;';
      loadMoreWrap.innerHTML = `
        <button id="igfc-load-more-btn" class="igfc-btn igfc-btn-primary">⬇ Daha Fazla Göster (+${Math.min(remaining, 200)} / Kalan: ${remaining})</button>
        <button id="igfc-load-all-btn" class="igfc-btn igfc-btn-secondary">📋 Tümünü Göster (${users.length})</button>
      `;
      loadMoreWrap.querySelector('#igfc-load-more-btn')?.addEventListener('click', () => {
        state.renderLimit = limit + 200;
        renderList();
      });
      loadMoreWrap.querySelector('#igfc-load-all-btn')?.addEventListener('click', () => {
        state.renderLimit = users.length + 100;
        renderList();
      });
      fragment.appendChild(loadMoreWrap);
    }

    container.appendChild(fragment);
  }

  // ============================================================================
  // TARAMA (START / STOP SCAN) VE TOPLU İŞLEM (BULK ACTION) MOTORU
  // ============================================================================

  function stopScan() {
    state.bulkAbort = true;
    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (_) {}
      state.abortController = null;
    }
    state.isRunning = false;
    state.isBulkRunning = false;
    const stopBtn = document.getElementById('igfc-stop-btn');
    if (stopBtn) stopBtn.disabled = true;
    updateStatus('İşlem kullanıcı tarafından durduruldu.');
  }

  async function startScan(forceMyAccount = false) {
    if (state.isRunning) return;
    state.isRunning = true;
    state.abortController = new AbortController();
    clearRateLimitError();

    const startBtn = document.getElementById('igfc-start-btn');
    const myBtn = document.getElementById('igfc-my-account-btn');
    const stopBtn = document.getElementById('igfc-stop-btn');
    const inputEl = document.getElementById('igfc-username-input');

    if (startBtn) startBtn.disabled = true;
    if (myBtn) myBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    try {
      let targetUsername = (inputEl?.value || '').trim().replace(/^@/, '');
      let targetUserId = '';
      let expectedFollowers = null;
      let expectedFollowing = null;
      let isPrivateTarget = false;
      let followedByViewer = null;

      const cookieUserId = getCookie('ds_user_id');
      const viewer = getLoggedInViewerFromDOM();
      let isScanningSelf =
        forceMyAccount ||
        !targetUsername ||
        Boolean(viewer?.username && viewer.username.toLowerCase() === targetUsername.toLowerCase());

      if (isScanningSelf && cookieUserId) {
        targetUserId = String(cookieUserId);
        targetUsername = viewer?.username || (forceMyAccount ? '' : targetUsername) || 'aktif_hesap';
        if (inputEl && targetUsername !== 'aktif_hesap') inputEl.value = targetUsername;
        const domSelf = targetUsername !== 'aktif_hesap' ? extractStrictProfileFromScripts(targetUsername) : null;
        if (domSelf) {
          expectedFollowers = domSelf.followerCount;
          expectedFollowing = domSelf.followingCount;
          isPrivateTarget = Boolean(domSelf.isPrivate);
        }
        const domSelfCounts = targetUsername !== 'aktif_hesap' ? extractVisibleCountsFromDOM(targetUsername) : null;
        if (expectedFollowers == null && domSelfCounts?.followerCount != null) expectedFollowers = domSelfCounts.followerCount;
        if (expectedFollowing == null && domSelfCounts?.followingCount != null) expectedFollowing = domSelfCounts.followingCount;
        if ((expectedFollowers == null || expectedFollowing == null) && targetUsername !== 'aktif_hesap') {
          const selfWeb = await fetchProfileViaWebInfo(targetUsername, false);
          if (selfWeb) {
            if (expectedFollowers == null && selfWeb.followerCount != null) expectedFollowers = selfWeb.followerCount;
            if (expectedFollowing == null && selfWeb.followingCount != null) expectedFollowing = selfWeb.followingCount;
          }
        }
      } else {
        updateStatus(`@${targetUsername || 'hesap'} profil detayları çözümleniyor...`);
        updateProgress(5);
        const profile = await resolveUserProfile(targetUsername);
        targetUserId = profile.id;
        targetUsername = profile.username;
        expectedFollowers = profile.followerCount;
        expectedFollowing = profile.followingCount;
        isPrivateTarget = Boolean(profile.isPrivate);
        followedByViewer = profile.followedByViewer;
        if (inputEl) inputEl.value = targetUsername;
      }

      if (cookieUserId && String(targetUserId) === String(cookieUserId)) {
        isScanningSelf = true;
      }

      if (!isScanningSelf && isPrivateTarget) {
        if (followedByViewer == null) {
          followedByViewer = await checkViewerFollowsUser(targetUserId);
        }
        if (followedByViewer === false) {
          throw new Error(
            `"@${targetUsername}" gizli bir hesap ve şu an bu hesabı takip etmiyorsunuz. Takip etmediğiniz gizli hesapların listesi Instagram tarafından paylaşılmaz.`
          );
        }
        addLog(`🔒 Takip ettiğiniz gizli hesap tespit edildi (@${targetUsername}). Gizli hesap uyumlu çoklu tamamlama modu aktif.`, 'info');
      }

      const domCounts = extractVisibleCountsFromDOM(targetUsername);
      if (expectedFollowers == null && domCounts?.followerCount != null) expectedFollowers = domCounts.followerCount;
      if (expectedFollowing == null && domCounts?.followingCount != null) expectedFollowing = domCounts.followingCount;

      // Yeni tarama başlarken eski verileri sıfırla ki sayaçlar canlı olarak 0'dan artsın
      state.isScanningSelf = isScanningSelf;
      state.username = targetUsername;
      state.userId = targetUserId;
      state.expectedFollowersCount = expectedFollowers;
      state.expectedFollowingCount = expectedFollowing;
      state.followers = [];
      state.following = [];
      state.nonFollowers = [];
      state.fans = [];
      state.mutuals = [];
      state.suspicious = [];
      state.lostFollowers = [];
      state.newFollowers = [];
      state.lostFollowing = [];
      state.newFollowing = [];
      state.selectedIds.clear();
      updateStatsUI();
      updateBulkButtons();
      renderList();

      addLog(
        `Tarama başladı: @${targetUsername} (ID: ${targetUserId}${isPrivateTarget ? ', Gizli Hesap' : ''}${
          expectedFollowers != null || expectedFollowing != null
            ? `, Beklenen: ${expectedFollowers ?? '?'} takipçi / ${expectedFollowing ?? '?'} takip`
            : ''
        })`,
        'info'
      );

      let lastLiveRender = 0;
      const triggerLiveUpdate = () => {
        computeCategories();
        const now = Date.now();
        if (now - lastLiveRender > 600) {
          lastLiveRender = now;
          renderList();
        }
      };

      const fetchOpts = { isScanningSelf, isPrivate: isPrivateTarget };

      const followers = await fetchFriendshipList(
        targetUserId,
        'followers',
        expectedFollowers,
        10,
        55,
        (liveList) => {
          state.followers = liveList;
          triggerLiveUpdate();
        },
        fetchOpts
      );
      state.followers = followers;
      computeCategories();
      renderList();

      const following = await fetchFriendshipList(
        targetUserId,
        'following',
        expectedFollowing,
        55,
        95,
        (liveList) => {
          state.following = liveList;
          triggerLiveUpdate();
        },
        fetchOpts
      );
      state.following = following;
      state.lastScannedAt = new Date().toISOString();
      computeCategories();

      // Kendi hesabımızda HEM "Takip Etmeyen" HEM "Takip Etmediğin" listelerini Instagram'ın gerçek ilişki tablosuyla (show_many) %100 kesin doğrula
      if (isScanningSelf && !state.lastRateLimitError) {
        const verifyPoolMap = new Map();
        for (const u of [...state.nonFollowers, ...state.fans]) {
          const uid = String(u?.id || '');
          if (/^\d+$/.test(uid) && !verifyPoolMap.has(uid)) {
            verifyPoolMap.set(uid, u);
          }
        }
        const verifyList = Array.from(verifyPoolMap.values());
        if (verifyList.length > 0 && verifyList.length <= 400) {
          updateStatus(`🔍 İlişki doğrulaması yapılıyor (${verifyList.length} kişi kontrol ediliyor)...`);
          try {
            const flwMap = new Map(state.followers.map((u) => [String(u.id), u]));
            const flwingMap = new Map(state.following.map((u) => [String(u.id), u]));
            const jazoestVal = getJazoest(getAppCSRFToken());
            let fixedCount = 0;

            for (let i = 0; i < verifyList.length; i += 50) {
              if (state.lastRateLimitError || state.abortController?.signal.aborted) break;
              const chunk = verifyList.slice(i, i + 50);
              const ids = chunk.map((u) => String(u.id));
              const res = await fetchWithRetry(
                'https://www.instagram.com/api/v1/friendships/show_many/',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                  body: `user_ids=${ids.join(',')}&jazoest=${encodeURIComponent(jazoestVal)}`,
                },
                0
              );
              if (res && res.ok) {
                const data = await safeParseJson(res);
                const statuses = data?.friendship_statuses || {};
                for (const u of chunk) {
                  const uid = String(u.id);
                  const st = statuses[uid];
                  if (!st) continue;

                  // Gerçekte seni takip ediyorsa followers listesinde mutlaka olmalı
                  if (st.followed_by === true && !flwMap.has(uid)) {
                    flwMap.set(uid, { ...u, followOrderIndex: flwMap.size });
                    fixedCount++;
                  } else if (st.followed_by === false && flwMap.has(uid)) {
                    // Gerçekte seni takip etmiyorsa (eski/işaretli kayıt) followers'tan çıkar
                    flwMap.delete(uid);
                    fixedCount++;
                  }

                  // Gerçekte sen onu takip ediyorsan following listesinde mutlaka olmalı
                  if (st.following === true && !flwingMap.has(uid)) {
                    flwingMap.set(uid, { ...u, followOrderIndex: flwingMap.size });
                    fixedCount++;
                  } else if (st.following === false && flwingMap.has(uid)) {
                    // Gerçekte sen onu takip etmiyorsan following'den çıkar
                    flwingMap.delete(uid);
                    fixedCount++;
                  }
                }
              }
              if (i + 50 < verifyList.length) await sleep(350);
            }

            if (fixedCount > 0) {
              state.followers = Array.from(flwMap.values()).map((u, idx) => ({ ...u, followOrderIndex: idx }));
              state.following = Array.from(flwingMap.values()).map((u, idx) => ({ ...u, followOrderIndex: idx }));
              addLog(`✅ Kesin İlişki Doğrulaması: ${fixedCount} yanlış eşleşme düzeltildi.`, 'success');
            }
          } catch (err) {
            if (err.name === 'AbortError') throw err;
          }
        }
      }

      compareAndSaveSnapshot(targetUserId, state.followers, state.following);
      computeCategories();
      saveLastScanCache();
      saveScanHistory();
      renderList();

      const flwGap =
        typeof state.expectedFollowersCount === 'number' && state.expectedFollowersCount > state.followers.length
          ? state.expectedFollowersCount - state.followers.length
          : 0;
      const flwingGap =
        typeof state.expectedFollowingCount === 'number' && state.expectedFollowingCount > state.following.length
          ? state.expectedFollowingCount - state.following.length
          : 0;

      updateProgress(100);
      const gapNote =
        flwGap > 0 || flwingGap > 0
          ? ` (Not: Instagram ${flwGap > 0 ? `${flwGap} takipçi` : ''}${flwGap > 0 && flwingGap > 0 ? ', ' : ''}${flwingGap > 0 ? `${flwingGap} takip edilen` : ''} kaydı gizli/askıya alınmış olabilir)`
          : '';
      const nfLabel = isScanningSelf ? 'Seni Takip Etmeyen' : 'Onu Takip Etmeyen';
      updateStatus(
        `Tamamlandı! Takipçi: ${state.followers.length}${state.expectedFollowersCount ? `/${state.expectedFollowersCount}` : ''} | Takip Edilen: ${state.following.length}${state.expectedFollowingCount ? `/${state.expectedFollowingCount}` : ''} | ${nfLabel}: ${state.nonFollowers.length}${gapNote}`
      );
      addLog(
        `✅ Tarama tamamlandı: ${state.followers.length} takipçi, ${state.following.length} takip edilen, ${state.nonFollowers.length} geri takip etmeyen.${gapNote}`,
        'success'
      );
      showToast(`Tarama tamamlandı! ${state.nonFollowers.length} kişi geri takip etmiyor.`, 'success');
    } catch (err) {
      if (err.name === 'AbortError') {
        if (state.lastRateLimitError) {
          updateStatus('⛔ Tarama durduruldu: Hem Web hem Mobil modda Instagram HTTP 429 hız sınırı algılandı.');
        } else {
          addLog('⏹ Tarama kullanıcı tarafından iptal edildi.', 'warn');
        }
        renderList();
      } else {
        addLog(`❌ Tarama hatası: ${err.message}`, 'error');
        updateStatus(`Hata: ${err.message}`);
        showToast(err.message, 'error');
      }
    } finally {
      state.isRunning = false;
      state.abortController = null;
      if (startBtn) startBtn.disabled = false;
      if (myBtn) myBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    }
  }

  async function runBulkAction(actionType = 'unfollow') {
    if (state.selectedIds.size === 0) return;

    if (actionType === 'whitelist') {
      state.selectedIds.forEach((id) => state.whitelist.add(String(id)));
      state.selectedIds.clear();
      saveWhitelist();
      updateStatsUI();
      renderList();
      updateBulkButtons();
      showToast('Seçili hesaplar koruma listesine eklendi.', 'success');
      return;
    }

    if (state.isBulkRunning) return;
    state.isBulkRunning = true;
    state.bulkAbort = false;

    const speed = SPEED_CONFIGS[state.speedMode] || SPEED_CONFIGS.safe;
    const stopBtn = document.getElementById('igfc-stop-btn');
    if (stopBtn) stopBtn.disabled = false;

    const allKnownMap = new Map();
    [...state.following, ...state.followers, ...getActiveList()].forEach((u) => {
      if (u && u.id) allKnownMap.set(String(u.id), u);
    });

    const targets = [...state.selectedIds]
      .filter((id) => !isWhitelisted(id))
      .map((id) => allKnownMap.get(String(id)))
      .filter(Boolean);

    let completed = 0;
    try {
      for (const user of targets) {
        if (state.bulkAbort) break;
        try {
          if (actionType === 'unfollow') {
            await unfollowUser(user.id);
            saveUnfollowHistory(user, 'unfollow');
            state.following = state.following.filter((u) => String(u.id) !== String(user.id));
          } else if (actionType === 'follow') {
            await followUser(user.id);
            saveUnfollowHistory(user, 'follow');
            if (!state.following.some((u) => String(u.id) === String(user.id))) {
              state.following.unshift(user);
            }
          } else if (actionType === 'remove_follower') {
            await removeFollowerUser(user.id);
            saveUnfollowHistory(user, 'remove_follower');
            state.followers = state.followers.filter((u) => String(u.id) !== String(user.id));
          }

          state.selectedIds.delete(String(user.id));
          completed++;

          const pct = Math.round((completed / targets.length) * 100);
          updateProgress(pct);
          updateStatus(`İşleniyor (@${user.username}): ${completed}/${targets.length}`);
          computeCategories();
          renderList();
          updateBulkButtons();

          if (state.autoCooldown && completed % speed.batchSize === 0 && completed < targets.length) {
            addLog(`🛡️ Anti-Ban molası: ${speed.batchPauseSec} sn bekleniyor...`, 'warn');
            updateStatus(`Güvenlik molası: ${speed.batchPauseSec} sn bekleniyor...`);
            await sleep(speed.batchPauseSec * 1000);
          } else if (completed < targets.length) {
            await sleep(getRateLimitDelay('action'));
          }
        } catch (err) {
          addLog(`❌ İşlem hatası (@${user.username}): ${err.message}`, 'error');
        }
      }
    } finally {
      saveLastScanCache();
      state.isBulkRunning = false;
      if (stopBtn) stopBtn.disabled = true;
      showToast(`Toplu işlem tamamlandı (${completed}/${targets.length}).`, 'success');
    }
  }

  // ============================================================================
  // KOPYALAMA VE DIŞA AKTARMA (CSV / JSON)
  // ============================================================================

  async function copyListToClipboard() {
    const list = getFilteredAndSortedList();
    if (!list.length) {
      showToast('Kopyalanacak kullanıcı bulunamadı.', 'warning');
      return;
    }
    const text = list.map((u) => `@${u.username}`).join('\n');
    const ok = await copyTextSafe(text);
    if (ok) showToast(`${list.length} kullanıcı adı panoya kopyalandı.`, 'success');
    else showToast('Panoya kopyalanamadı.', 'error');
  }

  function exportToCSV() {
    const list = getFilteredAndSortedList();
    if (!list.length) {
      showToast('Dışa aktarılacak veri yok.', 'warning');
      return;
    }
    const headers = ['ID', 'Username', 'Full Name', 'Verified', 'Private', 'Suspicion Score', 'Note', 'Profile URL'];
    const rows = list.map((u) => [
      `"${u.id}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      u.is_verified ? 'Yes' : 'No',
      u.is_private ? 'Yes' : 'No',
      u.suspicionScore || 0,
      `"${(getUserNote(u.id) || '').replace(/"/g, '""')}"`,
      `"https://www.instagram.com/${u.username}/"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-follow-check-${state.username || 'export'}-${state.activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV dosyası indirildi.', 'success');
  }

  function exportToJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      username: state.username,
      userId: state.userId,
      counts: {
        followers: state.followers.length,
        following: state.following.length,
        nonFollowers: state.nonFollowers.length,
        fans: state.fans.length,
        mutuals: state.mutuals.length,
        suspicious: state.suspicious.length,
        lostFollowers: state.lostFollowers.length,
        newFollowers: state.newFollowers.length,
      },
      lastFollowedPerson: getLastFollowedPerson(),
      lastFollowerPerson: getLastFollowerPerson(),
      followers: state.followers,
      following: state.following,
      nonFollowers: state.nonFollowers,
      fans: state.fans,
      mutuals: state.mutuals,
      suspicious: state.suspicious,
      lostFollowers: state.lostFollowers,
      newFollowers: state.newFollowers,
      whitelist: [...state.whitelist],
      userNotes: state.userNotes,
      unfollowHistory: state.unfollowHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-follow-check-${state.username || 'export'}-full.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON raporu indirildi.', 'success');
  }

  // ============================================================================
  // BAŞLATMA (INITIALIZATION) — KONSOL VE USERSCRIPT (TAMPERMONKEY / MOBİL) UYUMLU
  // ============================================================================

  function openMainApp() {
    if (document.getElementById(EXISTING_ID)) {
      if (state.isMinimized) toggleMinimize();
      return;
    }
    loadSettings();
    getWhitelist();
    getNotes();
    loadUserTags();
    loadFavorites();
    loadUnfollowHistory();
    getScanHistory();
    const hasCache = loadLastScanCache();
    createUI();
    if (hasCache) {
      computeCategories();
      renderList();
      updateCacheInfoUI();
      addLog(`Önbellekten son tarama yüklendi: @${state.username}`, 'info');
    }
  }

  function mountUserscriptLauncher() {
    if (document.getElementById('igfc-launcher-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'igfc-launcher-fab';
    fab.type = 'button';
    fab.textContent = '📸 IG Checker';
    fab.title = 'Instagram Follow Checker Pro aç';
    fab.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:16px',
      'z-index:999998',
      'background:linear-gradient(135deg,#6366f1,#ec4899)',
      'color:#ffffff',
      'border:1px solid rgba(255,255,255,0.28)',
      'border-radius:999px',
      'padding:9px 14px',
      'font-size:12.5px',
      'font-weight:700',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,0.38)',
      'cursor:pointer',
      'touch-action:manipulation',
    ].join(';');
    fab.addEventListener('click', () => {
      openMainApp();
    });
    document.body.appendChild(fab);
  }

  const isUserscriptEnv =
    typeof GM_info !== 'undefined' ||
    typeof GM_registerMenuCommand === 'function' ||
    typeof GM_xmlhttpRequest === 'function';

  if (typeof GM_registerMenuCommand === 'function') {
    try {
      GM_registerMenuCommand('📸 IG Follow Checker Pro Aç', openMainApp);
    } catch (_) {}
  }

  if (isUserscriptEnv) {
    mountUserscriptLauncher();
  } else {
    openMainApp();
  }
})();
