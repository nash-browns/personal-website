import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import * as THREE from 'three';

// Keep real scene, camera, geometry, material and texture behavior. Substitute the
// browser GPU/network boundaries so lifecycle races and frame scheduling are deterministic.
async function setup({ noObservers = false, webglFails = false } = {}) {
    const state = { renders: [], updates: [], sizes: [], revoked: [], events: [], loads: 0, errors: 0, interactions: 0 };
    const frames = new Map();
    let nextFrame = 0;
    const document = new EventTarget();
    document.hidden = false;
    const window = new EventTarget();
    const canvas = { style: {}, remove() { state.events.push('canvas removed'); container.children = []; } };
    const container = { clientWidth: 1200, clientHeight: 700, children: [], appendChild(child) { this.children.push(child); } };
    class Renderer {
        constructor() {
            if (webglFails) throw new Error('WebGL unavailable');
            this.domElement = canvas;
            state.renderer = this;
        }
        setSize(width, height) { state.sizes.push([width, height]); }
        render(scene, camera) { state.renders.push({ scene, camera }); }
        dispose() { state.events.push('renderer disposed'); }
        forceContextLoss() { state.events.push('context released'); }
    }
    class Controls extends THREE.EventDispatcher {
        constructor(camera) { super(); state.controls = this; state.camera = camera; }
        update(delta) {
            state.updates.push(delta);
            if (this.autoRotate) this.dispatchEvent({ type: 'change' });
        }
        dispose() { state.events.push('controls disposed'); }
    }
    class TextureLoader {
        load(url, onLoad, onProgress, onError) {
            state.texture = new THREE.Texture();
            state.texture.addEventListener('dispose', () => state.events.push('texture disposed'));
            state.decode = () => { state.texture.image = {}; onLoad(state.texture); };
            state.decodeError = onError;
            state.textureUrl = url;
            return state.texture;
        }
    }
    class IntersectionObserver {
        constructor(callback) { state.intersection = this; this.callback = callback; }
        observe() {}
        disconnect() { state.events.push('intersection disconnected'); }
    }
    class ResizeObserver {
        constructor(callback) { state.resize = this; this.callback = callback; }
        observe() {}
        disconnect() { state.events.push('resize disconnected'); }
    }
    const context = createContext({
        document, window, AbortController,
        IntersectionObserver: noObservers ? undefined : IntersectionObserver,
        ResizeObserver: noObservers ? undefined : ResizeObserver,
        requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        fetch(url, { signal }) {
            state.requestUrl = url;
            state.signal = signal;
            return new Promise((resolve, reject) => { state.resolveFetch = resolve; state.rejectFetch = reject; });
        },
        URL: { createObjectURL() { return 'blob:panorama'; }, revokeObjectURL(url) { state.revoked.push(url); } },
    });
    const exports = { ...THREE, WebGLRenderer: Renderer, TextureLoader };
    const three = new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const controls = new SyntheticModule(['OrbitControls'], function () { this.setExport('OrbitControls', Controls); }, { context });
    const module = new SourceTextModule(await readFile(new URL('../components/blog/images/create-panorama-viewer.mjs', import.meta.url), 'utf8'), { context });
    await module.link(specifier => {
        if (specifier === 'three') return three;
        if (specifier === 'three/examples/jsm/controls/OrbitControls.js') return controls;
        throw new Error(`Unexpected import: ${specifier}`);
    });
    await module.evaluate();
    const dispose = module.namespace.createPanoramaViewer(container, 'https://example.test/panorama.jpg', {
        onLoad() { state.loads++; },
        onError() { state.errors++; },
        onInteract() { state.interactions++; },
    });
    const tick = () => new Promise(resolve => setImmediate(resolve));
    return {
        state, container, frames, dispose, tick,
        async download(ok = true) { state.resolveFetch({ ok, blob: async () => ({}) }); await tick(); },
        visible(value) { state.intersection.callback([{ isIntersecting: value }]); },
        hidden(value) { document.hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
        resize(width, height) {
            container.clientWidth = width;
            container.clientHeight = height;
            if (state.resize) state.resize.callback();
            else window.dispatchEvent(new Event('resize'));
        },
        frame(time) {
            const pending = [...frames.values()];
            frames.clear();
            for (const callback of pending) callback(time);
        },
    };
}

async function ready(options) {
    const viewer = await setup(options);
    await viewer.download();
    viewer.state.decode();
    if (viewer.state.intersection) viewer.visible(true);
    return viewer;
}

test('waits for both a decoded image and visibility before rendering; uses a lighter mesh without mipmaps', async () => {
    const v = await setup();
    assert.equal(v.frames.size, 0);
    v.visible(true);
    assert.equal(v.frames.size, 0);
    v.visible(false);
    await v.download();
    v.state.decode();
    assert.equal(v.state.loads, 1);
    assert.equal(v.frames.size, 0);
    v.visible(true);
    v.frame(0);
    const mesh = v.state.renders[0].scene.children[0];
    assert.equal(mesh.geometry.index.count / 3, 4992);
    const oldGeometry = new THREE.SphereGeometry(500, 200, 200);
    assert.equal(oldGeometry.index.count / 3, 79600);
    oldGeometry.dispose();
    assert.equal(mesh.material.map.generateMipmaps, false);
    assert.equal(mesh.material.map.minFilter, THREE.LinearFilter);
    assert.equal(mesh.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(v.container.children.length, 1);
    assert.deepEqual(v.state.revoked, ['blob:panorama']);
    assert.equal(v.state.requestUrl, '/api/proxy-image?url=https%3A%2F%2Fexample.test%2Fpanorama.jpg');
    v.dispose();
});

test('auto-rotation schedules only one frame, uses elapsed seconds, and pauses offscreen or in a hidden tab', async () => {
    const v = await ready();
    assert.equal(v.frames.size, 1);
    v.frame(1000);
    v.frame(1016);
    assert.deepEqual(v.state.updates, [0, 0.016]);
    assert.equal(v.frames.size, 1);
    v.visible(false);
    assert.equal(v.frames.size, 0);
    v.visible(true);
    v.frame(90000);
    assert.equal(v.state.updates.at(-1), 0, 'resume must not jump through hidden time');
    v.hidden(true);
    assert.equal(v.frames.size, 0);
    v.visible(false);
    v.hidden(false);
    assert.equal(v.frames.size, 0);
    v.visible(true);
    v.frame(100000);
    assert.equal(v.state.updates.at(-1), 0);
    v.frame(110000);
    assert.equal(v.state.updates.at(-1), 0.1, 'slow frames have a bounded rotation step');
    v.dispose();
});

test('after the first interaction, redraws only for control changes or resizing', async () => {
    const v = await ready();
    v.state.controls.dispatchEvent({ type: 'start' });
    v.frame(0);
    assert.equal(v.state.controls.autoRotate, false);
    assert.equal(v.frames.size, 0);
    v.state.controls.dispatchEvent({ type: 'change' });
    v.state.controls.dispatchEvent({ type: 'change' });
    assert.equal(v.frames.size, 1);
    v.frame(16);
    assert.equal(v.frames.size, 0);
    v.state.controls.dispatchEvent({ type: 'start' });
    assert.equal(v.state.interactions, 1);
    v.resize(390, 781);
    assert.equal(v.state.camera.aspect, 390 / 781);
    assert.deepEqual(v.state.sizes.at(-1), [390, 781]);
    assert.equal(v.frames.size, 1);
    v.frame(32);
    v.resize(390, 781);
    assert.equal(v.frames.size, 0, 'unchanged dimensions do not redraw');
    v.hidden(true);
    v.hidden(false);
    v.frame(48);
    assert.equal(v.frames.size, 0, 'returning to the page does not re-enable auto-rotation');
    v.dispose();
});

test('zero-sized containers suspend rendering and recover when their size returns', async () => {
    const v = await ready();
    v.resize(0, 0);
    assert.equal(v.frames.size, 0);
    assert.ok(Number.isFinite(v.state.camera.aspect));
    v.resize(844, 327);
    assert.equal(v.frames.size, 1);
    assert.equal(v.state.camera.aspect, 844 / 327);
    v.dispose();
});

test('cleanup releases GPU resources, controls, observers, requests and the canvas exactly once', async () => {
    const v = await ready();
    v.frame(0);
    const mesh = v.state.renders[0].scene.children[0];
    mesh.geometry.addEventListener('dispose', () => v.state.events.push('geometry disposed'));
    mesh.material.addEventListener('dispose', () => v.state.events.push('material disposed'));
    v.dispose();
    const events = [...v.state.events];
    v.dispose();
    assert.deepEqual(v.state.events, events);
    for (const name of ['geometry disposed', 'material disposed', 'texture disposed', 'renderer disposed', 'controls disposed', 'context released', 'intersection disconnected', 'resize disconnected', 'canvas removed']) {
        assert.equal(events.filter(event => event === name).length, 1, name);
    }
    assert.ok(events.indexOf('controls disposed') < events.indexOf('canvas removed'));
    assert.equal(v.state.signal.aborted, true);
    assert.equal(v.state.texture.image, null);
    assert.equal(v.container.children.length, 0);
    assert.equal(v.frames.size, 0);
    v.state.controls.dispatchEvent({ type: 'start' });
    v.state.controls.dispatchEvent({ type: 'change' });
    v.visible(true);
    v.resize(600, 400);
    v.hidden(false);
    assert.equal(v.frames.size, 0);
    assert.equal(v.state.interactions, 0);
});

test('leaving during a download cancels it; late responses cannot allocate textures or update the UI', async () => {
    const v = await setup();
    v.dispose();
    assert.equal(v.state.signal.aborted, true);
    await v.download();
    assert.equal(v.state.texture, undefined);
    assert.equal(v.state.loads, 0);
    assert.equal(v.state.errors, 0);
});

test('leaving during image decoding releases the blob and ignores late success/error callbacks', async () => {
    const v = await setup();
    await v.download();
    v.dispose();
    v.state.decode();
    v.state.decodeError();
    assert.equal(v.state.texture.image, null);
    assert.deepEqual(v.state.revoked, ['blob:panorama']);
    assert.equal(v.state.loads, 0);
    assert.equal(v.state.errors, 0);
    assert.equal(v.frames.size, 0);
});

test('network, HTTP and decoding failures show one error and clean up without spinning', async () => {
    for (const failure of ['network', 'http', 'decode']) {
        const v = await setup();
        if (failure === 'network') { v.state.rejectFetch(new Error('offline')); await v.tick(); }
        if (failure === 'http') await v.download(false);
        if (failure === 'decode') { await v.download(); v.state.decodeError(); }
        assert.equal(v.state.errors, 1, failure);
        assert.equal(v.state.loads, 0);
        assert.equal(v.frames.size, 0);
        assert.equal(v.container.children.length, 0);
        assert.equal(v.state.signal.aborted, true);
        v.dispose();
    }
});

test('WebGL initialization failure uses the error UI without starting a download', async () => {
    const v = await setup({ webglFails: true });
    assert.equal(v.state.errors, 1);
    assert.equal(v.state.requestUrl, undefined);
    assert.equal(v.frames.size, 0);
    v.dispose();
});

test('browsers without observers still render, resize and release the fallback listener', async () => {
    const v = await ready({ noObservers: true });
    assert.equal(v.frames.size, 1);
    v.resize(500, 300);
    assert.equal(v.state.camera.aspect, 500 / 300);
    v.dispose();
    const sizeCount = v.state.sizes.length;
    v.resize(100, 100);
    assert.equal(v.state.sizes.length, sizeCount);
});
