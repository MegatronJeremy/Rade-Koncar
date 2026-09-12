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
    uv.y += 0.55;
    float t = iTime;
    float r = length(uv);
    float a = atan(uv.x, uv.y);
    float flick = noise(vec2(a*3.0, t*2.0))*0.15 + 0.05*sin(t*6.0+a*4.0);
    float yFactor = clamp(uv.y, -0.1, 1.0);
    float edge = 0.3*(1.0 - yFactor) + flick*0.3;
    float d = r - edge;
    float mask = smoothstep(0.03,-0.03,d) * smoothstep(-0.1,0.1,uv.y) * smoothstep(1.0,0.5,uv.y);
    float glow = exp(-r*3.0)*0.5;
    vec3 col = mix(vec3(0.8,0.1,0.0), vec3(1.0,0.8,0.2), clamp(1.0-yFactor+flick,0.0,1.0));
    col += glow*vec3(1.0,0.4,0.1);
    col *= mask;
    vec3 bg = vec3(0.02,0.02,0.03);
    col = mix(bg,col,mask);
    fragColor = vec4(clamp(col,0.0,1.0),1.0);
}