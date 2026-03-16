// Trade Ease — Housekeeping V1 Template JS
// Mobile nav, FAQ accordion, AI chat mockup widget

(function () {
  "use strict";

  // ── FAQ Accordion ──
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = this.closest(".faq-item");
      var isOpen = item.classList.contains("open");
      // Close all
      document.querySelectorAll(".faq-item").forEach(function (i) {
        i.classList.remove("open");
      });
      // Toggle clicked
      if (!isOpen) item.classList.add("open");
    });
  });

  // ── AI Chat Widget Mockup ──
  var chatBtn = document.getElementById("chat-btn");
  var chatPanel = document.getElementById("chat-panel");
  var chatClose = document.getElementById("chat-close");
  var chatInput = document.getElementById("chat-input");
  var chatSend = document.getElementById("chat-send");
  var chatBody = document.getElementById("chat-body");

  if (chatBtn && chatPanel) {
    chatBtn.addEventListener("click", function () {
      chatPanel.classList.toggle("open");
    });
    chatClose.addEventListener("click", function () {
      chatPanel.classList.remove("open");
    });

    // Mock responses for demo
    var mockResponses = [
      "Great question! We'd be happy to help with that. For exact details and pricing, the best next step is to give us a call or fill out the quote form below.",
      "We serve the area and surrounding communities. Call us to confirm your specific location!",
      "Yes, we bring all our own supplies and equipment. Just let us know if you have any preferences.",
      "We're fully bonded and insured for your peace of mind.",
      "You can book by calling us, texting, or using the quote form on this page. We'll get back to you quickly!"
    ];
    var responseIndex = 0;

    function addMessage(text, fromUser) {
      var bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      if (fromUser) {
        bubble.style.cssText = "align-self:flex-end;border-radius:12px 12px 0 12px;background:#2a7d4f;color:#fff;";
      }
      bubble.textContent = text;
      chatBody.appendChild(bubble);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function sendMessage() {
      var text = chatInput.value.trim();
      if (!text) return;
      addMessage(text, true);
      chatInput.value = "";
      setTimeout(function () {
        addMessage(mockResponses[responseIndex % mockResponses.length], false);
        responseIndex++;
      }, 700);
    }

    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") sendMessage();
    });
  }

  // ── Contact form (prevent default, show confirmation) ──
  var form = document.getElementById("quote-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.innerHTML = '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:16px;">✅</div><h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">Message received!</h3><p style="color:#5a6070;">This is a demo — in the live site, this form connects directly to your inbox.</p></div>';
    });
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

})();
