/* The Quinn Group front-end: mobile menu, sticky-nav shadow, hero finder tabs, two-step home value form, scroll fade. */
(function () {
  var d = document, body = d.body;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  // mobile menu
  var nav = $('.nav');
  if (nav) {
    var open = function () { nav.classList.add('open'); body.style.overflow = 'hidden'; };
    var close = function () { nav.classList.remove('open'); body.style.overflow = ''; };
    var burger = $('.burger', nav), closer = $('.mpanel .close', nav);
    if (burger) burger.addEventListener('click', open);
    if (closer) closer.addEventListener('click', close);
    $$('.mpanel a', nav).forEach(function (a) { a.addEventListener('click', close); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
  }

  // home value: address first, then where to send the review
  var v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), sa = $('#sa');
  if (v1 && v2 && v3 && sa) {
    var vnote = $('.vcard .note');
    var show = function (el) {
      [v1, v2, v3].forEach(function (s) { s.classList.toggle('on', s === el); });
      if (vnote) vnote.hidden = (el === v3);
    };
    var toStep2 = function (addr) {
      sa.value = addr;
      $('#v-addr-text').textContent = addr || 'Your home';
      show(v2);
      var n = $('#sn'); if (n) n.focus({ preventScroll: true });
    };
    v1.addEventListener('submit', function (e) { e.preventDefault(); toStep2(sa.value.trim()); });
    v2.addEventListener('submit', function (e) { e.preventDefault(); show(v3); });
    var edit = $('.v-edit', v2); if (edit) edit.addEventListener('click', function () { show(v1); sa.focus(); });
    var heroValue = $('#p-value form');
    if (heroValue) heroValue.addEventListener('submit', function (e) {
      e.preventDefault();
      toStep2(($('#va') || {}).value ? $('#va').value.trim() : '');
      var sell = $('#sell'); if (sell) sell.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // hero finder tabs
  var tabs = $$('.finder .tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
      $$('.finder .pane').forEach(function (p) { p.classList.remove('on'); });
      t.classList.add('on'); t.setAttribute('aria-selected', 'true');
      var pane = d.getElementById(t.dataset.p); if (pane) pane.classList.add('on');
    });
  });

  // one simple fade on scroll, staggered within each group (skipped inside the Elementor editor)
  if (body.classList.contains('elementor-editor-active')) return;
  var groups = ['.intro .frame', '.intro .copy-col', '.sell .step', '.vcard', '.lcard', '.town', '.county', '.reach .r', '.ls', '.stat', '.pillar', '.rev', '.post', '.faq details', '.form-card'];
  groups.forEach(function (sel) {
    $$(sel).forEach(function (el, i) { el.classList.add('reveal'); if (i % 4) el.classList.add('d' + (i % 4)); });
  });
  var els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var t = e.target; t.classList.add('in'); io.unobserve(t);
        setTimeout(function () { t.classList.remove('reveal', 'd1', 'd2', 'd3'); }, 1200);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function (e) { io.observe(e); });
})();
