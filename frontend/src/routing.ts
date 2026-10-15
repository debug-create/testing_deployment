export type ProductView = '3d-graph' | 'threat-map' | 'matrix' | 'access-requests';
export type PageRoute = { path: 'home' } | { path: 'product' } | { path: 'results' } | { path: 'case'; caseId: string };

export function parsePageRoute(pathname: string): PageRoute {
  if (pathname.startsWith('/product/case/')) return { path: 'case', caseId: decodeURIComponent(pathname.slice('/product/case/'.length)) };
  if (pathname === '/product') return { path: 'product' };
  if (pathname === '/results') return { path: 'results' };
  return { path: 'home' };
}

export function routePath(route: PageRoute): string {
  if (route.path === 'product') return '/product';
  if (route.path === 'results') return '/results';
  if (route.path === 'case') return `/product/case/${encodeURIComponent(route.caseId)}`;
  return '/';
}

export function productViewPath(view: ProductView): string {
  return `/product?view=${view}`;
}

export function parseProductView(search: string, fallback: ProductView = '3d-graph'): ProductView {
  const value = new URLSearchParams(search).get('view');
  if (value === '3d' || value === '3d-graph') return '3d-graph';
  if (value === 'map' || value === 'threat-map') return 'threat-map';
  if (value === 'topology' || value === 'matrix') return 'matrix';
  if (value === 'jit' || value === 'access' || value === 'access-requests') return 'access-requests';
  return fallback;
}
