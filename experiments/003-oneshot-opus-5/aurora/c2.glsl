float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

// ridge height field
float ridgeH(float x){
    return 0.17+0.07*noise(vec2(x*3.8,0.0))+0.035*noise(vec2(x*8.2,1.4))+0.015*noise(vec2(x*17.0,3.0));
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.11;

    float rh=ridgeH(uv.x);
    // signed dist above ridge (positive=sky)
    float sd=uv.y-rh;
    float inRidge=step(sd,0.0);

    // aurora: fbm curtain that drifts
    vec2 ap=vec2(uv.x*2.2+t*0.3,uv.y*4.0);
    float raw=fbm(ap+vec2(fbm(ap)*0.8));
    raw=clamp(raw*1.7-0.35,0.0,1.0);

    // height envelope above ridge
    float lift=clamp(sd/0.08,0.0,1.0); // rise from ridge
    float peak=exp(-pow((uv.y-0.62)/0.17,2.0)*4.0);
    float env=lift*peak*(1.0-inRidge);

    float a=raw*env;

    vec3 green=vec3(0.06,0.88,0.28);
    vec3 violet=vec3(0.52,0.04,0.85);
    vec3 aCol=mix(green,violet,clamp(raw*1.3,0.0,1.0))*a*1.4;

    // subtle ridge glow at base of aurora
    float glow=exp(-sd*18.0)*clamp(raw*0.6,0.0,1.0)*(1.0-inRidge);
    aCol+=vec3(0.02,0.12,0.06)*glow;

    vec3 sky=mix(vec3(0.0,0.01,0.022),vec3(0.008,0.032,0.028),uv.y);
    vec3 ridgeCol=vec3(0.010,0.010,0.016)+vec3(0.0,0.03,0.02)*exp(-(-sd)*8.0);
    vec3 col=mix(sky+clamp(aCol,0.0,1.0),ridgeCol,inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}