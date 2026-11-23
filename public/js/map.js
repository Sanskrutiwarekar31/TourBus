/* map.js - map integration.
 * Primary:  Leaflet + OpenStreetMap tiles (free, no API key), loaded from a CDN.
 * Fallback: if the CDN is unreachable, use a real OpenStreetMap embed.
 * API:
 *   const m = await TBMap.create("elementId");
 *   m.addPin({lat,lng,label,html,kind:"city|tour|start",number,href});  m.addRoute([[lat,lng],...],{color,dashed});
 *   m.fit();  m.clear();  m.animateBus(path);  m.mode  // "leaflet" | "schematic"
 */
window.TBMap = (() => {
  const SOURCES = [
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"],
    ["https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"]
  ];
  let loading;
  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise(resolve => {
      let i = 0;
      const next = () => {
        if (i >= SOURCES.length) return resolve(false);
        const [css, js] = SOURCES[i++];
        const link = document.createElement("link"); link.rel = "stylesheet"; link.href = css; document.head.appendChild(link);
        const script = document.createElement("script"); script.src = js;
        const timer = setTimeout(() => { script.onload = script.onerror = null; script.remove(); link.remove(); next(); }, 6000);
        script.onload = () => { clearTimeout(timer); resolve(!!window.L); };
        script.onerror = () => { clearTimeout(timer); script.remove(); link.remove(); next(); };
        document.head.appendChild(script);
      };
      next();
    });
    return loading;
  }

  const pinHtml = p => `<div class="pin ${p.kind || "tour"}"><span>${p.number != null ? p.number : (p.kind === "city" ? "●" : "★")}</span></div>`;

  /* ---------- Leaflet implementation ---------- */
  function leafletMap(el) {
    const L = window.L;
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([21.5, 77.5], 5);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    let noted = false;
    tiles.on("tileerror", () => {
      if (noted) return; noted = true;
      const n = document.createElement("div"); n.className = "map-note"; n.textContent = "Map tiles could not load (offline?). Pins and routes still work."; el.parentElement.appendChild(n);
    });
    el.addEventListener("click", () => map.scrollWheelZoom.enable(), { once: true });
    const layer = L.featureGroup().addTo(map);
    let busTimer = null, busMarker = null;
    const api = {
      mode: "leaflet", map,
      addPin(p) {
        const marker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: pinHtml(p), iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }), title: p.label });
        marker.bindPopup(p.html || `<strong>${p.label}</strong>`);
        marker.addTo(layer);
        return marker;
      },
      addRoute(points, o = {}) { return L.polyline(points, { color: o.color || "#ff6a45", weight: o.weight || 4, opacity: .9, dashArray: o.dashed ? "8 10" : null }).addTo(layer); },
      fit() { if (layer.getLayers().length) map.fitBounds(layer.getBounds().pad(.25), { maxZoom: 9 }); },
      clear() { layer.clearLayers(); api.stopBus(); },
      invalidate() { setTimeout(() => map.invalidateSize(), 60); },
      openPopupFor(marker) { marker.openPopup(); },
      stopBus() { if (busTimer) cancelAnimationFrame(busTimer); busTimer = null; if (busMarker) { map.removeLayer(busMarker); busMarker = null; } },
      animateBus(path) {
        api.stopBus();
        if (!path || path.length < 2) return;
        const seg = [], total = path.slice(1).reduce((s, p, i) => { const d = map.distance(path[i], p); seg.push(d); return s + d; }, 0);
        busMarker = L.marker(path[0], { icon: L.divIcon({ className: "", html: '<div style="font-size:24px;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))">🚌</div>', iconSize: [28, 28], iconAnchor: [14, 14] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
        const duration = 9000; let t0 = null;
        const step = ts => {
          if (!t0) t0 = ts;
          let dist = ((ts - t0) % duration) / duration * total, i = 0;
          while (i < seg.length - 1 && dist > seg[i]) { dist -= seg[i]; i++; }
          const f = seg[i] ? Math.min(1, dist / seg[i]) : 0;
          busMarker.setLatLng([path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]);
          busTimer = requestAnimationFrame(step);
        };
        busTimer = requestAnimationFrame(step);
      }
    };
    return api;
  }

  /* ---------- OpenStreetMap fallback ---------- */
  function schematicMap(el) {
    const pins = [], routes = [];
    const api = {
      mode: "openstreetmap",
      addPin(p) { pins.push(p); },
      addRoute(points, o = {}) { routes.push({ points, ...o }); },
      clear() { pins.length = 0; routes.length = 0; el.innerHTML = ""; },
      invalidate() {}, stopBus() {}, animateBus() {}, openPopupFor() {},
      fit() { draw(); }
    };
    function draw() {
      const pts = [...pins.map(p => [p.lat, p.lng]), ...routes.flatMap(r => r.points)];
      if (!pts.length) pts.push([21.5, 78]);
      const minLat = Math.min(...pts.map(p => p[0])), maxLat = Math.max(...pts.map(p => p[0]));
      const minLng = Math.min(...pts.map(p => p[1])), maxLng = Math.max(...pts.map(p => p[1]));
      const latPad = Math.max((maxLat - minLat) * .2, .5), lngPad = Math.max((maxLng - minLng) * .2, .5);
      const bbox = [minLng - lngPad, minLat - latPad, maxLng + lngPad, maxLat + latPad].join(",");
      const frame = document.createElement("iframe");
      frame.title = "OpenStreetMap destination map";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;
      frame.style.cssText = "width:100%;height:100%;border:0";
      el.replaceChildren(frame);
      el.parentElement.querySelectorAll(".map-note").forEach(n => n.remove());
    }
    return api;
  }

  async function create(elementId) {
    const el = typeof elementId === "string" ? document.getElementById(elementId) : elementId;
    if (!el) return null;
    if (!el.parentElement.classList.contains("map-box")) { const box = document.createElement("div"); box.className = "map-box"; el.parentElement.insertBefore(box, el); box.appendChild(el); }
    el.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#5d6f67;font-weight:600">Loading map…</div>';
    const ok = await loadLeaflet();
    el.innerHTML = "";
    return ok ? leafletMap(el) : schematicMap(el);
  }
  return { create };
})();
