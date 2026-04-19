export function apiBaseUrl(): string {
  const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
  return `http://${host}:8000`;
}



