float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1,0));float c=hash21(i+vec2(0,1));float d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
float leadLine(vec2 uv,float grid){
  vec2 cell=fract(uv*grid);
  float bx=min(cell.x,1.0-cell.x);
  float by=min(cell.y,1.0-cell.y);
  float b=min(bx,by);
  return smoothstep(0.0,0.05,b);
}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  vec2 sunPos=vec2(cos(iTime*0.4)*0.6,sin(iTime*0.25)*0.2+0.1);
  vec2 warp=vec2(
    fbm(uv*4.0+vec2(0.0,iTime*0.08)),
    fbm(uv*4.0+vec2(3.7,iTime*0.08))
  );
  vec2 wuv=uv+0.06*warp;
  vec2 warp2=vec2(
    fbm(wuv*6.0+vec2(1.7,-iTime*0.06)),
    fbm(wuv*6.0+vec2(8.3,-iTime*0.06))
  );
  vec2 fuv=wuv+0.04*warp2;
  float grid=6.0;
  vec2 cellId=floor(fuv*grid);
  float id=hash21(cellId);
  vec3 gc=palette(id,vec3(0.3,0.18,0.08),vec3(0.5,0.42,0.3),vec3(1.0,0.75,0.45),vec3(0.0,0.25,0.62));
  gc=clamp(gc,0.0,1.0);
  float lead=leadLine(fuv,grid);
  float sd=length(uv-sunPos);
  float sl=exp(-sd*sd*1.6);
  float specular=fbm(fuv*8.0+iTime*0.12);
  specular=pow(clamp(specular,0.0,1.0),3.0)*sl*0.4;
  vec3 sun=vec3(1.0,0.82,0.35);
  vec3 col=gc*(0.2+0.8*sl)*sun*1.4+specular*sun;
  col=clamp(col,0.0,1.0);
  col=mix(vec3(0.04,0.03,0.02),col,lead);
  fragColor=vec4(col,1.0);
}