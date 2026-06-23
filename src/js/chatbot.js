// ── AI Chatbot Widget for MeroGhar Logistics ──

(function () {
  var chatHistory = [];
  var isOpen = false;
  var isSending = false;

  function getBaseUrl() {
    if (typeof window.API_BASE_URL !== 'undefined' && window.API_BASE_URL) return window.API_BASE_URL;
    if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) return API_BASE_URL;
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

  var ALL_QUESTIONS = [
    { category: 'About MeroGhar', questions: ['What is MeroGhar?', 'What is the purpose of this site?', 'Tell me about this service', 'Describe MeroGhar'] },
    { category: 'Booking', questions: ['How to book a move?', 'Start a new booking', 'Schedule my move', 'Fill the booking form', 'Book a move'] },
    { category: 'Pricing', questions: ['What are the prices?', 'How much does it cost?', 'Pricing range for moving', 'Get a quote', 'Service rates'] },
    { category: 'Vehicles', questions: ['What types of trucks do you have?', 'Available vehicles', 'Cargo tempo details', 'Mini truck vs large truck', 'Which vehicle to choose?'] },
    { category: 'Coverage', questions: ['Which provinces do you cover?', 'Coverage areas in Nepal', 'Districts served', 'Do you cover my area?', 'All 7 provinces details'] },
    { category: 'Payment', questions: ['What payment methods are accepted?', 'How to pay via eSewa?', 'Khalti payment', 'Do you accept cash?', 'ConnectIPS payment'] },
    { category: 'Tracking', questions: ['Track my shipment', 'Where is my order?', 'Shipment status', 'My delivery status', 'Track my move'] },
    { category: 'Services', questions: ['What services do you offer?', 'Add-on services', 'Do you pack items?', 'Furniture disassembly', 'Storage and warehouse'] },
    { category: 'Items & Care', questions: ['How to pack fragile items?', 'Religious statues moving instructions', 'Stone grinder handling', 'Breakable items care', 'Special items help'] },
    { category: 'Cancellation', questions: ['Cancel my booking', 'Refund policy', 'How to cancel a move?'] },
    { category: 'Support', questions: ['Contact support', 'Phone number', 'Viber support', 'Email address', 'Customer service'] },
    { category: 'Reviews', questions: ['Customer reviews', 'Ratings and feedback', 'Is MeroGhar reliable?', 'Trusted movers', 'What do customers say?'] },
    { category: 'How It Works', questions: ['How does it work?', 'Steps to move', 'Moving process explained', 'Timeline for booking', 'Step by step guide'] },
    { category: 'Insurance', questions: ['Item insurance details', 'Protect my items', 'Damage coverage', 'Insurance cost'] }
  ];

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

  var KNOWLEDGE = {
    site: {
      name: 'MeroGhar Logistics',
      tagline: "Nepal's Trusted Household Moving Service",
      description: 'Household moving service covering all 7 provinces of Nepal with verified movers.',
      phone: '+977 980-000-000',
      email: 'info@meroghar.com.np',
      stats: '8,000+ moves, 77 districts, 4.8 stars, 250+ providers'
    },
    howItWorks: [
      'Step 1: Fill the Form — Province, district, items, vehicle type, and preferred date in under 3 minutes.',
      'Step 2: Get Matched — We match you with a verified mover in your district within 2 hours.',
      'Step 3: Confirm & Pay — Review quote over Viber or phone. Pay token via eSewa, Khalti, or cash.',
      'Step 4: Move Day! — Crew arrives on time, even for early auspicious timings.'
    ],
    services: [
      { name: 'Full-Service Moving', desc: 'Complete door-to-door service with crew and truck.', price: 'From NPR 15,000' },
      { name: 'Pack & Load Only', desc: 'We pack and load your vehicle efficiently.', price: 'From NPR 7,500' },
      { name: 'Cargo Tempo / Valley Move', desc: 'Narrow lane-friendly tempo for Kathmandu Valley intra-city moves.', price: 'From NPR 2,500' },
      { name: 'Furniture Disassembly', desc: 'Furniture taken apart and reassembled at new home.', price: 'From NPR 2,500' },
      { name: 'Storage / Warehouse', desc: 'Secure short or long-term storage facilities.', price: 'From NPR 3,000/month' },
      { name: 'Item Insurance', desc: 'Full-replacement coverage on all items moved.', price: 'From NPR 1,200' }
    ],
    vehicles: [
      { name: 'Cargo Tempo', price: 'NPR 400-500', best: '1-2 rooms, narrow lanes, valley moves' },
      { name: 'Tata Ace (Small Truck)', price: 'NPR 800-1200', best: '2 BHK, semi-urban routes' },
      { name: 'Mini Truck (407)', price: 'NPR 1500-2000', best: '3 BHK, inter-city, full household' },
      { name: 'Large Truck + Helper Team', price: 'NPR 2000+', best: 'Large house, province-to-province' },
      { name: 'Let MeroGhar Recommend', price: 'Varies', best: 'Coordinator suggests best vehicle' }
    ],
    addons: [
      { name: 'Packing Service', desc: 'Bubble wrap, rope, and boxes provided' },
      { name: 'Furniture Disassembly', desc: 'Taken apart and reassembled at new home' },
      { name: 'Porter / Labor Help', desc: 'Extra manual labor for stairs or narrow access' },
      { name: 'Item Insurance', desc: 'Full-value coverage on all moved items' }
    ],
    payments: ['eSewa', 'Khalti', 'IME Pay', 'ConnectIPS', 'Bank Transfer', 'Cash on Move Day'],
    provinces: [
      'Koshi (14 districts, cities: Biratnagar, Dharan, Ilam)',
      'Madhesh (8 districts, cities: Janakpur, Birgunj)',
      'Bagmati (13 districts, cities: Kathmandu, Lalitpur, Bhaktapur) — Most Active',
      'Gandaki (11 districts, cities: Pokhara, Gorkha)',
      'Lumbini (12 districts, cities: Butwal, Rupandehi)',
      'Karnali (10 districts, cities: Surkhet, Jumla)',
      'Sudurpashchim (9 districts, cities: Dhangadhi, Mahendranagar)'
    ],
    faq: [
      { q: 'covers all provinces nepal districts', a: 'Yes! MeroGhar covers all 77 districts across all 7 provinces of Nepal — from Kathmandu to Karnali and Sudurpashchim.' },
      { q: 'how quickly quote after form', a: 'Our coordinator calls you on Viber or phone within 2 hours of form submission. For urgent moves, call +977 980-000-000.' },
      { q: 'auspicious timing early morning', a: 'Absolutely! Mention your required time in Special Notes during Step 4. Even 4 or 5 AM starts — our crew arrives on the dot.' },
      { q: 'narrow lane kathmandu small vehicle', a: 'Yes! Cargo tempos are our narrow-lane specialists. Select "Narrow lane" under Road Access in Step 1.' },
      { q: 'accept esewa khalti imepay', a: 'Yes! We accept eSewa, Khalti, IME Pay, ConnectIPS, Bank Transfer, and Cash.' },
      { q: 'religious items statues stone grinder fragile', a: 'Yes, select "Religious Statues" or "Stone Grinder" under Cultural Items in Step 2. We handle all items with exceptional care.' }
    ]
  };

  function getLocalFallback(msg) {
    var m = (msg || '').toLowerCase().trim();
    m = m.replace(/[^a-z0-9\s]/g, '').trim();
    if (!m) return 'Please type a message! I can help with bookings, tracking, pricing, and more.';

    if (m.includes('hello') || m.startsWith('hi') || m === 'hey' || m.includes('namaste') || m.includes('hy') || m.includes('hlo')) {
      return 'Namaste! 🙏 How can I help you with your move today? Ask me about booking, pricing, provinces, or vehicles.';
    }
    if (m.includes('thank') || m.includes('thanks')) return 'You\'re welcome! 😊 Happy moving with MeroGhar!';
    if (m.includes('yes') || m.includes('ok') || m.includes('okay') || m.includes('sure')) return 'Great! Let me know if you have any specific questions.';
    if (m === 'help' || m.includes('commands') || m.includes('what can you do') || m.includes('menu') || m.includes('what can i ask') || m.includes('all questions') || m.includes('show questions')) {
      var helpText = 'Here are all the things I can help you with — tap "📋 All Questions" chip above to see them as buttons!\n\n';
      helpText += '📖 ABOUT: "What is MeroGhar?"\n';
      helpText += '📦 BOOKING: "How to book?"\n';
      helpText += '💰 PRICING: "What are the prices?"\n';
      helpText += '🚚 VEHICLES: "What trucks?"\n';
      helpText += '🏔 COVERAGE: "Which provinces?"\n';
      helpText += '💳 PAYMENTS: "Payment options?"\n';
      helpText += '📍 TRACKING: "Track my shipment"\n';
      helpText += '📋 SERVICES: "What services?"\n';
      helpText += '🛡️ INSURANCE: "Item insurance"\n';
      helpText += '📦 ADD-ONS: "Add-on services"\n';
      helpText += '❌ CANCEL: "Cancel booking"\n';
      helpText += '⭐ REVIEWS: "What do customers say?"\n';
      helpText += '📞 SUPPORT: "Contact support"\n\n';
      helpText += 'Type any question or tap a chip above!';
      return helpText;
    }

    if (m.includes('price') || m.includes('cost') || m.includes('rate') || m.includes('how much')) {
      var prices = [];
      for (var pi = 0; pi < KNOWLEDGE.services.length; pi++) {
        prices.push(KNOWLEDGE.services[pi].name + ': ' + KNOWLEDGE.services[pi].price);
      }
      return 'Our services:\n' + prices.join('\n') + '\n\nFinal quote depends on distance and items. Fill the booking form for an exact price.';
    }

    if (m.includes('what') || m.includes('who') || m.includes('which') || m.includes('how')) {
      if (m.includes('purpose') || m.includes('what is this') || m.includes('what is mero') || m.includes('describe') || m.includes('about this') || m.includes('what does this site')) {
        return 'MeroGhar Logistics is Nepal\'s trusted household moving service. We connect you with verified movers across all 7 provinces and 77 districts of Nepal. Book a truck, track your shipment, and pay via eSewa, Khalti, or cash. We handle everything from narrow Kathmandu lanes to inter-province moves, including furniture disassembly, packing, and auspicious timing. Ask me "How to book?" to get started!';
      }
      if (m.includes('book') || m.includes('move')) {
        return 'To book a move: Fill the form with pickup/drop locations, select items and vehicle, choose a mover, pick a date, and confirm. You\'ll get a quote within 2 hours.';
      }
      if (m.includes('pric') || m.includes('cost') || m.includes('rate')) {
        return 'Pricing is based on distance, item volume, vehicle type, and add-on services. Use the booking form to get an instant quote.';
      }
      if (m.includes('long') || m.includes('time') || m.includes('duration')) {
        return 'Delivery time depends on distance and route conditions. Our coordinator will give you an estimated window after booking.';
      }
    }

    if (m.includes('book') || m.includes('order') || m.includes('shift') || m.includes('schedule')) {
      return 'To book: fill in pickup/drop locations, select items and vehicle, choose a mover, pick a date, and confirm. Get a quote within 2 hours.';
    }
    if (m.includes('track') || m.includes('status') || m.includes('where is') || m.includes('delivery')) {
      return 'Track your shipment in real-time via "My Bookings" in the app. Tap on the shipment to see your driver\'s location.';
    }
    if (m.includes('payment') || m.includes('pay') || m.includes('khalti') || m.includes('esewa') || m.includes('cash')) {
      return 'We accept: ' + KNOWLEDGE.payments.join(', ') + '. Choose your preferred method during checkout.';
    }
    if (m.includes('cancel') || m.includes('refund')) {
      return 'To cancel a booking, contact our support team. Refunds are processed on a case-by-case basis.';
    }
    if (m.includes('vehicle') || m.includes('truck') || m.includes('tempo') || m.includes('transport')) {
      var vLines = [];
      for (var vi = 0; vi < KNOWLEDGE.vehicles.length; vi++) {
        vLines.push(KNOWLEDGE.vehicles[vi].name + ' (' + KNOWLEDGE.vehicles[vi].price + ') — ' + KNOWLEDGE.vehicles[vi].best);
      }
      return 'Available vehicles:\n' + vLines.join('\n') + '\n\nNeed help choosing? Use "Let MeroGhar Recommend" in the form.';
    }
    if (m.includes('fragile') || m.includes('glass') || m.includes('breakable') || m.includes('religious') || m.includes('statue') || m.includes('stone grinder')) {
      return 'Yes! Mark fragile items during booking (Step 2). Select "Religious Statues" or "Stone Grinder" under Cultural Items. Our team handles everything with special care.';
    }
    if (m.includes('contact') || m.includes('support') || m.includes('phone') || m.includes('viber') || m.includes('email')) {
      return 'Contact MeroGhar:\n📞 ' + KNOWLEDGE.site.phone + '\n💬 Viber: ' + KNOWLEDGE.site.phone + '\n📧 ' + KNOWLEDGE.site.email + '\n\nOr use the Help section in the app.';
    }
    if (m.includes('province') || m.includes('district') || m.includes('cover') || m.includes('area') || m.includes('nepal') || m.includes('location')) {
      return 'MeroGhar covers all 7 provinces of Nepal:\n' + KNOWLEDGE.provinces.join('\n') + '\n\nAll 77 districts covered!';
    }
    if (m.includes('insur') || m.includes('protect') || m.includes('damage')) {
      return 'Item Insurance is available from NPR 1,200. Full-replacement coverage on all items moved. Select it as an add-on in Step 3.';
    }
    if (m.includes('addon') || m.includes('packing') || m.includes('disassembly') || m.includes('porter') || m.includes('labor') || m.includes('helper')) {
      var addonLines = [];
      for (var ai = 0; ai < KNOWLEDGE.addons.length; ai++) {
        addonLines.push(KNOWLEDGE.addons[ai].name + ' — ' + KNOWLEDGE.addons[ai].desc);
      }
      return 'Add-on services:\n' + addonLines.join('\n');
    }
    if (m.includes('service') || m.includes('offer') || m.includes('provide')) {
      var sLines = [];
      for (var si = 0; si < KNOWLEDGE.services.length; si++) {
        sLines.push(KNOWLEDGE.services[si].name + ' — ' + KNOWLEDGE.services[si].price);
      }
      return 'MeroGhar services:\n' + sLines.join('\n');
    }
    if (m.includes('step') || m.includes('form') || m.includes('process')) {
      return KNOWLEDGE.howItWorks.join('\n');
    }
    if (m.includes('rating') || m.includes('review') || m.includes('trust') || m.includes('reliable')) {
      return 'MeroGhar has 4.8 stars from 6,000+ verified reviews. 97% on-time rate with 250+ verified providers across Nepal.';
    }

    for (var fi = 0; fi < KNOWLEDGE.faq.length; fi++) {
      var tokens = KNOWLEDGE.faq[fi].q.split(' ');
      var matched = 0;
      for (var tj = 0; tj < tokens.length; tj++) {
        if (tokens[tj].length > 2 && m.includes(tokens[tj])) matched++;
      }
      if (matched >= 2) return KNOWLEDGE.faq[fi].a + '\n\nLet me know if you have more questions!';
    }

    return 'I\'m here to help with MeroGhar Logistics — bookings, pricing, tracking, vehicles, provinces, and more. Ask "How to book?" or "What are the prices?" or type "help" for options.';
  }

  var ACTIONS = [
    {
      patterns: ['book a move', 'booking form', 'go to booking', 'start booking', 'new booking', 'schedule move', 'shift my items', 'want to move', 'open booking'],
      intent: 'redirect', target: '/src/pages/user.html',
      requiresAuth: false, message: 'Opening the booking form...'
    },
    {
      patterns: ['my bookings', 'my orders', 'track', 'tracking', 'my shipment', 'where is my shipment', 'shipment status', 'my moves', 'my booking'],
      intent: 'redirect', target: '/src/pages/user.html',
      requiresAuth: true, role: 'user',
      message: 'Redirecting to your dashboard...'
    },
    {
      patterns: ['login', 'sign in', 'log in', 'login page', 'go to login'],
      intent: 'redirect', target: '/src/pages/login.html',
      requiresAuth: false, message: 'Redirecting to login...'
    },
    {
      patterns: ['sign up', 'register', 'create account', 'new account', 'signup'],
      intent: 'redirect', target: '/src/pages/signup.html',
      requiresAuth: false, message: 'Redirecting to signup...'
    },
    {
      patterns: ['admin panel', 'go to admin', 'admin dashboard', 'admin page'],
      intent: 'redirect', target: '/src/pages/admin.html',
      requiresAuth: true, role: 'admin',
      message: 'Redirecting to admin panel...'
    },
    {
      patterns: ['vendor portal', 'vendor dashboard', 'vendor page', 'my vendor'],
      intent: 'redirect', target: '/src/pages/vendor.html',
      requiresAuth: true, role: 'vendor',
      message: 'Redirecting to vendor portal...'
    }
  ];

  function validateAction(action) {
    if (!action.requiresAuth) return { valid: true };
    try {
      var userData = localStorage.getItem('meroGharUser');
      if (!userData) return { valid: false, message: 'Please log in first. Type "Login" to go to the login page.' };
      var user = JSON.parse(userData);
      if (!user || !user.role) return { valid: false, message: 'Session expired. Please log in again.' };
      if (action.role && user.role !== action.role) return { valid: false, message: 'This feature requires a ' + action.role + ' account. Your current role is ' + user.role + '.' };
      return { valid: true };
    } catch (e) {
      return { valid: false, message: 'Session error. Please log in again.' };
    }
  }

  function matchAction(text) {
    var m = (text || '').toLowerCase().trim();
    for (var i = 0; i < ACTIONS.length; i++) {
      var action = ACTIONS[i];
      for (var j = 0; j < action.patterns.length; j++) {
        if (m.includes(action.patterns[j])) return action;
      }
    }
    return null;
  }

  function renderAllQuestions() {
    var msgs = document.getElementById('mg-chat-msgs');
    if (!msgs) return;
    var botMsg = document.createElement('div');
    botMsg.style.cssText = 'align-self:flex-start;max-width:100%;background:rgba(255,255,255,0.06);border-radius:12px 12px 12px 4px;padding:12px 14px;font-size:12px;line-height:1.5;color:rgba(238,242,238,0.9);margin-bottom:6px';
    botMsg.textContent = 'Here are all the questions I can answer — tap any to ask!';
    msgs.appendChild(botMsg);
    for (var ci = 0; ci < ALL_QUESTIONS.length; ci++) {
      var cat = ALL_QUESTIONS[ci];
      var catLabel = document.createElement('div');
      catLabel.textContent = cat.category;
      catLabel.style.cssText = 'font-size:11px;font-weight:700;color:#f8c06a;margin:10px 0 4px;padding:0 2px;letter-spacing:0.5px';
      msgs.appendChild(catLabel);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px';
      for (var qi = 0; qi < cat.questions.length; qi++) {
        var chip = document.createElement('button');
        chip.textContent = cat.questions[qi];
        chip.style.cssText = 'padding:5px 10px;border-radius:14px;border:1px solid rgba(248,192,106,0.2);background:rgba(248,192,106,0.05);color:#eef2ee;font-size:10px;cursor:pointer;white-space:nowrap;transition:background 0.15s';
        chip.addEventListener('mouseenter', function () { this.style.background = 'rgba(248,192,106,0.15)'; });
        chip.addEventListener('mouseleave', function () { this.style.background = 'rgba(248,192,106,0.05)'; });
        chip.addEventListener('click', function () {
          var input = document.getElementById('mg-chat-input');
          if (!input) return;
          input.value = this.textContent;
          sendMessage();
        });
        row.appendChild(chip);
      }
      msgs.appendChild(row);
    }
    scrollToBottom();
  }

  function renderChips() {
    var msgs = document.getElementById('mg-chat-msgs');
    if (!msgs) return;
    var chips = [
      { label: '📖 Book a Move', text: 'Book a move' },
      { label: '📍 Track', text: 'Track my shipment' },
      { label: '💰 Pricing', text: 'What are the prices' },
      { label: '💳 Payments', text: 'Payment options' },
      { label: '📋 All Questions', text: '__all_questions__' },
      { label: '🔐 Login', text: 'Login' },
      { label: '❓ Help', text: 'help' }
    ];
    var container = document.createElement('div');
    container.id = 'mg-chips';
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 6px';
    for (var i = 0; i < chips.length; i++) {
      var btn = document.createElement('button');
      btn.textContent = chips[i].label;
      btn.dataset.text = chips[i].text;
      btn.style.cssText = 'padding:5px 12px;border-radius:16px;border:1px solid rgba(248,192,106,0.25);background:rgba(248,192,106,0.06);color:#eef2ee;font-size:11px;cursor:pointer;white-space:nowrap;transition:background 0.15s';
      btn.addEventListener('mouseenter', function () { this.style.background = 'rgba(248,192,106,0.15)'; });
      btn.addEventListener('mouseleave', function () { this.style.background = 'rgba(248,192,106,0.06)'; });
      btn.addEventListener('click', function () {
        var input = document.getElementById('mg-chat-input');
        if (!input) return;
        if (this.dataset.text === '__all_questions__') {
          renderAllQuestions();
          return;
        }
        input.value = this.dataset.text;
        sendMessage();
      });
      container.appendChild(btn);
    }
    msgs.appendChild(container);
    scrollToBottom();
  }

  function renderChatHistory() {
    var msgs = document.getElementById('mg-chat-msgs');
    if (!msgs) return;
    msgs.innerHTML = '';
    var greeting = document.createElement('div');
    greeting.className = 'mg-msg mg-bot';
    greeting.style.cssText = 'align-self:flex-start;max-width:85%;background:rgba(255,255,255,0.06);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;line-height:1.5;color:rgba(238,242,238,0.9)';
    greeting.textContent = 'Namaste! 🙏 I\'m MeroBot, your AI assistant for MeroGhar Logistics. Ask me about booking, tracking, pricing, or anything else!';
    msgs.appendChild(greeting);
    if (chatHistory.length === 0) {
      renderChips();
    }
    for (var i = 0; i < chatHistory.length; i++) {
      addMessage(chatHistory[i].text, chatHistory[i].role === 'user' ? 'user' : 'bot');
    }
  }

  function sendMessage() {
    if (isSending) return;
    var input = document.getElementById('mg-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    input.value = '';

    var action = matchAction(text);
    if (action) {
      var validation = validateAction(action);
      if (!validation.valid) {
        addMessage(text, 'user');
        addMessage(validation.message, 'bot');
        return;
      }
      addMessage(text, 'user');
      addMessage(action.message, 'bot');
      setTimeout(function () {
        window.location.href = action.target;
      }, 800);
      return;
    }

    addMessage(text, 'user');
    chatHistory.push({ role: 'user', text: text });
    isSending = true;
    showTyping();

    console.log('[MeroBot] Sending:', text);
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
        console.log('[MeroBot] Response:', data);
        var reply = data.response || data.reply || data.message || getLocalFallback(text);
        addMessage(reply, 'bot');
        chatHistory.push({ role: 'model', text: reply });
      })
      .catch(function (err) {
        hideTyping();
        isSending = false;
        console.warn('[MeroBot] Fetch failed, using local fallback:', err);
        var fallback = getLocalFallback(text);
        addMessage(fallback, 'bot');
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
      isOpen = true;
      panel.style.display = 'flex';
      btn.style.display = 'none';
      renderChatHistory();
      setTimeout(function () {
        if (input) input.focus();
      }, 300);
    });

    function closePanel() {
      isOpen = false;
      panel.style.display = 'none';
      btn.style.display = 'flex';
      chatHistory = [];
    }

    if (close) {
      close.addEventListener('click', closePanel);
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
