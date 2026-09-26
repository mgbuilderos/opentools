import type { ToolUiMessages } from './messages';

/** Italiano. Registro d’interfaccia: breve, imperativo. */
export const IT_TOOL_UI: ToolUiMessages = {
  dismissError: 'Chiudi l’errore',
  clear: 'Svuota',
  clearAll: 'Togli tutto',
  cancel: 'Annulla',
  processing: 'Elaborazione',
  outputCheck: 'Verifica del risultato',
  before: 'Prima',
  after: 'Dopo',
  saved: 'Salvato',
  output: 'Risultato',
  input: 'Ingresso',
  files: 'File',
  chooseAnother: 'Scegli un altro',
  onDevicePrototype: 'Prototipo sul tuo dispositivo',
  savePdf: 'Salva il PDF',

  mergeTitle: 'Unire PDF',
  mergePageManagement: 'Gestione delle pagine',
  mergePdfsToMerge: 'PDF da unire',
  mergeChoosePdfs: 'Scegli i PDF',
  mergeSignatureNote:
    'Le firme dei file e il numero di pagine sono verificati nel tuo browser.',
  mergeOriginalsNote: 'Gli originali non vengono modificati.',
  mergeDownloadAria: 'Scarica il PDF unito',
  mergeDownloadLabel: 'Scarica unito.pdf',
  mergeOrderAria: 'Ordine di unione dei PDF',
  mergePhaseTiming: 'Tempi per fase',
  mergeCouldntUse: 'Non è stato possibile usare quel PDF',
  mergeCancelled:
    'Unione annullata. I PDF che hai scelto sono ancora qui, invariati.',
  mergeStatusAria:
    'Stato dell’elaborazione locale. La prova di rilascio è in attesa.',

  compressChooseSource: 'Scegli il PDF di partenza',
  compressChoosePdf: 'Scegli un PDF da comprimere',
  compressPages: 'Pagine',
  compressPhotos: 'Foto',
  compressPhotoQuality: 'Qualità delle foto',
  compressLargestEdge: 'Lato più lungo della foto',
  compressKeepFullSize: 'Mantieni la dimensione originale',
  compressEdgeEmail: '1000 px — e-mail',
  compressEdgeScreen: '1600 px — schermo',
  compressEdgePrint: '2400 px — stampa',
  compressReEncode: 'Ricodifica le foto dentro il PDF',
  compressReEncoding: 'Ricodifica delle foto',
  compressClearMetadata: 'Svuota titolo, autore e produttore',
  compressCeiling: 'Tetto (KB)',
  compressFitCeiling: 'Scendi sotto il tetto di un portale',
  compressWhereItRan: 'Dove è stato eseguito',
  compressSave: 'Salva il PDF compresso',
  compressCouldnt: 'Non è stato possibile comprimere questo PDF',

  imagesTitle: 'Immagini in PDF',
  imagesAdd: 'Aggiungi immagini',
  imagesChoose: 'Scegli le immagini',
  imagesChooseAria: 'Scegli immagini JPEG o PNG',
  imagesChooseHint: 'Scegli immagini JPEG o PNG da convertire in PDF',
  imagesSourceImages: 'Immagini di partenza',
  imagesLabel: 'Immagini',
  imagesPageSize: 'Formato pagina',
  imagesFitEach: 'Adatta a ogni immagine',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Orientamento',
  imagesMatchEach: 'Secondo ogni immagine',
  imagesPortrait: 'Verticale',
  imagesLandscape: 'Orizzontale',
  imagesMargin: 'Margine',
  imagesMarginNone: 'Nessuno',
  imagesMarginSmall: 'Piccolo',
  imagesMarginMedium: 'Medio',
  imagesMarginLarge: 'Grande',
  imagesOnePerImage: 'Viene creata una pagina di PDF per ogni immagine.',
  imagesCreate: 'Crea',
  imagesEmbedding: 'Inserimento delle immagini',
  imagesSave: 'Salva il PDF generato',
  imagesCouldnt: 'Non è stato possibile creare questo PDF',
  imagesPrivacyBoundary: 'Confine di riservatezza',
  imagesNoNetwork: 'Nessuna primitiva di rete per i file',

  toWordTitle: 'PDF in Word',
  toWordShort: 'In Word',
  chooseAPdf: 'Scegli un PDF',
  toWordChooseAria: 'Scegli il file o i file PDF',
  toWordChooseHint: 'Scegli un PDF da questo dispositivo da convertire.',
  toWordRemoveAria: 'Togli il PDF scelto',
  toWordSave: 'Salva il documento Word',
  toWordSaveShort: 'Salva il file Word',
  toWordWordFile: 'File Word',
  toWordParagraphs: 'Paragrafi',
  toWordCharacters: 'Caratteri',
  toWordTook: 'Durata',
  toWordConvertAnother: 'Converti un altro',
  toWordOcrLink: 'Leggi questa scansione con l’OCR',
  toWordScope: 'Che cosa fa e che cosa non fa',
  toWordCouldnt: 'Non è stato possibile convertire questo PDF',

  optimizeTitle: 'Ottimizza l’immagine',
  optimizeAction: 'Ottimizza',
  optimizeImage: 'Immagine',
  optimizeSourceImage: 'Immagine di partenza',
  optimizeChoose: 'Scegli un’immagine',
  optimizeChooseAria: 'Scegli l’immagine da ottimizzare',
  optimizeMaxWidth: 'Larghezza massima',
  optimizeMaxHeight: 'Altezza massima',
  optimizeOutputFormat: 'Formato di uscita',
  optimizeSave: 'Salva l’immagine',
  optimizeOriginalUnchanged: 'L’originale resta invariato.',
  optimizeDecodedMatch: 'Le dimensioni decodificate corrispondono',
  optimizeInThisTab: 'In questa scheda',
  optimizeReleaseAssurance: 'Garanzia di rilascio',
  optimizeEgressPending: 'Prova formale di assenza di invio in attesa',
  optimizeCouldnt: 'Non è stato possibile ottimizzare questa immagine',
  browserWorker: 'Worker del browser',
  inThisBrowserTab: 'In questa scheda del browser',
  upTo150Mb: 'Fino a 150 MB',
  mergeStandfirst:
    'Unisci i PDF nell’ordine che scegli tu. Il lavoro avviene in un worker dedicato del browser.',
  mergeOperation: 'Unione di PDF',
  mergeCounts: '{files} file · {pages} pagine',
  mergeSummary: '{files} file PDF uniti in {pages} pagine.',
  compressOperation: 'Compressore di PDF',
  compressInspecting: 'Analisi del PDF sul tuo dispositivo…',
  compressSummaryOne:
    '{pages} pagina riscritta e verificata in questo browser.',
  compressSummaryMany:
    'Pagine riscritte e verificate in questo browser: {pages}.',
  compressNoneReEncoded: 'Nessuna ricodificata',
  compressReEncodedCount: '{count} ricodificate',
  compressPhotoQualityValue: 'Qualità delle foto {quality}%',
  compressCeilingLine: 'Tetto {bytes}.',
  compressRewriteOne: 'riscrittura',
  compressRewriteMany: 'riscritture',
  compressFitAlreadyUnder:
    'Il file che hai aperto era già sotto il tetto, quindi non è stato ricodificato nulla e non è andato perso nulla.',
  compressFitMet:
    'Raggiunto dopo {attempts} {rewrites} misurate, con qualità foto {quality}% e lato più lungo di {edge} px. Ogni tentativo è stato pesato sui byte realmente prodotti, non su una stima.',
  compressFitMissed:
    'Sono state tentate {attempts} {rewrites} misurate, fino a qualità {quality}% a {edge} px, e nessuna è scesa sotto il tetto. Salvando ottieni la più piccola prodotta. Dividi il documento, oppure tieni solo le pagine richieste.',
  compressNothingSaved:
    'Il file riscritto non è venuto più piccolo, quindi questo è il tuo originale, byte per byte. Un PDF fatto quasi solo di testo ha poco da cedere: qui il guadagno viene dalle foto.',
  imagesUnsupported:
    'Scegli immagini JPEG o PNG. Le immagini animate e vettoriali non sono supportate qui.',
  imagesSummaryOne: '{count} immagine disposta in un PDF verificato.',
  imagesSummaryMany: 'Immagini disposte in un PDF verificato: {count}.',
  imagesBuilding: 'Creazione sul tuo dispositivo…',
  imagesCreatePdf: 'Crea il PDF',
  imagesFitImage: 'Adattato all’immagine',
  toWordSummaryOne: '{pages} pagina letta in questo browser; solo testo.',
  toWordSummaryMany: 'Pagine lette in questo browser, solo testo: {pages}.',
  toWordNoTextNote:
    '{without} pagine su {total} non contenevano testo e non hanno aggiunto nulla al documento Word. Quelle pagine sono immagini — una scansione o una foto — quindi non c’era nulla da copiare.',
  toWordTextOnlyNote:
    'Solo testo. L’impaginazione, le colonne, le tabelle e le immagini del PDF non sono in questo file.',
  optimizeOperation: 'Ottimizzatore di immagini',
  optimizeSummary: 'Immagine convertita in {format} a {width} × {height} px.',
  optimizeChooseMany: 'Scegli le immagini',
  optimizeBusy: 'Ottimizzazione…',
  optimizeAll: 'Ottimizza tutte',
  optimizePreviewAlt: 'Anteprima ottimizzata',
  optimizeNextMerge: 'Avanti: unire PDF →',
  runsInThisTab: 'Gira in questa scheda, senza caricare nulla',
  freeNoAccount: 'Gratis, senza account e senza filigrana',
  batchLocalPromise:
    'Nessun limite al numero di file, nessun limite giornaliero e nessuna coda: il lavoro avviene su questa macchina. Scegli un file per il flusso normale, oppure molti per i risultati in blocco e un unico ZIP.',
  recipeCopyLink: 'Copia il link delle impostazioni',
  recipeLinkCopied: 'Link delle impostazioni copiato',
  recipeSettingsOnly:
    'Vengono inviate solo queste impostazioni. Il tuo {subject} resta su questo dispositivo e non fa mai parte del link.',
  recipeCopyByHand:
    'Copia questo link a mano: il browser ha bloccato gli appunti',
  noClientAnalytics: 'Nessuna analisi nel browser in questa anteprima',
  browserCanvasNote: 'Canvas del browser · Output raster statico',
  mergeCapacity:
    'Fino a {max} file · 150 MB in totale in questa versione canary',
  mergeInspecting: 'Analisi dei PDF sul tuo dispositivo…',
  mergeDropHere: 'Trascina qui i PDF',
  mergeCanaryScope:
    'Ambito di questa versione canary: unisce il contenuto e l’ordine delle pagine. Segnalibri, firme, moduli, allegati e metadati del documento non sono ancora garantiti.',
  mergeAddAtLeastTwo: 'Aggiungi almeno 2 PDF',
  mergeReady: 'Pronto per unire',
  mergeTryingSettings: 'Prova delle impostazioni di compressione',
  compressStandfirst:
    'Riscrivi un PDF in modo più compatto e ricodifica le foto al suo interno. Il file viene letto da questa pagina e non viene mai inviato a un server.',
  compressFitUnderCeiling: 'Scendi sotto il tetto',
  compressLimitNote:
    'Questa versione accetta un PDF di partenza fino a 150 MB.',
  compressCeilingHelp:
    'Scegli il modulo con cui stai presentando, oppure scrivi il tuo tetto. La pagina ricodifica poi a qualità decrescente finché un risultato misurato scende davvero sotto: nessuna stima e nessun ciclo silenzioso — ogni tentativo è una riscrittura vera e il numero viene riportato.',
  compressPresetReadFrom: 'Letto da',
  compressPresetOn: 'il',
  compressPresetWarning:
    'I portali cambiano i limiti senza annunciarlo: verifica il tuo prima di farci affidamento.',
  imagesStandfirst:
    'Ordina immagini JPEG e PNG, scegli un formato di carta e crea un unico PDF in un worker dedicato del browser.',
  imagesAcceptHint: 'JPEG o PNG · 40 file · 100 MB in totale',
  toWordStandfirstLead: 'Estrai il testo di un PDF in un file',
  toWordStandfirstTail:
    'modificabile. Il PDF viene letto da questa pagina e non viene mai inviato a un server.',
  optimizeStandfirst:
    'Ridimensiona, comprimi e converti una singola immagine JPEG, PNG o WebP statica senza caricarla.',
  optimizeAcceptHint: 'JPEG, PNG o WebP · massimo 25 MB',
  optimizeLimitNote:
    'Questa versione accetta immagini di partenza fino a 25 MB.',
  subjectFile: 'file',
  subjectImage: 'immagine',
  subjectText: 'testo',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Questi file superano l’attuale limite di sicurezza di 150 MB in totale.',
  mergeTooMany: 'In questa versione puoi unire fino a {max} PDF per volta.',
  mergeMoveEarlier: 'Sposta {name} prima',
  mergeMoveLater: 'Sposta {name} dopo',
  mergeRemoveFile: 'Togli {name}',
  mergeInspectorNoStart:
    'L’ispettore PDF non è riuscito ad avviarsi. I tuoi file sono invariati.',
  mergeInspectorStopped:
    'L’ispettore PDF si è fermato in modo inatteso. I tuoi file sono invariati.',
  mergeReadFailed:
    'Il browser non è riuscito a leggere uno di questi file. I tuoi originali sono invariati.',
  mergeNoStart:
    'L’unione non è riuscita ad avviarsi. I tuoi PDF originali sono invariati.',
  mergeStopped:
    'L’unione si è fermata in modo inatteso. I tuoi PDF originali sono invariati.',
  compressReadFailed: 'Il browser non è riuscito a leggere quel file.',
  compressNoStart:
    'La compressione del PDF non è riuscita ad avviarsi. Il tuo originale è invariato.',
  compressStopped:
    'La compressione del PDF si è fermata in modo inatteso. Il tuo originale è invariato.',
  compressInspectorStopped: 'L’ispettore PDF si è fermato in modo inatteso.',
  compressDoneSmaller: 'Fatto — {percent}% più piccolo',
  compressDoneAlready:
    'Fatto — questo PDF era già il più piccolo che possiamo ottenere',
  compressAlreadyUnder: 'Era già sotto il tetto — il tuo file è invariato',
  compressUnderCeiling: 'Sotto il tetto — {size}',
  compressStillOver:
    'Ancora sopra il tetto — il più piccolo raggiunto è stato {size}',
  imagesTooLarge:
    'Queste immagini superano l’attuale limite di sicurezza di 100 MB in totale.',
  imagesTooMany: 'Scegli non più di {max} immagini per PDF.',
  imagesMoveUp: 'Sposta {name} in alto',
  imagesMoveDown: 'Sposta {name} in basso',
  imagesRemove: 'Togli {name}',
  imagesNoStart:
    'Il browser non è riuscito ad avviare la creazione del PDF. Le tue immagini sono invariate.',
  imagesStopped:
    'La creazione del PDF si è fermata in modo inatteso. Le tue immagini sono invariate.',
  toWordFailed: 'Non è stato possibile convertire questo PDF.',
  toWordTooLarge:
    '{name} pesa {size}. Questa pagina lavora su file fino a {max}.',
  optimizeWrongType:
    'Scegli un’immagine JPEG, PNG o WebP. L’output animato non è supportato.',
  optimizeTooLarge: 'Il limite di 25 MB per file è stato superato.',
  optimizeCanvasUnavailable:
    'L’elaborazione con canvas non è disponibile in questo browser.',
  optimizeDecodeFailed:
    'Il browser non è riuscito a decodificare questa immagine.',
  optimizeEncodeFailed:
    'Il browser non è riuscito a codificare questa immagine.',
  optimizeFailed: 'Non è stato possibile ottimizzare l’immagine.',
  optimizeDimensionCheckFailed:
    'L’immagine ottimizzata non ha superato il controllo delle dimensioni.',
  optimizeNoFormat:
    'Questo browser non ha prodotto un formato di immagine utilizzabile.',
  optimizeBadDimensions:
    'Larghezza e altezza devono essere numeri interi da 1 a 12.000.',
  optimizeLarger: '{percent}% più grande',
  briefStepsHeading: 'Cosa succede in questo lavoro',
  briefLimitsHeading: 'Cosa non farà',
  toWordScopeProse:
    'Recupera il testo: l’ordine di lettura, i paragrafi, le interruzioni di pagina e i titoli dove il PDF li compone in corpo maggiore. Non ricostruisce l’impaginazione: colonne, tabelle come tabelle vere, immagini e caratteri non vengono riportati. Se il tuo PDF è una scansione o la foto di un foglio non contiene alcun testo, e questa pagina te lo dirà invece di consegnarti un documento vuoto.',
};
