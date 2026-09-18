> [!WARNING]  
> Use at your own risk. Kalo is a self-hosted, open source scheduling platform. It is strictly recommended for personal, non-production use. Please review all installation and configuration steps carefully. Self-hosting requires advanced knowledge of server administration, database management, and securing sensitive data. Proceed only if you are comfortable with these responsibilities.

<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/malingib/kalo">
   <img src="https://user-images.githubusercontent.com/8019099/210054112-5955e812-a76e-4160-9ddd-58f2c72f1cce.png" alt="Logo">
  </a>

  <h3 align="center">Kalo</h3>

  <p align="center">
    The self-hosted, open-source scheduling platform.
    <br />
    <a href="https://github.com/malingib/kalo"><strong>GitHub</strong></a>
    <br />
    <a href="https://github.com/malingib/kalo/issues">Issues</a>
    &middot;
    <a href="./CONTRIBUTING.md">Contributing</a>
  </p>
</p>

<p align="center">
   <a href="https://github.com/malingib/kalo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="License"></a>
   <a href="https://github.com/malingib/kalo/stargazers"><img src="https://img.shields.io/github/stars/malingib/kalo" alt="Github Stars"></a>
   <a href="https://github.com/malingib/kalo/pulse"><img src="https://img.shields.io/github/commit-activity/m/malingib/kalo" alt="Commits-per-month"></a>
   <a href="https://github.com/malingib/kalo/issues?q=is:issue+is:open+label:%22%F0%9F%99%8B%F0%9F%8F%BB%E2%80%8D%E2%99%82%EF%B8%8Fhelp+wanted%22"><img src="https://img.shields.io/badge/Help%20Wanted-Contribute-blue"></a>
   <a href="https://contributor-covenant.org/version/1/4/code-of-conduct/"><img src="https://img.shields.io/badge/Contributor%20Covenant-1.4-purple" /></a>
</p>

<!-- ABOUT THE PROJECT -->

## About Kalo

**Kalo** is a self-hosted, fully open-source scheduling platform, free of commercial/enterprise code.

Kalo is **100% MIT-licensed** with no proprietary "Enterprise Edition" features. It's designed for individuals and self-hosters who want full control over their scheduling infrastructure without any commercial dependencies.

> **Note:** Kalo is a self-hosted project. There is no hosted/managed version. You run it on your own infrastructure.

### Built With

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [React.js](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma.io](https://prisma.io/)
- [Daily.co](https://daily.co/)

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here’s what you need to run Kalo.

- Node.js (Version: >=18.x)
- PostgreSQL (Version: >=13.x)
- Yarn _(recommended)_

> If you want to enable any of the available integrations, you may want to obtain additional credentials for each one. More details on this can be found below under the [integrations section](#integrations).

## Development

### Setup

1. Clone the repo (or fork https://github.com/malingib/kalo/fork)

   ```sh
   git clone https://github.com/malingib/kalo.git
   ```

   > If you are on Windows, run the following command in Git Bash with admin privileges:
   > `git clone -c core.symlinks=true https://github.com/malingib/kalo.git`

2. Go to the project folder

   ```sh
   cd kalo
   ```

3. Install packages with yarn

   ```sh
   yarn
   ```

4. Set up your `.env` file

   - Duplicate `.env.example` to `.env`
   - Use `openssl rand -base64 32` to generate a key and add it under `NEXTAUTH_SECRET` in the `.env` file.
   - Use `openssl rand -base64 24` to generate a key and add it under `CALENDSO_ENCRYPTION_KEY` in the `.env` file.

 > **Windows users:** Replace the `packages/prisma/.env` symlink with a real copy to avoid a Prisma error (`unexpected character / in variable name`):
 >
 > ```sh
 > # Git Bash / WSL
 > rm packages/prisma/.env && cp .env packages/prisma/.env
 > ```

5. Set up Node
   If your Node version does not meet the project's requirements as instructed by the docs, "nvm" (Node Version Manager) allows using Node at the version required by the project:

   ```sh
   nvm use
   ```

   You first might need to install the specific version and then use it:

   ```sh
   nvm install && nvm use
   ```

   You can install nvm from [here](https://github.com/nvm-sh/nvm).

#### Quick start with `yarn dx`

> - **Requires Docker and Docker Compose to be installed**
> - Will start a local Postgres instance with a few test users - the credentials will be logged in the console

```sh
yarn dx
```

**Default credentials created:**

| Email | Password | Role |
|-------|----------|------|
| `free@example.com` | `free` | Free user |
| `pro@example.com` | `pro` | Pro user |
| `trial@example.com` | `trial` | Trial user |
| `admin@example.com` | `ADMINadmin2022!` | Admin user |
| `onboarding@example.com` | `onboarding` | Onboarding incomplete |

You can use any of these credentials to sign in at [http://localhost:3000](http://localhost:3000)

> **Tip**: To view the full list of seeded users and their details, run `yarn db-studio` and visit [http://localhost:5555](http://localhost:5555)

#### Development tip

1. Add `export NODE_OPTIONS="--max-old-space-size=16384"` to your shell script to increase the memory limit for the node process. Alternatively, you can run this in your terminal before running the app. Replace 16384 with the amount of RAM you want to allocate to the node process.

2. Add `NEXT_PUBLIC_LOGGER_LEVEL={level}` to your .env file to control the logging verbosity for all tRPC queries and mutations.\
   Where {level} can be one of the following:

   `0` for silly \
   `1` for trace \
   `2` for debug \
   `3` for info \
   `4` for warn \
   `5` for error \
   `6` for fatal

   When you set `NEXT_PUBLIC_LOGGER_LEVEL={level}` in your .env file, it enables logging at that level and higher. Here's how it works:

   The logger will include all logs that are at the specified level or higher. For example: \

   - If you set `NEXT_PUBLIC_LOGGER_LEVEL=2`, it will log from level 2 (debug) upwards, meaning levels 2 (debug), 3 (info), 4 (warn), 5 (error), and 6 (fatal) will be logged. \
   - If you set `NEXT_PUBLIC_LOGGER_LEVEL=3`, it will log from level 3 (info) upwards, meaning levels 3 (info), 4 (warn), 5 (error), and 6 (fatal) will be logged, but level 2 (debug) and level 1 (trace) will be ignored. \

```sh
echo 'NEXT_PUBLIC_LOGGER_LEVEL=3' >> .env
```

for Logger level to be set at info, for example.

#### Gitpod Setup

1. Click the button below to open this project in Gitpod.

2. This will open a fully configured workspace in your browser with all the necessary dependencies already installed.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/malingib/kalo)

#### Manual setup

1. Configure environment variables in the `.env` file. Replace `<user>`, `<pass>`, `<db-host>`, and `<db-port>` with their applicable values

   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   ```

   <details>
   <summary>If you don't know how to configure the DATABASE_URL, then follow the steps here to create a quick local DB</summary>

   1. [Download](https://www.postgresql.org/download/) and install PostgreSQL locally (if you don't have it already).

   2. Create your own local db by executing `createDB <DB name>`

   3. Now open your psql shell with the DB you created: `psql -h localhost -U postgres -d <DB name>`

   4. Inside the psql shell execute `\conninfo`. And you will get the following info.
      ![image](https://user-images.githubusercontent.com/39329182/236612291-51d87f69-6dc1-4a23-bf4d-1ca1754e0a35.png)

   5. Now extract all the info and add it to your DATABASE_URL. The url would look something like this
      `postgresql://postgres:postgres@localhost:5432/Your-DB-Name`. The port is configurable and does not have to be 5432.

   </details>

   If you don't want to create a local DB. Then you can also consider using services like railway.app, Northflank or render.
   

   - [Setup postgres DB with railway.app](https://docs.railway.app/guides/postgresql)
   - [Setup postgres DB with Northflank](https://northflank.com/guides/deploy-postgres-database-on-northflank)
   - [Setup postgres DB with render](https://render.com/docs/databases)

2. Copy and paste your `DATABASE_URL` from `.env` to `.env.appStore`.

3. Set up the database using the Prisma schema (found in `packages/prisma/schema.prisma`)

   In a development environment, run:

   ```sh
   yarn workspace @kalo/prisma db-migrate
   ```

   In a production environment, run:

   ```sh
   yarn workspace @kalo/prisma db-deploy
   ```

  **Note for Windows/PowerShell users:** If running the database deployment scripts fails with an error stating `Environment variable not found: DATABASE_DIRECT_URL`, Turbo might be failing to inject the root `.env` variables. You can bypass this by executing the commands directly from the prisma package directory in PowerShell:

```powershell
cd packages/prisma
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"; $env:DATABASE_DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
npx prisma db push
cd ../..
```
   
4. Run [mailhog](https://github.com/mailhog/MailHog) to view emails sent during development

   > **_NOTE:_** Required when `E2E_TEST_MAILHOG_ENABLED` is "1"

   ```sh
   docker pull mailhog/mailhog
   docker run -d -p 8025:8025 -p 1025:1025 mailhog/mailhog
   ```

5. Run (in development mode)

   ```sh
   yarn dev
   ```

#### Setting up your first user

##### Approach 1

1. Open [Prisma Studio](https://prisma.io/studio) to look at or modify the database content:

   ```sh
   yarn db-studio
   ```

1. Click on the `User` model to add a new user record.
1. Fill out the fields `email`, `username`, `password`, and set `metadata` to empty `{}` (remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)) and click `Save 1 Record` to create your first user.
   > New users are set on a `TRIAL` plan by default. You might want to adjust this behavior to your needs in the `packages/prisma/schema.prisma` file.
1. Open a browser to [http://localhost:3000](http://localhost:3000) and login with your just created, first user.

##### Approach 2

Seed the local db by running

```sh
cd packages/prisma
yarn db-seed
```

The above command will populate the local db with dummy users.

### E2E-Testing

Be sure to set the environment variable `NEXTAUTH_URL` to the correct value. If you are running locally, as the documentation within `.env.example` mentions, the value should be `http://localhost:3000`.

```sh
# In a terminal just run:
yarn test-e2e

# To open the last HTML report run:
yarn playwright show-report test-results/reports/playwright-html-report
```

#### Resolving issues

##### E2E test browsers not installed

Run `npx playwright install` to download test browsers and resolve the error below when running `yarn test-e2e`:

```
Executable doesn't exist at /Users/alice/Library/Caches/ms-playwright/chromium-1048/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

### Upgrading from earlier versions

1. Pull the current version:

   ```sh
   git pull
   ```

1. Check if dependencies got added/updated/removed

   ```sh
   yarn
   ```

1. Apply database migrations by running <b>one of</b> the following commands:

   In a development environment, run:

   ```sh
   yarn workspace @kalo/prisma db-migrate
   ```

   (This can clear your development database in some cases)

   In a production environment, run:

   ```sh
   yarn workspace @kalo/prisma db-deploy
   ```

1. Check for `.env` variables changes

   ```sh
   yarn predev
   ```

1. Start the server. In a development environment, just do:

   ```sh
   yarn dev
   ```

   For a production build, run for example:

   ```sh
   yarn build
   yarn start
   ```

1. Enjoy the new version.

<!-- DEPLOYMENT -->

## Deployment

### Self-hosted (production)

Kalo runs as standard Node.js and Next.js processes against a hosted PostgreSQL database. There is no Docker image.

#### Requirements

- Node.js 18+ (or the version pinned in .nvmrc)
- A PostgreSQL 13+ database (hosted, e.g. Railway, Northflank, Render, Neon, or Supabase)
- A Redis instance (REDIS_URL) for caching and job queues
- An S3-compatible bucket (S3_* env vars) for file uploads

#### Build and run

1. Clone the repository and install dependencies:

   `ash
   git clone https://github.com/malingib/kalo.git
   cd kalo
   yarn
   `

2. Copy .env.example to .env and configure it.

   **Required Secret Keys**

   Generate secure values for NEXTAUTH_SECRET and CALENDSO_ENCRYPTION_KEY:

   `ash
   openssl rand -base64 32
   openssl rand -base64 24
   `

   **Push Notifications (VAPID Keys)**
   If you see an error like:

   `
   Error: No key set vapidDetails.publicKey
   `

   Your environment variables for Web Push are missing. Generate them with:

   `ash
   npx web-push generate-vapid-keys
   `

   Then set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.

3. Apply database migrations:

   `ash
   yarn workspace @kalo/prisma db-deploy
   `

4. Build the web app:

   `ash
   yarn build
   `

5. Start the server:

   `ash
   yarn start
   `

   Open a browser to [http://localhost:3000](http://localhost:3000), or your defined NEXT_PUBLIC_WEBAPP_URL. The first time you run Kalo, a setup wizard will initialize. Define your first user, and you're ready to go!

   **Note for first-time setup (Calendar integration)**: During the setup wizard, you may encounter a "Connect your Calendar" step that appears to be required. If you do not wish to connect a calendar at this time, you can skip this step by navigating directly to the dashboard at <NEXT_PUBLIC_WEBAPP_URL>/event-types. Calendar integrations can be added later from the Settings > Integrations page.

#### Important Run-time variables

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| DATABASE_URL | PostgreSQL connection string with credentials - if using a connection pooler, this setting should point there | required | postgresql://unicorn_user:magical_password@localhost:5432/kalo |
| NEXT_PUBLIC_WEBAPP_URL | Base URL of the site | required | http://localhost:3000 |
| NEXTAUTH_URL | Location of the auth server | optional | {NEXT_PUBLIC_WEBAPP_URL}/api/auth |
| NEXTAUTH_SECRET | Cookie encryption key. Generate with: openssl rand -base64 32 | required | secret |
| CALENDSO_ENCRYPTION_KEY | Authentication encryption key (32 bytes for AES256). Generate with: openssl rand -base64 24 | required | secret |
| REDIS_URL | Redis connection string for caching and job queues | required | |

#### Updating Kalo

1. Pull the latest changes:

   `ash
   git pull
   `

2. Install any new dependencies:

   `ash
   yarn
   `

3. Apply database migrations:

   `ash
   yarn workspace @kalo/prisma db-deploy
   `

4. Rebuild and restart:

   `ash
   yarn build
   yarn start
   `

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/cal)

You can deploy Kalo on [Railway](https://railway.app). The team at Railway also have a [detailed blog post](https://blog.railway.app/p/calendso) on deploying on their platform.

### Northflank

[![Deploy on Northflank](https://assets.northflank.com/deploy_to_northflank_smm_36700fb050.svg)](https://northflank.com/stacks/deploy-calcom)

You can deploy Kalo on [Northflank](https://northflank.com). The team at Northflank also have a [detailed blog post](https://northflank.com/guides/deploy-calcom-with-northflank) on deploying on their platform.

### Vercel

Currently Vercel Pro Plan is required to be able to Deploy this application with Vercel, due to limitations on the number of serverless functions on the free plan.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmalingib%2Fkalo&env=DATABASE_URL,NEXT_PUBLIC_WEBAPP_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,CRON_API_KEY,CALENDSO_ENCRYPTION_KEY&envDescription=See%20all%20available%20env%20vars&envLink=https%3A%2F%2Fgithub.com%2Fmalingib%2Fkalo%2Fblob%2Fmain%2F.env.example&project-name=kalo&repo-name=kalo&build-command=cd%20../..%20%26%26%20yarn%20build&root-directory=apps%2Fweb%2F)

### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/malingib/kalo)

### Elestio

[![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/cal.com)

<!-- LICENSE -->

## License

Kalo is fully open source, licensed under the [MIT License](https://opensource.org/license/mit).

Kalo has **no commercial/enterprise code**. The entire codebase is available under the same open-source license.

## Enabling Content Security Policy

- Set CSP_POLICY="non-strict" env variable, which enables [Strict CSP](https://web.dev/strict-csp/) except for `unsafe-inline` in `style-src`. If you have custom changes in your instance, you may need to modify your code to make it CSP-compatible. Currently, strict CSP is enabled only on the login page. On other SSR pages, it is enabled in report-only mode to detect potential issues. It is not yet supported on SSG pages.

## Integrations

### Obtaining the Google API Credentials

1. Open [Google API Console](https://console.cloud.google.com/apis/dashboard). If you don't have a project in your Google Cloud subscription, you'll need to create one before proceeding further. Under Dashboard pane, select Enable APIS and Services.
2. In the search box, type calendar and select the Google Calendar API search result.
3. Enable the selected API.
4. Next, go to the [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) from the side pane. Select the app type (Internal or External) and enter the basic app details on the first page.
5. In the second page on Scopes, select Add or Remove Scopes. Search for Calendar.event and select the scope with scope value `.../auth/calendar.events`, `.../auth/calendar.readonly` and select Update.
6. In the third page (Test Users), add the Google account(s) you'll be using. Make sure the details are correct on the last page of the wizard and your consent screen will be configured.
7. Now select [Credentials](https://console.cloud.google.com/apis/credentials) from the side pane and then select Create Credentials. Select the OAuth Client ID option.
8. Select Web Application as the Application Type.
9. Under Authorized redirect URI's, select Add URI and then add the URI `<Kalo URL>/api/integrations/googlecalendar/callback` and `<Kalo URL>/api/auth/callback/google` replacing Kalo URL with the URI at which your application runs.
10. The key will be created and you will be redirected back to the Credentials page. Select the newly generated client ID under OAuth 2.0 Client IDs.
11. Select Download JSON. Copy the contents of this file and paste the entire JSON string in the `.env` file as the value for `GOOGLE_API_CREDENTIALS` key.

#### _Adding google calendar to Kalo App Store_

After adding Google credentials, you can now add the Google Calendar app to the App Store.
You can repopulate the App Store by running

```
cd packages/prisma
yarn seed-app-store
```

You will need to complete a few more steps to activate Google Calendar App.
Make sure to complete section "Obtaining the Google API Credentials". After that do the
following

1. Add extra redirect URL `<Kalo URL>/api/auth/callback/google`
1. Under 'OAuth consent screen', click "PUBLISH APP"

### Obtaining Microsoft Graph Client ID and Secret

1. Open [Azure App Registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) and select New registration
2. Name your application
3. Set **Who can use this application or access this API?** to **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
4. Set the **Web** redirect URI to `<Kalo URL>/api/integrations/office365calendar/callback` replacing Kalo URL with the URI at which your application runs.
5. Use **Application (client) ID** as the **MS_GRAPH_CLIENT_ID** attribute value in .env
6. Click **Certificates & secrets** create a new client secret and use the value as the **MS_GRAPH_CLIENT_SECRET** attribute

### Obtaining Zoom Client ID and Secret

1. Open [Zoom Marketplace](https://marketplace.zoom.us/) and sign in with your Zoom account.
2. On the upper right, click "Develop" => "Build App".
3. Select "General App" , click "Create".
4. Name your App.
5. Choose "User-managed app" for "Select how the app is managed".
6. De-select the option to publish the app on the Zoom App Marketplace, if asked.
7. Now copy the Client ID and Client Secret to your `.env` file into the `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` fields.
8. Set the "OAuth Redirect URL" under "OAuth Information" as `<Kalo URL>/api/integrations/zoomvideo/callback` replacing Kalo URL with the URI at which your application runs.
9. Also add the redirect URL given above as an allow list URL and enable "Subdomain check". Make sure, it says "saved" below the form.
10. You don't need to provide basic information about your app. Instead click on "Scopes" and then on "+ Add Scopes". On the left,
    1. click the category "Meeting" and check the scope `meeting:write:meeting`.
    2. click the category "User" and check the scope `user:read:settings`.
11. Click "Done".
12. You're good to go. Now you can easily add your Zoom integration in the Kalo settings.

### Obtaining Daily API Credentials

1. Open [Daily.co](https://daily.co/) and create an account.
2. From within your dashboard, go to the [developers](https://dashboard.daily.co/developers) tab.
3. Copy your API key.
4. Now paste the API key to your `.env` file into the `DAILY_API_KEY` field in your `.env` file.
5. If you have the [Daily Scale Plan](https://daily.co/pricing) set the `DAILY_SCALE_PLAN` variable to `true` in order to use features like video recording.

### Obtaining Basecamp Client ID and Secret

1. Visit the [37 Signals Integrations Dashboard](launchpad.37signals.com/integrations) and sign in.
2. Register a new application by clicking the Register one now link.
3. Fill in your company details.
4. Select Basecamp 4 as the product to integrate with.
5. Set the Redirect URL for OAuth `<Kalo URL>/api/integrations/basecamp3/callback` replacing Kalo URL with the URI at which your application runs.
6. Click on done and copy the Client ID and secret into the `BASECAMP3_CLIENT_ID` and `BASECAMP3_CLIENT_SECRET` fields.
7. Set the `BASECAMP3_CLIENT_SECRET` env variable to `{your_domain} ({support_email})`.

### Obtaining HubSpot Client ID and Secret

1. Open [HubSpot Developer](https://developer.hubspot.com/) and sign into your account, or create a new one.
2. From within the home of the Developer account page, go to "Manage apps".
3. Click "Create legacy app" button top right and select public app.
4. Fill in any information you want in the "App info" tab
5. Go to tab "Auth"
6. Now copy the Client ID and Client Secret to your `.env` file into the `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` fields.
7. Set the Redirect URL for OAuth `<Kalo URL>/api/integrations/hubspot/callback` replacing Kalo URL with the URI at which your application runs.
8. In the "Scopes" section at the bottom of the page, make sure you select "Read" and "Write" for scopes called `crm.objects.contacts` and `crm.lists`.
9. Click the "Save" button at the bottom footer.
10. You're good to go. Now you can see any booking in Kalo created as a meeting in HubSpot for your contacts.

### Obtaining Webex Client ID and Secret

[See Webex Readme](./packages/app-store/webex/)

### Obtaining ZohoCRM Client ID and Secret

1. Open [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.
2. From within the API console page, go to "Applications".
3. Click "ADD CLIENT" button top right and select "Server-based Applications".
4. Fill in any information you want in the "Client Details" tab
5. Go to tab "Client Secret" tab.
6. Now copy the Client ID and Client Secret to your `.env` file into the `ZOHOCRM_CLIENT_ID` and `ZOHOCRM_CLIENT_SECRET` fields.
7. Set the Redirect URL for OAuth `<Kalo URL>/api/integrations/zohocrm/callback` replacing Kalo URL with the URI at which your application runs.
8. In the "Settings" section check the "Multi-DC" option if you wish to use the same OAuth credentials for all data centers.
9. Click the "Save"/ "UPDATE" button at the bottom footer.
10. You're good to go. Now you can easily add your ZohoCRM integration in the Kalo settings.

### Obtaining Zoho Calendar Client ID and Secret

[Follow these steps](./packages/app-store/zohocalendar/)

### Obtaining Zoho Bigin Client ID and Secret

[Follow these steps](./packages/app-store/zoho-bigin/)

### Obtaining Pipedrive Client ID and Secret

[Follow these steps](./packages/app-store/pipedrive-crm/)

### Rate Limiting with Unkey

Kalo uses [Unkey](https://unkey.com) for rate limiting. This is an optional feature and is not required for self-hosting.

If you want to enable rate limiting:

1. Sign up for an account at [unkey.com](https://unkey.com)
2. Create a Root key with permissions for
   `ratelimit.create_namespace` and `ratelimit.limit`
3. Copy the root key to your `.env` file into the `UNKEY_ROOT_KEY` field

Note: If you don't configure Unkey, Kalo will work normally without rate limiting enabled.

## Contributing

We welcome contributions! Whether it's fixing a typo, improving documentation, or building new features, your help makes Kalo better.

> **Important:** Kalo is a self-hosted, community-maintained project. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

- Check out our [Contributing Guide](./CONTRIBUTING.md) for detailed steps.
- Please follow our coding standards and commit message conventions to keep the project consistent.

Even small improvements matter — thank you for helping us grow!

### Good First Issues

We have a list of [help wanted](https://github.com/malingib/kalo/issues?q=is:issue+is:open+label:%22%F0%9F%99%8B%F0%9F%8F%BB%E2%80%8D%E2%99%82%EF%B8%8Fhelp+wanted%22) that contain small features and bugs which have a relatively limited scope. This is a great place to get started, gain experience, and get familiar with our contribution process.

<!-- CONTRIBUTORS -->

### Contributors

<a href="https://github.com/malingib/kalo/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=malingib/kalo" />
</a>

<!-- TRANSLATIONS -->

### Translations

Don't code but still want to contribute? help translate Kalo into your language.

<!-- ACKNOWLEDGEMENTS -->

## Acknowledgements

Kalo is built on a fork of the Cal.com open source project and the many contributors to the original project. Special thanks to:

- [Vercel](https://vercel.com/)
- [Next.js](https://nextjs.org/)
- [Day.js](https://day.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
