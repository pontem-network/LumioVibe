import React from "react";
import {
  useRouteError,
  isRouteErrorResponse,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import i18n from "#/i18n";
import { useConfig } from "#/hooks/query/use-config";
import { Sidebar } from "#/components/features/sidebar/sidebar";
import { useSettings } from "#/hooks/query/use-settings";
import { useBalance } from "#/hooks/query/use-balance";
import { SetupPaymentModal } from "#/components/features/payment/setup-payment-modal";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { useIsOnTosPage } from "#/hooks/use-is-on-tos-page";
import { EmailVerificationGuard } from "#/components/features/guards/email-verification-guard";
import { MaintenanceBanner } from "#/components/features/maintenance/maintenance-banner";
import { cn, isMobileDevice } from "#/utils/utils";
import { useAuthWallet } from "#/hooks/use-auth";
import { WalletPanel } from "#/components/wallet/walletPanel";
import { FloatingSpheres } from "#/components/ui/floating-spheres";
import { PreLoader } from "#/assets/preloader";

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status}</h1>
        <p>{error.statusText}</p>
        <pre>
          {error.data instanceof Object
            ? JSON.stringify(error.data)
            : error.data}
        </pre>
      </div>
    );
  }
  if (error instanceof Error) {
    return (
      <div>
        <h1>{t(I18nKey.ERROR$GENERIC)}</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return (
    <div>
      <h1>{t(I18nKey.ERROR$UNKNOWN)}</h1>
    </div>
  );
}

export default function MainApp() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOnTosPage = useIsOnTosPage();
  const { data: settings } = useSettings();
  const { error } = useBalance();
  const { t } = useTranslation();

  const config = useConfig();
  const authWallet = useAuthWallet();
  const isWalletAuth = authWallet.connected;

  React.useEffect(() => {
    if (pathname.indexOf("/settings") === 0) navigate("/");
  }, [pathname]);

  React.useEffect(() => {
    // Don't change language when on TOS page
    if (!isOnTosPage && settings?.LANGUAGE) {
      i18n.changeLanguage(settings.LANGUAGE);
    }
  }, [settings?.LANGUAGE, isOnTosPage]);

  React.useEffect(() => {
    if (settings?.IS_NEW_USER && config.data?.APP_MODE === "saas") {
      displaySuccessToast(t(I18nKey.BILLING$YOURE_IN));
    }
  }, [settings?.IS_NEW_USER, config.data?.APP_MODE]);

  React.useEffect(() => {
    if (!isWalletAuth && pathname !== "/auth") {
      navigate("/auth");
    } else if (isWalletAuth && pathname === "/auth") {
      navigate("/");
    }
  }, [isWalletAuth, pathname]);
  React.useEffect(() => {
    // Don't do any redirects when on TOS page
    // Don't allow users to use the app if it 402s
    if (!isOnTosPage && error?.status === 402 && pathname !== "/") {
      navigate("/");
    }
  }, [error?.status, pathname, isOnTosPage]);

  if (
    (!isWalletAuth && pathname !== "/auth") ||
    (isWalletAuth && pathname === "/auth")
  ) {
    return <PreLoader />;
  }

  return (
    <div
      data-testid="root-layout"
      className={cn(
        "h-screen lg:min-w-[1024px] flex flex-col md:flex-row relative",
        pathname === "/" ? "p-0" : "p-0 md:p-3 md:pl-0",
        isMobileDevice() && "overflow-hidden",
      )}
    >
      {/* Lumio background glow effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(174, 121, 147, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(14, 105, 169, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 50%, rgba(174, 121, 147, 0.05) 0%, transparent 40%)
          `,
        }}
      />
      {/* Animated floating spheres */}
      <FloatingSpheres />
      <WalletPanel />
      <Sidebar />

      <div className="flex flex-col w-full h-[calc(100%-50px)] md:h-full gap-3 z-10">
        {config.data?.MAINTENANCE && (
          <MaintenanceBanner startTime={config.data.MAINTENANCE.startTime} />
        )}
        <div
          id="root-outlet"
          className="flex-1 relative overflow-auto custom-scrollbar"
        >
          <EmailVerificationGuard>
            <Outlet />
          </EmailVerificationGuard>
        </div>
      </div>

      {/* {renderAuthModal && (
        <AuthModal
          githubAuthUrl={effectiveGitHubAuthUrl}
          appMode={config.data?.APP_MODE}
          providersConfigured={config.data?.PROVIDERS_CONFIGURED}
          authUrl={config.data?.AUTH_URL}
        />
      )} */}
      {/* {renderReAuthModal && <ReauthModal />} */}
      {/* {config.data?.APP_MODE === "oss" && consentFormIsOpen && (
        <AnalyticsConsentFormModal
          onClose={() => {
            setConsentFormIsOpen(false);
          }}
        />
      )} */}

      {config.data?.FEATURE_FLAGS.ENABLE_BILLING &&
        config.data?.APP_MODE === "saas" &&
        settings?.IS_NEW_USER && <SetupPaymentModal />}
    </div>
  );
}
