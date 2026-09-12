float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/iResolution.xy;
    float t=iTime*0.10;

    // ridge
    float r=0.175+0.06*noise(vec2(uv.x*4.0,0.0))+0.03*noise(vec2(uv.x*9.5,2.0));
    float inRidge=step(uv.y,r);

    // six sine curtains summed
    float aurora=0.0;
    for(int i=0;i<6;i++){
        float fi=float(i);
        float freq=2.5+fi*1.3;
        float speed=0.08+fi*0.03;
        float phase=fi*1.17;
        float amp=0.18-fi*0.02;
        aurora+=amp*sin(uv.x*freq*6.2832+t*speed*6.2832+phase)*0.5+0.5;
    }
    aurora/=6.0;

    // vertical envelope
    float env=exp(-pow((uv.y-0.60)/0.20,2.0)*3.5)*(1.0-inRidge);
    // slow breathe
    float breathe=0.7+0.3*sin(t*0.8);
    aurora=clamp(aurora*breathe,0.0,1.0)*env;

    // hue: low aurora=green, high=violet
    vec3 col0=vec3(0.04,0.80,0.22);
    vec3 col1=vec3(0.50,0.05,0.88);
    vec3 aCol=mix(col0,col1,aurora)*aurora*1.3;

    vec3 sky=mix(vec3(0.0,0.01,0.025),vec3(0.01,0.035,0.03),uv.y);
    vec3 col=mix(sky+clamp(aCol,0.0,1.0),vec3(0.012,0.012,0.018),inRidge);
    fragColor=vec4(clamp(col,0.0,1.0),1.0);
}