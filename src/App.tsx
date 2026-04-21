import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { DownloadPage } from '@/pages/DownloadPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminPage } from '@/pages/AdminPage';
import { CultivarDetailPage } from '@/pages/CultivarDetailPage';
import { CultivarsListPage } from '@/pages/CultivarsListPage';
import { GeneSearchPage } from '@/pages/GeneSearchPage';
import { GeneDetailPage } from '@/pages/GeneDetailPage';
import { OgDetailPage } from '@/pages/OgDetailPage';
import { RegionPage } from '@/pages/RegionPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/og/:ogId" element={<OgDetailPage />} />
            <Route path="/og/:ogId" element={<OgDetailPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cultivars" element={<CultivarsListPage />} />
            <Route path="/cultivar/:name" element={<CultivarDetailPage />} />
            <Route path="/genes" element={<GeneSearchPage />} />
            <Route path="/genes/:geneId" element={<GeneDetailPage />} />
            <Route path="/region/:cultivar/:chr/:range" element={<RegionPage />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
