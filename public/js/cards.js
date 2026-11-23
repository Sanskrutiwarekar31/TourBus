/* cards.js - shared HTML builders for tour cards, destination cards and suggestion cards. */
window.TBCards = (() => {
  const { esc, inr } = TB;
  const C = TourBusCatalog;
  const themeLabel = { beach: "Coastal escape", hills: "Hill retreat", snow: "Mountain air", heritage: "Culture & colour", temple: "Spiritual trail", city: "City break", backwater: "Slow & scenic" };

  function tourCard(t, extra = "") {
    return `<article class="card tour-card lift">
      <a class="art" href="tour-details.html?id=${encodeURIComponent(t.id)}" aria-label="View ${esc(t.name)}"><img src="${esc(t.imageUrl)}" alt="${esc(t.destination)} destination" loading="lazy" decoding="async"><span class="tag">${esc(themeLabel[t.theme] || "Tour")}</span><span class="rate">★ ${t.rating}</span></a>
      <div class="tour-body">
        <div class="meta"><span>${esc(t.duration)}</span><span>· ${esc(t.level)}</span></div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.description)}</p>
        <div class="pills" style="margin-bottom:14px">${t.interests.slice(0, 3).map(i => `<span class="pill">${esc(i)}</span>`).join("")}</div>
        <div class="tour-foot"><span class="price">${inr(t.price)} <small>/ person</small></span><a class="btn sm" href="tour-details.html?id=${t.id}">View</a></div>${extra}
      </div></article>`;
  }

  function destCard(t, tagline, big) {
    return `<a class="dest-card ${big ? "big" : ""}" href="tour-details.html?id=${encodeURIComponent(t.id)}"><img class="dest-photo" src="${esc(t.imageUrl)}" alt="${esc(t.destination)} scenery" loading="lazy" decoding="async"><span class="tagline">${esc(tagline)}</span>
      <span class="in"><span><strong>${esc(t.destination)}</strong><small>${esc(t.name)} · from ${inr(t.price)}</small></span><b style="font-size:22px">↗</b></span></a>`;
  }

  function suggestionCard(r, rank) {
    const t = r.tour;
    return `<article class="card result-card lift">
      <a class="art" href="tour-details.html?id=${encodeURIComponent(t.id)}"><img src="${esc(t.imageUrl)}" alt="${esc(t.destination)} destination" loading="lazy" decoding="async"></a>
      <div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="rank">${rank}</span><h3 style="font-family:var(--serif);font-size:21px">${esc(t.name)}</h3></div>
        <div class="meta muted" style="font-size:12px;margin:6px 0;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(t.duration)} · ${esc(t.destination)} · ★ ${t.rating}</div>
        <ul class="reasons">${r.reasons.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join("")}${r.cautions.slice(0, 2).map(x => `<li class="warn">${esc(x)}</li>`).join("")}</ul>
      </div>
      <div style="text-align:right"><span class="match">${r.matchPercent}% match</span><div class="price" style="margin:10px 0 2px">${inr(t.price)}</div><small class="muted">per person${r.estimatedTotal !== t.price ? " · " + inr(r.estimatedTotal) + " total" : ""}</small><div style="margin-top:10px"><a class="btn sm" href="tour-details.html?id=${t.id}">View plan</a></div></div>
    </article>`;
  }
  return { tourCard, destCard, suggestionCard, themeLabel };
})();
