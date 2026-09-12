float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float bounceHeight(float t) {
    float period = 1.2;
    float tt = fract(t / period);
    return 4.0 * tt * (1.0 - tt);
}

vec2 mapScene(vec3 p, float ballY) {
    vec3 ballCenter = vec3(0.0, ballY, 0.0);
    float dBall = sdSphere(p - ballCenter, 0.5);
    float dFloor = p.y;
    if (dBall < dFloor) {
        return vec2(dBall, 1.0);
    }
    return vec2(dFloor, 0.0);
}

vec3 calcNormal(vec3 p, float ballY) {
    vec2 e = vec2(0.001, 0.0);
    float dx = mapScene(p + e.xyy, ballY).x - mapScene(p - e.xyy, ballY).x;
    float dy = mapScene(p + e.yxy, ballY).x - mapScene(p - e.yxy, ballY).x;
    float dz = mapScene(p + e.yyx, ballY).x - mapScene(p - e.yyx, ballY).x;
    return normalize(vec3(dx, dy, dz));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 1.3, 3.2);
    vec3 target = vec3(0.0, 0.4, 0.0);
    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(fwd * 1.5 + uv.x * right + uv.y * up);

    float ballY = 0.5 + bounceHeight(iTime) * 1.6;

    float t = 0.0;
    float matId = -1.0;
    vec3 p = ro;
    for (int i = 0; i < 64; i++) {
        p = ro + rd * t;
        vec2 res = mapScene(p, ballY);
        if (res.x < 0.001) {
            matId = res.y;
            break;
        }
        t += res.x;
        if (t > 20.0) break;
    }

    vec3 col = vec3(1.0);

    if (matId >= 0.0 && t < 20.0) {
        vec3 n = calcNormal(p, ballY);
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
        float diff = max(dot(n, lightDir), 0.0);
        float amb = 0.25;

        if (matId > 0.5) {
            vec3 base = vec3(0.85, 0.12, 0.1);
            vec3 viewDir = normalize(ro - p);
            vec3 h = normalize(lightDir + viewDir);
            float spec = pow(max(dot(n, h), 0.0), 32.0);
            col = base * (amb + diff * 0.8) + vec3(1.0) * spec * 0.5;
        } else {
            float dist = length(p.xz);
            float occ = smoothstep(0.9, 0.0, dist) * clamp(1.0 - (ballY - 0.5) * 0.35, 0.2, 1.0);
            vec3 base = vec3(0.95) * (0.5 + 0.5 * diff);
            base *= (1.0 - 0.5 * occ);
            float fade = clamp(1.0 - dist * 0.08, 0.0, 1.0);
            col = mix(vec3(1.0), base, fade);
        }
    }

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
