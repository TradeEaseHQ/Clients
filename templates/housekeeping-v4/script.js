// FAQ Accordion
document.querySelectorAll('.faq-q').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var item = btn.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(i) { i.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
  });
});

// Scroll Progress Bar
var progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', function() {
  if (!progressBar) return;
  var pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  progressBar.style.width = Math.min(pct, 100) + '%';
});

// Hamburger Menu
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

// Animate on Scroll
var animateObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.animate-in').forEach(function(el) { animateObserver.observe(el); });

// Quote Form
var form = document.getElementById('quote-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    btn.textContent = '✓ Request Received!';
    btn.disabled = true;
    btn.style.background = '#16a34a';
  });
}

// Chat Widget
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

  var typing = appendBubble('…', 'bot typing');

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
    appendBubble("Sorry, something went wrong. Please call us directly!", 'bot');
  });
}

if (chatSend) chatSend.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });
