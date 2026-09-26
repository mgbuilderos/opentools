import type { ToolUiMessages } from './messages';

/** Français. Registre d’interface : impératif, court, sans détour. */
export const FR_TOOL_UI: ToolUiMessages = {
  dismissError: 'Fermer l’erreur',
  clear: 'Effacer',
  clearAll: 'Tout retirer',
  cancel: 'Annuler',
  processing: 'Traitement',
  outputCheck: 'Vérification du résultat',
  before: 'Avant',
  after: 'Après',
  saved: 'Enregistré',
  output: 'Résultat',
  input: 'Entrée',
  files: 'Fichiers',
  chooseAnother: 'Choisir un autre',
  onDevicePrototype: 'Prototype sur votre appareil',
  savePdf: 'Enregistrer le PDF',

  mergeTitle: 'Fusionner PDF',
  mergePageManagement: 'Gestion des pages',
  mergePdfsToMerge: 'PDF à fusionner',
  mergeChoosePdfs: 'Choisir des PDF',
  mergeSignatureNote:
    'Les signatures de fichier et le nombre de pages sont vérifiés dans votre navigateur.',
  mergeOriginalsNote: 'Les originaux ne sont pas modifiés.',
  mergeDownloadAria: 'Télécharger le PDF fusionné',
  mergeDownloadLabel: 'Télécharger fusionne.pdf',
  mergeOrderAria: 'Ordre de fusion des PDF',
  mergePhaseTiming: 'Durée par étape',
  mergeCouldntUse: 'Impossible d’utiliser ce PDF',
  mergeCancelled:
    'Fusion annulée. Les PDF que vous avez choisis sont toujours là, inchangés.',
  mergeStatusAria:
    'État du traitement local. La preuve de version est en attente.',

  compressChooseSource: 'Choisir le PDF source',
  compressChoosePdf: 'Choisissez un PDF à compresser',
  compressPages: 'Pages',
  compressPhotos: 'Photos',
  compressPhotoQuality: 'Qualité des photos',
  compressLargestEdge: 'Plus grand côté de la photo',
  compressKeepFullSize: 'Garder la taille d’origine',
  compressEdgeEmail: '1000 px — e-mail',
  compressEdgeScreen: '1600 px — écran',
  compressEdgePrint: '2400 px — impression',
  compressReEncode: 'Ré-encoder les photos du PDF',
  compressReEncoding: 'Ré-encodage des photos',
  compressClearMetadata: 'Effacer titre, auteur et producteur',
  compressCeiling: 'Plafond (Ko)',
  compressFitCeiling: 'Passer sous le plafond d’un téléservice',
  compressWhereItRan: 'Où cela s’est exécuté',
  compressSave: 'Enregistrer le PDF compressé',
  compressCouldnt: 'Impossible de compresser ce PDF',

  imagesTitle: 'Images en PDF',
  imagesAdd: 'Ajouter des images',
  imagesChoose: 'Choisir des images',
  imagesChooseAria: 'Choisir des images JPEG ou PNG',
  imagesChooseHint: 'Choisissez des images JPEG ou PNG à convertir en PDF',
  imagesSourceImages: 'Images source',
  imagesLabel: 'Images',
  imagesPageSize: 'Format de page',
  imagesFitEach: 'Ajuster à chaque image',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Orientation',
  imagesMatchEach: 'Selon chaque image',
  imagesPortrait: 'Portrait',
  imagesLandscape: 'Paysage',
  imagesMargin: 'Marge',
  imagesMarginNone: 'Aucune',
  imagesMarginSmall: 'Petite',
  imagesMarginMedium: 'Moyenne',
  imagesMarginLarge: 'Grande',
  imagesOnePerImage: 'Une page de PDF est créée par image.',
  imagesCreate: 'Créer',
  imagesEmbedding: 'Intégration des images',
  imagesSave: 'Enregistrer le PDF généré',
  imagesCouldnt: 'Impossible de créer ce PDF',
  imagesPrivacyBoundary: 'Périmètre de confidentialité',
  imagesNoNetwork: 'Aucune primitive réseau pour les fichiers',

  toWordTitle: 'PDF en Word',
  toWordShort: 'En Word',
  chooseAPdf: 'Choisir un PDF',
  toWordChooseAria: 'Choisir le ou les fichiers PDF',
  toWordChooseHint: 'Choisissez un PDF de cet appareil à convertir.',
  toWordRemoveAria: 'Retirer le PDF choisi',
  toWordSave: 'Enregistrer le document Word',
  toWordSaveShort: 'Enregistrer le fichier Word',
  toWordWordFile: 'Fichier Word',
  toWordParagraphs: 'Paragraphes',
  toWordCharacters: 'Caractères',
  toWordTook: 'Durée',
  toWordConvertAnother: 'Convertir un autre',
  toWordOcrLink: 'Lire ce scan avec l’OCR',
  toWordScope: 'Ce que cela fait, et ce que cela ne fait pas',
  toWordCouldnt: 'Impossible de convertir ce PDF',

  optimizeTitle: 'Optimiser l’image',
  optimizeAction: 'Optimiser',
  optimizeImage: 'Image',
  optimizeSourceImage: 'Image source',
  optimizeChoose: 'Choisir une image',
  optimizeChooseAria: 'Choisir l’image à optimiser',
  optimizeMaxWidth: 'Largeur maximale',
  optimizeMaxHeight: 'Hauteur maximale',
  optimizeOutputFormat: 'Format de sortie',
  optimizeSave: 'Enregistrer l’image',
  optimizeOriginalUnchanged: 'L’original reste inchangé.',
  optimizeDecodedMatch: 'Les dimensions décodées correspondent',
  optimizeInThisTab: 'Dans cet onglet',
  optimizeReleaseAssurance: 'Garantie de version',
  optimizeEgressPending: 'Preuve formelle de non-transfert en attente',
  optimizeCouldnt: 'Impossible d’optimiser cette image',
  browserWorker: 'Worker du navigateur',
  inThisBrowserTab: 'Dans cet onglet du navigateur',
  upTo150Mb: 'Jusqu’à 150 Mo',
  mergeStandfirst:
    'Fusionnez des PDF dans l’ordre que vous choisissez. Le travail a lieu dans un worker dédié du navigateur.',
  mergeOperation: 'Fusion de PDF',
  mergeCounts: '{files} fichiers · {pages} pages',
  mergeSummary: '{files} fichiers PDF fusionnés en {pages} pages.',
  compressOperation: 'Compresseur de PDF',
  compressInspecting: 'Analyse du PDF sur votre appareil…',
  compressSummaryOne: '{pages} page réécrite et vérifiée dans ce navigateur.',
  compressSummaryMany:
    'Pages réécrites et vérifiées dans ce navigateur : {pages}.',
  compressNoneReEncoded: 'Aucune ré-encodée',
  compressReEncodedCount: '{count} ré-encodées',
  compressPhotoQualityValue: 'Qualité des photos {quality} %',
  compressCeilingLine: 'Plafond {bytes}.',
  compressRewriteOne: 'réécriture',
  compressRewriteMany: 'réécritures',
  compressFitAlreadyUnder:
    'Le fichier que vous avez ouvert était déjà en dessous : rien n’a été ré-encodé et rien n’a été perdu.',
  compressFitMet:
    'Atteint après {attempts} {rewrites} mesurées, à une qualité photo de {quality} % et un plus grand côté de {edge} px. Chaque tentative a été pesée sur les octets réellement produits, pas sur une estimation.',
  compressFitMissed:
    '{attempts} {rewrites} mesurées ont été tentées, jusqu’à une qualité de {quality} % à {edge} px, et aucune n’est passée en dessous. En enregistrant, vous obtenez la plus petite produite. Découpez le document, ou ne gardez que les pages demandées.',
  compressNothingSaved:
    'Le fichier réécrit n’est pas sorti plus petit : voici donc votre original, octet pour octet. Un PDF presque entièrement composé de texte a peu à céder ; ici le gain vient des photos.',
  imagesUnsupported:
    'Choisissez des images JPEG ou PNG. Les images animées et vectorielles ne sont pas prises en charge ici.',
  imagesSummaryOne: '{count} image placée dans un PDF vérifié.',
  imagesSummaryMany: 'Images placées dans un PDF vérifié : {count}.',
  imagesBuilding: 'Création sur votre appareil…',
  imagesCreatePdf: 'Créer le PDF',
  imagesFitImage: 'Ajusté à l’image',
  toWordSummaryOne: '{pages} page lue dans ce navigateur ; texte seulement.',
  toWordSummaryMany:
    'Pages lues dans ce navigateur, texte seulement : {pages}.',
  toWordNoTextNote:
    '{without} pages sur {total} ne contenaient aucun texte et n’ont rien apporté au document Word. Ces pages sont des images — un scan ou une photo — il n’y avait donc rien à copier.',
  toWordTextOnlyNote:
    'Texte seulement. La mise en page, les colonnes, les tableaux et les images du PDF ne sont pas dans ce fichier.',
  optimizeOperation: 'Optimiseur d’images',
  optimizeSummary: 'Image convertie en {format} à {width} × {height} px.',
  optimizeChooseMany: 'Choisir des images',
  optimizeBusy: 'Optimisation…',
  optimizeAll: 'Tout optimiser',
  optimizePreviewAlt: 'Aperçu optimisé',
  optimizeNextMerge: 'Suivant : fusionner PDF →',
  runsInThisTab: 'Tourne dans cet onglet, sans envoi',
  freeNoAccount: 'Gratuit, sans compte, sans filigrane',
  batchLocalPromise:
    'Aucune limite de nombre de fichiers, aucune limite quotidienne, aucune file d’attente : le travail se fait sur cette machine. Choisissez un fichier pour le flux habituel, ou plusieurs pour un traitement par lot et un seul ZIP.',
  recipeCopyLink: 'Copier le lien de réglages',
  recipeLinkCopied: 'Lien de réglages copié',
  recipeSettingsOnly:
    'Seuls ces réglages sont transmis. Votre {subject} reste sur cet appareil et ne fait jamais partie du lien.',
  recipeCopyByHand:
    'Copiez ce lien à la main : le navigateur a bloqué le presse-papiers',
  noClientAnalytics: 'Aucune mesure d’audience côté navigateur dans cet aperçu',
  browserCanvasNote: 'Canvas du navigateur · Sortie raster statique',
  mergeCapacity:
    'Jusqu’à {max} fichiers · 150 Mo au total dans cette version canari',
  mergeInspecting: 'Analyse des PDF sur votre appareil…',
  mergeDropHere: 'Déposez vos PDF ici',
  mergeCanaryScope:
    'Périmètre de cette version canari : assemble le contenu et l’ordre des pages. Les signets, les signatures, les formulaires, les pièces jointes et les métadonnées du document ne sont pas encore garantis.',
  mergeAddAtLeastTwo: 'Ajoutez au moins 2 PDF',
  mergeReady: 'Prêt à fusionner',
  mergeTryingSettings: 'Essai de réglages de compression',
  compressStandfirst:
    'Réécrivez un PDF de façon plus compacte et ré-encodez les photos qu’il contient. Le fichier est lu par cette page et n’est jamais envoyé à un serveur.',
  compressFitUnderCeiling: 'Passer sous le plafond',
  compressLimitNote: 'Cette version accepte un PDF source jusqu’à 150 Mo.',
  compressCeilingHelp:
    'Choisissez le téléservice auquel vous répondez, ou saisissez votre propre plafond. La page ré-encode ensuite à qualité décroissante jusqu’à ce qu’un résultat mesuré passe réellement en dessous : pas d’estimation, pas de boucle silencieuse — chaque tentative est une vraie réécriture et leur nombre est indiqué.',
  compressPresetReadFrom: 'Lu sur',
  compressPresetOn: 'le',
  compressPresetWarning:
    'Les téléservices changent leurs limites sans prévenir : vérifiez la vôtre avant de vous y fier.',
  imagesStandfirst:
    'Ordonnez des images JPEG et PNG, choisissez un format de papier et créez un seul PDF dans un worker dédié du navigateur.',
  imagesAcceptHint: 'JPEG ou PNG · 40 fichiers · 100 Mo au total',
  toWordStandfirstLead: 'Extrayez le texte d’un PDF vers un fichier',
  toWordStandfirstTail:
    'modifiable. Le PDF est lu par cette page et n’est jamais envoyé à un serveur.',
  optimizeStandfirst:
    'Redimensionnez, compressez et convertissez une image JPEG, PNG ou WebP statique sans l’envoyer.',
  optimizeAcceptHint: 'JPEG, PNG ou WebP · 25 Mo maximum',
  optimizeLimitNote: 'Cette version accepte des images source jusqu’à 25 Mo.',
  subjectFile: 'fichier',
  subjectImage: 'image',
  subjectText: 'texte',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Ces fichiers dépassent la limite de sécurité actuelle de 150 Mo au total.',
  mergeTooMany:
    'Dans cette version vous pouvez fusionner jusqu’à {max} PDF à la fois.',
  mergeMoveEarlier: 'Avancer {name}',
  mergeMoveLater: 'Reculer {name}',
  mergeRemoveFile: 'Retirer {name}',
  mergeInspectorNoStart:
    'L’inspecteur de PDF n’a pas pu démarrer. Vos fichiers sont inchangés.',
  mergeInspectorStopped:
    'L’inspecteur de PDF s’est arrêté de façon inattendue. Vos fichiers sont inchangés.',
  mergeReadFailed:
    'Le navigateur n’a pas pu lire l’un de ces fichiers. Vos originaux sont inchangés.',
  mergeNoStart:
    'La fusion n’a pas pu démarrer. Vos PDF d’origine sont inchangés.',
  mergeStopped:
    'La fusion s’est arrêtée de façon inattendue. Vos PDF d’origine sont inchangés.',
  compressReadFailed: 'Le navigateur n’a pas pu lire ce fichier.',
  compressNoStart:
    'La compression du PDF n’a pas pu démarrer. Votre original est inchangé.',
  compressStopped:
    'La compression du PDF s’est arrêtée de façon inattendue. Votre original est inchangé.',
  compressInspectorStopped:
    'L’inspecteur de PDF s’est arrêté de façon inattendue.',
  compressDoneSmaller: 'Terminé — {percent} % plus petit',
  compressDoneAlready: 'Terminé — ce PDF était déjà aussi petit que possible',
  compressAlreadyUnder: 'Déjà sous le plafond — votre fichier est inchangé',
  compressUnderCeiling: 'Sous le plafond — {size}',
  compressStillOver:
    'Toujours au-dessus du plafond — le plus petit atteint était {size}',
  imagesTooLarge:
    'Ces images dépassent la limite de sécurité actuelle de 100 Mo au total.',
  imagesTooMany: 'Choisissez au maximum {max} images par PDF.',
  imagesMoveUp: 'Monter {name}',
  imagesMoveDown: 'Descendre {name}',
  imagesRemove: 'Retirer {name}',
  imagesNoStart:
    'Le navigateur n’a pas pu démarrer la création du PDF. Vos images sont inchangées.',
  imagesStopped:
    'La création du PDF s’est arrêtée de façon inattendue. Vos images sont inchangées.',
  toWordFailed: 'Ce PDF n’a pas pu être converti.',
  toWordTooLarge:
    '{name} pèse {size}. Cette page accepte les fichiers jusqu’à {max}.',
  optimizeWrongType:
    'Choisissez une image JPEG, PNG ou WebP. La sortie animée n’est pas prise en charge.',
  optimizeTooLarge: 'La limite de 25 Mo par fichier a été dépassée.',
  optimizeCanvasUnavailable:
    'Le traitement par canvas n’est pas disponible dans ce navigateur.',
  optimizeDecodeFailed: 'Le navigateur n’a pas pu décoder cette image.',
  optimizeEncodeFailed: 'Le navigateur n’a pas pu encoder cette image.',
  optimizeFailed: 'L’image n’a pas pu être optimisée.',
  optimizeDimensionCheckFailed:
    'L’image optimisée a échoué au contrôle de ses dimensions.',
  optimizeNoFormat:
    'Ce navigateur n’a pas produit de format d’image utilisable.',
  optimizeBadDimensions:
    'La largeur et la hauteur doivent être des entiers de 1 à 12 000.',
  optimizeLarger: '{percent} % plus grand',
  briefStepsHeading: 'Ce qui se passe sur ce travail',
  briefLimitsHeading: 'Ce qu’il ne fera pas',
  toWordScopeProse:
    'Il récupère le texte : l’ordre de lecture, les paragraphes, les sauts de page et les titres là où le PDF les compose dans un corps plus grand. Il ne reconstruit pas la mise en page : les colonnes, les tableaux en tant que vrais tableaux, les images et les polices ne sont pas repris. Si votre PDF est un scan ou la photo d’une feuille, il ne contient aucun texte, et cette page vous le dira plutôt que de vous remettre un document vide.',
};
