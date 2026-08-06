import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-forest-950 pt-24 pb-12 flex items-center justify-center px-5">
      <div className="text-center">
        <p className="font-display text-7xl font-black text-saffron-400">404</p>
        <h1 className="font-display text-2xl font-black text-cream-50 mt-4">Page not found</h1>
        <p className="text-forest-400 text-sm mt-2 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block mt-8 bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm py-3 px-7 rounded-sm transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
