import type { LocaleCopy } from '../locales';

/*
  Italiano. Scritto, non tradotto: i titoli usano le parole che si digitano
  davvero — «unire pdf», «comprimere pdf», «jpg in pdf», «pdf in word»,
  «comprimere immagine» — e non la traduzione del titolo inglese.
*/
export const IT: LocaleCopy = {
  hub: {
    title: 'Strumenti PDF gratuiti, senza caricare file',
    description:
      'Unisci, comprimi e converti PDF e immagini nel tuo browser. I tuoi file non lasciano il dispositivo: niente account, niente filigrana, nessun limite di download.',
    heading: 'Strumenti che funzionano dentro il tuo browser',
    intro:
      'Quasi tutti i siti per PDF caricano il tuo file su un server altrui, lo elaborano lì e promettono di cancellarlo dopo. Qui non c’è niente da cancellare: il file viene aperto nella memoria di questa scheda, il lavoro lo fa il tuo computer e il risultato si scarica direttamente. Il tuo contratto, la tua busta paga o la tua dichiarazione dei redditi non passano mai dalla rete.',
    toolsHeading: 'Strumenti disponibili in italiano',
    privacyHeading: 'Perché i tuoi file non vengono caricati',
    privacyBody: [
      'La pagina dichiara una Content-Security-Policy con connect-src none, cioè l’istruzione con cui il browser vieta qualsiasi connessione in uscita. Non è una promessa commerciale: è una regola applicata dal browser, non da noi.',
      'Puoi verificarlo da solo: apri gli strumenti per sviluppatori, scheda Rete, stacca la connessione e usa un qualsiasi strumento di questo elenco. Continua a funzionare, perché non c’era nulla da inviare.',
    ],
    switcherLabel: 'Lingua',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'Unire PDF gratis — senza caricare e senza registrarsi',
      description:
        'Combina fino a 20 PDF in uno solo dentro il browser. Imposta l’ordine e unisci: il numero di pagine viene verificato prima del download. Nessun account.',
      heading: 'Su questo strumento per unire PDF',
      directAnswer:
        'Per unire più PDF in uno solo: scegli i file, ordinali con le frecce su e giù e avvia l’unione. Tutte le pagine di tutti i file vengono copiate in un nuovo documento in quell’ordine e, prima di proporre il download, il risultato viene riaperto per controllare che il suo numero di pagine corrisponda alla somma dei file di partenza.',
      lead: 'Questa pagina unisce PDF interi nell’ordine che imposti tu — fino a 20 file per volta e 150 MB complessivi — usando pdf-lib dentro la scheda stessa. Ogni riga dell’elenco mostra il numero di pagine e la dimensione del file, così puoi controllare cosa stai per unire prima di unirlo. Quello che l’ambito attuale copre è il contenuto e l’ordine delle pagine: segnalibri, firme digitali, campi modulo, allegati e metadati del documento non sono ancora garantiti, e la pagina lo dice sopra il pulsante. Un PDF cifrato viene rifiutato con l’indicazione di togliere prima la password sul tuo computer, invece di essere letto a metà.',
      steps: [
        {
          name: 'Aggiungi i PDF',
          text: 'Scegli i file o trascinali sulla pagina. Ognuno viene controllato sui primi cinque byte prima di qualsiasi analisi, quindi un file che non è un PDF viene rifiutato subito.',
        },
        {
          name: 'Mettili in ordine',
          text: 'I file vengono uniti dall’alto verso il basso secondo l’elenco. Ogni riga ha una freccia per anticipare il file, una per posticiparlo e un pulsante per toglierlo. Dentro un file le pagine mantengono il loro ordine.',
        },
        {
          name: 'Unisci e scarica',
          text: 'L’unione gira in un Web Worker perché la scheda resti reattiva. Poi il risultato viene riletto come PDF e il numero di pagine confrontato con il totale in ingresso; il download compare solo quando i due coincidono.',
        },
      ],
      sections: [
        {
          heading: 'Cosa si conserva e cosa no',
          body: [
            'Si conservano il contenuto di ogni pagina e l’ordine che hai impostato. Un PDF è un contenitore di oggetti, non una sequenza di pagine: unire due documenti significa copiare oggetti dall’uno all’altro e ricostruire l’albero delle pagine.',
            'Non sono garantiti segnalibri, firme digitali, campi modulo compilabili, allegati e metadati. Se devi conservare una firma elettronica con valore legale, l’unione la invaliderà — come con qualsiasi strumento, perché la firma copre i byte del documento originale.',
          ],
        },
        {
          heading: 'I limiti, detti chiaramente',
          body: [
            'Fino a 20 file per operazione e 150 MB in totale. Questi limiti esistono perché tutto avviene nella memoria della tua scheda: non c’è un server a cui delegare un lavoro più grande, e un browser senza memoria chiude la scheda invece di avvisare.',
            'Un PDF protetto da password viene rifiutato. Togli la password sul tuo computer e riprova.',
          ],
        },
      ],
      faqs: [
        {
          question: 'I miei file vengono caricati su un server?',
          answer:
            'No. L’unione la fa pdf-lib dentro il tuo browser e la pagina dichiara connect-src none, quindi è il browser stesso a bloccare ogni connessione in uscita. Stacca la rete: lo strumento continua a funzionare.',
        },
        {
          question: 'C’è una filigrana o un limite giornaliero?',
          answer:
            'Niente filigrana, niente account, nessun limite al giorno. Non esiste un server il cui costo vada razionato, quindi non c’è nulla da razionare.',
        },
        {
          question: 'Posso unire un PDF protetto da password?',
          answer:
            'Non direttamente: lo strumento lo rifiuta esplicitamente invece di leggerlo a metà. Togli la password sul tuo computer e poi uniscilo qui.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'Comprimere PDF gratis — senza caricare, dimensioni reali',
      description:
        'Riduci le dimensioni di un PDF nel tuo browser, o portalo sotto un tetto imposto. Dimensioni reali prima e dopo, e il file originale indietro se non si può ridurre.',
      heading: 'Su questo compressore di PDF',
      directAnswer:
        'Per ridurre un PDF nel browser: scegli il file, decidi se ricodificare le foto che contiene e avvia. Il documento viene riscritto con flussi di oggetti, i JPEG idonei vengono ricodificati facoltativamente alla qualità e al lato massimo che scegli, e vengono riportate le dimensioni reali prima e dopo.',
      lead: 'Qui ci sono due passaggi ed entrambi sono misurati invece che stimati. Il primo è senza perdita: il file viene riscritto usando flussi di oggetti, e titolo, autore, oggetto, parole chiave, produttore e creatore possono essere svuotati. Non cambia nulla di visibile sulla pagina. Il secondo è facoltativo ed è dove di solito sta il peso: i JPEG incorporati vengono decodificati e ricodificati dal canvas del browser, con una qualità tra il 40 e il 95 per cento, e ridotti prima se il loro lato più lungo supera il limite scelto. Se il risultato viene più grande dell’originale, ti viene restituito l’originale: uno strumento che consegna un file più grande e lo chiama compressione ti sta mentendo.',
      steps: [
        {
          name: 'Scegli il PDF',
          text: 'Trascinalo sulla pagina o selezionalo. Il file viene aperto in memoria e ne viene mostrata la dimensione attuale.',
        },
        {
          name: 'Decidi cosa sei disposto a perdere',
          text: 'Il passaggio senza perdita non cambia nulla di visibile. Se attivi anche la ricodifica delle immagini, imposta la qualità e il lato massimo: lì si ottiene la riduzione grande e lì si perde dettaglio.',
        },
        {
          name: 'Confronta le dimensioni reali',
          text: 'Il pannello riporta la dimensione prima e dopo, misurate sui byte salvati e non stimate in anticipo. Scarica solo se il risultato ti convince.',
        },
      ],
      sections: [
        {
          heading: 'Perché certi PDF non si comprimono',
          body: [
            'Un PDF già ottimizzato, o fatto solo di testo, ha pochissimo margine: il peso di un PDF di solito sta nelle immagini incorporate, e senza immagini non c’è niente di grosso da ricodificare.',
            'In quel caso lo strumento ti restituisce l’originale invece di consegnarti un file appena più grande con un altro nome. È la risposta onesta, ed è quella che molti siti di compressione non danno.',
          ],
        },
        {
          heading: 'Scendere sotto un tetto imposto',
          body: [
            'Quando un portale rifiuta il tuo documento perché supera una dimensione massima, quello che ti serve non è «più piccolo» ma «sotto questo numero». La modalità di adattamento percorre qualità e dimensioni e decide sui byte misurati, non su una stima.',
            'Se nemmeno la qualità minima basta a scendere sotto il tetto, te lo dice, invece di consegnarti un file che il portale rifiuterà di nuovo.',
          ],
        },
      ],
      faqs: [
        {
          question: 'La compressione peggiora la qualità del PDF?',
          answer:
            'Il primo passaggio no: riscrive la struttura del file e non tocca ciò che si vede. Il secondo sì, perché ricodifica le immagini incorporate — la qualità la scegli tu, tra il 40 e il 95 per cento.',
        },
        {
          question: 'Il mio documento viene caricato per comprimerlo?',
          answer:
            'No. La compressione avviene nella scheda e alla pagina sono vietate le connessioni in uscita tramite connect-src none. Verificalo staccando la rete.',
        },
        {
          question: 'Perché il file pesa come prima?',
          answer:
            'Perché era già ottimizzato o perché è quasi tutto testo. In quel caso ti viene restituito l’originale invariato.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'Da JPG a PDF gratis — convertire immagini senza caricarle',
      description:
        'Trasforma immagini JPEG e PNG in un unico PDF nel browser. Fino a 40 immagini, pagine A4, Letter o adattate all’immagine, e quattro misure di margine.',
      heading: 'Su questo convertitore da immagine a PDF',
      directAnswer:
        'Per trasformare immagini JPEG o PNG in un unico PDF: scegli le immagini, ordinale con le frecce, imposta un formato di pagina e un margine e genera. Ogni immagine diventa una pagina, centrata e scalata per stare dentro i margini mantenendo le proporzioni.',
      lead: 'Solo JPEG e PNG, fino a 40 immagini e 100 MB in totale, una pagina per immagine nell’ordine mostrato. I formati fissi sono A4 (595,28 × 841,89 punti) e US Letter (612 × 792), con l’orientamento adattato a ogni immagine oppure forzato in verticale od orizzontale. L’opzione «Adatta a ogni immagine» rende ogni pagina esattamente grande quanto la sua immagine più il margine, e non ingrandisce mai l’immagine. I margini sono nessuno, piccolo, medio o grande: 0, 12, 24 o 36 punti. Ogni file viene verificato rispetto al tipo dichiarato dalla sua stessa firma binaria, così un file semplicemente rinominato in .jpg viene rifiutato invece di rompere il documento a metà generazione.',
      steps: [
        {
          name: 'Aggiungi le immagini',
          text: 'Seleziona o trascina i JPEG e i PNG. Ogni file viene controllato dalla firma binaria, non dall’estensione.',
        },
        {
          name: 'Ordina e scegli la pagina',
          text: 'Le frecce cambiano l’ordine. Scegli A4, Letter o l’adattamento a ogni immagine, l’orientamento e uno dei quattro margini.',
        },
        {
          name: 'Genera e scarica',
          text: 'Il PDF viene costruito nella scheda e scaricato direttamente. Nessuna immagine viene inviata da nessuna parte.',
        },
      ],
      sections: [
        {
          heading: 'Quale formato di pagina scegliere',
          body: [
            'A4 o Letter se il documento va stampato o caricato su un portale che si aspetta un formato standard. L’immagine viene centrata e scalata per stare dentro i margini, proporzioni mantenute.',
            '«Adatta a ogni immagine» se vuoi un PDF senza bordi bianchi: ogni pagina è grande quanto la sua immagine più il margine. Un’immagine piccola non viene mai ingrandita, perché ingrandirla aggiungerebbe solo pixel inventati.',
          ],
        },
        {
          heading: 'I limiti',
          body: [
            'Fino a 40 immagini e 100 MB in totale, perché tutto viene costruito nella memoria della scheda. Solo JPEG e PNG: i formati che il canvas del browser decodifica in modo affidabile ovunque.',
            'Per i file HEIC dell’iPhone passa prima dallo strumento da HEIC a JPG e poi torna qui.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Posso unire più foto in un solo PDF?',
          answer:
            'Sì, fino a 40 per operazione. Ogni immagine diventa una pagina e l’ordine lo imposti tu con le frecce.',
        },
        {
          question: 'Le mie foto vengono caricate?',
          answer:
            'No. Il PDF viene costruito dentro il tuo browser e le connessioni in uscita sono bloccate per la pagina. Funziona con la rete staccata.',
        },
        {
          question: 'Si perde qualità passando da JPG a PDF?',
          answer:
            'L’immagine viene incorporata così com’è e solo scalata per entrare nella pagina scelta. Con «Adatta a ogni immagine» e margine zero non viene scalato nulla.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'Da PDF a Word gratis — senza caricare e senza email',
      description:
        'Estrai il testo di un PDF in un .docx modificabile nel tuo browser. Ordine di lettura, paragrafi e titoli si conservano; impaginazione e tabelle no.',
      heading: 'Su questa conversione da PDF a Word',
      directAnswer:
        'Scegli un PDF fino a 150 MB e convertilo. Lo strato di testo viene letto nella pagina, raggruppato in righe e paragrafi a partire dalle coordinate dei caratteri e scritto in un .docx che porta il nome del tuo PDF. Questo recupera le parole, non la pagina: è un’estrazione di testo, e la pagina lo dice sopra il pulsante.',
      lead: 'Un PDF memorizza glifi a delle coordinate, non paragrafi: ordine di lettura, raggruppamento in righe e confini dei paragrafi vanno quindi ricostruiti dalla geometria, e quella ricostruzione è ciò che ottieni. Passano: l’ordine di lettura, i paragrafi, le interruzioni di pagina e i titoli composti in corpo più grande. Non passano: impaginazione, colonne, tabelle come tabelle, immagini e caratteri; chiamare il risultato una conversione anziché un’estrazione sarebbe esagerato. Un PDF senza alcun testo — una scansione, o la foto di un foglio — viene rifiutato dicendolo, invece di restituirti un documento vuoto.',
      steps: [
        {
          name: 'Scegli il PDF',
          text: 'Fino a 150 MB. Il file viene aperto nella memoria della scheda.',
        },
        {
          name: 'Converti',
          text: 'Lo strato di testo viene letto e raggruppato in righe e paragrafi secondo le coordinate dei caratteri.',
        },
        {
          name: 'Scarica il .docx',
          text: 'Il documento prende il nome del tuo PDF e si apre in Word, LibreOffice o Google Docs.',
        },
      ],
      sections: [
        {
          heading: 'Cosa sopravvive e cosa no',
          body: [
            'Sopravvivono: l’ordine di lettura, la divisione in paragrafi, le interruzioni di pagina e i titoli in corpo più grande, marcati come stile titolo.',
            'Non sopravvivono: l’impaginazione, le colonne, le tabelle come tabelle, le immagini e i caratteri originali. Se ti serve il documento identico, nessuno strumento gratuito te lo darà; qui si recuperano le parole, per poterle modificare.',
          ],
        },
        {
          heading: 'Se il tuo PDF è una scansione',
          body: [
            'Un PDF scansionato non contiene testo, contiene un’immagine di testo. Lo strumento lo rifiuta dicendolo, invece di consegnarti un .docx vuoto.',
            'In quel caso usa prima l’OCR per PDF, che riconosce i caratteri dentro il browser, e poi converti qui.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Si conserva la formattazione originale?',
          answer:
            'No. Si conservano le parole, l’ordine di lettura, i paragrafi e i titoli. Impaginazione, colonne e tabelle no: è un’estrazione di testo, non una riproduzione della pagina.',
        },
        {
          question: 'Serve registrarsi o lasciare un’email?',
          answer:
            'No. Niente account, niente email e nessun invio del risultato per posta, perché il file non lascia mai il tuo browser.',
        },
        {
          question: 'Funziona con un PDF scansionato?',
          answer:
            'Non direttamente: una scansione non ha uno strato di testo e viene rifiutata esplicitamente. Passa prima dall’OCR e riprova.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Comprimere immagine — JPG, PNG e WebP senza caricarle',
      description:
        'Ridimensiona, comprimi e converti JPEG, PNG e WebP nel tuo browser. Dimensioni reali prima e dopo, e modalità a lotti con download in ZIP.',
      heading: 'Su questo ottimizzatore di immagini',
      directAnswer:
        'Scegli una o più immagini, imposta una larghezza e un’altezza massime, scegli un formato di uscita e una qualità e ottimizza. L’immagine viene disegnata su un canvas alla nuova dimensione e ricodificata dal tuo browser; poi i byte salvati vengono decodificati di nuovo per confermare le dimensioni ottenute, e il pannello riporta le dimensioni reali prima e dopo.',
      lead: 'Tre cose in un solo passaggio — ridimensionare, ricodificare e convertire — su JPEG, PNG e WebP fino a 25 MB ciascuno. Il ridimensionamento riduce soltanto e non ingrandisce mai: la larghezza e l’altezza che indichi sono una scatola dentro cui l’immagine viene adattata, così una fotografia da 4000 per 3000 limitata a 1200 per 1200 esce a 1200 per 900, e un’immagine da 640 per 480 limitata a 1200 resta 640 per 480. WebP è il formato di uscita predefinito perché di solito è il più piccolo dei tre a parità di qualità visiva. Lo strumento non copia i metadati del file originale nel risultato, quindi la posizione GPS e il modello di fotocamera non viaggiano con l’immagine che pubblichi.',
      steps: [
        {
          name: 'Scegli le immagini',
          text: 'Una o più, in JPEG, PNG o WebP, fino a 25 MB ciascuna.',
        },
        {
          name: 'Imposta dimensione massima e qualità',
          text: 'Larghezza e altezza funzionano come una scatola: l’immagine ci entra senza deformarsi e senza essere mai ingrandita.',
        },
        {
          name: 'Ottimizza e scarica',
          text: 'Con una immagine ottieni il file, con più immagini un unico ZIP. Il pannello mostra per ciascuna la dimensione reale prima e dopo.',
        },
      ],
      sections: [
        {
          heading: 'Quale formato scegliere',
          body: [
            'WebP come impostazione predefinita: a parità di qualità visiva è in genere il più piccolo dei tre, e lo leggono tutti i browser attuali.',
            'JPEG se la destinazione è un sistema vecchio che non accetta WebP. PNG solo se ti serve la trasparenza o pixel esatti, perché per una fotografia peserà sempre di più.',
          ],
        },
        {
          heading: 'I metadati non vengono copiati',
          body: [
            'Il risultato viene scritto dal canvas, quindi i metadati EXIF dell’originale — coordinate GPS, modello di fotocamera, data — non finiscono nel file nuovo.',
            'Per pubblicare una foto online è esattamente quello che vuoi. Se quei dati ti servivano, conserva anche l’originale prima di ottimizzare.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Posso comprimere più immagini insieme?',
          answer:
            'Sì. Vengono elaborate una dopo l’altra dentro il browser e consegnate in un unico ZIP.',
        },
        {
          question: 'Le mie immagini finiscono su un server?',
          answer:
            'No. Vengono disegnate su un canvas e ricodificate dal tuo stesso browser, e alla pagina sono vietate le connessioni in uscita.',
        },
        {
          question:
            'Un’immagine piccola viene ingrandita se indico misure maggiori?',
          answer:
            'No. Il ridimensionamento riduce soltanto: se l’immagine è già più piccola della scatola indicata, resta com’è.',
        },
      ],
    },
  },
};
