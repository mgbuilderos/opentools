import type { ToolUiMessages } from './messages';

/** Español. Registro de interfaz: imperativo, breve, sin rodeos. */
export const ES_TOOL_UI: ToolUiMessages = {
  dismissError: 'Descartar el error',
  clear: 'Limpiar',
  clearAll: 'Quitar todo',
  cancel: 'Cancelar',
  processing: 'Procesando',
  outputCheck: 'Comprobación del resultado',
  before: 'Antes',
  after: 'Después',
  saved: 'Guardado',
  output: 'Resultado',
  input: 'Entrada',
  files: 'Archivos',
  chooseAnother: 'Elegir otro',
  onDevicePrototype: 'Prototipo en tu dispositivo',
  savePdf: 'Guardar PDF',

  mergeTitle: 'Unir PDF',
  mergePageManagement: 'Gestión de páginas',
  mergePdfsToMerge: 'PDF que se van a unir',
  mergeChoosePdfs: 'Elegir PDF',
  mergeSignatureNote:
    'Las firmas de archivo y el número de páginas se comprueban en tu navegador.',
  mergeOriginalsNote: 'Los originales no se modifican.',
  mergeDownloadAria: 'Descargar el PDF unido',
  mergeDownloadLabel: 'Descargar unido.pdf',
  mergeOrderAria: 'Orden de unión de los PDF',
  mergePhaseTiming: 'Tiempos por fase',
  mergeCouldntUse: 'No se pudo usar ese PDF',
  mergeCancelled:
    'Unión cancelada. Los PDF que elegiste siguen aquí y sin cambios.',
  mergeStatusAria:
    'Estado del procesado local. La prueba de la versión está pendiente.',

  compressChooseSource: 'Elegir el PDF de origen',
  compressChoosePdf: 'Elige un PDF para comprimir',
  compressPages: 'Páginas',
  compressPhotos: 'Fotos',
  compressPhotoQuality: 'Calidad de las fotos',
  compressLargestEdge: 'Borde más largo de la foto',
  compressKeepFullSize: 'Mantener el tamaño original',
  compressEdgeEmail: '1000 px — correo',
  compressEdgeScreen: '1600 px — pantalla',
  compressEdgePrint: '2400 px — impresión',
  compressReEncode: 'Recodificar las fotos del PDF',
  compressReEncoding: 'Recodificando las fotos',
  compressClearMetadata: 'Vaciar título, autor y productor',
  compressCeiling: 'Límite (KB)',
  compressFitCeiling: 'Ajustar por debajo del límite de un portal',
  compressWhereItRan: 'Dónde se ejecutó',
  compressSave: 'Guardar el PDF comprimido',
  compressCouldnt: 'No se pudo comprimir este PDF',

  imagesTitle: 'Imágenes a PDF',
  imagesAdd: 'Añadir imágenes',
  imagesChoose: 'Elegir imágenes',
  imagesChooseAria: 'Elegir imágenes JPEG o PNG',
  imagesChooseHint: 'Elige imágenes JPEG o PNG para convertirlas en PDF',
  imagesSourceImages: 'Imágenes de origen',
  imagesLabel: 'Imágenes',
  imagesPageSize: 'Tamaño de página',
  imagesFitEach: 'Ajustar a cada imagen',
  imagesUsLetter: 'Carta (EE. UU.)',
  imagesOrientation: 'Orientación',
  imagesMatchEach: 'Según cada imagen',
  imagesPortrait: 'Vertical',
  imagesLandscape: 'Horizontal',
  imagesMargin: 'Margen',
  imagesMarginNone: 'Ninguno',
  imagesMarginSmall: 'Pequeño',
  imagesMarginMedium: 'Mediano',
  imagesMarginLarge: 'Grande',
  imagesOnePerImage: 'Se crea una página de PDF por cada imagen.',
  imagesCreate: 'Crear',
  imagesEmbedding: 'Incrustando las imágenes',
  imagesSave: 'Guardar el PDF generado',
  imagesCouldnt: 'No se pudo crear este PDF',
  imagesPrivacyBoundary: 'Límite de privacidad',
  imagesNoNetwork: 'Sin primitiva de red para archivos',

  toWordTitle: 'PDF a Word',
  toWordShort: 'A Word',
  chooseAPdf: 'Elegir un PDF',
  toWordChooseAria: 'Elegir archivo o archivos PDF',
  toWordChooseHint: 'Elige un PDF de este dispositivo para convertirlo.',
  toWordRemoveAria: 'Quitar el PDF elegido',
  toWordSave: 'Guardar el documento de Word',
  toWordSaveShort: 'Guardar el archivo de Word',
  toWordWordFile: 'Archivo de Word',
  toWordParagraphs: 'Párrafos',
  toWordCharacters: 'Caracteres',
  toWordTook: 'Tardó',
  toWordConvertAnother: 'Convertir otro',
  toWordOcrLink: 'Leer este escaneo con OCR',
  toWordScope: 'Qué hace y qué no hace',
  toWordCouldnt: 'No se pudo convertir este PDF',

  optimizeTitle: 'Optimizar la imagen',
  optimizeAction: 'Optimizar',
  optimizeImage: 'Imagen',
  optimizeSourceImage: 'Imagen de origen',
  optimizeChoose: 'Elegir una imagen',
  optimizeChooseAria: 'Elegir la imagen que se va a optimizar',
  optimizeMaxWidth: 'Ancho máximo',
  optimizeMaxHeight: 'Alto máximo',
  optimizeOutputFormat: 'Formato de salida',
  optimizeSave: 'Guardar la imagen',
  optimizeOriginalUnchanged: 'El original no se modifica.',
  optimizeDecodedMatch: 'Las dimensiones decodificadas coinciden',
  optimizeInThisTab: 'En esta pestaña',
  optimizeReleaseAssurance: 'Garantía de la versión',
  optimizeEgressPending: 'Prueba formal de no salida pendiente',
  optimizeCouldnt: 'No se pudo optimizar esta imagen',
  browserWorker: 'Worker del navegador',
  inThisBrowserTab: 'En esta pestaña del navegador',
  upTo150Mb: 'Hasta 150 MB',
  mergeStandfirst:
    'Une PDF en el orden que elijas. El trabajo se hace en un worker dedicado del navegador.',
  mergeOperation: 'Unión de PDF',
  mergeCounts: '{files} archivos · {pages} páginas',
  mergeSummary: '{files} archivos PDF unidos en {pages} páginas.',
  compressOperation: 'Compresor de PDF',
  compressInspecting: 'Analizando el PDF en tu dispositivo…',
  compressSummaryOne:
    '{pages} página reescrita y comprobada en este navegador.',
  compressSummaryMany:
    'Páginas reescritas y comprobadas en este navegador: {pages}.',
  compressNoneReEncoded: 'Ninguna recodificada',
  compressReEncodedCount: '{count} recodificadas',
  compressPhotoQualityValue: 'Calidad de las fotos {quality}%',
  compressCeilingLine: 'Límite {bytes}.',
  compressRewriteOne: 'reescritura',
  compressRewriteMany: 'reescrituras',
  compressFitAlreadyUnder:
    'El archivo que abriste ya estaba por debajo, así que no se recodificó nada y no se perdió nada.',
  compressFitMet:
    'Conseguido tras {attempts} {rewrites} medidas, con calidad de foto {quality}% y un borde máximo de {edge} px. Cada intento se pesó por los bytes que produjo de verdad, no por una estimación.',
  compressFitMissed:
    'Se probaron {attempts} {rewrites} medidas, bajando hasta calidad {quality}% y {edge} px, y ninguna quedó por debajo. Al guardar obtienes la más pequeña que se produjo. Divide el documento o quédate con las páginas que el portal pidió.',
  compressNothingSaved:
    'El archivo reescrito no salió más pequeño, así que este es tu original, byte a byte. Un PDF casi todo texto tiene poco que exprimir: aquí la ganancia está en las fotos.',
  imagesUnsupported:
    'Elige imágenes JPEG o PNG. Las imágenes animadas y vectoriales no se admiten aquí.',
  imagesSummaryOne: '{count} imagen colocada en un PDF comprobado.',
  imagesSummaryMany: 'Imágenes colocadas en un PDF comprobado: {count}.',
  imagesBuilding: 'Creándolo en tu dispositivo…',
  imagesCreatePdf: 'Crear el PDF',
  imagesFitImage: 'Ajustado a la imagen',
  toWordSummaryOne: '{pages} página leída en este navegador; solo texto.',
  toWordSummaryMany: 'Páginas leídas en este navegador, solo texto: {pages}.',
  toWordNoTextNote:
    '{without} de {total} páginas no tenían texto y no aportaron nada al documento de Word. Esas páginas son imágenes —un escaneo o una foto—, así que no había nada que copiar.',
  toWordTextOnlyNote:
    'Solo texto. El diseño, las columnas, las tablas y las imágenes del PDF no están en este archivo.',
  optimizeOperation: 'Optimizador de imágenes',
  optimizeSummary: 'Imagen convertida a {format} a {width} × {height} px.',
  optimizeChooseMany: 'Elegir imágenes',
  optimizeBusy: 'Optimizando…',
  optimizeAll: 'Optimizar todas',
  optimizePreviewAlt: 'Vista previa optimizada',
  optimizeNextMerge: 'Siguiente: unir PDF →',
  runsInThisTab: 'Funciona en esta pestaña, sin subir nada',
  freeNoAccount: 'Gratis, sin cuenta y sin marca de agua',
  batchLocalPromise:
    'Sin límite de archivos, sin límite diario y sin cola: el trabajo ocurre en esta máquina. Elige un archivo para el flujo normal, o varios para procesarlos por lotes y descargarlos en un ZIP.',
  recipeCopyLink: 'Copiar el enlace de ajustes',
  recipeLinkCopied: 'Enlace de ajustes copiado',
  recipeSettingsOnly:
    'Solo se envían estos ajustes. Tu {subject} se queda en este dispositivo y nunca forma parte del enlace.',
  recipeCopyByHand:
    'Copia este enlace a mano: el navegador bloqueó el portapapeles',
  noClientAnalytics: 'Sin analítica en el navegador en esta versión previa',
  browserCanvasNote: 'Canvas del navegador · Salida ráster estática',
  mergeCapacity:
    'Hasta {max} archivos · 150 MB en total en esta versión canary',
  mergeInspecting: 'Analizando los PDF en tu dispositivo…',
  mergeDropHere: 'Arrastra aquí los PDF',
  mergeCanaryScope:
    'Alcance de esta versión canary: une el contenido y el orden de las páginas. Los marcadores, las firmas, los formularios, los adjuntos y los metadatos del documento todavía no están garantizados.',
  mergeAddAtLeastTwo: 'Añade al menos 2 PDF',
  mergeReady: 'Listo para unir',
  mergeTryingSettings: 'Probando ajustes de compresión',
  compressStandfirst:
    'Reescribe un PDF de forma más compacta y recodifica las fotos que contiene. El archivo lo lee esta página y nunca se envía a un servidor.',
  compressFitUnderCeiling: 'Ajustar bajo el límite',
  compressLimitNote: 'Esta versión admite un PDF de origen de hasta 150 MB.',
  compressCeilingHelp:
    'Elige el trámite que vas a presentar o escribe tu propio límite. La página recodifica con calidad descendente hasta que un resultado medido queda realmente por debajo: sin estimaciones y sin bucles silenciosos, cada intento es una reescritura real y se informa del número.',
  compressPresetReadFrom: 'Leído de',
  compressPresetOn: 'el',
  compressPresetWarning:
    'Los portales cambian los límites sin avisar: comprueba el tuyo antes de confiar en esto.',
  imagesStandfirst:
    'Ordena imágenes JPEG y PNG, elige un formato de papel y crea un único PDF en un worker dedicado del navegador.',
  imagesAcceptHint: 'JPEG o PNG · 40 archivos · 100 MB en total',
  toWordStandfirstLead: 'Extrae el texto de un PDF a un archivo',
  toWordStandfirstTail:
    'editable. El PDF lo lee esta página y nunca se envía a un servidor.',
  optimizeStandfirst:
    'Redimensiona, comprime y convierte una imagen JPEG, PNG o WebP estática sin subirla.',
  optimizeAcceptHint: 'JPEG, PNG o WebP · 25 MB como máximo',
  optimizeLimitNote: 'Esta versión admite imágenes de origen de hasta 25 MB.',
  subjectFile: 'archivo',
  subjectImage: 'imagen',
  subjectText: 'texto',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Estos archivos superan el límite de seguridad actual de 150 MB en total.',
  mergeTooMany: 'En esta versión puedes unir hasta {max} PDF a la vez.',
  mergeMoveEarlier: 'Adelantar {name}',
  mergeMoveLater: 'Retrasar {name}',
  mergeRemoveFile: 'Quitar {name}',
  mergeInspectorNoStart:
    'El inspector de PDF no pudo iniciarse. Tus archivos están sin cambios.',
  mergeInspectorStopped:
    'El inspector de PDF se detuvo de forma inesperada. Tus archivos están sin cambios.',
  mergeReadFailed:
    'El navegador no pudo leer uno de estos archivos. Tus originales están sin cambios.',
  mergeNoStart:
    'La unión no pudo iniciarse. Tus PDF originales están sin cambios.',
  mergeStopped:
    'La unión se detuvo de forma inesperada. Tus PDF originales están sin cambios.',
  compressReadFailed: 'El navegador no pudo leer ese archivo.',
  compressNoStart:
    'La compresión del PDF no pudo iniciarse. Tu original está sin cambios.',
  compressStopped:
    'La compresión del PDF se detuvo de forma inesperada. Tu original está sin cambios.',
  compressInspectorStopped:
    'El inspector de PDF se detuvo de forma inesperada.',
  compressDoneSmaller: 'Listo: un {percent}% más pequeño',
  compressDoneAlready:
    'Listo: este PDF ya era lo más pequeño que podemos conseguir',
  compressAlreadyUnder:
    'Ya estaba por debajo del límite: tu archivo no se ha modificado',
  compressUnderCeiling: 'Por debajo del límite: {size}',
  compressStillOver:
    'Todavía por encima del límite: lo más pequeño alcanzado fue {size}',
  imagesTooLarge:
    'Estas imágenes superan el límite de seguridad actual de 100 MB en total.',
  imagesTooMany: 'Elige un máximo de {max} imágenes por PDF.',
  imagesMoveUp: 'Subir {name}',
  imagesMoveDown: 'Bajar {name}',
  imagesRemove: 'Quitar {name}',
  imagesNoStart:
    'El navegador no pudo iniciar la creación del PDF. Tus imágenes están sin cambios.',
  imagesStopped:
    'La creación del PDF se detuvo de forma inesperada. Tus imágenes están sin cambios.',
  toWordFailed: 'No se pudo convertir este PDF.',
  toWordTooLarge:
    '{name} pesa {size}. Esta página admite archivos de hasta {max}.',
  optimizeWrongType:
    'Elige una imagen JPEG, PNG o WebP. No se admite salida animada.',
  optimizeTooLarge: 'Se superó el límite de 25 MB por archivo.',
  optimizeCanvasUnavailable:
    'El procesado con canvas no está disponible en este navegador.',
  optimizeDecodeFailed: 'El navegador no pudo decodificar esta imagen.',
  optimizeEncodeFailed: 'El navegador no pudo codificar esta imagen.',
  optimizeFailed: 'No se pudo optimizar la imagen.',
  optimizeDimensionCheckFailed:
    'La imagen optimizada no pasó la comprobación de dimensiones.',
  optimizeNoFormat:
    'Este navegador no produjo un formato de imagen utilizable.',
  optimizeBadDimensions:
    'El ancho y el alto deben ser números enteros del 1 al 12.000.',
  optimizeLarger: 'un {percent}% más grande',
  briefStepsHeading: 'Qué ocurre en este trabajo',
  briefLimitsHeading: 'Lo que no hará',
  toWordScopeProse:
    'Recupera el texto: el orden de lectura, los párrafos, los saltos de página y los títulos donde el PDF los marca con un cuerpo mayor. No reconstruye la maquetación de la página: las columnas, las tablas como tablas reales, las imágenes y las tipografías no se trasladan. Si tu PDF es un escaneo o una foto de un papel, no contiene texto alguno, y esta página te lo dirá en lugar de entregarte un documento vacío.',
};
