import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { isLoggedIn, isPhotographer } from "./api";
import { TabLayout } from "./layout/TabLayout";
import { StudioLayout } from "./layout/StudioLayout";
import { AppointmentSubmitPage } from "./pages/appointment/AppointmentSubmitPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { HomePage } from "./pages/home/HomePage";
import { ComplaintPage } from "./pages/complaint/ComplaintPage";
import { FavoritesPage } from "./pages/mine/FavoritesPage";
import { MinePage } from "./pages/mine/MinePage";
import { OrderDetailPage } from "./pages/order/OrderDetailPage";
import { OrdersPage } from "./pages/order/OrdersPage";
import { OrderReviewPage } from "./pages/order/OrderReviewPage";
import { PhotographerDetailPage } from "./pages/photographer/PhotographerDetailPage";
import { PhotographerListPage } from "./pages/photographer/PhotographerListPage";
import { WorkDetailPage as PublicWorkDetailPage } from "./pages/photographer/WorkDetailPage";
import { OverviewPage } from "./pages/studio/OverviewPage";
import { PackageDetailPage } from "./pages/studio/PackageDetailPage";
import { PackageFormPage } from "./pages/studio/PackageFormPage";
import { PackagesPage } from "./pages/studio/PackagesPage";
import { ProfilePage } from "./pages/studio/ProfilePage";
import { SchedulesPage } from "./pages/studio/SchedulesPage";
import { ShootCalendarPage } from "./pages/studio/ShootCalendarPage";
import { StudioOrderDetailPage } from "./pages/studio/StudioOrderDetailPage";
import { StudioOrdersPage } from "./pages/studio/StudioOrdersPage";
import { StudioReviewsPage } from "./pages/studio/StudioReviewsPage";
import { WorkDetailPage } from "./pages/studio/WorkDetailPage";
import { WorkFormPage } from "./pages/studio/WorkFormPage";
import { WorksPage } from "./pages/studio/WorksPage";

function RequireAuth({
  children,
  photographerOnly = false,
}: {
  children: ReactNode;
  photographerOnly?: boolean;
}): ReactNode {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (photographerOnly && !isPhotographer()) {
    return <Navigate to="/mine" replace />;
  }
  return children;
}

export function App(): ReactNode {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<HomePage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="photographers" element={<PhotographerListPage />} />
        <Route path="photographer/:photographerId/work/:workId" element={<PublicWorkDetailPage />} />
        <Route path="photographer/:id" element={<PhotographerDetailPage />} />
        <Route path="orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="order/:orderId" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="mine" element={<RequireAuth><MinePage /></RequireAuth>} />
      </Route>
      <Route element={<StudioLayout />}>
        <Route path="overview" element={<RequireAuth photographerOnly><OverviewPage /></RequireAuth>} />
        <Route path="studio/profile" element={<RequireAuth photographerOnly><ProfilePage /></RequireAuth>} />
        <Route path="studio/works" element={<RequireAuth photographerOnly><WorksPage /></RequireAuth>} />
        <Route path="studio/works/new" element={<RequireAuth photographerOnly><WorkFormPage /></RequireAuth>} />
        <Route path="studio/works/:id/edit" element={<RequireAuth photographerOnly><WorkFormPage /></RequireAuth>} />
        <Route path="studio/works/:id" element={<RequireAuth photographerOnly><WorkDetailPage /></RequireAuth>} />
        <Route path="studio/packages" element={<RequireAuth photographerOnly><PackagesPage /></RequireAuth>} />
        <Route path="studio/packages/new" element={<RequireAuth photographerOnly><PackageFormPage /></RequireAuth>} />
        <Route path="studio/packages/:id/edit" element={<RequireAuth photographerOnly><PackageFormPage /></RequireAuth>} />
        <Route path="studio/packages/:id" element={<RequireAuth photographerOnly><PackageDetailPage /></RequireAuth>} />
        <Route path="studio/schedules" element={<RequireAuth photographerOnly><SchedulesPage /></RequireAuth>} />
        <Route path="studio/shoot-calendar" element={<RequireAuth photographerOnly><ShootCalendarPage /></RequireAuth>} />
        <Route path="studio/orders" element={<RequireAuth photographerOnly><StudioOrdersPage /></RequireAuth>} />
        <Route path="studio/orders/:id" element={<RequireAuth photographerOnly><StudioOrderDetailPage /></RequireAuth>} />
        <Route path="studio/reviews" element={<RequireAuth photographerOnly><StudioReviewsPage /></RequireAuth>} />
      </Route>
      <Route path="favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
      <Route path="appointment/submit" element={<RequireAuth><AppointmentSubmitPage /></RequireAuth>} />
      <Route path="order/:orderId/review" element={<RequireAuth><OrderReviewPage /></RequireAuth>} />
      <Route path="complaint" element={<RequireAuth><ComplaintPage /></RequireAuth>} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
