/* MongoDB persistence with a JSON-file adapter for local development and tests. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const catalog = require("../public/js/catalog");

const FILE = process.env.STORE_FILE || path.join(__dirname, "..", "data", "store.json");
const useMongo = Boolean(process.env.MONGODB_URI && !process.env.STORE_FILE);
const state = { bookings: [], users: [], messages: [], subscribers: [], enquiries: [], cities: [], routes: [], buses: [] };

if (!useMongo) {
  try {
    if (fs.existsSync(FILE)) Object.assign(state, JSON.parse(fs.readFileSync(FILE, "utf8")));
  } catch (err) {
    console.warn("[store] could not read", FILE, "- starting empty:", err.message);
  }
}

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const tmp = FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, FILE);
    } catch (err) {
      console.warn("[store] could not save:", err.message);
    }
  }, 150);
  if (timer.unref) timer.unref();
}

const documentSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const Booking = mongoose.model("Booking", new mongoose.Schema({
  bookingId: { type: String, unique: true }
}, { strict: false, versionKey: false }), "bookings");
const User = mongoose.model("User", new mongoose.Schema({ email: { type: String, unique: true } }, { strict: false }), "users");
const Message = mongoose.model("Message", documentSchema, "messages");
const Subscriber = mongoose.model("Subscriber", new mongoose.Schema({ email: { type: String, unique: true } }, { strict: false }), "subscribers");
const Enquiry = mongoose.model("Enquiry", documentSchema, "enquiries");
const SeatReservation = mongoose.model("SeatReservation", new mongoose.Schema({
  bookingId: { type: String, required: true },
  busId: { type: String, required: true },
  journeyDate: { type: String, required: true },
  seat: { type: String, required: true }
}, { versionKey: false }).index({ busId: 1, journeyDate: 1, seat: 1 }, { unique: true }), "seatreservations");
const catalogSchema = new mongoose.Schema({ id: { type: String, unique: true } }, { strict: false, versionKey: false });
const City = mongoose.model("CatalogCity", catalogSchema, "cities");
const Route = mongoose.model("CatalogRoute", catalogSchema, "routes");
const CatalogBus = mongoose.model("CatalogBus", catalogSchema, "buses");

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function catalogRecords() {
  const cities = Object.entries(catalog.cities).map(([name, place]) => ({
    id: slug(name),
    name,
    state: place.state,
    location: { type: "Point", coordinates: [place.lng, place.lat] },
    lat: place.lat,
    lng: place.lng
  }));
  const routeMap = new Map();
  catalog.buses.forEach(bus => {
    const id = `${slug(bus.source)}-${slug(bus.destination)}`;
    if (!routeMap.has(id)) {
      routeMap.set(id, {
        id,
        source: bus.source,
        destination: bus.destination,
        distanceKm: catalog.roadKm(bus.source, bus.destination),
        busCount: 0
      });
    }
    routeMap.get(id).busCount++;
  });
  return { cities, routes: [...routeMap.values()], buses: catalog.buses };
}

async function connect() {
  if (!useMongo) {
    seedJsonCatalog();
    console.log("[store] MongoDB not configured; using JSON file:", FILE);
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    User.init(),
    Subscriber.init(),
    SeatReservation.init(),
    Booking.init(),
    City.init(),
    Route.init(),
    CatalogBus.init()
  ]);
  await seedMongoCatalog();
  console.log("[store] connected to MongoDB");
}

function seedJsonCatalog() {
  const records = catalogRecords();
  for (const [name, entries] of Object.entries(records)) {
    const byId = new Map(state[name].map(entry => [entry.id, entry]));
    entries.forEach(entry => byId.set(entry.id, entry));
    state[name] = [...byId.values()];
  }
  persist();
}

async function seedMongoCatalog() {
  const records = catalogRecords();
  const collections = [
    [City, records.cities],
    [Route, records.routes],
    [CatalogBus, records.buses]
  ];
  await Promise.all(collections.map(([Model, entries]) => Model.bulkWrite(entries.map(entry => ({
    updateOne: { filter: { id: entry.id }, update: { $set: entry }, upsert: true }
  })))));
}

async function getCatalog() {
  if (!useMongo) {
    return { cities: state.cities, routes: state.routes, buses: state.buses };
  }
  const [cities, routes, buses] = await Promise.all([
    City.find().select("-_id -__v").lean(),
    Route.find().select("-_id -__v").lean(),
    CatalogBus.find().select("-_id -__v").lean()
  ]);
  return { cities, routes, buses };
}

function plain(doc) {
  if (!doc) return null;
  const result = doc.toObject ? doc.toObject() : { ...doc };
  delete result._id;
  delete result.__v;
  return result;
}

async function getTakenSeats(busId, journeyDate) {
  if (useMongo) {
    return SeatReservation.distinct("seat", { busId, ...(journeyDate ? { journeyDate } : {}) });
  }
  const taken = new Set();
  state.bookings
    .filter(b => b.busId === busId && b.status === "Confirmed" && (!journeyDate || b.journeyDate === journeyDate))
    .forEach(b => b.seats.forEach(seat => taken.add(seat)));
  return [...taken];
}

async function getCounts() {
  if (useMongo) {
    const [bookings, users] = await Promise.all([Booking.countDocuments(), User.countDocuments()]);
    return { bookings, users };
  }
  return { bookings: state.bookings.length, users: state.users.length };
}

async function getBookings() {
  if (useMongo) return Booking.find().select("-_id -__v").lean();
  return state.bookings.map(booking => ({ ...booking }));
}

async function createBooking(booking) {
  if (!useMongo) {
    state.bookings.push(booking);
    persist();
    return booking;
  }

  try {
    await SeatReservation.insertMany(booking.seats.map(seat => ({
      bookingId: booking.bookingId,
      busId: booking.busId,
      journeyDate: booking.journeyDate,
      seat
    })));
    await Booking.create(booking);
    return booking;
  } catch (err) {
    await SeatReservation.deleteMany({ bookingId: booking.bookingId });
    if (err.code === 11000) {
      const conflicts = await SeatReservation.find({
        busId: booking.busId,
        journeyDate: booking.journeyDate,
        seat: { $in: booking.seats }
      }).select("seat -_id").lean();
      const conflictError = new Error("One or more seats have already been booked.");
      conflictError.seats = conflicts.map(item => item.seat);
      throw conflictError;
    }
    throw err;
  }
}

function bookingIdPattern(bookingId) {
  return new RegExp(`^${bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

async function findBookingById(bookingId) {
  if (useMongo) {
    return Booking.findOne({ bookingId: bookingIdPattern(bookingId) }).select("-_id -__v").lean();
  }
  return state.bookings.find(booking => booking.bookingId.toUpperCase() === bookingId.toUpperCase()) || null;
}

async function updateBooking(bookingId, updates) {
  const current = await findBookingById(bookingId);
  if (!current) return null;
  const updated = { ...current, ...updates };

  if (!useMongo) {
    if (updated.status === "Confirmed") {
      const conflicts = state.bookings
        .filter(booking => booking.bookingId !== current.bookingId
          && booking.status === "Confirmed"
          && booking.busId === updated.busId
          && booking.journeyDate === updated.journeyDate)
        .flatMap(booking => booking.seats)
        .filter(seat => updated.seats.includes(seat));
      if (conflicts.length) {
        const error = new Error("One or more seats have already been booked.");
        error.seats = [...new Set(conflicts)];
        throw error;
      }
    }
    const index = state.bookings.findIndex(booking => booking.bookingId === current.bookingId);
    if (index < 0) return null;
    state.bookings[index] = updated;
    persist();
    return updated;
  }

  const sameReservation = current.busId === updated.busId && current.journeyDate === updated.journeyDate;
  const oldSeats = current.status === "Confirmed" ? current.seats : [];
  const nextSeats = updated.status === "Confirmed" ? updated.seats : [];
  const oldSeatSet = new Set(sameReservation ? oldSeats : []);
  const nextSeatSet = new Set(nextSeats);
  const addedSeats = nextSeats.filter(seat => !oldSeatSet.has(seat));
  const removedSeats = oldSeats.filter(seat => !sameReservation || !nextSeatSet.has(seat));

  try {
    if (addedSeats.length) {
      await SeatReservation.insertMany(addedSeats.map(seat => ({
        bookingId: current.bookingId,
        busId: updated.busId,
        journeyDate: updated.journeyDate,
        seat
      })));
    }
  } catch (err) {
    if (err.code === 11000) {
      await SeatReservation.deleteMany({
        bookingId: current.bookingId,
        busId: updated.busId,
        journeyDate: updated.journeyDate,
        seat: { $in: addedSeats }
      });
      const conflicts = await SeatReservation.find({
        busId: updated.busId,
        journeyDate: updated.journeyDate,
        seat: { $in: addedSeats }
      }).select("seat -_id").lean();
      const conflictError = new Error("One or more seats have already been booked.");
      conflictError.seats = conflicts.map(item => item.seat);
      throw conflictError;
    }
    throw err;
  }

  let saved;
  try {
    saved = await Booking.findOneAndUpdate(
      { bookingId: bookingIdPattern(current.bookingId) },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-_id -__v").lean();
  } catch (err) {
    if (addedSeats.length) {
      await SeatReservation.deleteMany({
        bookingId: current.bookingId,
        busId: updated.busId,
        journeyDate: updated.journeyDate,
        seat: { $in: addedSeats }
      });
    }
    throw err;
  }
  if (!saved) {
    if (addedSeats.length) {
      await SeatReservation.deleteMany({
        bookingId: current.bookingId,
        busId: updated.busId,
        journeyDate: updated.journeyDate,
        seat: { $in: addedSeats }
      });
    }
    return null;
  }
  if (removedSeats.length) {
    await SeatReservation.deleteMany({
      bookingId: current.bookingId,
      busId: current.busId,
      journeyDate: current.journeyDate,
      seat: { $in: removedSeats }
    });
  }
  return saved;
}

async function deleteBooking(bookingId) {
  if (!useMongo) {
    const index = state.bookings.findIndex(booking => booking.bookingId.toUpperCase() === bookingId.toUpperCase());
    if (index < 0) return null;
    const [deleted] = state.bookings.splice(index, 1);
    persist();
    return deleted;
  }
  const deleted = await Booking.findOneAndDelete({ bookingId: bookingIdPattern(bookingId) })
    .select("-_id -__v")
    .lean();
  if (!deleted) return null;
  await SeatReservation.deleteMany({ bookingId: deleted.bookingId });
  return deleted;
}

async function findBooking(bookingId, phone) {
  if (useMongo) {
    return plain(await Booking.findOne({
      bookingId: new RegExp(`^${bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      "contact.phone": phone
    }).lean());
  }
  return state.bookings.find(b => b.bookingId.toUpperCase() === bookingId.toUpperCase() && b.contact.phone === phone) || null;
}

async function cancelBooking(bookingId, phone) {
  if (!useMongo) {
    const booking = await findBooking(bookingId, phone);
    if (!booking) return null;
    if (booking.status !== "Confirmed") return { booking, cancelled: false };
    if (booking && booking.status === "Confirmed") {
      booking.status = "Cancelled";
      booking.cancelledAt = new Date().toISOString();
      persist();
    }
    return { booking, cancelled: true };
  }
  const booking = await Booking.findOne({
    bookingId: new RegExp(`^${bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    "contact.phone": phone
  });
  if (!booking) return null;
  if (booking.status !== "Confirmed") return { booking: plain(booking), cancelled: false };
  if (booking.status === "Confirmed") {
    booking.status = "Cancelled";
    booking.cancelledAt = new Date().toISOString();
    await booking.save();
    await SeatReservation.deleteMany({ bookingId: booking.bookingId });
  }
  return { booking: plain(booking), cancelled: true };
}

async function findUser(email) {
  if (useMongo) return plain(await User.findOne({ email }).lean());
  return state.users.find(user => user.email === email) || null;
}

async function createUser(user) {
  if (!useMongo) {
    state.users.push(user);
    persist();
    return user;
  }
  return User.create(user);
}

async function createMessage(message) {
  if (useMongo) return Message.create(message);
  state.messages.push(message);
  persist();
  return message;
}

async function addSubscriber(email) {
  if (useMongo) {
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    return;
  }
  if (!state.subscribers.includes(email)) {
    state.subscribers.push(email);
    persist();
  }
}

async function createEnquiry(enquiry) {
  if (useMongo) return plain(await Enquiry.create(enquiry));
  state.enquiries.push(enquiry);
  persist();
  return enquiry;
}

if (!useMongo) seedJsonCatalog();

async function migrateJsonFile(file = FILE) {
  if (!useMongo) throw new Error("Set MONGODB_URI and do not set STORE_FILE to migrate data.");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const collections = ["bookings", "users", "messages", "subscribers", "enquiries"];
  for (const name of collections) {
    if (data[name] !== undefined && !Array.isArray(data[name])) {
      throw new Error(`Expected "${name}" to be an array in ${file}.`);
    }
    data[name] = data[name] || [];
  }

  const reservations = [];
  const uniqueSeats = new Map();
  for (const booking of data.bookings) {
    if (booking.status !== "Confirmed") continue;
    for (const seat of booking.seats || []) {
      const key = `${booking.busId}|${booking.journeyDate}|${seat}`;
      const previous = uniqueSeats.get(key);
      if (previous && previous !== booking.bookingId) {
        throw new Error(`Source data has conflicting confirmed seat ${seat} on ${booking.busId} for ${booking.journeyDate}.`);
      }
      uniqueSeats.set(key, booking.bookingId);
      reservations.push({ bookingId: booking.bookingId, busId: booking.busId, journeyDate: booking.journeyDate, seat });
    }
  }

  await Promise.all([Booking.init(), User.init(), Subscriber.init(), SeatReservation.init()]);
  for (const reservation of reservations) {
    const existing = await SeatReservation.findOne({
      busId: reservation.busId,
      journeyDate: reservation.journeyDate,
      seat: reservation.seat
    }).select("bookingId -_id").lean();
    if (existing && existing.bookingId !== reservation.bookingId) {
      throw new Error(`MongoDB already assigns seat ${reservation.seat} on ${reservation.busId} for ${reservation.journeyDate} to another booking.`);
    }
  }

  const bulkUpsert = (Model, entries, keyField) => entries.length
    ? Model.bulkWrite(entries.map(entry => ({
      updateOne: { filter: { [keyField]: entry[keyField] }, update: { $set: entry }, upsert: true }
    })))
    : Promise.resolve();

  await bulkUpsert(Booking, data.bookings, "bookingId");
  await bulkUpsert(User, data.users, "email");
  await bulkUpsert(Enquiry, data.enquiries, "enquiryId");
  const catalogEntries = catalogRecords();
  await Promise.all([
    bulkUpsert(City, catalogEntries.cities, "id"),
    bulkUpsert(Route, catalogEntries.routes, "id"),
    bulkUpsert(CatalogBus, catalogEntries.buses, "id")
  ]);
  if (data.subscribers.length) {
    const subscribers = data.subscribers.map(item => typeof item === "string" ? { email: item } : item);
    await bulkUpsert(Subscriber, subscribers, "email");
  }
  if (data.messages.length) {
    await Message.bulkWrite(data.messages.map((message, index) => {
      const id = crypto.createHash("sha256").update(`${index}:${JSON.stringify(message)}`).digest("hex");
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: message, $setOnInsert: { _id: id } },
          upsert: true
        }
      };
    }));
  }
  if (reservations.length) {
    await SeatReservation.bulkWrite(reservations.map(reservation => ({
      updateOne: {
        filter: { busId: reservation.busId, journeyDate: reservation.journeyDate, seat: reservation.seat },
        update: { $setOnInsert: reservation },
        upsert: true
      }
    })));
  }

  return Object.fromEntries(collections.map(name => [name, data[name].length]));
}

module.exports = {
  connect,
  getTakenSeats,
  getCounts,
  getBookings,
  createBooking,
  findBookingById,
  updateBooking,
  deleteBooking,
  findBooking,
  cancelBooking,
  findUser,
  createUser,
  createMessage,
  addSubscriber,
  createEnquiry,
  getCatalog,
  migrateJsonFile
};
