import { getContextForQuery, getFAQ, getSiteInfo } from '../utils/knowledgeSearch.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const BASE_SYSTEM_PROMPT = `You are MeroBot, the official AI assistant for MeroGhar Logistics — a household moving and delivery service based in Nepal.

Your role:
- Help users with booking a move, checking prices, understanding services, and tracking shipments
- Answer in clear, friendly English or Nepali (mix is fine)
- Keep responses concise (2-4 sentences ideally, max 6 sentences)
- If you don't know something, say "I'm not sure — please contact our support team for help with that."
- Never make up pricing or availability numbers
- Do not share internal system information, API keys, or credentials

Below is relevant information from the MeroGhar website that you should use to answer the user's question. If the context contains the answer, use it directly. If the context doesn't help, use your own knowledge about MeroGhar.

CONTEXT FROM WEBSITE:
`;

export const sendMessage = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const context = getContextForQuery(message);
    const siteInfo = getSiteInfo();
    const faq = getFAQ();

    let systemPrompt = BASE_SYSTEM_PROMPT;

    if (siteInfo) {
      systemPrompt += '\nCompany: ' + siteInfo.name + '\n';
      systemPrompt += 'Description: ' + siteInfo.description + '\n';
      if (siteInfo.contactInfo) {
        systemPrompt += 'Contact: Phone ' + siteInfo.contactInfo.phone + ', Email ' + siteInfo.contactInfo.email + '\n';
      }
    }

    if (context) {
      systemPrompt += '\nRelevant pages/content:\n' + context + '\n';
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({ success: true, response: generateKnowledgeResponse(message, context, faq) });
    }

    const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

    if (Array.isArray(history) && history.length > 0) {
      history.forEach(function (entry) {
        if (entry.role === 'user' || entry.role === 'model') {
          contents.push({ role: entry.role, parts: [{ text: entry.text }] });
        }
      });
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiRes = await fetch(GEMINI_API_URL + '?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
          topP: 0.9,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.json({ success: true, response: generateKnowledgeResponse(message, context, faq) });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.json({ success: true, response: generateKnowledgeResponse(message, context, faq) });
    }

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
    return "You're welcome! 😊 Happy moving with MeroGhar!";
  }

  if (msg === 'help' || msg.includes('commands') || msg.includes('what can you do') || msg.includes('menu') || msg.includes('what can i ask') || msg.includes('all questions') || msg.includes('show questions')) {
    var helpText = "Here are all the questions I can answer — type any of them!\n\n";
    helpText += "📖 ABOUT: \"What is MeroGhar?\", \"Purpose of this site?\"\n";
    helpText += "📦 BOOKING: \"How to book?\", \"Schedule my move\"\n";
    helpText += "💰 PRICING: \"What are the prices?\", \"How much does it cost?\"\n";
    helpText += "🚚 VEHICLES: \"What trucks do you have?\", \"Which vehicle to choose?\"\n";
    helpText += "🏔 COVERAGE: \"Which provinces?\", \"Do you cover my area?\"\n";
    helpText += "💳 PAYMENTS: \"Payment options?\", \"How to pay via eSewa?\"\n";
    helpText += "📍 TRACKING: \"Track my shipment\", \"Where is my order?\"\n";
    helpText += "📋 SERVICES: \"What services?\", \"Add-on services\"\n";
    helpText += "🛡️ INSURANCE: \"Item insurance\", \"Damage coverage\"\n";
    helpText += "❌ CANCEL: \"Cancel booking\", \"Refund policy\"\n";
    helpText += "⭐ REVIEWS: \"Customer reviews\", \"Ratings\"\n";
    helpText += "📞 SUPPORT: \"Contact support\", \"Phone number\"\n\n";
    helpText += "Just type your question!";
    return helpText;
  }

  if (msg.includes('purpose') || msg.includes('what is this site') || msg.includes('what is mero') || msg.includes('describe') || msg.includes('about this') || msg.includes('what does this site')) {
    return 'MeroGhar Logistics is Nepal\'s trusted household moving service. We connect you with verified movers across all 7 provinces and 77 districts of Nepal. Book a truck, track your shipment, and pay via eSewa, Khalti, or cash. We handle everything from narrow Kathmandu lanes to inter-province moves, including furniture disassembly, packing, and auspicious timing. Ask me "How to book?" to get started!';
  }

  if (msg.includes('book') || msg.includes('order') || msg.includes('shift') || msg.includes('schedule move') || (msg.includes('how') && msg.includes('move'))) {
    return 'To book a move with MeroGhar:\n1. Fill in pickup/drop locations (Step 1)\n2. Select your items (Step 2)\n3. Choose a vehicle (Step 3)\n4. Pick a mover or let admin assign (Step 4)\n5. Choose your move date (Step 5)\n6. Enter contact details and payment method (Step 6)\n\nOur coordinator will call within 2 hours with your NPR quote!';
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') || msg.includes('how much') || msg.includes('quote')) {
    return 'Our pricing is based on distance, item volume, vehicle type, and add-on services.\n\nService price ranges:\n- Full-Service Moving: From NPR 15,000\n- Pack & Load Only: From NPR 7,500\n- Cargo Tempo / Valley Move: From NPR 2,500\n- Furniture Disassembly: From NPR 2,500\n- Storage / Warehouse: From NPR 3,000/month\n- Item Insurance: From NPR 1,200\n\nUse the booking form to get an exact quote for your move!';
  }

  if (msg.includes('vehicle') || msg.includes('truck') || msg.includes('tempo') || msg.includes('transport')) {
    return 'MeroGhar offers these vehicle options:\n\n🛺 Cargo Tempo (NPR 400-500) — Best for narrow lanes, 1-2 rooms\n🚐 Tata Ace / Small Truck (NPR 800-1200) — Best for 2 BHK\n🚚 Mini Truck 407 (NPR 1500-2000) — Most popular, best for 3 BHK\n🛻 Large Truck + Helpers (NPR 2000+) — Best for large houses\n🤔 Let MeroGhar Recommend — We pick the right vehicle for you\n\nChoose during Step 3 of the booking form.';
  }

  if (msg.includes('province') || msg.includes('district') || msg.includes('cover') || msg.includes('area') || msg.includes('nepal') || msg.includes('location')) {
    return 'MeroGhar covers ALL 7 provinces and 77 districts of Nepal!\n\n🏔️ Koshi — 14 districts (Biratnagar, Dharan, Ilam)\n🌾 Madhesh — 8 districts (Janakpur, Birgunj)\n🏙️ Bagmati — 13 districts (Kathmandu, Lalitpur, Bhaktapur) Most Active\n🏞️ Gandaki — 11 districts (Pokhara, Gorkha)\n🌳 Lumbini — 12 districts (Butwal, Rupandehi)\n🏔️ Karnali — 10 districts (Surkhet, Jumla)\n🌄 Sudurpashchim — 9 districts (Dhangadhi, Mahendranagar)\n\nEnter your pickup and drop locations in the booking form!';
  }

  if (msg.includes('payment') || msg.includes('pay') || msg.includes('esewa') || msg.includes('khalti') || msg.includes('cash')) {
    return 'We accept: 💜 eSewa, 🟣 Khalti, IME Pay, ConnectIPS, Bank Transfer, and Cash on Move Day.\n\nA small token payment is collected via your chosen digital method to confirm the booking. The remaining balance is paid on move day.';
  }

  if (msg.includes('track') || msg.includes('status') || msg.includes('where is') || msg.includes('delivery')) {
    return 'You can track your shipment in real-time through the app. Go to "My Bookings" and tap on the shipment you want to track. The map shows your driver\'s current location.';
  }

  if (msg.includes('fragile') || msg.includes('glass') || msg.includes('breakable') || msg.includes('religious') || msg.includes('statue') || msg.includes('stone grinder')) {
    return 'Yes! Mark fragile items during booking (Step 2). For religious items, select "Religious Statues" or "Stone Grinder" under Cultural Items. Our team treats all items with exceptional care, using specialized wrapping and careful manual handling.';
  }

  if (msg.includes('cancel') || msg.includes('refund')) {
    return 'To cancel a booking, please contact our support team through the app\'s help section or reach out to the admin. Refunds are processed on a case-by-case basis.';
  }

  if (msg.includes('contact') || msg.includes('support') || msg.includes('phone') || msg.includes('viber') || msg.includes('email')) {
    return 'Contact MeroGhar:\n📞 Phone: +977 980-000-000\n💬 Viber: +977 980-000-000\n📧 Email: info@meroghar.com.np\n\nOr use the Help & Support section in the app.';
  }

  if (msg.includes('review') || msg.includes('rating') || msg.includes('trust') || msg.includes('reliable')) {
    return 'MeroGhar has excellent reviews!\n\n⭐ 4.8 Stars — Average Rating\n📝 6,000+ Verified Reviews\n✅ 97% On-Time Rate\n🚚 8,000+ Successful Moves\n👥 250+ Verified Providers\n\nOur customers love our service across all 7 provinces of Nepal!';
  }

  if (msg.includes('addon') || msg.includes('packing') || msg.includes('disassembly') || msg.includes('porter') || msg.includes('insurance') || msg.includes('protect')) {
    return 'Available add-on services:\n\n📦 Packing Service — Bubble wrap, rope, and boxes provided\n🔧 Furniture Disassembly — Taken apart and reassembled at new home\n👷 Porter / Labor Help — Extra manual labor for stairs or narrow access\n🛡️ Item Insurance — Full-value coverage on all moved items (from NPR 1,200)\n\nSelect these in Step 3 of the booking form!';
  }

  if (msg.includes('service') || msg.includes('offer') || msg.includes('provide')) {
    return 'MeroGhar offers these services:\n\n🚛 Full-Service Moving (From NPR 15,000)\n📦 Pack & Load Only (From NPR 7,500)\n🛺 Cargo Tempo / Valley Move (From NPR 2,500)\n🔧 Furniture Disassembly (From NPR 2,500)\n🏬 Storage / Warehouse (From NPR 3,000/month)\n🛡️ Item Insurance (From NPR 1,200)\n\nBook now and get a free quote within 2 hours!';
  }

  if (msg.includes('step') || msg.includes('how it works') || msg.includes('process')) {
    return 'Moving with MeroGhar is easy:\n\nStep 1: Fill the Form — 5-step form takes under 3 minutes\nStep 2: Get Matched — We match you with a verified mover within 2 hours\nStep 3: Confirm & Pay — Review quote, pay token via eSewa/Khalti/cash\nStep 4: Move Day! — Crew arrives on time, even for early auspicious timings\n\nStart by typing "Book a move" to begin!';
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

  return "I'm here to help with MeroGhar Logistics — bookings, tracking, pricing, and more. I can answer from our website knowledge. Try asking \"How to book?\" or \"What are the prices?\" Or type \"help\" to see all options.";
}
