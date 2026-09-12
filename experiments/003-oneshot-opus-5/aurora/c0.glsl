float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.12;

    // ridge silhouette
    float r=0.18+0.055*noise(vec2(uv.x*3.5,0.0))+0.025*noise(vec2(uv.x*8.0,1.7));
    float inRidge=step(uv.y,r);

    // domain-warped aurora
    vec2 q=uv*vec2(2.5,1.5)+vec2(t,0.0);
    vec2 warp=vec2(fbm(q+vec2(0.0,t)),fbm(q+vec2(3.2,1.7)));
    float raw=fbm(q+1.6*warp);

    // band centred at 0.58
    float band=exp(-pow((uv.y-0.58)/0.18,2.0)*4.0)*(1.0-inRidge);
    float a=clamp(raw*1.8-0.45,0.0,1.0)*band;

    // green->violet by intensity
    vec3 green=vec3(0.05,0.85,0.25);
    vec3 violet=vec3(0.55,0.05,0.90);
    vec3 aurora=mix(green,violet,clamp(a*1.4-0.1,0.0,1.0))*a*1.2;

    vec3 sky=mix(vec3(0.00,0.015,0.03),vec3(0.01,0.04,0.035),uv.y);
    vec3 col=mix(sky+clamp(aurora,0.0,1.0),vec3(0.015,0.015,0.02),inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}