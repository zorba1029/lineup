import { Routes, Route } from 'react-router-dom';
import { MobileShell } from '@/components/layout/MobileShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { LoginPage } from '@/routes/LoginPage';
import { SignupPage } from '@/routes/SignupPage';
import { MainPage } from '@/routes/MainPage';
import { RequestDetailPage } from '@/routes/RequestDetailPage';
import { OfferRegisteredPage } from '@/routes/OfferRegisteredPage';
import { MatchedPage } from '@/routes/MatchedPage';
import { NotFoundPage } from '@/routes/NotFoundPage';

export default function App() {
  return (
    <MobileShell>
      <ConfirmModal />
      <Routes>
        {/* 비보호 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* 보호 라우트 */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainPage />
            </RequireAuth>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <RequireAuth>
              <RequestDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/offers/registered"
          element={
            <RequireAuth>
              <OfferRegisteredPage />
            </RequireAuth>
          }
        />
        <Route
          path="/matched"
          element={
            <RequireAuth>
              <MatchedPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MobileShell>
  );
}
