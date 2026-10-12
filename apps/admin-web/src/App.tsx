import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { fetchCurrentSession, getAccessToken, logout } from "@aicp/api-client/template-auth";
import { createBrowserSession, type ClientSession } from "@aicp/auth";

import {
  hasRoutePermission,
  generatedMenuByRouteId,
  paths,
  portal,
  publicLoginPath,
  routeConfig,
  type RouteDefinition,
} from "./routes";
import { AccessDeniedView } from "./shared/shell";
import { LoginView, PasswordChangeView } from "./auth/index";
import { PlatformTenantsPage } from "./pages/platform/tenants";
import { DashboardPage } from "./pages/dashboard/index";
import { UsersPage } from "./pages/users/index";
import { PhotographersPage } from "./pages/photographers/index";
import { TablesPage } from "./pages/tables/index";
import { ChartsPage } from "./pages/charts/index";
import { FormPage } from "./pages/form/index";
import { NestedAiPage } from "./pages/nested/ai";
import { NestedChatPage } from "./pages/nested/chat";
import { NotFoundPage } from "./pages/not-found";
import { GeneratedCrudPage } from "./generated/crud-page";
import { GeneratedDashboard } from "./generated/generated-dashboard";
import { generatedProjectConfig } from "./generated/project-config";

const sessionScope = "default";
const platformSessionScope = "__platform__";

export function App(): ReactNode {
  return (
    <Routes>
      <Route path={publicLoginPath} element={<PublicLoginRoute />} />
      <Route path="/platform/*" element={<PlatformApplication />} />
      <Route path="/admin/*" element={<TenantApplication tenantSlug={sessionScope} />} />
      <Route path="*" element={<Navigate to={publicLoginPath} replace />} />
    </Routes>
  );
}

function PublicLoginRoute(): ReactNode {
  const navigate = useNavigate();
  const browserSession = useMemo(() => createBrowserSession(portal), []);
  const [ready, setReady] = useState(() => !getAccessToken());

  useEffect(() => {
    const existing = browserSession.load(sessionScope);
    if (existing) {
      void navigate(paths(sessionScope).dashboard, { replace: true });
      return;
    }
    if (!getAccessToken()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void fetchCurrentSession().then((nextSession) => {
      if (cancelled) return;
      if (nextSession) {
        browserSession.save(sessionScope, nextSession);
        void navigate(paths(sessionScope).dashboard, { replace: true });
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [browserSession, navigate]);

  if (!ready) return null;

  return (
    <LoginView
      onAuthenticated={(_tenantSlug, nextSession) => {
        if (nextSession.account.roles.includes("platform-administrator")) {
          browserSession.save(platformSessionScope, nextSession);
          void navigate("/platform/tenants", { replace: true });
          return;
        }
        const routePaths = paths(sessionScope);
        browserSession.save(sessionScope, nextSession);
        void navigate(
          nextSession.account.mustChangePassword ? routePaths.changePassword : routePaths.dashboard,
          { replace: true },
        );
      }}
    />
  );
}

function TenantApplication({ tenantSlug }: { tenantSlug: string }): ReactNode {
  const navigate = useNavigate();
  const routePaths = paths(tenantSlug);
  const browserSession = useMemo(() => createBrowserSession(portal), []);
  const [session, setSession] = useState<ClientSession | undefined>(() =>
    browserSession.load(tenantSlug),
  );
  const [sessionChecked, setSessionChecked] = useState(() => session !== undefined);

  useEffect(() => {
    if (session) {
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    void fetchCurrentSession().then((nextSession) => {
      if (cancelled) return;
      if (nextSession) {
        browserSession.save(tenantSlug, nextSession);
        setSession(nextSession);
      }
      setSessionChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [browserSession, session, tenantSlug]);

  function defaultPath(currentSession: ClientSession | undefined): string {
    if (!currentSession) return routePaths.login;
    return currentSession.account.mustChangePassword
      ? routePaths.changePassword
      : routePaths.dashboard;
  }

  function endSession(): void {
    void logout()
      .catch(() => undefined)
      .finally(() => {
        browserSession.clear(tenantSlug);
        setSession(undefined);
        void navigate(routePaths.login, { replace: true });
      });
  }

  function renderRoute(route: RouteDefinition): ReactNode {
    if (route.access === "public") {
      return session ? (
        <Navigate to={defaultPath(session)} replace />
      ) : (
        <LoginView
          onAuthenticated={(_authenticatedTenantSlug, nextSession) => {
            if (nextSession.account.roles.includes("platform-administrator")) {
              browserSession.save(platformSessionScope, nextSession);
              void navigate("/platform/tenants", { replace: true });
              return;
            }
            browserSession.save(tenantSlug, nextSession);
            setSession(nextSession);
          }}
        />
      );
    }

    if (!session) return <Navigate to={routePaths.login} replace />;

    if (route.access === "password-change") {
      return session.account.mustChangePassword ? (
        <PasswordChangeView
          tenantSlug={tenantSlug}
          onChanged={() => {
            browserSession.clear(tenantSlug);
            setSession(undefined);
          }}
        />
      ) : (
        <Navigate to={routePaths.dashboard} replace />
      );
    }

    if (session.account.mustChangePassword) {
      return <Navigate to={routePaths.changePassword} replace />;
    }
    if (!hasRoutePermission(route, session)) {
      return <AccessDeniedView tenantSlug={tenantSlug} onLogout={endSession} />;
    }

    const pageProps = { session, tenantSlug, onLogout: endSession };
    const generatedMenu = generatedMenuByRouteId(route.id);
    if (generatedMenu) {
      return <GeneratedCrudPage {...pageProps} menu={generatedMenu} />;
    }
    switch (route.id) {
      case "dashboard":
        return generatedProjectConfig.generated && generatedProjectConfig.charts.length
          ? <GeneratedDashboard {...pageProps} />
          : <DashboardPage {...pageProps} />;
      case "users":
        return <UsersPage {...pageProps} />;
      case "photographers":
        return <PhotographersPage {...pageProps} />;
      case "tables":
        return <TablesPage {...pageProps} />;
      case "charts":
        return <ChartsPage {...pageProps} />;
      case "form":
        return <FormPage {...pageProps} />;
      case "nested-ai":
        return <NestedAiPage {...pageProps} />;
      case "nested-chat":
        return <NestedChatPage {...pageProps} />;
      default:
        return <Navigate to={defaultPath(session)} replace />;
    }
  }

  if (!sessionChecked) {
    return null;
  }

  return (
    <Routes>
      <Route index element={<Navigate to={defaultPath(session)} replace />} />
      {routeConfig.map((route) => (
        <Route key={route.id} path={route.path} element={renderRoute(route)} />
      ))}
      <Route
        path="*"
        element={
          session ? (
            <NotFoundPage session={session} tenantSlug={tenantSlug} onLogout={endSession} />
          ) : (
            <Navigate to={routePaths.login} replace />
          )
        }
      />
    </Routes>
  );
}

function PlatformApplication(): ReactNode {
  const navigate = useNavigate();
  const browserSession = useMemo(() => createBrowserSession(portal), []);
  const [session, setSession] = useState<ClientSession | undefined>(() =>
    browserSession.load(platformSessionScope),
  );
  if (!session?.account.roles.includes("platform-administrator")) {
    return <Navigate to={publicLoginPath} replace />;
  }

  function endSession(): void {
    void logout()
      .catch(() => undefined)
      .finally(() => {
        browserSession.clear(platformSessionScope);
        setSession(undefined);
        void navigate(publicLoginPath, { replace: true });
      });
  }

  return (
    <Routes>
      <Route index element={<Navigate to="tenants" replace />} />
      <Route path="tenants" element={<PlatformTenantsPage session={session} onLogout={endSession} />} />
      <Route path="*" element={<Navigate to="tenants" replace />} />
    </Routes>
  );
}
