float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float ridge(vec2 p){float v=0.0,a=0.5,s=1.0;for(int i=0;i<6;i++){float n=1.0-abs(noise(p)*2.0-1.0);v+=n*n*a;p*=2.1;a*=0.48;}return v;}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime;
    vec2 st=uv*4.0+vec2(t*0.04,0.0);
    float rn=ridge(st);
    // crack: narrow band near ridge peaks
    float crackLine=smoothstep(0.62,0.75,rn);
    // base surface: slow noise for crust texture
    float surf=noise(uv*8.0+t*0.05)*0.3+noise(uv*16.0)*0.1;
    float cool=clamp(t*0.33,0.0,1.0);
    // crust grows over surface, interrupted by cracks
    float crustVal=clamp(cool-surf*0.3,0.0,1.0)*(1.0-crackLine);
    vec3 molten=vec3(1.0,0.35+surf,0.03);
    vec3 crust=vec3(0.1+surf*0.15,0.08,0.06);
    vec3 crack=vec3(1.0,0.5+0.1*sin(t*4.0+rn*10.0),0.04);
    vec3 col=mix(mix(molten,crust,crustVal),crack,crackLine);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}