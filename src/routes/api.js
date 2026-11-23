/* routes/api.js - every endpoint validates its input on the SERVER before doing anything. */
const express = require("express");
const crypto = require("crypto");
const catalog = require("../../public/js/catalog.js");
const recommender = require("../../public/js/recommender.js");
const { schemas } = require("../schemas");
const { describe } = require("../validator");
const store = require("../store");
const { validateBody, validateParam, rateLimit, metrics } = require("../middleware");

const router = express.Router();
const apiLimiter = rateLimit({ windowMs: 60000, max: 150 });
const authLimiter = rateLimit({ windowMs: 60000, max: 12, message: "Too many sign-in attempts. Please wait a minute." });
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
router.use(apiLimiter);

const busById = id => catalog.buses.find(b => b.id === id);
const publicBooking = b => ({ ...b });
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

/* Seats already taken on a bus for a date = built-in sample seats + seats from confirmed server bookings */
async function takenSeats(busId, date) {
  const bus = busById(busId);
  const taken = new Set(bus.bookedSeats);
  (await store.getTakenSeats(busId, date)).forEach(seat => taken.add(seat));
  return [...taken];
}

function priceWithCoupon(fare, code) {
  if (!code) return { discount: 0 };
  const coupon = catalog.coupons.find(c => c.code === String(code).toUpperCase() && c.active);
  if (!coupon) return { error: "This coupon code is invalid or inactive." };
  if (fare < coupon.minAmount) return { error: `This coupon needs a minimum fare of ₹${coupon.minAmount}.` };
  const discount = coupon.type === "percent" ? Math.round(fare * coupon.value / 100) : Math.min(coupon.value, fare);
  return { discount, coupon: coupon.code };
}

/* ----- Health & info ----------------------------------------------------- */
router.get("/health", (req, res) => res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()), time: new Date().toISOString() }));
router.get("/stats", asyncRoute(async (req, res) => res.json({ success: true, ...metrics, ...await store.getCounts() })));
router.get("/rules", (req, res) => {
  const out = {};
  for (const name of ["booking", "bookingUpdate", "register", "login", "contact", "planner", "newsletter", "tourEnquiry"]) out[name] = describe(schemas[name]);
  res.json({ success: true, rules: out });
});
router.get("/catalog", asyncRoute(async (req, res) => {
  const catalogData = await store.getCatalog();
  res.json({ success: true, ...catalogData });
}));

/* ----- Seats (query string is validated too) ---------------------------- */
router.get("/buses/:busId/seats", asyncRoute(async (req, res) => {
  const bus = busById(req.params.busId);
  if (!bus) return res.status(404).json({ success: false, message: "Bus not found." });
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(422).json({ success: false, message: "date must be YYYY-MM-DD.", errors: { date: "date must be YYYY-MM-DD." } });
  res.json({ success: true, busId: bus.id, date: date || null, capacity: bus.capacity, bookedSeats: await takenSeats(bus.id, date) });
}));

/* ----- Bookings ---------------------------------------------------------- */
async function bookingExtraChecks(values, req) {
  const errors = {};
  const current = req && req.booking;
  const busId = values.busId || (current && current.busId);
  const journeyDate = values.journeyDate || (current && current.journeyDate);
  const passengers = values.passengers || (current && current.passengers) || [];
  const couponCode = req && req.body && hasOwn(req.body, "coupon")
    ? (values.coupon || null)
    : (current ? current.coupon : values.coupon);
  const bus = busById(busId);
  if (!bus) return { busId: "This bus is no longer available." };

  const taken = new Set();
  if (!current || current.status === "Confirmed") {
    (await takenSeats(busId, journeyDate)).forEach(seat => taken.add(seat));
    if (current && current.status === "Confirmed" && current.busId === busId && current.journeyDate === journeyDate) {
      current.seats.forEach(seat => {
        if (!bus.bookedSeats.includes(seat)) taken.delete(seat);
      });
    }
  }
  const seen = new Set();
  passengers.forEach((p, i) => {
    const num = Number(p.seat.slice(1));
    if (num < 1 || num > bus.capacity) errors[`passengers.${i}.seat`] = `Seat ${p.seat} does not exist on this bus (S1-S${bus.capacity}).`;
    else if (taken.has(p.seat)) errors[`passengers.${i}.seat`] = `Seat ${p.seat} is already booked for ${journeyDate}.`;
    else if (seen.has(p.seat)) errors[`passengers.${i}.seat`] = `Seat ${p.seat} was selected twice.`;
    seen.add(p.seat);
  });
  const coupon = priceWithCoupon(bus.fare * passengers.length, couponCode);
  if (coupon.error) errors.coupon = coupon.error;
  return errors;
}

function bookingUpdateExtraChecks(values, req) {
  const clearsCoupon = req.body && hasOwn(req.body, "coupon") && (req.body.coupon === "" || req.body.coupon === null);
  if (!Object.keys(values).length && !clearsCoupon) {
    return { body: "Provide at least one valid booking field to update." };
  }
  if (values.contact && !Object.keys(values.contact).length) {
    return { contact: "Provide at least one contact field to update." };
  }
  return bookingExtraChecks(values, req);
}

function unavailableSeatsResponse(res, err, passengers, journeyDate) {
  const errors = {};
  passengers.forEach((passenger, index) => {
    if (err.seats.includes(passenger.seat)) {
      errors[`passengers.${index}.seat`] = `Seat ${passenger.seat} is already booked for ${journeyDate}.`;
    }
  });
  return res.status(400).json({ success: false, message: "Validation failed: one or more seats are unavailable. Nothing was saved.", errors });
}

router.post("/bookings", validateBody("booking", bookingExtraChecks, 400), asyncRoute(async (req, res) => {
  const v = req.valid;
  const bus = busById(v.busId);
  const fare = bus.fare * v.passengers.length;                 // price is ALWAYS recalculated on the server
  const { discount, coupon } = priceWithCoupon(fare, v.coupon);
  const booking = {
    bookingId: "TB-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").slice(0, 5).toUpperCase(),
    createdAt: new Date().toISOString(),
    busId: bus.id, operator: bus.operator, source: bus.source, destination: bus.destination,
    departure: bus.departure, arrival: bus.arrival, journeyDate: v.journeyDate,
    seats: v.passengers.map(p => p.seat), passengers: v.passengers, contact: v.contact,
    fare, discount, coupon: coupon || null, total: fare - discount,
    paymentMethod: v.payment, paymentStatus: "DEMO PAID", status: "Confirmed"
  };
  try {
    await store.createBooking(booking);
  } catch (err) {
    if (!Array.isArray(err.seats)) throw err;
    return unavailableSeatsResponse(res, err, v.passengers, v.journeyDate);
  }
  res.status(201).json({ success: true, message: "Booking confirmed after server-side validation.", booking: publicBooking(booking) });
}));

router.get("/bookings", asyncRoute(async (req, res) => {
  res.json({ success: true, bookings: (await store.getBookings()).map(publicBooking) });
}));

router.get("/bookings/:bookingId", validateParam("bookingId", "lookup", 400), asyncRoute(async (req, res) => {
  const booking = await store.findBookingById(req.params.bookingId);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
  res.json({ success: true, booking: publicBooking(booking) });
}));

const loadBooking = asyncRoute(async (req, res, next) => {
  const booking = await store.findBookingById(req.params.bookingId);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
  req.booking = booking;
  next();
});

router.put("/bookings/:bookingId",
  validateParam("bookingId", "lookup", 400),
  loadBooking,
  validateBody("bookingUpdate", bookingUpdateExtraChecks, 400),
  asyncRoute(async (req, res) => {
    const current = req.booking;
    const values = req.valid;
    const updates = {};

    if (hasOwn(values, "busId")) {
      const bus = busById(values.busId);
      updates.busId = bus.id;
      updates.operator = bus.operator;
      updates.source = bus.source;
      updates.destination = bus.destination;
      updates.departure = bus.departure;
      updates.arrival = bus.arrival;
    }
    if (hasOwn(values, "journeyDate")) updates.journeyDate = values.journeyDate;
    if (hasOwn(values, "passengers")) {
      updates.passengers = values.passengers;
      updates.seats = values.passengers.map(passenger => passenger.seat);
    }
    if (hasOwn(values, "contact")) updates.contact = { ...current.contact, ...values.contact };
    if (hasOwn(values, "payment")) updates.paymentMethod = values.payment;

    const couponChanged = req.body && hasOwn(req.body, "coupon");
    const couponCode = couponChanged ? (values.coupon || null) : current.coupon;
    if (couponChanged) updates.coupon = couponCode;
    if (hasOwn(values, "busId") || hasOwn(values, "passengers") || couponChanged) {
      const bus = busById(values.busId || current.busId);
      const passengers = values.passengers || current.passengers;
      const fare = bus.fare * passengers.length;
      const coupon = priceWithCoupon(fare, couponCode);
      updates.fare = fare;
      updates.discount = coupon.discount;
      updates.coupon = coupon.coupon || null;
      updates.total = fare - coupon.discount;
    }

    try {
      const booking = await store.updateBooking(req.params.bookingId, updates);
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
      res.json({ success: true, message: "Booking updated.", booking: publicBooking(booking) });
    } catch (err) {
      if (!Array.isArray(err.seats)) throw err;
      const passengers = updates.passengers || current.passengers;
      const journeyDate = updates.journeyDate || current.journeyDate;
      return unavailableSeatsResponse(res, err, passengers, journeyDate);
    }
  })
);

router.delete("/bookings/:bookingId", validateParam("bookingId", "lookup", 400), asyncRoute(async (req, res) => {
  const booking = await store.deleteBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
  res.json({ success: true, message: "Booking deleted.", booking: publicBooking(booking) });
}));

router.post("/bookings/lookup", validateBody("lookup"), asyncRoute(async (req, res) => {
  const b = await store.findBooking(req.valid.bookingId, req.valid.phone);
  if (!b) return res.status(404).json({ success: false, message: "No booking found for that Booking ID and mobile number." });
  res.json({ success: true, booking: publicBooking(b) });
}));

router.post("/bookings/:bookingId/cancel", validateParam("bookingId", "lookup"), validateBody("cancel"), asyncRoute(async (req, res) => {
  const result = await store.cancelBooking(req.params.bookingId, req.valid.phone);
  if (!result) return res.status(404).json({ success: false, message: "No booking found for that Booking ID and mobile number." });
  const b = result.booking;
  if (!result.cancelled) return res.status(409).json({ success: false, message: `This booking is already ${b.status.toLowerCase()}.` });
  res.json({ success: true, message: "Booking cancelled. Seats are available again (demo - no real refund).", booking: publicBooking(b) });
}));

/* ----- Accounts (demo auth: scrypt-hashed passwords, no sessions) -------- */
const hashPassword = (pw, salt = crypto.randomBytes(16).toString("hex")) => ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") });

router.post("/auth/register", authLimiter, validateBody("register"), asyncRoute(async (req, res) => {
  const v = req.valid;
  if (await store.findUser(v.email)) {
    return res.status(409).json({ success: false, message: "An account with this email already exists.", errors: { email: "This email is already registered." } });
  }
  const { salt, hash } = hashPassword(v.password);
  try {
    await store.createUser({ name: v.name, email: v.email, phone: v.phone, salt, hash, createdAt: new Date().toISOString() });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return res.status(409).json({ success: false, message: "An account with this email already exists.", errors: { email: "This email is already registered." } });
  }
  res.status(201).json({ success: true, message: "Account created.", user: { name: v.name, email: v.email, phone: v.phone } });
}));

router.post("/auth/login", authLimiter, validateBody("login"), asyncRoute(async (req, res) => {
  const v = req.valid;
  const user = await store.findUser(v.email);
  const attempt = user ? hashPassword(v.password, user.salt).hash : hashPassword(v.password).hash;
  const ok = user && crypto.timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(user.hash, "hex"));
  if (!ok) return res.status(401).json({ success: false, message: "Incorrect email or password." });
  res.json({ success: true, message: "Signed in.", user: { name: user.name, email: user.email, phone: user.phone } });
}));

/* ----- Contact, newsletter ---------------------------------------------- */
router.post("/contact", validateBody("contact"), asyncRoute(async (req, res) => {
  await store.createMessage({ ...req.valid, receivedAt: new Date().toISOString() });
  res.status(201).json({ success: true, message: "Thanks! Your message was received." });
}));

router.post("/newsletter", validateBody("newsletter"), asyncRoute(async (req, res) => {
  await store.addSubscriber(req.valid.email);
  res.status(201).json({ success: true, message: "You're subscribed to TourBus travel notes." });
}));

/* ----- Tour package enquiries (group size is checked against the package's slots) ----- */
router.post("/tour-enquiries", validateBody("tourEnquiry", v => {
  const tour = catalog.tours.find(t => t.id === v.tourId);
  return v.travellers > tour.slots ? { travellers: `${tour.name} has only ${tour.slots} slots per departure.` } : {};
}), asyncRoute(async (req, res) => {
  const v = req.valid;
  const tour = catalog.tours.find(t => t.id === v.tourId);
  const enquiry = { enquiryId: "TQ-" + crypto.randomBytes(3).toString("hex").toUpperCase(), ...v, tourName: tour.name, total: tour.price * v.travellers, createdAt: new Date().toISOString() };
  await store.createEnquiry(enquiry);
  res.status(201).json({ success: true, message: "Tour request received after server-side validation.", enquiry });
}));

/* ----- Smart tour suggester --------------------------------------------- */
router.post("/suggest-tours", validateBody("planner"), (req, res) => {
  const results = recommender.suggest(req.valid, 4).map(r => ({
    tourId: r.tour.id, matchPercent: r.matchPercent, estimatedTotal: r.estimatedTotal,
    distanceKm: r.distanceKm, reasons: r.reasons, cautions: r.cautions
  }));
  res.json({ success: true, message: "Suggestions generated on the server.", preferences: req.valid, results });
});

module.exports = router;
