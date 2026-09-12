float flameSDF(vec2 uv, float t){
    float y = uv.y;
    float taper = clamp(1.0 - y*1.1, 0.0, 1.0);
    float width = 0.18*taper*taper + 0.02;
    float wobble = 0.03*sin(y*15.0 + t*9.0) * taper;
    width += wobble;
    float d = abs(uv.x) - width;
    d = max(d, -y - 0.05);
    d = max(d, y - 1.0);
    return d;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    uv.y += 0.55;
    float t = iTime;
    float sway = 0.05*sin(t*3.0);
    uv.x -= sway*uv.y;
    float d = flameSDF(uv, t);
    float inside = smoothstep(0.02, -0.02, d);
    float heightFactor = clamp(uv.y, 0.0, 1.0);
    vec3 coreColor = vec3(1.0, 0.95, 0.6);
    vec3 midColor = vec3(1.0, 0.5, 0.05);
    vec3 outerColor = vec3(0.6, 0.05, 0.02);
    vec3 col = mix(outerColor, midColor, 1.0 - heightFactor);
    col = mix(col, coreColor, smoothstep(0.15, 0.0, abs(d) + heightFactor*0.1));
    col *= inside;
    vec3 bg = vec3(0.02, 0.02, 0.03);
    col = mix(bg, col, inside);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}