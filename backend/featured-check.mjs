// Temp endpoint check — deleted after use
const PORT = process.env.CHECK_PORT || "4102";
const res = await fetch(`http://127.0.0.1:${PORT}/api/reviews/featured`);
const json = await res.json();
console.log("FEATURED status=" + res.status + " count=" + json.count);
for (const r of json.data) {
  console.log("  - " + r.rating + "star " + r.customerName + " [" + r.source + "] :: " + r.comment.slice(0, 45));
}