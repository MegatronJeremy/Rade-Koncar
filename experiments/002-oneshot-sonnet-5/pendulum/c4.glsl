float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float map(vec3 p, vec3 pivot, vec3 bob) {
    float dRod = sdCapsule(p, pivot, bob, 0.03);
    float dBob = sdSphere(p - bob, 0.18);
    float dPivot = sdSphere(p - pivot, 0.05);
    return min(min(dRod, dBob), dPivot);
}

vec3 calcNormal(vec3 p, vec3 pivot, vec3 bob) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy, pivot, bob) - map(p - e.xyy, pivot, bob),
        map(p + e.yxy, pivot, bob) - map(p - e.yxy, pivot, bob),
        map(p + e.yyx, pivot, bob) - map(p - e.yyx, pivot, bob)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 0.1, 2.5);
    vec3 rd = normalize(vec3(uv, -1.6));

    float angle = 0.8 * sin(iTime * 1.6);
    vec3 pivot = vec3(0.0, 0.9, 0.0);
    float len = 1.0;
    vec3 bob = pivot + len * vec3(sin(angle), -cos(angle), 0.0);

    float t = 0.0;
    bool hit = false;
    const int STEPS = 56;
    for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p, pivot, bob);
        if (d < 0.001) {
            hit = true;
            break;
        }
        t += d;
        if (t > 8.0) break;
    }

    vec3 col = mix(vec3(0.05,0.06,0.12), vec3(0.15,0.18,0.30), clamp(uv.y + 0.5, 0.0, 1.0));

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p, pivot, bob);
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
        float diff = max(dot(n, lightDir), 0.0);
        vec3 base = (length(p - bob) < 0.2) ? vec3(1.0,0.35,0.2) : vec3(0.8,0.8,0.85);
        col = base * (0.25 + 0.75 * diff);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
