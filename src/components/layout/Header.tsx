import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';
import { useAdminClaim } from '@/hooks/useAdminClaim';

const NAV_ITEMS = [
  { path: '/', label: 'Overview' },
  { path: '/cultivars', label: 'Cultivars' },
  { path: '/genes', label: 'Genes' },
  { path: '/analysis', label: 'Analysis' },
  { path: '/download', label: 'Downloads' },
];

export function Header() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuthContext();
  const { isAdmin } = useAdminClaim();

  return (
    <header className="bg-white sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-green-700"
          title="Korean japonica comparative pangenome resource"
        >
          <span className="text-2xl">🌾</span>
          <span className="flex flex-col leading-tight">
            <span className="text-base">Green Rice DB</span>
            <span className="text-[10px] font-normal text-gray-500 tracking-wide">
              Comparative pangenome resource · Korean temperate japonica
            </span>
          </span>
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
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Admin
            </Link>
          )}
          {user ? (
            <button
              onClick={() => signOut()}
              className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
