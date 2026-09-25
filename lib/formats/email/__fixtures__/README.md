# Email fixtures

All fixtures are synthetic, contain no personal data, and are reproducibly
created by `generate.mjs`.

- `multipart.eml` covers MIME alternatives, encoded headers, a remote image
  URL, and two attachments.
- `three-message.mbox` covers three separators and `>From ` unescaping.
- `unicode.msg` and `ansi.msg` are minimal valid CFB/OLE2 containers with
  message-property streams and an attachment storage.
- The remaining fixtures cover a truncated multipart, wrong container magic,
  and a CFB root stream whose declared size exceeds its sector chain.
