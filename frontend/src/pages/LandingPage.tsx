import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="border border-cream-200 bg-cream-50 rounded-sm overflow-hidden group">
      <summary className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-forest-900 text-sm">{q}</span>
        <svg className="w-4 h-4 text-forest-600 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-6 pb-4 text-stone-500 text-sm leading-relaxed">{a}</div>
    </details>
  )
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen bg-forest-950 pt-16 overflow-hidden texture">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f5a623" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute top-32 right-1/4 w-96 h-96 bg-saffron-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-forest-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 min-h-[calc(100vh-64px)] flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full py-16 lg:py-24">
            <div>
              <div className="animate-fade-up flex items-center gap-3 mb-7">
                <span className="w-7 h-px bg-saffron-400" />
                <span className="text-saffron-400 text-xs font-semibold tracking-[0.22em] uppercase">Nepal's Trusted Moving Network</span>
              </div>

              <h1 className="animate-fade-up-d1 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-cream-50 leading-[1.0] tracking-tight mb-6">
                Move your<br />home, the<br />
                <em className="not-italic text-saffron-400">easy way.</em>
              </h1>

              <p className="animate-fade-up-d2 text-forest-300/80 text-base leading-relaxed max-w-md mb-10 font-light">
                Connect with verified, rated household movers across all
                <strong className="text-cream-100 font-semibold"> 7 provinces</strong>
                of Nepal — from Kathmandu to Karnali. Free quote within 2 hours. eSewa · Khalti · Cash accepted.
              </p>

              <div className="animate-fade-up-d3 flex flex-wrap gap-3 mb-14">
                <Link to={isAuthenticated ? '/book' : '/login'}
                  className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-lg px-5 py-2.5 min-h-[44px] rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20">
                  {isAuthenticated ? 'Book a Move →' : 'Login →'}
                </Link>
                <a href="#how" className="border border-forest-600 hover:border-forest-400 text-forest-300 hover:text-cream-50 font-medium text-sm px-7 py-4 rounded-sm transition-all">
                  See How It Works ↓
                </a>
              </div>

              <div className="animate-fade-up-d4 flex flex-wrap gap-x-8 gap-y-4 pt-7 border-t border-forest-800/70">
                {[
                  { num: '8k', suffix: '+', label: 'Moves Completed' },
                  { num: '77', suffix: '', label: 'Districts Covered' },
                  { num: '4.8', suffix: '★', label: 'Average Rating' },
                  { num: '2', suffix: 'hr', label: 'Quote Time' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-3xl font-black text-cream-50">
                      {s.num}<span className="text-saffron-400">{s.suffix}</span>
                    </div>
                    <div className="text-forest-400 text-xs tracking-widest uppercase mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-center animate-fade-up-d2">
              <div className="relative w-full max-w-md">
                <div className="bg-forest-900/70 border border-forest-700/60 rounded-sm p-8 space-y-7 animate-float">
                  <div>
                    <p className="text-forest-400 text-xs tracking-[0.2em] uppercase font-semibold mb-3">Your Route</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-forest-800/60 border border-forest-700/40 rounded-sm px-4 py-2.5 text-cream-200 text-sm font-medium">📍 Pickup Location</div>
                      <div className="text-saffron-400 font-black text-lg px-1">→</div>
                      <div className="flex-1 bg-forest-800/60 border border-forest-700/40 rounded-sm px-4 py-2.5 text-cream-200 text-sm font-medium">🏠 Destination</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-forest-400 text-xs tracking-[0.2em] uppercase font-semibold mb-3">Services Included</p>
                    <div className="flex flex-wrap gap-2">
                      {['🚛 Full Move', '📦 Packing', '🛡 Insurance', '🔧 Assembly', '👷 Porter Help'].map((s) => (
                        <span key={s} className="bg-saffron-400/10 border border-saffron-400/30 text-saffron-300 text-xs px-3 py-1.5 rounded-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-forest-400 text-xs tracking-[0.2em] uppercase font-semibold mb-3">Payment Methods</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-sm font-semibold">eSewa 💜</span>
                      <span className="bg-purple-700/20 text-purple-200 border border-purple-700/30 text-xs px-3 py-1 rounded-sm font-semibold">Khalti 🟣</span>
                      <span className="bg-forest-700/40 text-forest-200 border border-forest-600/40 text-xs px-3 py-1 rounded-sm font-semibold">Cash</span>
                      <span className="bg-blue-700/20 text-blue-200 border border-blue-700/30 text-xs px-3 py-1 rounded-sm font-semibold">ConnectIPS</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-saffron-400 rounded-sm p-4 shadow-2xl shadow-saffron-700/40">
                  <p className="font-display font-black text-forest-900 text-xl leading-none">Free</p>
                  <p className="text-forest-800 text-xs font-bold">Quote</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-forest-500 z-10 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* TRUST BANNER */}
      <div className="bg-saffron-400 py-4">
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-2 px-5 text-center">
          <span className="text-forest-900 text-sm font-semibold">✅ Verified Movers Only</span>
          <span className="text-forest-900/40 hidden sm:inline">·</span>
          <span className="text-forest-900 text-sm font-semibold">🇳🇵 All 7 Provinces of Nepal</span>
          <span className="text-forest-900/40 hidden sm:inline">·</span>
          <span className="text-forest-900 text-sm font-semibold">💬 Viber &amp; Phone Support</span>
          <span className="text-forest-900/40 hidden sm:inline">·</span>
          <span className="text-forest-900 text-sm font-semibold">🪔 Auspicious Timing Respected</span>
          <span className="text-forest-900/40 hidden sm:inline">·</span>
          <span className="text-forest-900 text-sm font-semibold">💜 eSewa · Khalti · IME Pay</span>
        </div>
      </div>

      {/* WHY MEROGHAR */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-saffron-600 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Why MeroGhar?</p>
              <h2 className="font-display text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-6">
                Movers who<br /><em className="not-italic text-forest-700">understand Nepal.</em>
              </h2>
              <p className="text-stone-500 text-base leading-relaxed mb-8 max-w-lg">
                We built MeroGhar because Nepal has unique moving challenges — narrow Kathmandu lanes, monsoon-blocked hill roads, auspicious timing requirements, and carrying heavy stone grinders up four flights of stairs. Our movers get all of it.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🗺️', title: 'All 77 Districts', desc: 'From Kathmandu to Humla — we have verified movers across every district of Nepal.' },
                  { icon: '🪔', title: 'Auspicious Timing Aware', desc: 'Tell us your move time — even a 5 AM start — and our crew will be at your door on the dot.' },
                  { icon: '🛺', title: 'Right Vehicle for Every Lane', desc: 'Cargo tempo for tight alleys, mini truck for inter-city, large truck for full household moves.' },
                  { icon: '💬', title: 'Friendly Local Support', desc: 'Our coordinators communicate over Viber and phone — no complicated apps needed.' },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <span className="w-10 h-10 bg-forest-100 rounded-sm flex items-center justify-center text-lg shrink-0">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-forest-900 text-sm mb-0.5">{f.title}</p>
                      <p className="text-stone-500 text-sm">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '8k+', label: 'Successful Moves', sub: 'Across all 7 provinces since 2021', bg: 'bg-forest-900', text: 'text-cream-50', subText: 'text-forest-400', accent: 'text-saffron-400' },
                { num: '97%', label: 'On-Time Rate', sub: 'Including auspicious timing arrivals', bg: 'bg-saffron-400', text: 'text-forest-900', subText: 'text-forest-700', accent: '' },
                { num: '250+', label: 'Verified Providers', sub: 'Screened, trained and rated', bg: 'bg-cream-100 border border-cream-200', text: 'text-forest-900', subText: 'text-stone-500', accent: 'text-saffron-600' },
                { num: '4.8★', label: 'Average Rating', sub: 'From 6,000+ verified reviews', bg: 'bg-forest-700', text: 'text-cream-50', subText: 'text-forest-300', accent: 'text-saffron-400' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-sm p-7`}>
                  <p className={`font-display font-black text-4xl ${s.text} mb-2`}><span className={s.accent}>{s.num}</span></p>
                  <p className={`${s.subText} text-xs uppercase tracking-widest`}>{s.label}</p>
                  <p className={`${s.subText} text-xs mt-2 leading-relaxed opacity-70`}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 bg-cream-100 border-t border-cream-200" id="services">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 pb-8 border-b border-cream-300">
            <div>
              <p className="text-saffron-600 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Our Services</p>
              <h2 className="font-display text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Every service your<br /><em className="not-italic text-forest-700">Nepal move needs</em>
              </h2>
            </div>
            <Link to={isAuthenticated ? '/book' : '/login'}
              className="self-start bg-forest-900 hover:bg-forest-800 text-cream-50 font-semibold text-sm px-7 py-3.5 rounded-sm transition-all hover:-translate-y-0.5 whitespace-nowrap">
              Get Free Quote →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-cream-300">
            {[
              { icon: '🚛', title: 'Full-Service Moving', desc: 'Pack, load, transport, and unload — complete door-to-door service with a dedicated crew and verified truck.', price: 'From NPR 15,000' },
              { icon: '📦', title: 'Pack & Load Only', desc: 'Already have a vehicle? Our team packs everything safely and loads your truck or tempo efficiently.', price: 'From NPR 7,500' },
              { icon: '🛺', title: 'Cargo Tempo / Valley Move', desc: 'Narrow lane-friendly tempo for Kathmandu Valley intra-city moves. Fast, affordable, and local.', price: 'From NPR 2,500' },
              { icon: '🔧', title: 'Furniture Disassembly', desc: 'Wardrobes, beds, dressing tables — carefully taken apart and reassembled at your new home.', price: 'From NPR 2,500' },
              { icon: '🏬', title: 'Storage / Warehouse', desc: 'Secure, weather-protected short or long-term storage facilities near major cities across Nepal.', price: 'From NPR 3,000/month' },
              { icon: '🛡️', title: 'Item Insurance', desc: 'Optional full-replacement coverage on all items moved. Complete peace of mind on every move.', price: 'From NPR 1,200' },
            ].map((s) => (
              <div key={s.title} className="bg-cream-100 p-8 group hover:bg-forest-950 transition-colors duration-300">
                <div className="text-4xl mb-5">{s.icon}</div>
                <div className="w-8 h-0.5 bg-saffron-400 mb-5 group-hover:w-14 transition-all duration-300" />
                <h3 className="font-display font-bold text-xl mb-3 group-hover:text-cream-50 transition-colors">{s.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed group-hover:text-forest-300 transition-colors">{s.desc}</p>
                <div className="mt-6 font-display font-bold text-saffron-600 group-hover:text-saffron-400">{s.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-forest-950 relative overflow-hidden texture" id="how">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-saffron-400/40 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10">
          <div className="text-center mb-16">
            <p className="text-saffron-400 text-xs font-semibold tracking-[0.2em] uppercase mb-4">Simple Process</p>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-cream-50 leading-tight mb-4">
              Move in <em className="not-italic text-saffron-400">4 easy steps</em>
            </h2>
            <p className="text-forest-400 text-base max-w-lg mx-auto font-light">From booking to move day — we handle everything so you can focus on your new home.</p>
          </div>
          <div className="relative grid md:grid-cols-4 gap-10">
            <div className="hidden md:block absolute top-11 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-saffron-400/25 to-transparent" />
            {[
              { num: '1', title: 'Fill the Form', desc: 'Province, district, items, vehicle type, and preferred date — our 5-step form takes under 3 minutes.' },
              { num: '2', title: 'Get Matched', desc: 'We match you with a verified, rated mover available in your district within 2 hours of your request.' },
              { num: '3', title: 'Confirm & Pay', desc: 'Review your NPR quote over Viber or phone. Pay a token amount via eSewa, Khalti, or cash to secure your slot.' },
              { num: '4', title: 'Move Day! 🎉', desc: 'The crew arrives on time — even for early auspicious timings. Relax and enjoy your new home.' },
            ].map((step, i) => (
              <div key={step.num} className="text-center relative">
                <div className={`w-20 h-20 rounded-full border-2 border-saffron-400/40 bg-forest-900 flex items-center justify-center mx-auto mb-6 relative z-10 ${i === 3 ? 'border-saffron-400 bg-saffron-400/10' : ''}`}>
                  <span className="font-display font-black text-3xl text-saffron-400">{step.num}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-cream-50 mb-3">{step.title}</h3>
                <p className="text-forest-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVINCE COVERAGE */}
      <section className="py-24 bg-cream-50" id="provinces">
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="text-center mb-14">
            <p className="text-saffron-600 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Our Coverage</p>
            <h2 className="font-display text-4xl lg:text-5xl font-black leading-tight">
              All <em className="not-italic text-forest-700">7 Provinces</em><br />covered
            </h2>
            <p className="text-stone-500 mt-4 text-sm max-w-md mx-auto">Wherever your new home is in Nepal, MeroGhar gets your belongings there safely and on time.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: '🏔️', name: 'Koshi Province', sub: 'Province No. 1 · 14 Districts', cities: ['Biratnagar', 'Dharan', 'Ilam'], highlight: false },
              { icon: '🌾', name: 'Madhesh Province', sub: 'Province No. 2 · 8 Districts', cities: ['Janakpur', 'Birgunj', 'Sarlahi'], highlight: false },
              { icon: '🏙️', name: 'Bagmati Province ⭐', sub: 'Most Active Zone · 13 Districts', cities: ['Kathmandu', 'Lalitpur', 'Bhaktapur'], highlight: true },
              { icon: '🏞️', name: 'Gandaki Province', sub: 'Province No. 4 · 11 Districts', cities: ['Pokhara', 'Gorkha', 'Mustang'], highlight: false },
              { icon: '🌳', name: 'Lumbini Province', sub: 'Province No. 5 · 12 Districts', cities: ['Butwal', 'Rupandehi', 'Kapilvastu'], highlight: false },
              { icon: '🏔️', name: 'Karnali Province', sub: 'Province No. 6 · 10 Districts', cities: ['Surkhet', 'Jumla', 'Humla'], highlight: false },
              { icon: '🌄', name: 'Sudurpashchim', sub: 'Province No. 7 · 9 Districts', cities: ['Dhangadhi', 'Mahendranagar'], highlight: false },
              { icon: '77', name: 'Districts', sub: 'Full Nepal coverage', cities: [], highlight: false, cta: true },
            ].map((p) => (
              <div key={p.name} className={`${p.highlight ? 'bg-forest-900 border border-forest-700' : p.cta ? 'bg-saffron-400' : 'bg-cream-100 border border-cream-200'} rounded-sm p-5`}>
                {p.cta ? (
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    <p className="font-display font-black text-forest-900 text-4xl mb-1">{p.icon}</p>
                    <p className="font-display font-bold text-forest-900 text-sm">{p.name}</p>
                    <p className="text-forest-700 text-xs mt-1">{p.sub}</p>
                    <Link to={isAuthenticated ? '/book' : '/login'}
                      className="mt-4 bg-forest-900 text-cream-50 text-sm font-bold px-5 py-3 rounded-sm hover:bg-forest-800 transition-colors">
                      Book Now →
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl mb-3">{p.icon}</div>
                    <p className={`font-display font-bold ${p.highlight ? 'text-saffron-400' : 'text-forest-900'} text-sm`}>{p.name}</p>
                    <p className={`${p.highlight ? 'text-forest-400' : 'text-stone-500'} text-xs mt-1`}>{p.sub}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.cities.map((c) => (
                        <span key={c} className={`${p.highlight ? 'bg-saffron-400/20 text-saffron-300' : 'bg-forest-100 text-forest-700'} text-xs px-2.5 py-1 rounded-sm`}>{c}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="bg-crimson-100 border border-crimson-500/60 rounded-sm px-6 py-4 flex items-start gap-4 max-w-3xl mx-auto">
            <span className="text-2xl shrink-0">🌧️</span>
            <div>
              <p className="text-crimson-700 text-xs font-bold uppercase tracking-wide mb-1">Monsoon Advisory — June to September</p>
              <p className="text-crimson-600 text-sm leading-relaxed">
                Hill and mountain routes in Karnali, Sudurpashchim, and high-altitude areas may experience road blockages during monsoon season. Our team confirms route access before your move date and recommends water-resistant packaging for all moves during this period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-24 bg-forest-950 relative overflow-hidden texture" id="reviews">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-saffron-400/30 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10">
          <div className="text-center mb-14">
            <p className="text-saffron-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Customer Stories</p>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-cream-50 leading-tight">
              Trusted by families<br /><em className="not-italic text-saffron-400">across Nepal</em>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { stars: '★★★★★', text: 'Our Kathmandu to Pokhara move was completely stress-free. The team handled our prayer room and all the religious items with exceptional care. Nothing was damaged. Highly recommended!', initials: 'PR', name: 'Priya Rai', route: 'Kathmandu → Pokhara', saffron: false },
              { stars: '★★★★★', text: 'Our auspicious move time was 6 AM — MeroGhar\'s team arrived at 5:50 sharp! They also managed to bring a cargo tempo through our narrow lane in Lalitpur which other movers refused to do. Absolute 10/10.', initials: 'SK', name: 'Sanjay Karki', route: 'Lalitpur → Bhaktapur', saffron: true },
              { stars: '★★★★★', text: 'Moving from Biratnagar to Kathmandu with a full 2 BHK — they sent a mini truck with 3 helpers. The wardrobe and bed were disassembled and reassembled perfectly. Paid via Khalti, super easy.', initials: 'AS', name: 'Anita Shrestha', route: 'Biratnagar → Kathmandu', saffron: false },
              { stars: '★★★★☆', text: 'Moving from Pokhara to Butwal — I had a very heavy stone grinder to move too. The porter team handled it carefully. I liked that I could specify special items directly in the booking form.', initials: 'BT', name: 'Bijaya Thapa', route: 'Pokhara → Butwal', saffron: false },
              { stars: '★★★★★', text: 'I was surprised MeroGhar covers Dhangadhi! The coordinator called me within an hour, spoke clearly, and arranged everything. Paid via eSewa and all my belongings arrived safe. Great service.', initials: 'KD', name: 'Kamala Deuba', route: 'Dhangadhi, Sudurpashchim', saffron: false },
              { stars: '★★★★★', text: 'Moving from Nuwakot to Kathmandu on a hill road — I was nervous about damage. MeroGhar confirmed road access before booking and sent an experienced driver. Nothing was damaged. Very professional.', initials: 'RM', name: 'Ram Maharjan', route: 'Nuwakot → Kathmandu', saffron: false },
            ].map((r) => (
              <div key={r.name} className={`${r.saffron ? 'bg-saffron-400' : 'bg-forest-900/60 border border-forest-800'} rounded-sm p-7`}>
                <div className={`${r.saffron ? 'text-forest-900' : 'text-saffron-400'} text-lg mb-4`}>{r.stars}</div>
                <p className={`${r.saffron ? 'text-forest-900' : 'text-forest-200'} text-sm leading-relaxed mb-6`}>{r.text}</p>
                <div className={`flex items-center gap-3 pt-5 ${r.saffron ? 'border-t border-saffron-500' : 'border-t border-forest-800'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${r.saffron ? 'bg-forest-900 text-saffron-400' : 'bg-forest-600 text-cream-50'}`}>{r.initials}</div>
                  <div>
                    <p className={`font-semibold ${r.saffron ? 'text-forest-900' : 'text-cream-50'} text-sm`}>{r.name}</p>
                    <p className={`${r.saffron ? 'text-forest-700' : 'text-forest-500'} text-xs`}>{r.route}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap justify-center gap-8 text-center">
            {[
              { num: '4.8', suf: '★', label: 'Overall Rating' },
              { num: '6', suf: 'k+', label: 'Verified Reviews' },
              { num: '97', suf: '%', label: 'Would Recommend' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display font-black text-5xl text-cream-50">{s.num}<span className="text-saffron-400">{s.suf}</span></p>
                <p className="text-forest-400 text-xs uppercase tracking-widest mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-cream-50" id="faq">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-saffron-600 text-xs font-semibold tracking-[0.2em] uppercase mb-3">FAQ</p>
            <h2 className="font-display text-4xl lg:text-5xl font-black leading-tight">
              Frequently Asked<br /><em className="not-italic text-forest-700">Questions</em>
            </h2>
          </div>
          <div className="space-y-2">
            <FAQItem q="Does MeroGhar cover all 7 provinces of Nepal?" a="Yes — MeroGhar covers all 77 districts across Nepal's 7 provinces. From Kathmandu to Karnali and Sudurpashchim, we have verified movers everywhere. For hill and mountain routes, we confirm road access before finalizing your booking, especially during monsoon season (June–September)." />
            <FAQItem q="How quickly will I receive a quote after submitting the form?" a="Our coordinator will call you on Viber or phone within 2 hours of form submission to confirm your NPR quote and moving team. For urgent same-day moves, please call us directly at +977 980-000-000." />
            <FAQItem q="Can you accommodate auspicious move timings?" a="Absolutely. We respect auspicious timing traditions. Simply mention your required move time in the Special Notes field during Step 4 of the booking form — even if it's a very early start like 4 or 5 AM. Our crew will be there on the dot." />
            <FAQItem q="Can you navigate Kathmandu's narrow lanes?" a="Yes! Cargo tempos are our narrow-lane specialists. When filling out the form in Step 1, select 'Narrow Lane Access' for pickup or drop location — we will dispatch a tempo-sized vehicle that fits through the tightest alleys in Patan, Basantapur, or any old city area." />
            <FAQItem q="What items do you move? Any restrictions?" a="We move almost everything: furniture, electronics, kitchen appliances, clothes, books, and gym equipment. For fragile items (glass, marble, mirrors) and religious/cultural items (idols, prayer room goods), you can specify them in Step 2 for special handling. We do not move flammable, hazardous, or illegal items." />
            <FAQItem q="What payment methods do you accept?" a="We accept eSewa, Khalti, IME Pay, ConnectIPS, and Cash. For eSewa/Khalti/IME Pay, you complete payment through our secure payment overlay after form submission. Cash payment is made directly to the crew on move day." />
            <FAQItem q="Can I track my booking status?" a="Yes! Log into your account and visit 'My Bookings' to see the current status of all your moves. You will see whether your shipment is pending, accepted, in transit, or delivered along with your assigned mover's details." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-forest-900">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-black text-cream-50 leading-tight mb-4">
            Ready to make your move?<br />
            <em className="not-italic text-saffron-400">Let's get you home.</em>
          </h2>
          <p className="text-forest-300 text-sm mb-8 max-w-md mx-auto">
            Join thousands of happy families who moved the easy way. Free quote, verified movers, no surprises.
          </p>
          <Link to={isAuthenticated ? '/book' : '/login'}
            className="inline-block bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-lg px-8 py-4 rounded-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-saffron-600/20">
            {isAuthenticated ? 'Book Your Move Now →' : 'Get Started →'}
          </Link>
        </div>
      </section>
    </>
  )
}
