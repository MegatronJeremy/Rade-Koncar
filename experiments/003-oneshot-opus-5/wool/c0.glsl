float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0)),
          c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - r;
}

float stitchSDF(vec2 p) {
    float d1 = length(p - vec2(0.0, 0.22)) - 0.28;
    float d2 = length(p - vec2(0.0,-0.22)) - 0.28;
    float body = sdRoundBox(p, vec2(0.07, 0.44), 0.06);
    return min(min(d1,d2), body);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy) / iResolution.y;
    float breathe = 1.0 + 0.07*sin(iTime*1.1);
    uv /= breathe;

    float cW = 0.115, cH = 0.155;
    vec2 grid = uv / vec2(cW, cH);
    float row = floor(grid.y);
    float rowOff = mod(row, 2.0)*0.5;
    vec2 id = floor(grid + vec2(rowOff, 0.0));
    vec2 local = (fract(grid + vec2(rowOff, 0.0)) - 0.5) * vec2(cW, cH);

    float fuzz = noise(fragCoord*0.9 + iTime*0.4)*0.008;
    float d = stitchSDF(local / 0.048) * 0.048 + fuzz;

    float rnd = hash21(id*3.7 + 11.1);
    vec3 woolLight = vec3(0.93, 0.86, 0.73) + rnd*0.04;
    vec3 woolDark  = vec3(0.42, 0.28, 0.18);
    float inner = smoothstep(0.002, 0.008, -d);
    float shadow = smoothstep(0.0, 0.018, d);
    vec3 col = mix(woolDark*0.5, mix(woolDark, woolLight, inner), 1.0-shadow*0.55);
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}