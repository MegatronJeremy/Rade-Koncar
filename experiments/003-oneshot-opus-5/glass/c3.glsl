float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  vec2 sunPos=vec2(cos(iTime*0.38)*0.7,0.6+sin(iTime*0.22)*0.15);
  float sunH=0.4+0.3*sin(iTime*0.22);
  vec2 floorUV=uv+vec2(0.0,0.5);
  vec2 warpedA=floorUV+0.25*vec2(fbm(floorUV*3.0+iTime*0.1),fbm(floorUV*3.0+vec2(5.2,1.3)+iTime*0.1));
  vec2 warpedB=warpedA+0.2*vec2(fbm(warpedA*4.0-iTime*0.15),fbm(warpedA*4.0+vec2(1.7,9.2)-iTime*0.15));
  float caustic=fbm(warpedB*6.0+iTime*0.2);
  caustic=caustic*caustic*2.0;
  float sx=(uv.x-sunPos.x);
  float shadow=exp(-sx*sx*3.0)*exp(-max(0.0,sunPos.y-uv.y)*4.0);
  vec2 colorUV=uv*4.0;
  float hue=fbm(colorUV+iTime*0.05);
  vec3 gc=palette(hue,vec3(0.3,0.15,0.05),vec3(0.5,0.45,0.3),vec3(1.0,0.7,0.4),vec3(0.0,0.2,0.6));
  gc=clamp(gc,0.0,1.0);
  vec3 stone=vec3(0.45,0.38,0.3);
  vec3 lit=stone+caustic*gc*shadow*vec3(1.0,0.85,0.4)*1.2;
  lit=clamp(lit,0.0,1.0);
  fragColor=vec4(lit,1.0);
}