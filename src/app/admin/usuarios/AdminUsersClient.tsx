"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Plus, Trash2, UserPlus } from "lucide-react";

import { addAdminAction, removeAdminAction } from "@/admin-actions";

const GLASS =
  "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl";

export function AdminUsersClient({
  admins,
  superEmail,
  currentEmail,
}: {
  admins: readonly string[];
  superEmail: string;
  currentEmail: string;
}) {
  const [addState, addAction, addPending] = useActionState(addAdminAction, {
    message: "",
  });
  const [removeState, removeAction] = useActionState(removeAdminAction, {
    message: "",
  });

  const isSuper = currentEmail.toLowerCase() === superEmail;

  return (
    <div className="relative min-h-screen bg-cream text-espresso">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(197,143,112,0.20), transparent 38%), radial-gradient(circle at 88% 88%, rgba(168,111,80,0.12), transparent 42%)",
        }}
      />

      <main className="relative mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <div className={`${GLASS} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
              Maria&apos;s Store · Admin
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">Administradores</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              O super administrador pode adicionar ou remover e-mails com acesso ao painel.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Visão geral
          </Link>
        </div>

        {!isSuper ? (
          <div className={`${GLASS} mt-4 p-6`}>
            <p className="font-serif text-xl">Acesso restrito</p>
            <p className="mt-2 text-xs text-mocha">
              Somente o super administrador pode gerenciar usuários. Seu e-mail (
              {currentEmail}) não tem essa permissão.
            </p>
          </div>
        ) : (
          <>
            <div className={`${GLASS} mt-4 p-5 sm:p-6`}>
              <h2 className="font-serif text-xl font-semibold">Adicionar administrador</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                O e-mail precisa ser uma conta Google usada para entrar no /login.
              </p>

              <form action={addAction} className="mt-4 flex flex-wrap gap-2">
                <label htmlFor="new-admin-email" className="sr-only">
                  E-mail do novo administrador
                </label>
                <input
                  id="new-admin-email"
                  name="email"
                  type="email"
                  required
                  placeholder="nome@gmail.com"
                  className="min-w-[220px] flex-1 rounded-xl border border-latte bg-white/80 px-4 py-2.5 text-sm text-espresso placeholder:text-muted/70 focus:border-rosegold"
                />
                <button
                  type="submit"
                  disabled={addPending}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-espresso px-5 py-2.5 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </form>

              {addState.message && (
                <p className="mt-2 text-[11px] font-semibold text-copper">{addState.message}</p>
              )}
            </div>

            <div className={`${GLASS} mt-4 p-5 sm:p-6`}>
              <div className="flex items-baseline justify-between gap-3 border-b border-latte/70 pb-4">
                <h2 className="font-serif text-xl font-semibold">
                  Usuários com acesso · {admins.length}
                </h2>
              </div>

              <ul className="mt-4 space-y-2">
                {admins.map((email) => {
                  const isSuper = email === superEmail;
                  return (
                    <li
                      key={email}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-latte/80 bg-cream/70 px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        {isSuper && <Crown className="h-4 w-4 text-copper" />}
                        <span className="tabular-price">{email}</span>
                        {isSuper && (
                          <span className="rounded-full border border-copper/40 bg-copper/10 px-2 py-0.5 text-[10px] font-semibold text-copper">
                            super admin
                          </span>
                        )}
                      </span>

                      {!isSuper && (
                        <form action={removeAction}>
                          <input type="hidden" name="email" value={email} />
                          <button
                            type="submit"
                            aria-label={`Remover ${email}`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte px-3 py-1.5 text-[11px] font-semibold text-mocha transition-colors hover:border-copper hover:text-copper"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>

              {removeState.message && (
                <p className="mt-3 text-[11px] font-semibold text-copper">
                  {removeState.message}
                </p>
              )}

              <p className="mt-5 flex items-center gap-1.5 text-[10px] text-muted">
                <Plus className="h-3 w-3" />
                Super admin não pode ser removido. Alterações valem na próxima requisição.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
