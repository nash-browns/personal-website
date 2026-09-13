import { db } from "@/firebase";
import { addDoc, collection } from "firebase/firestore";

//ADD DATA
export async function addIncomingRequest({
    email = undefined,
    first_name = undefined,
    last_name = undefined,
    message = undefined,
    phone = undefined,
    type = "work_with_us",
    site = "nash_browns"
}) {
    try {
        if (!email) throw new Error('addIncomingRequest called without email field');
        if (!first_name) throw new Error('addIncomingRequest called without first_name field');
        if (!last_name) throw new Error('addIncomingRequest called without last_name field');
        if (!message) throw new Error('addIncomingRequest called without message field');

        const incomingRequestRef = collection(db, 'incoming_request');

        await addDoc(incomingRequestRef, {
            email,
            first_name,
            last_name,
            message,
            phone: phone || '',
            type,
            site,
            created_at: new Date(),
        });

        return true;
    } catch (err) {
        throw err;
    }
}
