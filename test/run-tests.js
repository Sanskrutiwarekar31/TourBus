/* Automated checks for the TourBus API.  Run with:  npm test
 * Starts the Express app on a random port, fires requests, prints PASS/FAIL. */
const os = require("os"), path = require("path");
process.env.STORE_FILE = path.join(os.tmpdir(), "tourbus-test-store-" + process.pid + ".json");
const app = require("../server");
const catalog = require("../public/js/catalog");

let passed = 0, failed = 0;
const check = (name, cond, extra) => { if (cond) { passed++; console.log("  PASS", name); } else { failed++; console.log("  FAIL", name, extra ? JSON.stringify(extra) : ""); } };

const server = app.listen(0, async () => {
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (method, p, body, raw) => {
    const res = await fetch(base + p, { method, headers: { "Content-Type": "application/json" }, body: raw !== undefined ? raw : (body ? JSON.stringify(body) : undefined) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const future = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  check("catalog provides 50+ tours with destination photographs and coordinates",
    catalog.tours.length >= 50
      && new Set(catalog.tours.map(t => t.id)).size === catalog.tours.length
      && catalog.tours.every(t => /^https:\/\/images\.unsplash\.com\//.test(t.imageUrl) && catalog.cities[t.destination]));
  check("catalog provides at least 100 uniquely identified bus services",
    catalog.buses.length >= 100 && new Set(catalog.buses.map(bus => bus.id)).size === catalog.buses.length);
  let r = await call("GET", "/api/catalog");
  check("catalog API returns stored places, routes, and buses",
    r.status === 200
      && r.body.cities.length === Object.keys(catalog.cities).length
      && r.body.cities.every(city => Number.isFinite(city.location.coordinates[0]) && Number.isFinite(city.location.coordinates[1]))
      && r.body.routes.length > 0
      && r.body.routes.reduce((sum, route) => sum + route.busCount, 0) === r.body.buses.length
      && r.body.buses.length >= 100
      && r.body.buses.every(bus => catalog.cities[bus.source] && catalog.cities[bus.destination]), r);
  const ahmedabadRoutes = catalog.suggestBusRoutes("Ahmedabad", "Delhi");
  check("Ahmedabad to Delhi suggests available connecting bus legs",
    ahmedabadRoutes.length > 0
      && ahmedabadRoutes[0].legs[0].source === "Ahmedabad"
      && ahmedabadRoutes[0].legs[ahmedabadRoutes[0].legs.length - 1].destination === "Delhi"
      && ahmedabadRoutes[0].legs.every(leg => leg.buses.length > 0)
      && ahmedabadRoutes[0].legs.length > 1);
  check("route suggestions reject unknown cities", catalog.suggestBusRoutes("Atlantis", "Delhi").length === 0);
  const homepage = await fetch(base + "/");
  const homepageHtml = await homepage.text();
  check("homepage serves photo-led content without the validation lab", homepage.status === 200 && homepageHtml.includes("Real places.") && !homepageHtml.includes("validation-lab.html"));
  const goodBooking = () => ({
    busId: "BUS101", journeyDate: future,
    passengers: [{ name: "Asha Rao", age: 28, gender: "Female", seat: "S20" }, { name: "Ravi Rao", age: 31, gender: "Male", seat: "S21" }],
    contact: { name: "Asha Rao", phone: "9876543210", email: "asha@example.com" }, payment: "UPI demo", coupon: "WELCOME10"
  });

  console.log("Public API routes");
  r = await call("POST", "/api/validate/labBooking", {});
  check("validation lab endpoint removed -> 404", r.status === 404, r);
  r = await call("GET", "/validation-lab.html");
  check("validation lab page removed -> 404", r.status === 404, r);

  console.log("Registration & login");
  const reg = { name: "Asha Rao", email: "Asha@Example.com", phone: "9876543210", password: "Str0ng#Pass", confirmPassword: "Str0ng#Pass", terms: true };
  r = await call("POST", "/api/auth/register", { ...reg, password: "weak", confirmPassword: "weak" });
  check("weak password rejected", r.status === 422 && r.body.errors.password, r);
  r = await call("POST", "/api/auth/register", { ...reg, confirmPassword: "different" });
  check("password mismatch rejected", r.status === 422 && r.body.errors.confirmPassword, r);
  r = await call("POST", "/api/auth/register", { ...reg, terms: false });
  check("terms must be accepted", r.status === 422 && r.body.errors.terms, r);
  r = await call("POST", "/api/auth/register", reg);
  check("valid registration -> 201", r.status === 201 && r.body.user.email === "asha@example.com", r);
  r = await call("POST", "/api/auth/register", reg);
  check("duplicate email -> 409", r.status === 409, r);
  r = await call("POST", "/api/auth/login", { email: "asha@example.com", password: "Str0ng#Pass" });
  check("login ok", r.status === 200 && r.body.user.name === "Asha Rao", r);
  r = await call("POST", "/api/auth/login", { email: "asha@example.com", password: "wrong" });
  check("wrong password -> 401", r.status === 401, r);

  console.log("Bookings");
  r = await call("POST", "/api/bookings", { ...goodBooking(), passengers: [] });
  check("no passengers rejected", r.status === 400, r);
  r = await call("POST", "/api/bookings", { ...goodBooking(), busId: "BUS999" });
  check("unknown bus rejected", r.status === 400 && r.body.errors.busId, r);
  let bad = goodBooking(); bad.passengers[0].seat = "S1";
  r = await call("POST", "/api/bookings", bad);
  check("already-booked sample seat rejected", r.status === 400 && r.body.errors["passengers.0.seat"], r);
  bad = goodBooking(); bad.passengers[1].seat = "S20";
  r = await call("POST", "/api/bookings", bad);
  check("same seat twice rejected", r.status === 400 && r.body.errors["passengers.1.seat"], r);
  bad = goodBooking(); bad.passengers[0].seat = "S99";
  r = await call("POST", "/api/bookings", bad);
  check("seat outside bus rejected", r.status === 400 && r.body.errors["passengers.0.seat"], r);
  r = await call("POST", "/api/bookings", { ...goodBooking(), coupon: "FREEMONEY" });
  check("invalid coupon rejected", r.status === 400 && r.body.errors.coupon, r);
  bad = goodBooking(); bad.contact.phone = "123"; bad.passengers[0].age = 200;
  r = await call("POST", "/api/bookings", bad);
  check("nested errors use dotted paths", r.status === 400 && r.body.errors["contact.phone"] && r.body.errors["passengers.0.age"], r);
  r = await call("POST", "/api/bookings", { ...goodBooking(), total: 1, fare: 1 });
  check("valid booking -> 201; client-sent price ignored, server computes 2400-240", r.status === 201 && r.body.booking.fare === 2400 && r.body.booking.total === 2160 && /^TB-/.test(r.body.booking.bookingId), r);
  const id = r.body.booking && r.body.booking.bookingId;
  r = await call("GET", "/api/bookings");
  check("list bookings includes the new booking", r.status === 200 && r.body.bookings.some(booking => booking.bookingId === id), r);
  r = await call("GET", "/api/bookings/" + id);
  check("get booking by ID", r.status === 200 && r.body.booking.bookingId === id, r);
  r = await call("PUT", "/api/bookings/" + id, { contact: { email: "updated@example.com" } });
  check("partial update preserves omitted booking and contact fields",
    r.status === 200 && r.body.booking.contact.email === "updated@example.com"
      && r.body.booking.contact.name === "Asha Rao"
      && r.body.booking.contact.phone === "9876543210"
      && r.body.booking.passengers[0].seat === "S20"
      && r.body.booking.total === 2160, r);
  r = await call("PUT", "/api/bookings/" + id, {});
  check("empty update rejected", r.status === 400, r);
  r = await call("GET", "/api/bookings/TB-UNKNOWN-12345");
  check("unknown booking ID -> 404", r.status === 404, r);
  r = await call("POST", "/api/bookings", goodBooking());
  check("double booking of the same seats rejected", r.status === 400 && r.body.errors["passengers.0.seat"], r);
  r = await call("GET", "/api/buses/BUS101/seats?date=" + future);
  check("seat map now includes S20, S21", r.body.bookedSeats.includes("S20") && r.body.bookedSeats.includes("S21"), r);
  const busCapacity = catalog.buses.find(bus => bus.id === "BUS101").capacity;
  const replacementSeats = Array.from({ length: busCapacity }, (_, index) => "S" + (index + 1))
    .filter(seat => !r.body.bookedSeats.includes(seat))
    .slice(0, 2);
  const savedBooking = await call("GET", "/api/bookings/" + id);
  const updatedPassengers = savedBooking.body.booking.passengers.map((passenger, index) => ({
    ...passenger,
    seat: replacementSeats[index]
  }));
  r = await call("PUT", "/api/bookings/" + id, { passengers: updatedPassengers });
  check("updating passenger seats updates the booking", r.status === 200 && r.body.booking.seats.join(",") === replacementSeats.join(","), r);
  r = await call("GET", "/api/buses/BUS101/seats?date=" + future);
  check("seat update releases old seats and reserves new seats",
    !r.body.bookedSeats.includes("S20") && !r.body.bookedSeats.includes("S21")
      && replacementSeats.every(seat => r.body.bookedSeats.includes(seat)), r);
  r = await call("PUT", "/api/bookings/" + id, { passengers: [updatedPassengers[0]] });
  const singlePassengerFare = catalog.buses.find(bus => bus.id === "BUS101").fare;
  check("updating passenger count recalculates fare and coupon",
    r.status === 200 && r.body.booking.fare === singlePassengerFare
      && r.body.booking.discount === Math.round(singlePassengerFare * 0.1)
      && r.body.booking.total === singlePassengerFare - Math.round(singlePassengerFare * 0.1), r);
  r = await call("POST", "/api/bookings/lookup", { bookingId: id, phone: "9876543210" });
  check("lookup with correct phone", r.status === 200 && r.body.booking.bookingId === id, r);
  r = await call("POST", "/api/bookings/lookup", { bookingId: id, phone: "9123456789" });
  check("lookup with wrong phone -> 404", r.status === 404, r);
  r = await call("POST", "/api/bookings/lookup", { bookingId: "'; DROP TABLE bookings;--", phone: "9876543210" });
  check("SQL-style booking id rejected by format rule", r.status === 422 && r.body.errors.bookingId, r);
  r = await call("POST", "/api/bookings/" + id + "/cancel", { phone: "9876543210" });
  check("cancel ok", r.status === 200 && r.body.booking.status === "Cancelled", r);
  r = await call("POST", "/api/bookings/" + id + "/cancel", { phone: "9876543210" });
  check("cancel twice -> 409", r.status === 409, r);
  r = await call("GET", "/api/buses/BUS101/seats?date=" + future);
  check("cancelled seats are free again", replacementSeats.every(seat => !r.body.bookedSeats.includes(seat)), r);
  bad = goodBooking();
  bad.passengers[0].seat = "S22";
  bad.passengers[1].seat = "S23";
  r = await call("POST", "/api/bookings", bad);
  const deleteId = r.body.booking && r.body.booking.bookingId;
  r = await call("DELETE", "/api/bookings/" + deleteId);
  check("delete returns the removed booking", r.status === 200 && r.body.booking.bookingId === deleteId, r);
  r = await call("GET", "/api/bookings/" + deleteId);
  check("deleted booking is no longer retrievable", r.status === 404, r);
  r = await call("GET", "/api/buses/BUS101/seats?date=" + future);
  check("deleted booking releases its seats", !r.body.bookedSeats.includes("S22") && !r.body.bookedSeats.includes("S23"), r);

  console.log("Other endpoints");
  r = await call("POST", "/api/suggest-tours", { budget: 6000, days: 3, travellers: 2, month: 12, startCity: "Pune", interests: ["beach", "food"] });
  check("suggester returns Goa first", r.status === 200 && r.body.results[0].tourId === "TOUR101", r.body && r.body.results && r.body.results.map(x => x.tourId));
  r = await call("POST", "/api/suggest-tours", { budget: 10, days: 99, interests: ["teleport"] });
  check("suggester input validated", r.status === 422 && r.body.errors.budget && r.body.errors.days && r.body.errors.interests, r);
  r = await call("POST", "/api/contact", { name: "Asha", email: "a@b.co", subject: "Feedback", message: "Great site, thank you!" });
  check("contact ok", r.status === 201, r);
  r = await call("POST", "/api/contact", { name: "Asha", email: "a@b.co", subject: "Hacking", message: "short" });
  check("contact bad subject/message rejected", r.status === 422 && r.body.errors.subject && r.body.errors.message, r);
  r = await call("POST", "/api/newsletter", { email: "nope" });
  check("newsletter email validated", r.status === 422, r);
  r = await call("POST", "/api/tour-enquiries", { tourId: "TOUR101", name: "Asha Rao", phone: "9876543210", email: "a@b.co", startDate: future, travellers: 4 });
  check("tour enquiry ok, total computed on server", r.status === 201 && r.body.enquiry.total === 23996, r);
  r = await call("POST", "/api/tour-enquiries", { tourId: "TOUR101", name: "Asha Rao", phone: "9876543210", email: "a@b.co", startDate: future, travellers: 21 });
  check("tour enquiry above slot limit rejected", r.status === 422 && r.body.errors.travellers, r);
  r = await call("GET", "/api/rules");
  check("rules endpoint lists booking create and update schemas",
    r.status === 200 && r.body.rules.booking.length > 5 && r.body.rules.bookingUpdate.length > 0, r);

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed ? 1 : 0);
});
