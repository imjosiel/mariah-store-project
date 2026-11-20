import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Configuração edge-safe usada pelo proxy e por src/auth.ts.
 * Aqui só checamos IDENTIDADE. A autorização (allowlist dinâmica) roda
 * no layout de /admin, em runtime Node, porque lê .data/admins.json.
 */

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: { signIn: "/login", error: "/sem-acesso" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (!nextUrl.pathname.startsWith("/admin")) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
