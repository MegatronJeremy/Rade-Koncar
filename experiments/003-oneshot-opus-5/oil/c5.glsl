float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec2 curl(vec2 p,float t){
    float e=0.01;
    float nx0=fbm(p+vec2(0,e)+t*0.07);
    float nx1=fbm(p-vec2(0,e)+t*0.07);
    float ny0=fbm(p+vec2(e,0)+t*0.07);
    float ny1=fbm(p-vec2(e,0)+t*0.07);
    return vec2(nx0-nx1,-(ny0-ny1))/(2.0*e);
}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 p=uv*3.5;
    float t=iTime;
    vec2 flow=curl(p,t);
    float flowLen=length(flow);
    vec2 flowDir=flowLen>0.001?flow/flowLen:vec2(1,0);
    float pathAngle=atan(flowDir.y,flowDir.x);
    vec2 advected=p+flowDir*0.15;
    float thickness=fbm(advected+t*0.05)*0.7+fbm(p*0.5)*0.3;
    float hue=pathAngle*0.3+thickness*3.5+t*0.28;
    vec3 iriCol=palette(hue,vec3(0.5,0.5,0.5),vec3(0.48,0.5,0.45),vec3(1.0,0.9,0.85),vec3(0.1,0.0,0.35));
    float oilMask=smoothstep(0.25,0.55,thickness);
    float grain=fbm(p*7.0)*0.13+0.07;
    vec3 asp=vec3(grain*0.84,grain*0.87,grain*0.91);
    vec3 col=mix(asp,iriCol*0.62+vec3(0.02,0.01,0.03),oilMask);
    col=clamp(col,0.0,1.0);
    fragColor=vec4(col,1.0);
}