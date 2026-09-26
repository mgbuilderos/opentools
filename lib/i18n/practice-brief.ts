import type { PracticeBrief } from '../practice-briefs';

/*
  The one practice brief a localised page renders, translated.

  `/pdf/compress` is the only one of the five localised tools that carries a
  brief -- the panel naming the job, the four things that happen and the five
  things the page will not do. It is the longest block of prose on that page,
  so leaving it in English would undo most of the work of translating the
  controls above it.

  WHY IT IS NOT IN `ToolUiMessages`. A brief is content, not chrome: it has a
  shape (`eyebrow`, `heading`, `lede`, `steps`, `limits`) that the English
  briefs already define, and the page takes one as a prop. So the localised
  page builds a brief of the same shape and passes it in, and
  `components/practice-brief.tsx` renders it without knowing which language it
  is in. Adding a second localised brief means one more entry here.

  The numbers and the named portals are deliberately unchanged: a ceiling and
  the portal it was read from are facts, and translating a portal's name would
  make the citation unverifiable.
*/

type LocalizedBrief = Omit<PracticeBrief, 'id' | 'route'>;

const FILING_CEILING: Readonly<Record<string, LocalizedBrief>> = {
  es: {
    eyebrow: 'Trámites / Subida a un portal',
    heading: 'Deja un PDF por debajo del límite de subida del portal',
    lede: 'Una respuesta a un requerimiento, un anexo de un recurso o un documento de registro que el portal rechaza porque el archivo es demasiado grande. Esta página reescribe el PDF de forma más compacta y recodifica las fotografías que contiene, en esta pestaña, y después te dice claramente si el resultado queda por debajo del límite que hayas elegido. Los límites publicados del portal de declaración electrónica del Impuesto sobre la Renta y del portal del GST están en la fila de botones, cada uno con la página del portal de la que se leyó y la fecha en que se leyó.',
    steps: [
      'Elige el portal y el trámite que vas a presentar. El límite rellena la casilla objetivo y sigue siendo editable, porque tu trámite puede no ser el que aparece en la lista.',
      'Abre el PDF. Las fotografías y los escaneos que contiene se recodifican, que es donde está casi todo el peso de un anexo escaneado.',
      'Baja la calidad de las fotos o el ancho máximo si la primera pasada no es suficiente. El escaneo de una página escrita a máquina aguanta mucho; la fotografía de una firma no.',
      'El resultado indica el tamaño antes, el tamaño después y si queda por debajo del límite que fijaste, para que lo sepas antes de volver al portal y no después de que te rechace otra vez.',
    ],
    limits: [
      'Un portal puede cambiar su límite sin avisar, y las fechas junto a cada cifra están ahí para que veas lo antigua que es. Comprueba el tuyo antes de confiar en él.',
      'No hay una pasada automática de «apretar hasta que quepa». Tú eliges los ajustes y lees el resultado; nada se repite a tus espaldas destruyendo un escaneo para alcanzar un número.',
      'Un PDF que es casi todo texto y ya está compacto puede no reducirse mucho, y el resultado lo dice en lugar de disimularlo.',
      'Comprimir no es tachar. Todo lo visible en el archivo sigue siendo visible después. Oculta lo que no deba salir antes de comprimir.',
      'Varios portales también limitan el número de adjuntos y el total de todos ellos. Dejar un archivo por debajo del límite por archivo no resuelve eso.',
    ],
  },
  pt: {
    eyebrow: 'Processos / Envio a portal',
    heading: 'Deixe um PDF abaixo do limite de envio do portal',
    lede: 'Uma resposta a uma notificação, um anexo de recurso ou um documento de registro que o portal recusa porque o arquivo é grande demais. Esta página reescreve o PDF de forma mais compacta e recodifica as fotografias que estão dentro dele, nesta aba, e depois diz com clareza se o resultado ficou abaixo do limite que você escolheu. Os limites publicados do portal de declaração eletrônica do Imposto de Renda e do portal do GST estão na linha de botões, cada um mostrado com a página do portal de onde foi lido e a data da leitura.',
    steps: [
      'Escolha o portal e o formulário em que você vai enviar. O limite preenche a caixa de destino e continua editável, porque o seu formulário pode não ser o que está listado.',
      'Abra o PDF. As fotografias e os escaneamentos dentro dele são recodificados, e é aí que está quase todo o peso de um anexo escaneado.',
      'Baixe a qualidade das fotos ou a largura máxima se a primeira passagem não bastar. O escaneamento de uma página datilografada aguenta bastante; a fotografia de uma assinatura não.',
      'O resultado informa o tamanho antes, o tamanho depois e se ficou abaixo do limite que você definiu — assim você sabe antes de voltar ao portal, não depois de ser recusado de novo.',
    ],
    limits: [
      'Um portal pode mudar o limite sem avisar, e as datas ao lado de cada número estão ali para você ver quão antigo ele é. Confira o seu antes de confiar nisso.',
      'Não existe uma passagem automática de “aperta até caber”. Você escolhe as configurações e lê o resultado; nada fica repetindo por trás e destruindo um escaneamento para bater um número.',
      'Um PDF quase todo de texto e já compacto pode não diminuir muito, e o resultado diz isso em vez de fingir o contrário.',
      'Compressão não é tarja. Tudo que está visível no arquivo continua visível depois. Cubra o que não deve circular antes de comprimir.',
      'Vários portais também limitam a quantidade de anexos e o total de todos eles. Deixar um arquivo abaixo do limite por arquivo não resolve isso.',
    ],
  },
  fr: {
    eyebrow: 'Démarches / Dépôt sur un téléservice',
    heading: 'Faites passer un PDF sous la limite de dépôt du téléservice',
    lede: 'Une réponse à un avis, une annexe de recours ou un document d’immatriculation que le téléservice refuse parce que le fichier est trop lourd. Cette page réécrit le PDF de façon plus compacte et ré-encode les photographies qu’il contient, dans cet onglet, puis vous dit clairement si le résultat passe sous le plafond que vous avez choisi. Les plafonds publiés du téléservice de déclaration de l’impôt sur le revenu et du portail GST figurent sur la rangée de boutons, chacun accompagné de la page du téléservice où il a été lu et de la date de lecture.',
    steps: [
      'Choisissez le téléservice et le formulaire auquel vous répondez. Le plafond remplit la case cible et reste modifiable, car votre formulaire n’est peut-être pas celui de la liste.',
      'Ouvrez le PDF. Les photographies et les scans qu’il contient sont ré-encodés, et c’est là que se trouve presque tout le poids d’une annexe scannée.',
      'Baissez la qualité des photos ou la largeur maximale si la première passe ne suffit pas. Le scan d’une page tapée supporte une forte baisse ; la photo d’une signature non.',
      'Le résultat indique la taille avant, la taille après, et si elle passe sous le plafond que vous avez fixé — vous le savez donc avant de revenir au téléservice, et non après un nouveau refus.',
    ],
    limits: [
      'Un téléservice peut changer sa limite sans prévenir, et les dates à côté de chaque chiffre sont là pour que vous voyiez son ancienneté. Vérifiez la vôtre avant de vous y fier.',
      'Il n’y a pas de passe automatique « on comprime jusqu’à ce que ça rentre ». Vous choisissez les réglages et lisez le résultat ; rien ne boucle dans votre dos en détruisant un scan pour atteindre un chiffre.',
      'Un PDF presque entièrement composé de texte et déjà compact peut ne pas beaucoup diminuer, et le résultat le dit plutôt que de faire semblant.',
      'Compresser n’est pas occulter. Tout ce qui est visible dans le fichier le reste ensuite. Masquez ce qui ne doit pas circuler avant de compresser.',
      'Plusieurs téléservices limitent aussi le nombre de pièces jointes et leur total. Faire passer un fichier sous la limite par fichier ne répond pas à cela.',
    ],
  },
  de: {
    eyebrow: 'Einreichung / Portal-Upload',
    heading: 'Ein PDF unter die Upload-Grenze des Portals bringen',
    lede: 'Eine Antwort auf einen Bescheid, eine Anlage zu einem Einspruch oder ein Registrierungsdokument, das das Portal ablehnt, weil die Datei zu groß ist. Diese Seite schreibt das PDF kompakter neu und kodiert die enthaltenen Fotografien neu, in diesem Tab, und sagt Ihnen dann klar, ob das Ergebnis unter der von Ihnen gewählten Obergrenze liegt. Die veröffentlichten Obergrenzen des Income-Tax-E-Filing-Portals und des GST-Portals stehen in der Schaltflächenreihe, jeweils mit der Portalseite, von der sie gelesen wurden, und dem Datum der Lesung.',
    steps: [
      'Wählen Sie das Portal und das Formular, bei dem Sie einreichen. Die Obergrenze füllt das Zielfeld und bleibt änderbar, denn Ihr Formular ist vielleicht nicht das aufgeführte.',
      'Öffnen Sie das PDF. Fotografien und Scans darin werden neu kodiert, und dort steckt fast das gesamte Gewicht einer gescannten Anlage.',
      'Senken Sie die Fotoqualität oder die maximale Fotobreite, wenn der erste Durchlauf nicht reicht. Der Scan einer getippten Seite hält viel aus; die Fotografie einer Unterschrift nicht.',
      'Das Ergebnis nennt die Größe vorher, die Größe nachher und ob sie unter Ihrer Obergrenze liegt — Sie wissen es also, bevor Sie zum Portal zurückgehen, und nicht erst nach der nächsten Ablehnung.',
    ],
    limits: [
      'Ein Portal kann seine Grenze ohne Ankündigung ändern, und die Daten neben jeder Zahl stehen dort, damit Sie sehen, wie alt sie ist. Prüfen Sie Ihre, bevor Sie sich darauf verlassen.',
      'Es gibt keinen automatischen Durchlauf nach dem Motto „drücken, bis es passt“. Sie wählen die Einstellungen und lesen das Ergebnis; nichts läuft hinter Ihrem Rücken in einer Schleife und zerstört still einen Scan, um eine Zahl zu treffen.',
      'Ein PDF, das fast nur Text ist und schon kompakt, wird vielleicht nicht viel kleiner, und das Ergebnis sagt das, statt etwas vorzugeben.',
      'Verkleinern ist kein Unkenntlichmachen. Alles, was in der Datei sichtbar ist, bleibt danach sichtbar. Maskieren Sie vor dem Verkleinern, was nicht mitreisen soll.',
      'Mehrere Portale begrenzen auch die Anzahl der Anlagen und deren Summe. Eine Datei unter die Einzelgrenze zu bringen beantwortet das nicht.',
    ],
  },
  it: {
    eyebrow: 'Pratiche / Caricamento su portale',
    heading: 'Porta un PDF sotto il limite di caricamento del portale',
    lede: 'Una risposta a un avviso, un allegato a un ricorso o un documento di registrazione che il portale rifiuta perché il file è troppo grande. Questa pagina riscrive il PDF in modo più compatto e ricodifica le fotografie al suo interno, in questa scheda, e poi ti dice chiaramente se il risultato sta sotto il tetto che hai scelto. I tetti pubblicati del portale di dichiarazione telematica dell’imposta sui redditi e del portale GST sono nella riga dei pulsanti, ciascuno mostrato con la pagina del portale da cui è stato letto e la data di lettura.',
    steps: [
      'Scegli il portale e il modulo con cui stai presentando. Il tetto riempie la casella di destinazione e resta modificabile, perché il tuo modulo potrebbe non essere quello elencato.',
      'Apri il PDF. Le fotografie e le scansioni al suo interno vengono ricodificate, ed è lì che sta quasi tutto il peso di un allegato scansionato.',
      'Abbassa la qualità delle foto o la larghezza massima se la prima passata non basta. La scansione di una pagina dattiloscritta regge molto; la fotografia di una firma no.',
      'Il risultato indica la dimensione prima, quella dopo e se sta sotto il tetto che hai impostato — così lo sai prima di tornare al portale, non dopo un nuovo rifiuto.',
    ],
    limits: [
      'Un portale può cambiare il suo limite senza annunciarlo, e le date accanto a ogni cifra sono lì perché tu veda quanto è vecchia. Verifica il tuo prima di farci affidamento.',
      'Non c’è una passata automatica del tipo «stringi finché non entra». Scegli tu le impostazioni e leggi il risultato; nulla gira alle tue spalle distruggendo una scansione per centrare un numero.',
      'Un PDF fatto quasi solo di testo e già compatto può non ridursi molto, e il risultato lo dice invece di far finta.',
      'Comprimere non è oscurare. Tutto ciò che è visibile nel file lo resta anche dopo. Maschera ciò che non deve circolare prima di comprimere.',
      'Diversi portali limitano anche il numero di allegati e il totale di tutti. Portare un file sotto il limite per singolo file non risolve questo.',
    ],
  },
  id: {
    eyebrow: 'Pengajuan / Unggah ke portal',
    heading: 'Turunkan PDF di bawah batas unggah portal',
    lede: 'Jawaban atas sebuah surat, lampiran banding, atau dokumen pendaftaran yang ditolak portal karena berkasnya terlalu besar. Halaman ini menulis ulang PDF agar lebih padat dan menyandikan ulang foto di dalamnya, di tab ini, lalu menyatakan dengan jelas apakah hasilnya sudah di bawah batas yang Anda pilih. Batas yang diumumkan portal e-filing Pajak Penghasilan dan portal GST ada di baris tombol, masing-masing disertai halaman portal tempat angka itu dibaca dan tanggal pembacaannya.',
    steps: [
      'Pilih portal dan formulir yang Anda ajukan. Batasnya mengisi kotak sasaran dan tetap bisa disunting, karena formulir Anda mungkin bukan yang terdaftar.',
      'Buka berkas PDF. Foto dan hasil pindai di dalamnya disandikan ulang, dan di situlah hampir seluruh bobot lampiran hasil pindai berada.',
      'Turunkan mutu foto atau lebar maksimumnya bila tahap pertama belum cukup. Pindaian halaman hasil ketikan masih bertahan meski diturunkan jauh; foto sebuah tanda tangan tidak.',
      'Hasilnya menyebutkan ukuran sebelum, ukuran sesudah, dan apakah sudah di bawah batas yang Anda tetapkan — jadi Anda tahu sebelum kembali ke portal, bukan setelah ditolak lagi.',
    ],
    limits: [
      'Portal bisa mengubah batasnya tanpa pemberitahuan, dan tanggal di sebelah setiap angka ada di situ agar Anda tahu seberapa lama angka itu. Periksa batas Anda sebelum mengandalkannya.',
      'Tidak ada tahap otomatis yang “menekan sampai muat”. Anda memilih pengaturannya dan membaca hasilnya; tidak ada yang berputar di belakang Anda lalu merusak pindaian demi mengejar satu angka.',
      'PDF yang isinya hampir seluruhnya teks dan sudah padat mungkin tidak banyak mengecil, dan hasilnya mengatakan begitu daripada berpura-pura.',
      'Kompresi bukan penyensoran. Semua yang terlihat di berkas tetap terlihat sesudahnya. Tutupi apa yang tidak boleh ikut sebelum Anda mengompresnya.',
      'Beberapa portal juga membatasi jumlah lampiran dan total semuanya. Menurunkan satu berkas di bawah batas per berkas tidak menjawab hal itu.',
    ],
  },
  ja: {
    eyebrow: '申請 / 提出先へのアップロード',
    heading: '提出先のアップロード上限以下にPDFを収める',
    lede: '通知への回答、不服申立ての添付書類、登録書類が、ファイルが大きすぎるという理由で受け付けられない場合に使います。このページはPDFをより小さく書き直し、中の写真を再エンコードします。処理はこのタブで行われ、その結果があなたの選んだ上限を下回っているかどうかをはっきりお伝えします。所得税の電子申告ポータルとGSTポータルの公表上限はボタン列にあり、それぞれ、その数値を読み取ったポータルのページと読み取った日付が添えられています。',
    steps: [
      '提出先と提出する書式を選びます。上限が目標欄に入りますが、編集できるままです。あなたの書式が一覧にあるものとは違う場合があるからです。',
      'PDFを開きます。中の写真やスキャンが再エンコードされます。スキャンした添付書類の容量は、ほぼすべてそこにあります。',
      '1回目で足りなければ、写真の画質か最大幅を下げてください。活字のページをスキャンしたものはかなり下げても耐えますが、署名の写真は耐えません。',
      '結果には処理前のサイズ、処理後のサイズ、そして設定した上限を下回っているかが示されます。提出先に戻る前に分かる形です。もう一度断られてから分かるのではありません。',
    ],
    limits: [
      '提出先は予告なく上限を変更することがあります。各数値の横にある日付は、その数値がどれだけ古いかを確かめてもらうためのものです。頼る前にご自身で確認してください。',
      '「収まるまで自動で締め上げる」処理はありません。設定はあなたが選び、結果をあなたが読みます。数値を満たすために、裏側で黙って繰り返しスキャンを損なうことはしません。',
      '本文がほぼテキストで、すでに小さいPDFは、あまり縮まないことがあります。その場合も結果はごまかさず、そう表示します。',
      '圧縮は黒塗りではありません。ファイル内で見えているものは、処理後も見えています。外に出してはいけない箇所は、圧縮の前に隠してください。',
      '提出先によっては添付ファイルの数と合計容量にも上限があります。1ファイルを上限以下にしても、それらは満たされません。',
    ],
  },
  ru: {
    eyebrow: 'Подача / Загрузка на портал',
    heading: 'Уложить PDF в предел загрузки портала',
    lede: 'Ответ на уведомление, приложение к жалобе или регистрационный документ, который портал не принимает, потому что файл слишком большой. Эта страница перезаписывает PDF компактнее и перекодирует фотографии внутри него — в этой вкладке — и затем прямо сообщает, оказался ли результат ниже выбранного вами предела. Опубликованные пределы портала электронной подачи налоговой отчётности и портала GST указаны в строке кнопок, каждый вместе со страницей портала, с которой он был прочитан, и датой прочтения.',
    steps: [
      'Выберите портал и форму, в которую подаёте. Предел заполнит целевое поле и останется изменяемым, потому что ваша форма может быть не той, что указана в списке.',
      'Откройте PDF. Фотографии и сканы внутри него перекодируются — именно там сосредоточен почти весь объём отсканированного приложения.',
      'Понизьте качество фотографий или максимальную ширину, если первого прохода не хватило. Скан напечатанной страницы держится очень долго, фотография подписи — нет.',
      'Результат называет размер до, размер после и то, ниже ли он заданного вами предела — так вы узнаете это до возвращения на портал, а не после очередного отказа.',
    ],
    limits: [
      'Портал может изменить свой предел без объявления, и даты рядом с каждой цифрой стоят там, чтобы вы видели, насколько она стара. Проверьте свой, прежде чем на него полагаться.',
      'Автоматического прохода «сжимать, пока не влезет» здесь нет. Настройки выбираете вы и результат читаете вы; ничто не крутится за вашей спиной, тихо уничтожая скан ради нужной цифры.',
      'PDF, который почти целиком состоит из текста и уже компактен, может уменьшиться незначительно, и результат скажет об этом, а не сделает вид.',
      'Сжатие — не редактирование под цензуру. Всё, что видно в файле, останется видно и после. Закройте то, что не должно уйти, до сжатия.',
      'Ряд порталов ограничивает также число вложений и их суммарный объём. Один файл, уложенный в предел на файл, этих ограничений не снимает.',
    ],
  },
};

/** The localised brief for a route, or nothing when there is none. */
export function localizedBrief(
  localeCode: string,
  briefId: string,
): LocalizedBrief | undefined {
  if (briefId !== 'filing-bundle-under-portal-ceiling') return undefined;
  return FILING_CEILING[localeCode];
}
