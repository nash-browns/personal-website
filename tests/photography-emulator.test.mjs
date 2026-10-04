import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test,before,after } from 'node:test';
import { SourceTextModule,SyntheticModule } from 'node:vm';
import { initializeApp,deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeTestEnvironment,assertFails,assertSucceeds } from '@firebase/rules-unit-testing';
import { doc,getDoc,setDoc } from 'firebase/firestore';
import { ref,uploadBytes,getBytes } from 'firebase/storage';
import * as model from '../lib/photography/model.mjs';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { createDownloadGuard, DownloadLimitError, MAX_DOWNLOAD_BYTES } from '../lib/photography/download-limits.mjs';

const projectId='demo-photography';let app,db,bucket,service,environment;
async function moduleAt(file,dependencies){
    const module=new SourceTextModule(await readFile(new URL(`../${file}`,import.meta.url),'utf8'));
    await module.link(specifier=>{assert.ok(specifier in dependencies,specifier);const exports=dependencies[specifier];return new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);});});await module.evaluate();return module.namespace;
}
before(async()=>{
    assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8092');assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9192');assert.equal(process.env.GCLOUD_PROJECT,projectId);
    app=initializeApp({projectId,storageBucket:`${projectId}.appspot.com`});db=getFirestore(app);bucket=getStorage(app).bucket();
    service=await moduleAt('lib/photography/admin-service.js',{'server-only':{},'node:crypto':await import('node:crypto'),'./server':{photoDb:db,photoBucket:()=>bucket,serialize:doc=>({...doc.data(),id:doc.id})},'./model.mjs':model});
    environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8092,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')},storage:{host:'127.0.0.1',port:9192,rules:await readFile(new URL('../storage.photography.rules',import.meta.url),'utf8')}});
});
after(async()=>{await environment?.cleanup();await deleteApp(app);});
const fields=(title,collectionIds)=>({title,location:'Kansas City',camera:'Kodak',film:'Fujifilm 400',altText:`View of ${title}`,collectionIds});
test('download quotas are atomic across instances and inaccessible to clients', async () => {
    const counter = db.collection('photographyDownloadLimits').doc('current');
    await counter.delete();
    const request = ip => new Request('http://localhost:3001/api/photography/download/photo', { headers: { 'x-vercel-forwarded-for': ip } });
    const guard = () => createDownloadGuard({ db, env: { VERCEL: '1' }, now: () => 0 });
    for (let i = 0; i < 4; i++) await guard()(request('192.0.2.1'));
    const sameVisitor = await Promise.allSettled(Array.from({ length: 6 }, () => guard()(request('192.0.2.1'))));
    assert.equal(sameVisitor.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await counter.get()).data().total, 5);
    await counter.set({ day: 0, total: 249, visitors: {} });
    const global = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => guard()(request(`198.51.100.${i + 1}`))));
    assert.equal(global.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await counter.get()).data().total, 250);
    const queue = await db.collection('email_queue').get();
    assert.equal(queue.size, 1, 'Concurrent servers must queue only one limit alert');
    const alert = queue.docs[0];
    assert.equal(alert.id, 'photography-download-limit-1970-01-01');
    assert.deepEqual(alert.data().to, [model.OWNER_EMAIL]);
    assert.match(alert.data().message.text, /250 attempts/);
    await alert.ref.update({ delivery: { state: 'SUCCESS' } });
    await assert.rejects(guard()(request('203.0.113.1')), { status: 429 });
    assert.equal((await alert.ref.get()).data().delivery.state, 'SUCCESS');
    assert.equal((await db.collection('email_queue').get()).size, 1);
    const client = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(client, 'photographyDownloadLimits/current')));
    await assertFails(setDoc(doc(client, 'photographyDownloadLimits/current'), { total: 0 }));
    await counter.delete();
    await alert.ref.delete();
});
test('protected download serves a real bounded web image from Storage', async () => {
    const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'blue' } }).webp().toBuffer();
    const path = 'photography/public/download-test/v1/web.webp';
    await bucket.file(path).save(bytes);
    await db.collection('photos').doc('download-test').set({ status: 'published', title: 'Download test', webImage: { path } });
    const route = await moduleAt('app/api/photography/download/[id]/route.js', {
        '@/lib/photography/server': { photoDb: db, photoBucket: () => bucket },
        '@/lib/photography/model.mjs': model,
        '@/lib/photography/download-guard': { reserveDownload: createDownloadGuard({ db, now: () => 0, env: {} }) },
        '@/lib/photography/download-limits.mjs': { DownloadLimitError, MAX_DOWNLOAD_BYTES },
    });
    const request = new Request('http://localhost:3001/api/photography/download/download-test');
    const response = await route.GET(request, { params: Promise.resolve({ id: 'download-test' }) });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    await db.collection('photos').doc('download-test').delete();
    await bucket.file(path).delete();
    await db.collection('photographyDownloadLimits').doc('current').delete();
});
test('owner collection previews serve the small private thumbnail with a web fallback', async () => {
    const root = 'photography/private/thumbnail-test/previews/v1';
    const web = Buffer.from('web-preview'), thumbnail = Buffer.from('small-thumbnail');
    await bucket.file(`${root}/web.webp`).save(web);
    await bucket.file(`${root}/thumbnail.webp`).save(thumbnail);
    const asset = db.collection('photoAssets').doc('thumbnail-test');
    await asset.set({ ready: { web: { path: `${root}/web.webp` }, thumbnail: { path: `${root}/thumbnail.webp` } } });
    const route = await moduleAt('app/api/photography/admin/[...path]/route.js', {
        'next/cache': { revalidateTag() {}, revalidatePath() {} },
        '@/lib/photography/server': { photoDb: db, photoBucket: () => bucket, requirePhotoOwner: async () => {}, requireSameOrigin() {} },
        '@/lib/photography/model.mjs': model,
        '@/lib/photography/admin-service': service,
    });
    const preview = () => route.GET(new Request('http://localhost:3001/api/photography/admin/preview/thumbnail-test?size=thumbnail'), { params: Promise.resolve({ path: ['preview', 'thumbnail-test'] }) });
    const response = await preview();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), thumbnail);
    await asset.set({ ready: { web: { path: `${root}/web.webp` } } });
    assert.deepEqual(Buffer.from(await (await preview()).arrayBuffer()), web);
    await asset.delete();
    await bucket.deleteFiles({ prefix: root });
});
test('complete library lifecycle preserves independent membership and rejects stale ordering',async()=>{
    await service.initializeCollections();await service.initializeCollections();assert.equal((await db.collection('photoCollections').get()).size,3);
    const a=await service.savePhoto('new',fields('A',['featured','kansas_city']));
    const b=await service.savePhoto('new',fields('B',['featured','kansas_city']));
    const col=await db.collection('photoCollections').doc('featured').get();
    await service.reorderPhotos('featured',{ids:[b.id,a.id],revision:col.data().revision});
    assert.equal((await db.collection('photos').doc(b.id).get()).data().collectionOrder.featured,0);
    assert.ok((await db.collection('photos').doc(b.id).get()).data().collectionOrder.kansas_city>0);
    await assert.rejects(()=>service.reorderPhotos('featured',{ids:[a.id,b.id],revision:col.data().revision}),/another tab/);
    const photo=(await db.collection('photos').doc(a.id).get()).data();
    await service.savePhoto(a.id,{...photo,collectionIds:['kansas_city']});
    assert.deepEqual((await db.collection('photos').doc(a.id).get()).data().collectionIds,['kansas_city']);
    assert.equal((await db.collection('photos').doc(b.id).get()).data().collectionIds.length,2);
    await assert.rejects(()=>service.setPhotoStatus(a.id,{status:'published',revision:photo.revision+1}),/web image/);
    const collection=(await db.collection('photoCollections').doc('featured').get()).data();
    await assert.rejects(()=>service.saveCollection('featured',{...collection,archived:true}),/default/);
});
test('registered uploads use immutable private paths; stale cancellation cannot cancel a replacement',async()=>{
    const {id}=await service.savePhoto('new',fields('Upload',['arizona']));
    const first=await service.beginUpload(id,{name:'scan.TIFF',kind:'original',size:100});
    const second=await service.beginUpload(id,{name:'scan.JPG',kind:'original',size:100});
    assert.match(first.path,/photography\/private\/.+\/original\/.+\/source.tiff/);
    await service.cancelUpload(id,first.version);
    assert.equal((await db.collection('photoAssets').doc(id).get()).data().pending.status,'uploading');
    await service.cancelUpload(id,second.version);
    assert.equal((await db.collection('photoAssets').doc(id).get()).data().pending.status,'cancelled');
});
test('private assets and uploads deny anonymous users and unrelated admins',async()=>{
    await db.collection('photos').doc('published').set({status:'published'});await db.collection('photos').doc('draft').set({status:'draft'});await db.collection('photoAssets').doc('published').set({original:'secret'});
    const anonymous=environment.unauthenticatedContext(); const anonymousDb=anonymous.firestore(), anonymousStorage=anonymous.storage();
    await assertSucceeds(getDoc(doc(anonymousDb,'photos/published')));
    await assertFails(getDoc(doc(anonymousDb,'photos/draft')));
    await assertFails(getDoc(doc(anonymousDb,'photoAssets/published')));
    const owner=environment.authenticatedContext(model.OWNER_UID,{email:model.OWNER_EMAIL,email_verified:true}); const ownerDb=owner.firestore(), ownerStorage=owner.storage();
    await assertSucceeds(getDoc(doc(ownerDb,'photoAssets/published')));
    await assertFails(setDoc(doc(ownerDb,'photos/published'),{status:'published'}));
    const bytes=await sharp({create:{width:10,height:10,channels:3,background:'red'}}).jpeg().toBuffer();
    const path='photography/private/published/original/version1/source.jpg';
    await assertFails(uploadBytes(ref(anonymousStorage,path),bytes,{contentType:'image/jpeg'}));
    const outsider=environment.authenticatedContext('partner-admin',{email:'admin@example.test',email_verified:true}); const outsiderDb=outsider.firestore(), outsiderStorage=outsider.storage();
    await assertFails(getDoc(doc(outsiderDb,'photoAssets/published')));
    await assertFails(uploadBytes(ref(outsiderStorage,path),bytes,{contentType:'image/jpeg'}));
    await assertSucceeds(uploadBytes(ref(ownerStorage,path),bytes,{contentType:'image/jpeg'}));
    await assertFails(uploadBytes(ref(ownerStorage,path),Buffer.from('replacement'),{contentType:'image/jpeg'}));
    await assertFails(getBytes(ref(anonymousStorage,path)));
    await assertFails(uploadBytes(ref(ownerStorage,'photography/public/published/v1/web.webp'),bytes,{contentType:'image/webp'}));
});
test('publish copies only ready derivatives and archive preserves source files',async()=>{
    const {id}=await service.savePhoto('new',fields('Ready',['featured']));
    const bytes=await sharp({create:{width:20,height:10,channels:3,background:'blue'}}).webp().toBuffer();
    for(const name of ['web','thumbnail'])await bucket.file(`photography/private/${id}/previews/v1/${name}.webp`).save(bytes);
    await db.collection('photoAssets').doc(id).set({ready:{version:'v1',web:{path:`photography/private/${id}/previews/v1/web.webp`,width:20,height:10},thumbnail:{path:`photography/private/${id}/previews/v1/thumbnail.webp`}}},{merge:true});
    await service.setPhotoStatus(id,{status:'published',revision:1});const photo=(await db.collection('photos').doc(id).get()).data();
    assert.equal(photo.status,'published');assert.match(photo.webImage.url,/\/api\/photography\/media\//);assert.equal(photo.original,undefined);
    assert.equal((await bucket.file(photo.webImage.path).exists())[0],true);
    await service.setPhotoStatus(id,{status:'archived',revision:2});assert.equal((await db.collection('photos').doc(id).get()).data().status,'archived');
    assert.equal((await bucket.file(`photography/private/${id}/previews/v1/web.webp`).exists())[0],true);
});
test('Save Information publishes metadata and the newest image together; Archive unpublishes',async()=>{
    const {id}=await service.savePhoto('new',fields('Before',['featured']));
    const bytes=await sharp({create:{width:20,height:10,channels:3,background:'blue'}}).webp().toBuffer();
    async function ready(version){
        const root=`photography/private/${id}/previews/${version}`;
        for(const name of ['web','thumbnail'])await bucket.file(`${root}/${name}.webp`).save(bytes);
        await db.collection('photoAssets').doc(id).set({ready:{version,web:{path:`${root}/web.webp`,width:20,height:10},thumbnail:{path:`${root}/thumbnail.webp`}},pending:{kind:'original',status:'ready',version}},{merge:true});
    }
    await ready('v1');
    await service.savePhoto(id,{...fields('First save',['featured','arizona']),revision:1},{publish:true});
    let photo=(await db.collection('photos').doc(id).get()).data();
    assert.equal(photo.status,'published');assert.equal(photo.title,'First save');assert.equal(photo.revision,2);assert.equal(photo.webImage.version,'v1');
    await ready('v2');
    await service.savePhoto(id,{...fields('Updated title',['arizona']),location:'Yokohama, Japan',revision:2},{publish:true});
    photo=(await db.collection('photos').doc(id).get()).data();
    assert.equal(photo.title,'Updated title');assert.equal(photo.location,'Yokohama, Japan');assert.deepEqual(photo.collectionIds,['arizona']);assert.equal(photo.webImage.version,'v2');
    assert.equal((await bucket.file(photo.webImage.path).exists())[0],true);
    await service.setPhotoStatus(id,{status:'archived',revision:3});
    assert.equal((await db.collection('photos').doc(id).get()).data().status,'archived');
    await service.savePhoto(id,{...fields('Restored by saving',['arizona']),revision:4},{publish:true});
    assert.equal((await db.collection('photos').doc(id).get()).data().status,'published');
});
test('failed save-and-publish leaves the existing public metadata untouched',async()=>{
    const {id}=await service.savePhoto('new',fields('Unchanged',['featured']));
    await assert.rejects(()=>service.savePhoto(id,{...fields('Not saved',['featured']),revision:1},{publish:true}),/web image/);
    assert.equal((await db.collection('photos').doc(id).get()).data().title,'Unchanged');
    await db.collection('photos').doc(id).update({status:'published',webImage:{version:'existing',url:'/existing',path:`photography/public/${id}/existing/web.webp`}});
    await assert.rejects(()=>service.savePhoto(id,{...fields('Not saved',[]),revision:1},{publish:true}),/collection/);
    await assert.rejects(()=>service.savePhoto(id,{...fields('Not saved',['featured']),revision:0},{publish:true}),/another tab/);
    await db.collection('photoAssets').doc(id).set({pending:{kind:'original',status:'processing'}},{merge:true});
    await assert.rejects(()=>service.savePhoto(id,{...fields('Not saved',['featured']),revision:1},{publish:true}),/processing/);
    const photo=(await db.collection('photos').doc(id).get()).data();
    assert.equal(photo.title,'Unchanged');assert.equal(photo.status,'published');assert.equal(photo.revision,1);assert.equal(photo.webImage.version,'existing');
});
test('real worker processes uploads once, ignores stale versions, and keeps the original private',async()=>{
    const {processPhotographyUpload}=await import('../functions/index.js');
    const {id}=await service.savePhoto('new',fields('Worker',['arizona']));
    const input=await sharp({create:{width:60,height:40,channels:3,background:'green'}}).tiff().toBuffer();
    const upload=await service.beginUpload(id,{name:'scan.tif',kind:'original',size:input.length});
    await bucket.file(upload.path).save(input,{contentType:'image/tiff'});
    const [metadata]=await bucket.file(upload.path).getMetadata();
    const event={data:{bucket:bucket.name,name:upload.path,size:String(input.length),generation:metadata.generation}};
    await processPhotographyUpload.run(event);
    const first=(await db.collection('photoAssets').doc(id).get()).data();
    assert.equal(first.pending.status,'ready');assert.equal(first.original.format,'tiff');assert.equal(first.ready.web.width,60);
    const [original]=await bucket.file(upload.path).download();assert.deepEqual(original,input);
    await processPhotographyUpload.run(event);
    assert.deepEqual((await db.collection('photoAssets').doc(id).get()).data(),first);
    const replacement=await service.beginUpload(id,{name:'new.jpg',kind:'original',size:100});
    await processPhotographyUpload.run(event);
    assert.equal((await db.collection('photoAssets').doc(id).get()).data().pending.version,replacement.version);
});
test('permanent deletion removes every file and record, invalidates collection orders, and is idempotent',async()=>{
    const {id}=await service.savePhoto('new',fields('Delete me',['featured','arizona']));
    const collection=(await db.collection('photoCollections').doc('featured').get()).data();
    const paths=[`photography/private/${id}/original/v1/source.tif`,`photography/private/${id}/original/v2/source.jpg`,`photography/private/${id}/print/v3/source.tif`,`photography/private/${id}/previews/v2/web.webp`,`photography/public/${id}/v1/web.webp`,`photography/public/${id}/v2/thumbnail.webp`];
    for(const path of paths)await bucket.file(path).save(Buffer.from('test file'));
    const neighbor=`photography/private/${id}-other/original/v1/source.tif`;
    await bucket.file(neighbor).save(Buffer.from('preserve'));
    await assert.rejects(()=>service.deletePhoto(id,{revision:0}),/another tab/);
    assert.equal((await bucket.file(paths[0]).exists())[0],true);
    await service.deletePhoto(id,{revision:1});
    assert.equal((await db.collection('photos').doc(id).get()).exists,false);
    assert.equal((await db.collection('photoAssets').doc(id).get()).exists,false);
    for(const path of paths)assert.equal((await bucket.file(path).exists())[0],false);
    assert.equal((await bucket.file(neighbor).exists())[0],true);
    assert.equal((await db.collection('photoCollections').doc('featured').get()).data().revision,collection.revision+1);
    await service.deletePhoto(id,{revision:1});
});
test('a failed cleanup locks the photo and can be safely retried without reviving it',async()=>{
    const {id}=await service.savePhoto('new',fields('Retry delete',['arizona']));
    const originalDelete=bucket.deleteFiles;
    bucket.deleteFiles=async()=>{throw new Error('Storage unavailable');};
    try { await assert.rejects(()=>service.deletePhoto(id,{revision:1}),/Storage unavailable/); }
    finally { bucket.deleteFiles=originalDelete; }
    const photo=(await db.collection('photos').doc(id).get()).data();
    assert.equal(photo.status,'deleting');assert.deepEqual(photo.collectionIds,[]);
    await assert.rejects(()=>service.savePhoto(id,{...photo,title:'Revived'}),/being deleted/);
    await assert.rejects(()=>service.beginUpload(id,{name:'again.jpg',size:10,kind:'original'}),/being deleted/);
    await assert.rejects(()=>service.retryUpload(id),/being deleted/);
    await assert.rejects(()=>service.setPhotoStatus(id,{status:'draft',revision:photo.revision}),/being deleted/);
    await service.deletePhoto(id,{revision:1});
    assert.equal((await db.collection('photos').doc(id).get()).exists,false);
    assert.equal((await db.collection('photoAssets').doc(id).get()).exists,false);
});
test('uploads and previews arriving after deletion are removed without recreating records',async()=>{
    const {processPhotographyUpload}=await import('../functions/index.js');
    const {id}=await service.savePhoto('new',fields('Late files',[]));
    await service.deletePhoto(id,{revision:1});
    for(const suffix of ['original/late/source.jpg','previews/late/web.webp']){
        const path=`photography/private/${id}/${suffix}`;
        await bucket.file(path).save(Buffer.from('late bytes'));
        const [metadata]=await bucket.file(path).getMetadata();
        await processPhotographyUpload.run({data:{bucket:bucket.name,name:path,size:metadata.size,generation:metadata.generation}});
        assert.equal((await bucket.file(path).exists())[0],false);
    }
    assert.equal((await db.collection('photoAssets').doc(id).get()).exists,false);
});
test('deleting during image processing cannot leave previews or resurrect asset records',async()=>{
    const {processPhotographyUpload}=await import('../functions/index.js');
    const {id}=await service.savePhoto('new',fields('In flight',[]));
    const input=await sharp({create:{width:20,height:10,channels:3,background:'blue'}}).jpeg().toBuffer();
    const upload=await service.beginUpload(id,{name:'photo.jpg',size:input.length,kind:'original'});
    await bucket.file(upload.path).save(input);
    const [metadata]=await bucket.file(upload.path).getMetadata();
    const workerStorage=createRequire(new URL('../functions/index.js',import.meta.url))('firebase-admin/storage').getStorage();
    const prototype=Object.getPrototypeOf(workerStorage.bucket(bucket.name)), originalUpload=prototype.upload;
    let deleted=false;
    prototype.upload=async function(path,options){
        const result=await originalUpload.call(this,path,options);
        if(!deleted&&options.destination.startsWith(`photography/private/${id}/previews/`)){
            deleted=true;await service.deletePhoto(id,{revision:1});
        }
        return result;
    };
    try { await processPhotographyUpload.run({data:{bucket:bucket.name,name:upload.path,size:String(input.length),generation:metadata.generation}}); }
    finally { prototype.upload=originalUpload; }
    assert.equal(deleted,true);
    assert.equal((await bucket.getFiles({prefix:`photography/private/${id}/`}))[0].length,0);
    assert.equal((await db.collection('photos').doc(id).get()).exists,false);
    assert.equal((await db.collection('photoAssets').doc(id).get()).exists,false);
});
