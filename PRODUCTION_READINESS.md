# Semsem production readiness

## What changed

- Mobile API calls now share bounded retry behavior: GET requests can retry twice with exponential backoff; mutations are never retried; aborted requests are excluded. The first request while the backend is not known to be awake gets a 105 second cold-start window, while normal calls and subsequent attempts use 25 seconds.
- Startup issues one bounded `GET /api/health` check without holding navigation open. The app shows a connection/offline banner, retries health when it returns to the foreground or network, serves cached posts and unread counts, and deduplicates in-flight feed and badge requests.
- The backend binds its port before connecting to Atlas, retries initial Atlas connection failures, reuses Mongoose's process connection/pool, reports DB readiness on `/api/health`, and has compound indexes for the existing feed/count queries.
- `/api/app-version/check` is public and read-only. Policy reads/changes are under the existing admin-authenticated `/api/admin/app-version` routes.
- Expo OTA config uses the `appVersion` runtime policy, automatic startup checks/downloads, and production, preview, and development EAS channels. A real EAS project ID must be connected before EAS builds or OTA publishing can work.

## Backend deployment

Deploy the existing `backend` service on Render with root directory `backend`, build command `npm install`, and start command `npm start`. Keep the Render assigned `PORT`; configure these secrets/environment values in the Render dashboard:

The currently deployed Render service returned `404` for `/api/health` during this review, which confirms the code in this workspace has not been deployed there yet. Deploy this backend before shipping a mobile build that depends on the health and version-check routes. Set Render's health-check path to `/api/health` if you use Render health checks.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB Atlas connection string; allow Render outbound access in Atlas network access. |
| `JWT_SECRET` | Yes | Strong random secret. |
| `JWT_EXPIRES_IN` | Recommended | Existing token lifetime, for example `7d`. |
| `CLOUDINARY_URL` | If image uploads are enabled | Existing Cloudinary integration. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Alternative | Use these instead of `CLOUDINARY_URL`. |

Render's free instance still sleeps after inactivity. The first user request or app startup health check wakes it; this implementation does not ping continuously. The startup health response is `503` while Atlas is connecting, then `200` with `{"status":"ok","database":"connected"}`. A free instance can still take up to Render's cold-start interval, so longer cold-start API budgets are bounded but may keep an individual loading state visible for a while.

## Initial app-version policy

After the backend has deployed and MongoDB is connected, the endpoint falls back to this safe initial policy if the document has not yet been written:

- Android latest/minimum: `1.0.0`; Play Store URL is prefilled.
- iOS latest/minimum: `1.0.0`; store URL stays blank until the real App Store listing exists.
- No update popup is shown when installed/latest/minimum are all `1.0.0`.

An administrator can inspect policy:

```sh
curl -H "Authorization: Bearer ADMIN_JWT" \
  https://YOUR_API_HOST/api/admin/app-version
```

Update one platform with the existing admin JWT:

```sh
curl -X PATCH https://YOUR_API_HOST/api/admin/app-version/android \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"latestVersion":"1.1.0","minimumSupportedVersion":"1.0.0","updateMessage":"A new version of Semsem is available.","storeUrl":"https://play.google.com/store/apps/details?id=com.semsem.pets"}'
```

For an optional update, publish the store release first, then set `latestVersion` to the released version and leave `minimumSupportedVersion` unchanged. For a mandatory update, first confirm the replacement version is available in that platform's store, then set `latestVersion` and `minimumSupportedVersion` to that released version. To stop requiring the new version, lower the minimum policy. Policies are independent for iOS and Android. iOS `storeUrl` must be the real listing URL; do not set a fabricated numeric App Store ID. Policy writes require `admin` role and active status. Versions are validated and minimum cannot exceed latest.

The admin API accepts only `latestVersion`, `minimumSupportedVersion`, `updateMessage`, and `storeUrl`. It does not offer a public or unauthenticated write route.

## Expo and EAS setup

The native identifiers and `1.0.0` version are set in `mobile/app.json`. `mobile/app.config.js` reads the EAS project ID from `EAS_PROJECT_ID` (or `EXPO_PUBLIC_EAS_PROJECT_ID`) and uses it for the Expo Updates URL. No project ID exists in the checked-in project yet. Once signed into the intended Expo account, run from `mobile`:

```sh
npx eas-cli@latest project:init
```

Use the resulting project ID as `EAS_PROJECT_ID` for local EAS commands and as an EAS build environment variable for builds. Confirm `npx expo config --json` shows `updates.url` as `https://u.expo.dev/<your-project-id>` and `extra.eas.projectId` before creating store binaries. The project ID is an identifier, not a secret.

Create native builds for each profile; native config/library changes require a new store build. Build channels are `development`, `preview`, and `production`; preview is internal distribution.

## Publishing OTA JavaScript/assets updates

OTA requires a previously installed binary with `expo-updates`, a matching runtime, and the intended channel. After EAS project initialization and login:

```sh
cd mobile
npx eas-cli@latest update --channel preview --message "Preview update"
npx eas-cli@latest update --channel production --message "Production update"
```

Test on preview builds first. Published compatible updates download automatically in the background and apply on the next launch, per Expo Updates startup behavior. Native module/dependency changes, permissions, app identifiers, or any incompatible native runtime change require a new Google Play/App Store binary. The runtime policy is `appVersion`; increment the app version for each native store release so updates cannot cross incompatible app versions.

## Verification checklist

1. `GET /api/health` before Atlas readiness returns `503`; when connected it returns `200`.
2. Use the admin PATCH route to check 1.0.0/latest 1.0.0 (no popup), latest 1.1.0/minimum 1.0.0 (optional), latest/minimum 1.1.0 on installed 1.0.0 (mandatory), and installed 1.2.0/minimum 1.1.0 (no mandatory update).
3. `1.10.0` compares newer than `1.9.0`; backend semantic comparison is also directly checkable with `node -e "const {compareVersions}=require('./src/services/appVersionService'); console.log(compareVersions('1.10.0','1.9.0'))"` from `backend` (expected `1`).
4. Test an actual Android/iOS preview build with backend available, then airplane mode, then network restoration. Verify cached home content remains, health rechecks after restoration, and mutations are not replayed.
5. Test optional dismissal and mandatory modal behavior on device. Android should open Google Play. Set iOS store URL only after the listing is live, then verify App Store opens.
6. Publish an OTA update to preview with matching runtime and verify the new bundle after relaunch; repeat on production only after preview succeeds.

Live Render cold-start, Atlas failover, store redirects, and EAS OTA delivery require the deployed service, real store listing, Expo account/project, and native device builds; they cannot be proven from this local source checkout alone.
