# TourBus - bus journeys and destination discovery

## Quick start
```bash
npm install
npm start          # http://localhost:3000
npm test           # API and booking checks
```
Open **http://localhost:3000** with Node.js 18 or newer. Bookings and enquiries use the Express API, so run the site
through this server rather than opening the HTML files directly.

## MongoDB setup
1. Create a MongoDB database (for example, a free MongoDB Atlas cluster) and a database user.
2. Copy `.env.example` to `.env` and replace the `MONGODB_URI` placeholders with the connection string from Atlas.
   If your password contains special characters, URL-encode them in the URI.
3. In Atlas Network Access, allow connections from the machine or hosting service that runs this server.
4. Run `npm install`, then `npm start`. The server connects to MongoDB before it starts accepting requests.

With `MONGODB_URI` configured, bookings, accounts, contact messages, newsletter subscribers, tour enquiries, and the
sample travel catalog are stored in MongoDB collections. The catalog is seeded on startup into `cities`, `routes`, and
`buses`; it includes mapped places and at least 100 sample bus schedules. `GET /api/catalog` returns those stored
records. The schedules are demo data, not live operator inventory. Seat reservations use a unique database index to
prevent concurrent bookings of the same seat. Without `MONGODB_URI`, the app stores the same catalog in
`data/store.json` for local development; automated tests also use this file-backed mode. To import existing JSON
records into MongoDB, run `npm run migrate:json` after configuring `MONGODB_URI`. The import is safe to rerun and does
not remove the JSON file.

For Render, set `MONGODB_URI` in the service's **Environment** settings; do not commit `.env` or database credentials.

## Booking CRUD API (Postman)
Start the server with `npm start` and use `http://localhost:3000` as the Postman base URL. The API also supports the
same paths on the deployed Render service. Booking records use the existing server-side validation and fare/seat
checks; a successful create returns the generated `bookingId`, which you can use in the other requests.

| Method | URL | Success |
|---|---|---|
| `POST` | `/api/bookings` | `201 Created` |
| `GET` | `/api/bookings` | `200 OK`, all bookings |
| `GET` | `/api/bookings/:bookingId` | `200 OK`, one booking |
| `PUT` | `/api/bookings/:bookingId` | `200 OK`, updated booking |
| `DELETE` | `/api/bookings/:bookingId` | `200 OK`, deleted booking |

For `POST`, choose a future date within the next 120 days and an available seat for the selected bus:

```json
{
  "busId": "BUS101",
  "journeyDate": "2027-01-15",
  "passengers": [
    { "name": "Asha Rao", "age": 28, "gender": "Female", "seat": "S20" }
  ],
  "contact": {
    "name": "Asha Rao",
    "phone": "9876543210",
    "email": "asha@example.com"
  },
  "payment": "UPI demo"
}
```

Set `Content-Type: application/json` for requests with a body. `PUT` accepts any subset of the booking input fields,
including individual contact fields, and recalculates fare and coupon totals on the server when relevant fields change.
Invalid input returns `400`; unknown booking IDs return `404`; unexpected errors return JSON with status `500`.

## Product features
- Responsive, photo-led homepage and destination cards using remotely hosted Unsplash photographs.
- 50+ sample tour packages across India and selected international destinations.
- Searchable city inputs, browser-local route-search trends, and interactive OpenStreetMap maps.
- Bus search, seat selection, demo checkout, booking lookup/cancellation, and tour enquiries.
- Server-side validation remains active for real forms and bookings; the separate validation lab has been removed.

## Project structure
| Path | Purpose |
|---|---|
| `server.js` | Express app, API router, static website, and error handlers |
| `src/` | Validation, request middleware, MongoDB/JSON persistence, and API routes |
| `data/store.json` | Local/test persistence when `MONGODB_URI` is not set |
| `public/` | Website pages, styles, and browser-side code |
| `public/js/catalog.js` | Shared sample city, bus, and tour catalog |
| `test/run-tests.js` | Automated API tests |
| `Dockerfile`, `render.yaml` | Deployment configuration |

## Current integration limits
The catalog, tour schedules, and coupon codes are sample content, not live operator inventory. Payments are simulated,
and the map uses OpenStreetMap with a public routing service. Google Maps
Platform, live hotel availability, AI-provider APIs, MySQL, owner-managed offers, and the bus-owner operations dashboard
are not configured in this project.
Configure production credentials through deployment environment variables; do not commit database passwords or API keys.
