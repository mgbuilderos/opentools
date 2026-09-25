import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
await mkdir(root, { recursive: true });

const fixtures = {
  'ofx1.ofx': `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>000000001
<ACCTID>SYNTHETIC-CHECKING
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260901000000.000[0:UTC]
<DTEND>20260930235959.000[0:UTC]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260905120000.000[0:UTC]
<TRNAMT>-125.50
<FITID>synthetic-001
<NAME>Utility payment
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260910120000.000[0:UTC]
<TRNAMT>500.00
<FITID>synthetic-002
<NAME>Transfer in
<MEMO>September transfer
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260912120000.000[0:UTC]
<TRNAMT>-10.06
<FITID>synthetic-003
<CHECKNUM>42
<NAME>Stationery
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1374.44
<DTASOF>20260930235959.000[0:UTC]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`,
  'ofx2.ofx': `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <CREDITCARDMSGSRSV1>
    <CCSTMTTRNRS>
      <CCSTMTRS>
        <CURDEF>EUR</CURDEF>
        <CCACCTFROM><ACCTID>SYNTHETIC-CARD</ACCTID></CCACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20260901000000.000[0:UTC]</DTSTART>
          <DTEND>20260930235959.000[0:UTC]</DTEND>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260920101530.000[0:UTC]</DTPOSTED>
            <TRNAMT>-49.95</TRNAMT>
            <FITID>synthetic-card-001</FITID>
            <NAME>Rail ticket</NAME>
          </STMTTRN>
        </BANKTRANLIST>
        <LEDGERBAL><BALAMT>-49.95</BALAMT><DTASOF>20260930235959.000[0:UTC]</DTASOF></LEDGERBAL>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>
`,
  'sample.qif': `!Account
NSynthetic current account
TBank
DGenerated fixture account
/09/30/2026
$₹ 2,48,456.78
^
!Type:Bank
D09/01/2026
T₹ 1,23,456.78
POpening balance
MGenerated opening entry
^
D09/04/2026
T1,200.00 DR
PUtility payment
N1001
LHousehold
^
D09/10/2026
T₹ 1,26,200.00
PTransfer in
MGenerated credit
^
`,
  'truncated.ofx': `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN><TRNAMT>10.00
`,
  'wrong-magic.bin': `This is not an OFX or QIF document.
`,
  'declared-length.ofx': `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CONTENT-LENGTH:999

<OFX></OFX>
`,
  'truncated.qif': `!Type:Bank
D09/01/2026
T10.00
PUnterminated record
`,
};

for (const [name, contents] of Object.entries(fixtures)) {
  await writeFile(resolve(root, name), contents, 'utf8');
}
