#!/usr/bin/env node
// Baut die statische Website aus src/ nach public/ und prüft das Ergebnis.
// Aufruf: node build.mjs   (keine Abhängigkeiten nötig, Node >= 18)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { icons } from './src/icons.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'public');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));

const warnings = [];
const errors = [];

// ---------------------------------------------------------------------------
// Abgeleitete Werte aus der Konfiguration
// ---------------------------------------------------------------------------

const todo = (label) => `<mark class="todo">${label}</mark>`;

function phoneHref(phone) {
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  else if (digits.startsWith('0')) digits = '+41' + digits.slice(1);
  return 'tel:' + digits;
}

for (const key of ['phone', 'email', 'formEndpoint', 'uid', 'hourlyRate', 'firstConsultation', 'openingHours']) {
  if (!cfg[key]) warnings.push(`site.config.json: "${key}" ist noch leer.`);
}

const hasPhone = Boolean(cfg.phone);
const hasEmail = Boolean(cfg.email);

const vars = {
  ...cfg,
  year: String(new Date().getFullYear()),
  address: `${cfg.street}, ${cfg.zip} ${cfg.city}`,
  phoneDisplay: hasPhone ? cfg.phone : todo('Telefonnummer ergänzen'),
  // Ohne Telefonnummer führen alle Anruf-Buttons auf die Kontaktseite.
  phoneHref: hasPhone ? phoneHref(cfg.phone) : '/kontakt/',
  phoneCta: hasPhone ? `Anrufen: ${cfg.phone}` : 'Kontakt aufnehmen',
  callLabel: hasPhone ? 'Anrufen' : 'Kontakt',
  emailDisplay: hasEmail ? cfg.email : todo('E-Mail-Adresse ergänzen'),
  emailHref: hasEmail ? `mailto:${cfg.email}` : '/kontakt/#anfrage',
  uidDisplay: cfg.uid || todo('UID-Nummer ergänzen (CHE-…)'),
  hourlyRateDisplay: cfg.hourlyRate || todo('Stundenansatz ergänzen'),
  firstConsultationDisplay: cfg.firstConsultation || todo('Dauer und Kosten des Erstgesprächs ergänzen'),
  openingHoursDisplay: cfg.openingHours || todo('Bürozeiten ergänzen'),
  // Ohne Formular-Endpunkt: Versand per E-Mail-Programm (mailto) bzw. Hinweis auf Telefon.
  formAction: cfg.formEndpoint || (hasEmail ? `mailto:${cfg.email}` : '/kontakt/'),
  mapsHref:
    'https://www.openstreetmap.org/search?query=' +
    encodeURIComponent(`${cfg.street}, ${cfg.zip} ${cfg.city}`),
};

// ---------------------------------------------------------------------------
// Assets mit Cache-Busting-Hash
// ---------------------------------------------------------------------------

function assetHash(rel) {
  const buf = readFileSync(join(out, rel));
  return createHash('sha1').update(buf).digest('hex').slice(0, 8);
}
const cssHref = `/assets/css/style.css?v=${assetHash('assets/css/style.css')}`;
const jsHref = `/assets/js/main.js?v=${assetHash('assets/js/main.js')}`;

// ---------------------------------------------------------------------------
// Vorlagen
// ---------------------------------------------------------------------------

const partials = {};
for (const f of readdirSync(join(root, 'src/partials'))) {
  partials[f.replace(/\.html$/, '')] = readFileSync(join(root, 'src/partials', f), 'utf8');
}

function render(tpl, depth = 0) {
  if (depth > 5) throw new Error('Zu tief verschachtelte Partials');
  return tpl.replace(/\{\{\s*([\w:-]+)\s*\}\}/g, (m, key) => {
    if (key.startsWith('icon:')) {
      const name = key.slice(5);
      if (!icons[name]) throw new Error(`Unbekanntes Icon: ${name}`);
      return `<svg class="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">${icons[name]}</svg>`;
    }
    if (key.startsWith('partial:')) {
      const name = key.slice(8);
      if (partials[name] === undefined) throw new Error(`Unbekanntes Partial: ${name}`);
      return render(partials[name], depth + 1);
    }
    if (key in vars) return vars[key];
    throw new Error(`Unbekannte Variable: ${key}`);
  });
}

function jsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': ['LegalService', 'Attorney'],
    '@id': `${cfg.siteUrl}/#kanzlei`,
    name: cfg.name,
    url: `${cfg.siteUrl}/`,
    logo: `${cfg.siteUrl}/assets/img/logo.svg`,
    image: `${cfg.siteUrl}/assets/img/og-image.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: cfg.street,
      postalCode: cfg.zip,
      addressLocality: cfg.city,
      addressRegion: cfg.region,
      addressCountry: cfg.country,
    },
    areaServed: [
      { '@type': 'City', name: 'Bülach' },
      { '@type': 'Place', name: 'Zürcher Unterland' },
      { '@type': 'AdministrativeArea', name: 'Kanton Zürich' },
    ],
    knowsAbout: [
      'Familienrecht',
      'Erbrecht',
      'Arbeitsrecht',
      'Mietrecht',
      'Schuldbetreibungs- und Konkursrecht',
      'Allgemeines Vertragsrecht',
    ],
    founder: {
      '@type': 'Person',
      name: cfg.owner,
      jobTitle: cfg.ownerTitle,
    },
    knowsLanguage: 'de-CH',
  };
  if (hasPhone) data.telephone = phoneHref(cfg.phone).slice(4);
  if (hasEmail) data.email = cfg.email;
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

const nav = [
  { key: 'dienstleistungen', href: '/dienstleistungen/', label: 'Dienstleistungen' },
  { key: 'konditionen', href: '/konditionen/', label: 'Konditionen' },
  { key: 'ueber-mich', href: '/ueber-mich/', label: 'Über mich' },
  { key: 'kontakt', href: '/kontakt/', label: 'Kontakt' },
];

function navHtml(active) {
  return nav
    .map(
      (n) =>
        `<li><a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a></li>`,
    )
    .join('\n          ');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function layout(meta, body) {
  const url = cfg.siteUrl + meta.path;
  const title = meta.path === '/' ? meta.title : `${meta.title} | ${cfg.name}`;
  const robots = meta.noindex ? '\n  <meta name="robots" content="noindex">' : '';
  return `<!doctype html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <script>document.documentElement.classList.add('js')</script>
  <meta name="description" content="${esc(meta.description)}">${robots}
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#1d4a5a">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_CH">
  <meta property="og:site_name" content="${esc(cfg.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${cfg.siteUrl}/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/source-serif-4-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${cssHref}">
  <script src="${jsHref}" defer></script>
  <script type="application/ld+json">
${jsonLd()}
  </script>
</head>
<body class="page-${meta.nav || 'default'}">
${render(partials.header.replace('{{NAV}}', navHtml(meta.nav)))}
<main id="inhalt" tabindex="-1">
${render(body)}
</main>
${render(partials.footer)}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Seiten bauen
// ---------------------------------------------------------------------------

const pages = [];
for (const f of readdirSync(join(root, 'src/pages')).sort()) {
  const src = readFileSync(join(root, 'src/pages', f), 'utf8');
  const m = src.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\n?/);
  if (!m) throw new Error(`${f}: Metadaten-Kommentar fehlt`);
  const meta = JSON.parse(m[1]);
  const html = layout(meta, src.slice(m[0].length));
  const file = meta.file || (meta.path === '/' ? 'index.html' : join(meta.path.slice(1), 'index.html'));
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(join(out, file), html);
  pages.push({ ...meta, file, html });
}

// Weiterleitungen für alte bzw. uneinheitliche Adressen der bisherigen Website
const redirects = {
  '/ueber-mich-anwaeltin/': '/ueber-mich/',
  '/ueber-mich-anwaltin/': '/ueber-mich/',
  '/datenschutzerklaerung/': '/datenschutz/',
  '/home/': '/',
};
for (const [from, to] of Object.entries(redirects)) {
  const file = join(out, from.slice(1), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `<!doctype html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <title>Weiterleitung</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${cfg.siteUrl}${to}">
  <meta http-equiv="refresh" content="0; url=${to}">
</head>
<body>
  <p>Diese Seite ist umgezogen: <a href="${to}">weiter zur neuen Adresse</a>.</p>
</body>
</html>
`,
  );
}
// Serverseitige 301-Weiterleitungen (Netlify / Cloudflare Pages / Apache)
writeFileSync(
  join(out, '_redirects'),
  Object.entries(redirects).map(([f, t]) => `${f}  ${t}  301`).join('\n') + '\n',
);
writeFileSync(
  join(out, '.htaccess'),
  `# Serverseitige Weiterleitungen und Caching (Apache)
ErrorDocument 404 /404.html
RedirectMatch 301 ^/ueber-mich-anwaeltin/?$ /ueber-mich/
RedirectMatch 301 ^/ueber-mich-anwaltin/?$ /ueber-mich/
RedirectMatch 301 ^/datenschutzerklaerung/?$ /datenschutz/
RedirectMatch 301 ^/home/?$ /

<IfModule mod_headers.c>
  <FilesMatch "\\.(woff2|svg|png|jpg|jpeg|webp|avif)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(css|js)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`,
);

// Sitemap und robots.txt
const indexable = pages.filter((p) => !p.noindex);
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${cfg.siteUrl}${p.path}</loc></url>`).join('\n')}
</urlset>
`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);

// ---------------------------------------------------------------------------
// Qualitätsprüfungen
// ---------------------------------------------------------------------------

const idsByFile = new Map(
  pages.map((p) => [p.file, new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]),
);

function resolveTarget(href) {
  const [path, hash] = href.split('#');
  let file;
  if (path === '' || path === undefined) file = null;
  else if (path.endsWith('/')) file = join(path.slice(1), 'index.html');
  else file = path.slice(1);
  return { file, hash };
}

for (const p of pages) {
  const h1 = (p.html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${p.file}: ${h1} H1-Überschriften (erwartet: genau 1)`);

  for (const m of p.html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = m[1];
    const text = m[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
    if (!text && !/aria-label="[^"]+"/.test(attrs)) {
      errors.push(`${p.file}: Link ohne Text/aria-label: <a ${attrs}>`);
    }
    const href = (attrs.match(/href="([^"]*)"/) || [])[1];
    if (href === undefined || href === '' || href === '#') {
      errors.push(`${p.file}: Link ohne Ziel: <a ${attrs}>`);
      continue;
    }
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const { file, hash } = resolveTarget(href.startsWith('#') ? p.path + href : href);
    const target = file ?? p.file;
    if (!existsSync(join(out, target))) {
      errors.push(`${p.file}: Link auf nicht vorhandene Seite: ${href}`);
    } else if (hash && idsByFile.has(target) && !idsByFile.get(target).has(hash)) {
      errors.push(`${p.file}: Anker #${hash} existiert nicht in ${target}`);
    }
  }

  for (const m of p.html.matchAll(/<(?:link|script)\s[^>]*(?:href|src)="(\/[^"?#]+)/g)) {
    if (!existsSync(join(out, m[1]))) errors.push(`${p.file}: Datei fehlt: ${m[1]}`);
  }

  for (const m of p.html.matchAll(/<img\s[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) errors.push(`${p.file}: Bild ohne alt-Attribut: ${m[0]}`);
  }
  if (/jg-webdesign/.test(p.html)) errors.push(`${p.file}: Verweis auf alte Staging-Domain`);

  const todos = (p.html.match(/class="todo"/g) || []).length;
  if (todos) warnings.push(`${p.file}: ${todos} Platzhalter (gelb markiert) noch auszufüllen`);
}

console.log(`✓ ${pages.length} Seiten und ${Object.keys(redirects).length} Weiterleitungen gebaut.`);
if (warnings.length) {
  console.log(`\nOffene Punkte (${warnings.length}):`);
  for (const w of warnings) console.log('  • ' + w);
}
if (errors.length) {
  console.error(`\nFehler (${errors.length}):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\n✓ Prüfungen bestanden (je eine H1, keine toten Links/Anker, keine leeren Links, Alt-Texte).');
