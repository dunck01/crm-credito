import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@crm-credito/database';
import * as bcrypt from 'bcryptjs';

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Preencha e-mail e senha.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { tenant: true },
        });

        if (!user) {
          throw new Error('Usuário ou senha incorretos.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Usuário ou senha incorretos.');
        }

        if (user.role !== 'SUPER_ADMIN' && user.tenant?.status !== 'ACTIVE') {
          throw new Error('A empresa associada a esta conta está suspensa ou inativa.');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.tenantId = (user as { tenantId?: string | null }).tenantId;
        token.tenantName = (user as { tenantName?: string }).tenantName;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as {
          id?: string;
          role?: unknown;
          tenantId?: unknown;
          tenantName?: unknown;
        };
        u.id = (token.id as string) || token.sub;
        u.role = token.role;
        u.tenantId = token.tenantId;
        u.tenantName = token.tenantName;
      }
      return session;
    },
  },
};
