import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';
import { useAdminClaim } from '@/hooks/useAdminClaim';

interface BrowseItem {
  path: string;
  label: string;
  hint: string;
}

const BROWSE_ITEMS: BrowseItem[] = [
  { path: '/cultivars', label: 'Cultivars', hint: 'Per-cultivar assembly + phenotype' },
  { path: '/genes', label: 'Genes', hint: 'Gene id, Pfam / InterPro / GO, product' },
  { path: '/og', label: 'Orthogroups', hint: 'Conservation tier, function, OG inventory' },
];

const navLinkClass = (active: boolean) =>
  cn(
    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
    active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100',
  );

export function Header() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuthContext();
  const { isAdmin } = useAdminClaim();

  const browseActive = BROWSE_ITEMS.some((it) => pathname.startsWith(it.path));

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
          <Link to="/" className={navLinkClass(pathname === '/')}>
            Overview
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                /* raw: bare <button> as the Base UI DropdownMenuTrigger render target so the trigger inherits the nav-link class. */
                <button
                  type="button"
                  className={cn(
                    navLinkClass(browseActive),
                    'inline-flex items-center gap-1',
                  )}
                />
              }
            >
              Browse
              <ChevronDown className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {BROWSE_ITEMS.map((item) => {
                const active = pathname.startsWith(item.path);
                return (
                  <DropdownMenuItem
                    key={item.path}
                    render={<Link to={item.path} />}
                    className={cn(
                      'flex flex-col items-start gap-0.5 py-2 px-2.5',
                      active && 'bg-green-50 text-green-700 focus:bg-green-50',
                    )}
                  >
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="text-[11px] text-gray-500 leading-snug">
                      {item.hint}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/analysis" className={navLinkClass(pathname.startsWith('/analysis'))}>
            Analysis
          </Link>
          <Link to="/download" className={navLinkClass(pathname === '/download')}>
            Downloads
          </Link>

          {isAdmin && (
            <Link to="/admin" className={navLinkClass(pathname === '/admin')}>
              Admin
            </Link>
          )}
          {user ? (
            <Button onClick={() => signOut()} className="ml-4">
              Sign Out
            </Button>
          ) : (
            <Button render={<Link to="/login" />} className="ml-4">
              Login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
