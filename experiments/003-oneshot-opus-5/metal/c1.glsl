float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    vec2 st=uv*3.0;
    float t=iTime;
    vec2 q=vec2(fbm(st+t*0.09),fbm(st+vec2(5.2,1.3)+t*0.07));
    vec2 r=vec2(fbm(st+2.0*q+vec2(1.7,9.2)),fbm(st+2.0*q+vec2(8.3,2.8)));
    float f=fbm(st+2.5*r);
    // ridge: narrow bright band near threshold
    float cool=clamp(t*0.3,0.0,1.0);
    float thresh=0.52;
    float ridge=1.0-abs(f-thresh)*18.0;
    ridge=clamp(ridge,0.0,1.0)*smoothstep(0.0,0.4,cool);
    vec3 molten=vec3(1.0,0.45+f*0.3,0.05);
    vec3 crust=vec3(0.09-f*0.04,0.06,0.04);
    vec3 col=mix(molten,crust,cool*(1.0-ridge));
    col=mix(col,vec3(1.0,0.5,0.06),ridge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}