import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
    collection, deleteDoc, doc, getDoc, getDocs, query, setDoc,
    setLogLevel, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-nashbrowns-security';
let environment;
setLogLevel('silent');

const contact = () => ({
    email: 'visitor@example.test',
    first_name: 'Test',
    last_name: 'Visitor',
    message: 'We would like to work with you.',
    phone: '',
    type: 'work_with_us',
    site: 'nash_browns',
    created_at: Timestamp.now(),
});

function signedIn(name) {
    return environment.authenticatedContext(name, { email: `${name}@example.test`, email_verified: true }).firestore();
}

before(async () => {
    // Refuse to run against a live database, even if local Firebase credentials exist.
    assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080', 'Run this suite with npm run test:security:rules');
    environment = await initializeTestEnvironment({
        projectId,
        firestore: {
            host: '127.0.0.1',
            port: 8080,
            rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
        },
    });
});

after(async () => { await environment?.cleanup(); });

beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
        const database = context.firestore();
        const batch = writeBatch(database);
        const fixtures = {
            'users/admin@example.test': { tenant: 0 },
            'users/string-admin@example.test': { tenant: '0' },
            'users/member@example.test': { tenant: 1 },
            'users/colleague@example.test': { tenant: 1 },
            'users/outsider@example.test': { tenant: 2 },
            'users/pending@example.test': { tenant: null },
            'users/other-pending@example.test': { tenant: null },
            'users/no-tenant@example.test': { first_name: 'Unassigned' },
            'users/invalid-tenant@example.test': { tenant: false },
            'users/string-member@example.test': { tenant: '3' },
            'tenants/0': { display_name: 'Admin' },
            'tenants/1': { display_name: 'First tenant' },
            'tenants/2': { display_name: 'Second tenant' },
            'tenants/3': { display_name: 'String tenant' },
            'content/first': { tenant: [1], views: 1 },
            'content/second': { tenant: [2], views: 2 },
            'content/shared': { tenant: [1, 2], views: 3 },
            'content/string': { tenant: ['3'], views: 4 },
            'content/unassigned': { tenant: [null], views: 0 },
            'email_queue/existing': { to: ['visitor@example.test'] },
            'incoming_request/existing': contact(),
        };
        for (const [path, data] of Object.entries(fixtures)) batch.set(doc(database, path), data);
        await batch.commit();
    });
});

test('anonymous visitors cannot read or write protected collections', async () => {
    const database = environment.unauthenticatedContext().firestore();
    for (const path of ['users/member@example.test', 'tenants/1', 'content/first', 'email_queue/existing']) {
        await assertFails(getDoc(doc(database, path)));
        await assertFails(setDoc(doc(database, path), { tenant: 0 }));
        await assertFails(deleteDoc(doc(database, path)));
    }
});

test('members can read their own profile, colleagues, tenant, and assigned content', async () => {
    const database = signedIn('member');
    for (const path of ['users/member@example.test', 'users/colleague@example.test', 'tenants/1', 'content/first', 'content/shared']) {
        await assertSucceeds(getDoc(doc(database, path)));
    }
    const users = await assertSucceeds(getDocs(query(collection(database, 'users'), where('tenant', '==', 1))));
    assert.equal(users.size, 2);
    const content = await assertSucceeds(getDocs(query(collection(database, 'content'), where('tenant', 'array-contains', 1))));
    assert.equal(content.size, 2);
});

test('members cannot read another tenant or run unrestricted collection queries', async () => {
    const database = signedIn('member');
    for (const path of ['users/admin@example.test', 'users/outsider@example.test', 'tenants/0', 'tenants/2', 'content/second', 'email_queue/existing']) {
        await assertFails(getDoc(doc(database, path)));
    }
    for (const name of ['users', 'tenants', 'content', 'email_queue']) {
        await assertFails(getDocs(collection(database, name)));
    }
    await assertFails(getDocs(query(collection(database, 'users'), where('tenant', '==', 2))));
    await assertFails(getDocs(query(collection(database, 'content'), where('tenant', 'array-contains', 2))));
});

test('string tenant IDs retain access to their own tenant and content', async () => {
    const database = signedIn('string-member');
    await assertSucceeds(getDoc(doc(database, 'tenants/3')));
    await assertSucceeds(getDoc(doc(database, 'content/string')));
    await assertFails(getDoc(doc(database, 'tenants/1')));
});

test('unassigned users can read their own profile but cannot share an unassigned tenant', async () => {
    for (const name of ['pending', 'no-tenant', 'invalid-tenant']) {
        const database = signedIn(name);
        await assertSucceeds(getDoc(doc(database, `users/${name}@example.test`)));
        await assertFails(getDoc(doc(database, 'users/other-pending@example.test')));
        await assertFails(getDoc(doc(database, 'tenants/0')));
        await assertFails(getDoc(doc(database, 'content/unassigned')));
        await assertFails(getDocs(query(collection(database, 'users'), where('tenant', '==', null))));
    }
});

test('new users and identities without email cannot obtain tenant access', async () => {
    for (const database of [signedIn('new-user'), environment.authenticatedContext('no-email').firestore()]) {
        await assertFails(getDoc(doc(database, 'tenants/0')));
        await assertFails(getDocs(collection(database, 'users')));
        await assertFails(setDoc(doc(database, 'users/new-user@example.test'), { tenant: 0 }));
    }
});

test('members cannot change their membership, other users, content, tenants, or the email queue', async () => {
    const database = signedIn('member');
    for (const path of ['users/member@example.test', 'users/colleague@example.test', 'tenants/1', 'content/first', 'email_queue/existing']) {
        await assertFails(setDoc(doc(database, path), { tenant: 0 }));
        await assertFails(updateDoc(doc(database, path), { tenant: 0 }));
        await assertFails(deleteDoc(doc(database, path)));
    }
    await assertFails(setDoc(doc(database, 'users/invited@example.test'), { tenant: 0 }));
    await assertFails(setDoc(doc(database, 'email_queue/spam'), { to: ['victim@example.test'] }));
    await assertFails(updateDoc(doc(database, 'content/first'), { views: 999999 }));
});

test('a batch cannot promote its caller and then use admin permissions', async () => {
    const database = signedIn('member');
    const batch = writeBatch(database);
    batch.update(doc(database, 'users/member@example.test'), { tenant: 0 });
    batch.set(doc(database, 'email_queue/spam'), { to: ['victim@example.test'] });
    await assertFails(batch.commit());
    assert.equal((await getDoc(doc(database, 'users/member@example.test'))).data().tenant, 1);
});

test('numeric and string admins can manage protected collections', async () => {
    for (const name of ['admin', 'string-admin']) {
        const database = signedIn(name);
        for (const collectionName of ['users', 'tenants', 'content', 'email_queue']) {
            await assertSucceeds(getDocs(collection(database, collectionName)));
            const reference = doc(database, collectionName, 'admin-created');
            await assertSucceeds(setDoc(reference, { tenant: 5 }));
            await assertSucceeds(updateDoc(reference, { tenant: 6 }));
            await assertSucceeds(deleteDoc(reference));
        }
    }
});

test('visitors can create valid contact submissions using the current form payload', async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(database, 'incoming_request/new-message'), contact()));
    await assertSucceeds(setDoc(doc(database, 'incoming_request/with-phone'), { ...contact(), phone: '+19025551234', created_at: new Date() }));
});

test('contact messages cannot be read, overwritten, updated, or deleted by clients', async () => {
    for (const database of [environment.unauthenticatedContext().firestore(), signedIn('member'), signedIn('admin')]) {
        const reference = doc(database, 'incoming_request/existing');
        await assertFails(getDoc(reference));
        await assertFails(getDocs(collection(database, 'incoming_request')));
        await assertFails(setDoc(reference, contact()));
        await assertFails(updateDoc(reference, { message: 'Overwritten' }));
        await assertFails(deleteDoc(reference));
    }
});

test('contact requests reject missing fields, unexpected fields, invalid types, and oversized values', async () => {
    const database = environment.unauthenticatedContext().firestore();
    const missing = contact();
    delete missing.email;
    const invalid = [missing, ...[
        { email: 'invalid' }, { email: 'space here@example.test' }, { email: `${'a'.repeat(255)}@example.test` },
        { first_name: '' }, { first_name: 'a'.repeat(101) }, { last_name: 'a'.repeat(101) },
        { message: '' }, { message: 'a'.repeat(10001) }, { message: { arbitrary: true } },
        { phone: 123 }, { phone: '1'.repeat(51) }, { created_at: 'yesterday' },
        { type: 'other' }, { site: 'other' }, { tenant: 0 }, { to: ['victim@example.test'] },
    ].map((overrides) => ({ ...contact(), ...overrides }))];
    for (const [index, data] of invalid.entries()) {
        await assertFails(setDoc(doc(database, 'incoming_request', `invalid-${index}`), data));
    }
});

test('unknown collections and nested documents remain inaccessible, including to admins', async () => {
    for (const database of [environment.unauthenticatedContext().firestore(), signedIn('member'), signedIn('admin')]) {
        for (const path of ['unknown/document', 'users/member@example.test/private/secret']) {
            await assertFails(getDoc(doc(database, path)));
            await assertFails(setDoc(doc(database, path), { value: true }));
        }
    }
});
