// Next.js 16: "middleware" foi renomeado para "proxy".
// O wrapper do Auth.js funciona como proxy: usa o callback `authorized`
// definido em auth.config.ts para decidir o acesso a /admin.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
