float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

// density in the aurora slab; p.y is altitude 0..1
float density(vec3 p,float t){
    vec2 xz=vec2(p.x*1.8+t*0.25,p.z*0.9);
    float d=fbm(xz)*fbm(xz+vec2(1.3,t*0.15));
    // vertical gaussian within slab
    d*=exp(-pow((p.y-0.62)/0.13,2.0)*5.0);
    return clamp(d*2.2-0.3,0.0,1.0);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.10;

    // ridge
    float rh=0.175+0.06*noise(vec2(uv.x*4.0,0.0))+0.028*noise(vec2(uv.x*9.0,1.6));
    float inRidge=step(uv.y,rh);

    // camera ray: origin at uv on near plane, direction mostly +z with slight up tilt
    vec3 ro=vec3(uv.x-0.5,uv.y,0.0);
    vec3 rd=normalize(vec3(0.0,0.05,1.0));

    // march through slab 0.45<y<0.80
    float transmit=1.0;
    vec3 scattered=vec3(0.0);
    float stepSize=1.0/28.0;
    for(int s=0;s<28;s++){
        float z=float(s)*stepSize*2.0;
        // reconstruct world y from ro+rd*z
        float wy=ro.y+rd.y*z;
        if(wy<0.45||wy>0.85){continue;}
        vec3 p=vec3(ro.x+rd.x*z,wy,z);
        float d=density(p,t)*stepSize*3.5;
        float di=clamp(d,0.0,1.0);
        // color by density: green at low, violet at high
        vec3 green=vec3(0.05,0.88,0.28);
        vec3 violet=vec3(0.50,0.04,0.86);
        vec3 lc=mix(green,violet,clamp(di*2.0,0.0,1.0));
        scattered+=transmit*di*lc;
        transmit*=1.0-di*0.45;
        if(transmit<0.02){break;}
    }
    scattered=clamp(scattered,0.0,1.0);

    vec3 sky=mix(vec3(0.0,0.01,0.022),vec3(0.008,0.030,0.026),uv.y);
    vec3 col=mix(sky+scattered,vec3(0.012,0.012,0.018),inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}