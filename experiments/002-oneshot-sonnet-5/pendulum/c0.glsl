float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 pivot = vec2(0.0, 0.6);
    float angle = 0.9 * sin(iTime * 1.8);
    float len = 0.9;
    vec2 bob = pivot + len * vec2(sin(angle), -cos(angle));

    float dRod = sdSegment(uv, pivot, bob);
    float dBob = length(uv - bob) - 0.12;
    float dPivot = length(uv - pivot) - 0.03;

    vec3 col = mix(vec3(0.05,0.06,0.10), vec3(0.15,0.17,0.25), clamp(uv.y + 0.5, 0.0, 1.0));
    col = mix(col, vec3(0.9,0.9,0.95), 1.0 - smoothstep(0.0, 0.01, dRod));
    col = mix(col, vec3(1.0,0.3,0.2), 1.0 - smoothstep(0.0, 0.02, dBob));
    col = mix(col, vec3(0.8,0.8,0.85), 1.0 - smoothstep(0.0, 0.02, dPivot));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
