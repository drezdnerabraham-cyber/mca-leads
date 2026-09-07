(function () {
  const cfg = window.SITE_CONFIG || {};

  // Fill in artist name, tagline, links from config.js
  document.title = cfg.artistName ? cfg.artistName + " — Official" : "Official Music";
  document.getElementById("brand").textContent = cfg.artistName || "Your Name";
  document.getElementById("artistName").textContent = cfg.artistName || "Your Name";
  document.getElementById("tagline").textContent = cfg.tagline || "";
  document.getElementById("footerName").textContent = cfg.artistName || "";
  document.getElementById("footerBrand").textContent = cfg.artistName || "";
  document.getElementById("year").textContent = new Date().getFullYear();

  // Marquee — repeat the artist name
  const marquee = document.getElementById("marquee");
  if (marquee && cfg.artistName) {
    const item = `<span class="marquee-item">${escapeHtml(cfg.artistName)}</span>`;
    marquee.innerHTML = item.repeat(20);
  }

  const waLink = document.getElementById("waLink");
  const tgLink = document.getElementById("tgLink");
  if (cfg.whatsappGroupUrl) waLink.href = cfg.whatsappGroupUrl;
  if (cfg.telegramGroupUrl) tgLink.href = cfg.telegramGroupUrl;

  const socials = document.getElementById("socials");
  const socialItems = [
    { url: cfg.instagramUrl, label: "Instagram" },
    { url: cfg.youtubeUrl, label: "YouTube" },
    { url: cfg.contactEmail ? "mailto:" + cfg.contactEmail : "", label: "Email" }
  ].filter(x => x.url);
  socials.innerHTML = socialItems
    .map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join("");

  const trackList = document.getElementById("trackList");

  fetch("tracks.json?t=" + Date.now())
    .then(r => { if (!r.ok) throw new Error("failed to load tracks.json"); return r.json(); })
    .then(data => {
      const tracks = (data.tracks || []).slice().sort((a, b) => {
        return (b.releaseDate || "").localeCompare(a.releaseDate || "");
      });
      if (!tracks.length) {
        trackList.innerHTML = `
          <div class="empty">
            <h3>No singles yet</h3>
            <p>The first drop is coming — check back soon, or hit up the WhatsApp / Telegram group so you don't miss it.</p>
          </div>`;
        return;
      }
      renderTracks(tracks);
    })
    .catch(err => {
      console.error(err);
      trackList.innerHTML = '<div class="empty"><h3>Couldn\'t load tracks</h3><p>Check that tracks.json exists and is valid JSON.</p></div>';
    });

  function renderTracks(tracks) {
    trackList.innerHTML = "";
    tracks.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "track";
      const badge = i === 0 ? '<div class="track-badge">New</div>' : '';
      el.innerHTML = `
        ${badge}
        <div class="track-cover-wrap">
          <img class="track-cover" src="${escapeAttr(t.cover || '')}" alt="" onerror="this.style.display='none'" />
          <div class="track-cover-overlay"></div>
          <button class="play-btn" aria-label="Play">▶</button>
        </div>
        <div class="track-info">
          <div class="track-title">${escapeHtml(t.title || 'Untitled')}</div>
          <div class="track-date">${formatDate(t.releaseDate)}</div>
        </div>
      `;
      el.addEventListener("click", () => playTrack(t));
      trackList.appendChild(el);
    });
  }

  const player = document.getElementById("player");
  const audio = document.getElementById("audio");
  const pTitle = document.getElementById("pTitle");
  const pArtist = document.getElementById("pArtist");
  const pCover = document.getElementById("pCover");
  const pClose = document.getElementById("pClose");

  function playTrack(t) {
    audio.src = t.audio;
    audio.play().catch(() => {});
    pTitle.textContent = t.title || "Untitled";
    pArtist.textContent = cfg.artistName || "";
    pCover.src = t.cover || "";
    player.classList.remove("hidden");
  }

  pClose.addEventListener("click", () => {
    audio.pause();
    player.classList.add("hidden");
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
})();
