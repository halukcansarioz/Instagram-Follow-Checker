(() => {
  document.getElementById("igTrackerPanel")?.remove();
  document.getElementById("igTrackerStyle")?.remove();

  const APP_ID = "936619743392459";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let isCancelled = false;
  let activeTab = "notFollowingBack";

  let cachedResults = {
    followersCount: 0,
    followingCount: 0,
    loadedFollowersCount: 0,
    loadedFollowingCount: 0,
    followers: [],
    following: [],
    notFollowingBack: [],
    followersNotFollowedBack: [],
    mutuals: [],
    newFollowers: [],
    lostFollowers: [],
    newNotFollowingBack: []
  };

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(";").shift() : "";
  }

  const myUserId = String(getCookie("ds_user_id") || "");
  const requestRankToken = `${myUserId || "0"}_${Date.now()}`;
  const csfrToken = getCookie("csrftoken") || "";
  const GRAPHQL_QUERY_OPTIONS = {
    followers: [
      { paramKey: "query_hash", value: "c76146de99bb02f6415203be841dd25a" },
      { paramKey: "query_hash", value: "37479f2b8209594dde7facb0d904896a" },
      { paramKey: "query_id", value: "c76146de99bb02f6415203be841dd25a" },
      { paramKey: "query_id", value: "37479f2b8209594dde7facb0d904896a" }
    ],
    following: [
      { paramKey: "query_hash", value: "d04b0a864b4b54837c0d870b0e77e076" },
      { paramKey: "query_hash", value: "58712303d941c6855d4e888c5f0cd22f" },
      { paramKey: "query_id", value: "d04b0a864b4b54837c0d870b0e77e076" },
      { paramKey: "query_id", value: "58712303d941c6855d4e888c5f0cd22f" }
    ]
  };
  const GRAPHQL_PAGE_SIZE = 50;
  const GRAPHQL_FOLLOWERS_HASHES = [
    "c76146de99bb02f6415203be841dd25a",
    "37479f2b8209594dde7facb0d904896a",
    "97b41c52301f77ce508f55e66d17620e"
  ];
  const GRAPHQL_FOLLOWING_HASHES = [
    "d04b0a864b4b54837c0d870b0e77e076",
    "58712303d941c6855d4e888c5f0cd22f",
    "3dec7e2c57367ef3da3d987d89f9dbc8"
  ];

  const style = document.createElement("style");
  style.id = "igTrackerStyle";
  style.textContent = `
    #igTrackerPanel {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: min(100%, 520px) !important;
      max-height: 90vh !important;
      overflow: auto !important;
      z-index: 999999 !important;
      background: #111827 !important;
      color: white !important;
      padding: 16px !important;
      border-radius: 16px !important;
      box-shadow: 0 0 25px rgba(0,0,0,.5) !important;
      font-family: Arial, sans-serif !important;
    }

    #igTrackerPanel {
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      left: 10px !important;
      width: auto !important;
      max-width: 520px !important;
      max-height: 92vh !important;
      overflow-y: auto !important;
      margin-left: auto !important;
    }

    #igTrackerPanel h2 {
      margin: 0 0 12px !important;
      text-align: center !important;
      color: white !important;
      font-size: 20px !important;
    }

    #igTrackerPanel input {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 54px !important;
      padding: 0 16px !important;
      margin: 0 0 14px 0 !important;
      border: 1px solid #374151 !important;
      border-radius: 14px !important;
      background: #1f2937 !important;
      color: white !important;
      font-size: 15px !important;
      font-weight: 500 !important;
      outline: none !important;
      box-sizing: border-box !important;
    }

    #igTrackerPanel input:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,.25) !important;
    }

    #igUserInput {
      width: 100% !important;
    }

    #igTrackerPanel input::placeholder {
      color: #9ca3af !important;
    }

    #igTrackerPanel button {
      border: none !important;
      border-radius: 14px !important;
      color: white !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-weight: 700 !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15) !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
    }

    #igTrackerPanel button:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18) !important;
    }

    #igStartBtn {
      width: 100% !important;
      padding: 14px 18px !important;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
      font-size: 17px !important;
      font-weight: bold !important;
    }

    #igStopBtn {
      width: 100% !important;
      padding: 14px 18px !important;
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
      font-size: 17px !important;
      font-weight: bold !important;
      margin-top: 8px !important;
    }

    .igControlLabel {
      display: inline-flex !important;
      align-items: center !important;
      gap: 10px !important;
      font-size: 13px !important;
      color: #d1d5db !important;
      background: #111827 !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      padding: 10px 12px !important;
      border-radius: 999px !important;
      transition: background 0.2s ease, border-color 0.2s ease;
      cursor: pointer !important;
    }

    .igControlLabel:hover {
      border-color: rgba(59,130,246,0.45) !important;
      background: rgba(59,130,246,0.08) !important;
    }

    .igFilterBar {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
      margin-top: 12px !important;
      width: 100% !important;
    }

    .igFilterBtn {
      width: 100% !important;
      min-width: 0 !important;
      height: 48px !important;
      padding: 0 12px !important;
      border-radius: 14px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .igFilterBtn:hover {
      background: rgba(255,255,255,0.14) !important;
    }

    .igFilterBtn.active {
      background: #2563eb !important;
      border-color: #2563eb !important;
      color: #ffffff !important;
      box-shadow: 0 12px 24px rgba(37,99,235,0.24) !important;
      transform: translateY(-1px) !important;
    }

    .igControlBar,
    .igSortBar {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 10px !important;
        margin-top: 10px !important;
        width: 100% !important;
        align-items: stretch !important;  
    }

    .igSortBtn,
    .igActionBtn {
      width: 100% !important;
      min-width: 0 !important;
      height: 48px !important;
      padding: 0 12px !important;
      border-radius: 14px !important;
    }
        
    #igHistoryBtn {
      grid-column: 2 / 3 !important;
    }

    #igOpenFirst10Btn {
        grid-column: 1 / 2 !important;
      }

    .igSortBtn.active,
    .igActionBtn.active {
      background: #2563eb !important;
      border-color: #2563eb !important;
      color: #ffffff !important;
      box-shadow: 0 12px 24px rgba(37,99,235,0.24) !important;
      transform: translateY(-1px) !important;
    }

    #igRiskMode option {
      background: #111827;
      color: white;
    }

    .igRiskContainer {
      margin-bottom: 14px !important;
    }

    #igRiskMode {
      width: 100% !important;
      height: 48px !important;
      background: #1f2937 !important;
      color: white !important;
      border: 1px solid #374151 !important;
      border-radius: 14px !important;
      padding: 0 16px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      outline: none !important;
      transition: all .25s ease !important;
    }

    #igRiskMode:hover {
      border-color: #3b82f6 !important;
    }

    #igRiskMode:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,.25) !important;
    }

    .igRiskLabel {
      display: block !important;
      margin-bottom: 8px !important;
      color: #cbd5e1 !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }

    #igCompareSummary {
      margin-top: 12px !important;
      color: #e2e8f0 !important;
      font-size: 13px !important;
      line-height: 1.6 !important;
    }

    #igWarning {
      display: none !important;
      margin-top: 8px !important;
      padding: 10px 12px !important;
      border-radius: 10px !important;
      background: rgba(248,113,113,0.16) !important;
      color: #fecaca !important;
    }

    #igStatus {
      margin-top: 10px !important;
      color: #d1d5db !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
    }

    #igStats {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
      gap: 10px !important;
      margin-top: 12px !important;
    }

    .igStatCard {
      border: 1px solid #374151 !important;
      border-radius: 14px !important;
      height: 170px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
    }

    .igStatTitle {
      height: 40px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      font-size: 12px !important;
      color: #9ca3af !important;
      text-transform: uppercase !important;
    }

    .igStatValue {
      height: 60px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 52px !important;
      font-weight: 700 !important;
      line-height: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
      
    .igStatSubtitle {
      min-height: 42px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      font-size: 13px !important;
      color: #9ca3af !important;
      line-height: 1.4 !important;
      padding: 0 6px !important;
      word-break: keep-all !important;
      white-space: normal !important;
    }

    #igTabArea {
      display:grid !important;
      grid-template-columns:1fr !important;
      gap:8px !important;
      margin-bottom:12px !important;
    }

    .igTabBtn {
      padding: 10px !important;
      min-height: 50px !important;
      background: #374151 !important;
      font-size: 12px !important;
      text-align: center !important;
      white-space: normal !important;
      font-family: inherit !important;
    }

    .igTabBtn.active {
      background: #2563eb !important;
    }

    #igSearchInput {
      margin-top: 18px !important;
      background: #1f2937 !important;
      color: white !important;
    }

    #igSearchInput::placeholder {
      color: #9ca3af !important;
    }

    #igResultList {
      margin-top: 10px !important;
      background: #1f2937 !important;
      border: 1px solid #374151 !important;
      border-radius: 10px !important;
      padding: 8px !important;
      max-height: 320px !important;
      overflow: auto !important;
      color: white !important;
    }

    #igControlRow {
      display: block !important;
      margin-top: 12px !important;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
      gap: 8px !important;
    }

    .igUserRow {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 1px solid #374151 !important;
      padding: 9px 4px !important;
      gap: 10px !important;
      min-width: 0 !important;
    }

    .igUserRowContent {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    .igAvatar {
      width: 44px !important;
      height: 44px !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      border: 2px solid rgba(255,255,255,.1) !important;
    }

    .igBadgeVerified {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-left: 6px !important;
      width: 22px !important;
      height: 22px !important;
      background: radial-gradient(circle at 30% 30%, #6ac5ff 0%, #0095f6 45%, #0076d6 100%) !important;
      border-radius: 999px !important;
      padding: 0 !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.18) inset !important, 0 1px 2px rgba(0,0,0,0.12) !important;
    }

    .igBadgeVerified svg {
      display: block !important;
      width: 14px !important;
      height: 14px !important;
    }

    .igBadgeVerified svg path {
      stroke: #ffffff !important;
      stroke-width: 2.2 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
      fill: none !important;
    }

    .igSummaryHeader {
      color: #e2e8f0 !important;
      font-weight: 700 !important;
      margin-bottom: 6px !important;
    }

    .igSummaryTimestamp {
      color: #9ca3af !important;
      font-size: 12px !important;
      margin-bottom: 8px !important;
    }

    .igSummaryRow {
      color: #f8fafc !important;
      font-size: 13px !important;
      margin-bottom: 4px !important;
    }

    .igSummaryMessage {
      color: #cbd5e1 !important;
      font-size: 13px !important;
      margin-bottom: 8px !important;
    }

    .igUsername {
      font-weight: bold !important;
      color: white !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .igFullName {
      font-size: 12px !important;
      color: #9ca3af !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .igProfileLink {
      color: #60a5fa !important;
      text-decoration: none !important;
      font-size: 12px !important;
    }

    #igPauseBtn,
    #igCopyBtn,
    #igCsvBtn,
    #igXlsxBtn,
    #igJsonBtn,
    #igCloseBtn {
      width: 100% !important;
      margin-top: 8px !important;
      padding: 11px !important;
      font-size: 15px !important;
    }

    @media (min-width: 560px) {
      .igFilterBar {
        grid-template-columns: repeat(3, 1fr) !important;
      }

      .igControlBar {
        grid-template-columns: 1.2fr 1fr 1fr !important;
      }

      #igRiskMode,
      #igOpenFirst10Btn,
      #igHistoryBtn {
        grid-column: auto !important;
      }
    }

    #igPauseBtn { background: #f59e0b !important; }
    #igCopyBtn { background: #4b5563 !important; }
    #igCsvBtn { background: #059669 !important; }
    #igXlsxBtn { background: #10b981 !important; }
    #igJsonBtn { background: #7c3aed !important; }
    #igCloseBtn { background: #dc2626 !important; }

    #igResultList::-webkit-scrollbar{
      width:8px;
    }

    #igResultList::-webkit-scrollbar-track{
      background:#1f2937;
    }

    #igResultList::-webkit-scrollbar-thumb{
      background:#4b5563;
      border-radius:10px;
    }
  `;

  const docHead = document.head || document.documentElement;
  const docBody = document.body || document.documentElement;
  if (!docHead || !docBody) {
    console.warn("Instagram tracker: document head/body not found.");
    return;
  }
  docHead.appendChild(style);
  const panel = document.createElement("div");
  panel.id = "igTrackerPanel";
  panel.innerHTML = `
    <h2>Instagram Takipçi Kontrolü</h2>

    <input id="igUserInput" placeholder="Instagram kullanıcı adı veya profil linki">

    <div class="igRiskContainer">
      <label class="igRiskLabel">
        İstek Hızı
      </label>

      <select id="igRiskMode">
        <option value="fast">⚡ Hızlı Mod</option>
        <option value="normal" selected>🟢 Normal Mod</option>
        <option value="safe">🛡️ Güvenli Mod</option>
      </select>
    </div>

    <button type="button" id="igStartBtn">Kontrol Et</button>
    <button type="button" id="igStopBtn">Durdur</button>
    <button type="button" id="igPauseBtn">Duraklat</button>

    <div id="igStatus">Hazır.</div>
    <div id="igProgress" style="margin-top:8px;">
      <div id="igProgressBar" style="height:8px;background:#374151;border-radius:6px;overflow:hidden;">
        <div id="igProgressFill" style="width:0%;height:100%;background:#3b82f6;"></div>
      </div>
      <div id="igProgressText" style="font-size:12px;color:#9ca3af;margin-top:6px;">%0</div>
    </div>
    <div id="igStats"></div>
    <div id="igControlRow" class="igPanelSection">
      <div class="igFilterBar">
        <button type="button" class="igFilterBtn active" data-filter="all" id="igFilterAll">Tümü</button>
        <button type="button" class="igFilterBtn" data-filter="verified" id="igFilterVerified">Mavi</button>
        <button type="button" class="igFilterBtn" data-filter="nonverified" id="igFilterNonVerified">Mavi olmayan</button>
        <button type="button" class="igFilterBtn" data-filter="private" id="igFilterPrivate">Gizli</button>
        <button type="button" class="igFilterBtn" data-filter="public" id="igFilterPublic">Açık</button>
      </div>

    </div>

    <div class="igSortBar">
      <button type="button" class="igSortBtn active" data-sort="default">Varsayılan</button>
      <button type="button" class="igSortBtn" data-sort="alpha">A-Z</button>
      <button type="button" class="igSortBtn" data-sort="verified">Mavi tik önce</button>
      <button type="button" class="igSortBtn" data-sort="private">Gizli önce</button>
      <button type="button" class="igSortBtn" data-sort="username">Kullanıcı adı</button>
    </div>

    <div class="igControlBar">
      <button type="button" class="igActionBtn" id="igOpenFirst10Btn">İlk 10'u Aç</button>
      <button type="button" class="igActionBtn" id="igHistoryBtn">Geçmiş Kayıtlar</button>
    </div>

    <div id="igCompareSummary"></div>
    <div id="igWarning"></div>

    <div id="igTabArea">
      <button class="igTabBtn" data-tab="notFollowingBack">Geri Takip Etmeyenler</button>
      <button class="igTabBtn" data-tab="followersNotFollowedBack">Takip Edilmemiş Takipçiler</button>
      <button class="igTabBtn" data-tab="mutuals">Karşılıklı</button>
      <button class="igTabBtn" data-tab="newFollowers">Yeni Takip Edenler</button>
      <button class="igTabBtn" data-tab="lostFollowers">Takipten Çıkanlar</button>
      <button class="igTabBtn" data-tab="newNotFollowingBack">Yeni Geri Takip Etmeyenler</button>
    </div>

    <input id="igSearchInput" placeholder="Listede ara...">

    <div id="igResultList"></div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">
      <button type="button" id="igCopyBtn">Sonucu Kopyala</button>
      <button type="button" id="igCsvBtn">CSV İndir</button>
      <button type="button" id="igXlsxBtn">Excel İndir</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <button type="button" id="igJsonBtn">JSON İndir</button>
      <button type="button" id="igCloseBtn">Paneli Kapat</button>
    </div>
  `;

  docBody.appendChild(panel);

  const status = document.getElementById("igStatus");
  const stats = document.getElementById("igStats");
  const resultList = document.getElementById("igResultList");
  const searchInput = document.getElementById("igSearchInput");
  const startBtn = document.getElementById("igStartBtn");
  const stopBtn = document.getElementById("igStopBtn");
  const jsonBtn = document.getElementById("igJsonBtn");
  const progressFill = document.getElementById("igProgressFill");
  const progressText = document.getElementById("igProgressText");
  const pauseBtn = document.getElementById("igPauseBtn");
  const xlsxBtn = document.getElementById("igXlsxBtn");

  let isPaused = false;
  let progressPercent = 0;
  let verifiedFilterMode = "all";
  let sortMode = "default";
  let delayMode = "normal";
  let historyMode = false;
  let historyRecords = [];
  let currentUserInfo = null;
  const persistenceKey = "igTracker_last";
  const historyKey = "igTracker_history";
  const delayModeMap = {
    fast: 800,
    normal: 2200,
    safe: 4000
  };
  let previousResults = null;
  let previousSaveTimestamp = null;

  function setStatus(text) {
    status.textContent = text;
  }

  function setProgress(percent, text) {
    progressPercent = Math.max(0, Math.min(100, Math.round(percent)));
    if (progressFill) progressFill.style.width = progressPercent + "%";
    if (progressText) progressText.textContent = text || `%${progressPercent}`;
  }

  function getDelayMs() {
    return delayModeMap[delayMode] || delayModeMap.normal;
  }

  function formatHistoryTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getIdSet(users) {
    return new Set((users || []).map(user => user.id));
  }

  function getDiffList(current, previous) {
    const previousIds = getIdSet(previous);
    return (current || []).filter(user => !previousIds.has(user.id));
  }

  function renderCompareSummary() {
    const compareSummary = document.getElementById("igCompareSummary");
    if (!compareSummary) return;

    if (!previousResults || !previousResults.followers) {
      compareSummary.innerHTML = `
        <div>Önceki kayıt bulunamadı.</div>
      `;
      return;
    }

    const newFollowers = getDiffList(cachedResults.followers, previousResults.followers).length;
    const lostFollowers = getDiffList(previousResults.followers, cachedResults.followers).length;
    const newNotFollowing = getDiffList(cachedResults.notFollowingBack, previousResults.notFollowingBack).length;

    compareSummary.innerHTML = `
      <div><strong>Önceki sonuçla karşılaştırma</strong></div>
      <div>Yeni takip edenler: ${newFollowers}</div>
      <div>Takipten çıkanlar: ${lostFollowers}</div>
      <div>Yeni geri takip etmeyenler: ${newNotFollowing}</div>
      <div style="color:#9ca3af;font-size:12px;margin-top:6px;">Önceki kayıt: ${previousSaveTimestamp ? formatHistoryTimestamp(previousSaveTimestamp) : "-"}</div>
    `;
  }

  function updateWarning() {
    const warning = document.getElementById("igWarning");
    if (!warning) return;

    const officialFollowers = Number(cachedResults.followersCount) || 0;
    const officialFollowing = Number(cachedResults.followingCount) || 0;
    const loadedFollowers = Number(cachedResults.loadedFollowersCount) || 0;
    const loadedFollowing = Number(cachedResults.loadedFollowingCount) || 0;

    if ((officialFollowers && loadedFollowers < officialFollowers) || (officialFollowing && loadedFollowing < officialFollowing)) {
      warning.style.display = "block";
      warning.textContent = "Liste tam alınamamış olabilir.";
    } else {
      warning.style.display = "none";
    }
  }

  function saveHistoryRecord() {
    const record = {
      timestamp: Date.now(),
      userInfo: currentUserInfo ? {
        id: currentUserInfo.id,
        username: currentUserInfo.username,
        followersRealCount: currentUserInfo.followersRealCount,
        followingRealCount: currentUserInfo.followingRealCount
      } : {},
      results: JSON.parse(JSON.stringify(cachedResults))
    };

    historyRecords.unshift(record);
    if (historyRecords.length > 20) {
      historyRecords.length = 20;
    }
    localStorage.setItem(historyKey, JSON.stringify(historyRecords));
  }

  function renderHistory() {
    if (!resultList) return;

    if (!historyRecords.length) {
      resultList.innerHTML = `
        <div style="color:#9ca3af;text-align:center;padding:20px;">
          Geçmiş kayıt bulunamadı.
        </div>
      `;
      return;
    }

    resultList.innerHTML = historyRecords
      .map((record, index) => {
        const date = formatHistoryTimestamp(record.timestamp);
        const counts = record.results || {};
        return `
          <div class="igUserRow" style="flex-direction:column;align-items:flex-start;gap:6px;">
            <div style="display:flex;justify-content:space-between;width:100%;gap:10px;align-items:center;">
              <div><strong>${index + 1}. ${record.userInfo.username || "Bilinmiyor"}</strong></div>
              <div style="font-size:12px;color:#9ca3af;">${date}</div>
            </div>
            <div style="font-size:13px;color:#d1d5db;">Takipçi: ${counts.followersCount || 0} / Takip edilen: ${counts.followingCount || 0} / Geri takip etmeyenler: ${counts.notFollowingBack?.length || 0}</div>
          </div>
        `;
      })
      .join("");
  }

  function setHistoryMode(enabled) {
    historyMode = enabled;
    const historyBtn = document.getElementById("igHistoryBtn");
    if (historyBtn) {
      historyBtn.classList.toggle("active", enabled);
      historyBtn.textContent = enabled ? "Canlı Liste" : "Geçmiş Kayıtlar";
    }
    if (historyMode) {
      if (searchInput) searchInput.disabled = true;
      renderHistory();
    } else {
      if (searchInput) searchInput.disabled = false;
      renderList();
    }
  }

  function setSortMode(mode) {
    sortMode = mode;
    document.querySelectorAll(".igSortBtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.sort === mode);
    });
    if (!historyMode) {
      renderList();
    }
  }

  function setDelayMode(mode) {
    delayMode = mode;
    const riskMode = document.getElementById("igRiskMode");
    if (riskMode) {
      riskMode.value = mode;
    }
  }

  function openFirst10Profiles() {
    const list = getActiveList().slice(0, 10);
    list.forEach(user => {
      const url = `https://www.instagram.com/${user.username}/`;
      const win = window.open(url, "_blank");
      if (win) {
        win.focus();
      }
    });
    setStatus(`İlk ${list.length} profil yeni sekmede açıldı.`);
  }

  function renderList() {
    if (historyMode) {
      renderHistory();
      return;
    }

    const query = searchInput.value.toLowerCase().trim();
    const list = getActiveList().filter(user => {
      return (
        user.username.toLowerCase().includes(query) ||
        (user.full_name || "").toLowerCase().includes(query)
      );
    });

    if (list.length === 0) {
      resultList.innerHTML = `
        <div style="color:#9ca3af;text-align:center;padding:20px;">
          Sonuç bulunamadı.
        </div>
      `;
      return;
    }

    resultList.innerHTML = list
      .map((user, index) => {
        const avatarUrl = user.profile_pic_url || "https://via.placeholder.com/34/1f2937/ffffff?text=%3F";
        return `
          <div class="igUserRow">
            <img class="igAvatar" src="${avatarUrl}" alt="@${user.username}">
            <div style="flex:1;min-width:0;">
              <div class="igUsername">
                ${index + 1}. @${user.username}
                ${user.is_verified ? '<span class="igBadgeVerified" aria-label="Doğrulanmış hesap"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 12.5L10.2 16.2L17.5 8.9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ""}
              </div>
              <div class="igFullName">${user.full_name || "-"}</div>
            </div>
            <a class="igProfileLink" href="https://www.instagram.com/${user.username}/" target="_blank" rel="noopener noreferrer">
              Profil
            </a>
          </div>
        `;
      })
      .join("");
  }

  function cleanUsername(value) {
    return value
      .replace("https://www.instagram.com/", "")
      .replace("http://www.instagram.com/", "")
      .replace("https://instagram.com/", "")
      .replace("http://instagram.com/", "")
      .split("?")[0]
      .replace(/\//g, "")
      .replace("@", "")
      .trim()
      .toLowerCase();
  }

  function getUserKey(user) {
    return String(user.pk || user.id || user.pk_id || "");
  }

  function normalizeUsers(rawUsers) {
    const map = new Map();

    rawUsers.forEach(user => {
      const id = getUserKey(user);
      const username = user.username || "";

      if (!id || !username) return;

      if (!map.has(id)) {
        map.set(id, {
          id,
          username,
          full_name: user.full_name || "",
          profile_pic_url: user.profile_pic_url || user.profile_pic_url_hd || "",
          is_verified: Boolean(user.is_verified),
          is_private: Boolean(user.is_private)
        });
      }
    });

    return Array.from(map.values());
  }

  function createStatCard(title, value, subtitle = "") {
    return `
    <div class="igStatCard">
      <div class="igStatTitle">${title}</div>
      <div class="igStatValue">${value}</div>
      <div class="igStatSubtitle">${subtitle || "&nbsp;"}</div>
    </div>
    `;
  }

  function formatStat(value) {
    return value === 0 ? "-" : value;
  }

  function updateStats() {
    // If official counts are available, show loaded count capped to official and indicate any positive discrepancy
    const officialFollowers = Number(cachedResults.followersCount) || 0;
    const officialFollowing = Number(cachedResults.followingCount) || 0;
    const loadedFollowers = Number(cachedResults.loadedFollowersCount) || 0;
    const loadedFollowing = Number(cachedResults.loadedFollowingCount) || 0;

    const displayedLoadedFollowers = officialFollowers > 0 ? Math.min(loadedFollowers, officialFollowers) : loadedFollowers;
    const displayedLoadedFollowing = officialFollowing > 0 ? Math.min(loadedFollowing, officialFollowing) : loadedFollowing;

    const diffFollowers = loadedFollowers - officialFollowers;
    const diffFollowing = loadedFollowing - officialFollowing;

    stats.innerHTML = `
      ${createStatCard(
        "Takipçi",
        formatStat(officialFollowers),
        officialFollowers ? `Yüklenen: ${displayedLoadedFollowers}${diffFollowers > 0 ? ` (fark: +${diffFollowers})` : ""}` : (loadedFollowers ? `Yüklenen: ${loadedFollowers}` : "")
      )}
      ${createStatCard(
        "Takip Edilen",
        formatStat(officialFollowing),
        officialFollowing ? `Yüklenen: ${displayedLoadedFollowing}${diffFollowing > 0 ? ` (fark: +${diffFollowing})` : ""}` : (loadedFollowing ? `Yüklenen: ${loadedFollowing}` : "")
      )}
      ${createStatCard(
        "Geri Takip Etmiyor",
        cachedResults.notFollowingBack.length ? cachedResults.notFollowingBack.length : "-",
        `${cachedResults.followingCount ? Math.round((cachedResults.notFollowingBack.length / cachedResults.followingCount) * 100) : 0}%`
      )}
    `;
    renderCompareSummary();
    updateWarning();
  }

  async function cancellableSleep(ms) {
    const step = 100;
    let waited = 0;

    while (waited < ms) {
      if (isCancelled) {
        throw new Error("İşlem durduruldu.");
      }

      if (isPaused) {
        await sleep(step);
        continue;
      }

      await sleep(step);
      waited += step;
    }
  }

  async function waitWhilePaused() {
    while (isPaused) {
      if (isCancelled) {
        throw new Error("İşlem durduruldu.");
      }
      await sleep(200);
    }
  }

  async function fetchJson(url) {
    if (isCancelled) {
      throw new Error("İşlem durduruldu.");
    }

    // Retry with exponential backoff on 429
    let attempt = 0;
    const maxAttempts = 5;
    while (true) {
      await waitWhilePaused();
      if (isCancelled) {
        throw new Error("İşlem durduruldu.");
      }

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.instagram.com/",
          "x-ig-app-id": APP_ID,
          "x-requested-with": "XMLHttpRequest",
          "x-csrftoken": csfrToken
        },
        cache: "no-store"
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Instagram izin vermedi. Instagram'a giriş yaptığından emin ol.");
      }

      if (response.status === 429) {
        attempt++;
        if (attempt > maxAttempts) {
          throw new Error("Instagram çok fazla istek algıladı. Lütfen bir süre bekleyip tekrar deneyin.");
        }
        const backoff = Math.min(60000, 500 * Math.pow(2, attempt));
        setStatus(`Rate limit. ${attempt}/${maxAttempts} — ${Math.round(backoff/1000)}s bekleniyor...`);
        await cancellableSleep(backoff);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Instagram isteği başarısız oldu. Kod: ${response.status}`);
      }

      const text = await response.text();
      const trimmed = text.trim();

      if (trimmed.startsWith("<")) {
        throw new Error(`Beklenen JSON yerine HTML döndü: ${url}`);
      }

      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (error) {
        throw new Error(`JSON parse hatası: ${error.message}`);
      }
    }
  }

  async function getFriendshipStatus(userId) {
    try {
      const data = await fetchJson(
        `https://www.instagram.com/api/v1/friendships/show/${userId}/`
      );

      return {
        following: Boolean(data.following),
        followedBy: Boolean(data.followed_by),
        isPrivate: Boolean(data.is_private)
      };
    } catch {
      return {
        following: false,
        followedBy: false,
        isPrivate: false
      };
    }
  }

  async function getUserInfo(username) {
    const data = await fetchJson(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
    );

    const user = data?.data?.user;

    if (!user?.id) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    const userId = String(user.id);
    const friendship = await getFriendshipStatus(userId);

    return {
      id: userId,
      username: user.username,
      followersRealCount: user.edge_followed_by?.count || 0,
      followingRealCount: user.edge_follow?.count || 0,
      isPrivate: Boolean(user.is_private || friendship.isPrivate),
      followedByViewer: Boolean(user.followed_by_viewer || friendship.following),
      isSelf: Boolean(myUserId && userId === myUserId)
    };
  }

  async function fetchText(url) {
    if (isCancelled) {
      throw new Error("İşlem durduruldu.");
    }

    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "x-ig-app-id": APP_ID,
        "x-requested-with": "XMLHttpRequest",
        "x-csrftoken": csfrToken,
        "Referer": "https://www.instagram.com/"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Instagram isteği başarısız oldu. Kod: ${response.status}`);
    }

    return response.text();
  }

  function extractGraphqlHashesFromHtml(html, type) {
    const found = new Set();
    const hashRegex = /(?:query_hash|query_id|queryId)["']?\s*[:=]\s*["']([0-9a-f]{32})["']/gi;
    let match;

    while ((match = hashRegex.exec(html))) {
      found.add(match[1]);
    }

    if (found.size === 0) {
      return [];
    }

    const hashes = Array.from(found);
    const filtered = hashes.slice(0, 20);

    return filtered.map(value => [
      { paramKey: "query_hash", value },
      { paramKey: "query_id", value }
    ]).flat();
  }

  async function getGraphqlQueryOptionsFromPage(username, type) {
    try {
      const html = await fetchText(`https://www.instagram.com/${encodeURIComponent(username)}/`);
      const extracted = extractGraphqlHashesFromHtml(html, type);
      if (extracted.length) {
        return extracted;
      }
    } catch (error) {
      console.warn("Profil sayfasından GraphQL hash çıkarılamadı:", error);
    }

    return [];
  }

  async function getGraphqlListByOptions(userId, type, queryKey, queryValue, options, expectedCount = 0) {
    const edgeName = type === "followers" ? "edge_followed_by" : "edge_follow";
    let allRawUsers = [];
    let endCursor = "";

    while (true) {
      if (isCancelled) {
        throw new Error("İşlem durduruldu.");
      }

      const variables = {
        id: userId,
        include_reel: options.include_reel,
        fetch_mutual: options.fetch_mutual,
        first: GRAPHQL_PAGE_SIZE
      };

      if (endCursor) {
        variables.after = endCursor;
      }

      const url =
        `https://www.instagram.com/graphql/query/?${queryKey}=${encodeURIComponent(queryValue)}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

      const data = await fetchJson(url);
      const list = data?.data?.user?.[edgeName]?.edges;

      if (!Array.isArray(list)) {
        throw new Error("GraphQL listesini alırken hata oluştu.");
      }

      allRawUsers.push(...list.map(edge => edge.node).filter(Boolean));
      const uniqueNow = normalizeUsers(allRawUsers);

      // update progress if we know expectedCount
      if (expectedCount) {
        const pct = Math.min(100, Math.round((uniqueNow.length / expectedCount) * 100));
        setProgress(pct, `${type === "followers" ? "Takipçiler" : "Takip edilenler"} yükleniyor... ${uniqueNow.length}/${expectedCount}`);
      } else {
        setStatus(`${type === "followers" ? "Takipçiler" : "Takip edilenler"} yükleniyor... ${uniqueNow.length}`);
      }

      if (expectedCount && uniqueNow.length >= expectedCount) {
        break;
      }

      const pageInfo = data?.data?.user?.[edgeName]?.page_info;
      if (!pageInfo?.has_next_page) {
        break;
      }

      endCursor = pageInfo.end_cursor;
      await cancellableSleep(getDelayMs());
    }

    return normalizeUsers(allRawUsers);
  }

  async function getGraphqlList(userId, type, expectedCount = 0, username = "") {
    const options = GRAPHQL_QUERY_OPTIONS[type] || [];
    const variableSets = [
      { include_reel: true, fetch_mutual: true },
      { include_reel: false, fetch_mutual: false }
    ];
    let lastError = null;
    let allResults = [];

    async function tryOptions(optionList) {
      for (const queryOption of optionList) {
        for (const variableSet of variableSets) {
          try {
            const result = await getGraphqlListByOptions(
              userId,
              type,
              queryOption.paramKey,
              queryOption.value,
              variableSet,
              expectedCount
            );

            allResults = normalizeUsers([...allResults, ...result]);

            if (expectedCount && allResults.length >= expectedCount) {
              return true;
            }
          } catch (error) {
            lastError = error;
            console.warn(`GraphQL denemesi ${queryOption.paramKey}=${queryOption.value} include_reel=${variableSet.include_reel} başarısız oldu:`, error);
            setStatus(`${type === "followers" ? "Takipçiler" : "Takip edilenler"} için GraphQL denemesi başarısız oldu...`);
            await cancellableSleep(1200);
          }
        }
      }
      return false;
    }

    await tryOptions(options);

    if (expectedCount && allResults.length >= expectedCount) {
      return allResults;
    }

    if (!allResults.length) {
      const fallbackHashes = type === "followers" ? GRAPHQL_FOLLOWERS_HASHES : GRAPHQL_FOLLOWING_HASHES;
      const fallbackOptions = fallbackHashes
        .filter(hash => !options.some(opt => opt.value === hash))
        .flatMap(hash => [
          { paramKey: "query_hash", value: hash },
          { paramKey: "query_id", value: hash }
        ]);

      if (fallbackOptions.length) {
        await tryOptions(fallbackOptions);
      }
    }

    if (username) {
      const pageOptions = await getGraphqlQueryOptionsFromPage(username, type);
      if (pageOptions.length) {
        await tryOptions(pageOptions);
      }
    }

    if (allResults.length) {
      return allResults;
    }

    throw lastError || new Error("GraphQL listesi alınamadı.");
  }

  async function getV1List(userId, type, expectedCount = 0) {
    const listName = type === "followers" ? "Takipçiler" : "Takip edilenler";
    let allRawUsers = [];
    let maxId = "";
    let retry = 0;

    while (true) {
      if (isCancelled) {
        throw new Error("İşlem durduruldu.");
      }

      const url =
        `https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=200&rank_token=${encodeURIComponent(requestRankToken)}` +
        (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");

      const data = await fetchJson(url);

      if (!Array.isArray(data.users)) {
        throw new Error("Liste alınamadı. Hesap gizli olabilir veya Instagram veriyi kısıtladı.");
      }

      allRawUsers.push(...data.users);
      const uniqueNow = normalizeUsers(allRawUsers);

        // update progress if expectedCount provided
        if (expectedCount) {
          const pct = Math.min(100, Math.round((uniqueNow.length / expectedCount) * 100));
          setProgress(pct, `${listName} yükleniyor... ${uniqueNow.length}/${expectedCount}`);
        } else {
          setStatus(`${listName} yükleniyor... ${uniqueNow.length}`);
        }

      if (expectedCount && uniqueNow.length >= expectedCount) {
        break;
      }

      if (data.next_max_id) {
        maxId = data.next_max_id;
        retry = 0;
        await cancellableSleep(getDelayMs());
        continue;
      }

      if (expectedCount && uniqueNow.length < expectedCount && retry < 5) {
        retry++;
        setStatus(
          `${listName} eksik geldi. Tekrar deneniyor... ${uniqueNow.length}/${expectedCount}`
        );
        await cancellableSleep(3000);
        continue;
      }

      break;
    }

    return normalizeUsers(allRawUsers);
  }

  async function getList(userId, type, expectedCount = 0, username = "") {
    const listName = type === "followers" ? "Takipçiler" : "Takip edilenler";

    let graphqlList = [];
    let v1List = [];
    const sources = [];

    try {
      graphqlList = await getGraphqlList(userId, type, expectedCount, username);
      if (graphqlList.length) sources.push("graphql");
      if (expectedCount && graphqlList.length >= expectedCount) {
        return { list: graphqlList, sources };
      }
    } catch (error) {
      console.warn("GraphQL liste alınamadı:", error);
      setStatus(`${listName} için GraphQL kaynağı başarısız oldu, V1 kaynağı deneniyor...`);
    }

    try {
      v1List = await getV1List(userId, type, expectedCount);
      if (v1List.length) sources.push("v1");
    } catch (error) {
      console.warn("V1 liste alınamadı:", error);
      if (!graphqlList.length) {
        throw error;
      }
      setStatus(`${listName} için V1 kaynağı başarısız oldu, eldeki sonuç gösteriliyor...`);
      return { list: graphqlList, sources };
    }

    const combined = normalizeUsers([...graphqlList, ...v1List]);
    if (expectedCount && combined.length >= expectedCount) {
      return { list: combined, sources };
    }

    if (graphqlList.length || v1List.length) {
      return { list: normalizeUsers([...graphqlList, ...v1List]), sources };
    }

    return { list: v1List, sources };
  }

  function calculateResults(followers, following, userInfo) {
    const uniqueFollowers = normalizeUsers(followers);
    const uniqueFollowing = normalizeUsers(following);
    const followerIdSet = new Set(uniqueFollowers.map(user => user.id));
    const followingIdSet = new Set(uniqueFollowing.map(user => user.id));

    const loadedFollowersCount = uniqueFollowers.length;
    const loadedFollowingCount = uniqueFollowing.length;

    cachedResults = {
      followersCount: userInfo.followersRealCount || loadedFollowersCount,
      followingCount: userInfo.followingRealCount || loadedFollowingCount,
      loadedFollowersCount,
      loadedFollowingCount,
      followers: uniqueFollowers,
      following: uniqueFollowing,
      notFollowingBack: uniqueFollowing.filter(user => !followerIdSet.has(user.id)),
      followersNotFollowedBack: uniqueFollowers.filter(user => !followingIdSet.has(user.id)),
      mutuals: uniqueFollowing.filter(user => followerIdSet.has(user.id))
    };

    if (previousResults && previousResults.followers) {
      cachedResults.newFollowers = getDiffList(cachedResults.followers, previousResults.followers);
      cachedResults.lostFollowers = getDiffList(previousResults.followers, cachedResults.followers);
      cachedResults.newNotFollowingBack = getDiffList(
        cachedResults.notFollowingBack,
        previousResults.notFollowingBack
      );
    }
  }

  function getActiveList() {
    let list = (cachedResults[activeTab] || []).slice();

    if (verifiedFilterMode === "verified") {
      list = list.filter(user => user.is_verified);
    } else if (verifiedFilterMode === "nonverified") {
      list = list.filter(user => !user.is_verified);
    } else if (verifiedFilterMode === "private") {
      list = list.filter(user => user.is_private);
    } else if (verifiedFilterMode === "public") {
      list = list.filter(user => !user.is_private);
    }

    if (sortMode === "alpha" || sortMode === "username") {
      list.sort((a, b) => a.username.localeCompare(b.username, "tr", { sensitivity: "base" }));
    } else if (sortMode === "verified") {
      list.sort((a, b) => {
        if (a.is_verified === b.is_verified) {
          return a.username.localeCompare(b.username, "tr", { sensitivity: "base" });
        }
        return b.is_verified ? 1 : -1;
      });
    } else if (sortMode === "private") {
      list.sort((a, b) => {
        if (a.is_private === b.is_private) {
          return a.username.localeCompare(b.username, "tr", { sensitivity: "base" });
        }
        return b.is_private ? 1 : -1;
      });
    }

    return list;
  }

  function setVerifiedFilter(mode) {
    verifiedFilterMode = mode;
    document.querySelectorAll(".igFilterBtn, .igPrivateFilterBtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === mode);
    });
    renderList();
  }

  function setActiveTab(tab) {
    activeTab = tab;

    document.querySelectorAll(".igTabBtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    renderList();
  }

  function listToText(list) {
    return list
      .map((user, index) => `${index + 1}. @${user.username}${user.full_name ? " - " + user.full_name : ""}`)
      .join("\n");
  }

  function downloadCSV() {
    const list = getActiveList();

    const rows = [
      ["id", "username", "full_name", "profile_url"],
      ...list.map(user => [
        user.id,
        user.username,
        user.full_name,
        `https://www.instagram.com/${user.username}/`
      ])
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function downloadXLSX() {
    const list = getActiveList();
    const rows = [
      ["id", "username", "full_name", "profile_url", "verified", "profile_pic_url"],
      ...list.map(user => [
        user.id,
        user.username,
        user.full_name,
        `https://www.instagram.com/${user.username}/`,
        user.is_verified ? "Evet" : "Hayır",
        user.profile_pic_url || ""
      ])
    ];

    const htmlRows = rows
      .map(row => `<tr>${row
        .map(cell => `<td>${String(cell || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`)
        .join("")}</tr>`)
      .join("");

    const html = `<?xml version="1.0" encoding="UTF-8"?>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
          <table>${htmlRows}</table>
        </body>
      </html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  startBtn.onclick = async () => {
    const username = cleanUsername(document.getElementById("igUserInput").value);

    if (!username) {
      alert("Kullanıcı adı giriniz.");
      return;
    }

    try {
      isCancelled = false;
      isPaused = false;
      if (pauseBtn) pauseBtn.textContent = "Duraklat";

      startBtn.disabled = true;
      startBtn.textContent = "Kontrol ediliyor...";

      resultList.innerHTML = "";
      stats.innerHTML = "";
      searchInput.value = "";

      cachedResults = {
        followersCount: 0,
        followingCount: 0,
        loadedFollowersCount: 0,
        loadedFollowingCount: 0,
        followers: [],
        following: [],
        notFollowingBack: [],
        followersNotFollowedBack: [],
        mutuals: [],
        newFollowers: [],
        lostFollowers: [],
        newNotFollowingBack: []
      };

      updateStats();

      setStatus("Kullanıcı bilgileri alınıyor...");

      const userInfo = await getUserInfo(username);
      currentUserInfo = userInfo;
      if (historyMode) {
        setHistoryMode(false);
      }

      if (userInfo.isSelf) {
        setStatus("Kendi hesabın algılandı. Listeler alınıyor...");
      } else if (userInfo.followedByViewer) {
        setStatus(`@${userInfo.username} takip ettiğin hesap olarak algılandı. Listeler alınıyor...`);
      } else if (userInfo.isPrivate) {
        setStatus("Uyarı: Hesap gizli olabilir. Yine de liste alınmaya çalışılıyor...");
        await cancellableSleep(800);
      } else {
        setStatus(`@${userInfo.username} hesabı bulundu. Listeler alınıyor...`);
      }

      const followersRes = await getList(userInfo.id, "followers", userInfo.followersRealCount, userInfo.username);
      await cancellableSleep(1000);
      const followingRes = await getList(userInfo.id, "following", userInfo.followingRealCount, userInfo.username);

      // getList now returns { list, sources }
      const followers = followersRes.list || followersRes;
      const following = followingRes.list || followingRes;

      calculateResults(followers, following, userInfo);
      updateStats();
      saveResults();

      setActiveTab("notFollowingBack");

      setStatus(
        `İşlem tamamlandı. Profil sayısı: ${cachedResults.followersCount} takipçi / ${cachedResults.followingCount} takip edilen. Yüklenen liste: ${cachedResults.loadedFollowersCount} takipçi / ${cachedResults.loadedFollowingCount} takip edilen.`
      );
    } catch (error) {
      console.error(error);
      setStatus("Hata: " + error.message);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Kontrol Et";
    }
  };

  stopBtn.onclick = () => {
    isCancelled = true;
    setStatus("İşlem durduruluyor...");
  };

  document.getElementById("igCopyBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(listToText(getActiveList()));
      setStatus("Sonuç panoya kopyalandı.");
    } catch {
      setStatus("Kopyalama başarısız.");
    }
  };

  document.getElementById("igCsvBtn").onclick = () => {
    downloadCSV();
    setStatus("CSV indirildi.");
  };

  if (jsonBtn) {
    jsonBtn.onclick = () => {
      const list = getActiveList();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("JSON indirildi.");
    };
  }

  if (xlsxBtn) {
    xlsxBtn.onclick = () => {
      downloadXLSX();
      setStatus("Excel dosyası hazırlandı.");
    };
  }

  document.getElementById("igCloseBtn").onclick = () => {
    isCancelled = true;
    panel.remove();
    style.remove();
  };

  // persist results to localStorage
  function saveResults() {
    try {
      const data = {
        timestamp: Date.now(),
        results: cachedResults
      };
      localStorage.setItem(persistenceKey, JSON.stringify(data));
      previousResults = JSON.parse(JSON.stringify(cachedResults));
      previousSaveTimestamp = data.timestamp;
      saveHistoryRecord();
    } catch (e) {
      console.warn("LocalStorage kaydedilemedi:", e);
    }
  }

  function loadResults() {
    try {
      const raw = localStorage.getItem(persistenceKey);
      if (raw) {
        const data = JSON.parse(raw);
        const results = data?.results || data;
        cachedResults = Object.assign(cachedResults, results);
        previousResults = JSON.parse(JSON.stringify(results));
        previousSaveTimestamp = Number(data?.timestamp) || null;
      }

      const rawHistory = localStorage.getItem(historyKey);
      if (rawHistory) {
        historyRecords = JSON.parse(rawHistory) || [];
      }

      updateStats();
      return true;
    } catch (e) {
      console.warn("LocalStorage yüklenemedi:", e);
      return false;
    }
  }

  // load persisted results on init
  loadResults();

  searchInput.oninput = renderList;
  document.querySelectorAll(".igFilterBtn, .igPrivateFilterBtn").forEach(btn => {
    btn.addEventListener("click", () => setVerifiedFilter(btn.dataset.filter || "all"));
  });

  document.querySelectorAll(".igSortBtn").forEach(btn => {
    btn.addEventListener("click", () => setSortMode(btn.dataset.sort || "default"));
  });

  const riskModeSelect = document.getElementById("igRiskMode");
  if (riskModeSelect) {
    riskModeSelect.addEventListener("change", () => setDelayMode(riskModeSelect.value || "normal"));
  }

  const openFirst10Btn = document.getElementById("igOpenFirst10Btn");
  if (openFirst10Btn) {
    openFirst10Btn.onclick = openFirst10Profiles;
  }

  const historyBtn = document.getElementById("igHistoryBtn");
  if (historyBtn) {
    historyBtn.onclick = () => setHistoryMode(!historyMode);
  }

  setDelayMode("normal");
  setSortMode("default");
  setVerifiedFilter("all");

  if (pauseBtn) {
    pauseBtn.onclick = () => {
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? "Devam Et" : "Duraklat";
      setStatus(isPaused ? "İşlem duraklatıldı." : "İşlem devam ediyor...");
    };
  }

  document.querySelectorAll(".igTabBtn").forEach(btn => {
    btn.onclick = () => setActiveTab(btn.dataset.tab);
  });

  updateStats();
  setActiveTab("notFollowingBack");
})();
