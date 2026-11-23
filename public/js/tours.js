document.addEventListener("DOMContentLoaded", () => {
  const C = TourBusCatalog, q = TB.qs;
  const el = id => document.getElementById(id);
  const chosen = new Set((q.get("interests") || q.get("interest") || "").split(",").filter(x => C.interestOptions.includes(x)));
  el("q").value = q.get("q") || ""; el("budget").value = q.get("budget") || ""; el("days").value = q.get("days") || ""; el("sort").value = q.get("sort") || "rating";
  el("interestChips").innerHTML = C.interestOptions.map(i => `<button type="button" class="chip ${chosen.has(i) ? "on" : ""}" data-i="${i}" aria-pressed="${chosen.has(i)}">${i}</button>`).join("");
  function render() {
    const text = el("q").value.trim().toLowerCase(), budget = Number(el("budget").value) || Infinity, len = el("days").value, sort = el("sort").value;
    let list = C.tours.filter(t => (!text || (t.name + " " + t.destination + " " + t.interests.join(" ")).toLowerCase().includes(text))
      && t.price <= budget && (!len || (len === "short" ? t.days <= 2 : len === "mid" ? t.days >= 3 && t.days <= 4 : t.days >= 5))
      && (!chosen.size || t.interests.some(i => chosen.has(i))));
    list.sort((a, b) => sort === "price" ? a.price - b.price : sort === "days" ? a.days - b.days : b.rating - a.rating);
    el("count").textContent = `${list.length} of ${C.tours.length} packages`;
    el("tour-list").innerHTML = list.length ? list.map(t => TBCards.tourCard(t)).join("") : '<div class="empty" style="grid-column:1/-1"><h3>No tours match these filters</h3><p>Try a higher budget or fewer interests.</p></div>';
  }
  el("interestChips").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const i = b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle("on", chosen.has(i)); b.setAttribute("aria-pressed", chosen.has(i)); render(); });
  ["q", "budget", "days", "sort"].forEach(id => el(id).addEventListener(id === "q" ? "input" : "change", render));
  el("reset").addEventListener("click", () => { el("q").value = ""; el("budget").value = ""; el("days").value = ""; el("sort").value = "rating"; chosen.clear(); document.querySelectorAll("#interestChips .chip").forEach(c => c.classList.remove("on")); render(); });
  render();
});
