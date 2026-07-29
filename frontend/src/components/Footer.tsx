export default function Footer() {
  return (
    <footer className="bg-forest-950 border-t border-forest-800 py-12">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-display text-xl font-black text-cream-50 tracking-tight mb-3">
              <span className="w-8 h-8 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-sm font-black leading-none">M</span>
              Mero<span className="text-saffron-400">Ghar</span>
            </div>
            <p className="text-forest-400 text-sm leading-relaxed">
              Nepal's trusted household moving service connecting verified movers with families across all 7 provinces.
            </p>
          </div>
          <div>
            <h4 className="text-cream-50 font-semibold text-sm mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <a href="#services" className="block text-forest-400 hover:text-cream-50 transition-colors">Services</a>
              <a href="#how" className="block text-forest-400 hover:text-cream-50 transition-colors">How It Works</a>
              <a href="#provinces" className="block text-forest-400 hover:text-cream-50 transition-colors">Coverage</a>
              <a href="#reviews" className="block text-forest-400 hover:text-cream-50 transition-colors">Reviews</a>
              <a href="#faq" className="block text-forest-400 hover:text-cream-50 transition-colors">FAQ</a>
            </div>
          </div>
          <div>
            <h4 className="text-cream-50 font-semibold text-sm mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-forest-400">
              <p>📞 +977 980-000-000</p>
              <p>💬 Viber / WhatsApp</p>
              <p>📧 info@meroghar.com</p>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-forest-800 text-center text-forest-500 text-xs">
          &copy; {new Date().getFullYear()} MeroGhar. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
