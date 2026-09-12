float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

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

    vec2 q = vec2(fbm(uv * 1.5), fbm(uv * 1.5 + vec2(5.2, 1.3)));
    vec2 r = vec2(
        fbm(uv * 1.5 + 4.0 * q + vec2(1.7, 9.2) + 0.2 * iTime),
        fbm(uv * 1.5 + 4.0 * q + vec2(8.3, 2.8) + 0.15 * iTime)
    );
    float n = fbm(uv * 1.5 + 4.0 * r);

    vec3 col = palette(n, vec3(0.35, 0.3, 0.35), vec3(0.25, 0.25, 0.3), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.15, 0.25));

    float rFace = length(uv);
    float faceMask = smoothstep(0.95, 0.9, rFace);
    col *= mix(0.15, 1.0, faceMask);

    float ring = smoothstep(0.03, 0.0, abs(rFace - 0.9));
    col = mix(col, vec3(1.0), ring);

    for (int i = 0; i < 12; i++) {
        float a = float(i) / 12.0 * TWO_PI;
        vec2 dir = vec2(sin(a), cos(a));
        vec2 tickPos = dir * 0.8;
        float tick = smoothstep(0.035, 0.0, length(uv - tickPos));
        col = mix(col, vec3(1.0), tick);
    }

    vec2 hourDir = vec2(sin(thetaHour), cos(thetaHour));
    vec2 minDir = vec2(sin(thetaMin), cos(thetaMin));
    vec2 secDir = vec2(sin(thetaSec), cos(thetaSec));

    float dHour = sdSegment(uv, vec2(0.0), hourDir * 0.45);
    float dMin = sdSegment(uv, vec2(0.0), minDir * 0.65);
    float dSec = sdSegment(uv, vec2(0.0), secDir * 0.78);

    col = mix(col, vec3(0.05), smoothstep(0.025, 0.01, dHour));
    col = mix(col, vec3(0.05), smoothstep(0.018, 0.008, dMin));
    col = mix(col, vec3(0.9, 0.2, 0.15), smoothstep(0.012, 0.004, dSec));

    float hub = smoothstep(0.03, 0.02, length(uv));
    col = mix(col, vec3(0.9, 0.2, 0.15), hub);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
