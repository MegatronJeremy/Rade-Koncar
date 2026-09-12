float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

float sdf(vec3 p){
    float base=fbm(p.xz*1.4+iTime*0.05)*0.35;
    return p.y-base;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
    vec3 ro=vec3(0.0,1.2,2.2);
    vec3 rd=normalize(vec3(uv.x,uv.y-0.3,-1.0));
    float cool=clamp(iTime*0.3,0.0,1.0);
    vec3 col=vec3(0.02,0.01,0.01);
    float t=0.0;
    bool hit=false;
    for(int i=0;i<48;i++){
        vec3 p=ro+rd*t;
        float d=sdf(p);
        if(d<0.005){hit=true;break;}
        t+=max(d*0.6,0.005);
        if(t>6.0)break;
    }
    if(hit){
        vec3 p=ro+rd*t;
        vec2 sp=p.xz;
        float surface=fbm(sp*2.5+iTime*0.08);
        float crack=1.0-smoothstep(0.0,0.07,abs(surface-0.52));
        float cellN=fbm(sp*5.0+0.5);
        float crustMask=smoothstep(0.4,0.7,cellN)*cool;
        vec3 melt=mix(vec3(1.0,0.5,0.03),vec3(0.8,0.18,0.0),clamp(1.0-surface*2.0,0.0,1.0));
        vec3 crust=vec3(0.09+cellN*0.06,0.06,0.05);
        vec3 crackCol=vec3(1.0,0.45,0.04)*(0.6+0.4*sin(iTime*3.5+sp.x*8.0));
        col=mix(mix(melt,crust,crustMask*(1.0-crack)),crackCol,crack*cool);
    }
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}