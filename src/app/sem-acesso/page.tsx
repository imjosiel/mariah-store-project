import Link from "next/link";

import { signOutFromAdmin } from "@/auth-actions";

export default function NoAccessPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-cream px-5 text-espresso">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(168,111,80,0.18), transparent 40%)",
        }}
      />

      <div className="relative w-full max-w-md rounded-[22px] border border-white/70 bg-white/60 p-8 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-copper uppercase">
          Maria&apos;s Store
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">Sem acesso</h1>
        <p className="mt-2 text-xs leading-relaxed text-mocha">
          Esta conta entrou, mas ainda não tem permissão para acessar esta área.
          Peça ao responsável pela loja para liberar seu acesso.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          <form action={signOutFromAdmin}>
            <button
              type="submit"
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5"
            >
              Sair e usar outra conta
            </button>
          </form>
          <Link
            href="/"
            className="rounded-full border border-latte px-6 py-3 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
          >
            Voltar para a loja
          </Link>
        </div>
      </div>
    </main>
  );
}
