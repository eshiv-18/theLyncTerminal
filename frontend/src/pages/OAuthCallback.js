  /**
   * OAuthCallback.js
   *
   * This page is the frontend destination after the backend completes an OAuth
   * code exchange (GitHub or Zoho). The backend should redirect here with:
   *
   *   /oauth/callback?integration=github&status=success&org=<orgId>
   *   /oauth/callback?integration=zoho&status=success&org=<orgId>
   *   /oauth/callback?integration=github&status=error&message=<reason>
   *
   * On success it refreshes the user (to pick up any updated org data) then
   * routes to /integrations so the user sees the newly connected state.
   *
   * WHY THIS IS NEEDED:
   *   Without this page, the OAuth redirect lands on a React 404 (the catch-all
   *   redirects to /login), and users see a broken blank screen after authorising.
   */

  import React, { useEffect, useState } from 'react';
  import { useSearchParams, useNavigate } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

  const INTEGRATION_LABELS = {
    github: 'GitHub',
    zoho:   'Zoho Books',
    hubspot:'HubSpot',
  };

  export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate        = useNavigate();
    const { refreshUser } = useAuth();

    const integration = searchParams.get('integration') || 'integration';
    const status      = searchParams.get('status');          // 'success' | 'error'
    const message     = searchParams.get('message') || '';
    const label       = INTEGRATION_LABELS[integration] || integration;

    const [phase, setPhase] = useState('loading'); // 'loading' | 'success' | 'error'

    useEffect(() => {
      async function handleCallback() {
        if (status === 'error') {
          setPhase('error');
          setTimeout(() => navigate('/integrations'), 4000);
          return;
        }

        // Refresh user so any org updates are reflected in context
        try {
          await refreshUser();
        } catch (_) {
          // Non-fatal — user data will be stale but integration is stored in DB
        }

        setPhase('success');

  // 🔥 NEW LOGIC
  const pendingIntegration = sessionStorage.getItem('onboarding_pending_integration');
  const onboardingStep = sessionStorage.getItem('onboarding_step');

  if (pendingIntegration) {
    sessionStorage.removeItem('onboarding_pending_integration');
    sessionStorage.removeItem('onboarding_step');

    const stepParam = onboardingStep ? `&step=${onboardingStep}` : '';

    setTimeout(() => {
      navigate(`/founder/onboarding?connected=${pendingIntegration}${stepParam}`);
    }, 2000);

    return;
  }

  // fallback (non-onboarding flow)
  setTimeout(() => navigate('/integrations'), 2500);
      }

      handleCallback();
    }, [status, navigate, refreshUser]);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
          {phase === 'loading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Finishing {label} connection…
              </h2>
              <p className="text-sm text-gray-500">Just a moment.</p>
            </>
          )}

          {phase === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {label} connected!
              </h2>
              <p className="text-sm text-gray-500">
                Taking you back to your integrations…
              </p>
            </>
          )}

          {phase === 'error' && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Connection failed
              </h2>
              <p className="text-sm text-gray-500">
                {message || `Could not connect ${label}. Please try again.`}
              </p>
              <p className="text-xs text-gray-400">Redirecting you back…</p>
            </>
          )}
        </div>
      </div>
    );
  }