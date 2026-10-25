/**
 * CHAOSPATCH Centralized Frontend API Configuration
 *
 * Normalizes and resolves the Render backend URL from Vite environment variables.
 * In production (e.g. Vercel deployment), VITE_API_BASE_URL must be configured.
 */

const rawBaseUrl = (
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  ''
).trim();

const isProduction = Boolean((import.meta as any).env?.PROD);

/**
 * Checks if the API base URL is configured.
 */
export function isApiConfigured(): boolean {
  if (rawBaseUrl) return true;
  return !isProduction;
}

/**
 * Returns the configured backend host without trailing slashes.
 */
export function getBackendRootUrl(): string {
  if (rawBaseUrl) {
    return rawBaseUrl.replace(/\/+$/, '');
  }
  if (isProduction) {
    throw new Error(
      '[CHAOSPATCH CONFIG ERROR] VITE_API_BASE_URL is missing in this production build. ' +
      'Please set VITE_API_BASE_URL (e.g. https://hacktober-2026.onrender.com) in your Vercel Project Settings > Environment Variables, and trigger a redeployment.'
    );
  }
  return '';
}

/**
 * Returns the normalized API base URL.
 * Automatically ensures the '/api' prefix is included once, as expected by the FastAPI backend routes.
 */
export function getApiBaseUrl(): string {
  if (rawBaseUrl) {
    let normalized = rawBaseUrl.replace(/\/+$/, '');
    if (!normalized.endsWith('/api')) {
      normalized = `${normalized}/api`;
    }
    return normalized;
  }

  if (isProduction) {
    const errorMsg =
      '[CHAOSPATCH CONFIG ERROR] VITE_API_BASE_URL is not configured in this production build.\n' +
      'Please configure VITE_API_BASE_URL in your Vercel project environment variables (e.g. https://hacktober-2026.onrender.com) and trigger a redeployment.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Local development fallback: Vite proxies '/api' to local backend (http://127.0.0.1:8000)
  return '/api';
}

/**
 * Normalizes and builds a complete API URL for the given endpoint.
 * - Leaves absolute external URLs (https://, http://) untouched.
 * - Handles leading and trailing slashes cleanly.
 * - Prevents duplicate '/api/api' segments.
 */
export function buildApiUrl(endpoint: string): string {
  // Never prefix external or absolute URLs
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const base = getApiBaseUrl();

  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If endpoint already starts with '/api/', remove the redundant '/api' prefix
  // because getApiBaseUrl() already includes it.
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }

  return `${base}${cleanEndpoint}`;
}
