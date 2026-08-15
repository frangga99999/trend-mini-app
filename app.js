/* IDEA SCRAPPER Mini App — vanilla JS, tanpa dependency, <6KB */
(function () {
  "use strict";

  var DATA_URL = "data.json";
  var BOT_URL = "https://t.me/IdeaScrapperbot";
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  var data = null;
  var currentTab = "home";
  var query = "";

  /* ── Telegram integration ── */
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor && tg.setHeaderColor("#0f1117");
    tg.setBackgroundColor && tg.setBackgroundColor("#0f1117");
  }
  function haptic(kind) {
    if (tg && tg.HapticFeedback) {
      try { tg.HapticFeedback.impactOccurred(kind || "light"); } catch (e) {}
    }
  }

  /* ── Date helpers ── */
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
  }
  function today() {
    return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  /* ── Rendering helpers ── */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function scoreClass(score) {
    var s = parseInt(score, 10);
    if (isNaN(s)) return "s-mid";
    return s >= 70 ? "s-high" : s >= 50 ? "s-mid" : "s-low";
  }
  function medal(i) { return ["🥇", "🥈", "🥉"][i] || "🔹"; }
  function sources(arr) {
    if (!arr || !arr.length) return "";
    return '<div class="src">🔗 ' + arr.map(function (u) {
      return '<a href="' + u + '" target="_blank">' + u.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 42) + "</a>";
    }).join(" · ") + "</div>";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtLines(s) {
    return esc(s).replace(/\n/g, "<br>");
  }

  /* ── Empty states ── */
  function emptyState(id, emoji, title, sub) {
    var v = document.getElementById(id);
    v.innerHTML = "";
    v.appendChild(el("div", "empty",
      '<div class="big">' + emoji + '</div><h3>' + title + '</h3><p>' + sub +
      '</p><p style="margin-top:14px"><a href="' + BOT_URL + '" target="_blank">Buka @IdeaScrapperbot →</a></p>'));
  }

  /* ── View renderers ── */
  function renderHome() {
    document.getElementById("heroDate").textContent = today();
    if (!data) {
      document.getElementById("heroTitle").textContent = "Belum Ada Laporan";
      document.getElementById("heroSummary").textContent = "Laporan tren pertama akan masuk otomatis pukul 09:00 WIB. Cek lagi nanti, atau minta langsung ke bot.";
      ["miniTop3", "miniInsight", "miniRegional", "miniProduct"].forEach(function (id) {
        document.getElementById(id).textContent = "Menunggu laporan…";
      });
      document.getElementById("updatedAt").textContent = "Terakhir diperbarui: —";
      return;
    }
    document.getElementById("heroTitle").textContent = data.summary_title || "Ringkasan Tren Hari Ini";
    document.getElementById("heroSummary").innerHTML = fmtLines(data.summary || "Belum ada ringkasan.");
    var t3 = (data.top3 || []);
    var ins = (data.insights || []);
    var reg = (data.regions || []);
    var prod = (data.products || []);
    document.getElementById("miniTop3").textContent = t3.length ? t3[0].title + (t3[1] ? " · " + t3[1].title : "") : "Belum ada";
    document.getElementById("miniInsight").textContent = ins.length ? ins[0].title : "Belum ada";
    document.getElementById("miniRegional").textContent = reg.length ? reg.map(function (r) { return r.region; }).slice(0, 2).join(" · ") : "Belum ada";
    document.getElementById("miniProduct").textContent = prod.length ? prod[0].title : "Belum ada";
    document.getElementById("updatedAt").textContent = "Terakhir diperbarui: " + fmtDate(data.updated_at);
    renderSparkline((data.memory && data.memory.entries) || []);
  }

  function renderTop3() {
    var box = document.getElementById("listTop3");
    box.innerHTML = "";
    if (!data || !data.top3 || !data.top3.length) {
      emptyState("listTop3", "🔥", "Belum ada data", "Laporan pertama otomatis masuk setiap 09:00 WIB.");
      return;
    }
    data.top3.forEach(function (t, i) {
      box.appendChild(el("div", "item",
        '<div class="rank"><span class="medal">' + medal(i) + '</span><h3>' + esc(t.title) + "</h3>" +
        '<span class="score ' + scoreClass(t.score) + '">' + esc(t.score || "—") + "</span></div>" +
        (t.momentum ? '<span class="tag">' + esc(t.momentum) + "</span>" : "") +
        (t.global ? "<p><b>Global:</b> " + fmtLines(t.global) + "</p>" : "") +
        (t.indonesia ? "<p><b>Indonesia:</b> " + fmtLines(t.indonesia) + "</p>" : "") +
        (t.opportunity ? "<p><b>Peluang:</b> " + fmtLines(t.opportunity) + "</p>" : "") +
        sources(t.sources)));
    });
  }

  function renderInsight() {
    var box = document.getElementById("listInsight");
    box.innerHTML = "";
    if (!data || !data.insights || !data.insights.length) {
      emptyState("listInsight", "💡", "Belum ada insight", "Bot menganalisis peluang bisnis tiap hari — cek besok pagi.");
      return;
    }
    data.insights.forEach(function (it) {
      box.appendChild(el("div", "item",
        "<h3>" + esc(it.title) + "</h3>" +
        (it.opportunity_score ? '<span class="score ' + scoreClass(it.opportunity_score) + '" style="float:right">' + esc(it.opportunity_score) + "</span>" : "") +
        (it.what ? "<p><b>Apa yang terjadi:</b> " + fmtLines(it.what) + "</p>" : "") +
        (it.pain ? "<p><b>Pain point:</b> " + fmtLines(it.pain) + "</p>" : "") +
        (it.target ? '<p class="lbl">🎯 Target: ' + esc(it.target) + "</p>" : "") +
        (it.existing ? '<p class="lbl">🔄 Solusi saat ini: ' + esc(it.existing) + "</p>" : "") +
        (it.opportunity ? "<p><b>Peluang produk:</b> " + fmtLines(it.opportunity) + "</p>" : "") +
        sources(it.sources)));
    });
  }

  function renderRegional() {
    var box = document.getElementById("listRegional");
    box.innerHTML = "";
    if (!data || !data.regions || !data.regions.length) {
      emptyState("listRegional", "🗺️", "Belum ada data regional", "Analisis per daerah menyusul setelah laporan harian.");
      return;
    }
    data.regions.forEach(function (r) {
      box.appendChild(el("div", "item",
        "<h3>📍 " + esc(r.region) + "</h3>" +
        (r.trend ? "<p><b>Trend:</b> " + fmtLines(r.trend) + "</p>" : "") +
        (r.signal ? '<p class="lbl">📶 Signal: ' + esc(r.signal) + "</p>" : "") +
        (r.opportunity ? "<p><b>Peluang:</b> " + fmtLines(r.opportunity) + "</p>" : "") +
        sources(r.sources)));
    });
  }

  function renderProduct() {
    var box = document.getElementById("listProduct");
    box.innerHTML = "";
    if (!data || !data.products || !data.products.length) {
      emptyState("listProduct", "🚀", "Belum ada rekomendasi", "Rekomendasi produk digital + validasi tiap hari dari bot.");
      return;
    }
    data.products.forEach(function (p) {
      box.appendChild(el("div", "item",
        "<h3>" + esc(p.title) + "</h3>" +
        (p.score ? '<span class="score ' + scoreClass(p.score) + '" style="float:right">' + esc(p.score) + "</span>" : "") +
        (p.target ? '<p class="lbl">🎯 Target: ' + esc(p.target) + "</p>" : "") +
        (p.problem ? "<p><b>Problem:</b> " + fmtLines(p.problem) + "</p>" : "") +
        (p.solution ? "<p><b>Solusi:</b> " + fmtLines(p.solution) + "</p>" : "") +
        (p.mvp ? '<p class="lbl">🛠 MVP: ' + esc(p.mvp) + "</p>" : "") +
        (p.monetization ? '<p class="lbl">💰 ' + esc(p.monetization) + "</p>" : "") +
        (p.validation ? "<p><b>Validasi:</b> " + fmtLines(p.validation) + "</p>" : "") +
        sources(p.sources)));
    });
  }

  function renderMemory() {
    var box = document.getElementById("listMemory");
    box.innerHTML = "";
    if (!data || !data.memory || !data.memory.length) {
      emptyState("listMemory", "🧠", "Memory masih kosong", "Setiap laporan 09:00 WIB tercatat di sini — lama-lama terlihat pola tren yang sejati.");
      return;
    }
    var m = data.memory;
    var stats = m.stats || {};
    box.appendChild(el("div", "item",
      "<h3>Ringkasan</h3>" +
      '<p class="lbl">Total tren tercatat: <b>' + esc(stats.total || m.entries ? m.entries.length : 0) + "</b></p>" +
      (stats.dominant ? '<p class="lbl">Kategori dominan: <b>' + esc(stats.dominant) + "</b></p>" : "") +
      (stats.repeating && stats.repeating.length ? '<p class="lbl">Menguat (muncul berulang): <b>' + esc(stats.repeating.join(", ")) + "</b></p>" : "")));
    var list = (m.entries || []);
    if (query) {
      list = list.filter(function (e) {
        return [e.trend, e.category, e.region, e.stage, e.product].join(" ").toLowerCase().indexOf(query) !== -1;
      });
      if (list.length) box.appendChild(el("div", "item", '<p class="lbl">🔍 ' + list.length + ' hasil untuk "' + esc(query) + '"</p>'));
    }
    list.slice(0, 8).forEach(function (e) {
      box.appendChild(el("div", "item",
        '<div class="rank"><h3>' + esc(e.trend) + "</h3>" +
        (e.score ? '<span class="score ' + scoreClass(e.score) + '">' + esc(e.score) + "</span>" : "") + "</div>" +
        (e.date ? '<p class="lbl">🗓 ' + esc(e.date) + "</p>" : "") +
        (e.stage ? '<span class="tag">' + esc(e.stage) + "</span>" : "") +
        (e.region ? '<span class="tag">📍 ' + esc(e.region) + "</span>" : "")));
    });
  }

  function renderSparkline(entries) {
    var wrap = document.getElementById("sparkWrap");
    var svg = document.getElementById("sparkline");
    if (!entries || entries.length < 2) { wrap.hidden = true; return; }
    var scores = entries.map(function (e) {
      var s = parseInt(e.score, 10);
      return isNaN(s) ? null : s;
    }).filter(function (v) { return v != null; });
    if (scores.length < 2) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var W = 300, H = 36, pad = 4;
    var min = Math.min.apply(null, scores), max = Math.max.apply(null, scores);
    var range = (max - min) || 1;
    var step = W / (scores.length - 1);
    var pts = scores.map(function (v, i) {
      var x = i * step;
      var y = pad + (H - pad * 2) * (1 - (v - min) / range);
      return [x, y];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = line + " L " + W + " " + H + " L 0 " + H + " Z";
    var last = pts[pts.length - 1];
    var gradId = "sparkGrad";
    svg.innerHTML =
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#4f8cff" stop-opacity="0.5"/>' +
      '<stop offset="100%" stop-color="#4f8cff" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + line + '"/>' +
      '<circle class="dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3"/>';
  }

  var RENDER = {
    home: renderHome, top3: renderTop3, insight: renderInsight,
    regional: renderRegional, product: renderProduct, memory: renderMemory
  };

  /* ── Tabs ── */
  function showTab(tab, skipHaptic) {
    if (!RENDER[tab]) tab = "home";
    currentTab = tab;
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.dataset.tab === tab);
    });
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    if (!skipHaptic) haptic("light");
    RENDER[tab]();
  }

  document.getElementById("tabbar").addEventListener("click", function (e) {
    var b = e.target.closest(".tab");
    if (b) showTab(b.dataset.tab);
  });
  document.querySelectorAll(".card[data-goto]").forEach(function (c) {
    c.addEventListener("click", function () { showTab(c.dataset.goto); haptic("medium"); });
  });

  /* ── Data loading ── */
  function loadData(showSkeleton) {
    if (showSkeleton) {
      ["listTop3", "listInsight", "listRegional", "listProduct", "listMemory"].forEach(function (id) {
        var v = document.getElementById(id);
        v.innerHTML = "";
        for (var i = 0; i < 3; i++) v.appendChild(el("div", "skel"));
      });
    }
    var t0 = Date.now();
    fetch(DATA_URL + "?ts=" + t0, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        data = j && j.data ? j.data : j;
        showTab(currentTab, true);
        if (tg) { try { tg.HapticFeedback.notificationOccurred("success"); } catch (e) {} }
      })
      .catch(function () {
        if (!data) showTab(currentTab, true);
        var u = document.getElementById("updatedAt");
        if (u) u.textContent = "⚠️ Gagal memuat data — pastikan koneksi internet.";
      });
  }

  document.getElementById("btnRefresh").addEventListener("click", function () { haptic("medium"); loadData(true); });

  var sb = document.getElementById("searchBox");
  var bc = document.getElementById("btnClear");
  sb.addEventListener("input", function () {
    query = sb.value.trim().toLowerCase();
    bc.hidden = !query;
    if (currentTab === "memory") renderMemory();
  });
  bc.addEventListener("click", function () {
    sb.value = ""; query = ""; bc.hidden = true;
    if (currentTab === "memory") renderMemory();
    haptic("light");
  });
  if (tg) {
    document.addEventListener("scroll", function () {
      var m = document.querySelector("main");
      if (m && m.scrollTop < -40) loadData(true);
    }, { passive: true });
  }

  /* ── Boot ── */
  showTab("home", true);
  loadData(false);
})();
