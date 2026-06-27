/**
 * analytics.js
 * Thin wrapper around PostHog for product analytics + Sentry for error capture.
 *
 * PostHog:  set VITE_POSTHOG_KEY  → tracks wallet_connected, isa_created, etc.
 * Sentry:   set VITE_SENTRY_DSN   → captures unhandled JS errors (init in main.jsx)
 *
 * Falls back to no-op console.debug when keys are absent.
 */

import * as Sentry from '@sentry/react';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let ph = null;

async function initPostHog() {
  if (!POSTHOG_KEY) {
    console.info('[Analytics] PostHog key not set — running in no-op mode.');
    return;
  }
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      loaded: (instance) => {
        ph = instance;
        console.info('[Analytics] PostHog initialized.');
      },
    });
  } catch (err) {
    console.warn('[Analytics] PostHog failed to load:', err.message);
  }
}

initPostHog();

export const analytics = {
  /**
   * Track a named product event with optional properties.
   * Mirrors the same event to Sentry breadcrumbs so errors have full context.
   *
   * Tracked events (wired in App.jsx):
   *   wallet_connected   – { address }
   *   isa_created        – { isaId, earner }
   *   investment_submitted – { isaId, amount, investor }
   *   repayment_submitted  – { isaId, amount, earner }
   *   feedback_submitted   – { role }
   *
   * @param {string} event
   * @param {Record<string, unknown>} [props]
   */
  track(event, props = {}) {
    console.debug(`[Analytics] ${event}`, props);

    // PostHog capture
    if (ph) {
      ph.capture(event, props);
    }

    // Add as Sentry breadcrumb for error context (strip raw addresses from logs)
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: event,
      level: 'info',
      data: sanitize(props),
    });
  },

  /**
   * Identify a user by their wallet address (PostHog people record).
   * @param {string} walletAddress
   */
  identify(walletAddress) {
    if (ph) {
      ph.identify(walletAddress, { wallet: walletAddress });
    }
    // Set Sentry user tag — redact full key for privacy
    Sentry.setUser({
      id: walletAddress.substring(0, 8) + '…' + walletAddress.slice(-4),
    });
  },

  /**
   * Manually capture an error to Sentry (for caught exceptions
   * that shouldn't crash the app but should be monitored).
   * @param {Error | string} err
   * @param {Record<string, unknown>} [context]
   */
  captureError(err, context = {}) {
    console.error('[Analytics] captureError:', err);
    Sentry.withScope((scope) => {
      scope.setExtras(sanitize(context));
      if (err instanceof Error) {
        Sentry.captureException(err);
      } else {
        Sentry.captureMessage(String(err), 'error');
      }
    });
  },
};

/** Strip Stellar G-addresses from log data to avoid PII in third-party services. */
function sanitize(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && /^G[A-Z0-9]{55}$/.test(v)) {
      out[k] = v.substring(0, 8) + '…';
    } else {
      out[k] = v;
    }
  }
  return out;
}
