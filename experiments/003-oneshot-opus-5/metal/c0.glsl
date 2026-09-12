float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){return vec2(hash21(p),hash21(p+31.7));}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 st=uv*6.0;
    vec2 ip=floor(st),fp=fract(st);
    float d0=1e9,d1=1e9;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 nb=vec2(float(x),float(y));
        vec2 pt=0.5+0.45*sin(iTime*0.25+6.2831*hash22(ip+nb));
        float d=length(nb+pt-fp);
        if(d<d0){d1=d0;d0=d;}else if(d<d1){d1=d;}
    }
    float edge=d1-d0;
    float cool=clamp(iTime*0.38,0.0,1.0);
    float crustW=smoothstep(0.0,0.28,edge);
    vec3 molten=vec3(1.0,0.38,0.04);
    vec3 crust=vec3(0.07,0.05,0.04);
    vec3 cell=mix(molten,crust,crustW*cool);
    float glow=1.0-smoothstep(0.0,0.12,edge);
    float crackHeat=1.0-cool*0.7;
    vec3 crack=mix(vec3(1.0,0.55,0.08),vec3(0.5,0.08,0.0),cool)*crackHeat;
    vec3 col=mix(cell,crack,glow);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}