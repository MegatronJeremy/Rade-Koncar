"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolSize = void 0;
exports.createPool = createPool;
exports.mapOverPool = mapOverPool;
exports.renderInSandbox = renderInSandbox;
const sdk_1 = require("@daytonaio/sdk");
const env_1 = require("./env");
const WORKDIR = "/harness";
/** Three frames at 20 s each, plus room for the sandbox round trip. */
const EXEC_TIMEOUT_S = 90;
/**
 * The snapshot asks for 4 GB and the account allows 10 GiB in total, so two
 * sandboxes is the real ceiling, not six. POP stays at 6: the six candidates
 * queue through the pool instead of each getting a box. Rendering is a couple of
 * seconds, so three batches of two costs about ten seconds a generation.
 *
 * Created once per run and reused across all three generations. If a create
 * fails partway, the ones already up are deleted before rethrowing; leaking them
 * eats the memory cap and the next run cannot start at all.
 */
async function createPool(size) {
    (0, env_1.need)("DAYTONA_API_KEY");
    const snapshot = (0, env_1.need)("DAYTONA_SNAPSHOT");
    const daytona = new sdk_1.Daytona();
    const boxes = [];
    try {
        await (0, env_1.timed)(`daytona create x${size}`, async () => {
            for (let i = 0; i < size; i++)
                boxes.push(await daytona.create({ snapshot }));
        });
    }
    catch (err) {
        await Promise.allSettled(boxes.map((b) => b.delete()));
        throw err;
    }
    console.log(`[daytona] pool ${boxes.map((b) => b.id.slice(0, 8)).join(" ")}`);
    return {
        boxes,
        dispose: async () => {
            await Promise.allSettled(boxes.map((b) => b.delete()));
            console.log("[daytona] pool deleted");
        },
    };
}
/**
 * Run `work` over every item, at most one at a time per sandbox. Each box pulls
 * the next index off a shared cursor, so a slow candidate does not hold up a box
 * that is free.
 */
async function mapOverPool(pool, items, work) {
    let cursor = 0;
    await Promise.all(pool.boxes.map(async (box) => {
        for (;;) {
            const i = cursor++;
            if (i >= items.length)
                return;
            await work(box, items[i], i);
        }
    }));
}
/**
 * One candidate in one sandbox. A shader that never finishes a frame wedges the
 * renderer, so the harness kills its own browser at 20 s per frame and still
 * exits 0 with status "timeout": a non-zero exit means the harness itself broke.
 */
async function renderInSandbox(box, id, source) {
    const glsl = `${WORKDIR}/in/${id}.glsl`;
    const out = `${WORKDIR}/out/${id}`;
    await box.fs.uploadFile(Buffer.from(source, "utf8"), glsl);
    const res = await box.process.executeCommand(`node render.js --in ${glsl} --out ${out} && cat ${out}/result.json`, WORKDIR, undefined, EXEC_TIMEOUT_S);
    if (res.exitCode !== 0) {
        throw new Error(`harness exit ${res.exitCode}: ${String(res.result).trim().slice(0, 400)}`);
    }
    const json = String(res.result).slice(String(res.result).indexOf("{"));
    const result = JSON.parse(json);
    const png = result.status === "ok"
        ? await Promise.all(result.frames.map((f) => box.fs.downloadFile(`${out}/${f}`)))
        : [];
    return { result, png: png.map((p) => Buffer.from(p)) };
}
/** Concurrent sandboxes. Capped by the account memory limit, not by POP. */
const poolSize = () => Number((0, env_1.opt)("POOL_SIZE", "2"));
exports.poolSize = poolSize;
