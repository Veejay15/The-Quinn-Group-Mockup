// Builds The Quinn Group WordPress assets from the approved mockup (../index.html).
//   dist/hello-quinn/                  child theme: theme/hello-quinn + generated assets/quinn.css + fonts
//   dist/img/ + dist/media-manifest.json   images to import, with SEO filenames and the mockup's alt text
//   dist/elementor/{home,sell,about,neighborhoods,contact,header,footer}.json   Elementor data (built only once media.json exists)
// media.json (name -> {id,url}) is written by `wp eval-file install.php media` on the server.
// Usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mock = path.join(here, '..');
const dist = path.join(here, 'dist');
const html = fs.readFileSync(path.join(mock, 'index.html'), 'utf8');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'elementor'), { recursive: true });

// ---------------------------------------------------------------- child theme + CSS
const themeOut = path.join(dist, 'hello-quinn');
fs.cpSync(path.join(here, 'theme', 'hello-quinn'), themeOut, { recursive: true });
fs.cpSync(path.join(mock, 'fonts'), path.join(themeOut, 'assets', 'fonts'), { recursive: true });

function parseCss(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    if (head.startsWith('@')) {
      let depth = 1, j = open + 1;
      while (depth && j < css.length) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      out.push({ at: head, rules: parseCss(css.slice(open + 1, j - 1)) }); i = j;
    } else {
      const close = css.indexOf('}', open);
      out.push({ sel: head, body: css.slice(open + 1, close).trim() }); i = close + 1;
    }
  }
  return out;
}

// Scope every rule to body.qg. Rules for the HTML .btn also get a twin for Elementor's Button widget
// (wrapper .qg-btn + variant classes, inner a.elementor-button).
function scopeSel(sel) {
  let s = sel.trim()
    .replace(/\bblockquote\b/g, '.bq')
    .replace('.intro .grid > div:last-child', '.intro .copy-col');
  if (s === ':root' || s === 'html') return [s];
  if (s === '*') return [':where(.qg) *'];
  if (s === 'body') return ['body.qg'];
  if (s.startsWith('.js ')) return ['.js .qg ' + s.slice(4)];
  const out = ['.qg ' + s];
  if (/\.btn(?![\w-])/.test(s)) {
    const t = s.replace('.btn:not(.line-light)', '.qg-btn:not(.line-light) .elementor-button')
      .replace(/\.btn((?:\.[\w-]+)*)(?![\w-])/g, '.qg-btn$1 .elementor-button');
    out.push('.qg ' + t);
  }
  return out;
}
function renderCss(rules, ind = '') {
  return rules.map(r => r.at
    ? `${r.at}{\n${renderCss(r.rules, '  ')}}\n`
    : `${ind}${r.sel.split(',').flatMap(scopeSel).join(',')}{${r.body}}\n`).join('');
}

const elementorCss = `
/* ---------- Elementor integration ----------
   Containers and widgets carry the mockup's class names. These rules switch off Elementor's own
   spacing and let the mockup typography reach the elements Elementor renders. */
.qg{--kit-widget-spacing:0px;--widgets-spacing:0px;--widgets-spacing-row:0px;--widgets-spacing-column:0px}
.qg .e-con{--padding-top:0px;--padding-right:0px;--padding-bottom:0px;--padding-left:0px;--gap:0px;--row-gap:0px;--column-gap:0px;--margin-top:0px;--margin-right:0px;--margin-bottom:0px;--margin-left:0px}
.qg .elementor-widget:not(:last-child){margin-block-end:0}
.qg div.elementor-heading-title,.qg p.elementor-heading-title,.qg span.elementor-heading-title{line-height:inherit}
.qg [id]{scroll-margin-top:100px}
.qg [hidden]{display:none !important}
.qg .hero,.qg .town,.qg .ls,.qg .head-row,.qg .foot,.qg .cta-row,.qg .cta-band .row{flex-direction:row}
.qg .head-row > *,.qg .foot > *,.qg .cta-row > *,.qg .cta-band .row > *{width:auto;flex:0 1 auto}
.qg .head-row > .e-con{flex:1 1 360px}
.qg .hero .wrap{width:min(var(--wrap),100% - 48px)}
.qg .hero .bg > .elementor-widget,.qg .frame .photo > .elementor-widget{height:100%}
.qg .town > .elementor-widget-image,.qg .ls > .elementor-widget-image{position:absolute;inset:0;z-index:0}
.qg .frame .card{width:auto}
.qg .rev-note{margin-top:24px}
.qg .map-live iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.qg .map-links{margin-top:14px}
.qg .elementor-widget-text-editor p + p{margin-top:18px}
/* inner pages: the Sell page opens with the seller section, so its heading is the H1; current page in the menu */
.qg .sell h1{font-size:clamp(34px,4.4vw,56px);line-height:1.1;margin-top:16px}
.qg .nav .links a[aria-current]{color:var(--gold-deep)}
.qg .nav .links a[aria-current]::after{width:100%}
.qg .mpanel nav a[aria-current]{color:var(--gold-deep)}
/* UAE header: the top bar scrolls away, the nav stays pinned. */
.qg #masthead{position:sticky;top:-40px;z-index:50}
.qg.admin-bar #masthead{top:-8px}
.qg .nav{position:relative;top:auto}
@media (max-width:620px){
  .qg .cta-band .row > .elementor-widget,.qg .standard .cta-row > .elementor-widget{width:100%}
}
`;
// Market guides (blog) and plain pages: theme templates in template-parts/single.php and archive.php.
const articleCss = `
/* ---------- articles + blog index ---------- */
body.qg main.site-main{padding:0;max-width:none;margin:0;width:auto}
.qg .article-head{padding:clamp(56px,7vw,96px) 0 clamp(72px,8vw,112px)}
.qg .article-head .eyebrow a:hover{color:var(--ivory)}
.qg .article-head h1{font-size:clamp(34px,4.4vw,56px);line-height:1.1;margin-top:18px;max-width:920px;color:var(--ivory)}
.qg .article-head .meta{margin-top:20px;font-size:14px;color:#9AA6BA}
.qg .article-head .sub{color:#C3CAD6}
.qg .article-figure{margin-top:calc(-1 * clamp(40px,5vw,64px))}
.qg .article-figure img{width:100%;aspect-ratio:16/9;max-height:620px;object-fit:cover}
.qg .article-body{max-width:720px;margin:clamp(40px,5vw,64px) auto 0;font-size:18px;line-height:1.8;color:#2A3342}
.qg .article-body > * + *{margin-top:22px}
.qg .article-body h2{font-size:clamp(28px,3vw,36px);line-height:1.15;margin-top:52px;color:var(--navy)}
.qg .article-body h3{font-size:24px;line-height:1.2;margin-top:38px;color:var(--navy)}
.qg .article-body h4{font-family:var(--sans);font-size:15px;letter-spacing:.14em;text-transform:uppercase;margin-top:32px;color:var(--ink)}
.qg .article-body a{color:var(--gold-deep);text-decoration:underline;text-underline-offset:3px}
.qg .article-body a:hover{color:var(--navy)}
.qg .article-body strong{color:var(--ink)}
.qg .article-body ul,.qg .article-body ol{padding-left:1.3em}
.qg .article-body li + li{margin-top:8px}
.qg .article-body li::marker{color:var(--gold-deep)}
.qg .article-body blockquote{border-left:2px solid var(--gold);padding-left:24px;font-family:var(--serif);font-style:italic;font-weight:500;font-size:22px;line-height:1.5;color:var(--navy)}
.qg .article-body table{width:100%;border-collapse:collapse;font-size:15px;line-height:1.5}
.qg .article-body th,.qg .article-body td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.qg .article-body th{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--slate);background:var(--sand)}
.qg .article-body img{max-width:100%;height:auto;margin:0 auto}
.qg .author-box{max-width:720px;margin:64px auto clamp(72px,8vw,112px);display:grid;grid-template-columns:auto 1fr;gap:24px;padding:28px 30px;background:var(--sand);border-left:2px solid var(--gold)}
.qg .author-photos{display:flex}
.qg .author-photos img{width:64px;height:64px;border-radius:50%;object-fit:cover;object-position:50% 18%;border:3px solid var(--sand)}
.qg .author-photos img + img{margin-left:-16px}
.qg .author-box .k{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.qg .author-box .who{font-family:var(--serif);font-weight:500;font-size:22px;line-height:1.25;color:var(--navy);margin-top:6px;font-variation-settings:"opsz" 11}
.qg .author-box p{font-size:15px;color:var(--slate);margin-top:8px}
.qg .author-box .calls{display:flex;gap:8px 22px;flex-wrap:wrap;margin-top:12px}
.qg .author-box .calls a{font-weight:600;color:var(--gold-deep)}
.qg .qg-article .insights h2{margin-top:16px}
.qg .guide-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px 24px}
.qg .guide{display:flex;flex-direction:column;background:var(--sand);transition:transform .25s var(--ease)}
.qg .guide:hover{transform:translateY(-3px)}
.qg .guide .ph{aspect-ratio:16/10;overflow:hidden;background:var(--line)}
.qg .guide .ph img{width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease)}
.qg .guide:hover .ph img{transform:scale(1.04)}
.qg .guide .body{padding:24px 24px 26px;display:flex;flex-direction:column;flex:1}
.qg .guide .k{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.qg .guide h2{font-size:24px;line-height:1.22;margin-top:10px;font-variation-settings:"opsz" 11}
.qg .guide p{font-size:15px;line-height:1.65;color:var(--slate);margin-top:12px;flex:1}
.qg .guide .link{margin-top:18px}
.qg .pagination,.qg .navigation .nav-links{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:56px}
.qg .page-numbers{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0 14px;border:1px solid var(--line);font-weight:600;font-size:14px;color:var(--ink)}
.qg .page-numbers.current{background:var(--navy);border-color:var(--navy);color:var(--ivory)}
.qg a.page-numbers:hover{border-color:var(--gold)}
@media (max-width:980px){.qg .guide-grid{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.qg .guide-grid{grid-template-columns:1fr}.qg .author-box{grid-template-columns:1fr}.qg .article-body{font-size:17px}}
`;
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
fs.writeFileSync(path.join(themeOut, 'assets', 'quinn.css'),
  '/* Generated by wp-build/build.mjs from the approved mockup. Edit the mockup or build.mjs, not this file. */\n'
  + renderCss(parseCss(css)) + elementorCss + articleCss);

// ---------------------------------------------------------------- images
const SEO = {
  hero: 'hutchinson-island-aerial-sunset', team: 'anne-warner-sean-quinn-stuart-fl-realtors',
  sean: 'sean-quinn-realtor-stuart-fl', anne: 'anne-warner-realtor-stuart-fl',
  'logo-dark': 'anne-sean-realtors-logo', 'logo-light': 'anne-sean-realtors-logo-white', waterpointe: 'water-pointe-realty-group-logo',
  'nb-sewalls-point': 'sewalls-point-fl-waterfront-homes', 'nb-stuart': 'downtown-stuart-fl-aerial',
  'nb-jensen-beach': 'jensen-beach-fl-coastline', 'nb-hobe-sound': 'hobe-sound-fl-aerial', 'ls-bicopa': 'palm-city-fl-home',
  'lf-waterfront': 'hutchinson-island-waterfront-homes', 'lf-condos': 'hutchinson-island-condos',
  'lf-beach-condos': 'hutchinson-island-beach-condo-view', 'lf-pools': 'sewalls-point-home-with-pool',
  'lf-gated': 'port-st-lucie-gated-community', 'lf-new': 'sewalls-point-renovated-kitchen',
};
const manifest = [];
for (const m of html.matchAll(/src="img\/([\w-]+)\.(jpg|png)"[^>]*?alt="([^"]*)"/g)) {
  if (manifest.some(x => x.name === m[1])) continue;
  const file = `${SEO[m[1]] || m[1]}.${m[2]}`;
  manifest.push({ name: m[1], file, alt: m[3].replace(/&amp;/g, '&') });
  fs.mkdirSync(path.join(dist, 'img'), { recursive: true });
  fs.copyFileSync(path.join(mock, 'img', `${m[1]}.${m[2]}`), path.join(dist, 'img', file));
}
fs.writeFileSync(path.join(dist, 'media-manifest.json'), JSON.stringify(manifest, null, 1));
fs.copyFileSync(path.join(here, 'install.php'), path.join(dist, 'install.php'));
fs.copyFileSync(path.join(here, 'yoast.php'), path.join(dist, 'yoast.php'));
fs.mkdirSync(path.join(dist, 'migrate'), { recursive: true });
for (const f of ['import-blog.php', 'blog.json']) {
  if (fs.existsSync(path.join(here, 'migrate', f))) fs.copyFileSync(path.join(here, 'migrate', f), path.join(dist, 'migrate', f));
}

const mediaFile = path.join(here, 'media.json');
if (!fs.existsSync(mediaFile)) {
  console.log(`theme + ${manifest.length} images built; run the media import, then build again for Elementor data`);
  process.exit(0);
}
const media = JSON.parse(fs.readFileSync(mediaFile, 'utf8'));

// ---------------------------------------------------------------- mockup fragments for HTML widgets
function grab(marker, from = 0) {
  const start = html.indexOf(marker, from);
  if (start < 0) throw new Error('missing ' + marker);
  const tag = marker.match(/^<([a-z0-9]+)/)[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g'); re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === '/') { if (!--depth) return { text: html.slice(start, m.index + m[0].length), end: m.index }; }
    else depth++;
  }
  throw new Error('unclosed ' + marker);
}
const frag = marker => fixImgs(grab(marker).text);
function fixImgs(h) {
  return h.replace(/src="img\/([\w-]+)\.(?:jpg|png)"/g, (_, n) => {
    if (!media[n]) throw new Error('image not imported: ' + n);
    return `src="${media[n].url}"`;
  });
}
// Header/footer links: the mockup's homepage anchors now go to the inner pages (search stays on the homepage until IDX).
const PAGES = { sell: '/home-valuation/', neighborhoods: '/neighborhoods/', about: '/about/', insights: '/blog/', contact: '/contact-us/', search: '/#search' };
const siteLinks = h => h.replace(/href="#" class="logo"/g, 'href="/" class="logo"')
  .replace('<a href="#">Client stories</a>', '<a href="/about/#reviews">Client stories</a>')
  .replace('<a href="#insights">Seller\'s guide</a>', '<a href="/blog/sellers-strategy-guide/">Seller\'s guide</a>')
  .replace(/href="#([a-z]+)"/g, (m, id) => `href="${PAGES[id] || '/#' + id}"`);

const placesHtml = []; { let from = 0; for (let i = 0; i < 3; i++) { const g = grab('<div class="places">', from); placesHtml.push(g.text); from = g.end; } }
const faqHtml = html.slice(html.indexOf('<details open>'), html.lastIndexOf('</details>') + '</details>'.length);
const headerHtml = siteLinks(fixImgs(grab('<div class="topbar">').text + '\n' + grab('<header class="nav">').text));
const footerHtml = siteLinks(fixImgs(grab('<footer class="footer">').text + '\n' + grab('<div class="mbar">').text));

// Live Google Map of the Google Business Profile listing (replaces the mockup's stylized map). No API key needed.
const GBP_QUERY = encodeURIComponent('The Quinn Group & Anne Warner Realtor, 3727 SE Ocean Blvd, Suite 100, Stuart, FL 34996');
const liveMap = `<div class="map map-live"><iframe src="https://maps.google.com/maps?q=${GBP_QUERY}&amp;z=15&amp;output=embed" title="The Quinn Group &amp; Anne Warner Realtor on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
<p class="map-links"><a class="link" href="https://www.google.com/maps/dir/?api=1&amp;destination=${GBP_QUERY}" target="_blank" rel="noopener">Get directions →</a></p>`;

// ---------------------------------------------------------------- Elementor element helpers
let seq = 0;
const uid = () => 'q' + (seq++).toString(36).padStart(6, '0');
const link = url => ({ url, is_external: '', nofollow: '', custom_attributes: '' });
const C = (cls, children, extra = {}) => ({ id: uid(), elType: 'container', isInner: false, settings: { content_width: 'full', css_classes: cls, ...extra }, elements: children });
const S = (cls, id, children) => C(cls, children, id ? { html_tag: 'section', _element_id: id } : { html_tag: 'section' });
const A = (cls, url, children) => C(cls, children, { html_tag: 'a', link: link(url) });
const W = (type, settings) => ({ id: uid(), elType: 'widget', widgetType: type, settings, elements: [] });
const H = (tag, cls, title) => W('heading', { title, header_size: tag, _css_classes: cls });
const T = (cls, editor) => W('text-editor', { editor, _css_classes: cls });
const B = (cls, text, url) => W('button', { text, link: link(url), _css_classes: `qg-btn ${cls}`.trim() });
const I = (cls, name) => {
  if (!media[name]) throw new Error('image not imported: ' + name);
  return W('image', { image: { id: media[name].id, url: media[name].url, source: 'library' }, image_size: 'full', _css_classes: cls });
};
const X = (cls, code) => W('html', { html: code, _css_classes: cls });
const markInner = (els, depth = 0) => els.forEach(e => { if (e.elType === 'container') { e.isInner = depth > 0; markInner(e.elements, depth + 1); } });

const eyebrow = (t, cls = '') => H('div', `eyebrow ${cls}`.trim(), t);
const h2 = t => H('h2', '', t);
const sub = t => T('sub', `<p>${t}</p>`);

// ---------------------------------------------------------------- sections
// Each homepage section is a function, so the inner pages reuse the approved design. Options only change
// links (a link to a section on the same page stays an anchor; anywhere else it goes to the page that has it)
// and which items a section shows.
const blogFile = path.join(here, 'migrate', 'blog.json');
const blog = fs.existsSync(blogFile) ? Object.fromEntries(JSON.parse(fs.readFileSync(blogFile, 'utf8')).map(p => [p.slug, p])) : {};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const guideUrl = slug => {
  if (!blog[slug] || blog[slug].skip) throw new Error('market guide not imported: ' + slug);
  return `/blog/${slug}/`;
};
// [kicker, slug] -> card using the guide's own title and description
const guideCard = ([k, slug]) => [k, esc(blog[slug]?.h1 || ''), esc(blog[slug]?.description || ''), guideUrl(slug)];
const faqs = faqHtml.match(/<details[\s\S]*?<\/details>/g);
const faqList = idx => idx.map((i, n) => faqs[i].replace(/^<details( open)?>/, n ? '<details>' : '<details open>')).join('\n');

const sec = {
  // navy title band for inner pages (same look as the market guides header)
  pageHead: (k, title, text) => S('article-head navy on-dark', '', [C('wrap', [eyebrow(k), H('h1', '', title), sub(text)])]),

  hero: () => S('hero on-dark', 'search', [
    C('bg', [I('', 'hero')]),
    C('wrap', [
      C('copy', [
        eyebrow('Anne &amp; Sean · The Quinn Group'),
        H('h1', '', 'Florida real estate agents who treat you <em>like family</em>.'),
        sub("Martin County is home, St. Lucie and Palm Beach counties are our everyday market, and we've closed deals from Tallahassee to Miami to Naples. Concierge-level care from a U.S. Naval Academy graduate and a former educator. Search every Treasure Coast listing here, or start with what your home is worth."),
      ]),
      X('', frag('<div class="finder">')),
    ]),
  ]),

  intro: () => S('intro section', 'about', [
    C('wrap grid', [
      C('frame', [
        C('photo', [I('', 'team')]),
        C('card', [H('div', 'k', 'Second generation'), H('div', 'v', "Sean's family has a long history in Martin County real estate.")]),
      ]),
      C('copy-col', [
        eyebrow('Meet the team'),
        h2('Anne and Sean, <em>by name</em>.'),
        T('intro-text', [
          '<p>Sean grew up in Palm City and is a second-generation Martin County agent. He graduated from the U.S. Naval Academy, served seven years as a Surface Warfare Officer, and worked in management consulting before real estate.</p>',
          '<p>Anne is a former educator, and it shows: she explains every step clearly, so clients always know where things stand. She gives every client a concierge-level experience built around what they need. Her strengths are the parts of a sale that decide the outcome: market analysis, strategic pricing, negotiation, and careful contract management. For sellers she builds boutique marketing plans. For buyers she guides the search from the first showing to closing day.</p>',
          "<p>Her professional network runs deep, so clients always have a trusted local contact for inspections, insurance, lending and moving in. When Anne says like family, she means it. She and Sean are married as well as partners, and they look after every client's home the way they would look after their own.</p>",
        ].join('')),
        H('div', 'quote', 'Bringing professionalism back to real estate, one transaction at a time.'),
        X('', frag('<div class="agents">')),
      ]),
    ]),
  ]),

  // On the Sell page this is the first section, so its heading is the page's H1.
  sell: ({ h1 = false } = {}) => S('sell section navy on-dark', 'sell', [
    C('wrap grid', [
      C('', [
        eyebrow('For sellers'),
        H(h1 ? 'h1' : 'h2', '', "Before we talk price, let's look at <em>your street</em>."),
        sub("An online estimate is a starting point. A price you can sell at comes from what has actually sold near you, what's competing right now, and how your home shows. Here is how we get there with you."),
        C('steps', [
          ['01', 'Walk-through', 'We see the home in person and listen to your timing and plans.'],
          ['02', 'Pricing study', 'Recent sales, active competition and condition, with the reasoning shown.'],
          ['03', 'Prep &amp; marketing', 'A boutique marketing plan, from photography to the right buyers.'],
          ['04', 'Offer to closing', 'Negotiation, inspections, contracts and closing, handled in order.'],
        ].map(([n, t, p]) => C('step', [H('div', 'num', n), H('h3', '', t), H('p', '', p)]))),
      ]),
      X('', frag('<div class="vcard">')),
    ]),
  ]),

  listings: ({ search = '#search' } = {}) => S('listings section', '', [
    C('wrap', [
      C('head-row', [C('head-copy', [eyebrow('From our portfolio'), h2("Homes we've <em>listed and sold</em>.")]), B('ghost', 'Search all homes', search)]),
      X('', frag('<div class="cards">')),
      C('foot', [
        T('note', '<p>Shown from the team\'s current portfolio for layout. At launch these pull live from the MLS. Information deemed reliable but not guaranteed.</p>'),
        T('', `<p><a class="link" href="${search}">See every Treasure Coast listing →</a></p>`),
      ]),
    ]),
  ]),

  // head: false when the page title band already introduces the towns (Neighborhoods page)
  hoods: ({ head = true, town = PAGES.neighborhoods } = {}) => S('hoods section sand', 'neighborhoods', [
    C('wrap', [
      ...(head ? [C('head-row', [C('head-copy', [
        eyebrow('Neighborhoods'),
        h2('Know the coast, <em>town by town</em>.'),
        sub('The Treasure Coast runs from Indian River County down to Palm Beach County. Martin County is our home turf, where every town prices differently, and so do the streets inside it.'),
      ])])] : []),
      C('towns', [
        [true, 'nb-sewalls-point', 'Waterfront peninsula', "Sewall's Point", 'Homes between the St. Lucie and Indian rivers, many with deep-water docks.', "Sewall's Point homes for sale →"],
        [true, 'nb-stuart', 'Downtown &amp; riverfront', 'Stuart', 'The Riverwalk, downtown and the St. Lucie River, from condos to estates.', 'Stuart homes for sale →'],
        [false, 'nb-jensen-beach', 'Beach &amp; river', 'Jensen Beach', 'Mainland, waterfront and island markets in one ZIP code.', 'Jensen Beach homes →'],
        [false, 'ls-bicopa', 'West of the river', 'Palm City', 'Gated golf communities, and acreage out in Palm City Farms.', 'Palm City homes →'],
        [false, 'nb-hobe-sound', 'South Martin County', 'Hobe Sound', 'Quiet, green streets a short drive from the beach.', 'Hobe Sound homes →'],
      ].map(([wide, img, k, name, p, l]) => A(wide ? 'town wide' : 'town', town, [
        I('', img), C('t', [H('div', 'k', k), H('h3', '', name), H('p', '', p), H('span', 'link', l)]),
      ]))),
      C('counties', [
        ['Home base', 'Martin County', 'Where we live and do most of our business, from the river to the beach.'],
        ['To the north', 'St. Lucie County', 'Same team, same standard, a short drive up the coast from our Stuart office.'],
        ['To the south', 'Palm Beach County', 'The southern edge of the Treasure Coast, covered by the same two agents.'],
      ].map(([k, name, p], i) => C('county', [H('div', 'k', k), H('h3', '', name), H('p', '', p), X('', placesHtml[i])]))),
    ]),
  ]),

  statewide: ({ contact = '#contact' } = {}) => S('statewide section navy on-dark', 'florida', [
    C('wrap grid', [
      C('', [
        eyebrow('Your Florida insider'),
        h2('Rooted on the Treasure Coast, <em>trusted across Florida</em>.'),
        sub("Martin, St. Lucie and Palm Beach counties are home. But when clients need us, we go further, and we've closed deals across the state. Coming to Florida for real estate advice? Start here."),
        C('referral', [
          H('h3', '', "Buying or selling somewhere we don't cover?"),
          H('p', '', "We work with partner agents throughout Florida. Tell us where you're headed, and we'll connect you with someone we trust, and stay in touch until you're settled."),
          B('gold', 'Ask for a Florida referral', contact),
        ]),
      ]),
      C('reach', [
        ['Home base', 'Martin County', 'Plus St. Lucie and Palm Beach counties, every day'],
        ['North', 'Tallahassee', 'Deals closed as far north as the state capital'],
        ['South', 'Miami', 'Deals closed as far south as Miami'],
        ['West', 'Naples', 'Deals closed as far west as the Gulf Coast'],
        ['Everywhere else', 'Partner agents', 'Trusted referrals anywhere in Florida'],
      ].map(([k, v, s]) => C('r', [H('div', 'k', k), H('div', 'v', `${v}<span>${s}</span>`)]))),
    ]),
  ]),

  lifestyle: ({ search = '#search' } = {}) => S('lifestyle section', 'lifestyle', [
    C('wrap', [
      C('head-row', [C('head-copy', [
        eyebrow('Browse by lifestyle'),
        h2('Start with how you <em>want to live</em>.'),
        sub('On the water, by the beach or behind the gate. Pick the way of life first, then narrow it down by town.'),
      ]), B('ghost', 'Search all homes', search)]),
      C('ls-grid', [
        ['lf-waterfront', 'Docks &amp; deep water', 'Waterfront Homes', 'On the St. Lucie, the Indian River and the Intracoastal.'],
        ['lf-condos', 'Low maintenance', 'Condos', 'Lock-and-leave living, from downtown Stuart to the island.'],
        ['lf-beach-condos', 'Steps to the sand', 'Beach Condos', 'Ocean views and beach access along the barrier islands.'],
        ['lf-pools', 'Backyard living', 'Homes with Pools', 'Screened and open-air pools, made for Florida evenings.'],
        ['lf-gated', 'Gated &amp; golf', 'Gated Communities', 'Guarded entries, lakes, fairways and clubhouses.'],
        ['lf-new', 'Move-in ready', 'New Homes', 'New construction and fully renovated homes.'],
      ].map(([img, k, t, p]) => A('ls', '#', [I('', img), C('t', [H('div', 'k', k), H('h3', '', t), H('p', '', p)])]))),
    ]),
  ]),

  standard: ({ sell = '#sell', contact = '#contact' } = {}) => S('standard section navy on-dark', '', [
    C('wrap', [
      eyebrow('Why Anne &amp; Sean'),
      h2('Like family, <em>held to a standard</em>.'),
      sub('Two halves of the same promise: the care of people who treat you as their own, and the discipline of a team that does the details properly.'),
      C('stats', [
        ['$134M+', 'In closed sales since 2021'], ['239', 'Buyers &amp; sellers represented'],
        ['131', 'Homes sold for sellers'], ['$564K', 'Average sale price'],
      ].map(([v, l]) => C('stat', [H('div', 'v', v), H('div', 'l', l)]))),
      T('note stats-note', '<p>Closed transactions for Anne &amp; Sean, January 2021 to October 2026, from Water Pointe Realty Group sales records.</p>'),
      C('pillars', [
        ['01', 'Local, twice over', 'Sean grew up in Palm City and comes from a family with a long history in Martin County real estate. He knows the waterways, neighborhoods and schools first-hand.'],
        ['02', 'Annapolis standards', 'A U.S. Naval Academy graduate and seven-year Surface Warfare Officer, Sean brings preparation, integrity and follow-through to every contract.'],
        ['03', "An educator's clarity", 'A former educator, Anne explains every step in plain terms and brings a concierge-level personal touch, plus a professional network of trusted local contacts from first showing to closing.'],
      ].map(([n, t, p]) => C('pillar', [H('div', 'num', n), H('h3', '', t), H('p', '', p)]))),
      C('cta-row', [B('gold', "What's my home worth?", sell), B('line-light', 'Talk to Anne &amp; Sean', contact)]),
    ]),
  ]),

  reviews: () => S('reviews section', 'reviews', [
    C('wrap', [
      eyebrow('Client stories', 'center'),
      H('h2', 'center', 'In their <em>own words</em>.'),
      C('revs', [
        ['Anne went above and beyond when it came to finding my perfect home. I truly felt taken care of; she treated me as though I were family.', 'Haylee R.', 'Buyer'],
        ['Sean is an excellent Realtor. His professionalism and market expertise really stand out. He is a hard worker and willing to go the extra mile.', 'Sarah B.', 'Client'],
        ['Anne and Sean are what I call premier professionals. Communication was on par. Any contingency was addressed fully.', 'Michael G.', 'Client'],
      ].map(([q, n, r]) => C('rev', [H('div', 'mark', '“'), H('p', 'bq', q), H('div', 'who', `${n}<span>${r}</span>`)]))),
      T('note center rev-note', '<p>Testimonials from the current website. At launch this section can show the live Google rating and reviews.</p>'),
    ]),
  ]),

  // posts: [kicker, title, excerpt, url]
  insights: ({ k = 'Market guides', title = 'Read before you <em>list or buy</em>.', text = 'Written by Anne and Sean about the things that change what a home really costs, street by street.', posts }) => S('insights section sand', 'insights', [
    C('wrap', [
      C('head-row', [C('head-copy', [eyebrow(k), h2(title), sub(text)]), B('ghost', 'All market guides', PAGES.insights)]),
      C('posts', posts.map(([pk, t, p, url]) => A('post', url, [H('div', 'k', pk), H('h3', '', t), H('p', '', p), H('span', 'link', 'Read the guide →')]))),
    ]),
  ]),

  faq: (idx = [0, 1, 2, 3, 4]) => S('faq section', 'faq', [
    C('wrap grid', [
      C('', [eyebrow('Questions'), h2('Straight <em>answers</em>.'), sub("If yours isn't here, call either of us. That's what we're for.")]),
      X('faq-list', faqList(idx)),
    ]),
  ]),

  ctaBand: ({ sell = '#sell' } = {}) => S('cta-band section navy on-dark', '', [
    C('wrap', [
      eyebrow('Start here', 'center'),
      h2('Selling, buying or just curious? <em>Start with a conversation</em>.'),
      C('row', [
        B('gold', "What's my home worth?", sell),
        B('line-light', 'Call Sean · (772) 486-6883', 'tel:+17724866883'),
        B('line-light', 'Call Anne · (772) 713-7223', 'tel:+17727137223'),
      ]),
    ]),
  ]),

  contact: () => S('contact section', 'contact', [
    C('wrap grid', [
      C('', [eyebrow('Contact'), h2('Visit us in <em>Stuart</em>.'), X('', frag('<div class="info">') + '\n' + liveMap)]),
      X('', frag('<div class="form-card">')),
    ]),
  ]),
};

// ---------------------------------------------------------------- pages
const homeGuides = [
  ["Sewall's Point · Sellers &amp; buyers", "The Sewer Clock Hiding Inside a South Sewall's Point Listing", "South Sewall's Point is mid-conversion from septic to sewer. Here's how the phase, street, and a 365-day state statute can change what a home actually costs you after closing.", guideUrl('the-sewer-clock-hiding-inside-a-south-sewalls-point-listing')],
  ['Jensen Beach · Pricing', 'Jensen Beach Home Prices Across 3 Distinct Markets', 'Home prices vary across mainland, waterfront and Nettles Island tiers. See what shapes each market before you compare listings.', guideUrl('in-jensen-beach-one-zip-code-is-quietly-running-three-housing-markets')],
  ['Palm City Farms · Land', 'Palm City Farms Acreage: What Drives Land Value', "Land value hinges on more than price per acre. Zoning, access, wetlands and septic all affect what you're actually buying.", guideUrl('in-palm-city-farms-the-acre-on-the-listing-isnt-the-acre-youre-buying')],
];
const elsewhere = { sell: PAGES.sell, contact: PAGES.contact, search: PAGES.search };

const pages = {
  home: [
    sec.hero(), sec.intro(), sec.sell(), sec.listings(), sec.hoods(), sec.statewide(), sec.lifestyle(),
    sec.standard(), sec.reviews(), sec.insights({ posts: homeGuides }), sec.faq(), sec.ctaBand(), sec.contact(),
  ],

  // /home-valuation/ (same URL as the Luxury Presence valuation page)
  sell: [
    sec.sell({ h1: true }),
    sec.listings(elsewhere),
    sec.standard({ contact: PAGES.contact }),
    sec.reviews(),
    sec.insights({
      k: 'Seller guides', title: 'Before you <em>list</em>.', text: 'What we tell sellers before the sign goes up: pricing, preparation, timing, and selling from out of state.',
      posts: [['Sellers · Strategy', 'sellers-strategy-guide'], ['Sellers · Preparation', 'home-prep-guide'], ['Palm City · Out of state', 'selling-your-palm-city-home-while-living-out-of-state']].map(guideCard),
    }),
    sec.faq([0, 2, 4]),
  ],

  // /about/ (the Luxury Presence site used /team, which redirects here)
  about: [
    sec.pageHead('About us', 'Meet Anne &amp; Sean, <em>The Quinn Group</em>.', 'Husband-and-wife real estate agents with Water Pointe Realty Group, based in Stuart and serving Martin, St. Lucie and Palm Beach counties.'),
    sec.intro(),
    sec.standard(elsewhere),
    sec.reviews(),
    sec.statewide(elsewhere),
    sec.insights({ posts: homeGuides }),
  ],

  // /neighborhoods/
  neighborhoods: [
    sec.pageHead('Neighborhoods', 'Treasure Coast neighborhoods, <em>town by town</em>.', 'The Treasure Coast runs from Indian River County down to Palm Beach County. Martin County is our home turf, where every town prices differently, and so do the streets inside it.'),
    sec.hoods({ head: false, town: '#' }),
    sec.lifestyle(elsewhere),
    sec.statewide(elsewhere),
    sec.insights({
      k: 'Neighborhood guides', title: 'Choosing <em>where to live</em>.', text: 'How the towns compare, written by the two agents who sell in them every week.',
      posts: [['Stuart · Jensen Beach', 'stuart-vs-jensen-beach-how-to-choose-your-coastal-home-base'], ['Palm City · Gated &amp; golf', 'guide-to-gated-and-golf-communities-in-palm-city'], ['Hutchinson Island · Condos', 'hutchinson-island-condo-buying-guide']].map(guideCard),
    }),
    sec.ctaBand(elsewhere),
  ],

  // /contact-us/ (same URL as the Luxury Presence contact page)
  contact: [
    sec.pageHead('Get in touch', 'Talk to <em>Anne &amp; Sean</em>.', 'Call either of us directly, visit the office on SE Ocean Boulevard in Stuart, or send a note below.'),
    sec.contact(),
    sec.statewide(),
    sec.faq(),
  ],
};

const header = [C('qg-hf', [X('', headerHtml)])];
const footer = [C('qg-hf', [X('', footerHtml)])];
for (const [name, data] of Object.entries({ ...pages, header, footer })) {
  markInner(data);
  fs.writeFileSync(path.join(dist, 'elementor', `${name}.json`), JSON.stringify(data));
}
console.log(`built theme, ${manifest.length} images, Elementor data (${seq} elements)`);
