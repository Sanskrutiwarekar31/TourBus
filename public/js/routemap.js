document.addEventListener("DOMContentLoaded", async () => {
  const C = TourBusCatalog, { esc, inr } = TB, q = TB.qs;
  const names = Object.keys(C.cities).sort(), busSet = new Set(C.busCities());
  const from = document.getElementById("from"), to = document.getElementById("to"), err = document.getElementById("routeError"), info = document.getElementById("routeInfo");
  document.getElementById("cityOptions").innerHTML = names.map(n => `<option value="${esc(n)}" label="${esc(C.cities[n].state)}"></option>`).join("");
  if (C.cities[q.get("from")]) from.value = q.get("from"); if (C.cities[q.get("to")]) to.value = q.get("to");
  const map = await TBMap.create("bigMap");
  let route = null, me = null, routeRequest = 0;

  function redraw() {
    map.clear();
    const showNetwork = document.getElementById("layerBus").checked && !route;
    if (showNetwork) {
      const seen = new Set();
      C.buses.forEach(b => { const k = [b.source, b.destination].sort().join("|"); if (seen.has(k)) return; seen.add(k); map.addRoute([[C.cities[b.source].lat, C.cities[b.source].lng], [C.cities[b.destination].lat, C.cities[b.destination].lng]], { color: "#17705a", weight: 2, dashed: true }); });
      names.filter(n => busSet.has(n)).forEach(n => map.addPin({ lat: C.cities[n].lat, lng: C.cities[n].lng, label: n, kind: "city", html: `<strong>${esc(n)}</strong><br>${esc(C.cities[n].state)}<br>${C.buses.filter(b => b.source === n).length} departing routes` }));
    }
    if (document.getElementById("layerTours").checked && !route) C.tours.forEach(t => { const c = C.cities[t.destination]; map.addPin({ lat: c.lat + .1, lng: c.lng + .1, label: t.name, kind: "tour", href: "tour-details.html?id=" + encodeURIComponent(t.id), html: `<strong>${esc(t.name)}</strong><br>${esc(t.duration)} · ${inr(t.price)}<br><a href="tour-details.html?id=${encodeURIComponent(t.id)}">View package →</a>` }); });
    if (route) {
      route.legs.forEach((leg, index) => {
        const path = leg.path || [[C.cities[leg.source].lat, C.cities[leg.source].lng], [C.cities[leg.destination].lat, C.cities[leg.destination].lng]];
        map.addRoute(path, { color: "#ff6a45", weight: 6 });
      });
      const citiesOnRoute = [route.legs[0].source, ...route.legs.map(leg => leg.destination)];
      [...new Set(citiesOnRoute)].forEach(cityName => {
        const index = citiesOnRoute.indexOf(cityName), city = C.cities[cityName];
        const leg = index < route.legs.length ? route.legs[index] : route.legs[index - 1];
        const options = C.buses.filter(bus => bus.source === leg.source && bus.destination === leg.destination);
        const fare = options.length ? Math.min(...options.map(bus => bus.fare)) : null;
        const label = options.length ? `${options.length} sample bus${options.length === 1 ? "" : "es"} · from ${inr(fare)}` : "Suggested road leg · no sample bus schedule";
        const marker = index === 0 ? "A" : index === citiesOnRoute.length - 1 ? "B" : String(index);
        map.addPin({ lat: city.lat, lng: city.lng, label: cityName, kind: index === 0 ? "start" : "tour", number: marker, html: `<strong>${esc(cityName)}</strong><br>${index < route.legs.length ? "Depart" : "Arrive"} · ${esc(label)}` });
      });
    }
    if (me) map.addPin({ lat: me.lat, lng: me.lng, label: "You are here", kind: "start", number: "★", html: "<strong>You are here</strong>" });
    map.fit();
  }

  function drawDrivingRoute(legs, requestId) {
    Promise.all(legs.map(leg => fetch(`https://router.project-osrm.org/route/v1/driving/${C.cities[leg.source].lng},${C.cities[leg.source].lat};${C.cities[leg.destination].lng},${C.cities[leg.destination].lat}?overview=full&geometries=geojson&steps=false`)
      .then(response => {
        if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!data.routes || !data.routes[0]) throw new Error(`No road route was returned for ${leg.source} to ${leg.destination}.`);
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      })))
      .then(paths => {
        if (requestId !== routeRequest || !route) return;
        route.legs.forEach((leg, index) => { leg.path = paths[index]; });
        redraw();
      })
      .catch(error => {
        if (requestId !== routeRequest) return;
        document.getElementById("busTrackInfo").insertAdjacentHTML("beforeend", `<p class="alert info">Detailed road directions are currently unavailable. Showing the route between cities instead.</p>`);
        console.warn("[map] driving directions unavailable:", error.message);
      });
  }

  function showRoute(e) {
    if (e) e.preventDefault();
    err.classList.add("hidden");
    from.value = names.find(city => city.toLowerCase() === from.value.trim().toLowerCase()) || from.value.trim();
    to.value = names.find(city => city.toLowerCase() === to.value.trim().toLowerCase()) || to.value.trim();
    if (!from.value || !to.value) { err.textContent = "Please enter both cities."; err.classList.remove("hidden"); return; }
    if (from.value === to.value) { err.textContent = "Choose two different cities."; err.classList.remove("hidden"); return; }
    if (!C.cities[from.value] || !C.cities[to.value]) {
      err.textContent = "Choose a city from the suggestions so the map can locate it.";
      err.classList.remove("hidden");
      return;
    }
    const stops = (q.get("via") || "").split(",").filter(city => C.cities[city] && city !== from.value && city !== to.value);
    const points = [from.value, ...stops, to.value];
    const legs = points.slice(1).map((destination, index) => ({ source: points[index], destination, path: null }));
    route = { a: from.value, b: to.value, legs };
    const requestId = ++routeRequest;
    const busTrackInfo = document.getElementById("busTrackInfo");
    const direct = legs.length === 1 && C.buses.some(bus => bus.source === from.value && bus.destination === to.value);
    busTrackInfo.innerHTML = `<div class="route-leg-list"><h3>${direct ? "Available bus route" : "Suggested route track"}</h3>
      ${legs.map((leg, index) => {
        const buses = C.buses.filter(bus => bus.source === leg.source && bus.destination === leg.destination).sort((a, b) => a.fare - b.fare);
        const params = new URLSearchParams({ source: leg.source, destination: leg.destination, date: q.get("date") || TB.today(), passengers: q.get("passengers") || 1 });
        return `<article class="route-leg-card"><span class="leg-index">${index + 1}</span><div><strong>${esc(leg.source)} → ${esc(leg.destination)}</strong>
          ${buses.length ? buses.slice(0, 2).map(bus => `<small>${esc(bus.operator)} · ${esc(bus.departure)}–${esc(bus.arrival)} · ${inr(bus.fare)}</small>`).join("") : "<small>No sample bus schedule for this leg</small>"}</div>
          ${buses.length ? `<a class="link" href="buses.html?${params}">View buses</a>` : ""}</article>`;
      }).join("")}
      ${!direct ? `<p class="muted" style="font-size:12px;margin:12px 0">Transfers are suggestions only. Book each bus leg separately and verify connection times with the operators.</p>` : ""}
      <a class="link" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route.a)}&destination=${encodeURIComponent(route.b)}${stops.length ? `&waypoints=${encodeURIComponent(stops.join("|"))}` : ""}">Open directions in Google Maps ↗</a></div>`;
    const distance = legs.reduce((sum, leg) => sum + C.roadKm(leg.source, leg.destination), 0);
    info.innerHTML = `<div class="row"><span>Suggested road distance</span><strong>~${distance} km</strong></div>
      <div class="row"><span>Route legs</span><strong>${legs.length}</strong></div>
      <div class="row"><span>Scheduled direct buses</span><strong>${legs.length === 1 ? C.buses.filter(bus => bus.source === route.a && bus.destination === route.b).length : "—"}</strong></div>`;
    redraw();
    drawDrivingRoute(legs, requestId);
  }
  document.getElementById("routeForm").addEventListener("submit", showRoute);
  ["layerBus", "layerTours"].forEach(id => document.getElementById(id).addEventListener("change", redraw));

  document.getElementById("locate").addEventListener("click", () => {
    if (!navigator.geolocation) return TB.toast("Your browser does not support location", true);
    navigator.geolocation.getCurrentPosition(pos => {
      me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const ranked = names.map(n => ({ n, d: C.haversineKm(me, C.cities[n]) })).sort((a, b) => a.d - b.d);
      from.value = ranked[0].n;
      const near = C.tours.map(t => ({ t, d: C.haversineKm(me, C.cities[t.destination]) })).sort((a, b) => a.d - b.d).slice(0, 3);
      document.getElementById("nearby").innerHTML = `<div class="panel"><h3>Nearest city: ${esc(ranked[0].n)} (~${Math.round(ranked[0].d)} km away)</h3><div class="grid g3">${near.map(x => TBCards.tourCard(x.t, `<small class="muted">~${Math.round(x.d * 1.25)} km from you</small>`)).join("")}</div></div>`;
      redraw();
    }, () => TB.toast("Location permission was denied - choose a city manually.", true), { timeout: 8000 });
  });
  if (from.value && to.value) showRoute(); else redraw();
});
