'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MAX_UPLOAD_BYTES, photoAltText, uploadFile } from '@/lib/photography/model.mjs';
import { uploadNewPhoto } from './create-photo-upload.mjs';
import { SortableOrderList } from './sortable-order-list';
import styles from './admin.module.css';

async function api(path, body) {
    const response = await fetch(
        `/api/photography/admin/${path}`,
        body === undefined
            ? { cache: 'no-store' }
            : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
}
function Preview({ photo, asset, large = false, compact = false, frameRef }) {
    const source = asset?.ready
        ? `/api/photography/admin/preview/${photo.id}?v=${asset.ready.version}${compact ? '&size=thumbnail' : ''}`
        : compact
          ? photo.webImage?.thumbnailUrl || photo.webImage?.url
          : photo.webImage?.url;
    return (
        <div ref={frameRef} className={`${styles.thumbnail} ${compact ? styles.compactPreview : ''}`}>
            {source ? (
                <Image
                    src={source}
                    alt={compact ? '' : photoAltText(photo)}
                    fill
                    unoptimized
                    draggable={false}
                    sizes={compact ? '96px' : large ? '50vw' : '300px'}
                    className="object-contain"
                />
            ) : (
                <span>{asset?.pending ? 'Preparing preview…' : 'No image yet'}</span>
            )}
        </div>
    );
}
async function prepareStorageUpload() {
    const [{ app, auth }, { getStorage, ref, uploadBytesResumable }] = await Promise.all([
        import('@/firebase'),
        import('firebase/storage'),
    ]);
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Sign in again before uploading.');
    return (ticket, file) =>
        uploadBytesResumable(ref(getStorage(app, `gs://${ticket.bucket}`), ticket.path), file, {
            contentType: ticket.contentType,
        });
}
export function PhotographyAdmin({ path, initialData }) {
    const [data, setData] = useState(initialData),
        [message, setMessage] = useState(''),
        [error, setError] = useState(''),
        [busy, setBusy] = useState(false),
        [dirty, setDirty] = useState(false);
    const router = useRouter();
    const [handoff, setHandoff] = useState(null);
    const finishReveal = useCallback(() => {
        if (handoff) router.replace(`/admin/photos/${handoff.id}`, { scroll: false });
    }, [handoff, router]);
    const refresh = useCallback(async () => {
        const result = await api('library');
        setData(result);
        return result;
    }, []);
    const refreshAsset = useCallback(async id => {
        const asset = await api(`assets/${id}`);
        setData(current => ({
            ...current,
            assets: current.assets.some(item => item.id === id)
                ? current.assets.map(item => (item.id === id ? asset : item))
                : [...current.assets, asset],
        }));
        return asset;
    }, []);
    useEffect(() => {
        if (!dirty) return;
        const unload = event => {
            event.preventDefault();
            event.returnValue = '';
        };
        const navigate = event => {
            const link = event.target.closest('a[href]');
            if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey) return;
            if (window.confirm('Leave without saving your changes?')) setDirty(false);
            else {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener('beforeunload', unload);
        document.addEventListener('click', navigate, true);
        return () => {
            window.removeEventListener('beforeunload', unload);
            document.removeEventListener('click', navigate, true);
        };
    }, [dirty]);
    async function run(action, success = 'Saved.') {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await action();
            await refresh();
            setDirty(false);
            setMessage(success);
            return result;
        } catch (error) {
            setError(error.message);
            return null;
        } finally {
            setBusy(false);
        }
    }
    const shared = { data, busy, run, refresh, refreshAsset, setDirty };
    const section = path[0],
        id = path[1];
    if (handoff && id !== 'new') setHandoff(null);
    return (
        <main className={styles.admin}>
            <header>
                <Link href="/admin" className="text-lg">
                    Photography admin
                </Link>
                <nav aria-label="Admin navigation">
                    <Link href="/admin" aria-current={!section ? 'page' : undefined}>
                        Photos
                    </Link>
                    <Link href="/admin/collections" aria-current={section === 'collections' ? 'page' : undefined}>
                        Collections
                    </Link>
                    <Link href="/photography" target="_blank" rel="noreferrer">
                        View website ↗
                    </Link>
                    <button
                        onClick={async () => {
                            if (dirty && !confirm('Sign out without saving?')) return;
                            const { signOutSession } = await import('@/lib/firebase/client-session');
                            await signOutSession();
                            router.refresh();
                        }}
                    >
                        Sign out
                    </button>
                </nav>
            </header>
            {error && (
                <p role="alert" className={`${styles.notice} ${styles.error}`}>
                    {error}{' '}
                    <button
                        onClick={() => {
                            if (!dirty || confirm('Discard changes and reload?')) window.location.reload();
                        }}
                    >
                        Reload
                    </button>
                </p>
            )}
            {message && (
                <p role="status" className={styles.notice}>
                    {message}
                </p>
            )}
            {section === 'photos' ? (
                id === 'new' && !handoff ? (
                    <NewPhoto {...shared} onReady={setHandoff} />
                ) : (
                    <PhotoEditor
                        key={id === 'new' ? handoff.id : id}
                        id={id === 'new' ? handoff.id : id}
                        handoff={id === 'new' ? handoff : null}
                        onRevealComplete={finishReveal}
                        {...shared}
                    />
                )
            ) : section === 'collections' && id ? (
                <CollectionEditor key={id} id={id} {...shared} />
            ) : section === 'collections' ? (
                <Collections {...shared} />
            ) : (
                <Library {...shared} />
            )}
        </main>
    );
}
function Library({ data }) {
    const [search, setSearch] = useState(''),
        [status, setStatus] = useState('all'),
        [collection, setCollection] = useState('all');
    const photos = data.photos
        .filter(
            photo =>
                photo.title.toLowerCase().includes(search.toLowerCase()) &&
                (status === 'all' || photo.status === status) &&
                (collection === 'all' || photo.collectionIds.includes(collection)),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (
        <>
            <div className={styles.toolbar}>
                <h1 className="grow">Photographs</h1>
                <Link className={styles.button} href="/admin/photos/new">
                    Add Photograph +
                </Link>
            </div>
            <div className={styles.toolbar}>
                <input
                    aria-label="Search photographs"
                    placeholder="Search titles…"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
                <select
                    aria-label="Publication status"
                    value={status}
                    onChange={event => setStatus(event.target.value)}
                >
                    {['all', 'draft', 'published', 'archived'].map(value => (
                        <option key={value} value={value}>
                            {value === 'all' ? 'All statuses' : value}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Collection"
                    value={collection}
                    onChange={event => setCollection(event.target.value)}
                >
                    <option value="all">All collections</option>
                    {data.collections.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.title}
                        </option>
                    ))}
                </select>
            </div>
            <p className={`${styles.muted} mb-6`}>{photos.length} photographs</p>
            <div className={styles.grid}>
                {photos.map(photo => (
                    <Link key={photo.id} href={`/admin/photos/${photo.id}`} className={styles.card}>
                        <Preview photo={photo} asset={data.assets.find(item => item.id === photo.id)} />
                        <div className={styles.cardText}>
                            <p>{photo.title}</p>
                            <p className={styles.muted}>
                                {photo.status} ·{' '}
                                {photo.collectionIds
                                    .map(id => data.collections.find(item => item.id === id)?.title)
                                    .filter(Boolean)
                                    .join(', ') || 'No collection'}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
            {!photos.length && (
                <div className={styles.panel}>
                    <h2>Your photo library starts here.</h2>
                    <p className={styles.muted}>Add a photograph, upload its original, and choose where it belongs.</p>
                </div>
            )}
        </>
    );
}
function NewPhoto({ refresh, refreshAsset, setDirty, onReady }) {
    const [uploading, setUploading] = useState(false),
        [progress, setProgress] = useState(0),
        [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const draft = useRef({ id: null }),
        operation = useRef(null),
        mounted = useRef(true),
        frame = useRef(null);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            operation.current?.abort();
        };
    }, []);

    async function addPhoto(file) {
        if (!file || operation.current) return;
        try {
            uploadFile({ name: file.name, size: file.size, kind: 'original' });
        } catch (error) {
            setError(error.message);
            return;
        }
        const controller = new AbortController();
        operation.current = controller;
        setUploading(true);
        setDirty(true);
        setProgress(0);
        setError('');
        setPreview(null);
        try {
            const id = await uploadNewPhoto({
                file,
                draft: draft.current,
                signal: controller.signal,
                request: api,
                prepareUpload: prepareStorageUpload,
                onProgress: value => {
                    if (mounted.current) setProgress(value);
                },
            });
            let asset = (await refresh()).assets.find(item => item.id === id);
            // TIFFs cannot be displayed by browsers; wait briefly for the web preview.
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
                controller.signal.throwIfAborted();
                if (asset?.ready || ['error', 'cancelled'].includes(asset?.pending?.status)) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
                controller.signal.throwIfAborted();
                asset = await refreshAsset(id);
            }
            if (asset?.ready) {
                const source = `/api/photography/admin/preview/${id}?v=${asset.ready.version}`;
                const image = new window.Image();
                image.src = source;
                await image.decode().catch(() => {});
                controller.signal.throwIfAborted();
                setPreview(source);
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }
            controller.signal.throwIfAborted();
            setDirty(false);
            const { left, top, width, height } = frame.current.getBoundingClientRect();
            onReady({ id, from: { left, top, width, height } });
        } catch (error) {
            if (mounted.current)
                setError(controller.signal.aborted ? 'Upload cancelled. Choose a photo to try again.' : error.message);
        } finally {
            operation.current = null;
            if (mounted.current) {
                setUploading(false);
                setDirty(false);
            }
        }
    }
    return (
        <>
            <Link href="/admin" className={styles.muted}>
                ← Photo library
            </Link>
            <h1 className="mt-6">Add Photograph</h1>
            <div className={styles.uploadFirst}>
                <div
                    ref={frame}
                    className={styles.dropzone}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        event.preventDefault();
                        if (!uploading) addPhoto(event.dataTransfer.files[0]);
                    }}
                >
                    {preview ? (
                        <Image
                            src={preview}
                            alt="Uploaded photograph"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="900px"
                        />
                    ) : uploading ? (
                        <div className={styles.uploadProgress}>
                            <p role="status">{progress === 100 ? 'Preparing photo…' : `Uploading ${progress}%`}</p>
                            <progress aria-label="Upload progress" value={progress} max="100" />
                            <button onClick={() => operation.current?.abort()}>Cancel upload</button>
                        </div>
                    ) : (
                        <label className={styles.choosePhoto}>
                            <span>Choose Photograph</span>
                            <span className={styles.muted}>or drop a TIFF or JPEG here · up to 250 MB</span>
                            <input
                                aria-label="Upload Photograph"
                                type="file"
                                accept=".tif,.tiff,.jpeg,.jpg"
                                onChange={event => {
                                    addPhoto(event.target.files[0]);
                                    event.target.value = '';
                                }}
                            />
                        </label>
                    )}
                </div>
                {error && (
                    <p role="alert" className={`${styles.notice} ${styles.error}`}>
                        {error}
                    </p>
                )}
            </div>
        </>
    );
}
function PhotoEditor({ id, data, busy, run, refresh, refreshAsset, setDirty, handoff, onRevealComplete }) {
    const router = useRouter();
    const photo = data.photos.find(item => item.id === id);
    const asset = data.assets.find(item => item.id === id);
    const [form, setForm] = useState(() => ({
        title: photo?.title || 'Untitled',
        location: photo?.location || '',
        camera: photo?.camera || '',
        film: photo?.film || '',
        altText: photo?.altText || '',
        collectionIds: photo?.collectionIds || [],
    }));
    const [changed, setChanged] = useState(false),
        [uploading, setUploading] = useState(false),
        [progress, setProgress] = useState(0),
        [uploadError, setUploadError] = useState('');
    const taskRef = useRef(null),
        uploadVersion = useRef(null),
        dragFile = useRef(null);
    const imageFrame = useRef(null);
    useLayoutEffect(() => {
        if (!handoff || !imageFrame.current) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const target = imageFrame.current.getBoundingClientRect(),
            from = handoff.from;
        const animation = imageFrame.current.animate(
            [
                {
                    transform: `translate(${from.left - target.left}px, ${from.top - target.top}px) scale(${from.width / target.width}, ${from.height / target.height})`,
                },
                { transform: 'none' },
            ],
            { duration: reduced ? 0 : 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
        );
        const timer = setTimeout(onRevealComplete, reduced ? 0 : 1100);
        return () => {
            animation.cancel();
            clearTimeout(timer);
        };
    }, [handoff, onRevealComplete]);
    const processingStatus = asset?.pending?.status;
    useEffect(() => {
        if (!['uploading', 'processing'].includes(processingStatus)) return;
        const timer = setInterval(() => refreshAsset(id).catch(() => {}), 4000);
        return () => clearInterval(timer);
    }, [processingStatus, asset?.pending?.version, refreshAsset, id]);
    useEffect(
        () => () => {
            taskRef.current?.cancel();
        },
        [],
    );
    if (!photo) return <p>Photograph not found.</p>;
    async function removePhoto() {
        if (
            !confirm(
                `Permanently delete “${photo.title}”? This removes its information, collection memberships, original, print files, previews, and every stored version. This cannot be undone.`,
            )
        )
            return;
        const result = await run(async () => {
            try {
                return await api(`photos/${id}/delete`, { revision: photo.revision });
            } catch (error) {
                await refresh();
                throw error;
            }
        }, 'Photograph deleted.');
        if (result) router.replace('/admin');
    }
    if (photo.status === 'deleting')
        return (
            <>
                <h1>{photo.title}</h1>
                <p className={styles.muted}>
                    Deletion did not finish. Retry to remove the remaining files and records.
                </p>
                <div className={styles.toolbar}>
                    <button className={styles.danger} disabled={busy} onClick={removePhoto}>
                        {busy ? 'Deleting…' : 'Retry Delete Photograph'}
                    </button>
                </div>
            </>
        );
    function update(name, value) {
        setForm(current => ({ ...current, [name]: value }));
        setChanged(true);
        setDirty(true);
    }
    async function save(event) {
        event.preventDefault();
        const result = await run(
            () => api(`photos/${id}/save`, { ...form, revision: photo.revision }),
            'Saved. The published photo is up to date.',
        );
        if (result) setChanged(false);
    }
    async function upload(file, kind) {
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES || !/\.(tiff?|jpe?g)$/i.test(file.name)) {
            setUploadError('Choose a TIFF or JPEG up to 250 MB.');
            return;
        }
        setUploading(true);
        setDirty(true);
        setProgress(0);
        setUploadError('');
        let upload;
        try {
            const startUpload = await prepareStorageUpload();
            upload = await api(`photos/${id}/upload`, { name: file.name, size: file.size, kind });
            uploadVersion.current = upload.version;
            const task = startUpload(upload, file);
            taskRef.current = task;
            await new Promise((resolve, reject) =>
                task.on(
                    'state_changed',
                    snapshot => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                    reject,
                    resolve,
                ),
            );
            await refresh();
        } catch (error) {
            setUploadError(error.code === 'storage/canceled' ? 'Upload cancelled.' : error.message);
            if (upload) await api(`photos/${id}/cancel`, { version: upload.version }).catch(() => {});
        } finally {
            setUploading(false);
            setDirty(changed);
            taskRef.current = null;
        }
    }
    const pending = asset?.pending;
    return (
        <>
            <Link href="/admin" className={styles.muted}>
                ← Photo library
            </Link>
            <h1 className="mt-6">{photo.title}</h1>
            <div className={`${styles.editor} ${handoff ? styles.revealing : ''}`}>
                <form id="photo-information" onSubmit={save} className={styles.fields}>
                    {['title', 'location', 'camera', 'film'].map(name => (
                        <label key={name}>
                            {name[0].toUpperCase() + name.slice(1)}
                            <input
                                required={name === 'title'}
                                maxLength={200}
                                value={form[name]}
                                onChange={event => update(name, event.target.value)}
                            />
                        </label>
                    ))}
                    <label>
                        Alt text (optional)
                        <textarea
                            maxLength={1000}
                            value={form.altText}
                            placeholder={photoAltText({ title: form.title })}
                            onChange={event => update('altText', event.target.value)}
                        />
                        <span className={styles.muted}>
                            Describes the image for screen readers. Leave blank to use “
                            {photoAltText({ title: form.title })}”.
                        </span>
                    </label>
                    <CollectionSelect
                        collections={data.collections}
                        selected={form.collectionIds}
                        onChange={ids => update('collectionIds', ids)}
                    />
                    {!data.collections.length && <Link href="/admin/collections">Create your collections first →</Link>}
                    <div className={styles.toolbar}>
                        <button
                            disabled={
                                busy ||
                                uploading ||
                                ['uploading', 'processing'].includes(processingStatus) ||
                                !(asset?.ready || photo.webImage)
                            }
                            type="submit"
                        >
                            {busy ? 'Saving…' : 'Save Information'}
                        </button>
                        <button
                            type="button"
                            disabled={busy || uploading || changed || photo.status === 'archived'}
                            onClick={() => {
                                if (
                                    confirm(
                                        'Archive this photo? It will be unpublished, but its information and files will be kept.',
                                    )
                                )
                                    run(
                                        () =>
                                            api(`photos/${id}/status`, {
                                                status: 'archived',
                                                revision: photo.revision,
                                            }),
                                        'Archived and unpublished.',
                                    );
                            }}
                        >
                            Archive
                        </button>
                        <button
                            type="button"
                            className={styles.danger}
                            disabled={busy || uploading}
                            onClick={removePhoto}
                        >
                            Delete
                        </button>
                        {photo.status === 'published' ? (
                            <Link href={`/photography/view-photo/${photo.id}`} target="_blank" rel="noreferrer">
                                View Published Photo <span aria-hidden="true">↗</span>
                            </Link>
                        ) : (
                            <span className={styles.muted} role="link" aria-disabled="true">
                                View Published Photo <span aria-hidden="true">↗</span>
                            </span>
                        )}
                        {changed && <span className={styles.muted}>Unsaved changes</span>}
                    </div>
                </form>
                <div className={styles.photoColumn}>
                    <div className={styles.panel}>
                        <Preview photo={photo} asset={asset} large frameRef={imageFrame} />
                        <div className={styles.photoTools}>
                            <p className={`${styles.muted} mt-4`}>
                                {photo?.status}
                                {asset?.original
                                    ? ` · ${asset.original.width} × ${asset.original.height} original`
                                    : ''}
                            </p>
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm">Replace photo</summary>
                                <label className="mt-3">
                                    Choose replacement (TIFF or JPEG)
                                    <input
                                        ref={dragFile}
                                        type="file"
                                        accept=".tif,.tiff,.jpeg,.jpg"
                                        disabled={busy || uploading}
                                        onChange={event => {
                                            upload(event.target.files[0], 'original');
                                            event.target.value = '';
                                        }}
                                    />
                                </label>
                            </details>
                            {uploading && (
                                <>
                                    <progress aria-label="Upload progress" value={progress} max="100" />
                                    <p role="status">Uploading {progress}%</p>
                                    <button onClick={() => taskRef.current?.cancel()}>Cancel upload</button>
                                </>
                            )}
                            {pending && pending.status !== 'ready' && (
                                <p role="status" className={styles.notice}>
                                    {pending.status === 'processing'
                                        ? pending.kind === 'print'
                                            ? 'Preparing print master…'
                                            : 'Preparing optimized web images…'
                                        : pending.status === 'error'
                                          ? pending.error
                                          : pending.status === 'cancelled'
                                            ? 'Upload cancelled.'
                                            : `Waiting for upload processing…`}
                                </p>
                            )}
                            {uploadError && (
                                <p role="alert" className={styles.error}>
                                    {uploadError}
                                </p>
                            )}
                            {pending && ['error', 'uploading', 'processing'].includes(pending.status) && !uploading && (
                                <button
                                    disabled={busy}
                                    onClick={() => run(() => api(`photos/${id}/retry`, {}), 'Processing restarted.')}
                                >
                                    Retry processing
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
function CollectionSelect({ collections, selected, onChange }) {
    const available = collections.filter(item => !item.archived && !selected.includes(item.id));
    return (
        <div>
            <label>
                Collections
                <select
                    value=""
                    disabled={!available.length}
                    onChange={event => onChange([...selected, event.target.value])}
                >
                    <option value="" disabled>
                        {available.length ? 'Select collections…' : 'All collections selected'}
                    </option>
                    {available.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.title}
                        </option>
                    ))}
                </select>
            </label>
            {!!selected.length && (
                <div className={styles.selectedCollections}>
                    {selected.map(id => {
                        const item = collections.find(collection => collection.id === id);
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-label={`Remove ${item?.title || id} from collections`}
                                onClick={() => onChange(selected.filter(value => value !== id))}
                            >
                                {item?.title || id}
                                {item?.archived ? ' (archived)' : ''}
                                <span aria-hidden="true">×</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
function Collections({ data, busy, run, setDirty }) {
    const [title, setTitle] = useState(''),
        [order, setOrder] = useState(null),
        [revisions, setRevisions] = useState(null);
    const ids = order || data.collections.map(item => item.id);
    function reorder(ids) {
        if (!order) setRevisions(Object.fromEntries(data.collections.map(item => [item.id, item.revision])));
        setOrder(ids);
        setDirty(true);
    }
    return (
        <>
            <h1>Collections</h1>
            <p className={styles.muted}>
                Drag the handles to arrange collections, then save the order. Featured remains the default gallery.
            </p>
            {!data.collections.length && (
                <button
                    onClick={() => run(() => api('initialize', {}), 'Starter collections created.')}
                    disabled={busy}
                >
                    Create Featured, Arizona, and Kansas City
                </button>
            )}
            <form
                className={styles.toolbar}
                onSubmit={async event => {
                    event.preventDefault();
                    if (await run(() => api('collections/new', { title }), 'Collection added.')) setTitle('');
                }}
            >
                <input
                    aria-label="New collection name"
                    placeholder="New collection name"
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    maxLength={80}
                    required
                />
                <button disabled={busy || !!order}>Add collection</button>
            </form>
            <SortableOrderList
                disabled={busy}
                items={data.collections}
                ids={ids}
                setIds={reorder}
                label="Collection order"
            >
                {item => (
                    <Link href={`/admin/collections/${item.id}`}>
                        {item.title}
                        {item.archived ? ' · archived' : ''}
                    </Link>
                )}
            </SortableOrderList>
            {order && (
                <div className={styles.toolbar}>
                    <button
                        disabled={busy}
                        onClick={async () => {
                            if (
                                await run(
                                    () => api('collections/order', { ids: order, revisions }),
                                    'Collection order saved.',
                                )
                            )
                                setOrder(null);
                        }}
                    >
                        Save collection order
                    </button>
                    <button
                        onClick={() => {
                            setOrder(null);
                            setDirty(false);
                        }}
                    >
                        Discard order changes
                    </button>
                </div>
            )}
        </>
    );
}
function CollectionEditor({ id, data, busy, run, setDirty }) {
    const router = useRouter();
    const collection = data.collections.find(item => item.id === id);
    const [title, setTitle] = useState(collection?.title || ''),
        [order, setOrder] = useState(null),
        [revision, setRevision] = useState(null),
        [adding, setAdding] = useState('');
    if (!collection) return <p>Collection not found.</p>;
    const photos = data.photos
        .filter(photo => photo.collectionIds.includes(id))
        .sort((a, b) => (a.collectionOrder[id] ?? 0) - (b.collectionOrder[id] ?? 0) || a.id.localeCompare(b.id));
    const ids = order || photos.map(photo => photo.id);
    function reorder(ids) {
        if (!order) setRevision(collection.revision);
        setOrder(ids);
        setDirty(true);
    }
    return (
        <>
            <Link href="/admin/collections" className={styles.muted}>
                ← Collections
            </Link>
            <h1 className="mt-6">{collection.title}</h1>
            <form
                className={styles.toolbar}
                onSubmit={event => {
                    event.preventDefault();
                    run(() =>
                        api(`collections/${id}`, {
                            title,
                            revision: collection.revision,
                            archived: collection.archived,
                        }),
                    );
                }}
            >
                <input
                    aria-label="Collection name"
                    required
                    maxLength={80}
                    value={title}
                    onChange={event => {
                        setTitle(event.target.value);
                        setDirty(true);
                    }}
                />
                <button disabled={busy || !!order}>Save name</button>
                {id !== 'featured' && (
                    <button
                        type="button"
                        disabled={busy || !!order}
                        onClick={() => {
                            if (
                                confirm(
                                    collection.archived
                                        ? 'Restore this collection?'
                                        : 'Archive this collection? Its photos will be kept.',
                                )
                            )
                                run(() =>
                                    api(`collections/${id}`, {
                                        title,
                                        revision: collection.revision,
                                        archived: !collection.archived,
                                    }),
                                );
                        }}
                    >
                        {collection.archived ? 'Restore collection' : 'Archive collection'}
                    </button>
                )}
                {id !== 'featured' && (
                    <button
                        type="button"
                        className={styles.danger}
                        disabled={busy || !!order || photos.length > 0}
                        title={photos.length ? 'Remove all photos from this collection before deleting it.' : undefined}
                        onClick={async () => {
                            if (!confirm(`Permanently delete “${collection.title}”? This empty collection will be removed.`)) return;
                            const result = await run(
                                () => api(`collections/${id}/delete`, { revision: collection.revision }),
                                'Collection deleted.',
                            );
                            if (result) router.replace('/admin/collections');
                        }}
                    >
                        Delete Collection
                    </button>
                )}
                {!collection.archived && (
                    <Link
                        href={`/photography?collection=${encodeURIComponent(id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.button}
                    >
                        View Collection <span aria-hidden="true">↗</span>
                    </Link>
                )}
            </form>
            {id !== 'featured' && photos.length > 0 && (
                <p className={styles.muted}>Remove all photos from this collection to delete it, including draft and archived photos.</p>
            )}
            <p className={styles.muted}>
                Order here affects only {collection.title}. Draft and archived photos are included for planning but are
                hidden publicly.
            </p>
            {!collection.archived && (
                <form
                    className={styles.toolbar}
                    onSubmit={async event => {
                        event.preventDefault();
                        const photo = data.photos.find(item => item.id === adding);
                        if (
                            photo &&
                            (await run(
                                () =>
                                    api(`photos/${photo.id}`, {
                                        ...photo,
                                        collectionIds: [...photo.collectionIds, id],
                                    }),
                                'Photo added.',
                            ))
                        )
                            setAdding('');
                    }}
                >
                    <select
                        aria-label="Add existing photograph"
                        value={adding}
                        onChange={event => setAdding(event.target.value)}
                        required
                    >
                        <option value="">Choose a photograph…</option>
                        {data.photos
                            .filter(photo => !photo.collectionIds.includes(id))
                            .map(photo => (
                                <option key={photo.id} value={photo.id}>
                                    {photo.title}
                                </option>
                            ))}
                    </select>
                    <button disabled={busy || !!order || !adding}>Add to collection</button>
                </form>
            )}
            <p className={`${styles.muted} mb-4`}>Drag the handles to arrange photos, then save the order.</p>
            <SortableOrderList
                items={photos}
                ids={ids}
                setIds={reorder}
                disabled={busy}
                label={`${collection.title} photo order`}
            >
                {photo => (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href={`/admin/photos/${photo.id}`} className={styles.collectionPhoto}>
                            <Preview photo={photo} asset={data.assets.find(asset => asset.id === photo.id)} compact />
                            <span>
                                {photo.title} <span className={styles.muted}>· {photo.status}</span>
                            </span>
                        </Link>
                        <button
                            disabled={busy || !!order}
                            onClick={() => {
                                if (
                                    confirm('Remove this membership? The photo and its other collections will be kept.')
                                )
                                    run(
                                        () =>
                                            api(`photos/${photo.id}`, {
                                                ...photo,
                                                collectionIds: photo.collectionIds.filter(value => value !== id),
                                            }),
                                        'Removed from collection.',
                                    );
                            }}
                        >
                            Remove
                        </button>
                    </div>
                )}
            </SortableOrderList>
            {!photos.length && <p className={styles.notice}>No photos in this collection yet.</p>}
            {order && (
                <div className={styles.toolbar}>
                    <button
                        disabled={busy}
                        onClick={async () => {
                            if (
                                await run(
                                    () => api(`collections/${id}/order`, { ids: order, revision }),
                                    'Photo order saved.',
                                )
                            )
                                setOrder(null);
                        }}
                    >
                        Save photo order
                    </button>
                    <button
                        onClick={() => {
                            setOrder(null);
                            setDirty(false);
                        }}
                    >
                        Discard order changes
                    </button>
                </div>
            )}
        </>
    );
}
