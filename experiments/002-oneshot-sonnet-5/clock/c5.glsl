float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    float m = hash21(p + vec2(31.7, 11.3));
    return vec2(n, m);
}

float voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float minDist = 8.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5 * sin(iTime * 0.6 + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            minDist = min(minDist, d);
        }
    }
    return sqrt(minDist);
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

    float v = voronoi(uv * 4.0);
    vec3 cellCol = mix(vec3(0.05, 0.05, 0.1), vec3(0.5, 0.55, 0.65), v);

    float rFace = length(uv);
    float faceMask = smoothstep(0.95, 0.9, rFace);
    vec3 col = mix(vec3(0.0), cellCol, faceMask);

    float ring = smoothstep(0.025, 0.0, abs(rFace - 0.9));
    col = mix(col, vec3(0.95), ring);

    for (int i = 0; i < 12; i++) {
        float a = float(i) / 12.0 * TWO_PI;
        vec2 dir = vec2(sin(a), cos(a));
        float tick = smoothstep(0.03, 0.0, length(uv - dir * 0.8));
        col = mix(col, vec3(1.0), tick);
    }

    vec2 hourDir = vec2(sin(thetaHour), cos(thetaHour));
    vec2 minDir = vec2(sin(thetaMin), cos(thetaMin));
    vec2 secDir = vec2(sin(thetaSec), cos(thetaSec));

    float dHour = sdSegment(uv, vec2(0.0), hourDir * 0.45);
    float dMin = sdSegment(uv, vec2(0.0), minDir * 0.65);
    float dSec = sdSegment(uv, vec2(0.0), secDir * 0.78);

    col = mix(col, vec3(0.05), smoothstep(0.024, 0.01, dHour));
    col = mix(col, vec3(0.05), smoothstep(0.017, 0.008, dMin));
    col = mix(col, vec3(1.0, 0.3, 0.15), smoothstep(0.012, 0.004, dSec));

    float hub = smoothstep(0.03, 0.02, rFace);
    col = mix(col, vec3(1.0, 0.3, 0.15), hub);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
