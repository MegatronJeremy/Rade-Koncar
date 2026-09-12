float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0)), c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
// SDF: jellyfish bell = hemisphere capped cylinder warped by sine ripples
float sdfBell(vec3 p, float pulse) {
    float r = length(p.xz);
    float ripple = 0.015 * sin(r * 18.0 - iTime * 4.0); // radial ripple
    float bellH = 0.20 * (1.0 + 0.12 * pulse);
    float bellR = 0.22 * (1.0 + 0.08 * pulse);
    // dome: sphere clipped to y <= 0
    float sphere = length(vec3(p.x, p.y - (-0.05), p.z)) - bellR + ripple;
    float cap = p.y + 0.05; // y <= -0.05 half
    float dome = max(sphere, cap);
    // skirt below dome
    float skirtR = bellR * (1.0 + 0.25 * smoothstep(0.0, 0.12, -p.y - 0.05));
    float skirt = length(p.xz) - skirtR - ripple;
    float skirtH = max(-p.y - 0.05, p.y + 0.05 + 0.12);
    float skirtSdf = max(skirt, skirtH);
    return min(dome, skirtSdf);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    float pulse = 0.5 + 0.5 * sin(t * 2.6);
    // camera: fixed above, looking slightly down
    vec3 ro = vec3(0.0, 0.4, 1.1);
    vec3 target = vec3(sin(t * 0.18) * 0.08, -0.05, 0.0);
    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(fwd, vec3(0,1,0)));
    vec3 up = cross(right, fwd);
    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);
    // raymarch
    float dz = 0.0;
    float glow = 0.0;
    vec3 glowCol = vec3(0.0);
    bool hit = false;
    vec3 hitP = vec3(0.0);
    for (int i = 0; i < 56; i++) {
        vec3 p = ro + rd * dz;
        float d = sdfBell(p, pulse);
        if (d < 0.003) { hit = true; hitP = p; break; }
        // accumulate volumetric glow near surface
        glow += 0.012 / max(abs(d) * 6.0, 0.01);
        dz += max(d * 0.55, 0.005);
        if (dz > 3.5) break;
    }
    // deep water bg
    vec3 bg = vec3(0.0, 0.012, 0.04);
    bg += 0.006 * noise(uv * 4.0 + t * 0.07) * vec3(0.0, 0.4, 1.0);
    vec3 col = bg;
    if (hit) {
        float nr = length(hitP.xz);
        float angle = atan(hitP.x, hitP.z);
        float bands = 0.5 + 0.5 * sin(nr * 22.0 - t * 3.0 + angle * 3.0);
        vec3 jc = mix(vec3(0.05, 0.6, 0.8), vec3(0.3, 0.1, 0.6), bands);
        col = jc * (0.5 + 0.4 * pulse);
    }
    // glow halo around bell
    glow = clamp(glow * 0.18, 0.0, 1.0);
    col += vec3(0.15, 0.75, 1.0) * glow * (0.6 + 0.4 * pulse);
    // tentacles: 2D SDF strands below bell projected on screen
    for (int k = 0; k < 8; k++) {
        float fk = float(k);
        float ta = 6.28318 * fk / 8.0;
        vec2 tscreen = vec2(sin(ta), -cos(ta)) * 0.10;
        vec2 tbase = tscreen;
        float along = uv.y - tbase.y;
        float sway = 0.025 * sin(along * 7.0 - t * 2.5 + fk * 0.8);
        float td = abs(uv.x - tbase.x - sway) - 0.0018;
        float fade = smoothstep(0.0, 0.03, along) * smoothstep(0.30, 0.05, along);
        col += vec3(0.1, 0.9, 0.85) * 0.45 * fade * smoothstep(0.006, 0.0, td);
    }
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}