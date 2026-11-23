import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Carrega .env / .env.local para os testes de integração com o banco.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    resolve: {
      alias: { "@": process.cwd() },
    },
    test: {
      include: ["src/**/*.test.ts"],
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  };
});
