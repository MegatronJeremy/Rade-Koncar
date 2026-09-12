void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y * 2.0;
    const float PI = 3.14159265359;
    const float TWO_PI = 6.28318530718;

    float r = length(uv);
    float a = atan(uv.x, uv.y);
    if (a < 0.0) a += TWO_PI;

    float secN = mod(iTime, 60.0);
    float minN = mod(iTime / 60.0, 60.0);
    float hourN = mod(iTime / 3600.0, 12.0);

    float aSec = secN / 60.0 * TWO_PI;
    float aMin = (minN + secN / 60.0) / 60.0 * TWO_PI;
    float aHour = (hourN + minN / 60.0) / 12.0 * TWO_PI;

    vec3 col = vec3(0.02, 0.02, 0.05) + 0.05 * r;

    float faceMask = smoothstep(0.95, 0.9, r);
    col = mix(col, vec3(0.08, 0.08, 0.14), faceMask);

    for (int i = 0; i < 60; i++) {
        float ta = float(i) / 60.0 * TWO_PI;
        float ad = abs(mod(a - ta + PI, TWO_PI) - PI);
        float isMajor = mod(float(i), 5.0) < 0.5 ? 1.0 : 0.0;
        float w = mix(0.006, 0.014, isMajor);
        float radialBand = smoothstep(0.78, 0.83, r) * smoothstep(0.95, 0.9, r);
        float band = smoothstep(w, 0.0, ad) * radialBand;
        col = mix(col, vec3(0.9), band);
    }

    float dSecA = abs(mod(a - aSec + PI, TWO_PI) - PI);
    float secHand = smoothstep(0.05, 0.0, dSecA) * smoothstep(0.82, 0.78, r);
    col = mix(col, vec3(1.0, 0.3, 0.2), secHand);

    float dMinA = abs(mod(a - aMin + PI, TWO_PI) - PI);
    float minHand = smoothstep(0.03, 0.0, dMinA) * smoothstep(0.67, 0.63, r);
    col = mix(col, vec3(0.95), minHand);

    float dHourA = abs(mod(a - aHour + PI, TWO_PI) - PI);
    float hourHand = smoothstep(0.045, 0.0, dHourA) * smoothstep(0.47, 0.43, r);
    col = mix(col, vec3(0.95), hourHand);

    float hub = smoothstep(0.04, 0.03, r);
    col = mix(col, vec3(1.0, 0.3, 0.2), hub);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
