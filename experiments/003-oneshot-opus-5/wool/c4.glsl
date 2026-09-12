float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i+vec2(1,0)),
          c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
    return v;
}

float woolDensity(vec3 p) {
    float coarse = fbm(p.xy*2.5 + vec2(p.z*0.6, 0.0));
    float fineH  = noise(p.xy*9.0 + vec2(0.0, p.z*3.0));
    float fineV  = noise(p.yx*9.0 + vec2(p.z*3.0, 0.0));
    return coarse*0.65 + fineH*0.2 + fineV*0.15;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy) / iResolution.y;
    vec3 ro = vec3(uv, 0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);

    float lung = 0.10*sin(iTime*0.95);
    float transmit = 1.0;
    vec3 col = vec3(0.0);
    float stepSz = 0.055;

    for (int i = 0; i < 40; i++) {
        float t = float(i)*stepSz;
        vec3 p = ro + rd*t;
        p.z += lung;
        float d = woolDensity(p);
        float alpha = clamp((d - 0.44)*3.2, 0.0, 1.0)*stepSz*5.0;
        vec3 wc = palette(d + p.z*0.25 + 0.05*sin(iTime*0.5),
            vec3(0.78, 0.66, 0.52),
            vec3(0.18, 0.13, 0.09),
            vec3(1.0, 1.0, 1.4),
            vec3(0.1, 0.2, 0.0));
        col += transmit*alpha*wc;
        transmit *= (1.0 - alpha);
        if (transmit < 0.01) break;
    }
    col += transmit*vec3(0.11, 0.09, 0.08);
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}