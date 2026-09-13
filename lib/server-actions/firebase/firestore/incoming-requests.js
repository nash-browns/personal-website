'use server'

import { addIncomingRequest as aIR } from "@/lib/firebase/firestore"
import { randomUUID } from 'node:crypto';

//CREATE DATA
export async function addIncomingRequest(requestData) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    try {
        const { email, first_name, last_name, message, phone, type, site } = requestData;

        await aIR({
            email,
            first_name,
            last_name,
            message,
            phone,
            type: type || "work_with_us",
            site: site || "nash_browns"
        });

        console.info(JSON.stringify({ event: 'contact_submission', requestId, outcome: 'success', durationMs: Date.now() - startedAt }));
        return { success: true };
    } catch {
        // Provider errors can contain submitted values; never log the error object.
        console.error(JSON.stringify({ event: 'contact_submission', requestId, outcome: 'failure', durationMs: Date.now() - startedAt }));
        // Next.js may log a thrown error too, so only propagate a safe message.
        throw new Error('Unable to submit your message. Please try again.');
    }
}
