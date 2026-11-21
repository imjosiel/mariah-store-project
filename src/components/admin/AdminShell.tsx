"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardDrive,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  UserPlus,
} from "lucide-react";

import { signOutFromAdmin } from "@/auth-actions";
import { preloadCutout } from "@/lib/cutout";

/** Card com contraste maior: fundo quente do lado de fora, superfície branca por dentro. */
export const PANEL =
  "rounded-[20px] border border-[#E4DED8] bg-white shadow-[0_8px_28px_-20px_rgba(20,16,14,0.28)]";

/** Texto do painel: preto quente, não marrom. */
export const INK = "text-[#141210]";
export const INK_SOFT = "text-[#4A4440]";
export const INK_MUTED = "text-[#6E6660]";

const LINKS = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/usuarios", label: "Administradores", icon: UserPlus },
  { href: "/admin/armazenamento", label: "Armazenamento", icon: HardDrive },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    void preloadCutout();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F7EFE7] text-[#141210]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 6%, rgba(197,143,112,0.14), transparent 38%), radial-gradient(circle at 88% 14%, rgba(228,208,188,0.45), transparent 42%), radial-gradient(circle at 72% 92%, rgba(168,111,80,0.08), transparent 40%)",
        }}
      />

      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col p-4 lg:flex">
          <div className={`${PANEL} flex h-full flex-col p-5`}>
            <div className="border-b border-[#EDE3D8] pb-5">
              <p className="font-serif text-2xl font-semibold leading-none">Maria&apos;s</p>
              <p className="mt-1 font-serif text-xs tracking-[0.22em] text-copper uppercase">
                Store
              </p>
            </div>

            <nav className="mt-6 space-y-1" aria-label="Navegação administrativa">
              {LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors ${
                      active
                        ? "bg-[#161311] font-semibold text-cream"
                        : "font-medium text-[#4A4440] hover:bg-sand/60 hover:text-[#141210]"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/"
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4A4440] transition-colors hover:bg-sand/60 hover:text-[#141210]"
              >
                <Store className="h-4 w-4" strokeWidth={1.8} />
                Ver loja
              </Link>
            </nav>

            <div className="mt-auto">
              <form action={signOutFromAdmin}>
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-xl border border-[#E4DED8] px-3 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-copper hover:text-[#141210]"
                >
                  Sair da conta
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
