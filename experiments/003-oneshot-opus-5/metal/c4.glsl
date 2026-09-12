float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){return fract(p*mat2(127.1,311.7,269.5,183.3));}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 st=uv*7.0;
    vec2 ip=floor(st),fp=fract(st);
    float F1=1e9,F2=1e9;
    vec2 mg=vec2(0.0);
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 nb=vec2(float(x),float(y));
        vec2 rp=hash22(ip+nb);
        rp=0.5+0.45*sin(6.2831*rp+iTime*0.2);
        float d=length(nb+rp-fp);
        if(d<F1){F2=F1;F1=d;mg=ip+nb;}else if(d<F2){F2=d;}
    }
    float cell=F2-F1;
    float interior=F1;
    // smooth crack width
    float crack=1.0-smoothstep(0.0,0.1,cell);
    float cool=clamp(iTime*0.35,0.0,1.0);
    // per-cell cooling offset using cell id hash
    float cellPhase=hash21(mg);
    float cellCool=clamp((cool-cellPhase*0.4)*2.5,0.0,1.0);
    vec3 molten=mix(vec3(1.0,0.55,0.02),vec3(0.9,0.25,0.0),interior*1.5);
    vec3 crust=mix(vec3(0.12,0.08,0.06),vec3(0.04,0.03,0.02),interior);
    vec3 crackCol=vec3(1.0,0.45+0.1*sin(iTime*3.0),0.03)*(1.0-cool*0.6);
    vec3 col=mix(mix(molten,crust,cellCool),crackCol,crack);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}