import type { ToolUiMessages } from './messages';

/** Deutsch. Oberflächenregister: knapp, imperativ, ohne Werbeton. */
export const DE_TOOL_UI: ToolUiMessages = {
  dismissError: 'Fehler schließen',
  clear: 'Leeren',
  clearAll: 'Alle entfernen',
  cancel: 'Abbrechen',
  processing: 'Verarbeitung',
  outputCheck: 'Prüfung des Ergebnisses',
  before: 'Vorher',
  after: 'Nachher',
  saved: 'Gespeichert',
  output: 'Ergebnis',
  input: 'Eingabe',
  files: 'Dateien',
  chooseAnother: 'Andere auswählen',
  onDevicePrototype: 'Prototyp auf Ihrem Gerät',
  savePdf: 'PDF speichern',

  mergeTitle: 'PDF zusammenfügen',
  mergePageManagement: 'Seitenverwaltung',
  mergePdfsToMerge: 'PDFs zum Zusammenfügen',
  mergeChoosePdfs: 'PDFs auswählen',
  mergeSignatureNote:
    'Dateisignaturen und Seitenzahlen werden in Ihrem Browser geprüft.',
  mergeOriginalsNote: 'Die Originale werden nicht verändert.',
  mergeDownloadAria: 'Zusammengefügtes PDF herunterladen',
  mergeDownloadLabel: 'zusammengefuegt.pdf herunterladen',
  mergeOrderAria: 'Reihenfolge der PDFs',
  mergePhaseTiming: 'Dauer je Schritt',
  mergeCouldntUse: 'Dieses PDF konnte nicht verwendet werden',
  mergeCancelled:
    'Zusammenfügen abgebrochen. Ihre ausgewählten PDFs sind unverändert noch hier.',
  mergeStatusAria:
    'Status der lokalen Verarbeitung. Der Release-Nachweis steht aus.',

  compressChooseSource: 'Quell-PDF auswählen',
  compressChoosePdf: 'Wählen Sie ein PDF zum Verkleinern',
  compressPages: 'Seiten',
  compressPhotos: 'Fotos',
  compressPhotoQuality: 'Fotoqualität',
  compressLargestEdge: 'Längste Fotokante',
  compressKeepFullSize: 'Originalgröße behalten',
  compressEdgeEmail: '1000 px — E-Mail',
  compressEdgeScreen: '1600 px — Bildschirm',
  compressEdgePrint: '2400 px — Druck',
  compressReEncode: 'Fotos im PDF neu kodieren',
  compressReEncoding: 'Fotos werden neu kodiert',
  compressClearMetadata: 'Titel, Autor und Ersteller leeren',
  compressCeiling: 'Obergrenze (KB)',
  compressFitCeiling: 'Unter die Obergrenze eines Portals bringen',
  compressWhereItRan: 'Wo es lief',
  compressSave: 'Verkleinertes PDF speichern',
  compressCouldnt: 'Dieses PDF konnte nicht verkleinert werden',

  imagesTitle: 'Bilder in PDF',
  imagesAdd: 'Bilder hinzufügen',
  imagesChoose: 'Bilder auswählen',
  imagesChooseAria: 'JPEG- oder PNG-Bilder auswählen',
  imagesChooseHint: 'Wählen Sie JPEG- oder PNG-Bilder für das PDF',
  imagesSourceImages: 'Ausgangsbilder',
  imagesLabel: 'Bilder',
  imagesPageSize: 'Seitenformat',
  imagesFitEach: 'An jedes Bild anpassen',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Ausrichtung',
  imagesMatchEach: 'Nach jedem Bild',
  imagesPortrait: 'Hochformat',
  imagesLandscape: 'Querformat',
  imagesMargin: 'Rand',
  imagesMarginNone: 'Keiner',
  imagesMarginSmall: 'Klein',
  imagesMarginMedium: 'Mittel',
  imagesMarginLarge: 'Groß',
  imagesOnePerImage: 'Für jedes Bild wird eine PDF-Seite erzeugt.',
  imagesCreate: 'Erzeugen',
  imagesEmbedding: 'Bilder werden eingebettet',
  imagesSave: 'Erzeugtes PDF speichern',
  imagesCouldnt: 'Dieses PDF konnte nicht erzeugt werden',
  imagesPrivacyBoundary: 'Datenschutzgrenze',
  imagesNoNetwork: 'Keine Netzwerkprimitive für Dateien',

  toWordTitle: 'PDF in Word',
  toWordShort: 'In Word',
  chooseAPdf: 'PDF auswählen',
  toWordChooseAria: 'PDF-Datei oder -Dateien auswählen',
  toWordChooseHint: 'Wählen Sie ein PDF von diesem Gerät zum Umwandeln.',
  toWordRemoveAria: 'Ausgewähltes PDF entfernen',
  toWordSave: 'Word-Dokument speichern',
  toWordSaveShort: 'Word-Datei speichern',
  toWordWordFile: 'Word-Datei',
  toWordParagraphs: 'Absätze',
  toWordCharacters: 'Zeichen',
  toWordTook: 'Dauer',
  toWordConvertAnother: 'Weiteres umwandeln',
  toWordOcrLink: 'Diesen Scan mit Texterkennung lesen',
  toWordScope: 'Was es tut und was nicht',
  toWordCouldnt: 'Dieses PDF konnte nicht umgewandelt werden',

  optimizeTitle: 'Bild optimieren',
  optimizeAction: 'Optimieren',
  optimizeImage: 'Bild',
  optimizeSourceImage: 'Ausgangsbild',
  optimizeChoose: 'Bild auswählen',
  optimizeChooseAria: 'Bild zum Optimieren auswählen',
  optimizeMaxWidth: 'Maximale Breite',
  optimizeMaxHeight: 'Maximale Höhe',
  optimizeOutputFormat: 'Ausgabeformat',
  optimizeSave: 'Bild speichern',
  optimizeOriginalUnchanged: 'Das Original bleibt unverändert.',
  optimizeDecodedMatch: 'Dekodierte Abmessungen stimmen',
  optimizeInThisTab: 'In diesem Tab',
  optimizeReleaseAssurance: 'Release-Zusicherung',
  optimizeEgressPending: 'Formaler Egress-Nachweis steht aus',
  optimizeCouldnt: 'Dieses Bild konnte nicht optimiert werden',
  browserWorker: 'Browser-Worker',
  inThisBrowserTab: 'In diesem Browser-Tab',
  upTo150Mb: 'Bis zu 150 MB',
  mergeStandfirst:
    'Fügen Sie PDFs in der von Ihnen gewählten Reihenfolge zusammen. Die Arbeit läuft in einem eigenen Browser-Worker.',
  mergeOperation: 'PDF-Zusammenfügen',
  mergeCounts: '{files} Dateien · {pages} Seiten',
  mergeSummary: '{files} PDF-Dateien zu {pages} Seiten zusammengefügt.',
  compressOperation: 'PDF-Verkleinerer',
  compressInspecting: 'PDF wird auf Ihrem Gerät geprüft…',
  compressSummaryOne:
    '{pages} Seite in diesem Browser neu geschrieben und geprüft.',
  compressSummaryMany:
    'In diesem Browser neu geschriebene und geprüfte Seiten: {pages}.',
  compressNoneReEncoded: 'Keine neu kodiert',
  compressReEncodedCount: '{count} neu kodiert',
  compressPhotoQualityValue: 'Fotoqualität {quality} %',
  compressCeilingLine: 'Obergrenze {bytes}.',
  compressRewriteOne: 'Durchlauf',
  compressRewriteMany: 'Durchläufe',
  compressFitAlreadyUnder:
    'Die geöffnete Datei lag bereits darunter, es wurde also nichts neu kodiert und nichts ging verloren.',
  compressFitMet:
    'Erreicht nach {attempts} gemessenen {rewrites}, bei Fotoqualität {quality} % und einer längsten Fotokante von {edge} px. Jeder Versuch wurde an den wirklich erzeugten Bytes gemessen, nicht an einer Schätzung.',
  compressFitMissed:
    '{attempts} gemessene {rewrites} wurden versucht, bis Fotoqualität {quality} % bei {edge} px, und keiner blieb darunter. Beim Speichern erhalten Sie die kleinste erzeugte Datei. Teilen Sie das Dokument, oder nehmen Sie nur die verlangten Seiten.',
  compressNothingSaved:
    'Die neu geschriebene Datei wurde nicht kleiner, dies ist also Ihr Original, Byte für Byte. Ein PDF, das fast nur Text ist, gibt kaum etwas her; der Gewinn steckt in den Fotos.',
  imagesUnsupported:
    'Wählen Sie JPEG- oder PNG-Bilder. Animierte und Vektorbilder werden hier nicht unterstützt.',
  imagesSummaryOne: '{count} Bild in einem geprüften PDF angeordnet.',
  imagesSummaryMany: 'In einem geprüften PDF angeordnete Bilder: {count}.',
  imagesBuilding: 'Wird auf Ihrem Gerät erzeugt…',
  imagesCreatePdf: 'PDF erzeugen',
  imagesFitImage: 'An das Bild angepasst',
  toWordSummaryOne: '{pages} Seite in diesem Browser gelesen; nur Text.',
  toWordSummaryMany: 'In diesem Browser gelesene Seiten, nur Text: {pages}.',
  toWordNoTextNote:
    '{without} von {total} Seiten enthielten keinen Text und haben nichts zur Word-Datei beigetragen. Diese Seiten sind Bilder — ein Scan oder ein Foto —, es gab also nichts zu kopieren.',
  toWordTextOnlyNote:
    'Nur Text. Layout, Spalten, Tabellen und Bilder aus dem PDF sind nicht in dieser Datei.',
  optimizeOperation: 'Bildoptimierer',
  optimizeSummary: 'Bild in {format} bei {width} × {height} px umgewandelt.',
  optimizeChooseMany: 'Bilder auswählen',
  optimizeBusy: 'Optimierung…',
  optimizeAll: 'Alle optimieren',
  optimizePreviewAlt: 'Optimierte Vorschau',
  optimizeNextMerge: 'Weiter: PDF zusammenfügen →',
  runsInThisTab: 'Läuft in diesem Tab — kein Upload',
  freeNoAccount: 'Kostenlos, ohne Konto, ohne Wasserzeichen',
  batchLocalPromise:
    'Keine Begrenzung der Dateianzahl, kein Tageslimit, keine Warteschlange — die Arbeit passiert auf diesem Rechner. Wählen Sie eine Datei für den üblichen Ablauf, oder mehrere für Stapelergebnisse und ein einzelnes ZIP.',
  recipeCopyLink: 'Einstellungs-Link kopieren',
  recipeLinkCopied: 'Einstellungs-Link kopiert',
  recipeSettingsOnly:
    'Übertragen werden nur diese Einstellungen. Ihre {subject} bleibt auf diesem Gerät und ist nie Teil des Links.',
  recipeCopyByHand:
    'Kopieren Sie diesen Link von Hand — der Browser hat die Zwischenablage blockiert',
  noClientAnalytics: 'Keine Analyse im Browser in dieser Vorschau',
  browserCanvasNote: 'Browser-Canvas · Statische Rasterausgabe',
  mergeCapacity:
    'Bis zu {max} Dateien · 150 MB insgesamt in dieser Canary-Version',
  mergeInspecting: 'PDFs werden auf Ihrem Gerät geprüft…',
  mergeDropHere: 'PDFs hier ablegen',
  mergeCanaryScope:
    'Umfang dieser Canary-Version: fügt Seiteninhalt und Seitenreihenfolge zusammen. Lesezeichen, Signaturen, Formulare, Anhänge und Dokument-Metadaten sind noch nicht garantiert.',
  mergeAddAtLeastTwo: 'Fügen Sie mindestens 2 PDFs hinzu',
  mergeReady: 'Bereit zum Zusammenfügen',
  mergeTryingSettings: 'Kompressionseinstellungen werden probiert',
  compressStandfirst:
    'Schreiben Sie ein PDF kompakter neu und kodieren Sie die enthaltenen Fotos neu. Die Datei wird von dieser Seite gelesen und nie an einen Server gesendet.',
  compressFitUnderCeiling: 'Unter die Obergrenze bringen',
  compressLimitNote: 'Diese Version nimmt ein Quell-PDF bis 150 MB an.',
  compressCeilingHelp:
    'Wählen Sie das Formular, bei dem Sie einreichen, oder tragen Sie Ihre eigene Obergrenze ein. Die Seite kodiert dann mit fallender Qualität neu, bis ein gemessenes Ergebnis wirklich darunter liegt — keine Schätzung und keine stille Schleife: jeder Versuch ist ein echter Durchlauf, und ihre Zahl wird genannt.',
  compressPresetReadFrom: 'Gelesen von',
  compressPresetOn: 'am',
  compressPresetWarning:
    'Portale ändern ihre Grenzen ohne Ankündigung — prüfen Sie Ihre, bevor Sie sich darauf verlassen.',
  imagesStandfirst:
    'Ordnen Sie JPEG- und PNG-Bilder, wählen Sie ein Papierformat und erzeugen Sie ein einziges PDF in einem eigenen Browser-Worker.',
  imagesAcceptHint: 'JPEG oder PNG · 40 Dateien · 100 MB insgesamt',
  toWordStandfirstLead: 'Holen Sie den Text eines PDFs in eine bearbeitbare',
  toWordStandfirstTail:
    'Datei. Das PDF wird von dieser Seite gelesen und nie an einen Server gesendet.',
  optimizeStandfirst:
    'Skalieren, komprimieren und wandeln Sie ein einzelnes statisches JPEG, PNG oder WebP um, ohne es hochzuladen.',
  optimizeAcceptHint: 'JPEG, PNG oder WebP · maximal 25 MB',
  optimizeLimitNote: 'Diese Version nimmt Ausgangsbilder bis 25 MB an.',
  subjectFile: 'Datei',
  subjectImage: 'Bild',
  subjectText: 'Text',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Diese Dateien überschreiten die derzeitige Sicherheitsgrenze von 150 MB insgesamt.',
  mergeTooMany:
    'In dieser Version können Sie bis zu {max} PDFs auf einmal zusammenfügen.',
  mergeMoveEarlier: '{name} nach vorn',
  mergeMoveLater: '{name} nach hinten',
  mergeRemoveFile: '{name} entfernen',
  mergeInspectorNoStart:
    'Die PDF-Prüfung konnte nicht starten. Ihre Dateien sind unverändert.',
  mergeInspectorStopped:
    'Die PDF-Prüfung wurde unerwartet beendet. Ihre Dateien sind unverändert.',
  mergeReadFailed:
    'Der Browser konnte eine dieser Dateien nicht lesen. Ihre Originale sind unverändert.',
  mergeNoStart:
    'Das Zusammenfügen konnte nicht starten. Ihre Original-PDFs sind unverändert.',
  mergeStopped:
    'Das Zusammenfügen wurde unerwartet beendet. Ihre Original-PDFs sind unverändert.',
  compressReadFailed: 'Der Browser konnte diese Datei nicht lesen.',
  compressNoStart:
    'Das Verkleinern konnte nicht starten. Ihr Original ist unverändert.',
  compressStopped:
    'Das Verkleinern wurde unerwartet beendet. Ihr Original ist unverändert.',
  compressInspectorStopped: 'Die PDF-Prüfung wurde unerwartet beendet.',
  compressDoneSmaller: 'Fertig — {percent} % kleiner',
  compressDoneAlready:
    'Fertig — dieses PDF war schon so klein, wie wir es machen können',
  compressAlreadyUnder:
    'Lag bereits unter der Obergrenze — Ihre Datei ist unverändert',
  compressUnderCeiling: 'Unter der Obergrenze — {size}',
  compressStillOver: 'Noch über der Obergrenze — am kleinsten erreicht: {size}',
  imagesTooLarge:
    'Diese Bilder überschreiten die derzeitige Sicherheitsgrenze von 100 MB insgesamt.',
  imagesTooMany: 'Wählen Sie höchstens {max} Bilder pro PDF.',
  imagesMoveUp: '{name} nach oben',
  imagesMoveDown: '{name} nach unten',
  imagesRemove: '{name} entfernen',
  imagesNoStart:
    'Der Browser konnte die PDF-Erzeugung nicht starten. Ihre Bilder sind unverändert.',
  imagesStopped:
    'Die PDF-Erzeugung wurde unerwartet beendet. Ihre Bilder sind unverändert.',
  toWordFailed: 'Dieses PDF konnte nicht umgewandelt werden.',
  toWordTooLarge:
    '{name} ist {size} groß. Diese Seite arbeitet mit Dateien bis {max}.',
  optimizeWrongType:
    'Wählen Sie ein JPEG-, PNG- oder WebP-Bild. Animierte Ausgabe wird nicht unterstützt.',
  optimizeTooLarge: 'Die Grenze von 25 MB je Datei wurde überschritten.',
  optimizeCanvasUnavailable:
    'Die Canvas-Verarbeitung ist in diesem Browser nicht verfügbar.',
  optimizeDecodeFailed: 'Der Browser konnte dieses Bild nicht dekodieren.',
  optimizeEncodeFailed: 'Der Browser konnte dieses Bild nicht kodieren.',
  optimizeFailed: 'Das Bild konnte nicht optimiert werden.',
  optimizeDimensionCheckFailed:
    'Das optimierte Bild hat die Prüfung seiner Abmessungen nicht bestanden.',
  optimizeNoFormat: 'Dieser Browser hat kein brauchbares Bildformat erzeugt.',
  optimizeBadDimensions:
    'Breite und Höhe müssen ganze Zahlen von 1 bis 12.000 sein.',
  optimizeLarger: '{percent} % größer',
  briefStepsHeading: 'Was bei dieser Aufgabe passiert',
  briefLimitsHeading: 'Was es nicht tun wird',
  toWordScopeProse:
    'Es holt den Text zurück: die Lesereihenfolge, die Absätze, die Seitenumbrüche und die Überschriften, wo das PDF sie größer setzt. Es baut das Seitenlayout nicht nach: Spalten, Tabellen als echte Tabellen, Bilder und Schriften werden nicht übernommen. Ist Ihr PDF ein Scan oder das Foto eines Blattes, enthält es überhaupt keinen Text, und diese Seite sagt Ihnen das, statt Ihnen ein leeres Dokument zu geben.',
};
