/* TourBus - Express server
 * Run:  npm install  &&  npm start      then open http://localhost:3000
 * Serves the website from /public and exposes the validated JSON API under /api. */
const path = require("path");
require("dotenv").config();
const express = require("express");
const apiRoutes = require("./src/routes/api");
const store = require("./src/store");
const { securityHeaders, requestLogger, apiNotFound, errorHandler } = require("./src/middleware");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.disable("x-powered-by");
app.set("trust proxy", 1);                       // correct client IP behind Render/Railway proxies

app.use(securityHeaders);
app.use(requestLogger);
app.use(express.json({ limit: "50kb" }));        // parses JSON bodies (invalid JSON -> errorHandler -> 400)
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

app.use("/api", apiRoutes);                      // <-- all server-side validation lives behind this router
app.use("/api", apiNotFound);

app.use(express.static(PUBLIC_DIR, { extensions: ["html"], maxAge: "1h" }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html")));

app.use(errorHandler);

if (require.main === module) {
  store.connect()
    .then(() => app.listen(PORT, () => {
      console.log(`TourBus running at http://localhost:${PORT}`);
    }))
    .catch(err => {
      console.error("[startup] database connection failed:", err.message);
      process.exitCode = 1;
    });
}

module.exports = app;
