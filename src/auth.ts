import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyCredentials } from '@/lib/accounts';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = typeof raw?.email === 'string' ? raw.email : '';
        const password = typeof raw?.password === 'string' ? raw.password : '';
        if (!email || !password) return null;
        return verifyCredentials(email, password);
      },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.pwdAt = user.pwdAt ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.pwdAt = token.pwdAt ?? null;
      return session;
    },
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
