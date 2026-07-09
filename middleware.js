export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};

export default function middleware(request) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  // 環境変数が未設定の場合は誤って無防備公開しないようブロックする
  if (!user || !pass) {
    return new Response('管理画面の認証設定（ADMIN_USER / ADMIN_PASSWORD）がされていません。', {
      status: 500,
    });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const sep = decoded.indexOf(':');
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    if (u === user && p === pass) {
      return; // 認証OK、通常通り処理を続行
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="kanri"' },
  });
}
