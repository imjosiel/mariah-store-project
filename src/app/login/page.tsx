import Link from "next/link";

import { signInWithGoogle } from "@/auth-actions";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-cream px-5 text-espresso">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(197,143,112,0.20), transparent 40%), radial-gradient(circle at 85% 85%, rgba(168,111,80,0.12), transparent 40%)",
        }}
      />

      <div className="relative w-full max-w-md rounded-[22px] border border-white/70 bg-white/60 p-8 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-copper uppercase">
          Maria&apos;s Store
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">Área administrativa</h1>
        <p className="mt-2 text-xs leading-relaxed text-mocha">
          Entre com sua conta Google para acessar pedidos, custos e estoque.
        </p>

        <form action={signInWithGoogle} className="mt-7">
          <button
            type="submit"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-espresso px-6 py-3.5 text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="font-serif text-lg leading-none">G</span>
            Entrar com Google
          </button>
        </form>

        <Link
          href="/"
          className="mt-5 block text-center text-[11px] font-semibold text-mocha transition-colors hover:text-espresso"
        >
          Voltar para a loja
        </Link>

        <p className="mt-6 border-t border-latte pt-4 text-[10px] leading-relaxed text-muted">
          Acesso restrito à equipe da loja.
        </p>
      </div>
    </main>
  );
}
