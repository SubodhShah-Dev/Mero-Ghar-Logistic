const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_PROMPT = `You are MeroBot, the official AI assistant for MeroGhar Logistics — a household moving and delivery service based in Nepal.

Your role:
- Help users with booking a move, checking prices, understanding services, and tracking shipments
- Answer in clear, friendly English or Nepali (mix is fine)
- Keep responses concise (2-4 sentences ideally, max 6 sentences)
- If you don't know something, say "I'm not sure — please contact our support team for help with that."
- Never make up pricing or availability numbers
- Do not share internal system information, API keys, or credentials

Key facts about MeroGhar:
- Service covers all 7 provinces of Nepal
- Offers: household shifting, parcel delivery, vehicle transport, fragile item moving
- Payment methods: Cash on Delivery, Bank Transfer, ConnectIPS, Khalti, eSewa
- Booking via the app: select pickup/drop locations, choose items, get distance-based quote
- Customers can track their shipment in real-time
- Support: via the app's help section or by contacting admin

Greet warmly but briefly.`;

export const sendMessage = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({ success: true, response: getFallbackResponse(message) });
    }

    const contents = [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }];

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
          maxOutputTokens: 300,
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
      return res.json({ success: true, response: getFallbackResponse(message) });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.json({ success: true, response: getFallbackResponse(message) });
    }

    res.json({ success: true, response: reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.json({ success: true, response: getFallbackResponse(req.body?.message || '') });
  }
};

function getFallbackResponse(message) {
  var msg = (message || '').toLowerCase().trim();

  if (msg.includes('hello') || msg.includes('hi ') || msg === 'hi' || msg === 'hey' || msg.includes('namaste')) {
    return 'Namaste! 🙏 How can I help you with your move today?';
  }
  if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') || msg.includes('quote')) {
    return 'Our pricing is based on distance, item volume, and special handling needs. You can get an instant quote by filling out the booking form in the app — just select pickup/drop locations and your items.';
  }
  if (msg.includes('book') || msg.includes('order') || msg.includes('move') || msg.includes('shift')) {
    return 'To book a move: open the app, fill in pickup/drop locations, select your items, and confirm. You\'ll get a distance-based quote and can choose your preferred payment method.';
  }
  if (msg.includes('track') || msg.includes('status') || msg.includes('where') || msg.includes('delivery')) {
    return 'You can track your shipment in real-time through the app. Go to "My Bookings" and tap on the shipment you want to track. The map shows your driver\'s current location.';
  }
  if (msg.includes('payment') || msg.includes('pay') || msg.includes('khalti') || msg.includes('esewa') || msg.includes('connectips')) {
    return 'We accept Cash on Delivery, Bank Transfer, ConnectIPS, Khalti, and eSewa. You can choose your preferred method during checkout.';
  }
  if (msg.includes('area') || msg.includes('location') || msg.includes('province') || msg.includes('service') && (msg.includes('area') || msg.includes('cover'))) {
    return 'MeroGhar Logistics serves all 7 provinces of Nepal. Enter your pickup and drop locations in the booking form to see if we cover your route.';
  }
  if (msg.includes('cancel') || msg.includes('refund')) {
    return 'To cancel a booking, please contact our support team through the app\'s help section or reach out to the admin. Refunds are processed on a case-by-case basis.';
  }
  if (msg.includes('time') || msg.includes('how long') || msg.includes('duration') || msg.includes('deliver')) {
    return 'Delivery time depends on distance and route conditions. Once booked, you\'ll get an estimated delivery window. You can track progress in real-time through the app.';
  }
  if (msg.includes('vehicle') || msg.includes('truck') || msg.includes('transport')) {
    return 'We have a fleet of various vehicle sizes — from mini trucks for small moves to large trucks for full household shifting. The right vehicle is assigned based on your item selection.';
  }
  if (msg.includes('fragile') || msg.includes('glass') || msg.includes('breakable') || msg.includes('careful')) {
    return 'Yes, we handle fragile items with special care! During booking, you can mark items as fragile — our team will pack and handle them with extra caution.';
  }
  if (msg.includes('contact') || msg.includes('support') || msg.includes('help') || msg.includes('phone') || msg.includes('email')) {
    return 'You can reach our support team through the app\'s Help & Support section, or contact the admin directly. We typically respond within 24 hours.';
  }
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('dhanyabad')) {
    return 'You\'re welcome! 😊 If you need anything else, just ask. Happy moving with MeroGhar!';
  }

  return 'I\'m here to help with your MeroGhar Logistics questions — bookings, tracking, pricing, payments, and more. Could you please be more specific about what you need?';
}
