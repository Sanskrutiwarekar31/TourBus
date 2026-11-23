/* middleware.js - Express middleware used by the API. */
const { validate } = require("./validator");
const { schemas } = require("./schemas");

/* API request counters exposed through /api/stats. */
const metrics = { total: 0, accepted: 0, rejected: 0, since: new Date().toISOString() };

function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(self)",
    // Leaflet (maps) is loaded from a CDN; OpenStreetMap supplies the map tiles.
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://images.unsplash.com https://unpkg.com https://cdn.jsdelivr.net",
      "connect-src 'self' https://router.project-osrm.org",
      "frame-src 'self' https://www.openstreetmap.org",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ")
  });
  next();
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api/")) {
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`);
    }
  });
  next();
}

/* Simple fixed-window rate limiter (per IP). Use "express-rate-limit" in production. */
function rateLimit({ windowMs = 60000, max = 120, message = "Too many requests. Please slow down and try again shortly." } = {}) {
  const hits = new Map();
  const sweep = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs);
  if (sweep.unref) sweep.unref();
  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.ip || "unknown";
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
    entry.count++;
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

/* validateBody("schemaName", extraCheck?, statusCode?) -> middleware.
 * Validation defaults to 422; on success sets req.valid. */
function validateBody(schemaName, extraCheck, statusCode = 422) {
  return function validateMiddleware(req, res, next) {
    metrics.total++;
    const body = req.body;
    if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
      metrics.rejected++;
      return res.status(400).json({ success: false, message: "Request body must be a JSON object (Content-Type: application/json)." });
    }
    const result = validate(schemas[schemaName], body);
    if (!result.valid) {
      metrics.rejected++;
      const n = Object.keys(result.errors).length;
      return res.status(statusCode).json({
        success: false,
        message: `Validation failed: ${n} problem${n > 1 ? "s" : ""} found. Nothing was saved.`,
        errors: result.errors,
        ignoredFields: result.ignoredFields
      });
    }
    const finish = extraErrors => {
      if (extraErrors && Object.keys(extraErrors).length) {
        metrics.rejected++;
        const n = Object.keys(extraErrors).length;
        return res.status(statusCode).json({
          success: false,
          message: `Validation failed: ${n} problem${n > 1 ? "s" : ""} found. Nothing was saved.`,
          errors: extraErrors,
          ignoredFields: result.ignoredFields
        });
      }
      metrics.accepted++;
      req.valid = result.values;
      req.ignoredFields = result.ignoredFields;
      next();
    };
    if (!extraCheck) return finish();
    try {
      const extraErrors = extraCheck(result.values, req);
      if (extraErrors && typeof extraErrors.then === "function") {
        extraErrors.then(finish, next);
      } else {
        finish(extraErrors);
      }
    } catch (err) {
      next(err);
    }
  };
}

/* Validate :id route parameters with the same engine */
function validateParam(name, schemaName, statusCode = 422) {
  return function paramMiddleware(req, res, next) {
    const r = validate(schemas[schemaName], { [name]: req.params[name], phone: "9999999999" });
    if (r.errors[name]) return res.status(statusCode).json({ success: false, message: r.errors[name], errors: { [name]: r.errors[name] } });
    next();
  };
}

function apiNotFound(req, res) {
  res.status(404).json({ success: false, message: `No API route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.type === "entity.parse.failed") {
    metrics.total++; metrics.rejected++;
    return res.status(400).json({ success: false, message: "Request body is not valid JSON." });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large (limit 50 KB)." });
  }
  console.error("[error]", err);
  res.status(500).json({ success: false, message: "Something went wrong on the server." });
}

module.exports = { securityHeaders, requestLogger, rateLimit, validateBody, validateParam, apiNotFound, errorHandler, metrics };
