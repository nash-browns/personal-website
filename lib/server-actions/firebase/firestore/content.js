'use server'

import { addContentDocument as aC } from "@/lib/firebase/firestore"

//CREATE DATA
export async function addContentDocument(contentData) {

    console.log('adding content');

    // const { 
    // 
    // } = contentData;

    await aC(contentData);

}

