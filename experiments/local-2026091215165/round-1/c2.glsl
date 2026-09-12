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
    float width = 0.28*(1.0-clamp(uv.y,0.0,1.0));
    float shapeMask = smoothstep(width+0.05, width-0.05, abs(uv.x)) * smoothstep(-0.05,0.1,uv.y) * smoothstep(1.05,0.6,uv.y);

    float density = 0.0;
    float amp = 0.6;
    vec2 p = uv*vec2(3.0,4.0);
    for(int i=0;i<4;i++){
        float speed = 1.0 + float(i)*0.7;
        vec2 pp = p + vec2(0.0, -t*speed - float(i)*10.0);
        density += amp*noise(pp*(1.0+float(i)*0.5));
        amp *= 0.55;
    }
    density = clamp(density,0.0,1.0);
    density *= shapeMask;

    vec3 col = mix(vec3(0.4,0.02,0.0), vec3(1.0,0.7,0.1), density);
    col = mix(col, vec3(1.0,1.0,0.8), pow(density,5.0));
    vec3 bg = vec3(0.02,0.02,0.03);
    col = mix(bg, col, shapeMask);
    fragColor = vec4(clamp(col,0.0,1.0),1.0);
}