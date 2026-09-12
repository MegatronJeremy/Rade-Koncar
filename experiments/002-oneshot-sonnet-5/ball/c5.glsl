float ballHeight(float t) {
    float period = 1.1;
    float tt = fract(t / period);
    return 4.0 * tt * (1.0 - tt);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float floorY = -0.32;
    float radius = 0.15;

    float floorMask = smoothstep(0.015, -0.015, uv.y - floorY);
    vec3 col = mix(vec3(0.75, 0.8, 0.85), vec3(0.97), floorMask);

    vec3 trailAccum = vec3(0.0);
    float coverage = 0.0;
    const int N = 14;
    for (int i = 0; i < N; i++) {
        float dt = float(i) * 0.025;
        float tPast = iTime - dt;
        float h = ballHeight(tPast);
        vec2 center = vec2(0.0, floorY + radius + h * 0.5);
        float d = length(uv - center) - radius;
        float mask = smoothstep(0.01, -0.01, d);
        float weight = exp(-float(i) * 0.35);
        trailAccum += vec3(0.85, 0.1, 0.08) * mask * weight;
        coverage = max(coverage, mask * weight);
    }

    col = mix(col, clamp(trailAccum, 0.0, 1.0), clamp(coverage, 0.0, 1.0));

    float hNow = ballHeight(iTime);
    vec2 centerNow = vec2(0.0, floorY + radius + hNow * 0.5);
    float dNow = length(uv - centerNow) - radius;
    float maskNow = smoothstep(0.01, -0.01, dNow);
    vec3 shade = vec3(0.9, 0.12, 0.1) * (0.6 + 0.4 * clamp(1.0 - length(uv - centerNow) / radius, 0.0, 1.0));
    col = mix(col, shade, maskNow);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
