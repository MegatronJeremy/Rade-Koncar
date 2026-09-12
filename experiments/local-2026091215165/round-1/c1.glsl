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

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    uv.y += 0.5;
    float t = iTime;
    float mask = smoothstep(0.55, 0.0, abs(uv.x)*(1.0+uv.y*1.5)) * smoothstep(-0.1,0.2,uv.y) * smoothstep(1.1,0.3,uv.y);
    vec2 p = uv*vec2(2.0,3.0);
    p.y -= t*1.5;
    float warp1 = fbm(p + vec2(0.0, t*0.5));
    vec2 wp = p + vec2(warp1*0.8-0.4, 0.0);
    float n = fbm(wp*1.5 + vec2(t*0.2,0.0));
    vec3 col = mix(vec3(0.6,0.05,0.0), vec3(1.0,0.6,0.1), n);
    col = mix(col, vec3(1.0,1.0,0.7), pow(n,4.0));
    col *= mask;
    vec3 bg = vec3(0.02,0.02,0.03);
    col = mix(bg,col, mask);
    fragColor = vec4(clamp(col,0.0,1.0),1.0);
}