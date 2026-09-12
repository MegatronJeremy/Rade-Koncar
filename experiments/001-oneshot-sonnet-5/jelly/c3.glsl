vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float pulse = 0.5 + 0.5 * sin(iTime * 1.6);
    float petals = 0.5 + 0.5 * cos(a * 8.0 + sin(iTime * 0.7) * 2.0);
    float bellR = 0.32 + 0.08 * pulse + 0.03 * petals;

    float d = abs(r - bellR);
    float ring = exp(-d * 20.0);

    float wave = fract(r * 3.0 - iTime * 0.8);
    float wglow = smoothstep(1.0, 0.0, wave) * smoothstep(0.0, 0.3, r);

    vec3 deep = mix(vec3(0.0, 0.01, 0.04), vec3(0.0, 0.04, 0.09), clamp(r, 0.0, 1.0));
    vec3 col = deep;
    vec3 glowCol = palette(a / 6.28318 + iTime * 0.05, vec3(0.1, 0.3, 0.4), vec3(0.2, 0.3, 0.4), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.6, 0.8));

    col += glowCol * ring * 1.3;
    col += glowCol * wglow * 0.4 * (1.0 - clamp(r, 0.0, 1.0));
    col += glowCol * exp(-r * 4.0) * 0.3;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
