/* ---------------------------------------------------------------------------
 * validator.js - a small, dependency-free server-side validation engine.
 *
 * Every incoming request body is checked against a SCHEMA (see schemas.js).
 * For each declared field the engine:
 *   1. SANITISES  (trim, collapse spaces, strip HTML tags, control characters)
 *   2. TYPE-CHECKS (a name must be text, passengers must be an integer ...)
 *   3. APPLIES RULES (required, min/max, pattern, enum, date range ...)
 * Unknown fields are DROPPED (whitelisting), which also blocks mass-assignment
 * and "__proto__" style payloads. The result is {valid, errors, values}.
 * ------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;           // 10-digit Indian mobile number
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function cleanText(value) {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")   // control characters
    .replace(/<[^>]*>/g, "")                   // strip HTML tags
    .replace(/\s+/g, " ")
    .trim();
}

function todayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects impossible dates such as 2026-02-31
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/* Validate ONE field. Returns {value, error}. */
function validateField(spec, raw, ctx) {
  const label = spec.label || "This field";
  const missing = raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");

  if (missing) {
    if (spec.required) return { error: `${label} is required.` };
    return { value: spec.default };
  }

  switch (spec.type) {
    case "string": case "email": case "phone": case "password": {
      if (typeof raw !== "string") return { error: `${label} must be text.` };
      const isPassword = spec.type === "password";
      const value = isPassword ? raw : cleanText(raw);       // never alter passwords
      if (spec.type === "email") {
        if (value.length > 120 || !EMAIL_RE.test(value)) return { error: "Enter a valid email address (for example name@example.com)." };
        return { value: value.toLowerCase() };
      }
      if (spec.type === "phone") {
        const digits = value.replace(/[\s-]/g, "");
        if (!PHONE_RE.test(digits)) return { error: "Enter a valid 10-digit Indian mobile number (starts with 6-9)." };
        return { value: digits };
      }
      if (spec.min && value.length < spec.min) return { error: `${label} must be at least ${spec.min} characters.` };
      if (spec.max && value.length > spec.max) return { error: `${label} must be at most ${spec.max} characters.` };
      if (isPassword && spec.strength !== false) {
        const problems = [];
        if (!/[a-z]/.test(value)) problems.push("a lowercase letter");
        if (!/[A-Z]/.test(value)) problems.push("an uppercase letter");
        if (!/\d/.test(value)) problems.push("a digit");
        if (!/[^A-Za-z0-9]/.test(value)) problems.push("a special character");
        if (problems.length) return { error: "Password must also include " + problems.join(", ") + "." };
      }
      if (spec.pattern && !spec.pattern.test(value)) return { error: spec.patternMessage || `${label} has an invalid format.` };
      return { value };
    }
    case "int": {
      const n = typeof raw === "number" ? raw : (typeof raw === "string" && /^-?\d+$/.test(raw.trim()) ? Number(raw) : NaN);
      if (!Number.isInteger(n)) return { error: `${label} must be a whole number.` };
      if (spec.min !== undefined && n < spec.min) return { error: `${label} must be at least ${spec.min}.` };
      if (spec.max !== undefined && n > spec.max) return { error: `${label} must be at most ${spec.max}.` };
      return { value: n };
    }
    case "enum": {
      if (typeof raw !== "string") return { error: `${label} must be text.` };
      const value = cleanText(raw);
      const match = spec.values.find(v => v.toLowerCase() === value.toLowerCase());
      if (!match) return { error: `${label} must be one of: ${spec.values.join(", ")}.` };
      return { value: match };
    }
    case "date": {
      if (typeof raw !== "string") return { error: `${label} must be a date (YYYY-MM-DD).` };
      const date = parseISODate(raw.trim());
      if (!date) return { error: `${label} must be a real date in YYYY-MM-DD format.` };
      if (spec.notPast && date < todayStart()) return { error: `${label} cannot be in the past.` };
      if (spec.maxDaysAhead) {
        const limit = todayStart(); limit.setDate(limit.getDate() + spec.maxDaysAhead);
        if (date > limit) return { error: `${label} must be within the next ${spec.maxDaysAhead} days.` };
      }
      return { value: raw.trim() };
    }
    case "boolean": {
      const value = raw === true || raw === "true" || raw === "on" || raw === "1";
      if (spec.mustBeTrue && !value) return { error: spec.mustBeTrueMessage || `${label} must be accepted.` };
      return { value };
    }
    case "stringArray": {
      const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? raw.split(",") : null);
      if (!list) return { error: `${label} must be a list.` };
      const cleaned = [...new Set(list.map(x => typeof x === "string" ? cleanText(x).toLowerCase() : null))];
      if (cleaned.includes(null)) return { error: `${label} must only contain text values.` };
      const bad = cleaned.filter(x => x && !spec.values.includes(x));
      if (bad.length) return { error: `${label} contains unsupported values: ${bad.slice(0, 3).join(", ")}.` };
      if (spec.max && cleaned.length > spec.max) return { error: `${label} allows at most ${spec.max} choices.` };
      return { value: cleaned.filter(Boolean) };
    }
    case "array": {
      if (!Array.isArray(raw)) return { error: `${label} must be a list.` };
      if (spec.min && raw.length < spec.min) return { error: `${label} needs at least ${spec.min} item(s).` };
      if (spec.max && raw.length > spec.max) return { error: `${label} allows at most ${spec.max} item(s).` };
      return { value: raw, nested: true };
    }
    case "object":
      return isPlainObject(raw) ? { value: raw, nested: true } : { error: `${label} must be an object.` };
    default:
      return { error: `${label}: unsupported rule type.` };
  }
}

/* Validate a whole object against a schema {fieldName: spec}. Nested keys become "a.b" / "list.0.name". */
function validateObject(schema, data, prefix, errors) {
  const values = {};
  const source = isPlainObject(data) ? data : {};
  for (const [name, spec] of Object.entries(schema)) {
    if (DANGEROUS_KEYS.has(name)) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    const raw = hasOwn(source, name) ? source[name] : undefined;
    const { value, error, nested } = validateField(spec, raw, source);
    if (error) { errors[path] = error; continue; }
    if (nested && spec.type === "array") {
      values[name] = (value || []).map((item, i) => validateObject(spec.items, item, `${path}.${i}`, errors));
    } else if (nested && spec.type === "object") {
      values[name] = validateObject(spec.fields, value, path, errors);
    } else if (value !== undefined) {
      values[name] = value;
    }
    // Cross-field rules, e.g. confirmPassword === password, to !== from
    if (!errors[path] && values[name] !== undefined) {
      if (spec.equalsField && values[name] !== source[spec.equalsField]) errors[path] = spec.equalsMessage || `${spec.label} must match ${spec.equalsField}.`;
      if (spec.differentFrom && values[spec.differentFrom] !== undefined && String(values[name]).toLowerCase() === String(values[spec.differentFrom]).toLowerCase())
        errors[path] = spec.differentMessage || `${spec.label} must be different from ${spec.differentFrom}.`;
    }
  }
  return values;
}

function validate(schema, data, extraCheck) {
  const errors = {};
  const values = validateObject(schema, data, "", errors);
  if (extraCheck && !Object.keys(errors).length) {
    const more = extraCheck(values) || {};
    Object.assign(errors, more);
  }
  const ignored = isPlainObject(data) ? Object.keys(data).filter(k => !hasOwn(schema, k)) : [];
  return { valid: Object.keys(errors).length === 0, errors, values, ignoredFields: ignored };
}

/* Human-readable rules (served by GET /api/rules so the demo page can show them). */
function describe(schema, prefix = "") {
  const rows = [];
  for (const [name, s] of Object.entries(schema)) {
    const bits = [];
    bits.push(s.required ? "required" : "optional");
    bits.push(s.type === "stringArray" ? "list of text" : s.type);
    if (s.min !== undefined) bits.push(`min ${s.min}`);
    if (s.max !== undefined) bits.push(`max ${s.max}`);
    if (s.values) bits.push(s.values.length > 6 ? `${s.values.length} allowed values` : "one of " + s.values.join(" | "));
    if (s.notPast) bits.push("not in the past");
    if (s.pattern) bits.push("pattern");
    if (s.type === "password") bits.push("upper+lower+digit+symbol");
    if (s.equalsField) bits.push(`= ${s.equalsField}`);
    if (s.differentFrom) bits.push(`≠ ${s.differentFrom}`);
    rows.push({ field: prefix + name, rule: bits.join(", ") });
    if (s.items) rows.push(...describe(s.items, `${prefix}${name}[].`));
    if (s.fields) rows.push(...describe(s.fields, `${prefix}${name}.`));
  }
  return rows;
}

module.exports = { validate, describe, cleanText, parseISODate, EMAIL_RE, PHONE_RE };
