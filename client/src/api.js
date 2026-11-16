// Empty for the local Vite proxy; Pages builds supply the public Render origin.
export function apiUrl(path) {
  const origin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  return `${origin}${path}`;
}

// Floor plans stored in client/public/ must respect the Pages repository path.
// Fully qualified image URLs continue to use their own host.
export function publicAssetUrl(path) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL;
  if (path.startsWith(base)) return path;
  return `${base}${path.replace(/^\/+/, '')}`;
}
