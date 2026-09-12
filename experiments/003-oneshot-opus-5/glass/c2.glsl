float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord-0.5*iResolution.xy)/iResolution.y;
  float sunAngle=iTime*0.3;
  vec2 sunDir=vec2(cos(sunAngle),sin(sunAngle));
  vec2 sunPos=sunDir*0.55;
  float r=length(uv);
  float a=atan(uv.y,uv.x);
  float sl=exp(-length(uv-sunPos)*length(uv-sunPos)*2.2);
  vec3 sun=vec3(1.0,0.82,0.3);
  int RINGS=5;
  float ringW=0.09;
  float ringGap=0.04;
  float inRing=0.0;
  float ringId=0.0;
  for(int i=0;i<5;i++){
    float ri=float(i);
    float r0=ri*(ringW+ringGap)+0.08;
    float r1=r0+ringW;
    if(r>r0&&r<r1){inRing=1.0;ringId=ri;}
  }
  int SPOKES=12;
  float spokeW=0.018;
  float minSpokeDist=1e9;
  for(int k=0;k<12;k++){
    float sa=float(k)*3.14159/6.0;
    float da=mod(abs(a-sa),3.14159);
    da=min(da,3.14159-da);
    float cd=r*sin(da);
    minSpokeDist=min(minSpokeDist,cd);
  }
  float spokeLead=smoothstep(0.0,0.01,minSpokeDist-spokeW);
  float ringLead=1.0;
  if(inRing>0.5){
    float ri=ringId;
    float r0=ri*(ringW+ringGap)+0.08;
    float r1=r0+ringW;
    float border=min(r-r0,r1-r);
    ringLead=smoothstep(0.0,0.01,border-0.008);
  }
  float lead=min(spokeLead,ringLead);
  float petals=float(SPOKES);
  float petal=0.5+0.5*cos(petals*a+iTime*0.5);
  float id=hash21(vec2(floor(petals*a/6.28318+0.5),ringId));
  vec3 gc=palette(id+petal*0.1,vec3(0.3,0.2,0.1),vec3(0.5,0.4,0.3),vec3(1.0,0.8,0.5),vec3(0.05,0.3,0.6));
  gc=clamp(gc,0.0,1.0);
  float outsideAll=step(0.95,r);
  vec3 col=gc*(0.15+0.85*sl)*sun*1.5;
  col=clamp(col,0.0,1.0);
  col=mix(vec3(0.03,0.02,0.02),col,lead);
  col=mix(col,vec3(0.08,0.06,0.04),outsideAll);
  fragColor=vec4(col,1.0);
}