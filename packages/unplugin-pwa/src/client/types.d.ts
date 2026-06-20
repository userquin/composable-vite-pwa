import type { TrustedScriptURL } from 'trusted-types/lib'

/**
 * A function that returns the service worker trusted script url.
 *
 * @param classic Whether the browser is in legacy mode (i.e. not supporting ES modules in service workers).
 * @param swUrl The url for the service worker.
 * @returns The service worker script url.
 */
export type PWATrustedScriptURL = (classic: boolean, swUrl: string) => TrustedScriptURL

export interface RegisterSWOptions {
  immediate?: boolean
  /**
   * Called when the service worker has taken control and the page would normally reload.
   *
   * Useful to fully control the reload flow (for example, to defer reload until the next
   * SPA navigation).
   * @since 2.0.0
   */
  onNeedReload?: () => void
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  /**
   * Service worker trusted script url.
   *
   * @since 2.0.0
   */
  trustedScriptUrl?: TrustedScriptURL | PWATrustedScriptURL
  /**
   * Override the automatic ESM support detection for dev server.
   * Return true to force module type, false for classic,
   * or undefined to let the internal detector decide.
   *
   * **WARNING**: this will be only available for development.
   *
   * @since 2.0.0
   */
  supportsESM?: () => boolean
  /**
   * Called once the service worker is registered.
   *
   * @param swScriptUrl The service worker script url.
   * @param registration The service worker registration if available.
   */
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache
   */
  updateViaCache?: ServiceWorkerUpdateViaCache
}
