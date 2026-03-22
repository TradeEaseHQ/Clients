'use strict';

/* ── Scroll Progress Bar ── */
var progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', function() {
  if (!progressBar) return;
  var pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  progressBar.style.width = Math.min(pct, 100) + '%';
}, { passive: true });

/* ── Nav: fade in background when user scrolls ~25% through the hero ── */
var nav = document.getElementById('main-nav');
var heroSection = document.querySelector('.hero');
window.addEventListener('scroll', function() {
  if (!nav) return;
  var threshold = heroSection ? heroSection.offsetHeight * 0.25 : window.innerHeight * 0.25;
  nav.classList.toggle('scrolled', window.scrollY > threshold);
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

/* ── IntersectionObserver animation triggers — element must be well into viewport ── */
var observerOpts = { threshold: 0.25, rootMargin: '0px 0px -100px 0px' };

// Text reveal wipes
var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var wrap = entry.target;
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

// Image opacity reveals
var imgObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      imgObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.25, rootMargin: '0px 0px -100px 0px' });
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
}, { threshold: 0.25, rootMargin: '0px 0px -100px 0px' });
document.querySelectorAll('.stagger').forEach(function(el) { staggerObserver.observe(el); });

// Pill/tag stagger — set individual delays then trigger
var pillObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var pills = entry.target.children;
      for (var i = 0; i < pills.length; i++) {
        pills[i].style.setProperty('--pill-delay', (i * 55) + 'ms');
      }
      entry.target.classList.add('is-revealed');
      pillObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.25, rootMargin: '0px 0px -100px 0px' });
document.querySelectorAll('.pill-stagger').forEach(function(el) { pillObserver.observe(el); });

/* ── Parallax on hero image (desktop only) ── */
var heroPhoto = document.querySelector('.hero-image img');
if (heroPhoto && window.innerWidth >= 1024) {
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY;
    heroPhoto.style.transform = 'scale(1.08) translateY(' + (scrolled * 0.2) + 'px)';
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
  // If no real action is set (demo mode), intercept and show fake success
  if (!form.action || form.action === window.location.href) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      btn.textContent = 'Request Received';
      btn.disabled = true;
      btn.style.background = '#1a6b4a';
      btn.style.opacity = '0.8';
    });
  }
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

/* ── Nav Sliding Underline + Scrollspy ── */
var navInner = document.querySelector('.nav-inner');
var navHighlight = document.createElement('div');
navHighlight.className = 'nav-highlight';
if (navInner) navInner.appendChild(navHighlight);

var _isHoveringNav = false;
var _activeLink = null;
var _highlightVisible = false;

function moveHighlightTo(link, slideIn) {
  if (!navInner || !link) return;
  var rect = link.getBoundingClientRect();
  var navRect = navInner.getBoundingClientRect();
  var newLeft = (rect.left - navRect.left) + 'px';
  var newWidth = rect.width + 'px';

  if (slideIn && !_highlightVisible) {
    // First appearance: position immediately, then animate scaleX 0→1
    navHighlight.style.transition = 'none';
    navHighlight.style.width = newWidth;
    navHighlight.style.left = newLeft;
    navHighlight.classList.add('entering');
    navHighlight.style.opacity = '1';
    // Force reflow, then trigger transition
    navHighlight.getBoundingClientRect();
    navHighlight.style.transition = '';
    navHighlight.classList.remove('entering');
    navHighlight.classList.add('active');
  } else {
    navHighlight.style.width = newWidth;
    navHighlight.style.left = newLeft;
    navHighlight.style.opacity = '1';
    navHighlight.classList.add('active');
  }
  _highlightVisible = true;
}

function hideHighlight() {
  navHighlight.style.opacity = '0';
  _highlightVisible = false;
  navHighlight.classList.remove('active', 'entering');
}

document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('mouseenter', function() {
    _isHoveringNav = true;
    moveHighlightTo(link, !_highlightVisible);
  });
});

if (navInner) {
  navInner.addEventListener('mouseleave', function() {
    _isHoveringNav = false;
    // Revert to active scrollspy link or hide
    if (_activeLink) {
      moveHighlightTo(_activeLink, false);
    } else {
      hideHighlight();
    }
  });
}

// Scrollspy — highlight active section nav link
var spySections = [];
document.querySelectorAll('section[id]').forEach(function(el) { spySections.push(el); });

function updateScrollspy() {
  var scrollPos = window.scrollY + 100;
  var found = null;
  spySections.forEach(function(section) {
    if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
      var id = section.getAttribute('id');
      var link = document.querySelector('.nav-link[href="#' + id + '"]');
      if (link) found = link;
    }
  });
  var wasNull = !_activeLink;
  _activeLink = found;
  if (!_isHoveringNav) {
    if (found) {
      // Slide in if this is a new appearance (was hidden before)
      moveHighlightTo(found, wasNull && !_highlightVisible);
    } else {
      hideHighlight();
    }
  }
}

window.addEventListener('scroll', updateScrollspy, { passive: true });
updateScrollspy();

/* ── Proof Bar Ticker ── */
var proofTrack = document.getElementById('proof-track');
if (proofTrack) {
  var proofInner = proofTrack.querySelector('.proof-inner');
  if (proofInner) {
    var clone = proofInner.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    proofTrack.appendChild(clone);
    proofTrack.classList.add('ticking');
  }
}
