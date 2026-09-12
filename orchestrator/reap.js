// Delete every sandbox on the account. The memory cap is 10 GiB and each box is
// 4 GB, so two leaked sandboxes block every future run.
process.loadEnvFile(require("node:path").resolve(__dirname, "..", ".env"));
const H = { Authorization: `Bearer ${process.env.DAYTONA_API_KEY}` };
(async () => {
  const r = await fetch("https://app.daytona.io/api/sandbox", { headers: H });
  const j = await r.json();
  const arr = Array.isArray(j) ? j : (j.items ?? []);
  for (const s of arr) {
    const d = await fetch(`https://app.daytona.io/api/sandbox/${s.id}`, { method: "DELETE", headers: H });
    console.log("deleted", s.id.slice(0, 8), d.status);
  }
  console.log(`${arr.length} sandbox(es)`);
})();
