document.addEventListener("DOMContentLoaded", () => {
  const C = TourBusCatalog, { esc, inr } = TB;
  const form = document.getElementById("checkout-form"), box = document.getElementById("page-message");
  const say = (m, cls = "bad") => { box.className = "alert " + cls; box.textContent = m; };
  const pending = TBStore.getPending(), bus = pending && C.buses.find(b => b.id === pending.busId);
  if (!pending || !bus) { say("Your booking session is missing. Please search for a bus and choose seats again."); form.querySelector("button[type=submit]").disabled = true; return; }
  const user = TB.getUser();
  if (user) { form.contactName.value = user.name; form.email.value = user.email; form.phone.value = user.phone || ""; }
  document.getElementById("checkout-route").textContent = `${pending.source} → ${pending.destination} · ${TB.fmtDate(pending.date)}`;
  document.getElementById("checkout-passengers").textContent = pending.passengers.map(p => p.name).join(", ");
  document.getElementById("checkout-seats").textContent = pending.passengers.map(p => p.seat).join(", ");
  document.getElementById("base-fare").textContent = inr(pending.total);
  let discount = 0;
  const cm = document.getElementById("coupon-message");
  function setTotals() { document.getElementById("discount").textContent = "−" + inr(discount); document.getElementById("final-total").textContent = inr(pending.total - discount); }
  setTotals();
  function applyCoupon() {
    const code = form.coupon.value.trim().toUpperCase(); const c = C.coupons.find(x => x.code === code && x.active);
    if (!code) { discount = 0; cm.innerHTML = '<span class="err" style="display:block">Enter a coupon code first.</span>'; }
    else if (!c) { discount = 0; cm.innerHTML = '<span class="err" style="display:block">This coupon is invalid or inactive.</span>'; }
    else if (pending.total < c.minAmount) { discount = 0; cm.innerHTML = `<span class="err" style="display:block">Needs a minimum fare of ${inr(c.minAmount)}.</span>`; }
    else { discount = c.type === "percent" ? Math.round(pending.total * c.value / 100) : Math.min(c.value, pending.total); cm.innerHTML = `<span class="status">Coupon applied - you save ${inr(discount)}</span>`; }
    setTotals();
  }
  document.getElementById("apply-coupon").addEventListener("click", applyCoupon);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    const set = (k, m) => { if (m) errors[k] = m; };
    set("contact.name", TB.rules.name(v.contactName)); set("contact.phone", TB.rules.phone(v.phone)); set("contact.email", TB.rules.email(v.email)); set("payment", TB.rules.required(v.payment, "Payment method"));
    if (!TB.showErrors(form, errors)) return say("Please correct the highlighted fields.");
    box.className = "hidden";
    const btn = document.getElementById("confirmBtn"); btn.disabled = true; btn.textContent = "Validating on server…";
    const payload = { busId: bus.id, journeyDate: pending.date, passengers: pending.passengers, contact: { name: v.contactName, phone: v.phone, email: v.email }, payment: v.payment, coupon: v.coupon.trim() || undefined };
    const r = await TB.api("POST", "/api/bookings", payload);
    btn.disabled = false; btn.textContent = "Confirm booking";

    if (r.ok && r.data.success) {
      TBStore.addBooking({ ...r.data.booking, source_of_truth: "server" });
      sessionStorage.setItem("tourbus.lastBookingId", r.data.booking.bookingId); TBStore.clearPending();
      return (location.href = "booking-confirmation.html");
    }
    if (r.offline) {                                  // Express not running: keep the demo usable
      const total = pending.total - discount, id = TBStore.createLocalId();
      TBStore.addBooking({ bookingId: id, createdAt: new Date().toISOString(), busId: bus.id, operator: bus.operator, source: bus.source, destination: bus.destination, departure: bus.departure, arrival: bus.arrival, journeyDate: pending.date, seats: pending.passengers.map(p => p.seat), passengers: pending.passengers, contact: payload.contact, fare: pending.total, discount, total, paymentMethod: v.payment, paymentStatus: "DEMO PAID", status: "Confirmed", source_of_truth: "local" });
      TBStore.addLocalSeats(bus.id, pending.date || "", pending.passengers.map(p => p.seat));
      sessionStorage.setItem("tourbus.lastBookingId", id); TBStore.clearPending();
      return (location.href = "booking-confirmation.html");
    }
    // 422 etc: show server field errors
    const errs = r.data.errors || {};
    const seatErr = Object.entries(errs).filter(([k]) => k.endsWith(".seat")).map(([, m]) => m);
    TB.showErrors(form, errs);
    say(seatErr.length ? seatErr.join(" ") + " Please go back and pick different seats." : (r.data.message || "The server rejected this booking."));
  });
});
