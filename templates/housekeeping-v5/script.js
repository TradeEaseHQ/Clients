'use strict';

/* ── Scroll Progress Bar ── */
var progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', function() {
  if (!progressBar) return;
  var pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  progressBar.style.width = Math.min(pct, 100) + '%';
}, { passive: true });

/* ── Nav shadow on scroll ── */
var nav = document.getElementById('main-nav');
window.addEventListener('scroll', function() {
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Hamburger Menu ── */
var hamburger = document.getElementById('nav-hamburger');
var navLinks = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', function() {
    navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });
  document.querySelectorAll('.nav-link').forEach(function(link) {
    link.addEventListener('click', function() { navLinks.classList.remove('open'); });
  });
}

/* ── IntersectionObserver animation triggers ── */
var observerOpts = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };

// Text reveal wipes
var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var wrap = entry.target;
      // Find reveal-text children and stagger them
      var texts = wrap.querySelectorAll('.reveal-text');
      texts.forEach(function(el, i) {
        el.style.setProperty('--delay', (i * 150) + 'ms');
      });
      wrap.classList.add('is-revealed');
      revealObserver.unobserve(wrap);
    }
  });
}, observerOpts);
document.querySelectorAll('.reveal-wrap').forEach(function(el) { revealObserver.observe(el); });

// Image mask reveals
var imgObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      imgObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.split-img').forEach(function(el) { imgObserver.observe(el); });

// Fade-up singles
var fadeObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOpts);
document.querySelectorAll('.fade-up').forEach(function(el) { fadeObserver.observe(el); });

// Card stagger grids
var staggerObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      staggerObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.06 });
document.querySelectorAll('.stagger').forEach(function(el) { staggerObserver.observe(el); });

/* ── Parallax on hero photo (desktop only) ── */
var heroPhoto = document.querySelector('.hero-photo img');
if (heroPhoto && window.innerWidth >= 1024) {
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY;
    // Photo moves at 0.4x scroll rate — creates depth
    heroPhoto.style.transform = 'scale(1.0) translateY(' + (scrolled * 0.25) + 'px)';
  }, { passive: true });
}

/* ── FAQ Accordion ── */
document.querySelectorAll('.faq-q').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var item = btn.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(function(i) { i.classList.remove('open'); });
    // Open clicked (if wasn't open)
    if (!isOpen) item.classList.add('open');
  });
});

/* ── Quote Form ── */
var form = document.getElementById('quote-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    btn.textContent = 'Request Received';
    btn.disabled = true;
    btn.style.background = '#1a6b4a';
    btn.style.opacity = '0.8';
  });
}

/* ── Chat Widget (carried forward from v4) ── */
var chatBtn = document.getElementById('chat-btn');
var chatPanel = document.getElementById('chat-panel');
var chatClose = document.getElementById('chat-close');
var chatInput = document.getElementById('chat-input');
var chatSend = document.getElementById('chat-send');
var chatBody = document.getElementById('chat-body');
var businessId = document.body.dataset.businessId || '';
var chatApiUrl = document.body.dataset.chatApi || '/api/chat';
var chatHistory = [];

if (chatBtn) chatBtn.addEventListener('click', function() { chatPanel.classList.add('open'); chatInput.focus(); });
if (chatClose) chatClose.addEventListener('click', function() { chatPanel.classList.remove('open'); });

function appendBubble(text, role) {
  var div = document.createElement('div');
  div.className = 'chat-bubble ' + role;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
  return div;
}

function sendMessage() {
  var msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = '';
  appendBubble(msg, 'user');
  chatHistory.push({ role: 'user', content: msg });
  var typing = appendBubble('...', 'bot typing');
  fetch(chatApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: businessId, message: msg, history: chatHistory.slice(-6), _hp: '' })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    typing.remove();
    var reply = data.reply || "I'm not sure — please give us a call!";
    appendBubble(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });
  })
  .catch(function() {
    typing.remove();
    appendBubble('Sorry, something went wrong. Please call us directly!', 'bot');
  });
}

if (chatSend) chatSend.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });
