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

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    uv.y += 0.5;
    float t = iTime;
    float width = 0.22*(1.0-clamp(uv.y,0.0,1.0))+0.02;
    float shapeMask = smoothstep(width+0.04,width-0.04,abs(uv.x))*smoothstep(-0.05,0.1,uv.y)*smoothstep(1.05,0.55,uv.y);

    vec3 accum = vec3(0.0);
    float totalW = 0.0;
    for(int i=0;i<8;i++){
        float fi = float(i);
        float delay = fi*0.06;
        float w = exp(-fi*0.35);
        vec2 p = uv*vec2(3.0,4.0) + vec2(sin(t*2.0+fi)*0.05, 0.0);
        float n = noise(p + vec2(0.0, -(t-delay)*4.0 - fi*5.0));
        vec3 c = mix(vec3(0.5,0.02,0.0), vec3(1.0,0.7,0.15), n);
        accum += c*w;
        totalW += w;
    }
    accum /= max(totalW,0.0001);
    accum *= shapeMask;
    vec3 bg = vec3(0.02,0.02,0.03);
    vec3 col = mix(bg, accum, shapeMask);
    fragColor = vec4(clamp(col,0.0,1.0),1.0);
}