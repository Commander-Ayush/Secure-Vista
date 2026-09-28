import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const stage = document.querySelector('#sv-camera-stage');
const status = document.querySelector('#sv-camera-status');
const centreButton = document.querySelector('#sv-camera-centre');
const pauseButton = document.querySelector('#sv-camera-pause');
const hint = document.querySelector('#sv-camera-hint');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');

async function initCamera() {
    let paused = reducedMotion.matches, inView = false, ready = false, frameId = 0, previousTime = 0;
    let pan, tilt, mount, renderer;
    let presented = false;
    const target = new THREE.Vector2(), gaze = new THREE.Vector2();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
    camera.position.set(0, 1.3, 5);
    camera.lookAt(0, 1.05, 0);
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
        status.hidden = false;
        status.textContent = 'The interactive camera is unavailable in this browser. Explore our CCTV services below.';
        return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.append(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7bdc8, 2.5));
    for (const [position, color, intensity] of [[[3,5,4],0xffffff,3], [[-3,3,2],0xe8efff,2], [[0,4,-3],0xffffff,3]]) {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(...position);
        scene.add(light);
    }
    const assembly = new THREE.Group();
    scene.add(assembly);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    const gradient = context.createRadialGradient(64,64,5,64,64,64);
    gradient.addColorStop(0, 'rgba(15,23,42,.20)');
    gradient.addColorStop(1, 'rgba(15,23,42,0)');
    context.fillStyle = gradient;
    context.fillRect(0,0,128,128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6), new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .004;
    scene.add(shadow);

    // Render only while visible and settling toward a new pointer position.
    function requestFrame() {
        if (!frameId && inView && !document.hidden) frameId = requestAnimationFrame(render);
    }
    function render(now) {
        frameId = 0;
        const dt = Math.min((now - previousTime) / 1000, .05);
        previousTime = now;
        if (!inView || document.hidden) return;
        if (ready && !presented) {
            // The first frame must match the poster, even if the pointer moved while loading.
            target.set(0, 0);
            gaze.set(0, 0);
            pan.rotation.y = tilt.rotation.z = 0;
        } else if (ready && !paused) {
            gaze.lerp(target, 1 - Math.exp(-dt * 7));
            pan.rotation.y = gaze.x;
            tilt.rotation.z = gaze.y;
        }
        renderer.render(scene, camera);
        if (ready && !presented) {
            // Swap in the same paint only after textures and geometry have been drawn.
            presented = true;
            stage.dataset.live = 'true';
            stage.dataset.ready = 'true';
            status.hidden = true;
            centreButton.disabled = pauseButton.disabled = false;
        }
        if (ready && !paused && gaze.distanceToSquared(target) > 0.0000001) requestFrame();
    }
    function resize() {
        const width = stage.clientWidth, height = stage.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.position.z = camera.aspect < 1 ? 4.8 : 4.3;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        requestFrame();
    }
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) requestFrame();
        else { cancelAnimationFrame(frameId); frameId = 0; }
    }).observe(stage);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
        else requestFrame();
    });
    resize();

    try {
        const gltf = await new GLTFLoader().loadAsync(new URL('./cctv-camera.glb', import.meta.url).href);
        const model = gltf.scene;
        mount = model.getObjectByName('arm');
        const base = model.getObjectByName('rotation_base');
        const body = model.getObjectByName('body');
        if (!mount || !base || !body) throw new Error('Missing camera articulation');
        assembly.add(model);
        model.updateMatrixWorld(true);
        // Rigid pivots: the mount and every mesh vertex remain unchanged.
        pan = new THREE.Group();
        pan.position.set(0, -1.65, 0);
        mount.add(pan);
        mount.updateMatrixWorld(true);
        pan.attach(base);
        tilt = new THREE.Group();
        base.add(tilt);
        tilt.position.copy(base.worldToLocal(mount.localToWorld(new THREE.Vector3(0,-1.30,0))));
        base.updateMatrixWorld(true);
        tilt.attach(body);
        assembly.rotation.y = -Math.PI / 2 + .38;
        assembly.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(assembly);
        const size = box.getSize(new THREE.Vector3());
        assembly.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z));
        assembly.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(assembly);
        const center = box.getCenter(new THREE.Vector3());
        assembly.position.set(-center.x, -box.min.y + .16, -center.z);
        ready = true;
        requestFrame();
    } catch (error) {
        console.warn('SecureVista camera could not load:', error);
        status.hidden = false;
        status.textContent = 'The camera could not load. Refresh to try again, or explore our services below.';
        return;
    }

    function syncControls() {
        pauseButton.textContent = paused ? 'Resume tracking' : 'Pause tracking';
        pauseButton.setAttribute('aria-pressed', String(paused));
        hint.textContent = paused ? 'Tracking paused. Resume whenever you like.' :
            coarsePointer.matches ? 'Touch to aim. Swipe to keep exploring.' : 'Move your cursor. Find your angle.';
    }
    syncControls();
    pauseButton.addEventListener('click', () => { paused = !paused; syncControls(); requestFrame(); });
    reducedMotion.addEventListener('change', event => { paused = event.matches; syncControls(); requestFrame(); });
    function centre() {
        target.set(0, 0);
        if (paused) { gaze.set(0, 0); pan.rotation.y = tilt.rotation.z = 0; }
        requestFrame();
    }
    centreButton.addEventListener('click', centre);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0,0,1), -3);
    const point = new THREE.Vector3(), pivot = new THREE.Vector3(), direction = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    function aim(x, y, eventTarget) {
        if (!presented || !inView || paused || eventTarget?.closest?.('button,a,input,select,textarea,label,nav')) return;
        const rect = stage.getBoundingClientRect();
        pointer.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
        raycaster.setFromCamera(pointer, camera);
        if (!raycaster.ray.intersectPlane(plane, point)) return;
        assembly.updateMatrixWorld(true);
        pan.getWorldPosition(pivot);
        pivot.y += .35 * assembly.scale.x;
        mount.getWorldQuaternion(rotation);
        direction.copy(point).sub(pivot).applyQuaternion(rotation.invert());
        target.set(THREE.MathUtils.clamp(Math.atan2(-direction.z, direction.x), -.9, .9),
            THREE.MathUtils.clamp(Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), -.4, .4));
        requestFrame();
    }
    for (const type of ['pointermove', 'pointerdown']) {
        window.addEventListener(type, event => aim(event.clientX, event.clientY, event.target), { passive: true });
    }
    // Keep following a finger even when the browser takes over vertical scrolling.
    window.addEventListener('touchmove', event => {
        const touch = event.touches[0];
        if (touch) aim(touch.clientX, touch.clientY, event.target);
    }, { passive: true });
    document.addEventListener('mouseleave', centre);
    stage.addEventListener('keydown', event => {
        const offsets = { ArrowLeft: [-.12,0], ArrowRight: [.12,0], ArrowUp: [0,.10], ArrowDown: [0,-.10] };
        if (event.key === 'Home') { event.preventDefault(); centre(); return; }
        if (!offsets[event.key] || paused) return;
        event.preventDefault();
        const [x,y] = offsets[event.key];
        target.set(THREE.MathUtils.clamp(target.x+x,-.9,.9), THREE.MathUtils.clamp(target.y+y,-.4,.4));
        requestFrame();
    });
    // Opt-in diagnostics for local verification; absent in the normal storefront.
    if (new URLSearchParams(location.search).has('camera-test')) {
        window.secureVistaCameraTest = { assembly, mount, pan, tilt, target, gaze, renderer, camera,
            get inView() { return inView; }, get paused() { return paused; }, get frameId() { return frameId; } };
    }
}
if (stage) initCamera().catch(error => {
    console.warn('SecureVista camera initialization failed:', error);
    status.hidden = false;
    status.textContent = 'The interactive camera is unavailable. Explore our services below.';
});

