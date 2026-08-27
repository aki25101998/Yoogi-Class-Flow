export function getAppUrl(): string {
  // If we are on the client side, the current origin is the most accurate base URL
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side logic
  const customAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (customAppUrl) {
    try {
      const parsedUrl = new URL(customAppUrl);
      return parsedUrl.origin;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('APP_BASE_URL is not configured for production (NEXT_PUBLIC_APP_URL is invalid).');
      }
      console.warn('Invalid NEXT_PUBLIC_APP_URL provided, falling back...');
    }
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_BASE_URL is not configured for production.');
  }

  return 'http://localhost:3000';
}
