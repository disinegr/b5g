(() => {
  'use strict';
  // Change the palette and motion here; no video rendering is required.
  const config = {
    primary: '#F06019', middle: '#FF944D', light: '#FFD2A3',
    speed: 0.8, scale: 1.82, maxPixels: 1600000,
  };
  const canvas = document.querySelector('#footer-shader');
  const fallback = document.querySelector('.background-fallback');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  let program, buffer, texture, timeLocation, frame = 0, lastTime = 0, elapsed = 0;
  let ready = false, inView = true, disposed = false;
  const noiseSize = 64;
  const createNoisePixels = () => {
    const pixels = new Uint8Array(noiseSize * noiseSize * 4);
    let seed = 0xB5F06019;
    for (let i = 0; i < pixels.length; i += 4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const value = seed & 255;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
    return pixels;
  };
  const rgba = hex => [...hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255), 1];
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source.replace(/\b(lowp|mediump)\b/g, 'highp'));
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }
  function draw() {
    if (!ready || gl.isContextLost()) return;
    gl.uniform1f(timeLocation, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function resize() {
    if (!ready) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(config.maxPixels / (width * height)));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pixelRatio'), ratio);
    draw();
  }
  function tick(now) {
    frame = 0;
    if (!ready || disposed || motion.matches || document.hidden || !inView) { lastTime = 0; return; }
    if (lastTime) elapsed += Math.min((now - lastTime) / 1000, 0.05) * config.speed;
    lastTime = now;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function updateMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (ready && !disposed && !motion.matches && !document.hidden && inView) frame = requestAnimationFrame(tick);
    else draw();
  }
  function showFallback(error) {
    ready = false;
    cancelAnimationFrame(frame);
    canvas.classList.remove('is-ready');
    fallback.classList.remove('is-covered');
    if (error) console.warn('Background shader unavailable; using static background.', error);
  }
  async function initialize() {
    try {
      if (disposed || gl.isContextLost()) return;
      const vertex = compile(gl.VERTEX_SHADER, window.HERO_SHADER_SOURCES[0]);
      const fragment = compile(gl.FRAGMENT_SHADER, window.HERO_SHADER_SOURCES[1]);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const values = {u_imageAspectRatio:1,u_originX:.5,u_originY:.5,u_worldWidth:0,u_worldHeight:0,u_fit:1,u_scale:config.scale,u_rotation:-360,u_offsetX:-.1,u_offsetY:.27,u_colorsCount:3,u_softness:1,u_intensity:.05,u_noise:0,u_shape:1};
      for (const [name, value] of Object.entries(values)) gl.uniform1f(gl.getUniformLocation(program, name), value);
      gl.uniform4fv(gl.getUniformLocation(program, 'u_colorBack'), [0,0,0,0]);
      gl.uniform4fv(gl.getUniformLocation(program, 'u_colors[0]'), new Float32Array([config.middle, config.primary, config.light].flatMap(rgba)));
      texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noiseSize, noiseSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, createNoisePixels());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.uniform1i(gl.getUniformLocation(program, 'u_noiseTexture'), 0);
      timeLocation = gl.getUniformLocation(program, 'u_time');
      ready = true;
      resize();
      canvas.classList.add('is-ready');
      fallback.classList.add('is-covered');
      updateMotion();
    } catch (error) { showFallback(error); }
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); showFallback(); });
  canvas.addEventListener('webglcontextrestored', initialize);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; updateMotion(); });
  visibilityObserver.observe(canvas);
  motion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame);
    if (event.persisted) return;
    disposed = true;
    resizeObserver.disconnect(); visibilityObserver.disconnect();
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
  });
  window.addEventListener('pageshow', updateMotion);
  initialize();
})();
