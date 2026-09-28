# Dependency patches

## react-native-ios-utilities 5.2.0

The iOS Release build with Expo 57 / React Native 0.86 fails to link
`_OBJC_CLASS_$_RCTRootContentView`. The library statically references a legacy
class that the prebuilt React Native binary does not contain.

This patch is the exact Swift change from upstream commit
[`dbc4ae1`](https://github.com/dominicstop/react-native-ios-utilities/commit/dbc4ae1f1a9eb7a4d6ebd0aa1c1a2b8fe6676b7c)
and resolves the optional class dynamically. It preserves the existing lookup
when the class is present. pnpm applies the patch during frozen-lockfile installs;
there is no CI-only source rewrite.

On 2026-09-29, upstream tags 5.2.1 with this fix, but the npm registry returns 404
for that version. Remove the patch when a published pinned version includes the
fix, after passing the iOS Release build and simulator E2E suite again.
