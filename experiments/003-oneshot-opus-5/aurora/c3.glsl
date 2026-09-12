float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}

float voronoi(vec2 p,float t){
    vec2 id=floor(p);
    vec2 fr=fract(p);
    float md=8.0;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 o=vec2(float(x),float(y));
        vec2 r=o-fr+hash22(id+o)*0.7+0.3*sin(t+hash22(id+o)*6.28);
        md=min(md,dot(r,r));
    }
    return sqrt(md);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.08;

    float rh=0.18+0.06*noise(vec2(uv.x*4.0,0.0))+0.03*noise(vec2(uv.x*9.0,1.5));
    float inRidge=step(uv.y,rh);

    // stretched voronoi to look like aurora patches
    vec2 vp=vec2(uv.x*3.5+t*0.4,(uv.y-0.55)*6.0);
    float v=voronoi(vp,t);
    // soft cell interior glow
    float cell=exp(-v*v*2.5);
    // add noise variation
    float nvar=noise(vp*0.7+vec2(t*0.2,0.0));
    float a=clamp(cell*1.2+nvar*0.3-0.2,0.0,1.0);

    float env=exp(-pow((uv.y-0.60)/0.19,2.0)*3.5)*(1.0-inRidge);
    a*=env;

    // green core, violet fringe
    vec3 green=vec3(0.05,0.82,0.25);
    vec3 violet=vec3(0.48,0.04,0.82);
    vec3 aCol=mix(violet,green,clamp(cell*1.5-0.2,0.0,1.0))*a*1.3;

    vec3 sky=mix(vec3(0.0,0.01,0.022),vec3(0.008,0.030,0.026),uv.y);
    vec3 col=mix(sky+clamp(aCol,0.0,1.0),vec3(0.012,0.012,0.018),inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}