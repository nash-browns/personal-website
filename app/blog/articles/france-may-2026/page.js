import Image from 'next/image';
import { Anton, Fira_Sans } from 'next/font/google';
import { generateMetadata } from '@/lib/seo';
import { ArticleSeo } from '@/components/seo';
import { ContinueReading } from '@/components/blog/navigation/continue-reading';

export const postMetadata = {
    title: "France 2026",
    published: "2026-08-31",
    updated: "2026-08-31",
    author: 'Nash Bostwick',
    thumbnail: 'https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050036.jpg?alt=media&token=65533058-2a49-4ff1-9564-48b061dbb75c',
    thumbnailIllustration: 'https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2Ffeature-image.jpeg?alt=media&token=4fe935d3-c359-4ced-8ad2-2361065b321f',
    description: "May 2026 in France with my camera. Paris streets, museums, and CineStill 800T at night — then north to Caen, Omaha Beach, Pointe du Hoc, and the American Cemetery in Normandy.",
    keywords: ['France', 'France travel', 'France photography', 'film photography', 'Paris', 'Normandy', 'Omaha Beach', 'Pointe du Hoc', 'Caen', 'CineStill 800T', 'France trip report'],
    tags: ['France', 'Travel', 'Photography', 'Film', 'Trips'],
    isActive: true,
};

export const metadata = generateMetadata({ ...postMetadata });

const heading = Anton({ weight: '400', subsets: ['latin'] });
const body = Fira_Sans({ weight: ['400', '500', '700'], subsets: ['latin'] });

const GREEN = '#436c4a';
const DARK = '#2b2c26';

/* ---------------------------------------------------------------- */
/* Image URLs — fill from Firebase Storage france-may-2026/          */
/* Empty strings render as gray placeholder tiles for now.           */
/* ---------------------------------------------------------------- */

// paris — hero + cafés
const heroStreet = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050036.jpg?alt=media&token=65533058-2a49-4ff1-9564-48b061dbb75c";        // police on rollerblades, art stalls, Notre Dame Hotel street
const cafeRed = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470009.jpg?alt=media&token=a382bff1-87f7-474a-8a33-82943a3383e1";           // red café corner (La Cloche) street scene
const cafeFloreAcross = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470019.jpg?alt=media&token=a50ece3e-1d3f-4b4b-86c5-c9ccf8e123d7";   // Café de Flore from across the street, white van
const cafeGreen = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480011.jpg?alt=media&token=82f15610-e768-4e80-af3d-4208e3dc2a34";         // green café / hedge corner with pedestrians
const cafeFloreBig = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470010.jpg?alt=media&token=23d8e40d-51ef-49b7-b3b1-165c90cdec96";      // Café de Flore close-up with the crowd out front

// paris — gardens + streets
const rodinGarden = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470021.jpg?alt=media&token=370a1fb2-c5fb-4f50-b1cf-30688b7bba66";       // PORTRAIT: Rodin statue, topiary cones, Eiffel Tower behind
const iranAirStreet = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470027.jpg?alt=media&token=470c17b9-3417-4da1-95fe-5985f2f3c555";     // IranAir storefront, woman walking, lamppost
const darkWindow = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050004.jpg?alt=media&token=567aa223-6b8f-4d64-bfe8-cd72d7998609";        // dark stone window with light coming through (crypt)

// paris — monuments
const arcDay = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470028.jpg?alt=media&token=494fc0d1-6332-42d0-ae90-2001c7e079ca";            // Arc de Triomphe daytime with street sign
const trainPlatform = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050035.jpg?alt=media&token=beb56762-2852-484c-9e29-16f61e94096e";     // silver train at the platform
const eiffelDay = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470018.jpg?alt=media&token=d845948d-edb4-43bc-9b01-6f21f653492e";         // PORTRAIT: Eiffel Tower full height, trees below
const arcNight = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480009.jpg?alt=media&token=0936ac5b-bbb4-4b89-be1d-6625df0b81a9";          // Arc de Triomphe at night with the red lamps
const treesCar = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470026.jpg?alt=media&token=b2f559b0-4bd0-4ffa-addc-f84423488e82";          // old tan car under the plane trees

// paris — second monuments row
const napoleonTomb = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470025.jpg?alt=media&token=8ab94fbc-7c98-4f9f-9f32-790f9b3fd4d9";      // PORTRAIT: Napoleon's tomb at Les Invalides
const laDefenseArch = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480034.jpg?alt=media&token=fd940a9a-2c76-4799-8cda-e803b8dced06";     // La Grande Arche de la Défense against blue sky
const redCafeCorner = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470001.jpg?alt=media&token=e67252c8-0f31-491f-94d9-28d8fa04e714";     // red café corner with checkered crosswalk
const champsElysees = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470030.jpg?alt=media&token=e0b7ac2b-b5b2-4653-a764-7560d4b7f1aa";     // Champs-Élysées looking toward the Arc

// paris — seine collage
const goldDisc = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480027.jpg?alt=media&token=a2968a2f-41ff-4f10-8943-06db0822be98";          // golden disc glowing under the stained glass window
const laDefenseStreet ="https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480035.jpg?alt=media&token=e5c20a33-ac1e-4de4-b714-d8532f78d8dd";   // La Défense arch from street level, small
const glassTowers = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480033.jpg?alt=media&token=9cdeb12c-1125-452d-b913-304f71eb2046";       // PORTRAIT: glass towers with the thumb sculpture
const seineSunset = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480021.jpg?alt=media&token=711a6f15-f46f-4103-ae63-feba0e9c496d";       // BIG: Seine at sunset, Louvre silhouette, bridges
const redFiat = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470008.jpg?alt=media&token=95548d30-2f85-470a-a21a-bbc658a175dd";           // little red Fiat parked on the street
const museumTerrace = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470006.jpg?alt=media&token=546c1d87-6658-44f1-8247-ed38f3a00d9c";     // museum rooftop terrace
const churchStreet = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470012.jpg?alt=media&token=e77d70f8-f863-4c86-aa6a-06480fe926de";      // PORTRAIT: church facade down the street
const seineNightBarge = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480001.jpg?alt=media&token=1bd8b4b0-5c9e-44d5-9d08-bc397af22d97";   // WIDE: boat on the Seine at dusk
const rodinTopiary = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470020.jpg?alt=media&token=06c44301-95db-408c-9ccb-bb72f4a9c22c";      // small: Rodin statue between topiary cones

// paris — big three
const invalidesLawn = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480012.jpg?alt=media&token=17c6fcad-d84e-4978-9ee6-365ca10a076d";     // lawn esplanade with the golden dome of Les Invalides
const louvrePyramid = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480016.jpg?alt=media&token=d296636a-cd40-490c-87f4-b0809d8e553c";     // Louvre pyramid with the crowd
const sacreCoeur = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480024.jpg?alt=media&token=66832b4b-5eba-4742-9e70-0c788f72e994";        // Sacré-Cœur from below

// museums
const picassoPortrait = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480032.jpg?alt=media&token=0ed6aaca-e756-4824-b2fe-9798272fd353";   // PORTRAIT: Picasso portrait painting with the goat sculpture below
const galleryRoom = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480030.jpg?alt=media&token=3266bb9b-40dc-4fec-b7a8-77e98dc88500";       // BIG: white gallery room, sculpture + paintings
const monaLisa = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480018.jpg?alt=media&token=717735a2-690d-4786-ad39-ffd56175aec0";          // PORTRAIT: Mona Lisa in her case above the wooden ledge
const picassoWall = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480031.jpg?alt=media&token=be29aba2-37d2-4041-8733-c389851a1681";       // wall of framed Picasso portraits
const stoneHead = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480019.jpg?alt=media&token=ff7c8e76-be12-43b2-bce9-5eaa066b36ac";         // stone head sculpture by the arched window

// cinestill 800t — night
const notreDameNight = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480002.jpg?alt=media&token=1b379e45-525d-4fda-8796-4d9d35141def";    // Notre Dame across the river at night
const nightStatue = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480006.jpg?alt=media&token=f16a9d77-da12-48a9-a3fc-6d0962afdfb6";       // statue at night in the red glow of traffic
const eiffelNight = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480004.jpg?alt=media&token=a5997f91-3cc9-4e46-bfc5-9e4bc8e70433";       // PORTRAIT: Eiffel Tower lit up at night
const sacreCoeurAngel = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480023.jpg?alt=media&token=9945023a-74b6-4dda-9d8e-d283e3a9a277";   // angel statue on the arch inside Sacré-Cœur
const cathedralAltar = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239480026.jpg?alt=media&token=829b174d-e3a5-42af-8332-46478d4b5369";    // cathedral interior, altar and checkered floor

// normandy
const flagsBeach = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050002.jpg?alt=media&token=1a22ac82-e6d4-4178-8be9-8c8b81ff6aae";        // French + Normandy flags flying over the beach
const beachHorseBig = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050019.jpg?alt=media&token=0cbd566d-d89d-417e-9613-37aa50a41a7e";     // BIG: sulky horse and driver on the beach
const beachHorseFar = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050016.jpg?alt=media&token=63fefefc-4aea-4d00-9f4c-50c4a04755b1";     // small: sulky horse far away on the sand
const beachHorseWalkers = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050017.jpg?alt=media&token=762dab1d-0115-4953-b7f0-94897080ad6e"; // small: sulky horse and two walkers
const lesBraves = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050023.jpg?alt=media&token=a8325430-a548-4043-ac1a-46aa681987f0";         // PORTRAIT: Les Braves sculpture on Omaha Beach
const grandHotel = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050013.jpg?alt=media&token=e20ecde9-32c2-4faf-9958-eb849f3f3d5f";        // grand hotel behind the beach (Cabourg)
const omahaPanorama = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050024.jpg?alt=media&token=87faf950-e25b-47e1-a24c-3a79650e9ced";     // Omaha Beach panorama, cliffs in the distance
const churchNave = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050003.jpg?alt=media&token=9d3ce55a-ce19-4c54-b80f-3feef5fb0b2b";        // PORTRAIT: church nave, stained glass, chandelier
const caenSpire = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050001.jpg?alt=media&token=605b6862-dfc8-4a14-b106-7b4e6e95354a";         // PORTRAIT: Caen church spire and rose window
const cemetery = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050026.jpg?alt=media&token=3ea26851-e7f8-480c-bb1f-27f88895608b";          // BIG: rows of crosses at the American Cemetery
const omahaMonument = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050025.jpg?alt=media&token=272bc5af-a367-4be0-9fca-0533748cad93";     // PORTRAIT: Omaha Beach monument with flowers
const pointeDuHoc = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050021.jpg?alt=media&token=699af472-3b37-4e15-9981-c63138e2fa83";       // Pointe du Hoc ranger monument on the cliff
const rangerPlaque = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000007050022.jpg?alt=media&token=517cc661-bc45-4bbd-8ca8-dad8d2bfcc32";      // RANGER plaque close-up
const libertyBarge = "https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/france-may-2026%2F000239470035.jpg?alt=media&token=87eec9a6-b687-4ddc-8bb8-bd915e5ca6c9";      // LIBERTY barge with the Statue of Liberty replica

/* ---------------------------------------------------------------- */
/* One-off pieces for this article only                             */
/* ---------------------------------------------------------------- */

/*
 * Every scan is exactly 3000x2062 (landscape) or 2062x3000 (portrait).
 * All tiles render the FULL frame at its native aspect — no cropping.
 * Empty src strings render as gray placeholder tiles until the photos
 * are uploaded to Firebase Storage under france-may-2026/.
 */
function Photo({ src, alt, className = '', priority = false, sizes = '100vw' }) {
    if (!src) {
        return <div className={`relative overflow-hidden bg-neutral-300 ${className}`} aria-label={alt} />;
    }
    return (
        <div className={`relative overflow-hidden ${className}`}>
            <Image
                src={src}
                alt={alt}
                fill
                priority={priority}
                sizes={sizes}
                className="object-cover"
            />
        </div>
    );
}

function Land({ src, alt, sizes = '33vw', priority = false, className = '' }) {
    return <Photo src={src} alt={alt} className={`aspect-[3/2] w-full ${className}`} sizes={sizes} priority={priority} />;
}

function Port({ src, alt, sizes = '25vw', className = '' }) {
    return <Photo src={src} alt={alt} className={`aspect-[2/3] w-full ${className}`} sizes={sizes} />;
}

function Chip({ children }) {
    return (
        <span className={`${heading.className} text-white text-2xl sm:text-3xl px-6 py-1 uppercase tracking-[0.25em]`} style={{ backgroundColor: GREEN }}>
            {children}
        </span>
    );
}

function PlaceCard({ name, children }) {
    return (
        <div>
            <Chip>{name}</Chip>
            <p className={`${body.className} text-gray-800 text-lg sm:text-xl mt-3 leading-normal`}>{children}</p>
        </div>
    );
}

function Banner({ children }) {
    return (
        <div className="py-1 sm:py-2 px-3 sm:px-6 text-center" style={{ backgroundColor: GREEN }}>
            <h2 className={`${heading.className} text-white text-2xl sm:text-4xl xl:text-5xl uppercase tracking-[0.08em]`}>
                {children}
            </h2>
        </div>
    );
}

function Label({ children }) {
    return (
        <span className={`${body.className} font-bold text-white text-sm sm:text-xl px-3 py-0.5`} style={{ backgroundColor: GREEN }}>
            {children}
        </span>
    );
}

/* Hero — street scene with the big FRANCE masthead overlapping the bottom right */
function HeroSection() {
    return (
        <section className="relative">
            <Land src={heroStreet} alt="Police on rollerblades passing the art stalls near Notre Dame" sizes="100vw" priority />
            <h1
                className={`${heading.className} absolute bottom-0 right-0 text-black leading-none uppercase text-6xl sm:text-8xl xl:text-9xl pr-1`}
            >
                France
            </h1>
        </section>
    );
}

/* Monuments — arcs and trains left, Eiffel rail right */
function MonumentsSection() {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-[1.46fr_1.46fr_1fr] gap-2 py-2 items-start sm:items-stretch">
            <div className="grid gap-2 sm:grid-rows-2">
                <Land src={arcDay} alt="Arc de Triomphe on a sunny day behind the street sign" sizes="40vw" className="sm:aspect-auto" />
                <Land src={arcNight} alt="Arc de Triomphe at night with red streetlamps" sizes="40vw" className="sm:aspect-auto" />
            </div>
            <div className="grid gap-2 sm:grid-rows-2">
                <Land src={trainPlatform} alt="Silver train pulling into the platform" sizes="40vw" className="sm:aspect-auto" />
                <Land src={treesCar} alt="Old tan car parked under the plane trees" sizes="40vw" className="sm:aspect-auto" />
            </div>
            <Port src={eiffelDay} alt="The Eiffel Tower rising over the trees" sizes="30vw" />
        </section>
    );
}

/* Seine collage — Défense rail left, the big sunset center, street rail right */
function SeineSection() {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-[1fr_4.6fr_1fr] gap-2 py-2">
            <div className="grid grid-cols-2 gap-2 items-start sm:flex sm:flex-col sm:justify-between">
                <Land src={goldDisc} alt="Golden disc glowing over the stained glass window" sizes="15vw" />
                <Land src={laDefenseStreet} alt="La Grande Arche from street level" sizes="15vw" />
                <Port src={glassTowers} alt="Glass towers behind the thumb sculpture at La Défense" sizes="15vw" />
            </div>
            <div className="order-first sm:order-none">
                <Land src={seineSunset} alt="The Seine at sunset with the Louvre in silhouette" sizes="70vw" />
            </div>
            <div className="grid grid-cols-2 gap-2 items-start sm:flex sm:flex-col sm:justify-between">
                <Land src={redFiat} alt="Little red bubble car parked between black cars" sizes="15vw" />
                <Land src={museumTerrace} alt="Museum rooftop terrace" sizes="15vw" />
                <Land src={churchStreet} alt="Church facade at the end of the street" sizes="15vw" />
                <Land src={rodinTopiary} alt="Rodin statue between the topiary cones" sizes="15vw" />
            </div>
        </section>
    );
}

/* Museums — Picasso rail left, gallery right, green banner across the bottom */
function MuseumsSection() {
    return (
        <section className="py-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2.1fr] gap-2">
                <Port src={picassoPortrait} alt="Portrait of Picasso hanging above his goat sculpture" sizes="35vw" />
                <div className="flex flex-col gap-2">
                    <Photo src={galleryRoom} alt="White gallery room with a sculpture and paintings" className="aspect-[3/2] sm:aspect-auto sm:grow w-full" sizes="65vw" />
                    <Banner>I went to museums</Banner>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2.1fr] gap-2 pt-2 items-center">
                <Port src={monaLisa} alt="The Mona Lisa small in her glass case" sizes="35vw" />
                <p className={`${body.className} font-bold text-gray-900 text-xl sm:text-3xl text-center px-6 leading-snug`}>
                    They were great, but taking pictures in a museum is lame...
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Land src={picassoWall} alt="Wall of framed Picasso portraits" sizes="50vw" />
                <Land src={stoneHead} alt="Stone head sculpture in front of the arched window" sizes="50vw" />
            </div>
        </section>
    );
}

/* CineStill 800T — like the mock: banner beside the first photo, three night
   shots stacked left, labels floating in the open space with arrows reaching
   into the photos, then a bottom band of Eiffel / angel / altar. */
function CinestillSection() {
    return (
        <section className="py-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_3.7fr] gap-2">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                    <Land src={seineNightBarge} alt="Lit boats along the Seine at night" sizes="22vw" />
                    <Land src={nightStatue} alt="Statue at night in the red glow of traffic" sizes="22vw" />
                    <Land src={notreDameNight} alt="Notre Dame in the distance past the red lights of the riverbank" sizes="22vw" />
                </div>
                <div className="flex flex-col">
                    <Banner>I tried CineStill 800T</Banner>
                    {/* label callouts — desktop only; arrows overflow into the photos */}
                    <div className="relative z-10 grow hidden sm:block">
                        {/* viewBox matches the zone's ~1.9:1 aspect so the arrowheads stay true triangles */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 190 100" preserveAspectRatio="none" aria-hidden="true">
                            <line x1="53.2" y1="20" x2="-7.5" y2="6.9" stroke={GREEN} strokeWidth="0.9" />
                            <polygon points="-11.4,6 -7.17,5.38 -7.81,8.32" fill={GREEN} />
                            <line x1="53.2" y1="24" x2="-7.6" y2="41.9" stroke={GREEN} strokeWidth="0.9" />
                            <polygon points="-11.4,43 -7.98,40.43 -7.14,43.31" fill={GREEN} />
                            <line x1="13.3" y1="79" x2="-22.3" y2="126.8" stroke={GREEN} strokeWidth="0.9" />
                            <polygon points="-24.7,130 -23.51,125.89 -21.11,127.69" fill={GREEN} />
                            <path d="M 70.3 96 Q 53.2 114 41.97 132.58" fill="none" stroke={GREEN} strokeWidth="0.9" />
                            <polygon points="39.9,136 40.69,131.8 43.25,133.36" fill={GREEN} />
                        </svg>
                        <div className="absolute" style={{ top: '14%', left: '29%' }}>
                            <Label>SOOOOO Much Red</Label>
                        </div>
                        <div className="absolute" style={{ top: '66%', left: '2%' }}>
                            <Label>Why is the Eiffel Tower red?</Label>
                        </div>
                        <div className="absolute" style={{ top: '84%', left: '37%' }}>
                            <Label>Why is this angel red?</Label>
                        </div>
                    </div>
                    {/* mobile fallback — plain chips */}
                    <div className="flex flex-wrap justify-center gap-3 py-2 sm:hidden">
                        <Label>SOOOOO Much Red</Label>
                        <Label>Why is the Eiffel Tower red?</Label>
                        <Label>Why is this angel red?</Label>
                    </div>
                </div>
            </div>
            {/* bottom band — altar anchors the row height, the two portraits fill it */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2.4fr_2.4fr] gap-2 pt-2 items-stretch">
                <Port src={eiffelNight} alt="The Eiffel Tower glowing gold at night" sizes="17vw" className="sm:aspect-auto" />
                <Land src={sacreCoeurAngel} alt="Angel statue on the arch inside Sacré-Cœur" sizes="40vw" className="sm:aspect-auto" />
                <Land src={cathedralAltar} alt="Cathedral altar over the checkered floor" sizes="40vw" />
            </div>
        </section>
    );
}

/* Normandy — beach horses under the flags */
function BeachSection() {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-[2.1fr_1fr] gap-2 py-2 items-start sm:items-stretch">
            <Land src={beachHorseBig} alt="Sulky horse and driver crossing the beach at low tide" sizes="65vw" />
            <div className="grid gap-2 sm:grid-rows-2">
                <Land src={beachHorseFar} alt="Sulky horse far down the empty sand" sizes="35vw" className="sm:aspect-auto" />
                <Land src={beachHorseWalkers} alt="Sulky horse passing two walkers on the beach" sizes="35vw" className="sm:aspect-auto" />
            </div>
        </section>
    );
}

/* Caen — text left, Les Braves right */
function CaenSection() {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-2 py-2 items-center">
            <div className="px-2 sm:px-10 order-last sm:order-none">
                <PlaceCard name="Caen">
                    Normandy was awesome. A sad time to look back on in a way. Beautiful place
                    with beautiful people and amazing food. Nice to get out to the countryside!
                </PlaceCard>
            </div>
            <Port src={lesBraves} alt="Les Braves sculpture rising out of the sand on Omaha Beach" sizes="45vw" />
        </section>
    );
}

/* Memorials — dark background like the mock */
function MemorialSection() {
    return (
        <section className="flex flex-col items-center gap-4 p-4 sm:p-10" style={{ backgroundColor: DARK }}>
            <div className="w-full sm:w-2/3">
                <Port src={omahaMonument} alt="The Omaha Beach monument with flowers laid at its base" sizes="60vw" />
            </div>
            <div className="w-full sm:w-2/3">
                <Land src={pointeDuHoc} alt="The Ranger monument on the cliff at Pointe du Hoc" sizes="60vw" />
            </div>
            <div className="w-full sm:w-2/3">
                <Land src={rangerPlaque} alt="RANGER plaque set into the stone" sizes="60vw" />
            </div>
        </section>
    );
}

export default function FranceMay2026() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-10 py-6 sm:py-10">
            <ArticleSeo post={postMetadata} slug="france-may-2026" />

            <HeroSection />

            {/* café row */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                <Land src={cafeRed} alt="Red café corner with tables on the sidewalk" sizes="33vw" />
                <Land src={cafeFloreAcross} alt="Café de Flore from across the boulevard" sizes="33vw" />
                <Land src={cafeGreen} alt="Green café terrace behind the hedge" sizes="33vw" />
            </section>

            <Land src={cafeFloreBig} alt="The crowd outside Café de Flore" sizes="100vw" />

            {/* rodin garden + paris blurb */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 items-center">
                <Port src={rodinGarden} alt="Rodin's Three Shades among the topiary cones with the Eiffel Tower behind" sizes="50vw" />
                <div className="px-2 sm:px-10">
                    <PlaceCard name="Paris">
                        Drinking wine and smoking cigarettes by the Seine is fun. Probably the
                        healthiest thing you could do as an American. Riding bikes through the city
                        at 2am. Seeing the Eiffel Tower for the first time after it popped out from
                        behind a tree. Art. Caf&eacute;s.
                    </PlaceCard>
                </div>
            </section>

            {/* street pair */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                <Land src={iranAirStreet} alt="IranAir storefront on a quiet street" sizes="50vw" />
                <Land src={darkWindow} alt="Light through a stone window in the dark" sizes="50vw" />
            </section>

            <MonumentsSection />

            {/* four across — tomb, arch, café, champs */}
            <section className="grid grid-cols-2 sm:grid-cols-[0.47fr_1fr_1fr_1fr] gap-2 py-2 items-start sm:items-stretch">
                <Port src={napoleonTomb} alt="Napoleon's tomb under the dome of Les Invalides" sizes="15vw" />
                <Land src={laDefenseArch} alt="La Grande Arche de la Défense" sizes="28vw" className="sm:aspect-auto" />
                <Land src={redCafeCorner} alt="Red café over the checkered crosswalk" sizes="28vw" className="sm:aspect-auto" />
                <Land src={champsElysees} alt="The Champs-Élysées running toward the Arc de Triomphe" sizes="28vw" className="sm:aspect-auto" />
            </section>

            <SeineSection />

            {/* big three */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                <Land src={invalidesLawn} alt="The esplanade lawn leading to the golden dome of Les Invalides" sizes="33vw" />
                <Land src={louvrePyramid} alt="The Louvre pyramid and the crowd" sizes="33vw" />
                <Land src={sacreCoeur} alt="Sacré-Cœur white against the sky" sizes="33vw" />
            </section>

            <MuseumsSection />

            <CinestillSection />

            {/* normandy */}
            <Land src={flagsBeach} alt="French and Normandy flags flying over the beach at Ouistreham" sizes="100vw" />

            <BeachSection />

            <CaenSection />

            {/* hotel + omaha */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                <Land src={grandHotel} alt="The grand hotel rising behind the beach" sizes="50vw" />
                <Land src={omahaPanorama} alt="Omaha Beach stretching toward the cliffs" sizes="50vw" />
            </section>

            {/* churches */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                <Port src={churchNave} alt="Church nave with the stained glass and chandelier" sizes="50vw" />
                <Port src={caenSpire} alt="The spire and rose window of the church in Caen" sizes="50vw" />
            </section>

            <Land src={cemetery} alt="Rows of white crosses at the Normandy American Cemetery" sizes="100vw" />

            <MemorialSection />

            <Land src={libertyBarge} alt="The LIBERTY barge below the Statue of Liberty replica on the Seine" sizes="100vw" />

            {/* related articles — MdxLayout's structure without its parchment background */}
            <div className="w-full flex flex-col justify-center items-center my-3 px-2 sm:px-0">
                <div className="w-full max-w-6xl">
                    <div className="prose prose-sm sm:prose-lg lg:prose-xl">
                        <div className="p-2 sm:p-3 lg:p-4">
                            <ContinueReading
                                articleOne={'/blog/articles/japan-april-2026'}
                                articleTwo={'/blog/articles/rock-island-katy-trail'}
                                articleThree={'/blog/articles/thayer-hut'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
