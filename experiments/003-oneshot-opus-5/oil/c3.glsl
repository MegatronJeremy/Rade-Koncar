float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=(fragCoord-iResolution.xy*0.5)/iResolution.y;
    float r=length(uv);
    float a=atan(uv.y,uv.x);
    float warp=fbm(uv*3.0+iTime*0.08)*0.3;
    float rw=r+warp;
    float angShift=fbm(vec2(r*4.0,iTime*0.12))*0.4;
    float bands=rw*12.0+angShift+iTime*0.5+a*0.8;
    vec3 iriCol=palette(bands,vec3(0.5,0.5,0.5),vec3(0.5,0.48,0.45),vec3(1.0,0.95,0.85),vec3(0.0,0.2,0.5));
    float oilEdge=smoothstep(0.52,0.48,rw);
    float rimGlow=smoothstep(0.48,0.50,rw)*smoothstep(0.55,0.50,rw);
    float grain=fbm((uv+vec2(3.7,1.2))*9.0)*0.12+0.07;
    vec3 asp=vec3(grain*0.84,grain*0.87,grain*0.9);
    vec3 col=mix(asp,iriCol*0.65,oilEdge)+rimGlow*vec3(0.4,0.5,0.6)*0.3;
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}