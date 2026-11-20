/**
 * Dados cadastrais e de contato da loja.
 * Preenchidos via NEXT_PUBLIC_* no Vercel (e .env.local localmente).
 * Enquanto não preenchidos, a página de políticas avisa — não inventamos CNPJ.
 */

export const storeInfo = {
  legalName: process.env.NEXT_PUBLIC_STORE_LEGAL_NAME?.trim() || "",
  cnpj: process.env.NEXT_PUBLIC_STORE_CNPJ?.trim() || "",
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() || "",
  email: process.env.NEXT_PUBLIC_STORE_EMAIL?.trim() || "",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || "",
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP?.replace(/\D/g, "") || "",
};

export function hasLegalInfo(): boolean {
  return Object.values(storeInfo).some((value) => value !== "");
}
