import { getContextForQuery, getFAQ } from '../utils/knowledgeSearch.js';

const CHATBOT_CATEGORIES = [
  {
    name: 'About',
    questions: [
      {
        q: 'What is ShiftSathi Logistics?',
        a: "ShiftSathi Logistics is Nepal's trusted household moving service. We connect you with verified, rated movers across all 7 provinces and 77 districts of Nepal. Book a truck, track your shipment, and pay via eSewa, Khalti, or cash — we handle everything from narrow Kathmandu lanes to inter-province moves, including packing, furniture disassembly, and auspicious timings. Ask me 'How do I book a move?' to get started!",
      },
      {
        q: 'What services does ShiftSathi offer in Nepal?',
        a: 'ShiftSathi offers these services:\n\n🚛 Full-Service Moving (From NPR 15,000)\n📦 Pack & Load Only (From NPR 7,500)\n🛺 Cargo Tempo / Valley Move (From NPR 2,500)\n🔧 Furniture Disassembly (From NPR 2,500)\n🛡️ Item Insurance (From NPR 1,200)\n\nBook with us and get a free quote within 2 hours!',
      },
    ],
  },
  {
    name: 'Booking',
    questions: [
      {
        q: 'How do I book a move?',
        a: 'To book a move with ShiftSathi:\n1. Fill in pickup/drop locations\n2. Select your home size and items\n3. Choose a vehicle\n4. Pick a mover or use auto-match\n5. Pick your move date and time\n6. Enter contact details and payment method\n\nOur coordinator will call within 2 hours with your NPR quote!',
      },
      {
        q: 'Do I need an account to book?',
        a: 'Yes — log in or create a free account first. The booking form then pre-fills your name and email. Completing the whole form takes under 3 minutes.',
      },
      {
        q: 'What should I prepare before booking?',
        a: 'Before booking, decide your pickup and drop locations (province, district, city), estimate your home size and the items to move, pick a preferred move date and time, and choose a payment method (eSewa, Khalti, IME Pay, ConnectIPS, or cash). Your quote follows within 2 hours.',
      },
      {
        q: 'Can I book a move for someone else?',
        a: "Yes. Fill in the booking form with the actual pickup and drop locations and use the recipient's contact details (name, mobile, email) so the mover and coordinator can reach them directly. You can pay with any accepted method.",
      },
    ],
  },
  {
    name: 'Pricing & Quote',
    questions: [
      {
        q: 'What are your price ranges?',
        a: 'Pricing depends on distance, item volume, vehicle type, and add-ons.\n\nStarting ranges:\n- Full-Service Moving: From NPR 15,000\n- Pack & Load Only: From NPR 7,500\n- Cargo Tempo / Valley Move: From NPR 2,500\n- Furniture Disassembly: From NPR 2,500\n- Item Insurance: From NPR 1,200\n\nUse the booking form to get an exact quote for your move.',
      },
      {
        q: 'How much does a 1 BHK move cost?',
        a: 'A typical 1 BHK move in Kathmandu Valley runs about NPR 4,000–8,000 with a Cargo Tempo or small truck, depending on distance and add-ons. The booking form gives you an exact estimate for your move.',
      },
      {
        q: 'How quickly will I receive my quote?',
        a: 'Our coordinator calls you within 2 hours of submitting the booking form with a confirmed NPR quote. Early auspicious starts and convenient timings are accommodated.',
      },
      {
        q: 'Can the final quote change after booking?',
        a: 'The quote shown on the form is an estimate. Your mover confirms the final quote after reviewing your items and distance, and you approve it before move day. If the shipment changes significantly, the mover agrees any adjustment with you first.',
      },
    ],
  },
  {
    name: 'Vehicles',
    questions: [
      {
        q: 'What vehicle options do you have?',
        a: 'ShiftSathi offers these vehicle options:\n\n🛺 Cargo Tempo (NPR 400–500) — Best for narrow lanes, 1–2 rooms\n🚐 Tata Ace / Small Truck (NPR 800–1200) — Best for 2 BHK\n🚚 Mini Truck 407 (NPR 1500–2000) — Most popular, best for 3 BHK\n🛻 Large Truck + Helpers (NPR 2000+) — Best for large houses\n\nChoose during Step 3 of the booking form.',
      },
      {
        q: 'How do I choose the right vehicle for my home size?',
        a: 'General guide: Cargo Tempo — narrow lanes, 1–2 rooms; Tata Ace / Small Truck — 2 BHK; Mini Truck 407 — most popular, best for 3 BHK; Large Truck + Helpers — large houses. You can also let ShiftSathi recommend the best fit in Step 3.',
      },
      {
        q: 'Are a driver and helpers included?',
        a: "Yes. Every mover provides a driver, and helper(s) are included with the truck options. Need extra hands for stairs or heavy loads? Add the 'Extra Porter / Labor' add-on when booking.",
      },
    ],
  },
  {
    name: 'Coverage',
    questions: [
      {
        q: 'Which provinces and districts do you cover?',
        a: 'ShiftSathi covers ALL 7 provinces and 77 districts of Nepal!\n\n🏔️ Koshi — 14 districts (Biratnagar, Dharan, Ilam)\n🌾 Madhesh — 8 districts (Janakpur, Birgunj)\n🏙️ Bagmati — 13 districts (Kathmandu, Lalitpur, Bhaktapur) Most Active\n🏞️ Gandaki — 11 districts (Pokhara, Gorkha)\n🌳 Lumbini — 12 districts (Butwal, Rupandehi)\n🏔️ Karnali — 10 districts (Surkhet, Jumla)\n🌄 Sudurpashchim — 9 districts (Dhangadhi, Mahendranagar)',
      },
      {
        q: 'Do you move within Kathmandu Valley?',
        a: 'Yes! Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur) is our most active region — we handle narrow lanes, no-parking streets, and multi-floor apartments daily with Cargo Tempos and small trucks.',
      },
      {
        q: "Can you navigate Kathmandu's narrow lanes?",
        a: "Yes. Our Cargo Tempo and Tata Ace are sized to handle narrow Kathmandu lanes and restricted streets. Add your specific access details (lane, floor, ward) when booking so the crew comes prepared.",
      },
      {
        q: 'Do you handle inter-province moves?',
        a: 'Yes, we move between all 7 provinces and 77 districts of Nepal, using Mini Trucks and Large Trucks for longer hauls. The quote is based on distance and volume.',
      },
    ],
  },
  {
    name: 'Services & Add-ons',
    questions: [
      {
        q: 'Do you provide packing material?',
        a: 'Yes — the Packing Service provides bubble wrap, rope, boxes, and blankets. Add it during booking (Step 3 of the form).',
      },
      {
        q: 'Do you disassemble and reassemble furniture?',
        a: 'Yes. The Furniture Disassembly add-on takes apart beds, wardrobes, and desks, and reassembles them at your new home.',
      },
      {
        q: 'Do you provide extra porters or labor?',
        a: 'Yes — the Porter / Labor add-on provides extra manual help for stairs, narrow access, or heavy items.',
      },
      {
        q: 'Do you offer item insurance?',
        a: 'Yes — Item Insurance covers the full value of your moved items, from NPR 1,200, protecting against damage or loss during the move.',
      },
    ],
  },
  {
    name: 'Payments',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept 💜 eSewa, 🟣 Khalti, IME Pay, ConnectIPS, Bank Transfer, and 💵 Cash on move day. A small token payment via your digital method confirms the booking; the balance is paid on move day.',
      },
      {
        q: 'How do I pay with eSewa or Khalti?',
        a: 'Select eSewa or Khalti as your payment method. After submitting the booking, a secure payment overlay opens and you complete the token payment with your eSewa/Khalti number and password.',
      },
      {
        q: 'Can I pay in cash?',
        a: 'Yes — choose Cash as your payment method and pay your mover directly on move day (on delivery).',
      },
      {
        q: 'When do I pay the balance?',
        a: 'A small token payment is collected online to confirm the booking. The remaining balance is paid on move day after the move is complete — in cash or online.',
      },
    ],
  },
  {
    name: 'Tracking & Special Items',
    questions: [
      {
        q: 'How do I track my shipment?',
        a: "Open 'My Bookings' in the app — the status shows whether your move is pending, confirmed, in transit, or delivered. You can also chat with your assigned mover directly from the booking.",
      },
      {
        q: 'How will I know which mover is assigned to me?',
        a: "Once a mover is matched to your booking, their name and rating appear on the booking details in 'My Bookings', and you can chat with them there.",
      },
      {
        q: 'Can you move fragile or glass items?',
        a: 'Yes — mark fragile items during booking (Step 2). Our team uses bubble wrap and careful manual handling, and we recommend Item Insurance for glassware.',
      },
      {
        q: 'Can you safely move religious statues and stone grinders?',
        a: "Yes — select 'Religious Statues' or 'Stone Grinder' under Cultural Items when booking. Our team uses specialized wrapping and careful manual handling for these items.",
      },
    ],
  },
  {
    name: 'Timing & Cancellation',
    questions: [
      {
        q: 'Do you accommodate auspicious move timings?',
        a: 'Yes! We happily plan moves around auspicious dates and times (साइत). Note your preferred timing in the booking notes and we will schedule the crew accordingly.',
      },
      {
        q: 'Can I move on weekends?',
        a: 'Yes, weekend moves are available. Pick your preferred date in the booking form — weekends book up fast, so schedule early.',
      },
      {
        q: 'What is your cancellation or refund policy?',
        a: "To cancel a booking, contact our support team through the app's help section or call us. Refunds of the token payment are processed on a case-by-case basis depending on how close the cancellation is to move day.",
      },
    ],
  },
  {
    name: 'Support & Trust',
    questions: [
      {
        q: 'How can I contact support?',
        a: 'Contact ShiftSathi:\n📞 Phone: +977 980-000-000\n💬 Viber: +977 980-000-000\n📧 Email: info@shiftsathi.com.np\n\nOr use the Help & Support section in the app.',
      },
      {
        q: 'Are the movers verified and reliable?',
        a: 'ShiftSathi has 250+ verified providers across Nepal. Each mover is rated after every job, so you can pick a trusted mover — check ratings when choosing in the booking form.',
      },
    ],
  },
];

const normalizeText = (text) =>
  (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const findIntent = (message) => {
  const normalized = normalizeText(message);
  if (!normalized) return '';
  for (const category of CHATBOT_CATEGORIES) {
    for (const qa of category.questions) {
      if (normalizeText(qa.q) === normalized) return qa.a;
    }
  }
  return '';
};

export const getQuestions = (req, res) => {
  const categories = CHATBOT_CATEGORIES.map((c) => ({
    name: c.name,
    questions: c.questions.map((qa) => qa.q),
  }));
  res.json({ success: true, categories });
};

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const intent = findIntent(message);
    if (intent) {
      return res.json({ success: true, response: intent });
    }
    const context = getContextForQuery(message);
    const faq = getFAQ();
    const reply = generateKnowledgeResponse(message, context, faq);
    res.json({ success: true, response: reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    const ctx = getContextForQuery(req.body?.message || '');
    const f = getFAQ();
    res.json({ success: true, response: generateKnowledgeResponse(req.body?.message || '', ctx, f) });
  }
};

function extractAnswerFromContext(context) {
  var lines = context.split('\n').filter(function (l) { return l.trim().length > 0; });
  if (lines.length === 0) return '';

  var bestLine = lines[0];
  var answerPart = '';

  var aIdx = bestLine.indexOf('A:');
  if (aIdx >= 0) {
    answerPart = bestLine.substring(aIdx + 2).trim();
  } else {
    var numIdx = bestLine.indexOf('.');
    if (numIdx >= 0 && numIdx < 4) {
      answerPart = bestLine.substring(numIdx + 1).trim();
    } else {
      answerPart = bestLine;
    }
    answerPart = answerPart.replace(/^(FAQ|Services|Reviews):\s*/i, '');
    answerPart = answerPart.replace(/^Q:\s*/i, '');
  }

  answerPart = answerPart.replace(/\d+\.\s*/g, '').trim();
  if (answerPart.length > 10) {
    return answerPart.substring(0, 350);
  }
  return '';
}

function matchFAQ(msg, faq) {
  if (!faq) return '';
  for (var i = 0; i < faq.length; i++) {
    var lowerQ = faq[i].question.toLowerCase();
    var qTokens = lowerQ.split(' ');
    var matchCount = 0;
    for (var j = 0; j < qTokens.length; j++) {
      if (qTokens[j].length > 3 && msg.includes(qTokens[j])) {
        matchCount++;
      }
    }
    if (matchCount >= 2) {
      return faq[i].answer;
    }
  }
  return '';
}

function generateKnowledgeResponse(message, context, faq) {
  var msg = (message || '').toLowerCase().trim();
  msg = msg.replace(/[^a-z0-9\s]/g, '').trim();

  if (!msg) {
    return 'Please type a message! I can help with bookings, tracking, pricing, and more.';
  }

  if (msg.includes('hello') || msg.startsWith('hi') || msg === 'hey' || msg.includes('namaste') || msg.includes('hy') || msg.includes('hlo')) {
    return 'Namaste! 🙏 How can I help you with your move today? I can answer questions about booking, pricing, provinces, vehicles, and more.';
  }

  if (msg.includes('thank') || msg.includes('thanks')) {
    return "You're welcome! 😊 Happy moving with ShiftSathi!";
  }

  if (msg === 'help' || msg.includes('commands') || msg.includes('what can you do') || msg.includes('menu') || msg.includes('what can i ask') || msg.includes('all questions') || msg.includes('show questions')) {
    var helpText = "Here are all the questions I can answer — type any of them!\n\n";
    helpText += "📖 ABOUT: \"What is ShiftSathi?\", \"Purpose of this site?\"\n";
    helpText += "📦 BOOKING: \"How to book?\", \"Schedule my move\"\n";
    helpText += "💰 PRICING: \"What are the prices?\", \"How much does it cost?\"\n";
    helpText += "🚚 VEHICLES: \"What trucks do you have?\", \"Which vehicle to choose?\"\n";
    helpText += "🏔 COVERAGE: \"Which provinces?\", \"Do you cover my area?\"\n";
    helpText += "💳 PAYMENTS: \"Payment options?\", \"How to pay via eSewa?\"\n";
    helpText += "📍 TRACKING: \"Track my shipment\", \"Where is my order?\"\n";
    helpText += "📋 SERVICES: \"What services?\", \"Add-on services\"\n";
      helpText += "🛡️ INSURANCE: \"Item insurance\", \"Damage coverage\"\n";
      helpText += "📦 ADD-ONS: \"Packing service\"\n";
      helpText += "❌ CANCEL: \"Cancel booking\", \"Refund policy\"\n";
    helpText += "⭐ REVIEWS: \"Customer reviews\", \"Ratings\"\n";
    helpText += "📞 SUPPORT: \"Contact support\", \"Phone number\"\n\n";
    helpText += "Just type your question!";
    return helpText;
  }

  if (msg.includes('purpose') || msg.includes('what is this') || msg.includes('what is mero') || msg.includes('what is shift') || msg.includes('describe') || msg.includes('about this') || msg.includes('what does this') || msg.includes('tell me about') || msg.includes('what kind of')) {
    return 'ShiftSathi Logistics is Nepal\'s trusted household moving service. We connect you with verified movers across all 7 provinces and 77 districts of Nepal. Book a truck, track your shipment, and pay via eSewa, Khalti, or cash. We handle everything from narrow Kathmandu lanes to inter-province moves, including furniture disassembly, packing, and auspicious timing. Ask me "How to book?" to get started!';
  }

  if (msg.includes('book') || msg.includes('order') || msg.includes('shift') || msg.includes('schedule') || (msg.includes('how') && msg.includes('move'))) {
    return 'To book a move with ShiftSathi:\n1. Fill in pickup/drop locations (Step 1)\n2. Select your items (Step 2)\n3. Choose a vehicle (Step 3)\n4. Pick a mover or use auto-match (Step 4)\n5. Choose your move date (Step 5)\n6. Enter contact details and payment method (Step 6)\n\nYour chosen mover (or the best auto-matched mover) is assigned instantly — no admin approval needed. Our coordinator will call within 2 hours with your NPR quote!';
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') || msg.includes('how much') || msg.includes('quote')) {
    return 'Our pricing is based on distance, item volume, vehicle type, and add-on services.\n\nService price ranges:\n- Full-Service Moving: From NPR 15,000\n- Pack & Load Only: From NPR 7,500\n- Cargo Tempo / Valley Move: From NPR 2,500\n- Furniture Disassembly: From NPR 2,500\n- Item Insurance: From NPR 1,200\n\nUse the booking form to get an exact quote for your move!';
  }

  if (msg.includes('vehicle') || msg.includes('truck') || msg.includes('tempo') || msg.includes('transport')) {
    return 'ShiftSathi offers these vehicle options:\n\n🛺 Cargo Tempo (NPR 400-500) — Best for narrow lanes, 1-2 rooms\n🚐 Tata Ace / Small Truck (NPR 800-1200) — Best for 2 BHK\n🚚 Mini Truck 407 (NPR 1500-2000) — Most popular, best for 3 BHK\n🛻 Large Truck + Helpers (NPR 2000+) — Best for large houses\n🤔 Let ShiftSathi Recommend — We pick the right vehicle for you\n\nChoose during Step 3 of the booking form.';
  }

  if (msg.includes('addon') || msg.includes('pack') || msg.includes('disassembly') || msg.includes('porter') || msg.includes('insurance') || msg.includes('protect') || msg.includes('extra') || msg.includes('coverage') || msg.includes('damage')) {
    return 'Available add-on services:\n\n📦 Packing Service — Bubble wrap, rope, and boxes provided\n🔧 Furniture Disassembly — Taken apart and reassembled at new home\n👷 Porter / Labor Help — Extra manual labor for stairs or narrow access\n🛡️ Item Insurance — Full-value coverage on all moved items (from NPR 1,200)\n\nSelect these in Step 3 of the booking form!';
  }

  if (msg.includes('service') || msg.includes('offer') || msg.includes('provide')) {
    return 'ShiftSathi offers these services:\n\n🚛 Full-Service Moving (From NPR 15,000)\n📦 Pack & Load Only (From NPR 7,500)\n🛺 Cargo Tempo / Valley Move (From NPR 2,500)\n🔧 Furniture Disassembly (From NPR 2,500)\n🛡️ Item Insurance (From NPR 1,200)\n\nBook now and get a free quote within 2 hours!';
  }

  if (msg.includes('province') || msg.includes('district') || msg.includes('cover') || msg.includes('area') || msg.includes('nepal') || msg.includes('location')) {
    return 'ShiftSathi covers ALL 7 provinces and 77 districts of Nepal!\n\n🏔️ Koshi — 14 districts (Biratnagar, Dharan, Ilam)\n🌾 Madhesh — 8 districts (Janakpur, Birgunj)\n🏙️ Bagmati — 13 districts (Kathmandu, Lalitpur, Bhaktapur) Most Active\n🏞️ Gandaki — 11 districts (Pokhara, Gorkha)\n🌳 Lumbini — 12 districts (Butwal, Rupandehi)\n🏔️ Karnali — 10 districts (Surkhet, Jumla)\n🌄 Sudurpashchim — 9 districts (Dhangadhi, Mahendranagar)\n\nEnter your pickup and drop locations in the booking form!';
  }

  if (msg.includes('payment') || msg.includes('pay') || msg.includes('esewa') || msg.includes('khalti') || msg.includes('cash')) {
    return 'We accept: 💜 eSewa, 🟣 Khalti, IME Pay, ConnectIPS, Bank Transfer, and Cash on Move Day.\n\nA small token payment is collected via your chosen digital method to confirm the booking. The remaining balance is paid on move day.';
  }

  if (msg.includes('track') || msg.includes('status') || msg.includes('where is') || msg.includes('delivery')) {
    return 'You can check your shipment status under "My Bookings" in the app. The status shows whether your move is pending, confirmed, in transit, or delivered.';
  }

  if (msg.includes('fragile') || msg.includes('glass') || msg.includes('breakable') || msg.includes('religious') || msg.includes('statue') || msg.includes('stone') || msg.includes('special') || msg.includes('cultural') || msg.includes('prayer') || msg.includes('grinder')) {
    return 'Yes! Mark fragile items during booking (Step 2). For religious items, select "Religious Statues" or "Stone Grinder" under Cultural Items. Our team treats all items with exceptional care, using specialized wrapping and careful manual handling.';
  }

  if (msg.includes('cancel') || msg.includes('refund')) {
    return 'To cancel a booking, please contact our support team through the app\'s help section or reach out to the admin. Refunds are processed on a case-by-case basis.';
  }

  if (msg.includes('contact') || msg.includes('support') || msg.includes('phone') || msg.includes('viber') || msg.includes('email')) {
    return 'Contact ShiftSathi:\n📞 Phone: +977 980-000-000\n💬 Viber: +977 980-000-000\n📧 Email: info@shiftsathi.com.np\n\nOr use the Help & Support section in the app.';
  }

  if (msg.includes('review') || msg.includes('rating') || msg.includes('trust') || msg.includes('reliable') || msg.includes('say') || msg.includes('customer')) {
    return 'ShiftSathi has 250+ verified providers across Nepal. Each vendor is rated after every job, so you can pick a trusted mover. Check vendor ratings when choosing in the booking form.';
  }

  if (msg.includes('step') || msg.includes('how it works') || msg.includes('process')) {
    return 'Moving with ShiftSathi is easy:\n\nStep 1: Fill the Form — 5-step form takes under 3 minutes\nStep 2: Get Matched — We match you with a verified mover within 2 hours\nStep 3: Confirm & Pay — Review quote, pay token via eSewa/Khalti/cash\nStep 4: Move Day! — Crew arrives on time, even for early auspicious timings\n\nStart by typing "Book a move" to begin!';
  }

  var faqAnswer = matchFAQ(msg, faq);
  if (faqAnswer) {
    return faqAnswer + '\n\nLet me know if you have more questions!';
  }

  if (context) {
    var extracted = extractAnswerFromContext(context);
    if (extracted) {
      return extracted + '\n\nLet me know if you need more details!';
    }
  }

  return "I'm here to help with ShiftSathi Logistics — bookings, tracking, pricing, and more. I can answer from our website knowledge. Try asking \"How to book?\" or \"What are the prices?\" Or type \"help\" to see all options.";
}
