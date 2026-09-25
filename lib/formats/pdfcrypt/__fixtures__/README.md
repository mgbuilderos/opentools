# PDF crypt fixtures

`generate.mjs` reproduces these files. The eight encrypted PDFs are the
existing independent fixtures made with PyMuPDF 1.26 / MuPDF 1.26.10: owner-only
and user-password variants for Standard security-handler revisions 2, 3, 4 and 6. `plain.pdf` is synthetic and is written with pdf-lib; it contains only the
literal fixture labels in the generator. None contains personal data.

The three malformed files are generated too: a wrong magic header, a truncated
encrypted PDF, and a stream whose declared length extends beyond the buffer.

The generated encrypted fixtures use `secret` as the user password where one
is set and `owner` as the owner password.
