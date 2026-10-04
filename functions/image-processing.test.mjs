import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { inspectImage, webDerivative } from './image-processing.mjs';

for (const format of ['jpeg','tiff']) test(`${format} original is preserved while web output is bounded and strips metadata`, async () => {
    const dir=await mkdtemp(join(tmpdir(),'photo-test-'));
    try{
        const input=join(dir,`source.${format}`),output=join(dir,'web.webp');
        await sharp({create:{width:3000,height:2000,channels:3,background:'#b04a21'}}).withMetadata({orientation:6}).toFormat(format).toFile(input);
        const before=await readFile(input);
        assert.equal((await inspectImage(input)).format,format);
        const info=await webDerivative(input,output,1000);
        assert.equal(info.width,667);assert.equal(info.height,1000);
        const metadata=await sharp(output).metadata();
        assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);
        assert.deepEqual(await readFile(input),before);
    }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects misleading extensions and unsupported file contents',async()=>{
    const png=await sharp({create:{width:10,height:10,channels:3,background:'red'}}).png().toBuffer();
    await assert.rejects(()=>inspectImage(png),/JPEG or TIFF/);
    await assert.rejects(()=>inspectImage(Buffer.from('not an image')));
});
