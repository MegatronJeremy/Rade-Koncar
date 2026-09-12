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

float terrainHeight(vec2 p, float t) {
    return fbm(p * 1.5 + vec2(0.0, t * 0.1)) * 0.6;
}

float mapScene(vec3 pos, float t) {
    return pos.y - terrainHeight(pos.xz, t);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 1.4, -2.2);
    vec3 rd = normalize(vec3(uv, 1.2));
    float tilt = -0.5;
    rd.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * rd.yz;

    float t = iTime;
    float dist = 0.0;
    float hit = 0.0;
    vec3 pos = ro;
    const int STEPS = 48;
    for (int i = 0; i < STEPS; i++) {
        pos = ro + rd * dist;
        float h = mapScene(pos, t);
        if (h < 0.005) {
            hit = 1.0;
            break;
        }
        dist += clamp(h, 0.02, 0.3);
        if (dist > 8.0) break;
    }

    vec3 col;
    if (hit > 0.5) {
        float hgt = terrainHeight(pos.xz, t);
        float n2 = fbm(pos.xz * 4.0 - vec2(0.0, t * 0.1));
        float cool = 0.5 + 0.5 * sin(t * 0.4);
        float crackVal = smoothstep(0.45, 0.5, n2) * (1.0 - smoothstep(0.5, 0.58, n2));
        vec3 darkCrust = vec3(0.04, 0.035, 0.035) + 0.03 * hgt;
        vec3 glowCol = mix(vec3(1.0, 0.35, 0.02), vec3(1.0, 0.7, 0.15), cool);
        col = darkCrust + glowCol * crackVal * (1.2 - 0.4 * cool);
        float fog = exp(-dist * 0.15);
        col *= fog;
    } else {
        col = vec3(0.0);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
