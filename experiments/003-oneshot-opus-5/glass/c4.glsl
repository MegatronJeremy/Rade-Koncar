float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
float windowMask(vec2 uv){
  float grid=8.0;
  vec2 cell=fract(uv*grid);
  vec2 id=floor(uv*grid);
  float lead=step(0.06,cell.x)*step(0.06,cell.y)*step(cell.x,0.94)*step(cell.y,0.94);
  float h=hash21(id);
  return lead*step(0.15,h);
}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  vec2 sunPos=vec2(cos(iTime*0.35)*0.7,sin(iTime*0.2)*0.25+0.3);
  vec3 rayCol=vec3(0.0);
  int STEPS=40;
  for(int i=0;i<40;i++){
    float t=float(i)/39.0;
    vec2 samplePos=mix(uv,sunPos,t);
    float m=windowMask(samplePos+vec2(0.5));
    float hue=hash21(floor(samplePos*8.0+vec2(0.5)));
    vec3 gc=palette(hue,vec3(0.3,0.2,0.1),vec3(0.5,0.4,0.3),vec3(1.0,0.8,0.5),vec3(0.05,0.3,0.6));
    gc=clamp(gc,0.0,1.0);
    float att=exp(-t*t*1.5)*(1.0-t)*0.06;
    rayCol+=m*gc*att;
  }
  rayCol=clamp(rayCol,0.0,1.0);
  float haze=exp(-length(uv-sunPos)*3.0)*0.18;
  vec3 sun=vec3(1.0,0.85,0.4);
  vec3 col=rayCol+haze*sun;
  vec3 bg=vec3(0.05,0.04,0.06);
  col=bg+col;
  col=clamp(col,0.0,1.0);
  fragColor=vec4(col,1.0);
}