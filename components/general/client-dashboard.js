import Image from 'next/image';
import Link from 'next/link';

//IMGS
import companyCoverPhoto from '@/public/tune-dashboard-photo.jpg'
import moreExposureMan from '@/public/more-exposure-man.png'
import nashBrownsHokusaiLogo from '@/public/hokusai-nashbrowns-logo.png'

//FONTS

//ICONS
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStrava, faYoutube, faInstagram, faTiktok } from '@fortawesome/free-brands-svg-icons';
import { faUpRightFromSquare } from '@awesome.me/kit-237330da78/icons/classic/light'
import { faComputerMouse, faHeart, faEye } from '@awesome.me/kit-237330da78/icons/classic/regular'


export function ClientDashboard({tenantData, tenantVideos, tenantArticles}) {

    const videos = JSON.parse(tenantVideos)
    const articles = JSON.parse(tenantArticles)
    const tenant = JSON.parse(tenantData)

    return(
        <div className="w-full h-fit min-h-screen">
            <div className='flex justify-end items-center w-full'>
                <Link href='/partners/users' className='btn btn-ghost text-base-content'>Manage Users</Link>
            </div>
            <div className='flex flex-col min-[948px]:flex-row justify-between items-center gap-5 w-full p-10'>
                <div className='flex justify-center items-center w-1/2 hidden min-[948px]:block'>
                    <Image
                        src={companyCoverPhoto}
                        alt='Nash Borowns Logo Long'
                        width={500}
                        height={750}
                        className='rounded-xl'
                    />
                </div>
                <div className='w-full h-full flex flex-col gap-3 justify-center items-center min-[948px]:w-1/2'>
                    <h2 className={`text-2xl text-bold font-didot text-indigo-900`}>Total Brand Exposure</h2>
                    {tenant && <Stats totalLikes={tenant.total_likes} totalViews={tenant.total_views} />}
                    <div className='relative flex flex-col w-full h-56'>
                        <Image
                            src={moreExposureMan}
                            alt={"Artical Featured Image"}
                            style={{ objectFit: 'cover', margin: '0' }} // navbar, lineheight, paddding, padding, padding?
                            fill={true}
                            sizes="(min-width: 948px) 50vw, 100vw"
                        />
                    </div>
                    <button className='btn btn-secondary w-full'>Order Content</button>
                </div>
            </div>
            <div className="flex flex-col justify-start items-center gap-5 w-full h-fit p-10">
                <Videos videos={videos}/>
                <Articles articles={articles}/>
            </div>
        </div>
    )
}

function Videos({videos}) {

    return(
        <div className="card w-full bg-base-100 card-lg shadow-sm">
            <div className="card-body">
                <div className='relative w-full'>
                    <p className={`absolute top-0 right-0 text-xs sm:text-sm w-fit font-didot text-base-content hidden sm:block`}>Last Updated: {getPreviousDay6pmFormatted()}</p>
                    <h2 className={`card-title text-3xl sm:text-4xl lg:text-5xl font-didot text-base-content text-center sm:text-left`}>Videos</h2>
                </div>
                <div className="h-[365.5px] table-scrollbar overflow-x-auto">
                    <table className="table text-base-content min-w-full">
                        {/* head */}
                        <thead>
                            <tr className='text-base-content'>
                                <th className="min-w-[200px] sm:min-w-[250px]">Title</th>
                                <th className='text-center min-w-[80px]'>Platform</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Type</th>
                                <th className="min-w-[80px] sm:min-w-[100px]">Sponsored</th>
                                <th className="min-w-[60px] sm:min-w-[80px]">Views</th>
                                <th className="min-w-[60px] sm:min-w-[80px]">Likes</th>
                                <th className="min-w-[80px] sm:min-w-[100px]">Comments</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Post Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                videos && videos.map((video, index) => (
                                    <tr key={index} className="hover:bg-base-200">
                                        <td className="max-w-[200px] sm:max-w-[250px]">
                                            <a href={`https://youtu.be/${video.platform_id}`} target='_blank' className="hover:text-primary">
                                                <div className='flex justify-start items-start gap-1'>
                                                    <span className="text-xs sm:text-sm truncate">{video.title}</span>
                                                    <FontAwesomeIcon icon={faUpRightFromSquare} className='h-2 w-2 text-blue-600 flex-shrink-0 mt-1' />
                                                </div>
                                            </a>
                                        </td>
                                        <td className='text-center'>
                                            {
                                                video.platform == 'youtube' ? (
                                                    <a href='https://www.youtube.com/@nash_brownss' target='_blank'>
                                                        <FontAwesomeIcon icon={faYoutube} className='w-6 h-6 sm:w-10 sm:h-10 text-red-600' />
                                                    </a>
                                                ) : <FontAwesomeIcon icon={faTiktok} className="w-6 h-6 sm:w-10 sm:h-10" />}
                                        </td>
                                        <td>
                                            {
                                                video.format == 'long_form' ? 
                                                    <div className="badge badge-info text-xs">Long</div> : 
                                                    <div className="badge badge-secondary text-xs">Short</div>
                                            }
                                        </td>
                                        <td><Sponsored sponsored={video.sponsored}/></td>
                                        <td className="text-xs sm:text-sm">{video.views.toLocaleString()}</td>
                                        <td className="text-xs sm:text-sm">{video.likes.toLocaleString()}</td>
                                        <td className="text-xs sm:text-sm">{video.comments.toLocaleString()}</td>
                                        <td className="text-xs sm:text-sm">{formatDateToPrettyString(video.published_at)}</td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    {/*
                    <div className='flex justify-center items-center w-full mt-5'>
                        <div className="badge badge-outline badge-info">Show More</div>
                    </div>
                    */}
                </div>
            </div>
        </div>
    )
}



function Articles({articles}) {

    return(
        <div className="card w-full bg-base-100 card-lg shadow-sm">
            <div className="card-body">
                <div className='relative w-full'>
                    <p className={`absolute top-0 right-0 text-xs sm:text-sm w-fit font-didot text-base-content hidden sm:block`}>Live Data. Refresh page to update.</p>
                    <h2 className={`card-title text-3xl sm:text-4xl lg:text-5xl font-didot text-base-content text-center sm:text-left`}>Articles</h2>
                </div>
                <div className="h-[365.5px] table-scrollbar overflow-x-auto">
                    <table className="table text-base-content min-w-full">
                        {/* head */}
                        <thead>
                            <tr className='text-base-content'>
                                <th className="min-w-[200px] sm:min-w-[250px]">Title</th>
                                <th className='text-center min-w-[80px]'>Platform</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Type</th>
                                <th className="min-w-[80px] sm:min-w-[100px]">Sponsored</th>
                                <th className="min-w-[60px] sm:min-w-[80px]">Views</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Post Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            { articles && articles.map((article, index) => (
                                <tr key={index} className="hover:bg-base-200">
                                    <td className="max-w-[200px] sm:max-w-[250px]">
                                        <Link href={`/blog/articles/${article.platform_id}`} target='_blank' className="hover:text-primary">
                                            <div className='flex justify-start items-start gap-1'>
                                                <span className="text-xs sm:text-sm truncate">{article.title}</span>
                                                <FontAwesomeIcon icon={faUpRightFromSquare} className='h-2 w-2 text-blue-600 flex-shrink-0 mt-1' />
                                            </div>
                                        </Link>
                                    </td>
                                    <td>
                                        <div className='flex justify-center items-center'>
                                            <Link href='/blog' target='_blank'>
                                                <div className='relative h-6 w-6 sm:h-10 sm:w-10'>
                                                    <Image
                                                        src={nashBrownsHokusaiLogo}
                                                        alt={"Artical Featured Image"}
                                                        style={{ objectFit: 'cover', margin: '0' }} // navbar, lineheight, paddding, padding, padding?
                                                        fill={true}
                                                        sizes="40px"
                                                    />
                                                </div>
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        {
                                            article.type == 'blog' ? 
                                                <div className="badge badge-info text-xs">Blog</div> : 
                                                <div className="badge badge-secondary text-xs">Short</div>
                                        }
                                    </td>
                                    <td><Sponsored sponsored={article.sponsored}/></td>
                                    <td className="text-xs sm:text-sm">{article.views.toLocaleString()}</td>
                                    <td className="text-xs sm:text-sm">{formatDateToPrettyString(article.published_at)}</td>
                                </tr>
                            ))
                            }
                        </tbody>
                    </table>
                    {/*
                    <div className='flex justify-center items-center w-full mt-5'>
                        <div className="badge badge-outline badge-info">Show More</div>
                    </div>
                    */}
                </div>
            </div>
        </div>
    )
}

function Stats({totalLikes, totalViews}) {

    return(
        <div className='flex justify-between items-center w-full'>
            <Stat icon={faHeart} iconColor={'text-red-600'} stat={totalLikes.toLocaleString()} description='Likes'/>
            <div className="divider divider-horizontal"/>
            <Stat icon={faEye} iconColor={'text-secondary-content'} stat={totalViews.toLocaleString()} description='Views'/>
            <div className="divider divider-horizontal"/>
            <Stat icon={faComputerMouse} iconColor={'text-blue-600'} stat={'00'} description='Clicks'/>
        </div>
    )
}

function Stat({icon, iconColor, stat, description}) {

    return (
        <div className='flex flex-col justify-center items-center w-full'>
            <FontAwesomeIcon icon={icon} className={`h-7 w-7 ${iconColor}`} />
            <h2 className='text-primary-content text-4xl font-mono font-extrabold'>{stat}</h2>
            <h3 className='text-base-content font-semibold text-xs'>{description}</h3>
        </div>
    )
}

function Sponsored({sponsored}) {
    if(sponsored.sponsored) {
        return(
            <div className="badge badge-success text-xs">
                <svg className="size-[0.75em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></circle><polyline points="7 13 10 16 17 8" fill="none" stroke="currentColor" strokeLinecap="square" stroke-miterlimit="10" strokeWidth="2"></polyline></g></svg>
                Yes
            </div>
        )
    }

    return(
        <div className="badge badge-error text-xs">
            <svg className="size-[0.75em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor"><rect x="1.972" y="11" width="20.056" height="2" transform="translate(-4.971 12) rotate(-45)" fill="currentColor" strokeWidth={0}></rect><path d="m12,23c-6.065,0-11-4.935-11-11S5.935,1,12,1s11,4.935,11,11-4.935,11-11,11Zm0-20C7.038,3,3,7.037,3,12s4.038,9,9,9,9-4.037,9-9S16.962,3,12,3Z" strokeWidth={0} fill="currentColor"></path></g></svg>
            No
        </div>
    )
}

function formatDateToPrettyString(isoString) {
    const date = new Date(isoString);

    const options = { month: 'long' };
    const month = new Intl.DateTimeFormat('en-US', options).format(date);
    const day = date.getDate();
    const year = date.getFullYear();

    const getOrdinal = (n) => {
        if (n >= 11 && n <= 13) return `${n}th`;
        const lastDigit = n % 10;
        if (lastDigit === 1) return `${n}st`;
        if (lastDigit === 2) return `${n}nd`;
        if (lastDigit === 3) return `${n}rd`;
        return `${n}th`;
    };

    return `${month} ${getOrdinal(day)} ${year}`;
}

function getPreviousDay6pmFormatted() {
    const options = { timeZone: 'America/Anchorage' };
    const now = new Date();

    // Get yesterday in Alaska time
    const anchorageNow = new Date(now.toLocaleString('en-US', options));
    anchorageNow.setDate(anchorageNow.getDate() - 1);
    anchorageNow.setHours(18, 0, 0, 0); // 6 PM

    // Extract parts
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[anchorageNow.getMonth()];
    const day = anchorageNow.getDate();
    const year = anchorageNow.getFullYear();

    // Get ordinal suffix
    function getOrdinal(n) {
        if (n >= 11 && n <= 13) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    return `${month} ${day}${getOrdinal(day)} ${year}, 6PM AKST`;
}

