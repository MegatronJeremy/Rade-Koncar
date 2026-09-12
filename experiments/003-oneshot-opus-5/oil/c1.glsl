float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float voronoi(vec2 p,out float dist2){
    vec2 i=floor(p);
    vec2 f=fract(p);
    float d1=8.0,d2=8.0;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 n=vec2(x,y);
        vec2 o=hash22(i+n);
        vec2 r=n+o-f;
        float d=dot(r,r);
        if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}
    }
    dist2=sqrt(d2);
    return sqrt(d1);
}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 p=uv*7.0;
    float d2;
    float d1=voronoi(p,d2);
    float edge=d2-d1;
    float inCrack=1.0-smoothstep(0.0,0.18,edge);
    float oilDepth=inCrack*(0.5+0.5*sin(iTime*0.4+d1*3.14));
    float phase=oilDepth*9.0+iTime*0.35+hash21(floor(p))*6.28;
    vec3 iriCol=palette(phase,vec3(0.5),vec3(0.5),vec3(1.0,0.9,0.8),vec3(0.0,0.15,0.3));
    float grain=noise(p*4.0)*0.15+0.07;
    vec3 stone=vec3(grain*0.85,grain*0.88,grain*0.9);
    float poolMask=smoothstep(0.05,0.35,inCrack);
    vec3 col=mix(stone,iriCol*0.7+vec3(0.02,0.02,0.03),poolMask);
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}