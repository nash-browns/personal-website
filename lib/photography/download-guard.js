import 'server-only';
import { photoDb } from './server';
import { createDownloadGuard } from './download-limits.mjs';

export const reserveDownload = createDownloadGuard({ db: photoDb });
