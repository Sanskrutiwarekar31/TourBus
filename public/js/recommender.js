/* Smart Tour Suggester - a transparent, rule-based scoring engine (no external AI service).
 * Each package is scored 0-100 on: interests (40) + budget (25) + duration (15) + season (15) + closeness (5).
 * UMD: runs in the browser (offline fallback) and on the Express server (POST /api/suggest-tours). */
(function (root, factory) {
  const catalog = (typeof module === "object" && module.exports) ? require("./catalog.js") : root.TourBusCatalog;
  if (typeof module === "object" && module.exports) module.exports = factory(catalog);
  else root.TourBusRecommender = factory(catalog);
})(typeof self !== "undefined" ? self : this, function (catalog) {
  const {tours, cities, monthNames, haversineKm} = catalog;
  const inr = n => "₹" + Number(n).toLocaleString("en-IN");

  function monthRange(months) {
    if (months.length >= 12) return "all year";
    return months.map(m => monthNames[m - 1]).join(", ");
  }

  function scoreTour(tour, prefs) {
    const reasons = [], cautions = [];
    let score = 0;

    // 1) Interests (40)
    const wanted = prefs.interests || [];
    if (wanted.length) {
      const hits = tour.interests.filter(i => wanted.includes(i));
      score += 40 * (hits.length / wanted.length);
      if (hits.length) reasons.push("Matches your interests: " + hits.join(", "));
      else cautions.push("None of your selected interests are a main theme here");
    } else score += 20;

    // 2) Budget per person (25)
    if (prefs.budget) {
      const diff = prefs.budget - tour.price;
      if (diff >= 0) { score += 25 * (diff <= prefs.budget * 0.35 ? 1 : 0.85); reasons.push("Within budget (" + inr(diff) + " to spare per person)"); }
      else {
        const over = -diff / prefs.budget;
        score += Math.max(0, 25 * (1 - over * 2.5));
        cautions.push("About " + inr(-diff) + " above your per-person budget");
      }
    } else score += 12;

    // 3) Duration (15)
    if (prefs.days) {
      const gap = Math.abs(prefs.days - tour.days);
      score += Math.max(0, 15 - gap * 5);
      if (gap === 0) reasons.push("Exactly " + tour.days + " day(s), as you asked");
      else if (tour.days > prefs.days) cautions.push("Needs " + (tour.days - prefs.days) + " more day(s) than you planned");
      else reasons.push("Fits inside your " + prefs.days + "-day window");
    } else score += 7;

    // 4) Season (15)
    if (prefs.month) {
      if (tour.bestMonths.includes(prefs.month)) { score += 15; reasons.push("Good season in " + monthNames[prefs.month - 1]); }
      else cautions.push("Not the ideal season in " + monthNames[prefs.month - 1] + " (best: " + monthRange(tour.bestMonths) + ")");
    } else score += 7;

    // 5) Closeness to start city (5)
    let distanceKm = null;
    if (prefs.startCity && cities[prefs.startCity] && cities[tour.destination]) {
      distanceKm = Math.round(haversineKm(cities[prefs.startCity], cities[tour.destination]) * 1.25);
      score += Math.max(0, 5 - distanceKm / 400);
      if (distanceKm < 250) reasons.push("Close to " + prefs.startCity + " (~" + distanceKm + " km by road)");
    }
    score += (tour.rating - 4) * 2; // tiny quality bonus so ties are broken by rating

    // Group size
    if (prefs.travellers && prefs.travellers > tour.slots) cautions.push("Only " + tour.slots + " slots per departure");

    return {
      tour, distanceKm,
      matchPercent: Math.max(1, Math.min(99, Math.round(score))),
      estimatedTotal: prefs.travellers ? tour.price * prefs.travellers : tour.price,
      reasons, cautions
    };
  }

  function suggest(prefs, limit) {
    const results = tours.map(t => scoreTour(t, prefs)).sort((a, b) => b.matchPercent - a.matchPercent || b.tour.rating - a.tour.rating);
    return results.slice(0, limit || 4);
  }

  return {suggest, scoreTour, monthRange};
});
