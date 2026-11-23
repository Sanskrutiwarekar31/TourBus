document.addEventListener("DOMContentLoaded", () => {
  const { esc, inr } = TB, box = document.getElementById("confirmation-details");
  const id = sessionStorage.getItem("tourbus.lastBookingId"), rows = TBStore.getBookings();
  const b = rows.find(x => x.bookingId === id) || rows[rows.length - 1];
  if (!b) { box.innerHTML = '<div class="empty"><h3>No confirmed booking found</h3><a class="btn" href="buses.html">Search buses</a></div>'; return; }
  const serverBacked = b.source_of_truth === "server";
  const seedNum = [...b.bookingId].reduce((a, c) => a + c.charCodeAt(0), 7);
  const qr = Array.from({ length: 144 }, (_, i) => `<i style="background:${((i * 17 + seedNum * (i % 7) + i % 5) % 11) < 5 ? "#10241e" : "#fff"}"></i>`).join("");
  box.innerHTML = `<div class="ticket"><div class="ticket-top"><div><span class="status">${esc(b.status)}</span><h2 style="margin-top:10px">${esc(b.source)} → ${esc(b.destination)}</h2><div>${esc(TB.fmtDate(b.journeyDate))} · ${esc(b.operator)}${b.departure ? " · departs " + esc(b.departure) : ""}</div></div>
      <div style="text-align:right"><div style="opacity:.8;font-size:13px">Booking ID</div><strong style="font-size:22px">${esc(b.bookingId)}</strong></div></div>
    <div class="ticket-body"><div>
      <div class="row"><span>Passengers</span><strong>${b.passengers.map(p => esc(p.name) + " (" + esc(p.seat) + ")").join(", ")}</strong></div>
      <div class="row"><span>Contact</span><strong>${esc(b.contact.name)} · ${esc(b.contact.phone)}</strong></div>
      <div class="row"><span>Fare</span><strong>${inr(b.fare)}</strong></div>${b.discount ? `<div class="row"><span>Discount ${b.coupon ? "(" + esc(b.coupon) + ")" : ""}</span><strong>−${inr(b.discount)}</strong></div>` : ""}
      <div class="row total"><span>Total paid (demo)</span><strong>${inr(b.total)}</strong></div>
      <p class="alert ${serverBacked ? "good" : "info"}">${serverBacked ? "✓ Validated and stored by the Express server. Seats are now reserved for everyone." : "Saved in this browser only (the Express server was offline)."}</p></div>
      <div><div class="qr" aria-label="Decorative demo QR pattern">${qr}</div><small class="muted">Decorative - not a real ticket</small></div></div></div>
    <div class="actions"><button class="btn" onclick="window.print()">Print ticket</button><a class="btn ghost" href="my-bookings.html">My bookings</a><a class="btn ghost" href="map.html?from=${encodeURIComponent(b.source)}&to=${encodeURIComponent(b.destination)}">View route map</a></div>`;
});
