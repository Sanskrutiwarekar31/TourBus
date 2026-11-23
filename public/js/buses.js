document.addEventListener("DOMContentLoaded", () => {
  const C = TourBusCatalog, { esc, inr, today } = TB;
  const form = document.getElementById("search-form"), results = document.getElementById("bus-results");
  const msg = document.getElementById("results-message"), note = document.getElementById("results-note"), toolbar = document.getElementById("toolbar");
  const cities = Object.keys(C.cities).sort();
  document.getElementById("cityOptions").innerHTML = cities.map(c => `<option value="${esc(c)}" label="${esc(C.cities[c].state)}"></option>`).join("");
  form.date.min = today(); form.date.max = TB.maxBookingDate(); form.date.value = today();
  const q = TB.qs;
  ["source", "destination", "date", "passengers"].forEach(k => { if (q.has(k)) form[k].value = q.get(k); });
  let current = [];

  function render() {
    const sort = document.getElementById("sortBy").value, type = document.getElementById("typeFilter").value;
    let list = current.filter(b => !type || (type === "AC" ? /^(AC|Luxury|Volvo)/.test(b.type) : b.type.includes(type)));
    list.sort((a, b) => sort === "price" ? a.fare - b.fare : sort === "rating" ? b.rating - a.rating : a.departure.localeCompare(b.departure));
    if (!list.length) { results.innerHTML = '<div class="empty"><h3>No buses match these filters</h3><p>Try clearing the bus-type filter.</p></div>'; return; }
    const p = new URLSearchParams({ source: form.source.value, destination: form.destination.value, date: form.date.value, passengers: form.passengers.value });
    results.innerHTML = list.map(b => `<article class="bus-card">
      <div><div class="op">${esc(b.operator)}</div><div class="muted" style="font-size:13px">${esc(b.type)} · ${esc(b.id)}</div><div class="pills" style="margin-top:8px"><span class="pill gold">★ ${b.rating}</span>${b.amenities.slice(0, 3).map(a => `<span class="pill">${esc(a)}</span>`).join("")}</div></div>
      <div><div class="times">${esc(b.departure)}<i></i>${esc(b.arrival)}</div><div class="muted" style="font-size:13px">${esc(b.source)} → ${esc(b.destination)} · ${esc(b.duration)}</div></div>
      <div><div class="price">${inr(b.fare)}</div><small class="muted">per passenger</small></div>
      <a class="btn coral" href="seats.html?bus=${encodeURIComponent(b.id)}&${p}">Select seats</a></article>`).join("");
  }

  function renderSuggestedRoutes(source, destination, date, passengers) {
    const suggestions = C.suggestBusRoutes(source, destination);
    if (!suggestions.length) {
      return `<div class="empty"><h3>No sample bus connection found from ${esc(source)} to ${esc(destination)}</h3><p>Try a nearby city, or check the route map for a road route. Bus schedules on this site are sample data.</p><a class="btn" href="map.html?${new URLSearchParams({ from: source, to: destination })}">See route options on the map</a></div>`;
    }

    return `<section class="connection-results" aria-labelledby="connection-title">
      <div class="sec-head"><div><span class="eyebrow">Suggested bus connections</span><h2 id="connection-title">Try a route with a transfer</h2><p>Sample schedules only. These legs are booked separately; connection times and missed-transfer protection are not guaranteed.</p></div></div>
      <div class="connection-list">${suggestions.map((suggestion, index) => {
        const via = suggestion.legs.slice(0, -1).map(leg => leg.destination);
        const trackUrl = `map.html?${new URLSearchParams({ from: source, to: destination, via: via.join(","), date, passengers })}`;
        const legContent = suggestion.legs.map((leg, legIndex) => {
          const options = [...leg.buses].sort((a, b) => a.fare - b.fare);
          const bus = options[0];
          const query = new URLSearchParams({ source: leg.source, destination: leg.destination, date, passengers });
          return `<div class="connection-leg"><span class="leg-index">${legIndex + 1}</span><div class="leg-main">
            <strong>${esc(leg.source)} → ${esc(leg.destination)}</strong>
            <span>${esc(bus.operator)} · ${esc(bus.departure)}–${esc(bus.arrival)} · ${esc(bus.type)}</span>
            <small>${options.length} sample bus${options.length === 1 ? "" : "es"} · from ${inr(bus.fare)} per passenger</small>
          </div><a class="btn sm" href="buses.html?${query}">Choose bus</a></div>${legIndex < suggestion.legs.length - 1 ? '<div class="transfer-note">Transfer at ' + esc(leg.destination) + ' · allow time between buses</div>' : ""}`;
        }).join("");
        return `<article class="connection-card"><div class="connection-head"><strong>Suggested track ${index + 1}</strong><span>${suggestion.transfers} transfer${suggestion.transfers === 1 ? "" : "s"} · ${inr(suggestion.fare)} estimated / passenger</span></div>
          ${legContent}<div class="connection-actions"><a class="btn coral sm" href="${trackUrl}">Show track on map →</a><a class="link" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}${via.length ? `&waypoints=${encodeURIComponent(via.join("|"))}` : ""}" target="_blank" rel="noopener noreferrer">Open directions ↗</a></div>
        </article>`;
      }).join("")}</div></section>`;
  }

  function search(e) {
    if (e) e.preventDefault();
    for (const key of ["source", "destination"]) {
      const input = form.elements[key];
      input.value = cities.find(city => city.toLowerCase() === input.value.trim().toLowerCase()) || input.value.trim();
    }
    const v = Object.fromEntries(new FormData(form).entries());
    const errors = {
      source: TB.rules.required(v.source, "Departure city"), destination: TB.rules.required(v.destination, "Destination"),
      date: TB.rules.bookingDate(v.date), passengers: TB.rules.int(v.passengers, "Passengers", 1, 6)
    };
    if (!errors.destination && v.source === v.destination) errors.destination = "Source and destination cannot be the same.";
    Object.keys(errors).forEach(k => { if (!errors[k]) delete errors[k]; });
    if (!TB.showErrors(form, errors)) { results.innerHTML = ""; toolbar.classList.add("hidden"); note.classList.add("hidden"); return; }
    TB.recordRouteSearch(v.source, v.destination);
    document.getElementById("mapLink").href = "map.html?" + new URLSearchParams({ from: v.source, to: v.destination, date: v.date, passengers: v.passengers });
    current = C.buses.filter(b => b.source === v.source && b.destination === v.destination);
    toolbar.classList.remove("hidden");
    if (!current.length) {
      toolbar.classList.add("hidden");
      results.innerHTML = renderSuggestedRoutes(v.source, v.destination, v.date, v.passengers);
      return;
    }
    msg.textContent = `${current.length} bus${current.length > 1 ? "es" : ""} · ${v.source} → ${v.destination} · ${TB.fmtDate(v.date)} · ~${C.roadKm(v.source, v.destination)} km`;
    note.classList.add("hidden");
    render();
  }
  form.addEventListener("submit", search);
  document.getElementById("sortBy").addEventListener("change", render);
  document.getElementById("typeFilter").addEventListener("change", render);
  document.getElementById("swap-cities").addEventListener("click", () => { [form.source.value, form.destination.value] = [form.destination.value, form.source.value]; });
  if (q.has("source") && q.has("destination")) search();
});
