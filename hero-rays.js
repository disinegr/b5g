(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-rays';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false});
  if (!gl) return;
  const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment = `precision highp float;
    uniform vec2 resolution; uniform float time;
    float beam(vec2 uv,vec2 origin,float phase){
      vec2 delta=uv-origin;
      float angle=atan(delta.x,delta.y);
      float wave=sin(angle*9.+time*.16+phase)*.085;
      wave+=sin(angle*14.-time*.11+phase)*.035;
      wave+=sin(angle*5.+time*.08)*.06;
      float light=clamp(.47+wave,0.,1.);
      return light*clamp(1.-length(delta)*.24,0.,1.);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/resolution;
      uv.y=1.-uv.y;
      float aspect=resolution.x/resolution.y;
      vec2 p=vec2(uv.x*aspect,uv.y);
      float a=beam(p,vec2(.48*aspect,-.4),.5);
      float b=beam(p,vec2(.50*aspect,-.5),2.7);
      float fade=pow(1.-smoothstep(0.,.84,uv.y),1.4);
      vec3 orange=vec3(.941,.376,.098);
      vec3 peach=vec3(1.,.58,.302);
      vec3 light=(orange*a+peach*b*.42)*fade;
      light+=orange*.035*fade;
      gl_FragColor=vec4(light,1.);
    }`;
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  try {
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const size=gl.getUniformLocation(program,'resolution'),clock=gl.getUniformLocation(program,'time');
    hero.prepend(canvas);hero.classList.add('has-rays');
    let visible=true;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(hero);
    function resize(){canvas.width=Math.round(hero.clientWidth*.75);canvas.height=Math.round(hero.clientHeight*.75);gl.viewport(0,0,canvas.width,canvas.height);}
    new ResizeObserver(resize).observe(hero);resize();
    function render(now){
      if(visible&&!document.hidden){gl.uniform2f(size,canvas.width,canvas.height);gl.uniform1f(clock,motion.matches?12:now*.001);gl.drawArrays(gl.TRIANGLES,0,6);}
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  } catch(error){console.warn('Hero light unavailable',error);}
})();
