float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 p=uv*5.0;
    float t=iTime*0.12;
    float thick=fbm(p+vec2(t,t*0.7))*0.75+fbm(p*0.4-vec2(t*0.5,0.0))*0.25;
    float eps=0.015;
    float hx=(fbm(p+vec2(eps,0))-fbm(p-vec2(eps,0)))/(2.0*eps);
    float hy=(fbm(p+vec2(0,eps))-fbm(p-vec2(0,eps)))/(2.0*eps);
    vec3 N=normalize(vec3(-hx*0.4,-hy*0.4,1.0));
    float cosT=clamp(dot(N,vec3(0,0,1)),0.0,1.0);
    float phase=thick*8.0+iTime*0.25;
    float rc=0.5+0.5*cos(phase*1.00*cosT*6.2832);
    float gc=0.5+0.5*cos(phase*1.35*cosT*6.2832+1.047);
    float bc=0.5+0.5*cos(phase*1.75*cosT*6.2832+2.094);
    vec3 iri=vec3(rc,gc,bc);
    float grain=fbm(p*6.0)*0.12+0.08;
    vec3 asphalt=vec3(grain*0.9,grain*0.92,grain);
    float oil=smoothstep(0.28,0.58,thick);
    vec3 col=mix(asphalt,iri*0.65+vec3(0.03,0.02,0.04),oil);
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}