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
import { RegionPage } from '@/pages/RegionPage';
import { AnalysisHomePage } from '@/pages/AnalysisHomePage';
import { AnalysisRunPage } from '@/pages/AnalysisRunPage';
import { AnalysisStepIntersectionsPage } from '@/pages/AnalysisStepPages';
import { AnalysisStepPhenotypePage } from '@/pages/AnalysisStepPhenotypePage';
import { AnalysisStepOrthogroupsPage } from '@/pages/AnalysisStepOrthogroupsPage';
import { AnalysisStepVariantsPage } from '@/pages/AnalysisStepVariantsPage';
import { AnalysisStepCandidatesPage } from '@/pages/AnalysisStepCandidatesPage';
import { CandidateDetailPage } from '@/pages/CandidateDetailPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/analysis" element={<AnalysisHomePage />} />
            <Route path="/analysis/:runId" element={<AnalysisRunPage />} />
            <Route path="/analysis/:runId/phenotype" element={<AnalysisStepPhenotypePage />} />
            <Route path="/analysis/:runId/orthogroups" element={<AnalysisStepOrthogroupsPage />} />
            <Route path="/analysis/:runId/variants" element={<AnalysisStepVariantsPage />} />
            <Route path="/analysis/:runId/intersections" element={<AnalysisStepIntersectionsPage />} />
            <Route path="/analysis/:runId/candidates" element={<AnalysisStepCandidatesPage />} />
            <Route path="/analysis/:runId/candidate/:candidateId" element={<CandidateDetailPage />} />

            {/* Legacy /explore retained temporarily for OG drilldown links; root redirects to /analysis. */}
            <Route path="/explore" element={<Navigate to="/analysis" replace />} />
            <Route path="/explore/og/:ogId" element={<OgDetailPage />} />
            <Route path="/explore/*" element={<ExplorePage />} />

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
