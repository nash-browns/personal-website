import Image from 'next/image';

export function BlogCard({ title, thumbnail, sizes, preload = false }) {
    const isVideo = isVideoURL(thumbnail);

    return(
        <div className="group relative h-full w-full rounded-2xl overflow-hidden shadow-xl">
            {isVideo ? ( 
                <video
                    className="absolute top-0 left-0 w-full h-full object-cover m-0"
                    style={{ borderRadius: '1rem'}}
                    autoPlay
                    loop
                    muted
                    playsInline
                >
                    <source src={thumbnail} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            ) : 
                <Image
                    src={thumbnail}
                    alt={`${title} thumbnail`}
                    style={{objectFit: 'cover', borderRadius: '1rem'}}
                    fill={true}
                    sizes={sizes}
                    preload={preload}
                />
            }
            <h2 className="hidden group-hover:block absolute right-0 bottom-0 p-1 pb-0 font-spartan font-bold text-slate-600 text-4xl uppercase rounded-md rounded-br-md backdrop-blur-xl bg-gray-200 bg-opacity-40">{title}</h2>
        </div>
    )
}

function stripQuery(url) {
  return url.split('?')[0]; // removes ? and everything after
}

function isVideoURL(url) {
  const cleanURL = stripQuery(url);
  return /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(cleanURL);
}
