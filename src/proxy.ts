// Redirects signed-out visitors to /login (via the `authorized` callback).
// Pages and server actions still check the session themselves.
export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/((?!api/auth|login|setup|_next/static|_next/image|favicon.ico).*)'],
};
