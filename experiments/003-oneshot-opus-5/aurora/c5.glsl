float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.09;

    // ridge
    float rh=0.17+0.065*noise(vec2(uv.x*3.8,0.0))+0.032*noise(vec2(uv.x*8.5,1.3));
    float inRidge=step(uv.y,rh);

    // map sky to polar-ish: origin at top-centre
    vec2 sky_p=vec2((uv.x-0.5)*2.2, uv.y-1.0);
    float ang=atan(sky_p.x,sky_p.y); // -pi..pi
    float rad=length(sky_p);

    // curtains along angle axis, animated
    float curtain=0.0;
    for(int i=0;i<5;i++){
        float fi=float(i);
        float freq=3.0+fi*2.0;
        float spd=0.06+fi*0.02;
        curtain+=sin(ang*freq+t*spd*6.2832+fi*0.9)*0.5+0.5;
    }
    curtain/=5.0;

    // modulate with fbm for organic structure
    vec2 fp=vec2(ang*1.2+t*0.3,rad*2.5);
    float mod=fbm(fp);
    curtain=clamp(curtain*0.6+mod*0.7-0.25,0.0,1.0);

    // radial envelope: aurora ring at certain radius
    float renv=exp(-pow((rad-0.55)/0.20,2.0)*4.0);
    // also reject below ridge
    float envFull=renv*(1.0-inRidge)*clamp(1.0-uv.y*0.5,0.0,1.0);
    float a=curtain*envFull;

    // green->violet by angle variation
    float hue=clamp(sin(ang*2.0+t*0.4)*0.5+0.5,0.0,1.0);
    vec3 green=vec3(0.05,0.85,0.25);
    vec3 violet=vec3(0.50,0.05,0.88);
    vec3 aCol=mix(green,violet,hue)*a*1.3;

    vec3 skyCol=mix(vec3(0.0,0.01,0.022),vec3(0.008,0.030,0.026),uv.y);
    vec3 col=mix(skyCol+clamp(aCol,0.0,1.0),vec3(0.012,0.012,0.018),inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}