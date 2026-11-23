/* core.js - shared helpers + header/footer for every page. */
window.TB = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const qs = new URLSearchParams(location.search);
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const maxBookingDate = () => { const d = new Date(); d.setDate(d.getDate() + 120); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDate = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Date not set";
  const SEARCHES_KEY = "tourbus.routeSearches";
  function recordRouteSearch(source, destination) {
    try {
      const routes = JSON.parse(localStorage.getItem(SEARCHES_KEY) || "[]");
      const key = `${String(source).trim()}|${String(destination).trim()}`;
      const route = routes.find(item => item.key === key);
      if (route) { route.count++; route.searchedAt = Date.now(); }
      else routes.push({ key, source: String(source).trim(), destination: String(destination).trim(), count: 1, searchedAt: Date.now() });
      localStorage.setItem(SEARCHES_KEY, JSON.stringify(routes.slice(-100)));
    } catch { /* Route history is an optional personalization feature. */ }
  }
  function trendingRoutes(limit = 8) {
    try {
      return JSON.parse(localStorage.getItem(SEARCHES_KEY) || "[]")
        .filter(route => route.source && route.destination)
        .sort((a, b) => b.count - a.count || b.searchedAt - a.searchedAt)
        .slice(0, limit);
    } catch { return []; }
  }

  /* ----- toast ----- */
  let toastEl, toastTimer;
  function toast(message, bad) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = message; toastEl.classList.toggle("bad", !!bad); toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3400);
  }

  /* ----- API wrapper. offline = the Express server is not reachable (e.g. opened with Live Server) ----- */
  async function api(method, path, body) {
    try {
      const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
      const type = res.headers.get("content-type") || "";
      if (!type.includes("application/json")) return { ok: false, status: res.status, offline: true, data: { success: false, message: "The Express server is not running. Start it with npm start." } };
      return { ok: res.ok, status: res.status, offline: false, data: await res.json() };
    } catch (e) {
      return { ok: false, status: 0, offline: true, data: { success: false, message: "Could not reach the Express server. Start it with npm start." } };
    }
  }

  /* ----- form error helpers (server errors use dotted keys like passengers.0.name) ----- */
  function clearErrors(form) {
    form.querySelectorAll("[data-error-for]").forEach(el => el.textContent = "");
    form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
  }
  function showErrors(form, errors, focusFirst = true) {
    clearErrors(form);
    let first = null;
    Object.entries(errors || {}).forEach(([key, msg]) => {
      if (!msg) return;
      const target = form.querySelector(`[data-error-for="${CSS.escape(key)}"]`);
      if (target) target.textContent = msg;
      const input = form.querySelector(`[data-field="${CSS.escape(key)}"], [name="${CSS.escape(key)}"]`);
      if (input) { input.setAttribute("aria-invalid", "true"); first = first || input; }
    });
    if (focusFirst && first) first.focus();
    return !Object.keys(errors || {}).length;
  }
  const rules = {
    required: (v, label) => String(v ?? "").trim() ? "" : `${label} is required.`,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? "" : "Enter a valid email address.",
    phone: v => /^[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, "")) ? "" : "Enter a valid 10-digit Indian mobile number.",
    int: (v, label, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? "" : `${label} must be a whole number from ${min} to ${max}.`; },
    futureDate: v => { if (!v) return "Please choose a date."; const d = new Date(v + "T00:00:00"), t = new Date(); t.setHours(0, 0, 0, 0); return isNaN(d) || d < t ? "Please choose today or a future date." : ""; },
    bookingDate: v => { const e = rules.futureDate(v); if (e) return e; return v > maxBookingDate() ? "Bookings open up to 120 days ahead." : ""; },
    name: v => /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(String(v).trim()) ? "" : "Enter a valid name (letters only, 2-60 characters)."
  };

  /* ----- user session (demo) ----- */
  const getUser = () => { try { return JSON.parse(localStorage.getItem("tourbus.user") || "null"); } catch { return null; } };
  const setUser = u => { try { u ? localStorage.setItem("tourbus.user", JSON.stringify(u)) : localStorage.removeItem("tourbus.user"); } catch { /* storage blocked */ } };

  /* ----- header & footer ----- */
  const NAV = [
    ["index.html", "Home"], ["buses.html", "Bus tickets"], ["tour-packages.html", "Tours"],
    ["trip-planner.html", "Suggester", "NEW"], ["map.html", "Route map"], ["my-bookings.html", "My bookings"]
  ];
  function renderLayout() {
    const page = location.pathname.split("/").pop() || "index.html";
    const current = page === "tour-details.html" ? "tour-packages.html" : page.endsWith(".html") ? page : page + ".html";
    const user = getUser();
    const headerHost = document.getElementById("site-header");
    if (headerHost) headerHost.outerHTML = `
      <header class="topbar"><div class="wrap">
        <a class="brand" href="index.html" aria-label="TourBus home"><span class="brand-mark">T</span><span>tour<b>bus</b></span></a>
        <nav class="nav" id="mainNav">${NAV.map(([href, label, badge]) => `<a href="${href}" class="${current === href ? "active" : ""}">${label}${badge ? `<span class="badge">${badge}</span>` : ""}</a>`).join("")}</nav>
        <div class="nav-actions" id="navActions">${user
          ? `<span class="user-chip"><i>${esc(user.name[0].toUpperCase())}</i>${esc(user.name.split(" ")[0])}</span><button class="btn ghost sm" id="signOut" type="button">Sign out</button>`
          : `<a class="btn sm" href="login.html">Sign in</a>`}</div>
        <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">☰</button>
      </div></header>`;
    const footerHost = document.getElementById("site-footer");
    if (footerHost) footerHost.outerHTML = `
      <footer class="site-footer"><div class="wrap">
        <div class="foot-grid">
          <div><a class="brand" href="index.html"><span class="brand-mark">T</span><span>tour<b>bus</b></span></a><p style="margin:14px 0 0;max-width:290px">Bus tickets, curated tours and a smart suggester - all in one place. Take the long way to somewhere wonderful.</p></div>
          <div><h4>Travel</h4><a href="buses.html">Bus tickets</a><a href="tour-packages.html">Tour packages</a><a href="trip-planner.html">Tour suggester</a><a href="map.html">Route map</a></div>
          <div><h4>Account</h4><a href="login.html">Sign in / Register</a><a href="my-bookings.html">My bookings</a></div>
          <div><h4>Travel notes</h4><form id="footNews" novalidate><div class="news-row"><input type="email" name="email" placeholder="Your email" aria-label="Email for newsletter"><button class="btn coral sm" type="submit">Join</button></div><small class="err" style="display:block;color:#ffb4a5" data-error-for="email"></small></form></div>
        </div>
        <div class="foot-bottom"><span>© ${new Date().getFullYear()} TourBus · Student project demo · payments are simulated</span><span>Built with HTML, CSS, JavaScript and ExpressJS</span></div>
      </div></footer>`;

    const menu = document.getElementById("menuBtn"), nav = document.getElementById("mainNav");
    if (menu) menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", open); menu.textContent = open ? "✕" : "☰"; });
    const out = document.getElementById("signOut");
    if (out) out.addEventListener("click", () => { setUser(null); toast("Signed out"); setTimeout(() => location.reload(), 500); });

    const news = document.getElementById("footNews");
    if (news) news.addEventListener("submit", async e => {
      e.preventDefault();
      const email = news.elements.email.value;
      const clientErr = rules.email(email);
      if (clientErr) return showErrors(news, { email: clientErr }, false);
      const r = await api("POST", "/api/newsletter", { email });
      if (r.ok) { clearErrors(news); news.reset(); toast("Subscribed - thank you!"); }
      else if (r.offline) { clearErrors(news); toast("Saved locally (server offline)"); news.reset(); }
      else showErrors(news, r.data.errors || { email: r.data.message }, false);
    });
  }

  function reveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return items.forEach(i => i.classList.add("in"));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .1 });
    items.forEach(i => io.observe(i));
  }

  document.addEventListener("DOMContentLoaded", () => { renderLayout(); reveal(); });
  return { esc, inr, qs, today, maxBookingDate, fmtDate, toast, api, clearErrors, showErrors, rules, getUser, setUser, recordRouteSearch, trendingRoutes, reveal };
})();
