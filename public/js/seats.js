document.addEventListener("DOMContentLoaded", async () => {
  const C = TourBusCatalog, { esc, inr } = TB, q = TB.qs;
  const bus = C.buses.find(b => b.id === q.get("bus"));
  const alertBox = document.getElementById("page-message"), cont = document.getElementById("continue-checkout");
  const fail = m => { alertBox.textContent = m; alertBox.classList.remove("hidden"); };
  if (!bus) { fail("Bus not found. Please go back and choose a bus."); document.getElementById("bus-info").textContent = ""; return; }
  const requested = Math.max(1, Math.min(6, Number(q.get("passengers")) || 1));
  const date = q.get("date") || TB.today();
  document.getElementById("bus-name").textContent = `${bus.operator} · ${bus.source} → ${bus.destination}`;
  document.getElementById("bus-info").textContent = `${bus.departure} → ${bus.arrival} · ${bus.type} · ${inr(bus.fare)} per seat`;
  document.getElementById("sum-route").textContent = `${bus.source} → ${bus.destination}`;
  document.getElementById("sum-date").textContent = TB.fmtDate(date);

  const avail = await TBStore.getAvailability(bus, date);
  document.getElementById("avail-note").textContent = avail.source === "server" ? "✓ Live seat availability from the Express server." : "Server offline: showing sample availability stored in this browser.";
  const booked = new Set(avail.booked);
  const grid = document.getElementById("seat-layout");
  let html = "";
  for (let i = 1; i <= bus.capacity; i++) {
    if ((i - 1) % 4 === 2) html += '<div class="aisle"></div>';
    const s = "S" + i, b = booked.has(s);
    html += `<button type="button" class="seat" data-seat="${s}" ${b ? `disabled aria-label="${s} already booked"` : `aria-label="Seat ${s}" aria-pressed="false"`}>${s}</button>`;
  }
  grid.innerHTML = html;
  let selected = [];
  const form = document.getElementById("passenger-form");
  form.innerHTML = Array.from({ length: requested }, (_, i) => `<div class="pax"><h3>Passenger ${i + 1} <span class="pill" id="seatTag${i}">no seat yet</span></h3>
    <div class="form-grid" style="grid-template-columns:2fr 1fr 1.2fr">
      <div class="field"><label for="n${i}">Full name</label><input id="n${i}" data-field="passengers.${i}.name" maxlength="60" autocomplete="off"><span class="err" data-error-for="passengers.${i}.name"></span></div>
      <div class="field"><label for="a${i}">Age</label><input id="a${i}" data-field="passengers.${i}.age" type="number" min="1" max="110"><span class="err" data-error-for="passengers.${i}.age"></span></div>
      <div class="field"><label for="g${i}">Gender</label><select id="g${i}" data-field="passengers.${i}.gender"><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select><span class="err" data-error-for="passengers.${i}.gender"></span></div>
    </div></div>`).join("");

  function summary() {
    document.getElementById("selected-seats").textContent = selected.length ? selected.join(", ") : "None";
    document.getElementById("seat-total").textContent = inr(selected.length * bus.fare);
    for (let i = 0; i < requested; i++) document.getElementById("seatTag" + i).textContent = selected[i] || "no seat yet";
    cont.disabled = selected.length !== requested;
  }
  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-seat]"); if (!btn || btn.disabled) return;
    const s = btn.dataset.seat;
    if (selected.includes(s)) { selected = selected.filter(x => x !== s); btn.classList.remove("selected"); btn.setAttribute("aria-pressed", "false"); }
    else {
      if (selected.length >= requested) return TB.toast(`You are travelling with ${requested} passenger(s) - deselect a seat first.`, true);
      selected.push(s); btn.classList.add("selected"); btn.setAttribute("aria-pressed", "true");
    }
    alertBox.classList.add("hidden"); summary();
  });
  cont.addEventListener("click", () => {
    const errors = {}, passengers = [];
    for (let i = 0; i < requested; i++) {
      const name = form.querySelector(`#n${i}`).value.trim(), age = form.querySelector(`#a${i}`).value, gender = form.querySelector(`#g${i}`).value;
      const e1 = TB.rules.name(name), e2 = TB.rules.int(age, "Age", 1, 110), e3 = TB.rules.required(gender, "Gender");
      if (e1) errors[`passengers.${i}.name`] = e1; if (e2) errors[`passengers.${i}.age`] = e2; if (e3) errors[`passengers.${i}.gender`] = e3;
      passengers.push({ name, age: Number(age), gender, seat: selected[i] });
    }
    if (!TB.showErrors(form, errors)) return fail("Please correct the passenger details before continuing.");
    TBStore.setPending({ busId: bus.id, date, source: bus.source, destination: bus.destination, passengers, fare: bus.fare, total: bus.fare * requested });
    location.href = "checkout.html";
  });
  summary();
});
