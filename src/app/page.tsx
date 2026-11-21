import { connection } from "next/server";

import { getCategoriesFromDb, getProductsFromDb } from "@/lib/catalogDb";

import { HomeClient } from "./HomeClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  const [products, categories] = await Promise.all([
    getProductsFromDb(),
    getCategoriesFromDb(),
  ]);
  return <HomeClient products={products} categories={categories} />;
}
