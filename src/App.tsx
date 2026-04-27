import { lazy, Suspense, type ComponentType } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const AdminPage = lazyPage(() => import('@/pages/AdminPage'), 'AdminPage');
const CultivarDetailPage = lazyPage(() => import('@/pages/CultivarDetailPage'), 'CultivarDetailPage');
const CultivarsListPage = lazyPage(() => import('@/pages/CultivarsListPage'), 'CultivarsListPage');
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage');
const DiscoveryHomePage = lazyPage(() => import('@/pages/DiscoveryHomePage'), 'DiscoveryHomePage');
const DiscoveryLocusPage = lazyPage(() => import('@/pages/DiscoveryLocusPage'), 'DiscoveryLocusPage');
const DownloadPage = lazyPage(() => import('@/pages/DownloadPage'), 'DownloadPage');
const GeneDetailPage = lazyPage(() => import('@/pages/GeneDetailPage'), 'GeneDetailPage');
const GeneSearchPage = lazyPage(() => import('@/pages/GeneSearchPage'), 'GeneSearchPage');
const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage');
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const OgDetailPage = lazyPage(() => import('@/pages/OgDetailPage'), 'OgDetailPage');
const OrthogroupIndexPage = lazyPage(() => import('@/pages/OrthogroupIndexPage'), 'OrthogroupIndexPage');
const PangenomeSummaryPage = lazyPage(() => import('@/pages/PangenomeSummaryPage'), 'PangenomeSummaryPage');
const RegionPage = lazyPage(() => import('@/pages/RegionPage'), 'RegionPage');
const SvDetailPage = lazyPage(() => import('@/pages/SvDetailPage'), 'SvDetailPage');
const SvIndexPage = lazyPage(() => import('@/pages/SvIndexPage'), 'SvIndexPage');

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />

              <Route path="/discovery" element={<DiscoveryHomePage />} />
              <Route path="/discovery/locus/:locusSlug" element={<DiscoveryLocusPage />} />
              <Route path="/discovery/:runId/*" element={<Navigate to="/discovery" replace />} />

              {/* Legacy /explore routes redirect to canonical public surfaces. */}
              <Route path="/explore" element={<Navigate to="/discovery" replace />} />
              <Route path="/explore/og/:ogId" element={<LegacyExploreOgRedirect />} />
              <Route path="/explore/*" element={<Navigate to="/discovery" replace />} />

              <Route path="/og" element={<OrthogroupIndexPage />} />
              <Route path="/og/:ogId" element={<OgDetailPage />} />
              <Route path="/pangenome" element={<PangenomeSummaryPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cultivars" element={<CultivarsListPage />} />
              <Route path="/cultivar/:name" element={<CultivarDetailPage />} />
              <Route path="/genes" element={<GeneSearchPage />} />
              <Route path="/genes/:geneId" element={<GeneDetailPage />} />
              <Route path="/region/:cultivar/:chr/:range" element={<RegionPage />} />
              <Route path="/sv" element={<SvIndexPage />} />
              <Route path="/sv/:eventId" element={<SvDetailPage />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LegacyExploreOgRedirect() {
  const { ogId } = useParams<{ ogId: string }>();
  const { search } = useLocation();
  return <Navigate to={`/og/${encodeURIComponent(ogId ?? '')}${search}`} replace />;
}

function PageLoading() {
  return <div className="py-20 text-center text-sm text-gray-400">Loading page...</div>;
}

function lazyPage(loader: () => Promise<unknown>, exportName: string) {
  return lazy(async () => {
    const module = await loader() as Record<string, ComponentType>;
    return { default: module[exportName] };
  });
}
