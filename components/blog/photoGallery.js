'use client';

import { PhotoProvider, PhotoView } from 'react-photo-view';
import Image from 'next/image';

import 'react-photo-view/dist/react-photo-view.css';

export function PhotoGallery({title, photos}) {
    return(
        <div className='flex flex-col justify-center items-center py-5'>
                <GalleryTitle title={title}/>
            <div className='max-w-7xl'>
                    <Gallery title={title} photos={photos}/>
            </div>
        </div>
    )
}

function GalleryTitle({title}) {
    return(
        <div className='prose'>
            <h1 className='mb-5'>{title}</h1>
        </div>
    )

}

function Gallery({title, photos}) {
    return(
        <PhotoProvider>
            <div className='grid grid-cols-3 justify-items-center gap-4'>
                {
                    photos.map((photo, i) => (
                        <PhotoView key={i} src={photo.publicUrl}>
                            <Image
                                src={photo.nextImg}
                                alt={title}
                                sizes="(min-width: 1280px) 400px, 33vw"
                            />
                        </PhotoView>
                    ))
                }
            </div>
        </PhotoProvider>
    ) 
}

