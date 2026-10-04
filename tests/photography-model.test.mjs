import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isOwner,OWNER_EMAIL,OWNER_UID,photoFields,uploadFile,requireRevision,validateOrder,resolvePrintMaster,publicPhoto,validId,MAX_UPLOAD_BYTES} from '../lib/photography/model.mjs';

test('only the verified pinned account is the owner, never another partner admin',()=>{
    assert.equal(isOwner({uid:OWNER_UID,email:OWNER_EMAIL,emailVerified:true}),true);
    for(const user of [null,{uid:'other',email:OWNER_EMAIL,emailVerified:true},{uid:OWNER_UID,email:'other@example.com',emailVerified:true},{uid:OWNER_UID,email:OWNER_EMAIL,emailVerified:false},{uid:'admin',tenant:0}])assert.equal(isOwner(user),false);
});
test('photo input ignores server-controlled fields and deduplicates memberships',()=>{
    const result=photoFields({title:' Photo ',collectionIds:['featured','arizona','featured'],status:'published',webImage:{url:'secret'},revision:999});
    assert.equal(result.title,'Photo');assert.deepEqual(result.collectionIds,['featured','arizona']);assert.equal(result.status,undefined);assert.equal(result.webImage,undefined);
    assert.throws(()=>photoFields({title:'',collectionIds:[]}));assert.throws(()=>validId('../secret'));assert.throws(()=>photoFields({title:'Photo',collectionIds:['x.y']}));
});
test('accepts TIFF/JPEG with hard size and extension boundaries',()=>{
    for(const name of ['test.TIFF','scan.tif','photo.jpeg','photo.JPG'])assert.ok(uploadFile({name,size:1000,kind:'original'}).contentType.startsWith('image/'));
    for(const data of [{name:'a.png',size:100},{name:'a.jpg',size:0},{name:'a.tif',size:MAX_UPLOAD_BYTES+1},{name:'a.jpg',size:2,kind:'public'}])assert.throws(()=>uploadFile({kind:'original',...data}));
});
test('stale revisions, missing photos, and duplicate ordering entries cannot overwrite a list',()=>{
    requireRevision({revision:2},2);assert.throws(()=>requireRevision({revision:2},1),/another tab/);
    assert.deepEqual(validateOrder(['b','a'],['a','b']),['b','a']);
    for(const ids of [['a'],['a','a'],['a','c']])assert.throws(()=>validateOrder(ids,['a','b']));
});
test('public serialization excludes originals, internal fields, and private asset paths',()=>{
    const result=publicPhoto('id',{title:'Photo',original:'private/file.tif',webImage:{url:'/web',thumbnailUrl:'/thumb',width:10,height:20,path:'internal'},revision:4});
    assert.equal(result.original,undefined);assert.equal(result.revision,undefined);assert.equal(result.webImage.path,undefined);assert.equal(result.width,10);
});
test('optional alt text falls back to the current title and preserves custom descriptions',()=>{
    for (const altText of [undefined, '', '   ']) {
        const photo = photoFields({ title: 'Temple', altText, collectionIds: ['featured'] });
        assert.equal(photo.altText, '');
        assert.equal(publicPhoto('id', photo).altText, 'Temple is a photograph created by Nash Browns');
        assert.equal(publicPhoto('id', { ...photo, title: 'Kyoto' }).altText, 'Kyoto is a photograph created by Nash Browns');
    }
    assert.equal(publicPhoto('id', { title: 'Temple', altText: 'A red temple beneath cherry blossoms' }).altText, 'A red temple beneath cherry blossoms');
});
test('print fulfillment uses the untouched original unless a separate print file overrides it',()=>{
    const original={path:'private/original/v1/source.tif',width:8000,height:6000};
    const replacement={...original,path:'private/original/v2/source.tif'};
    const printMaster={...original,path:'private/print/v3/source.tif'};
    assert.equal(resolvePrintMaster({original}),original);
    assert.equal(resolvePrintMaster({original:replacement}),replacement);
    assert.equal(resolvePrintMaster({original:replacement,printMaster}),printMaster);
    assert.equal(resolvePrintMaster({ready:{web:{path:'web.webp'}}}),null);
    assert.equal(resolvePrintMaster(undefined),null);
});
import { photoBackLink } from '../lib/photography/navigation.mjs';

test('photo back links preserve the originating collection and safely handle direct visits', () => {
    const photo = { collectionIds: ['featured', 'japan', 'archived'] };
    const collections = [{ id: 'featured', title: 'Featured' }, { id: 'japan', title: 'Japan' }, { id: 'arizona', title: 'Arizona' }, { id: 'archived', title: 'Archived', archived: true }];
    assert.deepEqual(photoBackLink(photo, collections, 'featured'), { href: '/photography?collection=featured', label: 'Back to Featured' });
    assert.deepEqual(photoBackLink(photo, collections, 'japan'), { href: '/photography?collection=japan', label: 'Back to Japan' });
    for (const requested of [undefined, 'archived', 'arizona', 'https://example.com', ['japan']]) {
        assert.equal(photoBackLink(photo, collections, requested).href, '/photography?collection=japan');
    }
    assert.equal(photoBackLink({ collectionIds: ['featured'] }, collections).href, '/photography?collection=featured');
    assert.equal(photoBackLink(photo, []).href, '/photography');
});
