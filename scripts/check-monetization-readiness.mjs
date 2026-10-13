// Public, read-only checks. No login cookies, payment details or secrets are read.
const base = process.argv[2] ?? "https://www.brawl-o1.site";
const target = new URL(base);
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error("Use a public HTTP(S) origin.");
const paths = ["/", "/privacy", "/terms", "/contact", "/robots.txt", "/sitemap.xml", "/ads.txt"];
const results = await Promise.all(paths.map(async path => {
  try {
    const response = await fetch(new URL(path, target.origin), { signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    return { path, status: response.status, ok: response.ok,
      ...(path === "/ads.txt" ? { authorizedGooglePublisherPresent: /^\s*google\.com,\s*pub-\d+,\s*DIRECT,\s*f08c47fec0942fa0\s*$/mi.test(text) } : {}) };
  } catch { return { path, ok: false, status: null }; }
}));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin: target.origin, results,
  manualChecks: ["AdSense operator must be 18+ or a parent/guardian using their own account", "Site approval and payout setup require operator confirmation", "Use the publisher ID supplied by the actual approved account", "Review fan-content rights and ad placement before enabling ads"],
  note: "Passing HTTP checks does not establish AdSense eligibility, approval, ad delivery or revenue." }, null, 2));
