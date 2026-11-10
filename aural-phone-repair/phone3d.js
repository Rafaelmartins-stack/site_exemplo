/**
 * AURAL // Interactive iPhone 14 Pro viewer
 * Loads the supplied GLB model and supports cursor tilt plus drag rotation.
 */

class AuralPhoneViewer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`[AuralPhoneViewer] Container #${containerId} not found.`);
      return;
    }

    this.options = Object.assign({
      modelUrl: 'assets/iphone-14-pro.glb',
      onReady: null,
      onError: null
    }, options);

    this.baseRotation = { x: 0.08, y: -0.46, z: 0 };
    this.hoverRotation = { x: 0, y: 0 };
    this.dragRotation = { x: 0, y: 0 };
    this.lastPointer = { x: 0, y: 0 };
    this.activePointerId = null;
    this.isDragging = false;
    this.isReady = false;

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.animate = this.animate.bind(this);

    this.initScene();
    this.createLighting();
    this.createStatus();
    this.bindEvents();
    this.loadModel();
    requestAnimationFrame(this.animate);
  }

  initScene() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, window.innerWidth || 1);
    this.height = Math.max(rect.height, window.innerHeight || 1);

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 11.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.domElement.setAttribute('aria-label', 'Modelo 3D interativo de iPhone 14 Pro');
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // floatGroup carries the idle "hover" motion; modelPivot carries user rotation.
    this.floatGroup = new THREE.Group();
    this.scene.add(this.floatGroup);

    this.modelPivot = new THREE.Group();
    this.modelPivot.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
    this.floatGroup.add(this.modelPivot);

    this.clock = new THREE.Clock();
    this.introStart = undefined;
    this.introDuration = 2200;
    // Scroll story: target is set from outside (phone-story.js), the
    // smoothed value is what the scene actually renders.
    this.storyTarget = 0;
    this.storyProgress = 0;
    this.storyKeyframes = AuralPhoneViewer.createStoryKeyframes();
    this.xrayLines = [];
    this.xrayMaterials = [];
    this.lastInteraction = 0;
    this.dragVelocity = { x: 0, y: 0 };
    this.isVisible = true;
    this.reducedMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }

  /**
   * Builds a small procedural "photo studio" (dark room + softboxes) and
   * pre-filters it into an environment map, so the titanium frame and the
   * glass get real reflections instead of looking flat and dark.
   */
  createEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = new THREE.Scene();

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0x05070d, side: THREE.BackSide })
    );
    studio.add(room);

    const addPanel = (color, intensity, w, h, position, lookAt = [0, 0, 0]) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(intensity),
          side: THREE.DoubleSide
        })
      );
      panel.position.set(...position);
      panel.lookAt(...lookAt);
      studio.add(panel);
    };

    // Large white key softbox (top-front-right)
    addPanel(0xffffff, 3.2, 10, 6, [6, 7, 9]);
    // Tall strip light on the left for long highlights on the frame
    addPanel(0xdbeafe, 2.4, 2.2, 16, [-10, 1, 4]);
    // Brand-coloured rims behind the phone
    addPanel(0x2563eb, 2.6, 8, 10, [-6, 2, -11]);
    addPanel(0x00e5ff, 2.2, 3, 12, [10, -2, -6]);
    // Soft overhead fill
    addPanel(0xffffff, 0.9, 14, 14, [0, 14, 0]);
    // Faint floor bounce
    addPanel(0x1e3a8a, 0.6, 14, 14, [0, -14, 0]);

    this.envTarget = pmrem.fromScene(studio, 0.035);
    this.scene.environment = this.envTarget.texture;

    studio.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    pmrem.dispose();
  }

  createLighting() {
    this.createEnvironment();

    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x020617, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 6, 8);
    this.scene.add(keyLight);

    const blueFill = new THREE.DirectionalLight(0x3b82f6, 1.4);
    blueFill.position.set(-6, 1, 5);
    this.scene.add(blueFill);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 2.2);
    cyanRim.position.set(4, -4, -5);
    this.scene.add(cyanRim);

    const backRim = new THREE.DirectionalLight(0x60a5fa, 1.6);
    backRim.position.set(-4, 5, -6);
    this.scene.add(backRim);
  }

  /** Soft elliptical shadow below the phone, for a sense of grounding. */
  createContactShadow(bottomY) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.55)');
    gradient.addColorStop(0.35, 'rgba(15, 40, 120, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.32, 1);
    shadow.position.y = bottomY - 0.35;
    shadow.renderOrder = -1;
    this.scene.add(shadow);
    this.contactShadow = shadow;
    this.contactShadowBaseY = shadow.position.y;
  }

  createStatus() {
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'phone-model-status';
    this.statusElement.textContent = 'Carregando modelo 3D…';
    this.container.appendChild(this.statusElement);
  }

  setStatus(message, isError = false) {
    if (!this.statusElement) return;
    this.statusElement.textContent = message;
    this.statusElement.classList.toggle('is-error', isError);
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      this.reportError('O carregador do modelo 3D não foi iniciado. Recarregue a página.');
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      this.options.modelUrl,
      (gltf) => this.mountModel(gltf),
      (event) => {
        if (!event.total) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        this.setStatus(`Carregando modelo 3D… ${progress}%`);
      },
      (error) => {
        console.error('[AuralPhoneViewer] Unable to load GLB model.', error);
        const serverHint = window.location.protocol === 'file:'
          ? ' Abra o projeto pelo servidor local: .\\serve.ps1.'
          : ' Recarregue a página e tente novamente.';
        this.reportError(`Não foi possível carregar o modelo 3D.${serverHint}`);
      }
    );
  }

  mountModel(gltf) {
    const model = gltf.scene || gltf.scenes[0];
    if (!model) {
      this.reportError('O arquivo 3D não contém uma cena que possa ser exibida.');
      return;
    }

    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
      this.reportError('Não foi possível calcular as dimensões do modelo 3D.');
      return;
    }

    const scale = 5.7 / largestDimension;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const textureSlots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = true;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;

        // The GLB ships its single material in BLEND mode with depth writes
        // off. Because the whole phone is one mesh, triangles were then drawn
        // in arbitrary order, producing the black "checkerboard" artefacts on
        // the back glass. The texture is effectively opaque, so render it as
        // a solid surface with proper depth testing.
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.depthTest = true;
        material.alphaTest = 0;

        if ('envMapIntensity' in material) material.envMapIntensity = 1.35;

        textureSlots.forEach((slot) => {
          const texture = material[slot];
          if (texture) {
            texture.anisotropy = maxAnisotropy;
            texture.needsUpdate = true;
          }
        });

        material.needsUpdate = true;
      });
    });

    this.createContactShadow(-(size.y * scale) / 2);
    this.createXray(model, size.multiplyScalar(scale));

    this.modelPivot.add(model);
    this.model = model;
    this.isReady = true;
    this.introStart = performance.now();
    this.lastInteraction = this.introStart + this.introDuration;
    this.container.classList.add('is-model-ready');
    document.dispatchEvent(new CustomEvent('aural:phone-ready'));

    if (typeof this.options.onReady === 'function') {
      this.options.onReady(model);
    }
  }

  /**
   * "X-ray" layer used by the diagnostics chapter: glowing feature edges
   * over the mesh plus a scanning band that sweeps along the phone.
   */
  createXray(model, scaledSize) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      const edges = new THREE.EdgesGeometry(child.geometry, 20);
      const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0x5ccfff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }));
      lines.visible = false;
      child.add(lines);
      this.xrayLines.push(lines);

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        this.xrayMaterials.push({
          material,
          color: material.color.clone(),
          emissiveIntensity: material.emissiveIntensity
        });
      });
    });

    const band = new THREE.Mesh(
      new THREE.BoxGeometry(scaledSize.x * 1.12, 0.035, scaledSize.z * 1.6),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    band.visible = false;
    this.modelPivot.add(band);
    this.scanBand = band;
    this.scanRange = scaledSize.y / 2;
  }

  applyXray(amount, elapsed) {
    const visible = amount > 0.001;
    this.xrayLines.forEach((lines) => {
      lines.visible = visible;
      lines.material.opacity = amount * 0.95;
    });
    this.xrayMaterials.forEach(({ material, color, emissiveIntensity }) => {
      material.color.copy(color).multiplyScalar(1 - amount * 0.82);
      material.emissiveIntensity = emissiveIntensity * (1 - amount * 0.75);
    });
    if (this.scanBand) {
      this.scanBand.visible = visible;
      this.scanBand.material.opacity = amount * 0.85;
      this.scanBand.position.y = Math.sin(elapsed * 1.6) * this.scanRange * 0.92;
    }
  }

  /**
   * Poses for the scroll story. `p` is the scroll progress (0–1); each
   * chapter has two keys so the pose holds while its text is on screen.
   * px/py: phone offset, cz: camera distance, xr: x-ray amount.
   * On narrow screens the copy sits below the phone, so pxm replaces px
   * and dcz/dpy pull the camera back and lift the phone into the top half.
   */
  // Camera distance multiplier on narrow (phone) screens: higher = smaller model.
  static get NARROW_ZOOM() {
    return 1.4;
  }

  static createStoryKeyframes() {
    const PI = Math.PI;
    const hero = { rx: 0.08, ry: -0.46, px: 0, py: 0, pxm: 0, cz: 11.5, xr: 0, dcz: 6, dpy: 0.8 };
    const narrow = { dcz: 13, dpy: 2.4 };
    const narrowClose = { dcz: 3.2, dpy: 0.9 };
    return [
      { p: 0.0, ...hero },
      { p: 0.05, ...hero },
      // 01 Display — front of the phone, copy on the left
      { p: 0.15, rx: 0.02, ry: PI - 0.26, px: 1.9, py: -0.3, pxm: 0, cz: 11.2, xr: 0, ...narrow },
      { p: 0.30, rx: -0.03, ry: PI + 0.14, px: 1.9, py: -0.3, pxm: 0, cz: 10.7, xr: 0, ...narrow },
      // 02 Cameras — close-up on the camera module, copy on the right
      { p: 0.40, rx: 0.1, ry: 2 * PI + 0.16, px: -0.25, py: -1.95, pxm: 0.75, cz: 5.6, xr: 0, ...narrowClose },
      { p: 0.52, rx: 0.02, ry: 2 * PI - 0.12, px: -0.25, py: -1.95, pxm: 0.75, cz: 5.2, xr: 0, ...narrowClose },
      // 03 Frame — side profile of the chassis, copy on the left
      { p: 0.62, rx: 0.08, ry: 2 * PI + PI / 2 - 0.12, px: 1.7, py: -0.3, pxm: 0, cz: 11, xr: 0, ...narrow },
      { p: 0.72, rx: -0.05, ry: 2 * PI + PI / 2 + 0.18, px: 1.7, py: -0.3, pxm: 0, cz: 10.6, xr: 0, ...narrow },
      // 04 X-ray diagnostics — back of the phone, copy on the right
      { p: 0.81, rx: 0.1, ry: 4 * PI - 0.38, px: -1.9, py: -0.3, pxm: 0, cz: 11.2, xr: 1, ...narrow },
      { p: 0.90, rx: 0.04, ry: 4 * PI - 0.08, px: -1.9, py: -0.3, pxm: 0, cz: 10.8, xr: 1, ...narrow },
      // Outro — back to the hero pose (one extra turn)
      { p: 1.0, ...hero, ry: 4 * PI - 0.46 }
    ];
  }

  getStoryPose(progress, isNarrow) {
    const keys = this.storyKeyframes;
    let a = keys[0];
    let b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (progress >= keys[i].p && progress <= keys[i + 1].p) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
    const span = b.p - a.p;
    const raw = span > 0 ? THREE.MathUtils.clamp((progress - a.p) / span, 0, 1) : 0;
    const t = raw * raw * (3 - 2 * raw); // smoothstep
    const mix = (key) => a[key] + (b[key] - a[key]) * t;

    // On phones the model is drawn a bit smaller: the camera moves back and
    // vertical offsets scale with it so the phone keeps its place on screen.
    const zoom = isNarrow ? AuralPhoneViewer.NARROW_ZOOM : 1;

    return {
      rx: mix('rx'),
      ry: mix('ry'),
      // On narrow screens the copy sits below the phone instead of beside it.
      px: (isNarrow ? mix('pxm') : mix('px')) * zoom,
      py: (mix('py') + (isNarrow ? mix('dpy') : 0)) * zoom,
      cz: (mix('cz') + (isNarrow ? mix('dcz') : 0)) * zoom,
      xr: mix('xr')
    };
  }

  setStoryProgress(value) {
    this.storyTarget = THREE.MathUtils.clamp(value, 0, 1);
  }

  reportError(message) {
    this.setStatus(message, true);
    if (typeof this.options.onError === 'function') {
      this.options.onError(message);
    }
  }

  bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('dblclick', () => this.resetView());
    window.addEventListener('resize', this.handleResize);

    // Skip rendering while the hero is scrolled out of view or the tab is hidden.
    if ('IntersectionObserver' in window) {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.isVisible = entries.some((entry) => entry.isIntersecting);
      });
      this.visibilityObserver.observe(this.container);
    }
  }

  getPointerPosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1
    };
  }

  handlePointerMove(event) {
    const point = this.getPointerPosition(event);
    this.lastInteraction = performance.now();

    if (this.isDragging && event.pointerId === this.activePointerId) {
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      const stepY = deltaX * 0.012;
      const stepX = -deltaY * 0.009;
      this.dragRotation.y += stepY;
      this.dragRotation.x = THREE.MathUtils.clamp(this.dragRotation.x + stepX, -0.68, 0.68);
      // Remember the latest velocity so the phone keeps spinning briefly on release.
      this.dragVelocity.y = THREE.MathUtils.clamp(stepY, -0.12, 0.12);
      this.dragVelocity.x = THREE.MathUtils.clamp(stepX, -0.06, 0.06);
      this.lastPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    this.hoverRotation.y = point.x * 0.34;
    this.hoverRotation.x = -point.y * 0.14;
  }

  handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    this.isDragging = true;
    this.dragVelocity.x = 0;
    this.dragVelocity.y = 0;
    this.lastInteraction = performance.now();
    this.activePointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.container.classList.add('is-dragging');
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.activePointerId) return;

    this.renderer.domElement.releasePointerCapture?.(event.pointerId);
    // If the pointer was held still before release, don't fling the phone.
    if (performance.now() - this.lastInteraction > 80) {
      this.dragVelocity.x = 0;
      this.dragVelocity.y = 0;
    }
    this.isDragging = false;
    this.activePointerId = null;
    this.container.classList.remove('is-dragging');
  }

  handlePointerLeave() {
    if (this.isDragging) return;
    this.hoverRotation.x = 0;
    this.hoverRotation.y = 0;
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, window.innerWidth || 1);
    this.height = Math.max(rect.height, window.innerHeight || 1);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  resetView() {
    // Take the shortest way back to the front instead of unwinding full turns.
    const fullTurn = Math.PI * 2;
    const offset = Math.round(this.dragRotation.y / fullTurn) * fullTurn;
    this.dragRotation.y = 0;
    this.modelPivot.rotation.y -= offset;
    this.dragRotation.x = 0;
    this.dragVelocity.x = 0;
    this.dragVelocity.y = 0;
    this.hoverRotation.x = 0;
    this.hoverRotation.y = 0;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;
    if (!this.isVisible || document.hidden) return;

    // Frame-rate independent smoothing factor (≈0.11 at 60 fps).
    const ease = 1 - Math.pow(0.89, delta * 60);

    // Inertia after the user lets go of a drag.
    if (!this.isDragging && (this.dragVelocity.x || this.dragVelocity.y)) {
      const decay = Math.pow(0.92, delta * 60);
      this.dragRotation.y += this.dragVelocity.y * delta * 60;
      this.dragRotation.x = THREE.MathUtils.clamp(
        this.dragRotation.x + this.dragVelocity.x * delta * 60, -0.68, 0.68
      );
      this.dragVelocity.x *= decay;
      this.dragVelocity.y *= decay;
      if (Math.abs(this.dragVelocity.x) < 1e-4) this.dragVelocity.x = 0;
      if (Math.abs(this.dragVelocity.y) < 1e-4) this.dragVelocity.y = 0;
    }

    // Gentle idle sway once nobody has touched the phone for a few seconds.
    const idleFor = performance.now() - this.lastInteraction;
    const idleWeight = this.reducedMotion || this.isDragging
      ? 0
      : THREE.MathUtils.smoothstep(idleFor, 2500, 5000);
    const idleSway = Math.sin(elapsed * 0.45) * 0.16 * idleWeight;

    // Scroll story: smooth the externally-set progress, then sample the pose.
    const previousStory = this.storyProgress;
    if (this.reducedMotion) {
      this.storyProgress = this.storyTarget;
    } else {
      this.storyProgress += (this.storyTarget - this.storyProgress) * Math.min(1, ease * 0.9);
      if (Math.abs(this.storyTarget - this.storyProgress) < 1e-4) this.storyProgress = this.storyTarget;
    }
    const storyMoving = Math.abs(this.storyProgress - previousStory) > 1e-4;
    const isNarrow = this.width / this.height < 0.9;
    const pose = this.getStoryPose(this.storyProgress, isNarrow);

    // While the story advances, let any manual drag drift back to the
    // choreographed pose (to the nearest full turn, never unwinding).
    if (storyMoving && !this.isDragging) {
      const fullTurn = Math.PI * 2;
      const settleY = Math.round(this.dragRotation.y / fullTurn) * fullTurn;
      const settle = Math.min(1, ease * 0.6);
      this.dragRotation.y += (settleY - this.dragRotation.y) * settle;
      this.dragRotation.x += (0 - this.dragRotation.x) * settle;
    }

    // Idle sway is calmer inside a chapter, where the copy needs the
    // phone to hold still.
    const heroWeight = 1 - THREE.MathUtils.smoothstep(this.storyProgress, 0.03, 0.1)
      + THREE.MathUtils.smoothstep(this.storyProgress, 0.93, 1);
    const sway = idleSway * (0.35 + 0.65 * heroWeight);

    const targetX = pose.rx + this.dragRotation.x + this.hoverRotation.x;
    const targetY = pose.ry + this.dragRotation.y + this.hoverRotation.y + sway;
    const targetZ = this.hoverRotation.y * -0.035;
    this.modelPivot.rotation.x += (targetX - this.modelPivot.rotation.x) * ease;
    this.modelPivot.rotation.y += (targetY - this.modelPivot.rotation.y) * ease;
    this.modelPivot.rotation.z += (targetZ - this.modelPivot.rotation.z) * ease;

    this.camera.position.z = pose.cz;
    this.applyXray(pose.xr, elapsed);

    // Entrance: the phone rises from below the fold while spinning into place.
    let intro = 1;
    if (this.introStart !== undefined && !this.reducedMotion) {
      const t = THREE.MathUtils.clamp((performance.now() - this.introStart) / this.introDuration, 0, 1);
      intro = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
    }

    // Slow floating motion, with the contact shadow reacting to the height.
    const float = this.reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.09 * (0.4 + 0.6 * heroWeight);
    this.floatGroup.position.x = pose.px;
    this.floatGroup.position.y = float - (1 - intro) * 4.2 + pose.py;
    this.floatGroup.rotation.y = -(1 - intro) * Math.PI * 1.35;
    this.floatGroup.scale.setScalar(0.82 + intro * 0.18);

    if (this.contactShadow) {
      const lift = 1 - float * 1.6;
      this.contactShadow.position.x = pose.px;
      this.contactShadow.scale.set(lift * intro, 0.32 * lift * intro, 1);
      this.contactShadow.material.opacity = THREE.MathUtils.clamp(lift, 0.6, 1) * intro * heroWeight;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.AuralPhoneViewer = AuralPhoneViewer;
