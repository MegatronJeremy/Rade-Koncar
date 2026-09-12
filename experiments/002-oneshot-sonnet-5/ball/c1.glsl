float sdEllipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float floorY = -0.35;
    float period = 1.1;
    float tt = fract(iTime / period);
    float h = 4.0 * tt * (1.0 - tt);
    float amplitude = 0.55;
    float radius = 0.16;

    float squash = 1.0 - 0.5 * pow(1.0 - h, 4.0);
    float sx = radius * (1.0 + (1.0 - squash) * 0.9);
    float sy = radius * squash;

    vec2 center = vec2(0.0, floorY + sy + h * amplitude);
    vec2 p = uv - center;

    float dBall = sdEllipse(p, vec2(sx, sy));
    float dFloor = uv.y - floorY;

    vec3 white = vec3(0.97);
    vec3 red = vec3(0.85, 0.1, 0.08);

    vec3 col = mix(vec3(0.7, 0.75, 0.8), white, smoothstep(0.02, -0.02, dFloor));

    float shadowW = mix(0.35, 0.15, h);
    float dShadow = length((uv - vec2(0.0, floorY)) / vec2(shadowW, 0.05)) - 1.0;
    float shadowMask = smoothstep(0.0, -0.3, dShadow) * (1.0 - 0.6 * h);
    col = mix(col, col * 0.6, clamp(shadowMask, 0.0, 1.0) * smoothstep(0.02, -0.02, dFloor));

    float ballMask = smoothstep(0.01, -0.01, dBall);
    vec3 shaded = red * (0.6 + 0.4 * clamp(1.0 - length(p) / max(sx, sy), 0.0, 1.0));
    col = mix(col, shaded, ballMask);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
