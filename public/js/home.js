/* home.js - every interactive feature of the home page. */
document.addEventListener("DOMContentLoaded", () => {
  const C = TourBusCatalog, { esc, inr, today } = TB;
  const $ = id => document.getElementById(id);

  /* ----- tabs ----- */
  const forms = { bus: $("busForm"), tour: $("tourForm"), plan: $("planForm") };
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => { t.classList.toggle("active", t === tab); t.setAttribute("aria-selected", t === tab); });
    Object.entries(forms).forEach(([k, f]) => f.classList.toggle("hidden", k !== tab.dataset.tab));
    $("searchMessage").textContent = "";
  }));
  if (location.hash === "#plan") document.querySelector('[data-tab="plan"]').click();

  /* ----- bus search ----- */
  const cities = Object.keys(C.cities).sort();
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l ?? v)}</option>`;
  $("cityOptions").innerHTML = cities.map(c => opt(c, `${c} · ${C.cities[c].state}`)).join("");
  $("destinationOptions").innerHTML = [...new Set(C.tours.map(t => t.destination))].sort().map(c => opt(c)).join("");
  $("fromCity").value = "Pune"; $("toCity").value = "Goa";
  const date = $("travelDate"); date.min = today(); date.max = TB.maxBookingDate(); date.value = today();
  $("swapCities").addEventListener("click", () => { const a = $("fromCity"), b = $("toCity"); [a.value, b.value] = [b.value, a.value]; });

  forms.bus.addEventListener("submit", e => {
    e.preventDefault();
    for (const id of ["fromCity", "toCity"]) {
      const input = $(id);
      input.value = cities.find(city => city.toLowerCase() === input.value.trim().toLowerCase()) || input.value.trim();
    }
    const v = Object.fromEntries(new FormData(forms.bus).entries());
    const msg = $("searchMessage");
    const err = TB.rules.required(v.source, "Departure city") || TB.rules.required(v.destination, "Destination")
      || (v.source === v.destination ? "Departure and destination must be different cities." : "") || TB.rules.bookingDate(v.date);
    if (err) { msg.textContent = err; return; }
    TB.recordRouteSearch(v.source, v.destination);
    msg.textContent = "";
    location.href = "buses.html?" + new URLSearchParams(v).toString();
  });

  /* ----- tour browse form ----- */
  forms.tour.addEventListener("submit", e => {
    e.preventDefault();
    const p = new URLSearchParams(Object.fromEntries([...new FormData(forms.tour).entries()].filter(([, v]) => v)));
    location.href = "tour-packages.html?" + p.toString();
  });

  /* ----- suggester form (goes to planner, which runs immediately) ----- */
  $("planInterest").innerHTML += C.interestOptions.map(i => opt(i, i[0].toUpperCase() + i.slice(1))).join("");
  $("planMonth").innerHTML += C.monthNames.map((m, i) => opt(i + 1, m)).join("");
  forms.plan.addEventListener("submit", e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(forms.plan).entries());
    const msg = $("searchMessage");
    const err = TB.rules.int(v.budget, "Budget", 500, 200000) || TB.rules.int(v.days, "Days", 1, 14);
    if (err) { msg.textContent = err; return; }
    const p = new URLSearchParams({ budget: v.budget, days: v.days, run: "1" });
    if (v.interest) p.set("interests", v.interest);
    if (v.month) p.set("month", v.month);
    location.href = "trip-planner.html?" + p.toString();
  });

  /* ----- popular routes ----- */
  const popular = [["Pune", "Goa"], ["Mumbai", "Pune"], ["Pune", "Mumbai"], ["Mumbai", "Goa"], ["Delhi", "Jaipur"], ["Pune", "Bengaluru"], ["Delhi", "Manali"], ["Bengaluru", "Hampi"]];
  const routeUrl = (a, b) => "buses.html?" + new URLSearchParams({ source: a, destination: b, date: today(), passengers: 1 });
  const storedRoutes = TB.trendingRoutes(8);
  const trending = storedRoutes.length ? storedRoutes.map(route => [route.source, route.destination, route.count]) : popular.map(([a,b]) => [a,b,0]);
  $("quickRoutes").innerHTML += trending.slice(0, 5).map(([a, b]) => `<a class="chip" href="${routeUrl(a, b)}">${esc(a)} → ${esc(b)}</a>`).join("");
  $("routeGrid").innerHTML = trending.map(([a, b, count]) => {
    const list = C.buses.filter(x => x.source === a && x.destination === b);
    const min = list.length ? Math.min(...list.map(x => x.fare)) : null;
    const distance = C.cities[a] && C.cities[b] ? ` · ~${C.roadKm(a, b)} km` : "";
    const busInfo = list.length ? `${list.length} bus${list.length > 1 ? "es" : ""} · from ${inr(min)}` : "Check route availability";
    return `<a class="route-chip" href="${routeUrl(a, b)}"><span>${esc(a)} → ${esc(b)}<small>${count ? `Searched ${count} time${count > 1 ? "s" : ""} · ` : ""}${busInfo}${distance}</small></span><span class="go">→</span></a>`;
  }).join("");
  $("statRoutes").dataset.count = new Set(C.buses.map(b => b.source + b.destination)).size;
  $("statTours").dataset.count = C.tours.length;
  $("statCities").dataset.count = Object.keys(C.cities).length;

  /* ----- destinations + featured tours ----- */
  const byId = id => C.tours.find(t => t.id === id);
  $("destGrid").innerHTML = destCardsHtml();
  function destCardsHtml() {
    return TBCards.destCard(byId("TOUR101"), "01 / Coastal escape", true) + TBCards.destCard(byId("TOUR107"), "02 / Mountain air") + TBCards.destCard(byId("TOUR105"), "03 / Culture & colour")
      + TBCards.destCard(byId("TOUR106"), "04 / Slow & scenic") + TBCards.destCard(byId("TOUR109"), "05 / Lakes & palaces");
  }
  $("tourGrid").innerHTML = [...C.tours].sort((a, b) => b.rating - a.rating).slice(0, 6).map(t => TBCards.tourCard(t)).join("");

  /* ----- inline suggester widget ----- */
  const picked = new Set(["beach"]);
  $("homeInterests").innerHTML = C.interestOptions.map(i => `<button type="button" class="chip ${picked.has(i) ? "on" : ""}" data-i="${i}" aria-pressed="${picked.has(i)}">${i}</button>`).join("");
  function runWidget() {
    const budget = Number($("hBudget").value), days = Number($("hDays").value);
    $("hBudgetOut").textContent = inr(budget);
    const prefs = { budget, days, interests: [...picked], startCity: "Pune" };
    const res = TourBusRecommender.suggest(prefs, 3);
    $("homeSuggestions").innerHTML = res.map((r, i) => TBCards.suggestionCard(r, i + 1)).join("");
    const p = new URLSearchParams({ budget, days, run: 1 }); if (picked.size) p.set("interests", [...picked].join(","));
    $("homePlanLink").href = "trip-planner.html?" + p;
  }
  $("homeInterests").addEventListener("click", e => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = b.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i);
    b.classList.toggle("on", picked.has(i)); b.setAttribute("aria-pressed", picked.has(i)); runWidget();
  });
  $("hBudget").addEventListener("input", runWidget); $("hDays").addEventListener("change", runWidget);
  runWidget();

  /* ----- preview map: bus network + tour destinations ----- */
  TBMap.create("homeMap").then(m => {
    if (!m) return;
    const drawn = new Set();
    C.buses.forEach(b => { const k = [b.source, b.destination].sort().join("|"); if (drawn.has(k)) return; drawn.add(k); m.addRoute([[C.cities[b.source].lat, C.cities[b.source].lng], [C.cities[b.destination].lat, C.cities[b.destination].lng]], { color: "#17705a", weight: 3, dashed: true }); });
    C.busCities().forEach(c => m.addPin({ lat: C.cities[c].lat, lng: C.cities[c].lng, label: c, kind: "city", html: `<strong>${esc(c)}</strong><br>${C.buses.filter(b => b.source === c).length} departing routes<br><a href="${routeUrl(c, C.buses.find(b => b.source === c)?.destination || "Goa")}">Search buses →</a>` }));
    C.tours.forEach(t => { const c = C.cities[t.destination]; if (c) m.addPin({ lat: c.lat + 0.12, lng: c.lng + 0.12, label: t.name, kind: "tour", href: "tour-details.html?id=" + t.id, html: `<strong>${esc(t.name)}</strong><br>${esc(t.duration)} · ${inr(t.price)}<br><a href="tour-details.html?id=${t.id}">View package →</a>` }); });
    m.fit();
  });

  /* ----- animated counters ----- */
  const counters = document.querySelectorAll("[data-count]");
  const run = el => {
    const target = Number(el.dataset.count), suffix = el.dataset.suffix || "", t0 = performance.now(), dur = 1400;
    const step = now => { const f = Math.min(1, (now - t0) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - f, 3))).toLocaleString("en-IN") + suffix; if (f < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .4 }); counters.forEach(c => io.observe(c)); }
  else counters.forEach(run);
});
