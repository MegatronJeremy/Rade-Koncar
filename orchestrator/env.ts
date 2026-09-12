import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(__dirname, "..", ".env");
if (existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);

export const need = (key: string): string => {
  const v = process.env[key];
  if (v === undefined || v === "") throw new Error(`${key} is not set in ${ENV_PATH}`);
  return v;
};

export const opt = (key: string, fallback: string): string => process.env[key] || fallback;

/**
 * Every external call is logged with its duration. When a run takes ninety
 * seconds and should take twenty, this is the only thing that says which of
 * x.ai, Daytona, Convex or Fal is responsible.
 */
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[${label}] ${Date.now() - t}ms`);
  }
}
