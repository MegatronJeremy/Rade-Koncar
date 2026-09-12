void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float floorY = -0.3;
    float period = 1.0;
    float phase = iTime / period;
    float tt = fract(phase);
    float h = 4.0 * tt * (1.0 - tt);
    float radius = 0.16;
    vec2 center = vec2(0.0, floorY + radius + h * 0.55);

    vec3 white = vec3(0.96);
    float floorMask = smoothstep(0.015, -0.015, uv.y - floorY);

    vec2 contact = vec2(0.0, floorY);
    vec2 rel = uv - contact;
    float r = length(rel);
    float ang = atan(rel.y, rel.x);

    float impactTime = tt;
    float ringPhase = r * 18.0 - impactTime * 14.0;
    float rings = 0.5 + 0.5 * sin(ringPhase);
    float ringFade = exp(-r * 3.0) * smoothstep(0.0, 0.15, impactTime) * (1.0 - smoothstep(0.15, 0.6, impactTime));
    float angleMod = 0.9 + 0.1 * sin(ang * 6.0);

    vec3 floorCol = mix(white, white * 0.85, rings * ringFade * angleMod);
    vec3 col = mix(vec3(0.75, 0.8, 0.85), floorCol, floorMask);

    vec2 pRel = uv - center;
    float pr = length(pRel);
    float pa = atan(pRel.y, pRel.x);
    float dBall = pr - radius;
    float ballMask = smoothstep(0.008, -0.008, dBall);

    float rn = clamp(pr / radius, 0.0, 1.0);
    float highlightAngle = pa - 2.4;
    float highlight = exp(-8.0 * (1.0 - rn)) * (0.5 + 0.5 * cos(highlightAngle));
    float shade = mix(0.35, 1.0, (1.0 - rn));
    vec3 red = vec3(0.85, 0.08, 0.06) * shade + vec3(1.0) * highlight * 0.5;

    col = mix(col, red, ballMask);
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
