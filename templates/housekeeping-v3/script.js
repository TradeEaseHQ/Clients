// ── FAQ Accordion ──
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Chat Widget ──
const chatBtn = document.getElementById('chat-btn');
const chatPanel = document.getElementById('chat-panel');
const chatClose = document.getElementById('chat-close');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatBody = document.getElementById('chat-body');

if (chatBtn) chatBtn.addEventListener('click', () => chatPanel.classList.add('open'));
if (chatClose) chatClose.addEventListener('click', () => chatPanel.classList.remove('open'));

const CHAT_RESPONSES = [
  "Great question! I can help with pricing and availability. Would you like to request a free quote?",
  "We're typically available Monday–Saturday, 8am–6pm. For exact availability, please fill out our quote form!",
  "Our most popular service is the Deep Clean — it covers everything from baseboards to inside the fridge.",
  "Yes, all our team members are background-checked and fully insured. Your home is in safe hands.",
  "We use eco-friendly, non-toxic cleaning products that are safe for kids and pets.",
  "For a free, no-obligation quote, just fill out the form on this page or give us a call!",
];

if (chatSend) {
  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'background:var(--brand-xlight,#dcfce7);border-radius:14px 14px 0 14px;padding:10px 14px;font-size:13px;max-width:85%;align-self:flex-end;line-height:1.5;';
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => {
      const botMsg = document.createElement('div');
      botMsg.className = 'chat-bubble';
      botMsg.textContent = CHAT_RESPONSES[Math.floor(Math.random() * CHAT_RESPONSES.length)];
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 600);
  }
  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

// ── Scroll Progress Bar ──
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  const updateProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ── Section Scrollspy ──
const sectionBarItems = document.querySelectorAll('.nav-section-item');

if (sectionBarItems.length) {
  // Click scrolls to section
  sectionBarItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.section);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
  const allSections = document.querySelectorAll('section[id]');
  const setActive = (id) => {
    sectionBarItems.forEach(el => el.classList.toggle('active', el.dataset.section === id));
  };
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { threshold: 0.15, rootMargin: '-5% 0px -65% 0px' });
  allSections.forEach(s => spyObserver.observe(s));
  // Set first section active by default
  if (allSections.length) setActive(allSections[0].id);
}

// ── Scroll-triggered Animations ──
const animItems = document.querySelectorAll('.animate-in');
if (animItems.length && 'IntersectionObserver' in window) {
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  animItems.forEach(el => animObserver.observe(el));
}

// ── Promise Cards Pop Animation ──
const promiseCards = document.querySelectorAll('.promise-card');
if (promiseCards.length && 'IntersectionObserver' in window) {
  const popObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        card.classList.add('pop-in');
        setTimeout(() => card.classList.add('pop-settle'), 500);
        popObserver.unobserve(card);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  promiseCards.forEach(card => popObserver.observe(card));
}
