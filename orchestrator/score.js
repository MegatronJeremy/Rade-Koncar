"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weightedTotal = void 0;
exports.stddev = stddev;
exports.motion = motion;
exports.scoreCandidate = scoreCandidate;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const pngjs_1 = require("pngjs");
const llm_1 = require("./llm");
/** Contract 4 thresholds. Tuned against fixtures, not against a theory. */
const FLAT_STDDEV = 0.02;
const MOTION_MIN = 0.01;
/**
 * Subject carries double weight, palette and motion three quarters each, so the
 * total still tops out at 30 and the UI's `/ 30` stays true.
 *
 * An equal sum lets palette and motion outvote subject, and subject is where
 * candidates actually fail: across the 48 in experiments/003 the breakdown was
 * 24 unrecognisable, 9 static, 2 blank. Equal weighting scores a beautiful
 * nebula 10/10/0 = 20 above a scruffy but correct wool texture at 5/5/9 = 19,
 * which is the exact inversion `rubric.md` tells the model to avoid.
 */
const WEIGHT = { palette: 0.75, motion: 0.75, subject: 1.5 };
const weightedTotal = (palette, motionScore, subject) => Math.round(WEIGHT.palette * palette + WEIGHT.motion * motionScore + WEIGHT.subject * subject);
exports.weightedTotal = weightedTotal;
const luminance = (p) => {
    const v = new Float64Array(p.width * p.height);
    for (let i = 0, j = 0; i < p.data.length; i += 4, j++) {
        v[j] = (0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]) / 255;
    }
    return v;
};
/** Luminance standard deviation on t1. Catches black, white and flat colour. */
function stddev(t1) {
    const v = luminance(pngjs_1.PNG.sync.read(t1));
    let sum = 0;
    for (const x of v)
        sum += x;
    const mean = sum / v.length;
    let acc = 0;
    for (const x of v)
        acc += (x - mean) ** 2;
    return Math.sqrt(acc / v.length);
}
const meanAbsDiff = (x, y) => {
    const a = pngjs_1.PNG.sync.read(x).data;
    const b = pngjs_1.PNG.sync.read(y).data;
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) {
        diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    }
    return diff / ((a.length / 4) * 3 * 255);
};
/**
 * Largest mean absolute channel difference across the three frames. Comparing
 * only t0 to t2 calls anything whose period divides two seconds motionless,
 * because it has returned to where it started. A pendulum is the obvious case.
 *
 * Measured over the 48 candidates in experiments/003 this rescues none of them,
 * so it is closing a hole rather than fixing observed damage. It costs one more
 * pass over frames already in memory.
 */
function motion(t0, t1, t2) {
    return Math.max(meanAbsDiff(t0, t1), meanAbsDiff(t1, t2), meanAbsDiff(t0, t2));
}
/**
 * Prefilter first, vision only on what survives it. The two questions a vision
 * model answers worst, is it blank and does it move, are exactly the two pixel
 * arithmetic answers with certainty, so they are computed here and override the
 * model. Most generation-1 candidates are blank, and a blank candidate should
 * cost a standard deviation rather than an API call.
 */
async function scoreCandidate(prompt, r) {
    const [t0, t1, t2] = r.png;
    if (t0 === undefined || t1 === undefined || t2 === undefined) {
        return { scores: { flat: true, motion: 0, palette: 0, subject: 0, total: 0 }, critique: "no frames" };
    }
    const sd = stddev(t1);
    const md = motion(t0, t1, t2);
    if (sd < FLAT_STDDEV) {
        return { scores: { flat: true, motion: 0, palette: 0, subject: 0, total: 0 }, critique: "renders flat" };
    }
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "shader-"));
    const paths = r.png.map((buf, i) => {
        const p = (0, node_path_1.join)(dir, `t${i}.png`);
        (0, node_fs_1.writeFileSync)(p, buf);
        return p;
    });
    const v = await (0, llm_1.scoreFrames)(prompt, paths);
    const motionScore = md < MOTION_MIN ? 0 : v.motion;
    return {
        scores: {
            flat: false,
            motion: motionScore,
            palette: v.palette,
            subject: v.subject,
            total: (0, exports.weightedTotal)(v.palette, motionScore, v.subject),
        },
        critique: v.critique,
    };
}
