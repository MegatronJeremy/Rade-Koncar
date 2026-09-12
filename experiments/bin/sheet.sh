#!/usr/bin/env bash
# Build and serve the review page for one experiment.
#   experiments/bin/sheet.sh 001-oneshot-sonnet-5
set -euo pipefail
EXP="$1"
BIN="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$BIN/../.." && pwd)"
E="$REPO/experiments/$EXP"
PORT="${PORT:-5200}"
[ -d "$E" ] || { echo "no experiment $EXP"; exit 1; }

MODEL=$(jq -r '.model // "?"' "$E/manifest.json" 2>/dev/null || echo "?")
GIT=$(jq -r '.git // "?"' "$E/manifest.json" 2>/dev/null || echo "?")
COST=$(jq -r '[.runs[]?.costUSD // 0]|add // 0' "$E/manifest.json" 2>/dev/null || echo 0)

# ---- data blob: every candidate with its source, status and prompt ----
DATA="$E/.data.json"
: > "$DATA.lines"
for d in "$E"/*/; do
  [ -f "$d/cands.json" ] || continue
  slug=$(basename "$d")
  prompt=$(jq -r --arg s "$slug" '.runs[$s].prompt // ""' "$E/manifest.json" 2>/dev/null || echo "")
  n=$(jq '.candidates|length' "$d/cands.json")
  for i in $(seq 0 $((n-1))); do
    st=$(jq -r '.status' "$d/r$i/result.json" 2>/dev/null || echo harness-failed)
    log=$(jq -r '.log // ""' "$d/r$i/result.json" 2>/dev/null || echo "")
    jq -nc --arg slug "$slug" --arg prompt "$prompt" --argjson i "$i" \
       --arg strategy "$(jq -r ".candidates[$i].strategy // \"?\"" "$d/cands.json")" \
       --arg source "$(jq -r ".candidates[$i].source // \"\"" "$d/cands.json")" \
       --arg status "$st" --arg log "$log" \
       '{slug:$slug,prompt:$prompt,i:$i,strategy:$strategy,source:$source,status:$status,log:$log}' \
       >> "$DATA.lines"
  done
done
jq -s '.' "$DATA.lines" > "$DATA" && rm -f "$DATA.lines"

{
cat << 'HEAD'
<meta charset="utf-8"><title>experiment</title>
<style>
 :root{--bg:#0b0d10;--panel:#12161b;--line:#1a1e24;--fg:#eceff4;--dim:#7c8698;
       --ok:#30c48d;--bad:#e5484d;--blue:#3e9bff}
 *{box-sizing:border-box}
 body{background:var(--bg);color:var(--fg);font:14px/1.55 system-ui;margin:0;padding:24px}
 h1{font-size:19px;margin:0 0 2px}h2{font-size:16px;margin:34px 0 2px;scroll-margin-top:60px}
 .meta,.pr{color:var(--dim);font-size:13px;margin:0 0 10px}
 .bar{position:sticky;top:0;z-index:9;background:var(--bg);padding:10px 0;
      border-bottom:1px solid var(--line);display:flex;gap:14px;align-items:center;font-size:13px}
 .bar button{background:var(--panel);color:var(--fg);border:1px solid var(--line);
      border-radius:6px;padding:5px 12px;cursor:pointer;font:inherit}
 .bar input{accent-color:var(--blue)}
 table.sum{border-collapse:collapse;margin:14px 0;font-size:13px}
 .sum th,.sum td{text-align:left;padding:6px 16px 6px 0;border-bottom:1px solid var(--line)}
 .sum th{color:var(--dim);font-weight:500}
 .crit{background:var(--panel);border-radius:8px;padding:12px 16px;font-size:13px;
       color:#b6bfcc;max-width:920px}
 .crit b{color:var(--fg)}
 .c{border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:14px;
    display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:18px}
 .hd{grid-column:1/-1;display:flex;gap:12px;align-items:baseline}
 .n{color:var(--dim);font-variant-numeric:tabular-nums}.s{font-weight:600}
 .st{margin-left:auto;font-size:12px;padding:2px 9px;border-radius:99px}
 .st.ok{background:#12331f;color:var(--ok)}.st.bad{background:#3a1418;color:var(--bad)}
 canvas.live{width:100%;max-width:400px;aspect-ratio:1;background:var(--panel);
             border-radius:8px;display:block;cursor:zoom-in}
 .cap{color:var(--dim);font-size:11px;padding-top:4px}
 .strip{display:flex;gap:6px;margin-top:10px}
 .strip img{width:76px;height:76px;image-rendering:pixelated;background:var(--panel);border-radius:4px}
 .m{margin-top:10px;font-size:12px;display:flex;gap:16px;flex-wrap:wrap;
    font-variant-numeric:tabular-nums;color:var(--dim)}
 .m b{color:var(--fg)}.m .p{color:var(--ok)}.m .f2{color:var(--bad)}
 pre{background:var(--panel);padding:12px;border-radius:6px;overflow:auto;
     font:12px/1.45 ui-monospace,Menlo,monospace;margin:0;max-height:440px}
 .log{color:var(--bad);font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;
      background:#1b1012;padding:10px;border-radius:6px;margin-top:10px}
 dialog{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px}
 dialog canvas{width:min(80vw,80vh);aspect-ratio:1;display:block;border-radius:8px}
 a{color:var(--blue)}
</style>
HEAD
echo "<h1>$EXP</h1>"
echo "<p class=meta>model <b>$MODEL</b> &middot; repo <b>$GIT</b> &middot; generation cost <b>\$$COST</b></p>"
cat << 'CRIT'
<div class=bar>
  <button id=pp>Pause</button>
  <label>speed <input id=sp type=range min=0.1 max=3 step=0.1 value=1></label>
  <span id=spv class=n>1.0x</span>
  <button id=rw>Restart clocks</button>
  <span class=n id=clock></span>
</div>
<div class=crit style="margin-top:14px"><b>Acceptable</b> needs all three:
<b>1.</b> not blank &nbsp; <b>2.</b> it moves &nbsp; <b>3.</b> a stranger would match it to the words.<br>
<b>flat</b> and <b>motion</b> below are the deterministic prefilter from contract §4, computed from
the captured frames: flat is luminance stddev on t1 (fails under 0.02), motion is mean absolute
t0/t2 difference (fails under 0.01). Those settle 1 and 2. <b>Criterion 3 is yours</b>, which is
what the live canvas is for.<br>
Count per prompt, then pick prompts by how badly they fail: <b>5-6 of 6 means reject the prompt</b>
(the model does not need us), <b>~2 of 6 is the demo target</b>, 0 of 6 will not converge.</div>
CRIT

echo "<table class=sum><tr><th>prompt</th><th>ok</th><th>compile_error</th><th>timeout</th><th>other</th></tr>"
for d in "$E"/*/; do
  [ -f "$d/cands.json" ] || continue
  slug=$(basename "$d"); ok=0; ce=0; to=0; ot=0
  for r in "$d"r*/; do
    st=$(jq -r '.status' "$r/result.json" 2>/dev/null || echo other)
    case "$st" in ok) ok=$((ok+1));; compile_error) ce=$((ce+1));; timeout) to=$((to+1));; *) ot=$((ot+1));; esac
  done
  echo "<tr><td><a href=#$slug>$slug</a></td><td>$ok</td><td>$ce</td><td>$to</td><td>$ot</td></tr>"
done
echo "</table><div id=body></div>"

echo -n '<script type="application/json" id="data">'
sed 's|</|<\\/|g' "$DATA"
echo '</script>'

cat << 'JS'
<script type="module">
const DATA = JSON.parse(document.getElementById('data').textContent);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
const wrap = src => `#version 300 es
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
out vec4 outColor;
${src}
void main(){ mainImage(outColor, gl_FragCoord.xy); }`;

// ---- build DOM ----
const body = document.getElementById('body');
let html = '', bySlug = {};
for (const c of DATA) (bySlug[c.slug] ??= []).push(c);
for (const [slug, list] of Object.entries(bySlug)) {
  html += `<h2 id="${slug}">${slug}</h2><p class=pr>${esc(list[0].prompt)}</p>`;
  for (const c of list) {
    const ok = c.status === 'ok';
    html += `<div class=c><div class=hd><span class=n>#${c.i}</span>
      <span class=s>${esc(c.strategy)}</span>
      <span class="st ${ok?'ok':'bad'}">${c.status}</span></div><div>`;
    if (ok) {
      html += `<canvas class=live data-k="${slug}-${c.i}"></canvas>
        <div class=cap>live, click to enlarge</div>
        <div class=strip data-slug="${slug}" data-i="${c.i}">` +
        [0,1,2].map(t=>`<img src="${slug}/r${c.i}/t${t}.png" data-t="${t}" title="captured t=${t}s">`).join('') +
        `</div><div class=m data-for="${slug}-${c.i}">measuring...</div>`;
    }
    if (c.log) html += `<div class=log>${esc(c.log)}</div>`;
    html += `</div><div><pre>${esc(c.source)}</pre></div></div>`;
  }
}
body.innerHTML = html;

// ---- live WebGL, shared clock, only while visible ----
const progs = new Map();
function init(cv, src) {
  const gl = cv.getContext('webgl2', {preserveDrawingBuffer:false});
  if (!gl) return null;
  const mk = (t,s) => { const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  try {
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, wrap(src)));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    return {gl,p,t:gl.getUniformLocation(p,'iTime'),r:gl.getUniformLocation(p,'iResolution')};
  } catch(e) {
    const d=document.createElement('div'); d.className='log';
    d.textContent='live compile failed: '+e.message; cv.replaceWith(d); return null;
  }
}
const active = new Set();
document.querySelectorAll('canvas.live').forEach(cv =>
  new IntersectionObserver(es => es.forEach(e => {
    const k = cv.dataset.k;
    if (e.isIntersecting) {
      if (!progs.has(k)) {
        const c = DATA.find(x => `${x.slug}-${x.i}` === k);
        cv.width = 400; cv.height = 400;
        const g = init(cv, c.source); if (!g) return; progs.set(k, g);
      }
      active.add(k);
    } else active.delete(k);
  }), {rootMargin:'300px'}).observe(cv));

let playing = true, speed = 1, clock = 0, last = performance.now();
const ppBtn=document.getElementById('pp'), spEl=document.getElementById('sp'),
      spv=document.getElementById('spv'), clk=document.getElementById('clock');
ppBtn.onclick = () => { playing=!playing; ppBtn.textContent = playing?'Pause':'Play'; };
spEl.oninput = () => { speed=+spEl.value; spv.textContent=speed.toFixed(1)+'x'; };
document.getElementById('rw').onclick = () => { clock=0; };
function frame(now) {
  const dt = (now-last)/1000; last = now;
  if (playing) clock += dt*speed;
  clk.textContent = 't = '+clock.toFixed(2)+'s';
  for (const k of active) {
    const g = progs.get(k); if (!g) continue;
    g.gl.viewport(0,0,400,400);
    g.gl.uniform1f(g.t, clock);
    g.gl.uniform3f(g.r, 400, 400, 1);
    g.gl.drawArrays(g.gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- click to enlarge ----
const dlg = document.createElement('dialog');
dlg.innerHTML = '<canvas></canvas>';
document.body.appendChild(dlg);
const big = dlg.querySelector('canvas');
let bigG = null, bigK = null;
document.addEventListener('click', e => {
  const cv = e.target.closest('canvas.live'); if (!cv) return;
  bigK = cv.dataset.k;
  const c = DATA.find(x => `${x.slug}-${x.i}` === bigK);
  big.width = 900; big.height = 900;
  bigG = init(big, c.source);
  dlg.showModal();
});
dlg.addEventListener('click', () => { dlg.close(); bigG = null; });
(function bigFrame(){ if (bigG && dlg.open) {
    bigG.gl.viewport(0,0,900,900);
    bigG.gl.uniform1f(bigG.t, clock);
    bigG.gl.uniform3f(bigG.r, 900, 900, 1);
    bigG.gl.drawArrays(bigG.gl.TRIANGLES, 0, 3);
  } requestAnimationFrame(bigFrame); })();

// ---- prefilter metrics from the captured frames ----
const lum = d => { let s=0, n=d.length/4, v=new Float64Array(n);
  for(let i=0,j=0;i<d.length;i+=4,j++){ v[j]=(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255; s+=v[j]; }
  return {v, mean:s/n}; };
async function px(img){ await img.decode();
  const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
  return x.getImageData(0,0,c.width,c.height).data; }
for (const strip of document.querySelectorAll('.strip')) {
  const out = document.querySelector(`.m[data-for="${strip.dataset.slug}-${strip.dataset.i}"]`);
  try {
    const [d0,d1,d2] = await Promise.all([...strip.querySelectorAll('img')].map(px));
    const {v,mean} = lum(d1);
    let acc=0; for (const x of v) acc += (x-mean)**2;
    const sd = Math.sqrt(acc/v.length);
    let diff=0; for (let i=0;i<d0.length;i+=4)
      diff += Math.abs(d0[i]-d2[i])+Math.abs(d0[i+1]-d2[i+1])+Math.abs(d0[i+2]-d2[i+2]);
    const md = diff/(d0.length/4*3*255);
    const fk = sd>=0.02, mk = md>=0.01;
    out.innerHTML = `<span>flat <b class="${fk?'p':'f2'}">${sd.toFixed(4)}</b> ${fk?'pass':'FLAT'}</span>`
      + `<span>motion <b class="${mk?'p':'f2'}">${md.toFixed(4)}</b> ${mk?'pass':'STATIC'}</span>`
      + `<span>prefilter <b class="${fk&&mk?'p':'f2'}">${fk&&mk?'survives':'scores 0'}</b></span>`;
  } catch(e) { out.textContent = 'metrics need http (canvas tainted on file://)'; }
}
</script>
JS
} > "$E/index.html"

if ! curl -s -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
  ( cd "$REPO/experiments" && nohup python3 -m http.server "$PORT" >/dev/null 2>&1 & )
  sleep 1
fi
URL="http://localhost:$PORT/$EXP/index.html"
echo "$URL"
open "$URL"
