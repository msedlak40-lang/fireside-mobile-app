// src/lib/textScaling.ts
//
// App-wide Dynamic Type strategy (RN 0.81 + React 19).
//
// React 19 removed `defaultProps` support for function components, and RN's
// `Text` is now a plain function component (no `forwardRef`, so no `.render` to
// patch). The one mechanism that still works app-wide is redefining the
// `react-native` `Text`/`TextInput` export getters at entry: Babel compiles
// `import { Text }` to a lazy, use-site access (`_reactNative.Text`), so a
// getter override on the shared module object propagates to every render.
//
// Import this module for its side effect BEFORE the app renders (see index.js).
//
// Two levers:
//   • Global net  — every <Text>/<TextInput> defaults to CONTENT_MAX_SCALE (2.0)
//     unless it explicitly sets its own maxFontSizeMultiplier. Reading content
//     (Scripture, summaries, devotion copy) is left at this generous cap so a
//     low-vision user can scale it large.
//   • Chrome cap  — Category A chrome sites explicitly pass
//     maxFontSizeMultiplier={CHROME_MAX_SCALE} (1.2). Because an explicit prop
//     overrides the default, chrome caps tighter WITHOUT the cap ever leaking
//     onto content (it's a per-instance prop, not inherited style).

import React from 'react';

export const CONTENT_MAX_SCALE = 2.0;
export const CHROME_MAX_SCALE = 1.2;

// The real react-native module object (shared, cached). Using require (not an
// `import * as`) is deliberate: an `import *` triggers interop that can copy the
// namespace, and we must patch the same object every screen reads from.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN: any = require('react-native');

const PATCH_FLAG = '__fireside_font_scale_patched';

function makeCapped(Original: any, defaultCap: number) {
  function Capped(props: any) {
    // React 19 delivers `ref` as a normal prop to function components; spreading
    // props preserves it. An explicit maxFontSizeMultiplier (e.g. the 1.2 chrome
    // cap) wins over the default via the nullish coalesce.
    return React.createElement(Original, {
      maxFontSizeMultiplier: props?.maxFontSizeMultiplier ?? defaultCap,
      ...props,
    });
  }
  Capped.displayName = `Capped(${Original?.displayName || Original?.name || 'Component'})`;
  (Capped as any)[PATCH_FLAG] = true;
  return Capped;
}

function patch(key: 'Text' | 'TextInput') {
  const current = RN[key];
  // Guard against double-patching (e.g. Fast Refresh re-running this module),
  // which would otherwise capture the already-patched component and recurse.
  if (!current || current[PATCH_FLAG]) return;
  const Capped = makeCapped(current, CONTENT_MAX_SCALE);
  Object.defineProperty(RN, key, {
    configurable: true,
    get: () => Capped,
  });
}

patch('Text');
patch('TextInput');
