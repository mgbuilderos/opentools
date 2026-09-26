# OpenTools

OpenTools is a collection of PDF, image, audio, video, subtitle, data, text and
QR utilities. Every conversion runs in the browser tab that opened it, using Web
Workers and WebAssembly.

## What makes it different from the other file tools you can self-host

The others accept an upload, do the work on the server, and hand the result
back. This one serves a page and stops.

Files are read into memory by the browser, processed there, and offered back as
a download. They are never sent to this container. So they never touch the disk
it runs on, never appear in a backup of it, and never sit in a temporary
directory waiting for a cleanup job.

Two things follow from that:

- **Your hardware does no work.** A box serving OpenTools to five people is
  serving five static pages. The same box running an upload-based PDF tool is
  doing five people's rendering.
- **Sharing the URL does not make you a custodian.** Give it to your family,
  your team or your clients and you still never receive their documents.

## What you can check rather than trust

Pages are served with `Content-Security-Policy: connect-src 'none'`, so they
cannot reach the network even if something tried to make them. The container
needs no internet access at runtime, which you can confirm by starting it with
`--network none` and watching it serve anyway.

## Settings

Runtipi terminates TLS and can put the app behind its own domain, so the
optional access gate is off by default. Set a username _and_ a password to put
one shared HTTP Basic prompt in front of the whole instance; setting only one of
the two fails closed on purpose.

MIT licensed. No account, no licence key, no phone-home.
