void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 base = vec2(0.0, -0.45);
    vec2 rp = uv - base;
    float ang = atan(rp.x, rp.y);
    float rad = length(rp);

    float k = clamp(rp.y / 1.1, 0.0, 1.0);
    float baseEdge = mix(0.42, 0.02, k);

    float wobble = 0.06 * sin(ang * 3.0 + t * 5.0 + k * 4.0)
                 + 0.035 * sin(ang * 7.0 - t * 9.0)
                 + 0.02 * sin(ang * 13.0 + t * 17.0);

    float edge = max(baseEdge + wobble * (1.0 - k), 0.01);
    float d = rad - edge;
    float core = smoothstep(0.06, -0.04, d);

    float tt = clamp(rad / edge, 0.0, 1.0);
    vec3 hot = vec3(1.0, 0.95, 0.65);
    vec3 mid = vec3(1.0, 0.5, 0.08);
    vec3 outerc = vec3(0.55, 0.04, 0.0);
    vec3 col = mix(hot, mid, clamp(tt * 1.6, 0.0, 1.0));
    col = mix(col, outerc, clamp((tt - 0.5) * 2.0, 0.0, 1.0));

    vec3 finalCol = col * core;
    finalCol += vec3(1.0, 0.45, 0.1) * exp(-max(d, 0.0) * 7.0) * 0.3;
    finalCol = clamp(finalCol, 0.0, 1.0);
    fragColor = vec4(finalCol, 1.0);
}
