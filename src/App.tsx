import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { OrthogroupIndexPage } from '@/pages/OrthogroupIndexPage';
import { RegionPage } from '@/pages/RegionPage';
import { DiscoveryHomePage } from '@/pages/DiscoveryHomePage';
import { DiscoveryLocusPage } from '@/pages/DiscoveryLocusPage';
import { DiscoveryRunPage } from '@/pages/DiscoveryRunPage';
import { DiscoveryStepIntersectionsPage } from '@/pages/DiscoveryStepIntersectionsPage';
import { DiscoveryStepPhenotypePage } from '@/pages/DiscoveryStepPhenotypePage';
import { DiscoveryStepOrthogroupsPage } from '@/pages/DiscoveryStepOrthogroupsPage';
import { DiscoveryStepVariantsPage } from '@/pages/DiscoveryStepVariantsPage';
import { DiscoveryStepCandidatesPage } from '@/pages/DiscoveryStepCandidatesPage';
import { DiscoveryBlockDetailPage } from '@/pages/DiscoveryBlockDetailPage';
import { DiscoveryBlockListPage } from '@/pages/DiscoveryBlockListPage';
import { CandidateDetailPage } from '@/pages/CandidateDetailPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/discovery" element={<DiscoveryHomePage />} />
            <Route path="/discovery/locus/:locusSlug" element={<DiscoveryLocusPage />} />
            <Route path="/discovery/:runId" element={<DiscoveryRunPage />} />
            <Route path="/discovery/:runId/phenotype" element={<DiscoveryStepPhenotypePage />} />
            <Route path="/discovery/:runId/orthogroups" element={<DiscoveryStepOrthogroupsPage />} />
            <Route path="/discovery/:runId/variants" element={<DiscoveryStepVariantsPage />} />
            <Route path="/discovery/:runId/intersections" element={<DiscoveryStepIntersectionsPage />} />
            <Route path="/discovery/:runId/candidates" element={<DiscoveryStepCandidatesPage />} />
            <Route path="/discovery/:runId/candidate/:candidateId" element={<CandidateDetailPage />} />
            <Route path="/discovery/:runId/blocks" element={<DiscoveryBlockListPage />} />
            <Route path="/discovery/:runId/block/:blockId" element={<DiscoveryBlockDetailPage />} />

            {/* Legacy /explore retained temporarily for OG drilldown links; root redirects to /discovery. */}
            <Route path="/explore" element={<Navigate to="/discovery" replace />} />
            <Route path="/explore/og/:ogId" element={<OgDetailPage />} />
            <Route path="/explore/*" element={<ExplorePage />} />

            <Route path="/og" element={<OrthogroupIndexPage />} />
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
