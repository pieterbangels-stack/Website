// Static site builder for pieterbangels.com — no dependencies.
// Usage: node build.mjs            -> dist/ (for hosting on your own domain)
//        node build.mjs --preview  -> dist-preview/ (links end in index.html, for local preview)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PREVIEW = process.argv.includes("--preview");
const OUT = path.join(ROOT, PREVIEW ? "dist-preview" : "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
const SITE = cfg.siteUrl.replace(/\/$/, "");
const YEAR = new Date().getFullYear();

// ---------- helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const copyDir = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
};
// link to a directory page, relative to the current page depth
const link = (depth, target) => {
  const up = "../".repeat(depth);
  if (target === "") return up + (PREVIEW ? "index.html" : "./");
  return up + target + (target.endsWith("/") && PREVIEW ? "index.html" : "");
};
const fmtDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
    const ext = /^https?:/.test(u);
    return `<a href="${u}"${ext ? ' rel="noopener"' : ""}>${t}</a>`;
  });
  return s;
}
function markdown(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  let html = "", para = [], list = null;
  const flushP = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>\n`; para = []; } };
  const flushL = () => { if (list) { html += `<${list.t}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.t}>\n`; list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { flushP(); flushL(); const n = m[1].length; const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); html += `<h${n} id="${id}">${inline(m[2])}</h${n}>\n`; continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { flushP(); flushL(); html += `<blockquote><p>${inline(m[1])}</p></blockquote>\n`; continue; }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
    flushL(); para.push(l.trim());
  }
  flushP(); flushL();
  return html;
}
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: m[2] };
}

// ---------- content ----------
const postsDir = path.join(ROOT, "content/posts");
const posts = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter((f) => f.endsWith(".md")).map((f) => {
  const { meta, body } = frontMatter(fs.readFileSync(path.join(postsDir, f), "utf8"));
  const slug = f.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const date = meta.date || f.slice(0, 10);
  const tags = (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const words = body.split(/\s+/).filter(Boolean).length;
  return { slug, date, title: meta.title || slug, summary: meta.summary || "", tags, body, html: markdown(body), minutes: Math.max(1, Math.round(words / 220)), draft: meta.draft === "true" };
}).filter((p) => !p.draft).sort((a, b) => b.date.localeCompare(a.date)) : [];

const LOGO_BLUE = "assets/tvc-logo-blue.svg";
const LOGO_WHITE = "assets/tvc-logo-white.svg";

const person = {
  "@type": "Person",
  "@id": SITE + "/#pieter",
  name: cfg.name,
  jobTitle: cfg.jobTitle,
  description: `${cfg.name} is an SAP Solution Architect specialising in SAP for Utilities (SAP IS-U and SAP S/4HANA Utilities), with more than 20 years of experience across the meter-to-cash process. He is based in ${cfg.location} and is one of the partners at ${cfg.employer.name}.`,
  url: SITE + "/",
  email: "mailto:" + cfg.email,
  telephone: cfg.phone.replace(/\s/g, ""),
  address: { "@type": "PostalAddress", addressCountry: "BE" },
  worksFor: { "@type": "Organization", name: cfg.employer.name, url: cfg.employer.url },
  knowsAbout: cfg.knowsAbout,
  knowsLanguage: cfg.languages,
  sameAs: Object.values(cfg.profiles).filter(Boolean),
};

// ---------- shared layout ----------
function layout({ depth, title, description, canonical, body, jsonld, ogType = "website", active = "" }) {
  const up = "../".repeat(depth);
  const nav = [
    ["Expertise", link(depth, "") + "#expertise"],
    ["Insights", link(depth, "blog/")],
    ["Speaking", link(depth, "") + "#speaking"],
    ["Contact", link(depth, "") + "#contact"],
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(cfg.name)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)}: Insights" href="${SITE}/feed.xml">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${up}${LOGO_BLUE}" type="image/svg+xml">
<link rel="stylesheet" href="${up}assets/site.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="${link(depth, "")}"><span class="brand-name">${esc(cfg.name)}</span><span class="brand-role">SAP for Utilities</span></a>
    <nav aria-label="Main">${nav.map(([t, h]) => `<a href="${h}"${active === t ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
    <a class="tvc" href="${cfg.employer.url}" rel="noopener" aria-label="${esc(cfg.employer.name)}"><img src="${up}${LOGO_BLUE}" width="60" height="60" alt="${esc(cfg.employer.name)} logo"></a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap foot-row">
    <span>© ${YEAR} ${esc(cfg.name)} · ${esc(cfg.jobTitle)} · ${esc(cfg.location)}</span>
    <span>Partner at <a href="${cfg.employer.url}" rel="noopener">${esc(cfg.employer.name)}</a></span>
  </div>
</footer>
<script src="${up}assets/site.js" defer></script>
</body>
</html>`;
}

// ---------- page sections ----------
const chain = [
  ["Device Management", "Meters, installations and replacements: the physical base of every bill.", "The smart meter rollout drives a sharp increase in profile values to store and process.", "Guidance in determining the right data model to store these profile values, in S/4HANA or in other SAP products such as DER."],
  ["Meter reading", "Reads, validation and estimation, from manual reads to interval data.", "Implausible reads and estimations pile up and block billing.", "Optimised validation rules and automated exception handling that keep reads flowing into billing."],
  ["Billing", "Rate structures, billing schemas and the exceptions that keep teams busy.", "Complex rates, billing outsorts and price changes under time pressure.", "Simpler rate structures and schemas, using external prices, time-of-use billing, flexible user-exit logic and more."],
  ["Invoicing", "Turning billing documents into clear, correct, on-time invoices.", "Invoices customers do not understand, and changing legal requirements on content.", "Correct invoicing logic and output that customers can read."],
  ["FI-CA", "Contract accounting: payments, dunning and the cash at the end of the line.", "Open items, payment allocation and dunning that do not close the loop.", "A contract accounting set-up that reduces bad debt and turns every bill into cash."],
  ["Market communication", "Message exchange with grid operators and the market.", "Market rules and message formats change often, and every change touches the core.", "Robust message processing and market process logic that absorb market changes without disruption."],
];

const faqs = [
  ["Who is Pieter Bangels?", `${cfg.name} is an SAP Solution Architect who specialises in SAP for Utilities. He has more than 20 years of experience with SAP IS-U and S/4HANA Utilities across the full meter-to-cash process, and is one of the partners at ${cfg.employer.name}.`],
  ["Which SAP utilities topics does Pieter cover?", "SAP IS-U on ECC 6.0 and SAP S/4HANA Utilities: device management, meter reading, billing, invoicing, FI-CA contract accounting and market communication. He combines solution architecture, roadmap exercises, functional analysis and proofs of concept."],
  ["Can Pieter help us move from SAP IS-U to S/4HANA Utilities?", "Yes. He helps utilities choose a migration path, analyse custom code and keep billing running during the transition. Read his article on the most common misconceptions about this move in the Insights section."],
  ["Can I invite Pieter to speak at an event?", "Yes. Pieter speaks at conferences, user groups, webinars and podcasts about SAP for Utilities, in English, Dutch and French. Contact him by email to discuss a slot."],
  ["Where does Pieter work?", `He is based in ${cfg.location} and available for projects and events across Europe.`],
];

function home() {
  const latest = posts.slice(0, 3);
  const clients = cfg.clients || [];
  const clientsBlock = clients.length
    ? `<section class="clients" aria-labelledby="h-clients">
  <div class="wrap"><p class="label" id="h-clients">Utilities I have worked with</p></div>
  <div class="marquee" data-marquee><ul class="logos">${clients.map((c) => `<li><img src="${c.logo}" alt="${esc(c.name)}" title="${esc(c.name)}" loading="lazy" height="44"></li>`).join("")}</ul></div>
  <div class="wrap"><p class="sr-only">Clients include ${clients.map((c) => esc(c.name)).join(", ")}.</p></div>
</section>`
    : PREVIEW
      ? `<section class="clients" aria-labelledby="h-clients"><div class="wrap"><p class="label" id="h-clients">Utilities I have worked with</p><div class="logo-placeholder">Client logos appear here: add them to <code>assets/clients/</code> and list them in <code>config.json</code>. This box is only visible in the preview.</div></div></section>`
      : "";

  const body = `
<section class="hero">
  <div class="orbs" aria-hidden="true"><span class="orb orb-navy"></span><span class="orb orb-red"></span><span class="orb orb-ring"></span></div>
  <div class="wrap hero-inner">
    <p class="label">SAP for Utilities</p>
    <h1>SAP for utilities,<br><span>from meter to cash.</span></h1>
    <p class="lede">I am ${esc(cfg.name)}, an SAP Solution Architect for utilities. I help energy and water companies to get the most out of their SAP landscape.</p>
    <div class="actions"><a class="btn" href="#contact">Start a conversation</a><a class="btn btn-line" href="#speaking">Invite me to speak</a></div>
    <dl class="facts">
      <div><dt><span data-count="20">20</span>+</dt><dd>years in SAP for utilities</dd></div>
      <div><dt>Expert</dt><dd>in the meter-to-cash domains</dd></div>
      <div><dt>ECC&nbsp;→&nbsp;S/4</dt><dd>IS-U and S/4HANA Utilities transformations</dd></div>
      <div><dt>Architecture</dt><dd>Roadmap exercises</dd></div>
    </dl>
  </div>
</section>
${clientsBlock}
<section id="expertise" class="sec" aria-labelledby="h-exp">
  <div class="wrap">
    <p class="label">Expertise</p>
    <h2 id="h-exp">I work across the whole meter-to-cash chain, not one module.</h2>
    <div class="rule"></div>
    <p class="intro">Most problems in a utility's SAP landscape sit between modules. Choose a step to see the typical problem and how I help.</p>
    <div class="chain" data-chain>
      <div class="chain-track" aria-hidden="true"><span class="chain-flow"></span></div>
      <div class="chain-tabs" role="tablist" aria-label="Meter-to-cash steps">
        ${chain.map((c, i) => `<button role="tab" id="tab-${i}" aria-controls="step-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="tab-name">${c[0]}</span></button>`).join("")}
      </div>
      <div class="chain-panels">
        ${chain.map((c, i) => `<article class="chain-panel" role="tabpanel" id="step-${i}" aria-labelledby="tab-${i}"${i === 0 ? "" : ' data-hidden="true"'}>
          <h3>${String(i + 1).padStart(2, "0")} · ${c[0]}</h3><p class="what">${c[1]}</p>
          <div class="ph"><div><h4>Typical problem</h4><p>${c[2]}</p></div><div><h4>How I help</h4><p>${c[3]}</p></div></div>
        </article>`).join("")}
      </div>
    </div>
  </div>
</section>

<section class="sec sec-grey" aria-labelledby="h-roles">
  <div class="wrap">
    <p class="label">What I bring</p>
    <h2 id="h-roles">Four roles that usually take four people.</h2>
    <div class="rule"></div>
    <div class="cards">
      ${[
        ["SAP Solution Architect", "Designing utility landscapes on SAP ECC 6.0 and S/4HANA that fit the business and stay maintainable."],
        ["Cross-domain functional analyst", "Billing, invoicing, device management, FI-CA and more, so the handovers between domains work."],
        ["Market communication specialist", "Guiding utilities through market processes and message flows to gain a competitive edge."],
        ["Proof of Concept enabler", "Setting up proofs of concept to showcase CX, FSA, DER and more, and their integrations with IS-U."],
      ].map((r, i) => `<div class="card"><span class="box">${String(i + 1).padStart(2, "0")}</span><h3>${r[0]}</h3><p>${r[1]}</p></div>`).join("")}
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="h-results">
  <div class="wrap">
    <p class="label">Track record</p>
    <h2 id="h-results">What utilities get out of it.</h2>
    <div class="rule"></div>
    <ol class="rows">
      <li><span class="box">01</span><div><h3>Implementations that land</h3><p>SAP implementations delivered end to end and on time, giving utilities a core system they can build on.</p></div></li>
      <li><span class="box">02</span><div><h3>Lower maintenance</h3><p>Existing SAP landscapes improved and simplified, cutting the effort needed to keep them running.</p></div></li>
      <li><span class="box">03</span><div><h3>Value on the bottom line</h3><p>Hidden value unlocked in existing systems, so SAP contributes to profitability instead of only cost.</p></div></li>
    </ol>
  </div>
</section>

<section class="sec sec-grey" aria-labelledby="h-ins">
  <div class="wrap">
    <p class="label">Insights</p>
    <div class="split"><h2 id="h-ins">Latest articles on SAP for utilities.</h2><a class="more" href="${link(0, "blog/")}">All articles →</a></div>
    <div class="rule"></div>
    ${postCarousel(latest, 0)}
  </div>
</section>

<section id="speaking" class="sec" aria-labelledby="h-speak">
  <div class="wrap">
    <p class="label">Speaking</p>
    <h2 id="h-speak">Looking for a utilities voice for your SAP event?</h2>
    <div class="rule"></div>
    <div class="talks">
      ${[
        ["From IS-U to S/4HANA Utilities", "Practical lessons on choosing a migration path and keeping billing running along the way."],
        ["Market communication without the headaches", "How utilities in the Benelux handle market processes in SAP, and what others can learn from it."],
        ["AI in meter-to-cash: hype versus practice", "Where AI already helps in billing and customer service, and where it does not yet."],
      ].map((t, i) => `<div class="talk"><span class="box">${String(i + 1).padStart(2, "0")}</span><h3>${t[0]}</h3><p>${t[1]}</p></div>`).join("")}
    </div>
    <p class="formats">Conferences · user groups · webinars · podcasts · customer workshops · in English, Dutch and French</p>
  </div>
</section>

<section class="sec sec-grey" aria-labelledby="h-faq">
  <div class="wrap narrow">
    <p class="label">Questions</p>
    <h2 id="h-faq">Frequently asked questions</h2>
    <div class="rule"></div>
    <div class="faq">${faqs.map(([q, a], i) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
  </div>
</section>

<section class="sec" aria-labelledby="h-beyond">
  <div class="wrap">
    <p class="label">Beyond SAP</p>
    <h2 id="h-beyond">The person behind the architect.</h2>
    <div class="rule"></div>
    <div class="beyond">
      <div><h3>Lifelong learner</h3><p>Always upskilling, currently in AI, leadership and sales strategy.</p></div>
      <div><h3>Start-ups and social initiatives</h3><p>Supporting young companies and social projects that drive positive change.</p></div>
      <div><h3>Active living</h3><p>Running, mountain biking on the trails and boxing training.</p></div>
      <div><h3>Family first</h3><p>Quality time with my daughters and family.</p></div>
    </div>
  </div>
</section>

<section id="contact" class="contact" aria-labelledby="h-contact">
  <div class="orbs" aria-hidden="true"><span class="orb orb-navy2"></span><span class="orb orb-red2"></span></div>
  <div class="wrap contact-inner">
    <div>
      <p class="label label-light">Ready to talk?</p>
      <h2 id="h-contact">Let's make your SAP landscape work for your utility.</h2>
      <p>A project, a second opinion on your landscape, or a speaking slot at your event: I am happy to hear from you.</p>
    </div>
    <div class="contact-lines">
      <a href="mailto:${cfg.email}"><span>${cfg.email}</span><small>Email</small></a>
      <a href="tel:${cfg.phone.replace(/\s/g, "")}"><span>${cfg.phone}</span><small>Phone</small></a>
      ${cfg.profiles.linkedin ? `<a href="${cfg.profiles.linkedin}" rel="noopener me"><span>LinkedIn</span><small>Profile</small></a>` : ""}
      ${cfg.profiles.sapCommunity ? `<a href="${cfg.profiles.sapCommunity}" rel="noopener me"><span>SAP Community</span><small>Blogs and answers</small></a>` : ""}
    </div>
    <img class="contact-logo" src="${LOGO_WHITE}" width="96" height="96" alt="">
  </div>
</section>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      person,
      { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: cfg.name, inLanguage: "en", publisher: { "@id": SITE + "/#pieter" } },
      { "@type": "ProfilePage", "@id": SITE + "/#profile", url: SITE + "/", name: `${cfg.name}, ${cfg.jobTitle}`, mainEntity: { "@id": SITE + "/#pieter" }, isPartOf: { "@id": SITE + "/#website" }, dateModified: new Date().toISOString().slice(0, 10) },
      { "@type": "FAQPage", "@id": SITE + "/#faq", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  return layout({
    depth: 0,
    title: `${cfg.name} | SAP IS-U & S/4HANA Utilities Expert in Europe`,
    description: `${cfg.name} is an SAP Solution Architect for utilities with 20+ years in SAP IS-U and S/4HANA Utilities: billing, invoicing, device management, FI-CA and market communication. Based in ${cfg.location}.`,
    canonical: SITE + "/",
    body,
    jsonld,
  });
}

function postGrid(list, depth) {
  if (!list.length) return `<p class="empty">The first articles are on their way.</p>`;
  return `<div class="posts">${list.map((p) => `<article class="post-card" data-tags="${esc(p.tags.join("|"))}">
    <p class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.minutes} min read</p>
    <h3><a href="${link(depth, `blog/${p.slug}/`)}">${esc(p.title)}</a></h3>
    <p>${esc(p.summary)}</p>
    ${p.tags.length ? `<p class="tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}
  </article>`).join("")}</div>`;
}

function postCarousel(list, depth) {
  if (list.length < 2) return postGrid(list, depth);
  const n = String(list.length).padStart(2, "0");
  return `<div class="carousel" data-carousel>
    <div class="car-bar">
      <p class="car-count" aria-live="polite"><span data-car-now>01</span> / ${n}</p>
      <div class="car-arrows">
        <button type="button" class="car-btn" data-dir="-1" aria-label="Previous article">&#8592;</button>
        <button type="button" class="car-btn" data-dir="1" aria-label="Next article">&#8594;</button>
      </div>
    </div>
    <div class="car-track" tabindex="0" role="region" aria-label="Latest articles">
      ${list.map((p, i) => `<article class="slide">
        <div class="slide-head">
          <span class="slide-num">${String(i + 1).padStart(2, "0")}</span>
          <p class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.minutes} min read${p.tags.length ? " · " + p.tags.map(esc).join(", ") : ""}</p>
          <h3><a href="${link(depth, `blog/${p.slug}/`)}">${esc(p.title)}</a></h3>
        </div>
        <div class="slide-body">
          <p>${esc(p.summary)}</p>
          <span class="read">Read the article &#8594;</span>
        </div>
      </article>`).join("")}
    </div>
  </div>`;
}

function blogIndex() {
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const body = `
<section class="sec page-head">
  <div class="wrap">
    <p class="label">Insights</p>
    <h1 class="h1-page">Articles on SAP for utilities</h1>
    <div class="rule"></div>
    <p class="intro">Practical writing on SAP IS-U, S/4HANA Utilities, market communication and AI in meter-to-cash, by ${esc(cfg.name)}.</p>
    ${tags.length > 1 ? `<div class="filters" role="group" aria-label="Filter by topic"><button type="button" aria-pressed="true" data-filter="">All</button>${tags.map((t) => `<button type="button" aria-pressed="false" data-filter="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
    ${postGrid(posts, 1)}
  </div>
</section>`;
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      person,
      { "@type": "Blog", "@id": SITE + "/blog/#blog", url: SITE + "/blog/", name: `${cfg.name}: Insights on SAP for Utilities`, author: { "@id": SITE + "/#pieter" }, blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date })) },
    ],
  };
  return layout({ depth: 1, title: `Insights on SAP for Utilities | ${cfg.name}`, description: `Articles by ${cfg.name} on SAP IS-U, S/4HANA Utilities, market communication and AI in meter-to-cash.`, canonical: SITE + "/blog/", body, jsonld, active: "Insights" });
}

function postPage(p) {
  const url = `${SITE}/blog/${p.slug}/`;
  const others = posts.filter((x) => x.slug !== p.slug).slice(0, 2);
  const body = `
<article class="sec article">
  <div class="progress" aria-hidden="true"><span></span></div>
  <div class="wrap narrow">
    <p class="label"><a href="${link(2, "blog/")}">Insights</a>${p.tags.length ? " · " + p.tags.map(esc).join(", ") : ""}</p>
    <h1 class="h1-page">${esc(p.title)}</h1>
    <div class="rule"></div>
    <p class="byline">By <a href="${link(2, "")}">${esc(cfg.name)}</a>, ${esc(cfg.jobTitle)} · <time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.minutes} min read</p>
    <p class="summary">${esc(p.summary)}</p>
    <div class="prose">${p.html}</div>
    <aside class="author">
      <img src="../../${LOGO_BLUE}" width="56" height="56" alt="">
      <div><p><strong>${esc(cfg.name)}</strong> is an SAP Solution Architect for utilities with more than 20 years in SAP IS-U and S/4HANA Utilities. He is one of the partners at ${esc(cfg.employer.name)}.</p>
      <p><a href="mailto:${cfg.email}">${cfg.email}</a></p></div>
    </aside>
    ${others.length ? `<h2 class="h-more">More insights</h2>${postGrid(others, 2)}` : ""}
  </div>
</article>`;
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      person,
      { "@type": "BlogPosting", "@id": url + "#article", headline: p.title, description: p.summary, datePublished: p.date, dateModified: p.date, url, mainEntityOfPage: url, inLanguage: "en", keywords: p.tags.join(", "), author: { "@id": SITE + "/#pieter" }, publisher: { "@id": SITE + "/#pieter" } },
    ],
  };
  return layout({ depth: 2, title: `${p.title} | ${cfg.name}`, description: p.summary, canonical: url, body, jsonld, ogType: "article", active: "Insights" });
}

// ---------- machine-readable files ----------
function llmsTxt() {
  return `# ${cfg.name}

> ${person.description}

${cfg.name} is an SAP for Utilities expert. Topics: ${cfg.knowsAbout.join(", ")}. Available for projects, advisory work and speaking at events across Europe, in English, Dutch and French.

Contact: ${cfg.email} · ${cfg.phone}

Profiles: ${[cfg.profiles.linkedin && "LinkedIn " + cfg.profiles.linkedin, cfg.profiles.sapCommunity && "SAP Community " + cfg.profiles.sapCommunity].filter(Boolean).join(" · ")}

## Pages

- [Profile and expertise](${SITE}/): background, meter-to-cash expertise, track record, speaking topics and FAQ
- [Insights](${SITE}/blog/): articles on SAP for Utilities

## Articles

${posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug}/): ${p.summary}`).join("\n")}

## Frequently asked questions

${faqs.map(([q, a]) => `### ${q}\n${a}`).join("\n\n")}
`;
}
function llmsFull() {
  return llmsTxt() + "\n\n---\n\n" + posts.map((p) => `# ${p.title}\n\nBy ${cfg.name}, ${p.date}. Source: ${SITE}/blog/${p.slug}/\n\n${p.summary}\n\n${p.body.trim()}`).join("\n\n---\n\n") + "\n";
}
function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [[SITE + "/", today], [SITE + "/blog/", posts[0]?.date || today], ...posts.map((p) => [`${SITE}/blog/${p.slug}/`, p.date])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}
function robots() {
  const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "Googlebot", "CCBot", "meta-externalagent", "Amazonbot", "DuckAssistBot", "MistralAI-User"];
  return bots.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n") + `\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}
function rss() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(cfg.name)}: Insights on SAP for Utilities</title>
<link>${SITE}/blog/</link>
<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Articles on SAP IS-U, S/4HANA Utilities and meter-to-cash by ${esc(cfg.name)}.</description>
<language>en</language>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + "T08:00:00Z").toUTCString()}</pubDate><description>${esc(p.summary)}</description></item>`).join("\n")}
</channel>
</rss>
`;
}
function notFound() {
  return layout({ depth: 0, title: `Page not found | ${cfg.name}`, description: "Page not found.", canonical: SITE + "/404.html", jsonld: { "@context": "https://schema.org", ...person }, body: `<section class="sec page-head"><div class="wrap"><p class="label">404</p><h1 class="h1-page">This page does not exist.</h1><div class="rule"></div><p class="intro"><a href="./">Go to the homepage</a> or read the <a href="blog/">latest insights</a>.</p></div></section>` });
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
write("index.html", home());
write("blog/index.html", blogIndex());
for (const p of posts) write(`blog/${p.slug}/index.html`, postPage(p));
write("404.html", notFound());
write("llms.txt", llmsTxt());
write("llms-full.txt", llmsFull());
write("sitemap.xml", sitemap());
write("robots.txt", robots());
write("feed.xml", rss());
if (!PREVIEW) write("CNAME", new URL(SITE).host + "\n");
console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
