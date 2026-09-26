// app.config.js
//
// Dynamic config, so an EAS build profile can produce a variant of the same app.
//
// WHY THIS FILE EXISTS. The bundle identifier lives in the APP config, not in eas.json.
// Putting `bundleIdentifier` under build.development.ios (or `applicationId` under
// build.development.android) fails schema validation -- EAS rejects the build with
// "build.development.ios.bundleIdentifier is not allowed". The supported pattern for a
// managed / CNG project is to set an env var on the build profile and read it here.
//
// APP_VARIANT=development is set in eas.json under build.development.env. It produces a
// SEPARATE app: its own bundle identifier and Android package, so the dev build installs
// ALONGSIDE the App Store build instead of replacing it, plus its own display name so the
// two home-screen icons can be told apart. Any other value -- including unset, which is the
// case for the preview and production profiles and for every local command -- returns the
// production config completely untouched.
//
// app.json remains the single source of truth for everything else. Expo reads it first and
// passes it in as `config`; only the variant fields below are overridden, so slug,
// extra.eas.projectId, plugins, icons and version all keep flowing from app.json.
//
// NOTE ON `scheme`: deliberately NOT changed for the dev variant. src/screens/Auth.tsx:85
// hardcodes `redirectTo: 'fireside://auth/reset-password'`, so giving the dev build its own
// scheme would send password-reset links to the production app. Both apps therefore register
// fireside://, and iOS resolves that collision in an undefined way -- so open the dev build
// from its home-screen icon rather than relying on a QR/link handoff. Making the scheme
// per-variant means making that redirect dynamic too; left as a deliberate follow-up.

const DEV_APP_ID = 'com.msedlak40.firesidemobile.dev';
const DEV_DISPLAY_NAME = 'Fireside Dev';

module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;

  return {
    ...config,
    name: DEV_DISPLAY_NAME,
    ios: {
      ...config.ios,
      bundleIdentifier: DEV_APP_ID,
      infoPlist: {
        ...(config.ios && config.ios.infoPlist),
        // app.json sets CFBundleDisplayName, and it wins over `name` on the home screen,
        // so it has to be overridden too or both icons read "Fireside180°".
        CFBundleDisplayName: DEV_DISPLAY_NAME,
      },
    },
    android: {
      ...config.android,
      package: DEV_APP_ID,
    },
  };
};
