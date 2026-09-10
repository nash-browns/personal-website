'use client';

import { auth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { createSessionClient } from './session-client.mjs';

const session = createSessionClient({ getCurrentUser: () => auth.currentUser });
export const syncServerSession = user => session.sync(user);
export const signOutSession = () => session.signOut(() => signOut(auth));
