import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
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
  { path: '/pangenome', label: 'Pangenome', hint: 'Core/accessory catalog and SV summary' },
  { path: '/sv', label: 'Structural variants', hint: 'SV event matrix and carrier states' },
];

const navLinkClass = (active: boolean) =>
  cn(
    buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
    'h-8 rounded-md px-3 text-sm font-medium',
    active
      ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200'
      : 'text-gray-600 hover:bg-white hover:text-gray-950',
  );

export function Header() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuthContext();
  const { isAdmin } = useAdminClaim();

  const browseActive = BROWSE_ITEMS.some((it) => pathname.startsWith(it.path));

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-green-700"
          title="Korean japonica comparative pangenome resource"
        >
          <span className="text-2xl">🌾</span>
          <span className="flex flex-col leading-tight">
            <span className="text-base">Green Rice DB</span>
            <span className="hidden text-[10px] font-normal text-gray-500 tracking-wide lg:block">
              Comparative pangenome resource · Korean temperate japonica
            </span>
          </span>
        </Link>

        <nav
          className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary navigation"
        >
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 shadow-inner shadow-gray-100">
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
              <DropdownMenuContent align="end" className="w-72 rounded-lg border border-gray-200 shadow-lg">
                {BROWSE_ITEMS.map((item) => {
                  const active = pathname.startsWith(item.path);
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      render={<Link to={item.path} />}
                      className={cn(
                        'flex flex-col items-start gap-0.5 px-2.5 py-2',
                        active && 'bg-green-50 text-green-800 focus:bg-green-50',
                      )}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-[11px] leading-snug text-gray-500">
                        {item.hint}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/discovery" className={navLinkClass(pathname.startsWith('/discovery'))}>
              Discovery
            </Link>
            <Link to="/download" className={navLinkClass(pathname === '/download')}>
              Downloads
            </Link>
            <Link to="/about" className={navLinkClass(pathname === '/about')}>
              About
            </Link>
            {isAdmin && (
              <Link to="/admin" className={navLinkClass(pathname === '/admin')}>
                Admin
              </Link>
            )}
            {user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className={navLinkClass(false)}
              >
                Sign Out
              </button>
            ) : (
              <Link to="/login" className={navLinkClass(pathname === '/login')}>
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
