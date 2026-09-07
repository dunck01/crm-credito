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
           supervisorId: user.supervisorId,
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
        token.supervisorId = (user as { supervisorId?: string | null }).supervisorId;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenantId: true,
            supervisorId: true,
            tenant: { select: { name: true } },
          },
        });
        if (current) {
          token.id = current.id;
          token.name = current.name;
          token.email = current.email;
          token.role = current.role;
          token.tenantId = current.tenantId;
          token.supervisorId = current.supervisorId;
          token.tenantName = current.tenant?.name;
        }
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
          supervisorId?: unknown;
        };
        u.id = (token.id as string) || token.sub;
        u.role = token.role;
        u.tenantId = token.tenantId;
        u.tenantName = token.tenantName;
        u.supervisorId = token.supervisorId;
      }
      return session;
    },
  },
};
