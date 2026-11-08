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
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.domElement.setAttribute('aria-label', 'Modelo 3D interativo de iPhone 14 Pro');
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.modelPivot = new THREE.Group();
    this.modelPivot.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
    this.scene.add(this.modelPivot);
  }

  createLighting() {
    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x020617, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(5, 6, 8);
    this.scene.add(keyLight);

    const blueFill = new THREE.DirectionalLight(0x2563eb, 2.2);
    blueFill.position.set(-6, 1, 5);
    this.scene.add(blueFill);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 2.8);
    cyanRim.position.set(4, -4, -5);
    this.scene.add(cyanRim);

    const softFront = new THREE.PointLight(0x93c5fd, 1.4, 22);
    softFront.position.set(0, 2, 6);
    this.scene.add(softFront);
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

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = true;
      if (child.material) {
        child.material.needsUpdate = true;
      }
    });

    this.modelPivot.add(model);
    this.model = model;
    this.isReady = true;
    this.container.classList.add('is-model-ready');

    if (typeof this.options.onReady === 'function') {
      this.options.onReady(model);
    }
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
    window.addEventListener('resize', this.handleResize);
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

    if (this.isDragging && event.pointerId === this.activePointerId) {
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      this.dragRotation.y += deltaX * 0.012;
      this.dragRotation.x = THREE.MathUtils.clamp(this.dragRotation.x - deltaY * 0.009, -0.68, 0.68);
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
    this.activePointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.container.classList.add('is-dragging');
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.activePointerId) return;

    this.renderer.domElement.releasePointerCapture?.(event.pointerId);
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
    this.dragRotation.x = 0;
    this.dragRotation.y = 0;
    this.hoverRotation.x = 0;
    this.hoverRotation.y = 0;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const targetX = this.baseRotation.x + this.dragRotation.x + this.hoverRotation.x;
    const targetY = this.baseRotation.y + this.dragRotation.y + this.hoverRotation.y;
    const targetZ = this.hoverRotation.y * -0.035;
    this.modelPivot.rotation.x += (targetX - this.modelPivot.rotation.x) * 0.11;
    this.modelPivot.rotation.y += (targetY - this.modelPivot.rotation.y) * 0.11;
    this.modelPivot.rotation.z += (targetZ - this.modelPivot.rotation.z) * 0.11;

    this.renderer.render(this.scene, this.camera);
  }
}

window.AuralPhoneViewer = AuralPhoneViewer;
