import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadNewPhoto } from '../components/photography-admin/create-photo-upload.mjs';

function setup() {
    const requests = [], progress = [], draft = { id: null }, controller = new AbortController();
    let succeed, fail;
    const task = {
        on(_event, update, reject, resolve) { fail = reject; succeed = () => { update({ bytesTransferred: 100, totalBytes: 100 }); resolve(); }; },
        cancel() { fail(new Error('Cancelled')); },
    };
    const options = {
        file: { name: 'Mountain scan.TIFF', size: 100 }, draft, signal: controller.signal,
        async request(path, body) { requests.push({ path, body }); return path === 'photos/new' ? { id: 'new-photo' } : { version: 'upload-v1' }; },
        async prepareUpload() { return () => task; }, onProgress: value => progress.push(value),
    };
    return { options, requests, progress, controller, finish: () => succeed(), fail: () => fail(new Error('Network interrupted')), started: async () => { while (!succeed) await new Promise(resolve => setImmediate(resolve)); } };
}

test('a file alone creates a private draft and uploads before opening details', async () => {
    const state = setup(), result = uploadNewPhoto(state.options);
    await state.started();
    assert.equal(state.requests[0].path, 'photos/new');
    assert.deepEqual(state.requests[0].body, { title: 'Untitled', location: '', camera: '', film: '', altText: '', collectionIds: [] });
    assert.equal(state.requests[1].path, 'photos/new-photo/upload');
    assert.equal(state.requests.some(item => item.path.endsWith('/status')), false);
    state.finish();
    assert.equal(await result, 'new-photo');
    assert.deepEqual(state.progress, [100]);
});
test('invalid files and expired sign-in do not create empty drafts', async () => {
    const state = setup();
    await assert.rejects(uploadNewPhoto({ ...state.options, file: { name: 'scan.png', size: 100 } }), /TIFF or JPEG/);
    await assert.rejects(uploadNewPhoto({ ...state.options, prepareUpload: async () => { throw new Error('Sign in again'); } }), /Sign in again/);
    assert.equal(state.requests.length, 0);
});
test('failed uploads cancel their ticket and retry on the same draft', async () => {
    const state = setup(), result = uploadNewPhoto(state.options);
    await state.started(); state.fail();
    await assert.rejects(result, /Network interrupted/);
    assert.equal(state.requests.at(-1).path, 'photos/new-photo/cancel');
    const retry = setup(); retry.options.draft = state.options.draft;
    const retried = uploadNewPhoto(retry.options);
    await retry.started(); retry.finish();
    assert.equal(await retried, 'new-photo');
    assert.equal(retry.requests[0].path, 'photos/new-photo/upload');
});
test('cancelling an active transfer cancels its ticket and never completes navigation', async () => {
    const state = setup(), result = uploadNewPhoto(state.options);
    await state.started(); state.controller.abort();
    await assert.rejects(result, /Cancelled/);
    assert.equal(state.requests.at(-1).path, 'photos/new-photo/cancel');
});
