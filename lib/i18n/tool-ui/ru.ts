import type { ToolUiMessages } from './messages';

/** Русский. Интерфейсный регистр: коротко, в повелительном наклонении. */
export const RU_TOOL_UI: ToolUiMessages = {
  dismissError: 'Закрыть ошибку',
  clear: 'Очистить',
  clearAll: 'Убрать всё',
  cancel: 'Отменить',
  processing: 'Обработка',
  outputCheck: 'Проверка результата',
  before: 'До',
  after: 'После',
  saved: 'Сохранено',
  output: 'Результат',
  input: 'Ввод',
  files: 'Файлы',
  chooseAnother: 'Выбрать другой',
  onDevicePrototype: 'Прототип на вашем устройстве',
  savePdf: 'Сохранить PDF',

  mergeTitle: 'Объединить PDF',
  mergePageManagement: 'Работа со страницами',
  mergePdfsToMerge: 'Файлы PDF для объединения',
  mergeChoosePdfs: 'Выбрать файлы PDF',
  mergeSignatureNote:
    'Сигнатуры файлов и число страниц проверяются в вашем браузере.',
  mergeOriginalsNote: 'Исходные файлы не изменяются.',
  mergeDownloadAria: 'Скачать объединённый PDF',
  mergeDownloadLabel: 'Скачать объединённый.pdf',
  mergeOrderAria: 'Порядок объединения PDF',
  mergePhaseTiming: 'Время по этапам',
  mergeCouldntUse: 'Этот PDF использовать не удалось',
  mergeCancelled:
    'Объединение отменено. Выбранные вами файлы PDF остались здесь без изменений.',
  mergeStatusAria:
    'Состояние локальной обработки. Подтверждение выпуска готовится.',

  compressChooseSource: 'Выбрать исходный PDF',
  compressChoosePdf: 'Выберите PDF для сжатия',
  compressPages: 'Страницы',
  compressPhotos: 'Фотографии',
  compressPhotoQuality: 'Качество фотографий',
  compressLargestEdge: 'Длинная сторона фотографии',
  compressKeepFullSize: 'Оставить исходный размер',
  compressEdgeEmail: '1000 px — почта',
  compressEdgeScreen: '1600 px — экран',
  compressEdgePrint: '2400 px — печать',
  compressReEncode: 'Перекодировать фотографии внутри PDF',
  compressReEncoding: 'Перекодирование фотографий',
  compressClearMetadata: 'Очистить заголовок, автора и производителя',
  compressCeiling: 'Предел (КБ)',
  compressFitCeiling: 'Уложиться в предел портала',
  compressWhereItRan: 'Где выполнялось',
  compressSave: 'Сохранить сжатый PDF',
  compressCouldnt: 'Этот PDF сжать не удалось',

  imagesTitle: 'Изображения в PDF',
  imagesAdd: 'Добавить изображения',
  imagesChoose: 'Выбрать изображения',
  imagesChooseAria: 'Выбрать изображения JPEG или PNG',
  imagesChooseHint: 'Выберите изображения JPEG или PNG для перевода в PDF',
  imagesSourceImages: 'Исходные изображения',
  imagesLabel: 'Изображения',
  imagesPageSize: 'Размер страницы',
  imagesFitEach: 'По размеру изображения',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Ориентация',
  imagesMatchEach: 'По каждому изображению',
  imagesPortrait: 'Книжная',
  imagesLandscape: 'Альбомная',
  imagesMargin: 'Поле',
  imagesMarginNone: 'Без поля',
  imagesMarginSmall: 'Малое',
  imagesMarginMedium: 'Среднее',
  imagesMarginLarge: 'Большое',
  imagesOnePerImage: 'Для каждого изображения создаётся одна страница PDF.',
  imagesCreate: 'Создать',
  imagesEmbedding: 'Встраивание изображений',
  imagesSave: 'Сохранить созданный PDF',
  imagesCouldnt: 'Этот PDF создать не удалось',
  imagesPrivacyBoundary: 'Граница приватности',
  imagesNoNetwork: 'Нет сетевых примитивов для файлов',

  toWordTitle: 'PDF в Word',
  toWordShort: 'В Word',
  chooseAPdf: 'Выбрать PDF',
  toWordChooseAria: 'Выбрать файл или файлы PDF',
  toWordChooseHint: 'Выберите PDF с этого устройства для преобразования.',
  toWordRemoveAria: 'Убрать выбранный PDF',
  toWordSave: 'Сохранить документ Word',
  toWordSaveShort: 'Сохранить файл Word',
  toWordWordFile: 'Файл Word',
  toWordParagraphs: 'Абзацы',
  toWordCharacters: 'Символы',
  toWordTook: 'Заняло',
  toWordConvertAnother: 'Преобразовать другой',
  toWordOcrLink: 'Прочитать этот скан распознаванием текста',
  toWordScope: 'Что это делает, а что нет',
  toWordCouldnt: 'Этот PDF преобразовать не удалось',

  optimizeTitle: 'Оптимизировать изображение',
  optimizeAction: 'Оптимизировать',
  optimizeImage: 'Изображение',
  optimizeSourceImage: 'Исходное изображение',
  optimizeChoose: 'Выбрать изображение',
  optimizeChooseAria: 'Выбрать изображение для оптимизации',
  optimizeMaxWidth: 'Максимальная ширина',
  optimizeMaxHeight: 'Максимальная высота',
  optimizeOutputFormat: 'Формат вывода',
  optimizeSave: 'Сохранить изображение',
  optimizeOriginalUnchanged: 'Исходный файл остаётся без изменений.',
  optimizeDecodedMatch: 'Раскодированные размеры совпадают',
  optimizeInThisTab: 'В этой вкладке',
  optimizeReleaseAssurance: 'Гарантия выпуска',
  optimizeEgressPending:
    'Формальное подтверждение отсутствия передачи готовится',
  optimizeCouldnt: 'Это изображение оптимизировать не удалось',
  browserWorker: 'Worker браузера',
  inThisBrowserTab: 'В этой вкладке браузера',
  upTo150Mb: 'До 150 МБ',
  mergeStandfirst:
    'Объединяйте PDF в выбранном вами порядке. Работа идёт в отдельном worker внутри браузера.',
  mergeOperation: 'Объединение PDF',
  mergeCounts: 'Файлы: {files} · Страницы: {pages}',
  mergeSummary: 'Объединено файлов PDF: {files}. Всего страниц: {pages}.',
  compressOperation: 'Сжатие PDF',
  compressInspecting: 'Проверяем PDF на вашем устройстве…',
  compressSummaryOne:
    '{pages} страница перезаписана и проверена в этом браузере.',
  compressSummaryMany:
    'Перезаписано и проверено страниц в этом браузере: {pages}.',
  compressNoneReEncoded: 'Ничего не перекодировано',
  compressReEncodedCount: 'Перекодировано: {count}',
  compressPhotoQualityValue: 'Качество фотографий {quality}%',
  compressCeilingLine: 'Предел {bytes}.',
  compressRewriteOne: 'перезапись',
  compressRewriteMany: 'перезаписей',
  compressFitAlreadyUnder:
    'Открытый файл и так был ниже предела, поэтому ничего не перекодировалось и ничего не потерялось.',
  compressFitMet:
    'Достигнуто после {attempts} измеренных {rewrites}, при качестве фотографий {quality}% и длинной стороне {edge} px. Каждая попытка оценивалась по реально полученным байтам, а не по прикидке.',
  compressFitMissed:
    'Было испробовано {attempts} измеренных {rewrites} — до качества {quality}% при {edge} px, и ни одна не опустилась ниже предела. При сохранении вы получите самый маленький из полученных файлов. Разделите документ или возьмите только те страницы, которые запросил портал.',
  compressNothingSaved:
    'Перезаписанный файл не стал меньше, так что это ваш исходный файл, байт в байт. В PDF, который почти целиком состоит из текста, сжимать почти нечего: выигрыш здесь дают фотографии.',
  imagesUnsupported:
    'Выберите изображения JPEG или PNG. Анимированные и векторные изображения здесь не поддерживаются.',
  imagesSummaryOne: '{count} изображение размещено в одном проверенном PDF.',
  imagesSummaryMany: 'Размещено изображений в одном проверенном PDF: {count}.',
  imagesBuilding: 'Создаём на вашем устройстве…',
  imagesCreatePdf: 'Создать PDF',
  imagesFitImage: 'По размеру изображения',
  toWordSummaryOne: '{pages} страница прочитана в этом браузере; только текст.',
  toWordSummaryMany:
    'Прочитано страниц в этом браузере, только текст: {pages}.',
  toWordNoTextNote:
    'Из {total} страниц {without} не содержали текста и ничего не дали файлу Word. Эти страницы — изображения: скан или фотография, поэтому копировать было нечего.',
  toWordTextOnlyNote:
    'Только текст. Вёрстки, колонок, таблиц и изображений из PDF в этом файле нет.',
  optimizeOperation: 'Оптимизация изображений',
  optimizeSummary:
    'Изображение преобразовано в {format}, размер {width} × {height} px.',
  optimizeChooseMany: 'Выбрать изображения',
  optimizeBusy: 'Оптимизируем…',
  optimizeAll: 'Оптимизировать все',
  optimizePreviewAlt: 'Просмотр после оптимизации',
  optimizeNextMerge: 'Далее: объединить PDF →',
  runsInThisTab: 'Работает в этой вкладке — без загрузки',
  freeNoAccount: 'Бесплатно, без регистрации, без водяных знаков',
  batchLocalPromise:
    'Нет ограничения на число файлов, нет дневного лимита и нет очереди: работа идёт на этой машине. Выберите один файл для обычного режима или сразу несколько — тогда результаты придут одним архивом ZIP.',
  recipeCopyLink: 'Скопировать ссылку с настройками',
  recipeLinkCopied: 'Ссылка с настройками скопирована',
  recipeSettingsOnly:
    'Передаются только эти настройки. Ваш {subject} остаётся на этом устройстве и никогда не входит в ссылку.',
  recipeCopyByHand:
    'Скопируйте эту ссылку вручную — браузер заблокировал буфер обмена',
  noClientAnalytics: 'В этой версии нет аналитики в браузере',
  browserCanvasNote: 'Canvas браузера · Статичный растровый вывод',
  mergeCapacity: 'До {max} файлов · всего 150 МБ в этой пробной версии',
  mergeInspecting: 'Проверяем файлы PDF на вашем устройстве…',
  mergeDropHere: 'Перетащите файлы PDF сюда',
  mergeCanaryScope:
    'Объём этой пробной версии: объединяет содержимое и порядок страниц. Закладки, подписи, формы, вложения и метаданные документа пока не гарантированы.',
  mergeAddAtLeastTwo: 'Добавьте хотя бы 2 файла PDF',
  mergeReady: 'Готово к объединению',
  mergeTryingSettings: 'Пробуем настройки сжатия',
  compressStandfirst:
    'Перезапишите PDF компактнее и перекодируйте фотографии внутри него. Файл читает эта страница, и он никогда не отправляется на сервер.',
  compressFitUnderCeiling: 'Уложиться в предел',
  compressLimitNote: 'Эта версия принимает исходный PDF до 150 МБ.',
  compressCeilingHelp:
    'Выберите форму, в которую подаёте, или впишите свой предел. Затем страница перекодирует со снижением качества, пока измеренный результат действительно не окажется ниже: без прикидок и без тихого цикла — каждая попытка это реальная перезапись, и их число показывается.',
  compressPresetReadFrom: 'Источник',
  compressPresetOn: 'дата проверки',
  compressPresetWarning:
    'Порталы меняют пределы без объявления — проверьте свой, прежде чем на это полагаться.',
  imagesStandfirst:
    'Расставьте изображения JPEG и PNG, выберите формат бумаги и создайте один PDF в отдельном worker внутри браузера.',
  imagesAcceptHint: 'JPEG или PNG · 40 файлов · всего 100 МБ',
  toWordStandfirstLead: 'Извлеките текст из PDF в редактируемый файл',
  toWordStandfirstTail:
    '. PDF читает эта страница, и он никогда не отправляется на сервер.',
  optimizeStandfirst:
    'Измените размер, сожмите и преобразуйте одно статичное изображение JPEG, PNG или WebP, не загружая его.',
  optimizeAcceptHint: 'JPEG, PNG или WebP · максимум 25 МБ',
  optimizeLimitNote: 'Эта версия принимает исходные изображения до 25 МБ.',
  subjectFile: 'файл',
  subjectImage: 'изображение',
  subjectText: 'текст',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Эти файлы превышают текущий предел безопасности — 150 МБ суммарно.',
  mergeTooMany: 'В этой версии можно объединить до {max} файлов PDF за раз.',
  mergeMoveEarlier: 'Переместить {name} раньше',
  mergeMoveLater: 'Переместить {name} позже',
  mergeRemoveFile: 'Убрать {name}',
  mergeInspectorNoStart:
    'Проверка PDF не смогла начаться. Ваши файлы не изменились.',
  mergeInspectorStopped:
    'Проверка PDF неожиданно остановилась. Ваши файлы не изменились.',
  mergeReadFailed:
    'Браузер не смог прочитать один из этих файлов. Ваши исходные файлы не изменились.',
  mergeNoStart:
    'Объединение не смогло начаться. Ваши исходные файлы PDF не изменились.',
  mergeStopped:
    'Объединение неожиданно остановилось. Ваши исходные файлы PDF не изменились.',
  compressReadFailed: 'Браузер не смог прочитать этот файл.',
  compressNoStart:
    'Сжатие PDF не смогло начаться. Ваш исходный файл не изменился.',
  compressStopped:
    'Сжатие PDF неожиданно остановилось. Ваш исходный файл не изменился.',
  compressInspectorStopped: 'Проверка PDF неожиданно остановилась.',
  compressDoneSmaller: 'Готово — меньше на {percent}%',
  compressDoneAlready:
    'Готово — этот PDF уже был настолько мал, насколько мы можем его сделать',
  compressAlreadyUnder: 'Файл и так был ниже предела — он не изменился',
  compressUnderCeiling: 'Ниже предела — {size}',
  compressStillOver:
    'Всё ещё выше предела — наименьший достигнутый размер {size}',
  imagesTooLarge:
    'Эти изображения превышают текущий предел безопасности — 100 МБ суммарно.',
  imagesTooMany: 'Выберите не более {max} изображений на один PDF.',
  imagesMoveUp: 'Переместить {name} вверх',
  imagesMoveDown: 'Переместить {name} вниз',
  imagesRemove: 'Убрать {name}',
  imagesNoStart:
    'Браузер не смог начать создание PDF. Ваши изображения не изменились.',
  imagesStopped:
    'Создание PDF неожиданно остановилось. Ваши изображения не изменились.',
  toWordFailed: 'Этот PDF преобразовать не удалось.',
  toWordTooLarge:
    '{name} весит {size}. Эта страница работает с файлами до {max}.',
  optimizeWrongType:
    'Выберите изображение JPEG, PNG или WebP. Анимированный вывод не поддерживается.',
  optimizeTooLarge: 'Превышен предел 25 МБ на файл.',
  optimizeCanvasUnavailable:
    'Обработка через canvas недоступна в этом браузере.',
  optimizeDecodeFailed: 'Браузер не смог раскодировать это изображение.',
  optimizeEncodeFailed: 'Браузер не смог закодировать это изображение.',
  optimizeFailed: 'Изображение оптимизировать не удалось.',
  optimizeDimensionCheckFailed:
    'Оптимизированное изображение не прошло проверку размеров.',
  optimizeNoFormat: 'Этот браузер не выдал пригодного формата изображения.',
  optimizeBadDimensions:
    'Ширина и высота должны быть целыми числами от 1 до 12 000.',
  optimizeLarger: 'больше на {percent}%',
  briefStepsHeading: 'Что происходит в этой работе',
  briefLimitsHeading: 'Чего он делать не будет',
  toWordScopeProse:
    'Он возвращает текст: порядок чтения, абзацы, разрывы страниц и заголовки там, где PDF набирает их более крупным кеглем. Он не восстанавливает вёрстку страницы: колонки, таблицы как настоящие таблицы, изображения и шрифты не переносятся. Если ваш PDF — скан или фотография листа, текста в нём нет вовсе, и эта страница скажет об этом, а не выдаст вам пустой документ.',
};
