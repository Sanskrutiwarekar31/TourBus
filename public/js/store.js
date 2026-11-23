/* store.js - browser-side booking storage (localStorage) + seat availability.
 * When the Express server is running, the SERVER is the source of truth for seats; this file keeps a
 * personal copy of your bookings so "My bookings" works, and a fallback when the server is offline. */
window.TBStore = (() => {
  const KEYS = { bookings: "tourbus.bookings.v2", seats: "tourbus.localSeats.v2", pending: "tourbus.pendingBooking" };

  function read(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { console.warn("TourBus storage read failed:", e); return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("TourBus storage write failed:", e); return false; }
  }

  const getBookings = () => { const v = read(KEYS.bookings, []); return Array.isArray(v) ? v : []; };
  function addBooking(b) {
    const list = getBookings().filter(x => x.bookingId !== b.bookingId); list.push(b);
    return write(KEYS.bookings, list);
  }
  function updateBooking(id, patch) {
    const list = getBookings().map(b => b.bookingId === id ? { ...b, ...patch } : b);
    return write(KEYS.bookings, list);
  }
  const createLocalId = () => "TB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

  /* seats booked while the server was offline (per bus + date) */
  function localSeats(busId, date) { const m = read(KEYS.seats, {}); return m[busId + "|" + date] || []; }
  function addLocalSeats(busId, date, seats) {
    const m = read(KEYS.seats, {}); const k = busId + "|" + date;
    m[k] = [...new Set([...(m[k] || []), ...seats])]; write(KEYS.seats, m);
  }
  function freeLocalSeats(busId, date, seats) {
    const m = read(KEYS.seats, {}); const k = busId + "|" + date;
    m[k] = (m[k] || []).filter(s => !seats.includes(s)); write(KEYS.seats, m);
  }

  /* Seat availability: server first (source of truth), local fallback */
  async function getAvailability(bus, date) {
    const r = await TB.api("GET", `/api/buses/${encodeURIComponent(bus.id)}/seats${date ? "?date=" + encodeURIComponent(date) : ""}`);
    if (r.ok && r.data.success) return { booked: r.data.bookedSeats, source: "server" };
    return { booked: [...new Set([...bus.bookedSeats, ...localSeats(bus.id, date || "")])], source: "local" };
  }

  const setPending = v => { try { sessionStorage.setItem(KEYS.pending, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const getPending = () => { try { return JSON.parse(sessionStorage.getItem(KEYS.pending) || "null"); } catch (e) { return null; } };
  const clearPending = () => { try { sessionStorage.removeItem(KEYS.pending); } catch (e) { /* ignore */ } };

  return { getBookings, addBooking, updateBooking, createLocalId, localSeats, addLocalSeats, freeLocalSeats, getAvailability, setPending, getPending, clearPending };
})();
