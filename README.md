# introvert-activism

## What?

App (currently Mac + Windows) that allows you to prerecord your message to your representative's offices at your own pace and provides one-click dialing to get connected when you're ready.

## Why?

You want to support Black Lives Matter, PPE for healthcare workers, < YOUR CAUSE HERE > by making your voice heard, but you're not yet comfortable on the phone speaking your mind or don't know where to start.

## Install Dependencies

```bash
yarn
brew install ffmpeg
```

## Build

```bash
yarn build
```

## Run in Development

In one terminal...

```bash
yarn build:watch
```

In another...

```bash
yarn start
```

## Run Locally with Ngrok

In one terminal...

```bash
ngrok http 8675
```

In another...

```bash
export PUBLIC_INTERNET_PREFIX="http://XXXXXXXXXXX.ngrok.io/api/remote"
export REMOTE_SERVER_BEHAVIOR="ngrok"
```

Update your Twilio number call webhook in the [Twilio console](https://www.twilio.com/console/phone-numbers/) to be `http://XXXXXXXXXXX.ngrok.io/api/remote/webhooks/initiate-call`
