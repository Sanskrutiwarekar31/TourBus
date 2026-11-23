document.addEventListener("DOMContentLoaded", () => {
  const { esc } = TB, f = document.getElementById("authForm"), msg = document.getElementById("authMsg");
  let mode = "login";
  const regBits = [document.getElementById("regOnly"), document.getElementById("regOnly2")], meter = document.getElementById("meter");
  function setMode(m) {
    mode = m; regBits.forEach(b => b.classList.toggle("hidden", m !== "register")); meter.classList.toggle("hidden", m !== "register");
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.mode === m));
    document.getElementById("authBtn").textContent = m === "login" ? "Sign in" : "Create account";
    f.password.autocomplete = m === "login" ? "current-password" : "new-password"; msg.innerHTML = ""; TB.clearErrors(f);
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));
  setMode(TB.qs.get("mode") === "register" ? "register" : "login");
  f.password.addEventListener("input", () => {
    const p = f.password.value; let s = 0;
    if (p.length >= 8) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    const bar = meter.firstElementChild; bar.style.width = s * 25 + "%"; bar.style.background = ["#c62f2f", "#c62f2f", "#e0a21e", "#2f9e63", "#16794c"][s];
  });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries()), errors = {}; const set = (k, m) => { if (m) errors[k] = m; };
    set("email", TB.rules.email(v.email)); set("password", TB.rules.required(v.password, "Password"));
    if (mode === "register") {
      set("name", TB.rules.name(v.name)); set("phone", TB.rules.phone(v.phone));
      if (!errors.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(v.password)) errors.password = "Use 8+ characters with upper, lower, a digit and a symbol.";
      if (v.password !== v.confirmPassword) errors.confirmPassword = "Passwords do not match.";
      if (!f.terms.checked) errors.terms = "You must accept the terms.";
    }
    if (!TB.showErrors(f, errors)) return;
    const body = mode === "login" ? { email: v.email, password: v.password } : { name: v.name, email: v.email, phone: v.phone, password: v.password, confirmPassword: v.confirmPassword, terms: f.terms.checked };
    const r = await TB.api("POST", "/api/auth/" + mode, body);
    if (r.ok && r.data.success) { TB.setUser(r.data.user); msg.innerHTML = `<div class="alert good">${esc(r.data.message)} Redirecting…</div>`; setTimeout(() => location.href = "index.html", 900); }
    else { TB.showErrors(f, r.data.errors || {}); msg.innerHTML = `<div class="alert bad">${esc(r.data.message || "Something went wrong.")}</div>`; }
  });
});
