// Extracts the Luxury Presence blog posts (saved under migrate/pages/blog/*.html) into migrate/blog.json
// for the WordPress importer. Keeps the article body, the H1, the SEO title and description, and the images;
// drops share buttons, scripts and Luxury Presence markup.
// Usage: node migrate/extract-blog.mjs   (re-run any time; the crawl is a separate step)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'pages', 'blog');
const lastmod = Object.fromEntries(fs.readFileSync(path.join(here, 'blog-urls.txt'), 'utf8').trim().split(/\r?\n/)
  .map(l => l.split(' ')).map(([u, d]) => [path.basename(u), d || '']));

const KEEP = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'b', 'em', 'i', 'blockquote', 'br', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe']);
const ATTRS = { a: ['href', 'target', 'rel'], img: ['src', 'alt'], iframe: ['src', 'title', 'allow', 'allowfullscreen'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] };
const decode = s => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
const mediaId = src => (src.match(/media-production\.lp-cdn\.com\/media\/([a-f0-9-]{36})/) || [])[1] || null;

// Cloudflare "email protection" obfuscates mailto links; undo it.
function cfEmail(hex) {
  const key = parseInt(hex.slice(0, 2), 16); let out = '';
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

function clean(node, images) {
  for (const el of [...node.childNodes]) {
    if (el.nodeType !== 1) continue;
    const tag = el.rawTagName.toLowerCase();
    clean(el, images);
    if (!KEEP.has(tag)) { el.replaceWith(...el.childNodes); continue; }
    const keep = ATTRS[tag] || [];
    for (const a of Object.keys(el.attributes)) if (!keep.includes(a)) el.removeAttribute(a);
    if (tag === 'a') {
      let href = el.getAttribute('href') || '';
      const cf = href.match(/\/cdn-cgi\/l\/email-protection#([a-f0-9]+)/);
      if (cf) href = 'mailto:' + cfEmail(cf[1]);
      href = href.replace(/^https?:\/\/(www\.)?myfloridainsider\.com/i, '') || '/';
      el.setAttribute('href', href);
      if (/^https?:/.test(href)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
      else { el.removeAttribute('target'); el.removeAttribute('rel'); }
    }
    if (tag === 'img') {
      const id = mediaId(el.getAttribute('src') || '');
      if (id) { images.push({ id, alt: decode(el.getAttribute('alt') || '') }); el.setAttribute('src', `lp-media:${id}`); }
    }
    if (tag === 'i' && !el.text.trim()) el.remove();
  }
}

const posts = [];
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort()) {
  const slug = file.replace(/\.html$/, '');
  const root = parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const body = root.querySelector('.blog-content .intro-box');
  const h1 = root.querySelector('.blog-details-intro h1');
  const fimg = root.querySelector('.blog-details-intro__img img');
  const post = {
    slug,
    lastmod: lastmod[slug] || '',
    h1: h1 ? decode(h1.text) : '',
    seo_title: decode(root.querySelector('title')?.text || ''),
    description: decode(root.querySelector('meta[name="description"]')?.getAttribute('content') || ''),
    featured: fimg && mediaId(fimg.getAttribute('src') || '') ? { id: mediaId(fimg.getAttribute('src')), alt: decode(fimg.getAttribute('alt') || '') } : null,
    images: [],
    html: '',
    words: 0,
    skip: '',
  };
  if (!body) { post.skip = 'no article body found'; posts.push(post); continue; }
  body.querySelectorAll('ul.socials, script, style, noscript, form, button, svg').forEach(e => e.remove());
  clean(body, post.images);
  post.html = body.innerHTML.replace(/\s*\n\s*/g, '\n').replace(/<p>\s*<\/p>/g, '').trim();
  post.words = body.text.split(/\s+/).filter(Boolean).length;
  // Listings published as blog posts (address slugs) belong to the property/IDX pages, not the blog.
  if (/^\d+-[a-z0-9-]+-(fl-)?\d{5}$/.test(slug)) post.skip = 'listing published as a blog post';
  if (post.words < 150 && !post.skip) post.skip = `thin (${post.words} words)`;
  posts.push(post);
}
fs.writeFileSync(path.join(here, 'blog.json'), JSON.stringify(posts, null, 1));
const kept = posts.filter(p => !p.skip);
console.log(`${posts.length} posts: ${kept.length} to import, ${posts.length - kept.length} skipped`);
for (const p of posts.filter(p => p.skip)) console.log(`  skip ${p.slug}: ${p.skip}`);
console.log(`images: ${kept.filter(p => p.featured).length} featured, ${kept.reduce((a, p) => a + p.images.length, 0)} in-body`);
console.log(`missing: h1 ${kept.filter(p => !p.h1).length}, description ${kept.filter(p => !p.description).length}, featured ${kept.filter(p => !p.featured).length}`);
