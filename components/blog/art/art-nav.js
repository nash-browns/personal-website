'use client'
import { useRouter } from 'next/navigation'
import Link from "next/link";
import { useState } from 'react'

export function ArtNav({ collections }) {
    const router = useRouter()
    const [type, setType] = useState('Photos')

    return(
        <ul className="menu bg-base-200 rounded-box w-56">
            {/* <ArtToggle type={type} setType={setType}/> */}
            { 
                    collections && collections.map((collection, i) => {
                        return(
                            <li key={i}>
                                <Link href={`/art?collection=${collection.id}`}>
                                    {collection.title}
                                </Link>
                            </li>
                        )
                })
            }
        </ul>
    )
};

export function ArtToggle({ type, setType }) {

    return(
        <div className='mb-5'>
            <div className='flex justify-center'>
                <h1 className='text-lg'>{type}</h1>
            </div>
            <div className='flex items-center justify-center gap-3'>
                <input type="radio" name="radio-10" className="radio checked:bg-blue-500" onClick={() => setType('Photos')} defaultChecked />
                <input type="radio" name="radio-10" className="radio checked:bg-red-500" onClick={() => setType('Illustrations')} />
            </div>
        </div>
    )
};


