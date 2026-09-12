float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 p=uv*3.0;
    float t=iTime*0.15;
    vec2 q=vec2(fbm(p+vec2(0.0,0.0)+t),fbm(p+vec2(5.2,1.3)+t));
    vec2 r=vec2(fbm(p+4.0*q+vec2(1.7,9.2)+t*0.8),fbm(p+4.0*q+vec2(8.3,2.8)+t*0.8));
    float f=fbm(p+4.0*r);
    float hue=f*3.0+iTime*0.2;
    vec3 iri=palette(hue,vec3(0.5,0.5,0.5),vec3(0.45,0.48,0.5),vec3(1.0,1.1,0.9),vec3(0.0,0.1,0.4));
    float oilMask=smoothstep(0.35,0.65,f);
    float grain=fbm(p*8.0)*0.1+0.08;
    vec3 asp=vec3(grain*0.85,grain*0.87,grain*0.9);
    vec3 col=mix(asp,iri*0.6+vec3(0.03,0.02,0.05),oilMask);
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}