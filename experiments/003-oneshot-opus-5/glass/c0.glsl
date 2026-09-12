float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
float sdHex(vec2 p,float r){vec2 k=vec2(-0.866025,0.5);p=abs(p);p-=2.0*min(dot(k,p),0.0)*k;p-=vec2(clamp(p.x,-0.57735*r,0.57735*r),r);return length(p)*sign(p.y);}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  vec2 sunPos=vec2(cos(iTime*0.35)*0.7,sin(iTime*0.18)*0.25+0.15);
  float sc=5.5;
  vec2 gp=uv*sc;
  vec2 hr=vec2(1.0,1.7320508);
  vec2 hp=floor(gp/hr+0.5)*hr;
  vec2 off=hr*0.5;
  vec2 hp2=floor((gp-off)/hr+0.5)*hr+off;
  vec2 hc=(length(gp-hp)<length(gp-hp2))?hp:hp2;
  vec2 local=gp-hc;
  float d=sdHex(local,0.44);
  float lead=smoothstep(0.0,0.04,d);
  float id=hash21(hc);
  vec3 gc=palette(id,vec3(0.35,0.25,0.1),vec3(0.45,0.4,0.35),vec3(0.9,1.0,0.5),vec3(0.0,0.25,0.6));
  gc=clamp(gc,0.0,1.0);
  float sd=length(uv-sunPos);
  float sl=exp(-sd*sd*1.8);
  float edge=abs(d);
  float scatter=exp(-edge*edge*80.0)*sl*0.6;
  vec3 sun=vec3(1.0,0.82,0.35);
  vec3 col=gc*(0.25+0.75*sl)*sun*1.5+scatter*sun;
  col=clamp(col,0.0,1.0);
  col=mix(vec3(0.04,0.03,0.02),col,lead);
  fragColor=vec4(col,1.0);
}