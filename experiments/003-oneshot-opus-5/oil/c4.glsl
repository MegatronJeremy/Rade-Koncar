float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=(fragCoord-iResolution.xy*0.5)/iResolution.y;
    float t=iTime;
    vec2 c0=vec2(sin(t*0.23)*0.15,cos(t*0.19)*0.08);
    vec2 c1=vec2(cos(t*0.31+1.0)*0.12,sin(t*0.27+2.0)*0.10);
    vec2 c2=vec2(sin(t*0.17+3.0)*0.18,cos(t*0.22+1.5)*0.06);
    float d0=length(uv-c0)-0.22;
    float d1=length(uv-c1)-0.18;
    float d2=length(uv-c2)-0.14;
    float d=smin(smin(d0,d1,0.06),d2,0.05);
    float edgeWarp=fbm(uv*6.0+t*0.15)*0.04;
    d+=edgeWarp;
    float oilMask=smoothstep(0.02,-0.06,d);
    float rim=smoothstep(0.06,0.0,abs(d+0.01));
    float thick=fbm(uv*4.0+vec2(t*0.1,-t*0.08));
    float hue=thick*4.0+t*0.3+length(uv)*2.0;
    vec3 iriCol=palette(hue,vec3(0.5,0.5,0.5),vec3(0.5,0.45,0.48),vec3(0.9,1.0,1.1),vec3(0.05,0.2,0.45));
    float grain=fbm(uv*10.0+vec2(1.3,4.7))*0.12+0.07;
    vec3 asp=vec3(grain*0.84,grain*0.87,grain*0.9);
    vec3 col=mix(asp,iriCol*0.65+vec3(0.02,0.01,0.03),oilMask);
    col+=rim*vec3(0.3,0.4,0.55)*0.25;
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}