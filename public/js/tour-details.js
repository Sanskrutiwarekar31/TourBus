document.addEventListener("DOMContentLoaded", async () => {
  const C = TourBusCatalog, { esc, inr } = TB, root = document.getElementById("detail");
  const t = C.tours.find(x => x.id === TB.qs.get("id"));
  if (!t) { document.querySelector(".page-head h1").textContent = "Tour not found"; document.querySelector(".page-head p").textContent = ""; root.innerHTML = '<div class="empty"><h3>We could not find that package</h3><a class="btn coral" href="tour-packages.html">Browse all tours</a></div>'; return; }
  document.title = t.name + " | TourBus";
  document.querySelector(".page-head h1").textContent = t.name;
  document.querySelector(".page-head p").textContent = `${t.duration} · ${t.destination} · ★ ${t.rating} · ${TBCards.themeLabel[t.theme] || ""}`;
  const cityOpts = Object.keys(C.cities).filter(c => c !== t.destination).sort().map(c => `<option ${c === t.startHint ? "selected" : ""}>${esc(c)}</option>`).join("");
  root.innerHTML = `<div class="two-col">
    <div>
      <div class="card destination-photo" style="border-radius:24px"><img src="${esc(t.imageUrl)}" alt="Photograph of ${esc(t.destination)}" fetchpriority="high"></div>
      <div class="panel" style="margin-top:20px"><h2>About this trip</h2><p>${esc(t.description)}</p>
        <div class="pills">${t.interests.map(i => `<span class="pill">${esc(i)}</span>`).join("")}<span class="pill warm">${esc(t.level)}</span><span class="pill gold">${t.slots} slots / departure</span></div>
        <h3 style="margin-top:18px">Best time to go</h3><div class="pills" id="months">${C.monthNames.map((m, i) => `<span class="pill" style="${t.bestMonths.includes(i + 1) ? "" : "background:#f1efe8;color:#9a9a90"}">${m}</span>`).join("")}</div></div>
      <div class="panel" style="margin-top:20px"><h2>Explore before you visit</h2><p class="muted">Preview nearby stays, food, shopping and essential services in Google Maps. Live availability and prices depend on each provider.</p>
        <div class="facility-links">${[
          ["Hotels & homestays", "hotels"], ["Restaurants & lunch", "restaurants"], ["Markets & shopping", "shopping malls"],
          ["Hospitals & pharmacies", "hospitals pharmacies"], ["ATMs & fuel", "ATMs petrol pumps"], ["Parking & transport", "parking public transport"]
        ].map(([label, query]) => `<a class="facility-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + " near " + t.destination)}" target="_blank" rel="noopener noreferrer"><strong>${esc(label)}</strong><span>Find near ${esc(t.destination)} ↗</span></a>`).join("")}</div>
      </div>
      <div class="panel" style="margin-top:20px"><h2>Day-by-day plan</h2><ul class="timeline">${t.itinerary.map((d, i) => `<li data-day="D${i + 1}"><strong>Day ${i + 1}</strong><br><span class="muted">${esc(d)}</span></li>`).join("")}</ul></div>
      <div class="panel" style="margin-top:20px"><h2>Getting there</h2>
        <div class="field" style="max-width:280px"><label for="startSel">Starting city</label><select id="startSel">${cityOpts}</select></div>
        <p id="routeText" class="muted"></p><div class="map-box" style="margin-top:12px"><div id="tourMap" class="map short"></div></div><div id="busLinks" style="margin-top:14px"></div></div>
    </div>
    <aside class="panel summary">
      <div class="price" style="font-size:30px">${inr(t.price)} <small>/ person</small></div>
      <h3 style="margin-top:14px">Request this package</h3>
      <form id="enqForm" novalidate>
        <div class="field"><label for="eName">Full name</label><input id="eName" name="name" autocomplete="name"><span class="err" data-error-for="name"></span></div>
        <div class="field" style="margin-top:10px"><label for="ePhone">Mobile number</label><input id="ePhone" name="phone" inputmode="numeric" maxlength="10"><span class="err" data-error-for="phone"></span></div>
        <div class="field" style="margin-top:10px"><label for="eEmail">Email</label><input id="eEmail" name="email" type="email"><span class="err" data-error-for="email"></span></div>
        <div class="form-grid" style="margin-top:10px"><div class="field"><label for="eDate">Start date</label><input id="eDate" name="startDate" type="date"><span class="err" data-error-for="startDate"></span></div>
          <div class="field"><label for="eTrav">Travellers</label><input id="eTrav" name="travellers" type="number" min="1" max="${t.slots}" value="2"><span class="err" data-error-for="travellers"></span></div></div>
        <div class="row total" style="margin-top:12px"><span>Estimated total</span><strong id="eTotal">${inr(t.price * 2)}</strong></div>
        <div id="enqMsg" role="status"></div>
        <button class="btn coral block" type="submit">Send request</button></form>
    </aside></div>`;

  const f = document.getElementById("enqForm"), d = f.startDate; d.min = TB.today(); d.value = TB.today();
  const user = TB.getUser(); if (user) { f.name.value = user.name; f.email.value = user.email; f.phone.value = user.phone || ""; }
  f.travellers.addEventListener("input", () => { const n = Number(f.travellers.value); document.getElementById("eTotal").textContent = Number.isInteger(n) && n > 0 ? inr(n * t.price) : "—"; });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries()), errors = {};
    const set = (k, m) => { if (m) errors[k] = m; };
    set("name", TB.rules.name(v.name)); set("phone", TB.rules.phone(v.phone)); set("email", TB.rules.email(v.email)); set("startDate", TB.rules.futureDate(v.startDate)); set("travellers", TB.rules.int(v.travellers, "Travellers", 1, t.slots));
    if (!TB.showErrors(f, errors)) return;
    const r = await TB.api("POST", "/api/tour-enquiries", { tourId: t.id, ...v, travellers: Number(v.travellers) });
    const box = document.getElementById("enqMsg");
    if (r.ok) { box.innerHTML = `<div class="alert good">✓ Request ${esc(r.data.enquiry.enquiryId)} received. Total ${inr(r.data.enquiry.total)}. Our team will call you.</div>`; TB.clearErrors(f); }
    else if (r.offline) box.innerHTML = '<div class="alert info">Server offline - start it with npm start to submit requests.</div>';
    else { TB.showErrors(f, r.data.errors || {}); box.innerHTML = `<div class="alert bad">${esc(r.data.message)}</div>`; }
  });

  const map = await TBMap.create("tourMap");
  const sel = document.getElementById("startSel");
  function draw() {
    const a = C.cities[sel.value], b = C.cities[t.destination];
    map.clear(); if (!a || !b) return;
    const path = [[a.lat, a.lng], [b.lat, b.lng]];
    map.addRoute(path, { color: "#ff6a45" });
    map.addPin({ lat: a.lat, lng: a.lng, label: sel.value, kind: "start", number: "A", html: `<strong>${esc(sel.value)}</strong><br>Your starting city` });
    map.addPin({ lat: b.lat, lng: b.lng, label: t.destination, kind: "tour", number: "B", html: `<strong>${esc(t.destination)}</strong><br>${esc(t.name)}` });
    map.fit(); map.animateBus(path);
    const km = C.roadKm(sel.value, t.destination);
    document.getElementById("routeText").textContent = `${sel.value} → ${t.destination}: about ${km} km by road (approx.), roughly ${Math.max(1, Math.round(km / 50))} h of driving.`;
    const direct = C.buses.filter(x => x.source === sel.value && x.destination === t.destination);
    const toDest = C.buses.filter(x => x.destination === t.destination);
    document.getElementById("busLinks").innerHTML = direct.length
      ? `<a class="btn sm" href="buses.html?${new URLSearchParams({ source: sel.value, destination: t.destination, date: TB.today(), passengers: 1 })}">🚌 ${direct.length} direct bus${direct.length > 1 ? "es" : ""} from ${esc(sel.value)} - book now</a>`
      : toDest.length ? `<p class="muted">No direct bus from ${esc(sel.value)}. Buses reach ${esc(t.destination)} from: ${[...new Set(toDest.map(x => x.source))].map(esc).join(", ")}.</p>` : `<p class="muted">No scheduled bus to ${esc(t.destination)} yet - the package includes road transfers.</p>`;
  }
  sel.addEventListener("change", draw); draw();
});
