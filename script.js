(() => {
  if (document.getElementById("igTrackerPanel")) {
    document.getElementById("igTrackerPanel").remove();
  }

  const appId = "936619743392459";
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const panel = document.createElement("div");
  panel.id = "igTrackerPanel";

  panel.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    width:420px;
    max-height:90vh;
    overflow:auto;
    z-index:999999;
    background:#111827;
    color:white;
    padding:15px;
    border-radius:15px;
    box-shadow:0 0 25px rgba(0,0,0,.5);
    font-family:Arial,sans-serif;
  `;

  panel.innerHTML = `
    <h2 style="margin-top:0;text-align:center;">Instagram Takip Kontrol</h2>

    <input id="igUserInput" placeholder="Kullanıcı adını gir"
      style="width:100%;box-sizing:border-box;padding:12px;border:none;border-radius:10px;margin-bottom:10px;font-size:15px;">

    <button id="igStartBtn"
      style="width:100%;padding:12px;border:none;border-radius:10px;background:#3b82f6;color:white;font-size:18px;font-weight:bold;cursor:pointer;">
      Kontrol Et
    </button>

    <div id="igStatus" style="margin-top:10px;color:#d1d5db;font-size:14px;">Hazır.</div>

    <div id="igStats" style="margin-top:10px;font-size:18px;line-height:1.6;"></div>

    <textarea id="igResult" readonly
      style="width:100%;height:350px;box-sizing:border-box;margin-top:10px;padding:12px;background:#1f2937;color:#ffffff;border:1px solid #374151;border-radius:10px;resize:none;font-size:14px;"></textarea>

    <button id="igCopyBtn"
      style="width:100%;margin-top:10px;padding:12px;border:none;border-radius:10px;background:#4b5563;color:white;font-size:16px;cursor:pointer;">
      Sonucu Kopyala
    </button>

    <button id="igCloseBtn"
      style="width:100%;margin-top:10px;padding:12px;border:none;border-radius:10px;background:#dc2626;color:white;font-size:16px;cursor:pointer;">
      Paneli Kapat
    </button>
  `;

  document.body.appendChild(panel);

  const status = document.getElementById("igStatus");
  const stats = document.getElementById("igStats");
  const result = document.getElementById("igResult");

  function setStatus(text) {
    status.textContent = text;
  }

  async function getUserId(username) {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        credentials: "include",
        headers: {
          "x-ig-app-id": appId
        }
      }
    );

    const data = await res.json();

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

      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "x-ig-app-id": appId
        }
      });

      const data = await res.json();

      if (!data.users) {
        throw new Error("Instagram verileri alınamadı.");
      }

      users.push(
        ...data.users.map(u => ({
          username: u.username,
          full_name: u.full_name || ""
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

  document.getElementById("igStartBtn").onclick = async () => {
    const username = document.getElementById("igUserInput").value.trim();

    if (!username) {
      alert("Kullanıcı adı giriniz.");
      return;
    }

    try {
      result.value = "";
      stats.innerHTML = "";

      setStatus("Kullanıcı bilgileri alınıyor...");

      const userId = await getUserId(username);

      const followers = await getList(userId, "followers");
      const following = await getList(userId, "following");

      const followerSet = new Set(followers.map(x => x.username));

      const notFollowingBack = following.filter(
        x => !followerSet.has(x.username)
      );

      stats.innerHTML = `
        <b>Takipçi:</b> ${followers.length}<br>
        <b>Takip edilen:</b> ${following.length}<br>
        <b>Seni takip etmeyen:</b> ${notFollowingBack.length}
      `;

      result.value = notFollowingBack
        .map(
          (u, i) =>
            `${i + 1}. @${u.username}${u.full_name ? " - " + u.full_name : ""}`
        )
        .join("\n");

      setStatus("İşlem tamamlandı.");
    } catch (err) {
      console.error(err);
      setStatus("Hata: " + err.message);
    }
  };

  document.getElementById("igCopyBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(result.value);
      setStatus("Sonuç panoya kopyalandı.");
    } catch {
      setStatus("Kopyalama başarısız.");
    }
  };

  document.getElementById("igCloseBtn").onclick = () => {
    panel.remove();
  };
})();