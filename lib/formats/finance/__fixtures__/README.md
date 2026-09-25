# Finance fixtures

Every fixture in this directory is synthetic, contains no personal data, and is
reproducibly written by `generate.mjs`.

- `ofx1.ofx` exercises OFX 1.x SGML leaf tags and a bank statement.
- `ofx2.ofx` exercises OFX 2.x XML and a card statement.
- `sample.qif` exercises account metadata, statement balance, transactions,
  Indian grouping, currency symbols, and debit markers.
- The remaining files exercise truncation, wrong-format input, and a declared
  payload length larger than the available bytes.
