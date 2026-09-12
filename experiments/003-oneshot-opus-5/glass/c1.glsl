float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash22(vec2 p){return vec2(hash21(p),hash21(p+vec2(7.31,3.71)));}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  vec2 sunPos=vec2(sin(iTime*0.4)*0.65,cos(iTime*0.22)*0.2+0.1);
  float sc=5.0;
  vec2 p=uv*sc;
  vec2 ip=floor(p);
  float minD=1e9,minD2=1e9;
  vec2 minC=vec2(0.0);
  for(int y=-2;y<=2;y++){
    for(int x=-2;x<=2;x++){
      vec2 nb=ip+vec2(float(x),float(y));
      vec2 rp=hash22(nb)+vec2(nb);
      float d=length(p-rp);
      if(d<minD){minD2=minD;minD=d;minC=nb;}
      else if(d<minD2){minD2=d;}
    }
  }
  float border=minD2-minD;
  float lead=smoothstep(0.0,0.06,border);
  float id=hash21(minC);
  vec3 gc=palette(id,vec3(0.3,0.2,0.15),vec3(0.5,0.45,0.3),vec3(1.0,0.9,0.5),vec3(0.1,0.3,0.65));
  gc=clamp(gc,0.0,1.0);
  float sd=length(uv-sunPos);
  float sl=exp(-sd*sd*1.5);
  float rim=exp(-border*border*60.0)*sl*0.8;
  vec3 sun=vec3(1.0,0.78,0.3);
  vec3 col=gc*(0.2+0.8*sl)*sun*1.4+rim*sun;
  col=clamp(col,0.0,1.0);
  col=mix(vec3(0.03,0.02,0.02),col,lead);
  fragColor=vec4(col,1.0);
}