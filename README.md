# Personal Website

A Next.js personal website with multi-tenant authentication using Firebase.

## Public-page JavaScript

Public pages use a server-rendered navbar with a Partners link. Authentication and the Dashboard/Sign Out controls are scoped to the `/partners`, `/signup`, and `/forgot-password` layouts through `AccountLayout`. The root's `PublicNavigation` switch hides the public navbar when an account layout renders its own. Public links to the partner area disable prefetching so ordinary browsing does not download account code in advance.

Import components directly from their files, for example `import { CenteredImage } from '@/components/blog/images/centered-image'`. Broad imports from `@/components/blog` or `@/components/general` can include unrelated client components in production scripts, even when the page does not render them. Articles still use the same shared image components and automatic image dimensions.

After building, run `npm run test:bundles` to check that public pages exclude Firebase SDKs, simple pages exclude unrelated widgets, and account pages retain their authentication components.

## Multi-Tenant Authentication

This application now includes a complete multi-tenant authentication system using Firebase Admin SDK alongside the existing client-side Firebase SDK.

### Authentication Methods

The application supports multiple authentication methods:

1. **Email/Password Authentication** - Traditional email and password login
2. **Google OAuth Authentication** - Sign in with Google accounts
3. **Multi-tenant Support** - Users are assigned to specific tenants with access control

### Google Auth Integration

Google Authentication has been integrated into the existing authentication system. Users can now sign in or sign up using their Google accounts.

#### Features

- **Seamless Integration**: Works with existing multi-tenant system
- **Account Selection**: Forces Google account selection for better UX
- **Profile Information**: Automatically extracts user profile data from Google
- **Token Management**: Uses Firebase ID tokens for server-side validation
- **Error Handling**: Comprehensive error handling for authentication failures
- **User Creation**: Automatically creates user entries in Firestore users collection
- **Tenant Assignment**: Handles users without tenant access gracefully

#### Multi-Tenant User Creation

When users sign up with Google Auth:

1. **User Authentication**: User authenticates with Google
2. **Profile Extraction**: User profile data is extracted from Google
3. **Firestore Entry**: User document is created in the `users` collection with:
   - `first_name` and `last_name` from Google profile
   - `email` from Google account
   - `tenant: null` (needs admin assignment)
   - `auth_provider: 'google'`
   - `google_id` for reference
   - `created_at` timestamp
4. **Token Management**: Firebase ID token is set as cookie
5. **Access Control**: User is redirected based on tenant access

#### User Access States

- **Admin Users** (tenant ID 0): Access to admin dashboard
- **Tenant Users** (assigned tenant): Access to client dashboard
- **No Tenant Access**: Shows "Access Pending" screen with contact admin option

#### Configuration

1. **Firebase Console Setup**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Google provider
   - Add your authorized domains
   - Configure OAuth consent screen if needed

2. **Environment Variables** (already configured):
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   ```

#### Usage

The Google Auth buttons are available on both login and sign-up pages:

- **Login Page**: `/partners` - "Login with Google" button
- **Sign-up Page**: `/signup` - "Sign up with Google" button

#### Components

- `lib/firebase/auth-utils.js` - Google Auth utility functions
- `components/general/login.js` - Login component with Google Auth
- `components/general/sign-up.js` - Sign-up component with Google Auth
- `components/auth/no-tenant-access.js` - Component for users without tenant access
- `app/api/auth/create-google-user/route.js` - API endpoint for creating user entries

#### Server-Side Integration

Google Auth users are automatically integrated with the existing tenant system:

- User tokens are validated server-side using Firebase Admin SDK
- Tenant access control works the same for Google Auth users
- All existing API routes and hooks work seamlessly
- User entries are created in Firestore users collection
- Admin can assign tenants to Google Auth users through existing admin interface

#### Admin Workflow

1. **User signs up with Google**: Creates entry in users collection with `tenant: null`
2. **Admin receives notification**: User appears in admin dashboard
3. **Admin assigns tenant**: Uses existing user management interface
4. **User gains access**: Can now access tenant-specific features

### Architecture

- **Client-side Firebase SDK**: Handles user authentication (login, logout, session management)
- **Server-side Firebase Admin SDK**: Validates tokens and enforces tenant access control
- **API Routes**: Protected endpoints that require tenant authentication
- **React Hooks**: Custom hooks for managing authentication state and making authenticated requests

### Key Components

#### Server-Side (Admin SDK)
- `lib/firebase/admin.js` - Firebase Admin SDK initialization
- `lib/firebase/tenant-auth.js` - Token validation and tenant access control
- `app/api/auth/validate/route.js` - Server-side authentication validation
- `app/api/tenant/[tenantId]/data/route.js` - Example protected API route

#### Client-Side (Firebase SDK)
- `lib/firebase/auth-context.js` - React context for authentication state
- `lib/firebase/auth-hooks.js` - Custom hooks for authentication and API calls
- `components/general/tenant-dashboard.js` - Example tenant dashboard component

### Environment Variables

Add these to your `.env.local` file:

```bash
# Existing Firebase config (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# New Firebase Admin SDK config (server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### Getting Firebase Admin SDK Credentials

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values for the environment variables above

### Usage

#### Basic Authentication
```javascript
import { useAuth } from '@/lib/firebase/auth-context';

function MyComponent() {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Welcome, {user.email}!</div>;
}
```

#### Server-Side Validation
```javascript
import { useServerAuth } from '@/lib/firebase/auth-hooks';

function MyComponent() {
  const { serverUser, serverTenant, hasValidTenant } = useServerAuth();
  
  if (!hasValidTenant) return <div>No tenant access</div>;
  
  return <div>Tenant: {serverTenant}</div>;
}
```

#### Making Authenticated API Calls
```javascript
import { useAuthenticatedApi } from '@/lib/firebase/auth-hooks';

function MyComponent() {
  const makeAuthenticatedRequest = useAuthenticatedApi();
  
  const fetchData = async () => {
    try {
      const data = await makeAuthenticatedRequest(
        `/api/tenant/${tenantId}/data?tenantId=${tenantId}`
      );
      console.log(data);
    } catch (error) {
      console.error('API call failed:', error);
    }
  };
}
```

#### Creating Protected API Routes
```javascript
import { withTenantAuth } from '@/lib/firebase/tenant-auth';

async function handler(req, res) {
  // req.user contains validated user info
  // req.tenantId contains the validated tenant ID
  
  const data = await getTenantSpecificData(req.tenantId);
  return res.json(data);
}

export const GET = withTenantAuth(handler);
```

### Data Structure

#### Users Collection
```javascript
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "tenant": "tenant-123"
}
```

#### Tenants Collection
```javascript
{
  "id": "tenant-123",
  "name": "Acme Corp",
  "status": "active"
}
```

### Security Features

- **Token Validation**: All API requests validate Firebase ID tokens server-side
- **Tenant Isolation**: Users can only access data from their assigned tenant
- **Automatic Validation**: Client-side hooks automatically validate with server
- **Error Handling**: Comprehensive error handling for authentication failures

### Demo

Visit `/tenant-dashboard` to see the multi-tenant system in action.

## Development

Use Node.js 22.13 or later and install the versions recorded in the lockfile with
`npm ci`. The site uses Next.js 16, React 19, and Turbopack. MDX plugins are listed
by package name in `next.config.mjs` so they can run in the bundler's worker.

```bash
npm ci
npm run dev
```

## Article images

Use plain URL strings for every article image, whether the file lives in
`public/` or Firebase Storage. Local paths start at the public root. Do not import
image files or write `{ src, width, height }` objects in articles.

```mdx
export const route = "https://firebasestorage.googleapis.com/...";
export const campsite = "/blog/my-trip/campsite.jpg";

<CenteredImage image={route} altText="Route to the summit" width={1000} />
<TwoCenteredImages image={[route, campsite]} altText={['Route', 'Campsite']} width={500} />
```

`width` sets the display width; omit `height`. The shared MDX plugin reads each
file's actual dimensions and supplies them to the image components, including
carousel photos. Image constants remain strings, so they also work in 360°
viewers, comparison sliders, and links. The JavaScript photo essays use the same
URL strings with their existing cropped image layouts.

`npm run dev` and `npm run build` prepare the dimension cache automatically.
Commit `data/article-image-dimensions.json` along with article changes. Existing
remote images use that cache without network requests; local files are measured
from disk. New images added while the dev server is running are measured when
their MDX page compiles. Visitors do not download this manifest or run the
dimension reader.

Run `npm run images:sync` to save newly added images into the tracked cache, or
`npm run images:sync -- --refresh` after replacing a remote file at the same URL.
Restart the dev server after refreshing existing remote images. A new or
refreshed URL must be reachable; errors identify the image that needs attention.
Run `npm run test:images` for the image compilation checks.

### Article media loading

YouTube link cards use image previews; playable embeds use lazy-loading iframes.
The MDX media plugin also adds `loading="lazy"` to literal iframe tags unless an
article explicitly overrides it. Article cover images keep their loading priority.

Strava activities and charts initialize within 300 pixels of the viewport. Strava
shares one script download and initializes only the activities that have been
reached. Looping article clips attach their source when visible and pause when
scrolled out of view. Supply `width` and `height` in the clip's displayed aspect
ratio to reserve its space before it loads.

Run `npm run test:media` after building to verify these loading defaults and the
Strava script loader's sharing and failure behavior.

360° viewers auto-rotate only while visible in an active tab. After the first drag,
they redraw only when moved or resized. Leaving an article cancels pending image
downloads and releases its graphics resources. All articles use this shared viewer;
no per-article setup is needed. Run `npm run test:panorama` to check rendering,
resizing, cancellation, error handling, and cleanup.

### Search and sharing metadata

The shared metadata helper uses `published`, `updated`, and `author` from
`postMetadata`. Social previews prefer `thumbnailIllustration`, then `thumbnail`,
then the site logo. JSON-LD keeps the article photo and uses absolute image URLs.
Canonical and Open Graph URLs resolve to each page's own route automatically.
Ordinary pages use the `website` type; posts with publication dates use `article`.

`isActive: false` adds `noindex` to draft articles while keeping their URLs usable
for previews. Account management, signup, password reset, and the placeholder
blog projects page also use `noindex`; the public Partners contact/login page
remains indexable. The sitemap reads the built HTML to follow those decisions,
excludes non-page assets, and uses article update dates instead of build dates.
The generated `robots.txt` points to the sitemap and allows crawlers to read
the `noindex` tags. Run `npm run test:seo` after building to verify the output.

## Building

```bash
npm run build
npm start
```

Run `npm run lint` separately; Next.js 16 no longer runs ESLint during builds.
The existing Hooks checks remain enabled. New React Compiler diagnostics about
effects, refs, and mutations are reported as warnings during this migration.

To verify the built site locally, start it on a separate port and run the smoke
tests from another terminal:

```bash
npm run start -- --hostname 127.0.0.1 --port 3216
```

```bash
npm run test:smoke
```

These tests check page rendering, MDX metadata, redirects, password-reset query
parameters, rejection of unauthenticated API requests, and AVIF/WebP image
optimization. They require a local server and do not submit forms or change data.

## Security rules and tests

Partner logins exchange a verified Firebase ID token for a one-day HttpOnly
`partnerSession` cookie. The cookie endpoint checks request origin and token
revocation; server-rendered partner pages verify the session cookie. Existing
valid `idToken` cookies are accepted during migration and removed when the
browser synchronizes its session. Login, signup, and sign-out wait for cookie
updates to succeed. The account-area auth provider observes ID-token changes,
refreshes while active, and resynchronizes when a tab regains focus or connectivity.
Firebase's own persisted User is the source of truth; the old plain-object
`firebase:authUser` cache is no longer treated as authentication.

Partner view tracking uses a restricted Admin SDK transaction that increments
only `views`, by one, on an existing blog record matching the active article's
`partners` metadata. It does not create records or grant public database writes.
The browser suppresses duplicate effect runs for one page visit; later navigation
back to the article counts as another view. These are page views, not unique
visitors. Articles remain statically generated and recording stays asynchronous.

Run `npm run test:partners` for the session, race, tenant-data and tracking checks.
Those tests substitute Firebase boundaries. Run `npm run test:partners:emulator`
to check real session creation/revocation and concurrent counter increments with
the local Auth and Firestore emulators (requires Firebase CLI and Java 21+).
Both suites avoid production accounts and counters. These changes require an
application deployment, with no new Firestore rules or collections.

Admin API routes require a valid Firebase ID token and a `users/{email}` record
assigned to tenant `0`. Changing the tenant in the URL does not grant access.

`firestore.rules` applies the following policy to Firebase client SDK requests:

- Members can read their own profile and records assigned to their tenant.
  Collection queries must filter by that tenant (`tenant == id` for users and
  `tenant array-contains id` for content). Use the same number/string type stored
  in the user's profile.
- Users without an assigned tenant can read only their own profile.
- Only tenant `0` administrators can modify users, tenant assignments, tenants,
  and content, or access the email queue. Admin IDs may be stored as `0` or `"0"`.
- Visitors can create contact messages with the expected fields and bounded
  lengths. Client requests cannot read, overwrite, or delete contact messages.
- Other collections and nested documents are denied by default.

Firebase Admin SDK calls bypass these rules and must enforce authorization on
the server. Server actions using the Firebase client SDK do not inherit the
browser's login; these rules do not give those actions privileged access.

Install dependencies with `npm ci`. The API tests require Node.js 18 or later;
the rules tests also require the Firebase CLI on `PATH` and Java 21. Then run:

```bash
npm run test:security
```

The rules suite uses only the local emulator and the
`demo-nashbrowns-security` project. It does not use production data or credentials.
Run just the API tests with `npm run test:security:api`.

Deploy the application normally to activate the API changes. Firestore rules
require a separate deployment; an application deployment does not publish them.
After selecting the intended Firebase project, deploy only the rules:

```bash
firebase deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```
