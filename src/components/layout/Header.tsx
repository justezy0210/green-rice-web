import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/comparison', label: 'Comparison' },
];

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="bg-white sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-green-700 text-lg">
          <span className="text-2xl">🌾</span>
          <span>RiceGenomeDB</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === item.path
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
