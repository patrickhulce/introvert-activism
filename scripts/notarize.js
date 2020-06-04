const {notarize} = require('electron-notarize') // eslint-disable-line

exports.default = async function notarizing(context) {
  console.log('Notarize script running...')
  const {electronPlatformName, appOutDir} = context
  const filename = context.packager.appInfo.productFilename

  if (
    electronPlatformName !== 'darwin' ||
    !process.env.APPLE_ACCOUNT_EMAIL ||
    process.env.DANGEROUSLY_SKIP_NOTARIZATION
  ) {
    console.log('Skipping notarization...')
    return
  }

  console.log('Initializing notarization!')
  await notarize({
    appBundleId: 'com.patrickhulce.electronstarter',
    appPath: `${appOutDir}/${filename}.app`,
    appleId: process.env.APPLE_ACCOUNT_EMAIL,
    appleIdPassword: process.env.APPLE_ACCOUNT_PASSWORD, // this is an app-specific password generated at https://appleid.apple.com/account/manage
  })

  console.log('Done notarizing!')
}
