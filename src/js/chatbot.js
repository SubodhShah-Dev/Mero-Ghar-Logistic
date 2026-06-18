// ── AI Chatbot Widget for MeroGhar Logistics ──

(function () {
  var chatHistory = [];
  var isOpen = false;
  var isSending = false;

  function getBaseUrl() {
    if (typeof API_BASE_URL !== 'undefined') return API_BASE_URL;
    if (typeof window.API_BASE_URL !== 'undefined') return window.API_BASE_URL;
    return 'http://localhost:5000';
  }

  var WIDGET_HTML =
    '<div id="mg-chat-btn" style="position:fixed;bottom:20px;right:20px;z-index:9997;width:56px;height:56px;border-radius:50%;background:#f8c06a;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease">' +
      '<svg id="mg-chat-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0b1510" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
      '</svg>' +
    '</div>' +
    '<div id="mg-chat-panel" style="position:fixed;bottom:88px;right:20px;z-index:9997;width:360px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);background:#111d16;border:1px solid rgba(248,192,106,0.18);border-radius:16px;display:none;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,0.5);overflow:hidden;animation:mg-chat-in 0.25s ease">' +
      '<div style="padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:10px;flex-shrink:0">' +
        '<div style="width:34px;height:34px;border-radius:50%;background:rgba(248,192,106,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f8c06a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 2a10 10 0 0 1 10 10c0 2.5-1 4.8-2.6 6.5L21 22l-4.2-1.8A10 10 0 1 1 12 2z"/>' +
          '</svg>' +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600;color:#eef2ee">MeroBot</div>' +
          '<div style="font-size:11px;color:rgba(238,242,238,0.4)">AI Assistant</div>' +
        '</div>' +
        '<button id="mg-chat-close" style="width:30px;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,0.07);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,238,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M18 6L6 18M6 6l12 12"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div id="mg-chat-msgs" style="flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px">' +
        '<div class="mg-msg mg-bot" style="align-self:flex-start;max-width:85%;background:rgba(255,255,255,0.06);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;line-height:1.5;color:rgba(238,242,238,0.9)">' +
          'Namaste! 🙏 I\'m MeroBot, your AI assistant for MeroGhar Logistics. Ask me about booking, tracking, pricing, or anything else!' +
        '</div>' +
      '</div>' +
      '<div style="padding:12px 14px 14px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;flex-shrink:0">' +
        '<input id="mg-chat-input" type="text" placeholder="Type a message..." style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 14px;font-size:14px;color:#eef2ee;outline:none;font-family:inherit;min-width:0">' +
        '<button id="mg-chat-send" style="width:42px;height:42px;border-radius:10px;background:#f8c06a;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b1510" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  var TYPING_HTML =
    '<div class="mg-typing" style="align-self:flex-start;display:flex;gap:4px;padding:12px 16px;background:rgba(255,255,255,0.06);border-radius:12px 12px 12px 4px">' +
      '<span style="width:6px;height:6px;border-radius:50%;background:rgba(238,242,238,0.35);animation:mg-bounce 1.2s ease-in-out infinite"></span>' +
      '<span style="width:6px;height:6px;border-radius:50%;background:rgba(238,242,238,0.35);animation:mg-bounce 1.2s ease-in-out 0.2s infinite"></span>' +
      '<span style="width:6px;height:6px;border-radius:50%;background:rgba(238,242,238,0.35);animation:mg-bounce 1.2s ease-in-out 0.4s infinite"></span>' +
    '</div>';

  function injectStyles() {
    if (document.getElementById('mg-chat-styles')) return;
    var style = document.createElement('style');
    style.id = 'mg-chat-styles';
    style.textContent =
      '@keyframes mg-chat-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }' +
      '@keyframes mg-bounce { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-6px) } }' +
      '#mg-chat-msgs::-webkit-scrollbar { width:4px }' +
      '#mg-chat-msgs::-webkit-scrollbar-track { background:transparent }' +
      '#mg-chat-msgs::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:2px }' +
      '#mg-chat-input::placeholder { color:rgba(238,242,238,0.3) }' +
      '#mg-chat-btn:hover { transform:scale(1.08) }' +
      '#mg-chat-btn:active { transform:scale(0.95) }' +
      '#mg-chat-send:hover { opacity:0.85 }' +
      '#mg-chat-send:disabled { opacity:0.4;cursor:default }';
    document.head.appendChild(style);
  }

  function createWidget() {
    if (document.getElementById('mg-chat-btn')) return;
    var wrapper = document.createElement('div');
    wrapper.innerHTML = WIDGET_HTML;
    while (wrapper.firstChild) {
      document.body.appendChild(wrapper.firstChild);
    }
  }

  function scrollToBottom() {
    var msgs = document.getElementById('mg-chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function addMessage(text, role) {
    var msgs = document.getElementById('mg-chat-msgs');
    if (!msgs) return;
    var div = document.createElement('div');
    var isBot = role === 'bot';
    div.style.cssText = 'align-self:' + (isBot ? 'flex-start' : 'flex-end') + ';max-width:85%;background:' + (isBot ? 'rgba(255,255,255,0.06)' : 'rgba(248,192,106,0.12)') + ';border-radius:' + (isBot ? '12px 12px 12px 4px' : '12px 12px 4px 12px') + ';padding:10px 14px;font-size:13px;line-height:1.5;color:' + (isBot ? 'rgba(238,242,238,0.9)' : '#eef2ee') + ';white-space:pre-wrap;word-break:break-word';
    div.textContent = text;
    msgs.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    var msgs = document.getElementById('mg-chat-msgs');
    if (!msgs) return;
    var div = document.createElement('div');
    div.id = 'mg-typing-indicator';
    div.innerHTML = TYPING_HTML;
    msgs.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('mg-typing-indicator');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function getLocalFallback(msg) {
    var m = (msg || '').toLowerCase().trim();
    if (m.includes('hello') || m.includes('hi ') || m === 'hi' || m === 'hey' || m.includes('namaste')) return 'Namaste! 🙏 How can I help you with your move today?';
    if (m.includes('price') || m.includes('cost') || m.includes('rate') || m.includes('quote')) return 'Our pricing is based on distance, item volume, and special handling needs. Get an instant quote by filling out the booking form.';
    if (m.includes('book') || m.includes('order') || m.includes('move') || m.includes('shift')) return 'To book: open the app, fill in pickup/drop locations, select items, and confirm. You\'ll get a distance-based quote.';
    if (m.includes('track') || m.includes('status') || m.includes('where') || m.includes('delivery')) return 'Track your shipment in real-time via the app — go to "My Bookings" and tap the shipment.';
    if (m.includes('payment') || m.includes('pay') || m.includes('khalti') || m.includes('esewa')) return 'We accept Cash on Delivery, Bank Transfer, ConnectIPS, Khalti, and eSewa.';
    if (m.includes('cancel') || m.includes('refund')) return 'To cancel a booking, please contact our support team. Refunds are case-by-case.';
    if (m.includes('vehicle') || m.includes('truck')) return 'We have mini trucks to large trucks for full household shifting. The right vehicle is assigned based on your items.';
    if (m.includes('fragile') || m.includes('glass') || m.includes('breakable')) return 'Yes! Mark items as fragile during booking — our team will handle them with extra care.';
    if (m.includes('contact') || m.includes('support') || m.includes('phone')) return 'Reach support via the app\'s Help section or contact admin. We respond within 24 hours.';
    if (m.includes('thank') || m.includes('thanks')) return 'You\'re welcome! 😊 Happy moving with MeroGhar!';
    return 'I\'m here to help with MeroGhar Logistics — bookings, tracking, pricing, and more. Could you be more specific?';
  }

  function sendMessage() {
    if (isSending) return;
    var input = document.getElementById('mg-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');
    chatHistory.push({ role: 'user', text: text });
    isSending = true;
    showTyping();

    var url = getBaseUrl() + '/api/chatbot/message';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(-10) }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        isSending = false;
        var reply = data.response || 'Sorry, I couldn\'t process that. Please try again.';
        addMessage(reply, 'bot');
        chatHistory.push({ role: 'model', text: reply });
      })
      .catch(function (err) {
        hideTyping();
        isSending = false;
        var fallback = getLocalFallback(text);
        addMessage(fallback + '\n\n(offline mode — replies may be limited)', 'bot');
        chatHistory.push({ role: 'model', text: fallback });
      });
  }

  function bindEvents() {
    var btn = document.getElementById('mg-chat-btn');
    var panel = document.getElementById('mg-chat-panel');
    var close = document.getElementById('mg-chat-close');
    var input = document.getElementById('mg-chat-input');
    var send = document.getElementById('mg-chat-send');
    if (!btn || !panel) return;

    btn.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen) {
        panel.style.display = 'flex';
        btn.style.display = 'none';
        setTimeout(function () {
          if (input) input.focus();
        }, 300);
      } else {
        panel.style.display = 'none';
        btn.style.display = 'flex';
      }
    });

    if (close) {
      close.addEventListener('click', function () {
        isOpen = false;
        panel.style.display = 'none';
        btn.style.display = 'flex';
      });
    }

    if (send) {
      send.addEventListener('click', sendMessage);
    }

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
        }
      });
    }
  }

  function init() {
    if (typeof document === 'undefined') return;
    var ready = function () {
      injectStyles();
      createWidget();
      bindEvents();
    };
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(ready, 2000);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(ready, 2000); });
    }
  }

  init();
})();
