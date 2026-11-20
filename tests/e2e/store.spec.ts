import { expect, test } from "@playwright/test";

test("a sacola gera um pedido no banco", async ({ page, request }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Adicionar à sacola" }).first()
  ).toBeVisible();

  const healthBefore = await (await request.get("/api/health")).json();
  const before = healthBefore.db.orders as number;

  await page.getByRole("button", { name: "Adicionar à sacola" }).first().click();

  const drawer = page.getByRole("dialog", { name: "Sacola de compras Maria's Store" });
  await expect(drawer).toBeVisible();

  const post = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("3010"),
    { timeout: 30_000 }
  );

  await drawer.getByRole("button", { name: /Copiar resumo do pedido/i }).click();
  const response = await post;
  expect(response.status()).toBe(200);

  await expect.poll(async () => {
    const health = await (await request.get("/api/health")).json();
    return health.db.orders as number;
  }).toBeGreaterThan(before);
});

test("a api de estoque expoe os niveis do banco", async ({ request }) => {
  const response = await request.get("/api/stock");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const levels = body.levels as Record<string, number>;
  const values = Object.values(levels);

  expect(values.length).toBeGreaterThan(0);
  expect(values.some((value) => value === 0)).toBeTruthy();
  expect(values.every((value) => Number.isInteger(value) && value >= 0)).toBeTruthy();
});

test("admin exige login e politicas sao publicas", async ({ page }) => {
  await page.goto("/politicas");
  await expect(
    page.getByRole("heading", { name: /Compra, troca e privacidade/i })
  ).toBeVisible();
  await expect(page.getByText(/7 dias/i).first()).toBeVisible();

  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /Área administrativa/i })).toBeVisible();
});
