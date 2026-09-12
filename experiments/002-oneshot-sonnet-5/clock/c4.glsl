float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y * 2.0;
    const float TWO_PI = 6.28318530718;

    float secN = mod(iTime, 60.0);
    float minN = mod(iTime / 60.0, 60.0);
    float hourN = mod(iTime / 3600.0, 12.0);

    float thetaSec = secN / 60.0 * TWO_PI;
    float thetaMin = (minN + secN / 60.0) / 60.0 * TWO_PI;
    float thetaHour = (hourN + minN / 60.0) / 12.0 * TWO_PI;

    float rFace = length(uv);
    vec3 col = mix(vec3(0.05, 0.05, 0.08), vec3(0.0, 0.0, 0.02), rFace);

    float faceMask = smoothstep(0.95, 0.9, rFace);
    col = mix(col, vec3(0.1, 0.1, 0.15), faceMask);
    float ring = smoothstep(0.025, 0.0, abs(rFace - 0.9));
    col = mix(col, vec3(0.8, 0.85, 0.9), ring);

    for (int i = 0; i < 12; i++) {
        float a = float(i) / 12.0 * TWO_PI;
        vec2 dir = vec2(sin(a), cos(a));
        float tick = smoothstep(0.03, 0.0, length(uv - dir * 0.8));
        col = mix(col, vec3(0.9), tick);
    }

    vec2 hourDir = vec2(sin(thetaHour), cos(thetaHour));
    vec2 minDir = vec2(sin(thetaMin), cos(thetaMin));
    float dHour = sdSegment(uv, vec2(0.0), hourDir * 0.42);
    float dMin = sdSegment(uv, vec2(0.0), minDir * 0.62);
    col = mix(col, vec3(0.9), smoothstep(0.022, 0.01, dHour));
    col = mix(col, vec3(0.9), smoothstep(0.016, 0.007, dMin));

    const int TRAILS = 24;
    vec3 trailCol = vec3(0.0);
    for (int i = 0; i < TRAILS; i++) {
        float fi = float(i);
        float trailAngle = thetaSec - fi * 0.045;
        float weight = exp(-fi * 0.28);
        vec2 dir = vec2(sin(trailAngle), cos(trailAngle));
        float d = sdSegment(uv, vec2(0.0), dir * 0.78);
        float mask = smoothstep(0.014, 0.004, d);
        trailCol += vec3(1.0, 0.25, 0.15) * mask * weight;
    }
    col += trailCol;

    float hub = smoothstep(0.03, 0.02, rFace);
    col = mix(col, vec3(1.0, 0.3, 0.2), hub);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
