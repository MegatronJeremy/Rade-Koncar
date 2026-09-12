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

    vec3 col = vec3(0.03, 0.04, 0.08);

    float rFace = length(uv);
    float face = smoothstep(0.92, 0.9, rFace);
    col = mix(col, vec3(0.12, 0.13, 0.18), face);

    float ring = smoothstep(0.03, 0.0, abs(rFace - 0.9));
    col = mix(col, vec3(0.9, 0.9, 0.95), ring);

    for (int i = 0; i < 12; i++) {
        float a = float(i) / 12.0 * TWO_PI;
        vec2 dir = vec2(sin(a), cos(a));
        vec2 tickPos = dir * 0.82;
        float tick = smoothstep(0.035, 0.02, length(uv - tickPos));
        col = mix(col, vec3(1.0), tick);
    }

    vec2 hourDir = vec2(sin(thetaHour), cos(thetaHour));
    vec2 minDir = vec2(sin(thetaMin), cos(thetaMin));
    vec2 secDir = vec2(sin(thetaSec), cos(thetaSec));

    float dHour = sdSegment(uv, vec2(0.0), hourDir * 0.45);
    float dMin = sdSegment(uv, vec2(0.0), minDir * 0.65);
    float dSec = sdSegment(uv, vec2(0.0), secDir * 0.78);

    col = mix(col, vec3(0.95), smoothstep(0.025, 0.01, dHour));
    col = mix(col, vec3(0.95), smoothstep(0.018, 0.008, dMin));
    col = mix(col, vec3(0.95, 0.25, 0.2), smoothstep(0.012, 0.004, dSec));

    float hub = smoothstep(0.03, 0.02, length(uv));
    col = mix(col, vec3(0.95, 0.25, 0.2), hub);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
