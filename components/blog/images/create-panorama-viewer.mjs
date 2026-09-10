import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Own the browser/Three.js lifecycle separately from the React loading UI.
export function createPanoramaViewer(container, image, { onLoad, onError, onInteract }) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    const request = new AbortController();
    let renderer, controls, geometry, material, texture;
    let intersectionObserver, resizeObserver, objectUrl;
    let disposed = false;
    let ready = false;
    let visible = typeof IntersectionObserver === 'undefined';
    let width = 0;
    let height = 0;
    let frameId = null;
    let previousTime = null;
    let rendering = false;

    function canRender() {
        return !disposed && ready && visible && !document.hidden && width > 0 && height > 0;
    }

    function stopFrames() {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        previousTime = null;
    }

    function requestRender() {
        if (canRender() && frameId === null && !rendering) {
            frameId = requestAnimationFrame(render);
        }
    }

    function render(time) {
        frameId = null;
        if (!canRender()) return;
        // Do not count time spent offscreen; also avoid a jump after a slow frame.
        const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.1);
        previousTime = time;
        rendering = true;
        controls.update(delta);
        renderer.render(scene, camera);
        rendering = false;
        // Dragging updates OrbitControls itself and requests a single frame via change.
        if (controls.autoRotate) requestRender();
    }

    function updateVisibility() {
        if (canRender()) requestRender();
        else stopFrames();
    }

    function resize() {
        if (disposed) return;
        const nextWidth = container.clientWidth;
        const nextHeight = container.clientHeight;
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            // Keep the existing 1:1 pixel ratio instead of multiplying GPU work on phones.
            renderer.setSize(width, height, false);
        }
        updateVisibility();
    }

    function handleInteraction() {
        if (disposed || !controls.autoRotate) return;
        controls.autoRotate = false;
        stopFrames();
        requestRender();
        onInteract();
    }

    function releaseObjectUrl() {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        stopFrames();
        request.abort();
        intersectionObserver?.disconnect();
        resizeObserver?.disconnect();
        document.removeEventListener('visibilitychange', updateVisibility);
        window.removeEventListener('resize', resize);
        controls?.removeEventListener('start', handleInteraction);
        controls?.removeEventListener('change', requestRender);
        // Dispose controls before removing the canvas: they also listen on its document.
        controls?.dispose();
        geometry?.dispose();
        material?.dispose();
        texture?.dispose();
        if (texture) texture.image = null;
        scene.clear();
        releaseObjectUrl();
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
    }

    function fail() {
        if (disposed) return;
        dispose();
        onError();
    }

    async function loadImage() {
        try {
            const imageUrl = image.startsWith('http')
                ? `/api/proxy-image?url=${encodeURIComponent(image)}`
                : image;
            // Unlike TextureLoader's image request, this download can be cancelled on exit.
            const response = await fetch(imageUrl, { signal: request.signal });
            if (!response.ok) throw new Error('Panorama image request failed');
            const blob = await response.blob();
            if (disposed) return;
            objectUrl = URL.createObjectURL(blob);
            texture = new THREE.TextureLoader().load(objectUrl, (loadedTexture) => {
                releaseObjectUrl();
                // Decoding can finish after an article change or React effect cleanup.
                if (disposed) {
                    loadedTexture.image = null;
                    return;
                }
                loadedTexture.colorSpace = THREE.SRGBColorSpace;
                loadedTexture.minFilter = THREE.LinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                // LinearFilter does not sample mipmaps, so do not allocate or generate them.
                loadedTexture.generateMipmaps = false;
                geometry = new THREE.SphereGeometry(500, 64, 40);
                geometry.scale(-1, 1, 1);
                material = new THREE.MeshBasicMaterial({ map: loadedTexture });
                scene.add(new THREE.Mesh(geometry, material));
                ready = true;
                onLoad();
                requestRender();
            }, undefined, fail);
        } catch {
            fail();
        }
    }

    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.rotateSpeed = -0.2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.addEventListener('start', handleInteraction);
        controls.addEventListener('change', requestRender);

        if (typeof IntersectionObserver !== 'undefined') {
            intersectionObserver = new IntersectionObserver(([entry]) => {
                visible = entry.isIntersecting;
                updateVisibility();
            });
            intersectionObserver.observe(container);
        }
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(container);
        } else {
            window.addEventListener('resize', resize);
        }
        document.addEventListener('visibilitychange', updateVisibility);
        resize();
        loadImage();
    } catch {
        // WebGL can be unavailable even on a browser that supports the rest of the page.
        fail();
    }

    return dispose;
}
