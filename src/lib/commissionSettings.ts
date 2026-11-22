import type { CommissionSettings } from "@/domain/commission";

import { prisma } from "./prisma";

/** Singleton: cria a linha com os padrões se ainda não existir. */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  let row = await prisma.commissionSetting.findFirst();
  if (!row) row = await prisma.commissionSetting.create({ data: {} });

  return {
    onlineGraceDays: row.onlineGraceDays,
    storeGraceDays: row.storeGraceDays,
    commissionBps: row.commissionBps,
  };
}

export async function updateCommissionSettings(
  input: CommissionSettings,
  email: string
): Promise<void> {
  const current = await prisma.commissionSetting.findFirst();
  const data = { ...input, updatedByEmail: email };

  if (current) {
    await prisma.commissionSetting.update({ where: { id: current.id }, data });
  } else {
    await prisma.commissionSetting.create({ data });
  }
}
