mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

float gThetaSec;
float gThetaMin;
float gThetaHour;

float sdCylinderZ(vec3 p, float r, float h) {
    vec2 d = vec2(length(p.xy) - r, abs(p.z) - h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
    float d = sdCylinderZ(p, 1.0, 0.05);

    vec3 ps = p - vec3(0.0, 0.0, 0.05);
    ps.xy = rot(-gThetaSec) * ps.xy;
    float hand = sdBox(ps - vec3(0.0, 0.45, 0.0), vec3(0.012, 0.45, 0.02));
    d = min(d, hand);

    vec3 pm = p - vec3(0.0, 0.0, 0.05);
    pm.xy = rot(-gThetaMin) * pm.xy;
    float mh = sdBox(pm - vec3(0.0, 0.34, 0.0), vec3(0.02, 0.34, 0.02));
    d = min(d, mh);

    vec3 ph = p - vec3(0.0, 0.0, 0.05);
    ph.xy = rot(-gThetaHour) * ph.xy;
    float hh = sdBox(ph - vec3(0.0, 0.24, 0.0), vec3(0.03, 0.24, 0.02));
    d = min(d, hh);

    return d;
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    const float TWO_PI = 6.28318530718;

    float secN = mod(iTime, 60.0);
    float minN = mod(iTime / 60.0, 60.0);
    float hourN = mod(iTime / 3600.0, 12.0);

    gThetaSec = secN / 60.0 * TWO_PI;
    gThetaMin = (minN + secN / 60.0) / 60.0 * TWO_PI;
    gThetaHour = (hourN + minN / 60.0) / 12.0 * TWO_PI;

    vec3 ro = vec3(0.0, 0.0, 2.2);
    vec3 rd = normalize(vec3(uv, -1.6));

    float t = 0.0;
    bool hit = false;
    vec3 p = ro;
    for (int i = 0; i < 64; i++) {
        p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) { hit = true; break; }
        t += d;
        if (t > 6.0) break;
    }

    vec3 col = vec3(0.02, 0.02, 0.05);

    if (hit) {
        vec3 n = getNormal(p);
        vec3 lightDir = normalize(vec3(0.5, 0.6, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        vec3 base = vec3(0.15, 0.16, 0.22);
        float rXY = length(p.xy);
        if (p.z > 0.06) {
            base = (rXY < 0.06) ? vec3(0.9, 0.3, 0.2) : vec3(0.9);
        }
        col = base * (0.25 + 0.75 * diff);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
