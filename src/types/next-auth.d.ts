import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
    /** users.password_changed_at when this session was issued; see getCurrentUser. */
    pwdAt: string | null;
  }
  interface User {
    pwdAt?: string | null;
  }
}

// next-auth/jwt only re-exports this module, so the interface is augmented at its source.
declare module '@auth/core/jwt' {
  interface JWT {
    uid?: string;
    pwdAt?: string | null;
  }
}
