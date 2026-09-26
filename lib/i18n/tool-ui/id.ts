import type { ToolUiMessages } from './messages';

/** Bahasa Indonesia. Register antarmuka: singkat dan langsung. */
export const ID_TOOL_UI: ToolUiMessages = {
  dismissError: 'Tutup galat',
  clear: 'Bersihkan',
  clearAll: 'Hapus semua',
  cancel: 'Batalkan',
  processing: 'Memproses',
  outputCheck: 'Pemeriksaan hasil',
  before: 'Sebelum',
  after: 'Sesudah',
  saved: 'Tersimpan',
  output: 'Hasil',
  input: 'Masukan',
  files: 'Berkas',
  chooseAnother: 'Pilih yang lain',
  onDevicePrototype: 'Prototipe di perangkat Anda',
  savePdf: 'Simpan PDF',

  mergeTitle: 'Gabungkan PDF',
  mergePageManagement: 'Pengelolaan halaman',
  mergePdfsToMerge: 'PDF yang akan digabungkan',
  mergeChoosePdfs: 'Pilih berkas PDF',
  mergeSignatureNote:
    'Tanda tangan biner dan jumlah halaman diperiksa di peramban Anda.',
  mergeOriginalsNote: 'Berkas aslinya tidak diubah.',
  mergeDownloadAria: 'Unduh PDF hasil penggabungan',
  mergeDownloadLabel: 'Unduh gabungan.pdf',
  mergeOrderAria: 'Urutan penggabungan PDF',
  mergePhaseTiming: 'Waktu per tahap',
  mergeCouldntUse: 'PDF itu tidak bisa digunakan',
  mergeCancelled:
    'Penggabungan dibatalkan. Berkas PDF pilihan Anda masih ada dan tidak berubah.',
  mergeStatusAria: 'Status pemrosesan lokal. Bukti rilis belum tersedia.',

  compressChooseSource: 'Pilih PDF sumber',
  compressChoosePdf: 'Pilih PDF yang akan dikompres',
  compressPages: 'Halaman',
  compressPhotos: 'Foto',
  compressPhotoQuality: 'Mutu foto',
  compressLargestEdge: 'Sisi terpanjang foto',
  compressKeepFullSize: 'Pertahankan ukuran asli',
  compressEdgeEmail: '1000 px — email',
  compressEdgeScreen: '1600 px — layar',
  compressEdgePrint: '2400 px — cetak',
  compressReEncode: 'Sandikan ulang foto di dalam PDF',
  compressReEncoding: 'Menyandikan ulang foto',
  compressClearMetadata: 'Kosongkan judul, penulis, dan produser',
  compressCeiling: 'Batas (KB)',
  compressFitCeiling: 'Turunkan sampai di bawah batas portal',
  compressWhereItRan: 'Tempat prosesnya berjalan',
  compressSave: 'Simpan PDF terkompres',
  compressCouldnt: 'PDF ini tidak bisa dikompres',

  imagesTitle: 'Gambar ke PDF',
  imagesAdd: 'Tambahkan gambar',
  imagesChoose: 'Pilih gambar',
  imagesChooseAria: 'Pilih gambar JPEG atau PNG',
  imagesChooseHint: 'Pilih gambar JPEG atau PNG untuk diubah menjadi PDF',
  imagesSourceImages: 'Gambar sumber',
  imagesLabel: 'Gambar',
  imagesPageSize: 'Ukuran halaman',
  imagesFitEach: 'Sesuaikan dengan tiap gambar',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Orientasi',
  imagesMatchEach: 'Mengikuti tiap gambar',
  imagesPortrait: 'Tegak',
  imagesLandscape: 'Mendatar',
  imagesMargin: 'Margin',
  imagesMarginNone: 'Tanpa margin',
  imagesMarginSmall: 'Kecil',
  imagesMarginMedium: 'Sedang',
  imagesMarginLarge: 'Besar',
  imagesOnePerImage: 'Satu halaman PDF dibuat untuk setiap gambar.',
  imagesCreate: 'Buat',
  imagesEmbedding: 'Menanamkan gambar',
  imagesSave: 'Simpan PDF yang dihasilkan',
  imagesCouldnt: 'PDF ini tidak bisa dibuat',
  imagesPrivacyBoundary: 'Batas privasi',
  imagesNoNetwork: 'Tidak ada primitif jaringan untuk berkas',

  toWordTitle: 'PDF ke Word',
  toWordShort: 'Ke Word',
  chooseAPdf: 'Pilih berkas PDF',
  toWordChooseAria: 'Pilih satu atau beberapa berkas PDF',
  toWordChooseHint: 'Pilih PDF dari perangkat ini untuk diubah.',
  toWordRemoveAria: 'Keluarkan PDF yang dipilih',
  toWordSave: 'Simpan dokumen Word',
  toWordSaveShort: 'Simpan berkas Word',
  toWordWordFile: 'Berkas Word',
  toWordParagraphs: 'Paragraf',
  toWordCharacters: 'Karakter',
  toWordTook: 'Lama',
  toWordConvertAnother: 'Ubah yang lain',
  toWordOcrLink: 'Baca hasil pindai ini dengan OCR',
  toWordScope: 'Apa yang dilakukan dan apa yang tidak',
  toWordCouldnt: 'PDF ini tidak bisa diubah',

  optimizeTitle: 'Optimalkan gambar',
  optimizeAction: 'Optimalkan',
  optimizeImage: 'Gambar',
  optimizeSourceImage: 'Gambar sumber',
  optimizeChoose: 'Pilih gambar',
  optimizeChooseAria: 'Pilih gambar yang akan dioptimalkan',
  optimizeMaxWidth: 'Lebar maksimum',
  optimizeMaxHeight: 'Tinggi maksimum',
  optimizeOutputFormat: 'Format keluaran',
  optimizeSave: 'Simpan gambar',
  optimizeOriginalUnchanged: 'Berkas aslinya tetap tidak berubah.',
  optimizeDecodedMatch: 'Dimensi hasil penguraian sesuai',
  optimizeInThisTab: 'Di tab ini',
  optimizeReleaseAssurance: 'Jaminan rilis',
  optimizeEgressPending: 'Bukti formal tanpa pengiriman keluar belum tersedia',
  optimizeCouldnt: 'Gambar ini tidak bisa dioptimalkan',
  browserWorker: 'Worker peramban',
  inThisBrowserTab: 'Di tab peramban ini',
  upTo150Mb: 'Hingga 150 MB',
  mergeStandfirst:
    'Gabungkan PDF dalam urutan yang Anda tentukan. Prosesnya berjalan di worker khusus di dalam peramban.',
  mergeOperation: 'Penggabungan PDF',
  mergeCounts: '{files} berkas · {pages} halaman',
  mergeSummary: '{files} berkas PDF digabungkan menjadi {pages} halaman.',
  compressOperation: 'Pengompres PDF',
  compressInspecting: 'Memeriksa PDF di perangkat Anda…',
  compressSummaryOne:
    '{pages} halaman ditulis ulang dan diperiksa di peramban ini.',
  compressSummaryMany:
    'Halaman yang ditulis ulang dan diperiksa di peramban ini: {pages}.',
  compressNoneReEncoded: 'Tidak ada yang disandikan ulang',
  compressReEncodedCount: '{count} disandikan ulang',
  compressPhotoQualityValue: 'Mutu foto {quality}%',
  compressCeilingLine: 'Batas {bytes}.',
  compressRewriteOne: 'penulisan ulang',
  compressRewriteMany: 'penulisan ulang',
  compressFitAlreadyUnder:
    'Berkas yang Anda buka sudah berada di bawah batas, jadi tidak ada yang disandikan ulang dan tidak ada yang hilang.',
  compressFitMet:
    'Tercapai setelah {attempts} {rewrites} terukur, pada mutu foto {quality}% dan sisi terpanjang {edge} px. Setiap percobaan ditimbang dari bita yang benar-benar dihasilkan, bukan dari perkiraan.',
  compressFitMissed:
    'Sudah dicoba {attempts} {rewrites} terukur, hingga mutu {quality}% pada {edge} px, dan tidak ada yang turun di bawah batas. Dengan menyimpan, Anda mendapat berkas terkecil yang dihasilkan. Pecah dokumennya, atau ambil hanya halaman yang diminta portal.',
  compressNothingSaved:
    'Berkas hasil penulisan ulang tidak menjadi lebih kecil, jadi ini berkas asli Anda, bita demi bita. PDF yang isinya hampir seluruhnya teks hanya menyisakan sedikit ruang: penghematan di sini berasal dari foto.',
  imagesUnsupported:
    'Pilih gambar JPEG atau PNG. Gambar beranimasi dan gambar vektor tidak didukung di sini.',
  imagesSummaryOne:
    '{count} gambar disusun menjadi satu PDF yang sudah diperiksa.',
  imagesSummaryMany:
    'Gambar yang disusun menjadi satu PDF yang sudah diperiksa: {count}.',
  imagesBuilding: 'Menyusun di perangkat Anda…',
  imagesCreatePdf: 'Buat PDF',
  imagesFitImage: 'Sesuai gambar',
  toWordSummaryOne: '{pages} halaman dibaca di peramban ini; hanya teks.',
  toWordSummaryMany:
    'Halaman yang dibaca di peramban ini, hanya teks: {pages}.',
  toWordNoTextNote:
    '{without} dari {total} halaman tidak memuat teks dan tidak menyumbang apa pun ke berkas Word. Halaman-halaman itu berupa gambar — hasil pindai atau foto — jadi tidak ada yang bisa disalin.',
  toWordTextOnlyNote:
    'Hanya teks. Tata letak, kolom, tabel, dan gambar dari PDF tidak ada di berkas ini.',
  optimizeOperation: 'Pengoptimal gambar',
  optimizeSummary: 'Gambar diubah ke {format} pada {width} × {height} px.',
  optimizeChooseMany: 'Pilih gambar',
  optimizeBusy: 'Mengoptimalkan…',
  optimizeAll: 'Optimalkan semua',
  optimizePreviewAlt: 'Pratinjau hasil optimasi',
  optimizeNextMerge: 'Berikutnya: gabungkan PDF →',
  runsInThisTab: 'Berjalan di tab ini, tanpa unggah',
  freeNoAccount: 'Gratis, tanpa akun, tanpa tanda air',
  batchLocalPromise:
    'Tidak ada batas jumlah berkas, tidak ada batas harian, dan tidak ada antrean: pekerjaannya terjadi di mesin ini. Pilih satu berkas untuk alur biasa, atau pilih banyak untuk hasil sekaligus dalam satu berkas ZIP.',
  recipeCopyLink: 'Salin tautan pengaturan',
  recipeLinkCopied: 'Tautan pengaturan tersalin',
  recipeSettingsOnly:
    'Hanya pengaturan ini yang dikirim. {subject} Anda tetap di perangkat ini dan tidak pernah menjadi bagian dari tautan.',
  recipeCopyByHand:
    'Salin tautan ini secara manual: peramban memblokir papan klip',
  noClientAnalytics: 'Tanpa analitik di peramban pada pratinjau ini',
  browserCanvasNote: 'Canvas peramban · Keluaran raster statis',
  mergeCapacity: 'Hingga {max} berkas · total 150 MB pada versi canary ini',
  mergeInspecting: 'Memeriksa berkas PDF di perangkat Anda…',
  mergeDropHere: 'Seret berkas PDF ke sini',
  mergeCanaryScope:
    'Cakupan versi canary ini: menggabungkan isi dan urutan halaman. Markah buku, tanda tangan, formulir, lampiran, dan metadata dokumen belum dijamin.',
  mergeAddAtLeastTwo: 'Tambahkan minimal 2 berkas PDF',
  mergeReady: 'Siap digabungkan',
  mergeTryingSettings: 'Mencoba pengaturan kompresi',
  compressStandfirst:
    'Tulis ulang PDF agar lebih padat dan sandikan ulang foto di dalamnya. Berkas dibaca oleh halaman ini dan tidak pernah dikirim ke server.',
  compressFitUnderCeiling: 'Turunkan di bawah batas',
  compressLimitNote: 'Versi ini menerima PDF sumber hingga 150 MB.',
  compressCeilingHelp:
    'Pilih formulir yang Anda ajukan, atau tulis batas Anda sendiri. Halaman ini lalu menyandikan ulang dengan mutu menurun sampai hasil yang terukur benar-benar berada di bawahnya: tanpa perkiraan dan tanpa pengulangan diam-diam — setiap percobaan adalah penulisan ulang yang nyata, dan jumlahnya dilaporkan.',
  compressPresetReadFrom: 'Dibaca dari',
  compressPresetOn: 'pada',
  compressPresetWarning:
    'Portal mengubah batasnya tanpa pemberitahuan: periksa batas Anda sebelum mengandalkan ini.',
  imagesStandfirst:
    'Atur gambar JPEG dan PNG, pilih tata letak kertas, lalu buat satu berkas PDF di worker khusus di dalam peramban.',
  imagesAcceptHint: 'JPEG atau PNG · 40 berkas · total 100 MB',
  toWordStandfirstLead: 'Tarik teks dari PDF ke berkas',
  toWordStandfirstTail:
    'yang bisa disunting. PDF dibaca oleh halaman ini dan tidak pernah dikirim ke server.',
  optimizeStandfirst:
    'Ubah ukuran, kompres, dan konversi satu gambar JPEG, PNG, atau WebP statis tanpa mengunggahnya.',
  optimizeAcceptHint: 'JPEG, PNG, atau WebP · maksimum 25 MB',
  optimizeLimitNote: 'Versi ini menerima gambar sumber hingga 25 MB.',
  subjectFile: 'berkas',
  subjectImage: 'gambar',
  subjectText: 'teks',
  subjectPdf: 'PDF',
  mergeTooLarge:
    'Berkas-berkas ini melewati batas aman saat ini, yaitu total 150 MB.',
  mergeTooMany:
    'Pada versi ini Anda bisa menggabungkan hingga {max} berkas PDF sekaligus.',
  mergeMoveEarlier: 'Majukan {name}',
  mergeMoveLater: 'Mundurkan {name}',
  mergeRemoveFile: 'Keluarkan {name}',
  mergeInspectorNoStart:
    'Pemeriksa PDF tidak bisa dijalankan. Berkas Anda tidak berubah.',
  mergeInspectorStopped:
    'Pemeriksa PDF berhenti tanpa diduga. Berkas Anda tidak berubah.',
  mergeReadFailed:
    'Peramban tidak bisa membaca salah satu berkas ini. Berkas asli Anda tidak berubah.',
  mergeNoStart:
    'Penggabungan tidak bisa dijalankan. Berkas PDF asli Anda tidak berubah.',
  mergeStopped:
    'Penggabungan berhenti tanpa diduga. Berkas PDF asli Anda tidak berubah.',
  compressReadFailed: 'Peramban tidak bisa membaca berkas itu.',
  compressNoStart:
    'Kompresi PDF tidak bisa dijalankan. Berkas asli Anda tidak berubah.',
  compressStopped:
    'Kompresi PDF berhenti tanpa diduga. Berkas asli Anda tidak berubah.',
  compressInspectorStopped: 'Pemeriksa PDF berhenti tanpa diduga.',
  compressDoneSmaller: 'Selesai — {percent}% lebih kecil',
  compressDoneAlready: 'Selesai — PDF ini sudah sekecil yang bisa kami buat',
  compressAlreadyUnder: 'Sudah di bawah batas — berkas Anda tidak berubah',
  compressUnderCeiling: 'Di bawah batas — {size}',
  compressStillOver:
    'Masih di atas batas — terkecil yang tercapai adalah {size}',
  imagesTooLarge:
    'Gambar-gambar ini melewati batas aman saat ini, yaitu total 100 MB.',
  imagesTooMany: 'Pilih tidak lebih dari {max} gambar per PDF.',
  imagesMoveUp: 'Naikkan {name}',
  imagesMoveDown: 'Turunkan {name}',
  imagesRemove: 'Keluarkan {name}',
  imagesNoStart:
    'Peramban tidak bisa memulai pembuatan PDF. Gambar Anda tidak berubah.',
  imagesStopped:
    'Pembuatan PDF berhenti tanpa diduga. Gambar Anda tidak berubah.',
  toWordFailed: 'PDF ini tidak bisa diubah.',
  toWordTooLarge:
    '{name} berukuran {size}. Halaman ini menangani berkas hingga {max}.',
  optimizeWrongType:
    'Pilih gambar JPEG, PNG, atau WebP. Keluaran beranimasi tidak didukung.',
  optimizeTooLarge: 'Batas 25 MB per berkas terlampaui.',
  optimizeCanvasUnavailable:
    'Pemrosesan canvas tidak tersedia di peramban ini.',
  optimizeDecodeFailed: 'Peramban tidak bisa menguraikan gambar ini.',
  optimizeEncodeFailed: 'Peramban tidak bisa menyandikan gambar ini.',
  optimizeFailed: 'Gambar tidak bisa dioptimalkan.',
  optimizeDimensionCheckFailed:
    'Gambar hasil optimasi tidak lulus pemeriksaan dimensi.',
  optimizeNoFormat:
    'Peramban ini tidak menghasilkan format gambar yang bisa dipakai.',
  optimizeBadDimensions:
    'Lebar dan tinggi harus bilangan bulat dari 1 sampai 12.000.',
  optimizeLarger: '{percent}% lebih besar',
  briefStepsHeading: 'Apa yang terjadi pada pekerjaan ini',
  briefLimitsHeading: 'Apa yang tidak akan dilakukan',
  toWordScopeProse:
    'Alat ini mengembalikan teksnya: urutan baca, paragraf, pemisah halaman, dan judul di tempat PDF menatanya dengan huruf lebih besar. Alat ini tidak menyusun ulang tata letak halaman: kolom, tabel sebagai tabel sungguhan, gambar, dan huruf tidak dibawa serta. Bila PDF Anda hasil pindai atau foto selembar kertas, di dalamnya tidak ada teks sama sekali, dan halaman ini akan mengatakannya daripada menyerahkan dokumen kosong.',
};
