(() => {
  'use strict';

  const canvas = document.querySelector('#particle-stage');
  if (!canvas) return;
  const hero = canvas.closest('.hero');

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    hero?.classList.add('particles-unavailable');
    return;
  }

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 809px)').matches;
  const pointCount = mobile ? 24000 : 48000;
  const data = new Float32Array(pointCount * 4);

  const logoPathData = 'M831.251 345.6L1140.36 130.376L1421.74 498.908L1120.58 708.794L1426.01 921.077L1143.77 1290.36L829.181 1067.31L719.219 1425.98L265.221 1281.73L382.353 942.001L0 941.509L1.69283 484.928L375.144 484.358L258.283 142.632L713.026 0L831.251 345.6ZM575.343 151.883L576.577 155.484L659.911 406.389C673.997 449.376 666.191 495.159 638.055 531.557C609.917 567.954 566.576 588.892 519.222 588.925L109.547 588.433L109.298 656.245L391.901 660.209C439.118 660.844 482.124 682.31 509.772 719.146C537.422 755.986 544.746 801.88 529.805 844.844L401.845 1216.1L650.201 1294.95L736.809 1043.68C743.649 1024 737.493 1001.84 717.032 995.144L712.478 993.812C705.56 992.109 698.225 992.289 691.146 994.472C679.352 998.111 670.159 1006.7 666.22 1017.99L576.426 1272.34L474.752 1239.24L563.318 985.313C578.358 942.518 612.867 909.907 658 895.981C703.133 882.057 751.086 889.401 789.325 916.115L1120.09 1145.94L1162.35 1090.61L938.677 933.748C900.665 907.141 878.67 865.867 878.919 820.617C878.975 789.258 889.27 763.044 900.358 749.251C911.445 735.458 916.451 731.392 929.167 720.378C941.883 709.364 946.049 705.844 970.693 686.946C995.337 668.048 1270.67 476.766 1270.67 476.766L1222.32 414.581L1205.71 425.834L996.153 571.72C957.686 598.165 909.907 605.344 864.819 591.361C819.731 577.377 785.534 544.735 770.879 501.745L643.865 130.402L575.343 151.883ZM1050.55 788.369C1039.47 780.633 1025.42 779.298 1013.31 783.55L1002.88 790.831C992.804 797.899 986.996 808.696 987.027 820.565C987.058 832.432 992.78 843.266 1002.86 850.234L1226.22 1007L1274.42 943.905L1050.55 788.369ZM108.903 764.258L108.646 838.159L385.968 838.444C407.656 838.409 428.829 824.747 429.019 803.995L429.018 800.561C428.988 793.053 426.548 785.699 421.795 779.365C414.569 769.737 403.203 763.996 390.752 763.857L108.903 764.258ZM892.534 431.446C875.041 443.65 870.634 467.506 883.047 484.293C887.279 488.319 892.508 491.384 898.391 493.168C910.214 496.899 922.785 495.002 932.861 487.934L1160.23 332.061L1116.78 275.145L892.534 431.446ZM395.146 208.396L481.223 459.729C487.786 479.23 495.489 481.56 498.046 482.545C500.604 483.53 503.739 484.877 511.491 484.929C519.243 484.98 528.621 484.929 533.717 483.426C538.812 481.923 546.59 476.094 550.882 470.443C558.203 460.806 560.386 448.796 556.602 437.548L473.646 183.767L395.146 208.396Z';
  const logoPath = new Path2D(logoPathData);
  const sampler = document.createElement('canvas').getContext('2d');
  const logoSize = 1426;
  let created = 0;
  while (created < pointCount) {
    const sampleX = Math.random() * logoSize;
    const sampleY = Math.random() * logoSize;
    if (!sampler.isPointInPath(logoPath, sampleX, sampleY)) continue;
    const offset = created * 4;
    data[offset] = (sampleX / logoSize - 0.5) * 2.55;
    data[offset + 1] = -(sampleY / logoSize - 0.5) * 2.55;
    data[offset + 2] = (Math.random() - 0.5) * 0.16;
    data[offset + 3] = Math.random();
    created += 1;
  }

  const vertexSource = `
    attribute vec4 a_particle;
    uniform float u_rotationX;
    uniform float u_rotationY;
    uniform float u_time;
    uniform float u_aspect;
    uniform float u_pixelRatio;
    uniform float u_fit;
    uniform float u_hover;
    uniform float u_idle;
    uniform float u_offsetX;
    uniform float u_offsetY;
    uniform float u_scrollY;
    uniform vec2 u_pointer;
    varying float v_seed;
    varying float v_depth;

    mat2 rotation(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec3 p = a_particle.xyz;
      p.xz = rotation(u_rotationY) * p.xz;
      p.yz = rotation(u_rotationX) * p.yz;
      float idlePhase = u_time * mix(1.15, 2.0, a_particle.w) + a_particle.w * 43.0;
      vec3 idleMotion = vec3(cos(idlePhase * 1.07), sin(idlePhase * 0.83), sin(idlePhase * 0.61));
      p += idleMotion * mix(0.003, 0.012, a_particle.w) * u_idle;
      float depth = 4.4 - p.z;
      float perspective = 2.65 / depth;
      vec2 basePosition = vec2(p.x * perspective * u_fit / u_aspect + u_offsetX, p.y * perspective * u_fit + u_offsetY + u_scrollY);
      float influence = smoothstep(0.5, 0.02, distance(basePosition, u_pointer)) * u_hover;
      float phase = u_time * mix(2.6, 6.2, a_particle.w) + a_particle.w * 31.4;
      vec3 scatter = vec3(cos(phase * 1.13), sin(phase * 0.91), cos(phase * 0.73));
      p += scatter * influence * mix(0.035, 0.16, a_particle.w);
      depth = 4.4 - p.z;
      perspective = 2.65 / depth;
      gl_Position = vec4(p.x * perspective * u_fit / u_aspect + u_offsetX, p.y * perspective * u_fit + u_offsetY + u_scrollY, 0.0, 1.0);
      gl_PointSize = u_pixelRatio * mix(1.35, 2.9, a_particle.w) * (4.4 / depth);
      v_seed = a_particle.w;
      v_depth = clamp((p.z + 1.2) / 2.4, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    varying float v_seed;
    varying float v_depth;

    void main() {
      vec2 point = gl_PointCoord - 0.5;
      float distanceToCenter = length(point);
      if (distanceToCenter > 0.5) discard;
      vec3 orange = vec3(0.941, 0.376, 0.098);
      vec3 warm = vec3(1.0, 0.824, 0.639);
      vec3 color = mix(orange, warm, smoothstep(0.18, 0.92, v_seed) * 0.72 + v_depth * 0.2);
      float alpha = smoothstep(0.5, 0.08, distanceToCenter) * mix(0.42, 0.88, v_seed);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  try {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const particleLocation = gl.getAttribLocation(program, 'a_particle');
    gl.enableVertexAttribArray(particleLocation);
    gl.vertexAttribPointer(particleLocation, 4, gl.FLOAT, false, 0, 0);

    const uniforms = {
      rotationX: gl.getUniformLocation(program, 'u_rotationX'),
      rotationY: gl.getUniformLocation(program, 'u_rotationY'),
      time: gl.getUniformLocation(program, 'u_time'),
      aspect: gl.getUniformLocation(program, 'u_aspect'),
      pixelRatio: gl.getUniformLocation(program, 'u_pixelRatio'),
      fit: gl.getUniformLocation(program, 'u_fit'),
      hover: gl.getUniformLocation(program, 'u_hover'),
      idle: gl.getUniformLocation(program, 'u_idle'),
      offsetX: gl.getUniformLocation(program, 'u_offsetX'),
      offsetY: gl.getUniformLocation(program, 'u_offsetY'),
      scrollY: gl.getUniformLocation(program, 'u_scrollY'),
      pointer: gl.getUniformLocation(program, 'u_pointer'),
    };

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let currentX = 0;
    let currentY = 0;
    let targetX = currentX;
    let targetY = currentY;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let visible = true;
    let frame = 0;
    let start = performance.now();
    let hoverTarget = 0;
    let hoverAmount = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollShift = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const aspect = rect.width / Math.max(1, rect.height);
      gl.uniform1f(uniforms.aspect, aspect);
      gl.uniform1f(uniforms.pixelRatio, ratio);
      gl.uniform1f(uniforms.fit, (aspect < 0.8 ? aspect * 0.42 : 0.56) * 1.2);
      gl.uniform1f(uniforms.offsetX, 0.0);
      gl.uniform1f(uniforms.offsetY, aspect < 0.8 ? 0.18 : 0.26);
    };

    const draw = now => {
      frame = 0;
      if (!visible || document.hidden) return;
      // Return drag offsets to the original orientation.
      const rotationEase = dragging ? 0.075 : 0.025;
      currentX += (targetX - currentX) * rotationEase;
      currentY += (targetY - currentY) * rotationEase;
      hoverAmount += (hoverTarget - hoverAmount) * 0.1;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.rotationX, currentX);
      gl.uniform1f(uniforms.rotationY, currentY);
      gl.uniform1f(uniforms.time, (now - start) / 1000);
      gl.uniform1f(uniforms.hover, reducedMotion.matches ? 0 : hoverAmount);
      gl.uniform1f(uniforms.idle, reducedMotion.matches ? 0 : 1);
      gl.uniform1f(uniforms.scrollY, scrollShift);
      gl.uniform2f(uniforms.pointer, pointerX, pointerY);
      gl.drawArrays(gl.POINTS, 0, pointCount);
      if (!reducedMotion.matches || dragging || hoverTarget > 0 || hoverAmount > 0.002 || Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) frame = requestAnimationFrame(draw);
    };

    const requestDraw = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };

    let scrollFrame = 0;
    const updateParallax = () => {
      scrollFrame = 0;
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
      scrollShift = reducedMotion.matches ? 0 : -progress * 0.72;
      hero.style.setProperty('--parallax-bg', `${progress * 70}px`);
      hero.style.setProperty('--parallax-text', `${reducedMotion.matches ? 0 : -progress * 160}px`);
      requestDraw();
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateParallax);
    }, { passive: true });

    canvas.addEventListener('pointerdown', event => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      requestDraw();
    });
    canvas.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = 1 - ((event.clientY - rect.top) / rect.height) * 2;
      if (!dragging) return;
      targetY += (event.clientX - previousX) * 0.006;
      targetX += (event.clientY - previousY) * 0.005;
      targetX = Math.max(-1.15, Math.min(1.15, targetX));
      previousX = event.clientX;
      previousY = event.clientY;
    });
    const release = event => {
      if (!dragging) return;
      dragging = false;
      currentY = Math.atan2(Math.sin(currentY), Math.cos(currentY));
      targetX = 0;
      targetY = 0;
      requestDraw();
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('pointerenter', event => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = 1 - ((event.clientY - rect.top) / rect.height) * 2;
      hoverTarget = 1;
      requestDraw();
    });
    canvas.addEventListener('pointerleave', () => {
      hoverTarget = 0;
      requestDraw();
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibilityObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) {
        updateParallax();
        requestDraw();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibilityObserver.observe(canvas);
    reducedMotion.addEventListener('change', requestDraw);
    document.addEventListener('visibilitychange', requestDraw);
    resize();
    gl.uniform1f(uniforms.hover, 0);
    gl.uniform1f(uniforms.idle, reducedMotion.matches ? 0 : 1);
    gl.uniform1f(uniforms.scrollY, 0);
    gl.uniform2f(uniforms.pointer, 0, 0);
    canvas.classList.add('is-ready');
    hero?.classList.add('particles-ready');
    updateParallax();
    requestDraw();
  } catch (error) {
    hero?.classList.add('particles-unavailable');
    console.warn('Particle effect unavailable.', error);
  }
})();
