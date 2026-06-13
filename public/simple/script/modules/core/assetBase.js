function normalizePathname(pathname) {
  const raw = typeof pathname === 'string' && pathname.trim() ? pathname.trim() : '/';
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery) return '/';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '';
  const trimmed = String(basePath).trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function detectBasePath(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/' || normalizedPathname === '/index.html') {
    return '';
  }

  if (normalizedPathname.endsWith('/index.html')) {
    return normalizeBasePath(normalizedPathname.slice(0, -'/index.html'.length));
  }

  if (normalizedPathname.endsWith('/')) {
    return normalizeBasePath(normalizedPathname.slice(0, -1));
  }

  const lastSlashIndex = normalizedPathname.lastIndexOf('/');
  const tail = normalizedPathname.slice(lastSlashIndex + 1);

  if (!tail.includes('.')) {
    const routeSegments = normalizedPathname.split('/').filter(Boolean);
    if (routeSegments.length > 1) {
      return normalizeBasePath(`/${routeSegments[0]}`);
    }
    return normalizeBasePath(normalizedPathname);
  }

  return normalizeBasePath(normalizedPathname.slice(0, lastSlashIndex));
}

export function resolveAssetUrl({ pathname, assetPath }) {
  const runtimeBase = globalThis?.window?.__APP_BASE_PATH__;
  const basePath = normalizeBasePath(
    typeof runtimeBase === 'string' ? runtimeBase : detectBasePath(pathname)
  );
  const normalizedAssetPath = String(assetPath ?? '')
    .trim()
    .replace(/^\.?\//, '');

  if (!normalizedAssetPath) {
    return basePath || '/';
  }

  return basePath ? `${basePath}/${normalizedAssetPath}` : `/${normalizedAssetPath}`;
}
