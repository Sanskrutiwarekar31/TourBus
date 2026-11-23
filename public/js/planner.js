document.addEventListener("DOMContentLoaded", async () => {
  const C = TourBusCatalog, { esc, inr } = TB, q = TB.qs;
  const f = document.getElementById("planner-form"), out = document.getElementById("results"), status = document.getElementById("plan-status");
  f.month.innerHTML += C.monthNames.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  f.startCity.innerHTML += Object.keys(C.cities).sort().map(c => `<option>${esc(c)}</option>`).join("");
  const chosen = new Set((q.get("interests") || "").split(",").filter(x => C.interestOptions.includes(x)));
  const chips = document.getElementById("interestChips");
  chips.innerHTML = C.interestOptions.map(i => `<button type="button" class="chip ${chosen.has(i) ? "on" : ""}" data-i="${i}" aria-pressed="${chosen.has(i)}">${i}</button>`).join("");
  chips.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const i = b.dataset.i; if (!chosen.has(i) && chosen.size >= 5) return TB.toast("Pick up to 5 interests", true); chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle("on", chosen.has(i)); b.setAttribute("aria-pressed", chosen.has(i)); });
  ["budget", "days", "travellers", "month", "startCity"].forEach(k => { if (q.has(k)) f[k].value = q.get(k); });
  const map = await TBMap.create("planMap");

  function drawMap(results, start) {
    map.clear();
    if (start && C.cities[start]) map.addPin({ lat: C.cities[start].lat, lng: C.cities[start].lng, label: start, kind: "start", number: "S", html: `<strong>${esc(start)}</strong><br>Your starting city` });
    results.forEach((r, i) => {
      const c = C.cities[r.tour.destination]; if (!c) return;
      map.addPin({ lat: c.lat, lng: c.lng, label: r.tour.name, kind: "tour", number: i + 1, href: "tour-details.html?id=" + r.tour.id, html: `<strong>#${i + 1} ${esc(r.tour.name)}</strong><br>${r.matchPercent}% match · ${inr(r.tour.price)}<br><a href="tour-details.html?id=${r.tour.id}">View plan →</a>` });
      if (start && C.cities[start]) map.addRoute([[C.cities[start].lat, C.cities[start].lng], [c.lat, c.lng]], { color: i === 0 ? "#ff6a45" : "#17705a", dashed: i > 0, weight: i === 0 ? 4 : 2 });
    });
    map.fit();
  }

  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries()), errors = {};
    const set = (k, m) => { if (m) errors[k] = m; };
    set("budget", TB.rules.int(v.budget, "Budget", 500, 200000)); set("days", TB.rules.int(v.days, "Days", 1, 14)); set("travellers", TB.rules.int(v.travellers || 1, "Travellers", 1, 20));
    if (!TB.showErrors(f, errors)) return;
    const prefs = { budget: Number(v.budget), days: Number(v.days), travellers: Number(v.travellers || 1), interests: [...chosen] };
    if (v.month) prefs.month = Number(v.month); if (v.startCity) prefs.startCity = v.startCity;
    status.innerHTML = '<p class="muted">Scoring all packages…</p>';
    let results, engine;
    const r = await TB.api("POST", "/api/suggest-tours", prefs);
    if (r.ok && r.data.success) {
      results = r.data.results.map(x => ({ tour: C.tours.find(t => t.id === x.tourId), matchPercent: x.matchPercent, estimatedTotal: x.estimatedTotal, reasons: x.reasons, cautions: x.cautions }));
      engine = "Validated and scored by the Express server.";
    } else if (r.offline) {
      results = TourBusRecommender.suggest(prefs, 4); engine = "Server offline: scored in your browser with the same rules.";
    } else { TB.showErrors(f, r.data.errors || {}); status.innerHTML = `<div class="alert bad">${esc(r.data.message)}</div>`; return; }
    document.getElementById("engineNote").textContent = engine;
    status.innerHTML = `<div class="alert good">Top ${results.length} matches for ${inr(prefs.budget)} per person, ${prefs.days} day(s)${prefs.interests.length ? ", " + esc(prefs.interests.join(", ")) : ""}. ${esc(engine)}</div>`;
    out.innerHTML = results.map((x, i) => TBCards.suggestionCard(x, i + 1)).join("");
    drawMap(results, prefs.startCity);
  });
  if (q.get("run") === "1") f.requestSubmit(); else drawMap([], "");
});
