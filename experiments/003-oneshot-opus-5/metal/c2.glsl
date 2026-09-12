float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
    float r=length(uv);
    float a=atan(uv.y,uv.x);
    float cool=clamp(iTime*0.32,0.0,1.0);
    // crust front: annular ring expanding from outside in
    float crustFront=0.85-cool*0.78;
    float isCrust=smoothstep(crustFront,crustFront+0.05,r);
    // radial crack lines: noise in angle domain
    float crackN=noise(vec2(a*4.0/3.14159+5.0,r*8.0+iTime*0.1));
    float crack=(1.0-smoothstep(0.0,0.08,abs(crackN-0.5)))*isCrust*smoothstep(0.0,0.3,isCrust);
    // ring edge glow
    float frontGlow=1.0-smoothstep(0.0,0.06,abs(r-crustFront));
    vec3 molten=mix(vec3(1.0,0.65,0.05),vec3(1.0,0.2,0.0),clamp(r*1.2,0.0,1.0));
    vec3 crust=vec3(0.08,0.06,0.05)*mix(1.0,0.5,crackN);
    vec3 col=mix(molten,crust,isCrust*(1.0-crack));
    col=mix(col,vec3(1.0,0.5,0.05),crack+frontGlow*(1.0-isCrust*0.5));
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}