/*
 * GyaanPe: builds static chapter pages for Google Search.
 *
 * Reads chapter names, notes (CH_LEARN_NCERT) and questions from data-ncert.js
 * and writes plain HTML pages under /cbse/. It only READS the curriculum data;
 * nothing in data-ncert.js or the app is changed.
 *
 * Run from the repo root:   node tools/seo/build.js
 * To add more classes/subjects, add an entry to SUBJECTS below and run again.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://gyaanpe.com';
const PKG = 'com.gyaanpe.kidslearning';
const QUESTIONS_ON_PAGE = 5;

/* key = section id used inside the app */
const S = (key, cls, subject, slug, book, lang) => ({ key, cls, subject, slug, book, lang: lang || 'en' });
const SUBJECTS = [
  S('maths', 1, 'Maths', 'maths', 'Joyful Mathematics'),
  S('english', 1, 'English', 'english', 'Mridang'),
  S('hindi', 1, 'Hindi', 'hindi', 'Sarangi', 'hi'),
  S('c2maths', 2, 'Maths', 'maths', 'Joyful Mathematics'),
  S('c2eng', 2, 'English', 'english', 'Mridang'),
  S('c2hin', 2, 'Hindi', 'hindi', 'Sarangi', 'hi'),
  S('c3maths', 3, 'Maths', 'maths', 'Maths Mela'),
  S('c3evs', 3, 'EVS', 'evs', 'Our Wondrous World'),
  S('c3eng', 3, 'English', 'english', 'Santoor'),
  S('c3hin', 3, 'Hindi', 'hindi', 'Veena', 'hi'),
  S('c4maths', 4, 'Maths', 'maths', 'Maths Mela'),
  S('c4evs', 4, 'EVS', 'evs', 'Our Wondrous World'),
  S('c4eng', 4, 'English', 'english', 'Santoor'),
  S('c4hin', 4, 'Hindi', 'hindi', 'Veena', 'hi'),
  S('c5maths', 5, 'Maths', 'maths', 'Maths Mela'),
  S('c5evs', 5, 'EVS', 'evs', 'Our Wondrous World'),
  S('c5eng', 5, 'English', 'english', 'Santoor'),
  S('c5hin', 5, 'Hindi', 'hindi', 'Veena', 'hi'),
  S('c6maths', 6, 'Maths', 'maths', 'Ganita Prakash'),
  S('c6evs', 6, 'Science', 'science', 'Curiosity'),
  S('c6sst', 6, 'Social Science', 'social-science', 'Exploring Society: India and Beyond'),
  S('c6eng', 6, 'English', 'english', 'Poorvi'),
  S('c6hin', 6, 'Hindi', 'hindi', 'Malhar', 'hi'),
  S('c6san', 6, 'Sanskrit', 'sanskrit', 'Deepakam', 'hi'),
  S('c7maths', 7, 'Maths', 'maths', 'Ganita Prakash'),
  S('c7evs', 7, 'Science', 'science', 'Curiosity'),
  S('c7sst', 7, 'Social Science', 'social-science', 'Exploring Society: India and Beyond'),
  S('c7eng', 7, 'English', 'english', 'Poorvi'),
  S('c7hin', 7, 'Hindi', 'hindi', 'Malhar', 'hi'),
  S('c7san', 7, 'Sanskrit', 'sanskrit', 'Deepakam', 'hi'),
  S('c8maths', 8, 'Maths', 'maths', 'Ganita Prakash'),
  S('c8evs', 8, 'Science', 'science', 'Curiosity'),
  S('c8sst', 8, 'Social Science', 'social-science', 'Exploring Society: India and Beyond'),
  S('c8eng', 8, 'English', 'english', 'Poorvi'),
  S('c8hin', 8, 'Hindi', 'hindi', 'Malhar', 'hi'),
  S('c8san', 8, 'Sanskrit', 'sanskrit', 'Deepakam', 'hi'),
  S('c9maths', 9, 'Maths', 'maths', 'Ganita Manjari'),
  S('c9evs', 9, 'Science', 'science', 'Exploration'),
  S('c9sst', 9, 'Social Science', 'social-science', 'Understanding Society: India and Beyond'),
  S('c9eng', 9, 'English', 'english', 'Kaveri'),
  S('c9hin', 9, 'Hindi', 'hindi', 'Ganga', 'hi'),
  S('c9san', 9, 'Sanskrit', 'sanskrit', 'Sharada', 'hi'),
  S('c10maths', 10, 'Maths', 'maths', 'Mathematics'),
  S('c10evs', 10, 'Science', 'science', 'Science'),
  S('c10sst', 10, 'Social Science', 'social-science', 'Social Science'),
  S('c10eng', 10, 'English', 'english', 'First Flight & Footprints Without Feet'),
  S('c10hin', 10, 'Hindi', 'hindi', 'Kshitij & Kritika', 'hi'),
  S('c10san', 10, 'Sanskrit', 'sanskrit', 'Shemushi', 'hi'),
];

/* ---------- load app data (read only) ---------- */
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data-ncert.js'), 'utf8'), ctx);
const CHAPTERS = ctx.NCERT_CHAPTERS;
const LEARN = ctx.CH_LEARN_NCERT;

/* ---------- helpers ---------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clip = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};
const playLink = (content) => `https://play.google.com/store/apps/details?id=${PKG}` +
  `&referrer=${encodeURIComponent(`utm_source=seo&utm_medium=web&utm_content=${content}`)}`;
const write = (rel, html) => {
  const file = path.join(ROOT, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};
const classPath = (c) => `/cbse/class-${c}/`;
const subjectPath = (s) => `${classPath(s.cls)}${s.slug}/`;
const chapterSlug = (i, title) => { const t = slugify(title); return t ? `chapter-${i + 1}-${t}` : `chapter-${i + 1}`; };
const chapterPath = (s, i) => `${subjectPath(s)}${chapterSlug(i, CHAPTERS[s.key][i])}/`;

const CSS = `
:root{--navy:#1A237E;--orange:#FF6F00;--bg:#FFF9F0;--card:#fff;--ink:#22223a;--muted:#5d6075;--line:#ece6dc;--green:#2E7D32;--soft:#FFF3E0}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:'Nunito',system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;font-size:17px}
a{color:var(--navy)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
header.top{background:#fff;border-bottom:4px solid var(--orange)}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px;padding-bottom:10px}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none}
.brand img{width:36px;height:36px;border-radius:10px}
.brand b{font-family:'Anton',sans-serif;font-weight:400;font-size:24px;letter-spacing:.5px;color:var(--navy)}
.brand b span{color:var(--orange)}
.top-cta{background:var(--orange);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:8px 14px;border-radius:999px;white-space:nowrap}
nav.crumbs{font-size:14px;color:var(--muted);padding:14px 0 0}
nav.crumbs a{color:var(--muted)}
h1{font-family:'Anton',sans-serif;font-weight:400;color:var(--navy);font-size:30px;line-height:1.2;margin:10px 0 6px;letter-spacing:.3px}
.sub{color:var(--muted);margin:0 0 18px;font-weight:600}
h2{color:var(--navy);font-size:22px;margin:28px 0 12px;font-weight:800}
.card{background:var(--card);border-radius:18px;padding:16px 18px;box-shadow:0 4px 18px rgba(26,35,126,.07);margin:0 0 14px}
.summary{border-left:6px solid var(--orange)}
.concept h3{margin:0 0 6px;font-size:18px;color:var(--navy)}
.concept .ic{font-size:22px;margin-right:6px}
.concept p{margin:6px 0}
.label{font-weight:800;color:var(--orange)}
.dyk{background:var(--soft);border-radius:12px;padding:8px 12px;font-size:15px;margin-top:8px}
table{width:100%;border-collapse:collapse;font-size:16px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--navy)}
ul.facts{margin:0;padding-left:20px}
ul.facts li{margin:4px 0}
.q{margin:0 0 6px;font-weight:800}
ol.opts{margin:6px 0 8px;padding-left:22px;list-style:upper-alpha}
ol.opts li{margin:2px 0}
details{background:#F1F8E9;border-radius:12px;padding:8px 12px}
summary{cursor:pointer;font-weight:800;color:var(--green)}
.cta{background:var(--navy);color:#fff;border-radius:22px;padding:22px 20px;text-align:center;margin:28px 0}
.cta h2{color:#fff;margin:0 0 6px}
.cta p{margin:0 0 16px;opacity:.92}
.btn{display:inline-block;background:var(--orange);color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;border-radius:999px;font-size:17px;margin:4px}
.btn.ghost{background:transparent;border:2px solid rgba(255,255,255,.7)}
.pn{display:flex;gap:10px;justify-content:space-between;margin:18px 0}
.pn a{flex:1;background:#fff;border-radius:14px;padding:12px 14px;text-decoration:none;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.05);font-size:15px}
.pn a.next{text-align:right}
.pn small{display:block;color:var(--muted);font-weight:600}
ol.chlist{list-style:none;padding:0;margin:0}
ol.chlist li a{display:block;background:#fff;border-radius:16px;padding:14px 16px;margin:0 0 10px;text-decoration:none;box-shadow:0 2px 12px rgba(26,35,126,.06)}
ol.chlist b{color:var(--navy);font-size:18px}
ol.chlist span{display:block;color:var(--muted);font-size:15px;margin-top:2px}
.subjects{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.subjects a{background:#fff;border-radius:18px;padding:18px;text-decoration:none;box-shadow:0 2px 12px rgba(26,35,126,.06);border-top:5px solid var(--orange)}
.subjects b{font-size:20px;color:var(--navy);display:block}
.subjects span{color:var(--muted)}
footer{color:var(--muted);font-size:14px;padding:24px 0 40px;border-top:1px solid var(--line);margin-top:30px}
footer a{color:var(--muted)}
@media (max-width:480px){h1{font-size:26px}.top-cta{font-size:13px;padding:7px 12px}}
`;

function page({ title, description, canonical, crumbs, body, ctaContent, lang }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + c.href })),
  };
  return `<!doctype html>
<html lang="${lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}/GyaanPe_Logo_Final.png">
<meta name="theme-color" content="#1A237E">
<link rel="icon" href="/GyaanPe_Logo_Final.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/"><img src="/GyaanPe_Logo_Final.png" alt="GyaanPe logo" width="36" height="36"><b>Gyaan<span>Pe</span></b></a>
  <a class="top-cta" href="${playLink(ctaContent + '_top')}" rel="nofollow">Get the free app</a>
</div></header>
<main class="wrap">
<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.href}">${esc(c.name)}</a>`).join(' › ')}</nav>
${body}
</main>
<footer><div class="wrap">
  GyaanPe is a CBSE learning app for Nursery to Class 10, made in Bhubaneswar. Notes and questions on this page are written by the GyaanPe team to help students practise the NCERT syllabus.<br>
  <a href="/cbse/">All CBSE classes</a> · <a href="/">Open GyaanPe</a> · <a href="/contact.html">Contact</a> · <a href="/privacy.html">Privacy</a>
</div></footer>
</body>
</html>
`;
}

function ctaBlock(content, heading, text) {
  return `<section class="cta">
  <h2>${esc(heading)}</h2>
  <p>${esc(text)}</p>
  <a class="btn" href="${playLink(content)}" rel="nofollow">Practise free on GyaanPe</a>
  <a class="btn ghost" href="/">Use in browser</a>
</section>`;
}

const written = [];

/* ---------- chapter pages ---------- */
for (const s of SUBJECTS) {
  const names = CHAPTERS[s.key];
  const qs = ctx[s.key + 'Q'];
  names.forEach((name, i) => {
    const L = LEARN[`${s.key}_${i}`] || {};
    const content = `${s.key}_${i}`;
    const qList = (qs[i] || []).slice(0, QUESTIONS_ON_PAGE);
    const total = (qs[i] || []).length;
    const h1 = `Class ${s.cls} ${s.subject} Chapter ${i + 1}: ${name}`;
    const title = `Class ${s.cls} ${s.subject} Chapter ${i + 1} ${name}: Notes & Questions | GyaanPe`;
    const description = clip(`NCERT ${s.book} Class ${s.cls} Chapter ${i + 1} "${name}" explained simply: ${L.summary || ''}`, 158);
    const crumbs = [
      { name: 'CBSE', href: '/cbse/' },
      { name: `Class ${s.cls}`, href: classPath(s.cls) },
      { name: s.subject, href: subjectPath(s) },
      { name: `Chapter ${i + 1}`, href: chapterPath(s, i) },
    ];

    const concepts = (L.learn || []).map((c) => `<div class="card concept">
  <h3><span class="ic" aria-hidden="true">${esc(c.icon)}</span>${esc(c.title)}</h3>
  <p>${esc(c.text)}</p>
  ${c.example ? `<p><span class="label">Example:</span> ${esc(c.example)}</p>` : ''}
  ${c.real ? `<p><span class="label">In real life:</span> ${esc(c.real)}</p>` : ''}
  ${c.dyk ? `<div class="dyk">💡 <b>Did you know?</b> ${esc(c.dyk)}</div>` : ''}
</div>`).join('\n');

    const rev = L.revision || {};
    const terms = (rev.terms || []).length ? `<h2>Key terms</h2>
<div class="card"><table><thead><tr><th>Term</th><th>Meaning</th></tr></thead><tbody>
${rev.terms.map((t) => `<tr><td><b>${esc(t[0])}</b></td><td>${esc(t[1])}</td></tr>`).join('\n')}
</tbody></table></div>` : '';
    const facts = (rev.facts || []).length ? `<h2>Quick revision</h2>
<div class="card"><ul class="facts">${rev.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';

    const questions = qList.length ? `<h2>Practice questions</h2>
${qList.map((q, n) => `<div class="card">
  <p class="q">Q${n + 1}. ${esc(q.q)}</p>
  <ol class="opts">${q.o.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
  <details><summary>Show answer</summary>${String.fromCharCode(65 + q.a)}) ${esc(q.o[q.a])}</details>
</div>`).join('\n')}` : '';

    const prev = i > 0 ? `<a class="prev" href="${chapterPath(s, i - 1)}"><small>← Chapter ${i}</small>${esc(names[i - 1])}</a>` : '<span></span>';
    const next = i < names.length - 1 ? `<a class="next" href="${chapterPath(s, i + 1)}"><small>Chapter ${i + 2} →</small>${esc(names[i + 1])}</a>` : '<span></span>';

    const body = `<h1>${esc(h1)}</h1>
<p class="sub">NCERT ${esc(s.book)} · Simple notes, key terms and practice questions</p>
${L.summary ? `<div class="card summary"><p style="margin:0">${esc(L.summary)}</p></div>` : ''}
${concepts ? `<h2>Key concepts</h2>\n${concepts}` : ''}
${terms}
${facts}
${questions}
${ctaBlock(content, `Practise all ${total || 10} questions + chapter test`, `GyaanPe gives Class ${s.cls} students short lessons, quizzes and a chapter test for “${name}”. Free to start, no ads.`)}
<div class="pn">${prev}${next}</div>
<p><a href="${subjectPath(s)}">All Class ${s.cls} ${esc(s.subject)} chapters</a></p>`;

    write(chapterPath(s, i), page({ title, description, canonical: chapterPath(s, i), crumbs, body, ctaContent: content, lang: s.lang }));
    written.push(chapterPath(s, i));
  });

  /* ---------- subject page ---------- */
  const crumbs = [
    { name: 'CBSE', href: '/cbse/' },
    { name: `Class ${s.cls}`, href: classPath(s.cls) },
    { name: s.subject, href: subjectPath(s) },
  ];
  const list = names.map((n, i) => {
    const L = LEARN[`${s.key}_${i}`] || {};
    return `<li><a href="${chapterPath(s, i)}"><b>Chapter ${i + 1}: ${esc(n)}</b><span>${esc(clip(L.summary || '', 120))}</span></a></li>`;
  }).join('\n');
  const body = `<h1>Class ${s.cls} ${esc(s.subject)}: NCERT ${esc(s.book)} chapter notes & questions</h1>
<p class="sub">All ${names.length} chapters of the new NCERT ${esc(s.book)} book, explained simply with practice questions.</p>
<ol class="chlist">${list}</ol>
${ctaBlock(`${s.key}_list`, `Practise Class ${s.cls} ${s.subject} every day`, 'Short lessons, quizzes and chapter tests in about 15 minutes a day. Free to start, no ads.')}`;
  write(subjectPath(s), page({
    title: `Class ${s.cls} ${s.subject} NCERT ${s.book}: All Chapters, Notes & Questions | GyaanPe`,
    description: clip(`Class ${s.cls} ${s.subject} (NCERT ${s.book}) chapter-wise notes, key terms and practice questions: ${names.slice(0, 4).join(', ')} and more.`, 158),
    canonical: subjectPath(s), crumbs, body, ctaContent: `${s.key}_list`,
  }));
  written.push(subjectPath(s));
}

/* ---------- class pages + CBSE hub ---------- */
const classes = [...new Set(SUBJECTS.map((s) => s.cls))].sort((a, b) => a - b);
for (const c of classes) {
  const subs = SUBJECTS.filter((s) => s.cls === c);
  const crumbs = [{ name: 'CBSE', href: '/cbse/' }, { name: `Class ${c}`, href: classPath(c) }];
  const body = `<h1>CBSE Class ${c}: notes & practice questions</h1>
<p class="sub">Chapter-wise help for the new NCERT books.</p>
<div class="subjects">${subs.map((s) => `<a href="${subjectPath(s)}"><b>${esc(s.subject)}</b><span>NCERT ${esc(s.book)} · ${CHAPTERS[s.key].length} chapters</span></a>`).join('')}</div>
${ctaBlock(`c${c}_class`, `Class ${c} practice, every day`, 'Lessons, quizzes and chapter tests for every subject. Free to start, no ads.')}`;
  write(classPath(c), page({
    title: `CBSE Class ${c} Notes & Practice Questions (New NCERT) | GyaanPe`,
    description: `CBSE Class ${c} chapter-wise notes and practice questions for ${subs.map((s) => `${s.subject} (${s.book})`).join(' and ')}.`,
    canonical: classPath(c), crumbs, body, ctaContent: `c${c}_class`,
  }));
  written.push(classPath(c));
}
{
  const crumbs = [{ name: 'CBSE', href: '/cbse/' }];
  const body = `<h1>CBSE notes & practice questions</h1>
<p class="sub">Simple chapter notes and practice questions for the new NCERT books, by GyaanPe.</p>
<div class="subjects">${classes.map((c) => `<a href="${classPath(c)}"><b>Class ${c}</b><span>${SUBJECTS.filter((s) => s.cls === c).map((s) => s.subject).join(' · ')}</span></a>`).join('')}</div>
${ctaBlock('cbse_hub', 'Nursery to Class 10 in one app', 'Lessons, quizzes, stories and chapter tests for CBSE students. Free to start, no ads.')}`;
  write('/cbse/', page({
    title: 'CBSE Notes & Practice Questions for New NCERT Books | GyaanPe',
    description: 'Chapter-wise notes, key terms and practice questions for CBSE students on the new NCERT books, by GyaanPe.',
    canonical: '/cbse/', crumbs, body, ctaContent: 'cbse_hub',
  }));
  written.push('/cbse/');
}

/* ---------- sitemap ---------- */
const sm = path.join(ROOT, 'sitemap.xml');
let xml = fs.readFileSync(sm, 'utf8').replace(/\s*<!-- seo:start -->[\s\S]*<!-- seo:end -->/, '');
const block = '\n  <!-- seo:start -->\n' + written.sort().map((p) =>
  `  <url><loc>${SITE}${p}</loc><changefreq>monthly</changefreq><priority>${p.split('/').length > 5 ? '0.7' : '0.8'}</priority></url>`).join('\n') + '\n  <!-- seo:end -->';
xml = xml.replace('</urlset>', block + '\n</urlset>');
fs.writeFileSync(sm, xml);

console.log(`Wrote ${written.length} pages + sitemap.`);
