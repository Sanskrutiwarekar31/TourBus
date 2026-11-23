/* schemas.js - the server-side RULES for every form in TourBus.
 * Change a rule here and it is enforced for every client (browser, curl, Postman, attackers). */
const catalog = require("../public/js/catalog.js");

const cityNames = Object.keys(catalog.cities);
const busIds = catalog.buses.map(b => b.id);
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const NAME_MSG = "Name may contain only letters, spaces, apostrophes, dots and hyphens.";

const text = (label, o = {}) => ({ type: "string", label, ...o });
const optional = rule => ({ ...rule, required: false });

const bookingSchema = {
  busId: { type: "enum", label: "Bus", required: true, values: busIds },
  journeyDate: { type: "date", label: "Journey date", required: true, notPast: true, maxDaysAhead: 120 },
  passengers: {
    type: "array", label: "Passengers", required: true, min: 1, max: 6,
    items: {
      name: text("Passenger name", { required: true, min: 2, max: 60, pattern: NAME_RE, patternMessage: NAME_MSG }),
      age: { type: "int", label: "Passenger age", required: true, min: 1, max: 110 },
      gender: { type: "enum", label: "Gender", required: true, values: ["Female", "Male", "Other", "Prefer not to say"] },
      seat: text("Seat", { required: true, pattern: /^S\d{1,2}$/, patternMessage: "Seat must look like S1, S12 ..." })
    }
  },
  contact: {
    type: "object", label: "Contact details", required: true,
    fields: {
      name: text("Contact name", { required: true, min: 2, max: 60, pattern: NAME_RE, patternMessage: NAME_MSG }),
      phone: { type: "phone", label: "Mobile number", required: true },
      email: { type: "email", label: "Email", required: true }
    }
  },
  payment: { type: "enum", label: "Payment method", required: true, values: ["UPI demo", "Card demo", "Net banking demo"] },
  coupon: text("Coupon code", { max: 20, pattern: /^[A-Za-z0-9]+$/, patternMessage: "Coupon codes use letters and digits only." })
};

const bookingUpdateSchema = {
  busId: optional(bookingSchema.busId),
  journeyDate: optional(bookingSchema.journeyDate),
  passengers: optional(bookingSchema.passengers),
  contact: {
    ...bookingSchema.contact,
    required: false,
    fields: Object.fromEntries(Object.entries(bookingSchema.contact.fields).map(([name, rule]) => [name, optional(rule)]))
  },
  payment: optional(bookingSchema.payment),
  coupon: optional(bookingSchema.coupon)
};

const schemas = {
  /* Real booking made from checkout.html */
  booking: bookingSchema,
  bookingUpdate: bookingUpdateSchema,

  register: {
    name: text("Full name", { required: true, min: 2, max: 60, pattern: NAME_RE, patternMessage: NAME_MSG }),
    email: { type: "email", label: "Email", required: true },
    phone: { type: "phone", label: "Mobile number", required: true },
    password: { type: "password", label: "Password", required: true, min: 8, max: 64 },
    confirmPassword: { type: "password", strength: false, label: "Confirm password", required: true, equalsField: "password", equalsMessage: "Passwords do not match." },
    terms: { type: "boolean", label: "Terms", required: true, mustBeTrue: true, mustBeTrueMessage: "You must accept the terms to register." }
  },

  login: {
    email: { type: "email", label: "Email", required: true },
    password: { type: "password", strength: false, label: "Password", required: true, max: 64 }
  },

  contact: {
    name: text("Name", { required: true, min: 2, max: 60, pattern: NAME_RE, patternMessage: NAME_MSG }),
    email: { type: "email", label: "Email", required: true },
    subject: { type: "enum", label: "Subject", required: true, values: ["Booking help", "Refund query", "Tour package", "Feedback", "Other"] },
    message: text("Message", { required: true, min: 10, max: 500 })
  },

  newsletter: { email: { type: "email", label: "Email", required: true } },

  planner: {
    budget: { type: "int", label: "Budget per person (₹)", required: true, min: 500, max: 200000 },
    days: { type: "int", label: "Number of days", required: true, min: 1, max: 14 },
    travellers: { type: "int", label: "Travellers", min: 1, max: 20, default: 1 },
    month: { type: "int", label: "Travel month", min: 1, max: 12 },
    startCity: { type: "enum", label: "Starting city", values: cityNames },
    interests: { type: "stringArray", label: "Interests", values: catalog.interestOptions, max: 5 }
  },

  tourEnquiry: {
    tourId: { type: "enum", label: "Tour package", required: true, values: catalog.tours.map(t => t.id) },
    name: text("Full name", { required: true, min: 2, max: 60, pattern: NAME_RE, patternMessage: NAME_MSG }),
    phone: { type: "phone", label: "Mobile number", required: true },
    email: { type: "email", label: "Email", required: true },
    startDate: { type: "date", label: "Preferred start date", required: true, notPast: true, maxDaysAhead: 365 },
    travellers: { type: "int", label: "Travellers", required: true, min: 1, max: 20 }
  },

  lookup: {
    bookingId: text("Booking ID", { required: true, pattern: /^TB-[A-Z0-9]{3,12}-[A-Z0-9]{3,8}$/i, patternMessage: "Booking ID looks like TB-ABC123-XY7Z9." }),
    phone: { type: "phone", label: "Mobile number", required: true }
  },

  cancel: { phone: { type: "phone", label: "Mobile number", required: true } }
};

module.exports = { schemas, cityNames, busIds };
