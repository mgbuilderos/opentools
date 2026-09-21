import { creatorOperations } from './creator';
import { dateOperations } from './date';
import { developerAdvancedOperations } from './developer-advanced';
import { developerDataOperations } from './developer-data';
import { documentOperations } from './document';
import { fileOperations } from './file';
import { financeBusinessOperations } from './finance-business';
import { lifeAdminOperations } from './life-admin';
import { mathOperations } from './math';
import { productivityOperations } from './productivity';
import { qrBarcodeOperations } from './qr-barcode';
import { scienceEducationOperations } from './science-education';
import { spreadsheetOperations } from './spreadsheet';
import { subtitleOperations } from './subtitle';
import { textOperations } from './text';
import { webOperations } from './web';
import { writingOperations } from './writing';

export const ALL_ADAPTER_OPERATIONS = [
  ...creatorOperations,
  ...dateOperations,
  ...developerAdvancedOperations,
  ...developerDataOperations,
  ...documentOperations,
  ...fileOperations,
  ...financeBusinessOperations,
  ...lifeAdminOperations,
  ...mathOperations,
  ...productivityOperations,
  ...qrBarcodeOperations,
  ...scienceEducationOperations,
  ...spreadsheetOperations,
  ...subtitleOperations,
  ...textOperations,
  ...webOperations,
  ...writingOperations,
] as const;
