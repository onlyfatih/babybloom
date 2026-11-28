/**
 * Extends app.json. IOS_BUNDLE_ID lets a developer build to their own iPhone
 * with their own (free or paid) Apple team without editing app.json: a
 * personal team cannot sign the placeholder identifier. See docs/iphone-setup.md.
 */
module.exports = ({ config }) => ({
  ...config,
  ios: { ...config.ios, bundleIdentifier: process.env.IOS_BUNDLE_ID || config.ios.bundleIdentifier },
});
