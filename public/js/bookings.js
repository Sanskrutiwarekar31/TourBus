document.addEventListener("DOMContentLoaded", () => {
  const { esc, inr } = TB, list = document.getElementById("bookings-list");
  function card(b, extra = "") {
    return `<article class="panel" style="margin-bottom:14px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center">
      <div><strong style="font-size:17px">${esc(b.source)} → ${esc(b.destination)}</strong> <span class="status ${b.status === "Confirmed" ? "" : "cancelled"}">${esc(b.status)}</span>
      <div class="muted" style="font-size:14px">${esc(TB.fmtDate(b.journeyDate))} · ${esc(b.operator)} · Seats ${b.seats.map(esc).join(", ")}</div>
      <div class="muted" style="font-size:13px">ID ${esc(b.bookingId)} · ${esc(b.contact.email)}</div></div>
      <div style="text-align:right"><div class="price">${inr(b.total)}</div>${b.status === "Confirmed" ? `<button class="btn ghost sm" data-cancel="${esc(b.bookingId)}" style="margin-top:8px">Cancel</button>` : ""}${extra}</div></article>`;
  }
  function render() {
    const rows = TBStore.getBookings();
    list.innerHTML = rows.length ? [...rows].reverse().map(b => card(b)).join("") : '<div class="empty"><h3>No bookings yet</h3><p>Bookings you make will appear here.</p><a class="btn coral" href="buses.html">Search buses</a></div>';
  }
  async function cancel(id) {
    const b = TBStore.getBookings().find(x => x.bookingId === id); if (!b) return;
    if (!confirm("Cancel this booking? (demo - no real refund)")) return;
    if (b.source_of_truth === "server") {
      const r = await TB.api("POST", `/api/bookings/${encodeURIComponent(id)}/cancel`, { phone: b.contact.phone });
      if (!r.ok && !(r.status === 409)) return TB.toast(r.data.message || "Could not cancel", true);
    } else TBStore.freeLocalSeats(b.busId, b.journeyDate || "", b.seats);
    TBStore.updateBooking(id, { status: "Cancelled" }); TB.toast("Booking cancelled"); render();
  }
  document.addEventListener("click", e => { const c = e.target.closest("[data-cancel]"); if (c) cancel(c.dataset.cancel); });
  render();

  const lf = document.getElementById("lookup-form"), out = document.getElementById("lookup-result");
  lf.addEventListener("submit", async e => {
    e.preventDefault();
    const errors = {}; const id = lf.bookingId.value.trim(), ph = lf.phone.value.trim();
    if (!/^TB-[A-Z0-9]{3,12}-[A-Z0-9]{3,8}$/i.test(id)) errors.bookingId = "Booking ID looks like TB-ABC123-XY7Z9.";
    if (TB.rules.phone(ph)) errors.phone = TB.rules.phone(ph);
    if (!TB.showErrors(lf, errors)) return;
    const r = await TB.api("POST", "/api/bookings/lookup", { bookingId: id, phone: ph });
    if (r.ok) { TBStore.addBooking({ ...r.data.booking, source_of_truth: "server" }); out.innerHTML = '<div class="alert good">Booking found and added to your list.</div>'; render(); }
    else { TB.showErrors(lf, r.data.errors || {}, false); out.innerHTML = `<div class="alert bad">${esc(r.data.message)}</div>`; }
  });
});
