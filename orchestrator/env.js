"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opt = exports.need = void 0;
exports.timed = timed;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ENV_PATH = (0, node_path_1.resolve)(__dirname, "..", ".env");
if ((0, node_fs_1.existsSync)(ENV_PATH))
    process.loadEnvFile(ENV_PATH);
const need = (key) => {
    const v = process.env[key];
    if (v === undefined || v === "")
        throw new Error(`${key} is not set in ${ENV_PATH}`);
    return v;
};
exports.need = need;
const opt = (key, fallback) => process.env[key] || fallback;
exports.opt = opt;
/**
 * Every external call is logged with its duration. When a run takes ninety
 * seconds and should take twenty, this is the only thing that says which of
 * x.ai, Daytona, Convex or Fal is responsible.
 */
async function timed(label, fn) {
    const t = Date.now();
    try {
        return await fn();
    }
    finally {
        console.log(`[${label}] ${Date.now() - t}ms`);
    }
}
