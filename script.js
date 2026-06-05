(() => {
  if (document.getElementById("igTrackerPanel")) {
    document.getElementById("igTrackerPanel").remove();
  }

  const APP_ID = "936619743392459";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let cachedResults = {
    notFollowingBack: [],
    followersNotFollowedBack: [],
    mutuals: []
  };

  let activeTab = "notFollowingBack";

  const panel = document.createElement("div");
  panel.id = "igTrackerPanel";

  panel.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    width:460px;
    max-height:90vh;
    overflow:auto;
    z-index:999999;
    background:#111827;
    color:white;
    padding:16px;
    border-radius:16px;
    box-shadow:0 0 25px rgba(0,0,0,.5);
    font-family:Arial,sans-serif;
  `;

  panel.innerHTML = `
    <h2 style="margin:0 0 12px;text-align:center;">Instagram Follow Checker</h2>

    <input id="igUserInput" placeholder="Instagram kullanıcı adını gir"
      style="width:100%;box-sizing:border-box;padding:12px;border:none;border-radius:10px;margin-bottom:10px;font-size:15px;">

    <button id="igStartBtn"
      style="width:100%;padding:12px;border:none;border-radius:10px;background:#3b82f6;color:white;font-size:17px;font-weight:bold;cursor:pointer;">
      Kontrol Et
    </button>

    <div id="igStatus" style="margin-top:10px;color:#d1d5db;font-size:14px;">Hazır.</div>

    <div id="igStats" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px;">
      <button class="igTabBtn" data-tab="notFollowingBack">Takip Etmeyenler</button>
      <button class="igTabBtn" data-tab="followersNotFollowedBack">Senin Etmediklerin</button>
      <button class="igTabBtn" data-tab="mutuals">Karşılıklı</button>
    </div>

    <input id="igSearchInput" placeholder="Listede ara..."
      style="width:100%;box-sizing:border-box;padding:10px;border:none;border-radius:10px;margin-top:10px;font-size:14px;background:#1f2937;color:white;">

    <div id="igResultList"
      style="margin-top:10px;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:8px;max-height:320px;overflow:auto;">
    </div>

    <button id="igCopyBtn"
      style="width:100%;margin-top:10px;padding:11px;border:none;border-radius:10px;background:#4b5563;color:white;font-size:15px;cursor:pointer;">
      Sonucu Kopyala
    </button>

    <button id="igCsvBtn"
      style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:10px;background:#059669;color:white;font-size:15px;cursor:pointer;">
      CSV İndir
    </button>

    <button id="igCloseBtn"
      style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:10px;background:#dc2626;color:white;font-size:15px;cursor:pointer;">
      Paneli Kapat
    </button>
  `;

  document.body.appendChild(panel);

  const status = document.getElementById("igStatus");
  const stats = document.getElementById("igStats");
  const resultList = document.getElementById("igResultList");
  const searchInput = document.getElementById("igSearchInput");

  document.querySelectorAll(".igTabBtn").forEach(btn => {
    btn.style.cssText = `
      padding:10px;
      border:none;
      border-radius:8px;
      background:#374151;
      color:white;
      cursor:pointer;
      font-size:12px;
    `;
  });

  function setStatus(text) {
    status.textContent = text;
  }

  function createStatCard(title, value) {
    return `
      <div style="background:#1f2937;border:1px solid #374151;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:12px;color:#9ca3af;">${title}</div>
        <div style="font-size:20px;font-weight:bold;">${value}</div>
      </div>
    `;
  }

  function updateStats(followers, following, notBack) {
    stats.innerHTML = `
      ${createStatCard("Followers", followers)}
      ${createStatCard("Following", following)}
      ${createStatCard("Not Back", notBack)}
    `;
  }

  async function getUserId(username) {
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        credentials: "include",
        headers: {
          "x-ig-app-id": APP_ID
        }
      }
    );

    const data = await response.json();

    if (!data?.data?.user?.id) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    return data.data.user.id;
  }

  async function getList(userId, type) {
    let users = [];
    let maxId = "";

    while (true) {
      const url =
        `https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=200` +
        (maxId ? `&max_id=${maxId}` : "");

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "x-ig-app-id": APP_ID
        }
      });

      const data = await response.json();

      if (!data.users) {
        throw new Error("Instagram verileri alınamadı veya istek sınırına takıldı.");
      }

      users.push(
        ...data.users.map(user => ({
          username: user.username,
          full_name: user.full_name || ""
        }))
      );

      setStatus(
        `${type === "followers" ? "Takipçiler" : "Takip edilenler"} alınıyor... (${users.length})`
      );

      if (!data.next_max_id) break;

      maxId = data.next_max_id;
      await sleep(1200);
    }

    return users;
  }

  function getActiveList() {
    return cachedResults[activeTab] || [];
  }

  function getTabTitle() {
    const titles = {
      notFollowingBack: "Seni takip etmeyenler",
      followersNotFollowedBack: "Seni takip eden ama senin takip etmediklerin",
      mutuals: "Karşılıklı takip"
    };

    return titles[activeTab];
  }

  function renderList() {
    const query = searchInput.value.toLowerCase().trim();
    const list = getActiveList().filter(user => {
      return (
        user.username.toLowerCase().includes(query) ||
        user.full_name.toLowerCase().includes(query)
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
        const profileUrl = `https://www.instagram.com/${user.username}/`;

        return `
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #374151;padding:9px 4px;">
            <div>
              <div style="font-weight:bold;">
                ${index + 1}. @${user.username}
              </div>
              <div style="font-size:12px;color:#9ca3af;">
                ${user.full_name || "-"}
              </div>
            </div>
            <a href="${profileUrl}" target="_blank"
              style="color:#60a5fa;text-decoration:none;font-size:12px;">
              Profil
            </a>
          </div>
        `;
      })
      .join("");
  }

  function setActiveTab(tab) {
    activeTab = tab;

    document.querySelectorAll(".igTabBtn").forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? "#2563eb" : "#374151";
    });

    setStatus(`${getTabTitle()} gösteriliyor.`);
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
      ["username", "full_name", "profile_url"],
      ...list.map(user => [
        user.username,
        user.full_name,
        `https://www.instagram.com/${user.username}/`
      ])
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  document.getElementById("igStartBtn").onclick = async () => {
    const username = document.getElementById("igUserInput").value.trim();

    if (!username) {
      alert("Kullanıcı adı giriniz.");
      return;
    }

    try {
      resultList.innerHTML = "";
      stats.innerHTML = "";
      searchInput.value = "";

      setStatus("Kullanıcı bilgileri alınıyor...");

      const userId = await getUserId(username);

      const followers = await getList(userId, "followers");
      const following = await getList(userId, "following");

      const followerSet = new Set(followers.map(user => user.username));
      const followingSet = new Set(following.map(user => user.username));

      cachedResults.notFollowingBack = following.filter(
        user => !followerSet.has(user.username)
      );

      cachedResults.followersNotFollowedBack = followers.filter(
        user => !followingSet.has(user.username)
      );

      cachedResults.mutuals = following.filter(
        user => followerSet.has(user.username)
      );

      updateStats(
        followers.length,
        following.length,
        cachedResults.notFollowingBack.length
      );

      setActiveTab("notFollowingBack");
      setStatus("İşlem tamamlandı.");
    } catch (error) {
      console.error(error);
      setStatus("Hata: " + error.message);
    }
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

  document.getElementById("igCloseBtn").onclick = () => {
    panel.remove();
  };

  searchInput.oninput = renderList;

  document.querySelectorAll(".igTabBtn").forEach(btn => {
    btn.onclick = () => setActiveTab(btn.dataset.tab);
  });

  setActiveTab("notFollowingBack");
})();
