import { connection } from "next/server";

import { getProductsFromDb } from "@/lib/catalogDb";

import { HomeClient } from "./HomeClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  const products = await getProductsFromDb();
  return <HomeClient products={products} />;
}
