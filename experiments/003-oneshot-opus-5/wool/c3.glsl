float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i+vec2(1,0)),
          c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy) / iResolution.y;
    float breathe = 1.0 + 0.08*sin(iTime*0.9);
    float r = length(uv) / breathe;
    float a = atan(uv.y, uv.x);

    float rings = 13.0;
    float spokes = 26.0;
    float rowIdx = floor(r * rings);
    float rowOff = mod(rowIdx, 2.0) * (3.14159/spokes);
    float normA = (a + rowOff + 3.14159) / (2.0*3.14159);

    vec2 local = vec2(fract(normA * spokes) - 0.5,
                      fract(r * rings) - 0.5);

    // Stitch shape: two lobes + body column
    float lobe1 = length(local - vec2(0.0, 0.18)) - 0.20;
    float lobe2 = length(local - vec2(0.0,-0.18)) - 0.20;
    float body  = abs(local.x) - 0.065;
    float stitch = min(min(lobe1, lobe2), body);

    float fuzz = noise(uv*70.0 + iTime*0.35)*0.022;
    stitch += fuzz;

    vec3 yarnCol = palette(r*0.4 + 0.07*sin(iTime*0.65),
        vec3(0.48, 0.19, 0.24),
        vec3(0.14, 0.07, 0.05),
        vec3(1.0, 2.0, 1.0),
        vec3(0.0, 0.5, 0.1));

    float lit = smoothstep(0.012, 0.0, stitch);
    vec3 col = mix(yarnCol*0.28, yarnCol, lit);
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}