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

float densityField(vec3 p, float t){
    float base = 1.0 - length(p.xz)*2.5 - p.y*0.3;
    vec3 q = p*3.0;
    q.y -= t*2.0;
    float n = fbm(q.xy + q.z);
    base += (n-0.5)*0.6;
    float taper = clamp(1.0 - p.y, 0.0, 1.0);
    base *= taper;
    return clamp(base, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    float t = iTime;
    vec3 ro = vec3(0.0, 0.4, -1.6);
    vec3 rd = normalize(vec3(uv, 1.0));
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    float dist = 0.0;
    for(int i=0;i<48;i++){
        vec3 p = ro + rd*dist;
        float den = densityField(p - vec3(0.0,-0.2,0.0), t);
        if(den > 0.01){
            float h = clamp(p.y+0.2,0.0,1.0);
            vec3 c = mix(vec3(1.0,0.5,0.05), vec3(1.0,1.0,0.6), h);
            col += (1.0-alpha)*den*0.15*c;
            alpha += (1.0-alpha)*den*0.15;
        }
        dist += 0.06;
        if(dist>4.0 || alpha>0.98) break;
    }
    vec3 bg = vec3(0.02,0.02,0.03);
    col = mix(bg, col, clamp(alpha,0.0,1.0));
    fragColor = vec4(clamp(col,0.0,1.0),1.0);
}