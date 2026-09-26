import type { LocaleCopy } from '../locales';

/*
  Bahasa Indonesia. Ditulis, bukan diterjemahkan: judulnya memakai kata yang
  benar-benar diketik orang — “gabungkan pdf”, “kompres pdf”, “jpg ke pdf”,
  “pdf ke word”, “kompres gambar” — bukan terjemahan judul bahasa Inggris.
*/
export const ID: LocaleCopy = {
  hub: {
    title: 'Alat PDF gratis tanpa mengunggah berkas',
    description:
      'Gabungkan, kompres, dan ubah PDF serta gambar langsung di peramban Anda. Berkas tidak meninggalkan perangkat: tanpa akun, tanpa tanda air, tanpa batas unduhan.',
    heading: 'Alat yang berjalan di dalam peramban Anda',
    intro:
      'Hampir semua situs PDF mengunggah berkas Anda ke server milik orang lain, memprosesnya di sana, lalu berjanji menghapusnya. Di sini tidak ada yang perlu dihapus: berkas dibuka di memori tab ini, pekerjaannya dilakukan komputer Anda sendiri, dan hasilnya diunduh langsung. Kontrak, slip gaji, maupun berkas pajak Anda tidak pernah melewati jaringan.',
    toolsHeading: 'Alat yang tersedia dalam bahasa Indonesia',
    privacyHeading: 'Mengapa berkas Anda tidak diunggah',
    privacyBody: [
      'Halaman ini menetapkan Content-Security-Policy dengan connect-src none, yaitu perintah kepada peramban untuk melarang semua koneksi keluar. Ini bukan janji pemasaran, melainkan aturan yang ditegakkan oleh peramban, bukan oleh kami.',
      'Anda bisa memeriksanya sendiri: buka alat pengembang, pilih tab Jaringan, putuskan koneksi internet, lalu gunakan alat mana pun dari daftar ini. Semuanya tetap berjalan, karena memang tidak ada yang perlu dikirim.',
    ],
    switcherLabel: 'Bahasa',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'Gabungkan PDF gratis — tanpa unggah, tanpa daftar',
      description:
        'Satukan hingga 20 berkas PDF menjadi satu di dalam peramban. Atur urutannya, gabungkan, dan jumlah halaman diperiksa sebelum diunduh. Tanpa unggah, tanpa akun.',
      heading: 'Tentang alat penggabung PDF ini',
      directAnswer:
        'Untuk menyatukan beberapa PDF menjadi satu: pilih berkasnya, atur urutan dengan panah atas dan bawah, lalu jalankan penggabungan. Semua halaman dari semua berkas disalin ke dokumen baru dalam urutan tersebut, dan sebelum unduhan ditawarkan, hasilnya dibuka kembali untuk memastikan jumlah halamannya sama dengan jumlah halaman berkas asal.',
      lead: 'Halaman ini menggabungkan PDF utuh dalam urutan yang Anda tentukan — hingga 20 berkas sekaligus dan 150 MB secara keseluruhan — menggunakan pdf-lib di dalam tab itu sendiri. Setiap baris daftar menampilkan jumlah halaman dan ukuran berkas, sehingga Anda bisa memeriksa apa yang akan digabungkan sebelum menggabungkannya. Cakupan saat ini adalah isi halaman dan urutan halaman: markah buku, tanda tangan digital, kolom formulir, lampiran, dan metadata dokumen belum dijamin bertahan, dan halaman ini menyatakannya tepat di atas tombol. PDF terenkripsi ditolak dengan pesan agar Anda melepas kata sandinya lebih dulu di perangkat sendiri, bukan dibaca setengah jalan.',
      steps: [
        {
          name: 'Tambahkan berkas PDF',
          text: 'Pilih berkas atau seret ke halaman. Setiap berkas diperiksa pada lima byte pertamanya sebelum apa pun diurai, sehingga berkas yang bukan PDF langsung ditolak.',
        },
        {
          name: 'Susun urutannya',
          text: 'Berkas digabungkan dari atas ke bawah sesuai daftar. Setiap baris memiliki panah untuk memajukan berkas, panah untuk memundurkannya, dan tombol untuk mengeluarkannya. Urutan halaman di dalam satu berkas tidak diubah.',
        },
        {
          name: 'Gabungkan lalu unduh',
          text: 'Penggabungan berjalan di Web Worker agar tab tetap responsif. Setelah itu hasilnya dibaca ulang sebagai PDF dan jumlah halamannya dibandingkan dengan total masukan; unduhan hanya ditawarkan bila keduanya cocok.',
        },
      ],
      sections: [
        {
          heading: 'Apa yang dipertahankan dan apa yang tidak',
          body: [
            'Yang dipertahankan adalah isi setiap halaman dan urutan yang Anda tentukan. PDF adalah wadah berisi objek, bukan rangkaian halaman, sehingga menggabungkan dua dokumen berarti menyalin objek dari satu ke yang lain dan menyusun ulang pohon halamannya.',
            'Yang belum dijamin: markah buku, tanda tangan digital, kolom formulir yang bisa diisi, lampiran, dan metadata. Bila Anda perlu mempertahankan tanda tangan elektronik yang sah secara hukum, penggabungan akan membatalkannya — sama seperti pada alat mana pun, karena tanda tangan itu melekat pada byte dokumen aslinya.',
          ],
        },
        {
          heading: 'Batasannya, disebutkan terus terang',
          body: [
            'Hingga 20 berkas sekali proses dan 150 MB secara keseluruhan. Batas ini ada karena semuanya terjadi di memori tab Anda: tidak ada server yang bisa dititipi pekerjaan lebih besar, dan peramban yang kehabisan memori akan menutup tab, bukan memberi peringatan.',
            'PDF yang dilindungi kata sandi akan ditolak. Lepas kata sandinya di perangkat Anda, lalu coba lagi.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Apakah berkas saya diunggah ke server?',
          answer:
            'Tidak. Penggabungan dikerjakan pdf-lib di dalam peramban Anda, dan halaman ini menetapkan connect-src none sehingga peramban sendiri memblokir semua koneksi keluar. Putuskan jaringan, alatnya tetap bekerja.',
        },
        {
          question: 'Apakah ada tanda air atau batas harian?',
          answer:
            'Tidak ada tanda air, tidak ada akun, dan tidak ada batas per hari. Tidak ada server yang biayanya perlu dijatah, jadi tidak ada yang perlu dijatah.',
        },
        {
          question: 'Bisakah menggabungkan PDF yang dilindungi kata sandi?',
          answer:
            'Tidak secara langsung. Alat ini menolaknya secara tegas, bukan membacanya setengah jalan. Lepas kata sandinya di perangkat Anda, lalu gabungkan di sini.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'Kompres PDF gratis — tanpa unggah, ukuran nyata',
      description:
        'Perkecil ukuran PDF di peramban Anda, atau turunkan sampai di bawah batas yang diminta. Ukuran nyata sebelum dan sesudah, dan berkas asli dikembalikan bila gagal.',
      heading: 'Tentang alat kompres PDF ini',
      directAnswer:
        'Untuk memperkecil PDF di peramban: pilih berkasnya, tentukan apakah foto di dalamnya perlu disandikan ulang, lalu jalankan. Dokumen ditulis ulang memakai aliran objek, JPEG yang memenuhi syarat disandikan ulang secara opsional pada mutu dan sisi terpanjang yang Anda pilih, dan ukuran nyata sebelum serta sesudahnya dilaporkan.',
      lead: 'Ada dua tahap di sini dan keduanya diukur, bukan diperkirakan. Tahap pertama tanpa penurunan mutu: berkas ditulis ulang memakai aliran objek, dan judul, penulis, subjek, kata kunci, produser, serta pembuat dapat dikosongkan. Tidak ada yang berubah secara kasatmata pada halaman. Tahap kedua bersifat opsional dan di situlah bobotnya biasanya berada: JPEG yang tertanam diuraikan lalu disandikan ulang oleh canvas peramban Anda sendiri pada mutu antara 40 sampai 95 persen, dan lebih dahulu diperkecil bila sisi terpanjangnya melewati batas yang Anda tetapkan. Bila hasilnya justru lebih besar daripada aslinya, yang dikembalikan kepada Anda adalah berkas aslinya: alat yang menyerahkan berkas lebih besar lalu menyebutnya kompresi sedang membohongi Anda.',
      steps: [
        {
          name: 'Pilih berkas PDF',
          text: 'Seret ke halaman atau pilih dari perangkat. Berkas dibuka di memori dan ukuran saat ini ditampilkan.',
        },
        {
          name: 'Tentukan apa yang bersedia Anda korbankan',
          text: 'Tahap tanpa penurunan mutu tidak mengubah apa pun yang terlihat. Bila Anda juga menyalakan penyandian ulang gambar, atur mutu dan sisi terpanjangnya: di situlah pengurangan besar diperoleh, dan di situ pula detail hilang.',
        },
        {
          name: 'Bandingkan ukuran nyatanya',
          text: 'Panel melaporkan ukuran sebelum dan sesudah, diukur dari byte yang tersimpan dan bukan diperkirakan di muka. Unduh hanya bila hasilnya memuaskan.',
        },
      ],
      sections: [
        {
          heading: 'Mengapa sebagian PDF tidak bisa diperkecil',
          body: [
            'PDF yang sudah dioptimalkan, atau yang isinya hanya teks, hampir tidak menyisakan ruang: bobot sebuah PDF umumnya terletak pada gambar yang tertanam, dan bila tidak ada gambar maka tidak ada objek besar untuk disandikan ulang.',
            'Dalam keadaan itu alat ini mengembalikan berkas asli Anda, bukan menyerahkan berkas yang sedikit lebih besar dengan nama lain. Itulah jawaban yang jujur, dan itulah yang tidak diberikan banyak situs kompresi.',
          ],
        },
        {
          heading: 'Menurunkan sampai di bawah batas tertentu',
          body: [
            'Ketika sebuah portal menolak dokumen Anda karena melewati ukuran maksimum, yang Anda butuhkan bukan “lebih kecil” melainkan “di bawah angka ini”. Mode penyesuaian menelusuri berbagai mutu dan ukuran, lalu memutuskan berdasarkan byte yang terukur, bukan berdasarkan perkiraan.',
            'Bila mutu terendah sekalipun tidak berhasil turun di bawah batas itu, Anda diberi tahu, alih-alih diserahi berkas yang akan ditolak portal itu lagi.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Apakah mutu PDF menurun setelah dikompres?',
          answer:
            'Pada tahap pertama tidak: tahap itu menulis ulang struktur berkas dan tidak menyentuh apa yang terlihat. Pada tahap kedua ya, karena gambar yang tertanam disandikan ulang — mutunya Anda sendiri yang memilih, antara 40 sampai 95 persen.',
        },
        {
          question: 'Apakah dokumen saya diunggah untuk dikompres?',
          answer:
            'Tidak. Kompresi berlangsung di dalam tab, dan koneksi keluar dilarang bagi halaman ini lewat connect-src none. Buktikan dengan memutus koneksi internet.',
        },
        {
          question: 'Mengapa ukuran berkasnya tetap sama?',
          answer:
            'Karena berkas itu sudah dioptimalkan, atau karena isinya hampir seluruhnya teks. Dalam hal itu berkas asli dikembalikan tanpa perubahan.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'JPG ke PDF gratis — ubah gambar tanpa mengunggahnya',
      description:
        'Ubah gambar JPEG dan PNG menjadi satu berkas PDF di peramban Anda. Hingga 40 gambar, halaman A4, Letter, atau mengikuti ukuran gambar, dan empat pilihan margin.',
      heading: 'Tentang pengubah gambar ke PDF ini',
      directAnswer:
        'Untuk mengubah gambar JPEG atau PNG menjadi satu PDF: pilih gambarnya, atur urutan dengan panah, tentukan ukuran halaman dan margin, lalu hasilkan berkasnya. Setiap gambar menjadi satu halaman, diletakkan di tengah dan diskalakan agar muat di dalam margin dengan proporsi yang tetap terjaga.',
      lead: 'Hanya JPEG dan PNG, hingga 40 gambar dan 100 MB secara keseluruhan, satu halaman per gambar sesuai urutan yang tampil di layar. Ukuran tetapnya adalah A4 (595,28 × 841,89 titik) dan US Letter (612 × 792), dengan orientasi yang menyesuaikan tiap gambar atau dipaksakan menjadi tegak maupun mendatar. Pilihan “Sesuaikan dengan tiap gambar” membuat setiap halaman berukuran persis sebesar gambarnya ditambah margin, dan tidak pernah memperbesar gambar. Marginnya tanpa margin, kecil, sedang, atau besar: 0, 12, 24, atau 36 titik. Setiap berkas dicocokkan dengan jenis yang dinyatakannya melalui tanda tangan binernya sendiri, sehingga berkas yang sekadar diganti namanya menjadi .jpg akan ditolak, bukan merusak dokumen di tengah proses.',
      steps: [
        {
          name: 'Tambahkan gambar',
          text: 'Pilih atau seret berkas JPEG dan PNG. Setiap berkas diperiksa melalui tanda tangan binernya, bukan melalui ekstensi namanya.',
        },
        {
          name: 'Atur urutan dan halamannya',
          text: 'Panah mengubah urutan. Pilih A4, Letter, atau penyesuaian dengan tiap gambar, lalu orientasi dan salah satu dari empat margin.',
        },
        {
          name: 'Hasilkan lalu unduh',
          text: 'Berkas PDF disusun di dalam tab dan langsung diunduh. Tidak ada gambar yang dikirim ke mana pun.',
        },
      ],
      sections: [
        {
          heading: 'Ukuran halaman mana yang sebaiknya dipilih',
          body: [
            'A4 atau Letter bila dokumen akan dicetak atau diunggah ke portal yang mengharapkan ukuran baku. Gambar diletakkan di tengah dan diskalakan agar muat di dalam margin, dengan proporsi yang tetap terjaga.',
            '“Sesuaikan dengan tiap gambar” bila Anda menginginkan PDF tanpa bidang putih: setiap halaman berukuran sebesar gambarnya ditambah margin. Gambar kecil tidak pernah diperbesar, karena memperbesarnya hanya akan menambahkan piksel karangan.',
          ],
        },
        {
          heading: 'Batasannya',
          body: [
            'Hingga 40 gambar dan 100 MB secara keseluruhan, karena semuanya disusun di memori tab. Hanya JPEG dan PNG: format yang dapat diuraikan canvas peramban secara andal di semua peramban.',
            'Untuk berkas HEIC dari iPhone, lewatkan dulu melalui alat HEIC ke JPG, lalu kembali ke sini.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Bisakah menyatukan beberapa foto menjadi satu PDF?',
          answer:
            'Bisa, hingga 40 foto sekali proses. Setiap gambar menjadi satu halaman, dan urutannya Anda tentukan sendiri dengan panah.',
        },
        {
          question: 'Apakah foto saya diunggah?',
          answer:
            'Tidak. Berkas PDF disusun di dalam peramban Anda dan koneksi keluar diblokir bagi halaman ini. Alat ini tetap bekerja meski jaringan diputus.',
        },
        {
          question: 'Apakah mutunya turun saat JPG diubah menjadi PDF?',
          answer:
            'Gambar ditanamkan apa adanya dan hanya diskalakan agar muat pada halaman yang dipilih. Dengan “Sesuaikan dengan tiap gambar” dan margin nol, tidak ada penskalaan sama sekali.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'PDF ke Word gratis — tanpa unggah dan tanpa alamat email',
      description:
        'Tarik teks dari PDF menjadi berkas .docx yang bisa disunting di peramban Anda. Urutan baca, paragraf, dan judul bertahan; tata letak dan tabel tidak.',
      heading: 'Tentang pengubahan PDF ke Word ini',
      directAnswer:
        'Pilih berkas PDF hingga 150 MB lalu ubah. Lapisan teksnya dibaca di dalam halaman, dikelompokkan kembali menjadi baris dan paragraf berdasarkan koordinat tiap karakter, lalu ditulis ke berkas .docx yang dinamai menurut PDF Anda. Ini mengembalikan kata-katanya, bukan halamannya: ini adalah penarikan teks, dan halaman ini menyatakannya tepat di atas tombol.',
      lead: 'PDF menyimpan glif pada koordinat, bukan paragraf, sehingga urutan baca, pengelompokan baris, dan batas antarparagraf semuanya harus disusun ulang dari geometrinya — dan hasil penyusunan ulang itulah yang Anda terima. Yang ikut berpindah: urutan baca, paragraf, pemisah halaman, dan judul yang diatur dengan huruf lebih besar. Yang tidak ikut: tata letak, kolom, tabel sebagai tabel, gambar, dan huruf; menyebut hasilnya sebuah konversi alih-alih penarikan teks akan berlebihan. PDF yang sama sekali tidak memuat teks — hasil pindai, atau foto selembar kertas — ditolak dengan menyebut alasannya, bukan dengan menyerahkan dokumen kosong.',
      steps: [
        {
          name: 'Pilih berkas PDF',
          text: 'Hingga 150 MB. Berkas dibuka di memori tab.',
        },
        {
          name: 'Ubah berkasnya',
          text: 'Lapisan teks dibaca lalu dikelompokkan menjadi baris dan paragraf menurut koordinat tiap karakter.',
        },
        {
          name: 'Unduh berkas .docx',
          text: 'Dokumen memakai nama PDF Anda dan bisa dibuka di Word, LibreOffice, atau Google Dokumen.',
        },
      ],
      sections: [
        {
          heading: 'Apa yang bertahan dan apa yang tidak',
          body: [
            'Yang bertahan: urutan baca, pemisahan paragraf, pemisah halaman, dan judul berhuruf lebih besar, yang ditandai sebagai gaya judul.',
            'Yang tidak bertahan: tata letak halaman, kolom, tabel sebagai tabel, gambar, dan huruf aslinya. Bila Anda membutuhkan dokumen yang sama persis, tidak ada alat gratis yang akan memberikannya; yang dikembalikan di sini adalah kata-katanya, agar bisa disunting.',
          ],
        },
        {
          heading: 'Bila PDF Anda adalah hasil pindai',
          body: [
            'PDF hasil pindai tidak memuat teks, melainkan memuat gambar dari teks. Alat ini menolaknya sambil menyebutkan alasannya, bukan menyerahkan berkas .docx kosong.',
            'Untuk keadaan itu, lewatkan dulu melalui OCR PDF, yang mengenali karakter di dalam peramban, lalu ubah di sini.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Apakah format aslinya dipertahankan?',
          answer:
            'Tidak. Yang dipertahankan adalah kata-kata, urutan baca, paragraf, dan judul. Tata letak, kolom, dan tabel tidak: ini penarikan teks, bukan penyalinan ulang halaman.',
        },
        {
          question: 'Apakah perlu mendaftar atau memberi alamat email?',
          answer:
            'Tidak. Tidak ada akun, tidak ada email, dan tidak ada pengiriman hasil lewat email, karena berkasnya tidak pernah meninggalkan peramban Anda.',
        },
        {
          question: 'Apakah alat ini bekerja pada PDF hasil pindai?',
          answer:
            'Tidak secara langsung: hasil pindai tidak memiliki lapisan teks dan akan ditolak dengan menyebut alasannya. Lewatkan dulu melalui OCR, lalu coba lagi.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Kompres gambar gratis — JPG, PNG, dan WebP tanpa unggah',
      description:
        'Ubah ukuran, kompres, dan konversi JPEG, PNG, serta WebP di peramban Anda. Ukuran nyata sebelum dan sesudah, plus mode sekaligus banyak dengan unduhan ZIP.',
      heading: 'Tentang pengoptimal gambar ini',
      directAnswer:
        'Pilih satu gambar atau beberapa sekaligus, tetapkan lebar dan tinggi maksimum, pilih format keluaran dan mutunya, lalu jalankan pengoptimalan. Gambar digambar ulang pada canvas dengan ukuran baru dan disandikan ulang oleh peramban Anda; setelah itu byte yang tersimpan diuraikan kembali untuk memastikan dimensinya sesuai rencana, dan panel melaporkan ukuran nyata sebelum dan sesudahnya.',
      lead: 'Alat ini melakukan tiga hal dalam satu tahap — mengubah ukuran, menyandikan ulang, dan mengonversi — pada JPEG, PNG, dan WebP hingga 25 MB per berkas. Pengubahan ukuran hanya memperkecil dan tidak pernah memperbesar: lebar dan tinggi yang Anda isikan berfungsi sebagai kotak tempat gambar dimuatkan, sehingga foto 4000 kali 3000 yang dibatasi 1200 kali 1200 keluar sebagai 1200 kali 900, dan gambar 640 kali 480 yang dibatasi 1200 tetap 640 kali 480. WebP menjadi format keluaran bawaan karena pada mutu tampak yang sama biasanya paling kecil di antara ketiganya. Alat ini tidak menyalin metadata berkas asli ke hasilnya, sehingga lokasi GPS dan model kamera tidak ikut terbawa pada gambar yang Anda unggah ke mana pun.',
      steps: [
        {
          name: 'Pilih gambarnya',
          text: 'Satu atau beberapa, dalam JPEG, PNG, atau WebP, hingga 25 MB per berkas.',
        },
        {
          name: 'Tetapkan ukuran maksimum dan mutunya',
          text: 'Lebar dan tinggi berlaku sebagai kotak: gambar dimuatkan ke dalamnya tanpa berubah proporsi dan tidak pernah diperbesar.',
        },
        {
          name: 'Optimalkan lalu unduh',
          text: 'Satu gambar menghasilkan satu berkas; beberapa gambar menghasilkan satu berkas ZIP. Panel menampilkan ukuran nyata setiap gambar sebelum dan sesudahnya.',
        },
      ],
      sections: [
        {
          heading: 'Format mana yang sebaiknya dipilih',
          body: [
            'WebP sebagai bawaan: pada mutu tampak yang sama biasanya paling kecil di antara ketiganya, dan semua peramban masa kini dapat membacanya.',
            'JPEG bila tujuannya sistem lama yang tidak menerima WebP. PNG hanya bila Anda memerlukan transparansi atau piksel yang persis, sebab untuk foto ukurannya akan selalu lebih besar.',
          ],
        },
        {
          heading: 'Metadata tidak ikut disalin',
          body: [
            'Hasilnya ditulis dari canvas, sehingga metadata EXIF berkas asli — koordinat GPS, model kamera, tanggal — tidak masuk ke berkas yang baru.',
            'Untuk foto yang akan Anda pasang di internet, justru itulah yang diinginkan. Bila data tersebut memang perlu Anda simpan, simpan juga berkas aslinya sebelum mengoptimalkan.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Bisakah mengompres beberapa gambar sekaligus?',
          answer:
            'Bisa. Gambar diproses satu per satu di dalam peramban lalu diserahkan sebagai satu berkas ZIP.',
        },
        {
          question: 'Apakah gambar saya dikirim ke server?',
          answer:
            'Tidak. Gambar digambar ulang pada canvas dan disandikan ulang oleh peramban Anda sendiri, dan koneksi keluar dilarang bagi halaman ini.',
        },
        {
          question:
            'Apakah gambar kecil diperbesar bila saya isi ukuran yang lebih besar?',
          answer:
            'Tidak. Pengubahan ukuran hanya memperkecil: bila gambar sudah lebih kecil daripada kotak yang Anda isikan, gambar itu dibiarkan apa adanya.',
        },
      ],
    },
  },
};
