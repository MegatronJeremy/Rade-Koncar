// Bounded by a literal the compiler accepts and the GPU will never reach.
// An unrolled `while (true)` is rejected or optimised away by some drivers;
// this form reliably compiles and reliably never returns.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float acc = 0.0;
    float seed = uv.x + uv.y * 0.7 + iTime + 1e-4;
    for (int i = 0; i < 2000000000; i++) {
        acc += sin(float(i) * seed) * 1e-9;
        if (acc > 1e30) break;
    }
    fragColor = vec4(vec3(acc), 1.0);
}
