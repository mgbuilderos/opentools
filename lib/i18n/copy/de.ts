import type { LocaleCopy } from '../locales';

/*
  Deutsch. Geschrieben, nicht übersetzt: die Titel verwenden die tatsächlich
  getippten Suchbegriffe — „pdf zusammenfügen“, „pdf verkleinern“, „jpg in
  pdf“, „pdf in word“, „bild verkleinern“ — nicht die Übersetzung des
  englischen Titels.
*/
export const DE: LocaleCopy = {
  hub: {
    title: 'Kostenlose PDF-Tools ohne Hochladen',
    description:
      'PDFs und Bilder zusammenfügen, verkleinern und umwandeln — direkt im Browser. Ihre Dateien verlassen Ihr Gerät nicht: ohne Konto, ohne Wasserzeichen.',
    heading: 'Werkzeuge, die in Ihrem Browser laufen',
    intro:
      'Die meisten PDF-Webseiten laden Ihre Datei auf einen fremden Server, verarbeiten sie dort und versprechen, sie danach zu löschen. Hier gibt es nichts zu löschen: Die Datei wird im Speicher dieses Tabs geöffnet, die Arbeit erledigt Ihr eigener Rechner, und das Ergebnis wird direkt heruntergeladen. Ihr Vertrag, Ihre Gehaltsabrechnung oder Ihr Steuerbescheid gehen nie durchs Netz.',
    toolsHeading: 'Verfügbare Werkzeuge auf Deutsch',
    privacyHeading: 'Warum Ihre Dateien nicht hochgeladen werden',
    privacyBody: [
      'Die Seite setzt eine Content-Security-Policy mit connect-src none — die Anweisung, mit der der Browser jede ausgehende Verbindung verbietet. Das ist kein Werbeversprechen, sondern eine Regel, die der Browser durchsetzt, nicht wir.',
      'Sie können es selbst prüfen: Entwicklertools öffnen, Reiter Netzwerk, Verbindung trennen und irgendein Werkzeug aus dieser Liste benutzen. Es funktioniert weiter, weil es nichts zu senden gab.',
    ],
    switcherLabel: 'Sprache',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'PDF zusammenfügen — kostenlos, ohne Hochladen',
      description:
        'Bis zu 20 PDFs im Browser zu einer Datei verbinden. Reihenfolge festlegen, zusammenfügen — die Seitenzahl wird vor dem Download geprüft. Ohne Upload.',
      heading: 'Über dieses Werkzeug zum Zusammenfügen von PDFs',
      directAnswer:
        'So verbinden Sie mehrere PDFs zu einer Datei: Dateien auswählen, mit den Pfeilen nach oben und unten sortieren, zusammenfügen. Jede Seite jeder Datei wird in dieser Reihenfolge in ein neues Dokument kopiert, und bevor ein Download angeboten wird, öffnet die Seite das Ergebnis erneut und vergleicht dessen Seitenzahl mit der Summe der Ausgangsdateien.',
      lead: 'Diese Seite verbindet vollständige PDFs in der von Ihnen festgelegten Reihenfolge — bis zu 20 Dateien gleichzeitig und 150 MB insgesamt — mit pdf-lib im Browser-Tab selbst. Jede Zeile der Liste zeigt Seitenzahl und Größe der Datei, damit Sie prüfen können, was Sie zusammenfügen, bevor Sie es tun. Abgedeckt sind Seiteninhalt und Seitenreihenfolge: Lesezeichen, digitale Signaturen, Formularfelder, Anhänge und Dokument-Metadaten überstehen den Vorgang noch nicht garantiert, und die Seite sagt das über dem Button. Ein verschlüsseltes PDF wird mit dem Hinweis abgelehnt, das Passwort zuerst lokal zu entfernen, statt halb eingelesen zu werden.',
      steps: [
        {
          name: 'PDFs hinzufügen',
          text: 'Dateien auswählen oder auf die Seite ziehen. Jede wird an ihren ersten fünf Bytes geprüft, bevor überhaupt etwas geparst wird — eine Datei, die kein PDF ist, wird sofort abgelehnt.',
        },
        {
          name: 'Reihenfolge festlegen',
          text: 'Die Dateien werden von oben nach unten verbunden. Jede Zeile hat einen Pfeil nach vorn, einen nach hinten und einen Knopf zum Entfernen. Innerhalb einer Datei bleibt die Seitenreihenfolge unverändert.',
        },
        {
          name: 'Zusammenfügen und herunterladen',
          text: 'Der Vorgang läuft in einem Web Worker, damit der Tab bedienbar bleibt. Danach wird das Ergebnis erneut als PDF gelesen und seine Seitenzahl mit der Summe der Eingaben verglichen; erst wenn beide übereinstimmen, gibt es einen Download.',
        },
      ],
      sections: [
        {
          heading: 'Was erhalten bleibt und was nicht',
          body: [
            'Erhalten bleiben der Inhalt jeder Seite und die von Ihnen gesetzte Reihenfolge. Ein PDF ist ein Container aus Objekten und keine Seitenfolge; zwei Dokumente zu verbinden heißt, Objekte zu kopieren und den Seitenbaum neu aufzubauen.',
            'Nicht garantiert sind Lesezeichen, digitale Signaturen, ausfüllbare Formularfelder, Anhänge und Metadaten. Wenn Sie eine rechtsgültige elektronische Signatur behalten müssen: Das Zusammenfügen macht sie ungültig — bei jedem Werkzeug, denn die Signatur gilt für die Bytes des Originaldokuments.',
          ],
        },
        {
          heading: 'Die Grenzen, klar benannt',
          body: [
            'Bis zu 20 Dateien pro Vorgang und 150 MB insgesamt. Diese Grenzen gibt es, weil alles im Speicher Ihres Tabs passiert: Es gibt keinen Server, an den sich größere Arbeit auslagern ließe, und ein Browser ohne Speicher schließt den Tab, statt zu warnen.',
            'Ein passwortgeschütztes PDF wird abgelehnt. Entfernen Sie das Passwort auf Ihrem Rechner und versuchen Sie es erneut.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Werden meine Dateien auf einen Server hochgeladen?',
          answer:
            'Nein. pdf-lib arbeitet in Ihrem Browser, und die Seite setzt connect-src none, womit der Browser selbst jede ausgehende Verbindung blockiert. Trennen Sie die Verbindung — das Werkzeug funktioniert weiter.',
        },
        {
          question: 'Gibt es ein Wasserzeichen oder ein Tageslimit?',
          answer:
            'Weder Wasserzeichen noch Konto noch Tageslimit. Es gibt keinen Server, dessen Kosten rationiert werden müssten, also wird nichts rationiert.',
        },
        {
          question: 'Kann ich ein passwortgeschütztes PDF zusammenfügen?',
          answer:
            'Nicht direkt. Das Werkzeug lehnt es ausdrücklich ab, statt es halb zu lesen. Entfernen Sie das Passwort lokal und fügen Sie es dann hier zusammen.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'PDF verkleinern — kostenlos, ohne Upload, echte Größen',
      description:
        'Ein PDF im Browser verkleinern oder unter eine vorgegebene Obergrenze bringen. Echte Größen vorher und nachher, und Ihr Original zurück, wenn nichts geht.',
      heading: 'Über dieses Werkzeug zum Verkleinern von PDFs',
      directAnswer:
        'So verkleinern Sie ein PDF im Browser: Datei auswählen, entscheiden, ob die enthaltenen Fotos neu kodiert werden sollen, und starten. Das Dokument wird mit Objektströmen neu geschrieben, geeignete JPEGs werden optional mit der von Ihnen gewählten Qualität und maximalen Kantenlänge neu kodiert, und die echten Größen vor und nach dem Vorgang werden angezeigt.',
      lead: 'Es gibt hier zwei Durchgänge, und beide werden gemessen statt geschätzt. Der erste ist verlustfrei: Die Datei wird mit Objektströmen neu geschrieben, und Titel, Autor, Thema, Stichwörter, Produzent und Ersteller lassen sich leeren. Am Sichtbaren ändert sich nichts. Der zweite ist optional und dort liegt meist das Gewicht: Eingebettete JPEGs werden dekodiert und vom Canvas des Browsers neu kodiert, mit einer Qualität zwischen 40 und 95 Prozent, und vorher verkleinert, wenn ihre längste Kante die gewählte Grenze überschreitet. Wird das Ergebnis größer als das Original, bekommen Sie das Original zurück: Ein Werkzeug, das eine größere Datei ausgibt und das Komprimierung nennt, belügt Sie.',
      steps: [
        {
          name: 'PDF auswählen',
          text: 'Auf die Seite ziehen oder auswählen. Die Datei wird im Speicher geöffnet und ihre aktuelle Größe angezeigt.',
        },
        {
          name: 'Entscheiden, was Sie aufgeben',
          text: 'Der verlustfreie Durchgang ändert nichts Sichtbares. Aktivieren Sie zusätzlich die Neukodierung der Bilder, wählen Sie Qualität und maximale Kantenlänge — dort entsteht die große Ersparnis, und dort geht Detail verloren.',
        },
        {
          name: 'Echte Größen vergleichen',
          text: 'Das Panel nennt die Größe vorher und nachher, gemessen an den gespeicherten Bytes und nicht vorab geschätzt. Laden Sie nur herunter, wenn Sie das Ergebnis überzeugt.',
        },
      ],
      sections: [
        {
          heading: 'Warum sich manche PDFs nicht verkleinern lassen',
          body: [
            'Ein bereits optimiertes oder reines Text-PDF bietet kaum Spielraum: Das Gewicht eines PDFs steckt meist in eingebetteten Bildern, und ohne Bilder gibt es nichts Großes neu zu kodieren.',
            'In diesem Fall gibt Ihnen das Werkzeug das Original zurück, statt eine kaum größere Datei unter neuem Namen. Das ist die ehrliche Antwort, und sie fehlt auf vielen Komprimierungsseiten.',
          ],
        },
        {
          heading: 'Unter eine vorgegebene Obergrenze bringen',
          body: [
            'Wenn ein Behördenportal Ihr Dokument wegen Überschreitung einer Maximalgröße ablehnt, brauchen Sie nicht „kleiner“, sondern „unter dieser Zahl“. Der Anpassungsmodus durchsucht Qualitätsstufen und Größen und entscheidet anhand gemessener Bytes, nicht anhand einer Schätzung.',
            'Reicht selbst die niedrigste Qualität nicht unter die Grenze, wird Ihnen das gesagt — statt Ihnen eine Datei zu geben, die das Portal erneut ablehnt.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Leidet die Qualität beim Verkleinern?',
          answer:
            'Beim ersten Durchgang nicht: Er schreibt die Dateistruktur neu und rührt das Sichtbare nicht an. Beim zweiten schon, denn er kodiert eingebettete Bilder neu — die Qualität wählen Sie, zwischen 40 und 95 Prozent.',
        },
        {
          question: 'Wird mein Dokument zum Verkleinern hochgeladen?',
          answer:
            'Nein. Das geschieht im Tab, und ausgehende Verbindungen sind der Seite per connect-src none untersagt. Prüfen Sie es, indem Sie die Verbindung trennen.',
        },
        {
          question: 'Warum ist die Datei genauso groß wie vorher?',
          answer:
            'Weil sie bereits optimiert war oder fast nur aus Text besteht. Dann erhalten Sie das Original unverändert zurück.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'JPG in PDF umwandeln — kostenlos und ohne Hochladen',
      description:
        'JPEG- und PNG-Bilder im Browser in ein einziges PDF verwandeln. Bis zu 40 Bilder, Seiten in A4, Letter oder passend zum Bild, und vier Randgrößen.',
      heading: 'Über diesen Bild-zu-PDF-Konverter',
      directAnswer:
        'So machen Sie aus JPEG- oder PNG-Bildern ein einziges PDF: Bilder auswählen, mit den Pfeilen sortieren, Seitenformat und Rand wählen, erzeugen. Jedes Bild wird eine Seite, zentriert und unter Wahrung seiner Proportionen in die Ränder eingepasst.',
      lead: 'Nur JPEG und PNG, bis zu 40 Bilder und 100 MB insgesamt, eine Seite pro Bild in der angezeigten Reihenfolge. Die festen Formate sind A4 (595,28 × 841,89 Punkt) und US Letter (612 × 792), mit an das jeweilige Bild angepasster oder auf Hoch- beziehungsweise Querformat erzwungener Ausrichtung. „An jedes Bild anpassen“ macht jede Seite exakt so groß wie ihr Bild plus Rand und vergrößert ein Bild nie. Die Ränder sind keiner, klein, mittel oder groß: 0, 12, 24 oder 36 Punkt. Jede Datei wird anhand ihrer eigenen Signatur gegen den angegebenen Typ geprüft, sodass eine bloß in .jpg umbenannte Datei abgelehnt wird, statt das Dokument mitten in der Erzeugung zu zerstören.',
      steps: [
        {
          name: 'Bilder hinzufügen',
          text: 'JPEG und PNG auswählen oder hineinziehen. Jede Datei wird an ihrer Binärsignatur geprüft, nicht an der Dateiendung.',
        },
        {
          name: 'Sortieren und Seite wählen',
          text: 'Die Pfeile ändern die Reihenfolge. Wählen Sie A4, Letter oder die Anpassung an jedes Bild, die Ausrichtung und einen der vier Ränder.',
        },
        {
          name: 'Erzeugen und herunterladen',
          text: 'Das PDF entsteht im Tab und wird direkt heruntergeladen. Kein Bild wird irgendwohin gesendet.',
        },
      ],
      sections: [
        {
          heading: 'Welches Seitenformat passt',
          body: [
            'A4 oder Letter, wenn gedruckt oder bei einem Portal eingereicht wird, das ein Standardformat erwartet. Das Bild wird zentriert und proportionswahrend in die Ränder eingepasst.',
            '„An jedes Bild anpassen“, wenn Sie ein PDF ohne weiße Ränder wollen: Jede Seite ist so groß wie ihr Bild plus Rand. Ein kleines Bild wird nie vergrößert, weil Vergrößern nur erfundene Pixel hinzufügen würde.',
          ],
        },
        {
          heading: 'Die Grenzen',
          body: [
            'Bis zu 40 Bilder und 100 MB insgesamt, weil alles im Speicher des Tabs aufgebaut wird. Nur JPEG und PNG — die Formate, die das Canvas des Browsers überall zuverlässig dekodiert.',
            'Für HEIC-Dateien vom iPhone nutzen Sie zuerst das Werkzeug HEIC zu JPG und kommen dann hierher zurück.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Kann ich mehrere Fotos in ein PDF packen?',
          answer:
            'Ja, bis zu 40 pro Vorgang. Jedes Bild wird eine Seite, und die Reihenfolge bestimmen Sie mit den Pfeilen.',
        },
        {
          question: 'Werden meine Fotos hochgeladen?',
          answer:
            'Nein. Das PDF entsteht in Ihrem Browser, und ausgehende Verbindungen sind für die Seite blockiert. Es funktioniert ohne Netzverbindung.',
        },
        {
          question: 'Verliert das Bild beim Umwandeln an Qualität?',
          answer:
            'Das Bild wird unverändert eingebettet und nur für die gewählte Seite skaliert. Mit „An jedes Bild anpassen“ und Rand null wird gar nichts skaliert.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'PDF in Word umwandeln — kostenlos und ohne Upload',
      description:
        'Den Text eines PDFs im Browser in ein bearbeitbares .docx holen. Lesereihenfolge, Absätze und Überschriften bleiben erhalten; Layout und Tabellen nicht.',
      heading: 'Über diese Umwandlung von PDF in Word',
      directAnswer:
        'Wählen Sie ein PDF mit bis zu 150 MB und wandeln Sie es um. Die Textebene wird in der Seite gelesen, anhand der Zeichenkoordinaten wieder zu Zeilen und Absätzen gruppiert und in ein .docx geschrieben, das nach Ihrem PDF benannt ist. Das holt die Wörter zurück, nicht die Seite: Es ist eine Textextraktion, und die Seite sagt das über dem Button.',
      lead: 'Ein PDF speichert Glyphen an Koordinaten, keine Absätze. Lesereihenfolge, Zeilengruppierung und Absatzgrenzen müssen deshalb aus der Geometrie rekonstruiert werden, und genau diese Rekonstruktion bekommen Sie. Herüber kommen: Lesereihenfolge, Absätze, Seitenumbrüche und in größerem Schriftgrad gesetzte Überschriften. Nicht herüber kommen: Layout, Spalten, Tabellen als Tabellen, Bilder und Schriften — das Ergebnis eine Konvertierung statt eine Extraktion zu nennen wäre übertrieben. Ein PDF ganz ohne Text — ein Scan oder das Foto eines Blattes — wird ausdrücklich abgelehnt, statt Ihnen ein leeres Dokument zu geben.',
      steps: [
        {
          name: 'PDF auswählen',
          text: 'Bis zu 150 MB. Die Datei wird im Speicher des Tabs geöffnet.',
        },
        {
          name: 'Umwandeln',
          text: 'Die Textebene wird gelesen und anhand der Zeichenkoordinaten zu Zeilen und Absätzen gruppiert.',
        },
        {
          name: '.docx herunterladen',
          text: 'Das Dokument trägt den Namen Ihres PDFs und öffnet sich in Word, LibreOffice oder Google Docs.',
        },
      ],
      sections: [
        {
          heading: 'Was übersteht und was nicht',
          body: [
            'Übersteht: die Lesereihenfolge, die Trennung in Absätze, Seitenumbrüche und größer gesetzte Überschriften, die als Überschriftenformat markiert werden.',
            'Übersteht nicht: Seitenlayout, Spalten, Tabellen als Tabellen, Bilder und die Originalschriften. Wenn Sie das Dokument identisch brauchen, liefert das kein kostenloses Werkzeug; hier bekommen Sie die Wörter zurück, um sie bearbeiten zu können.',
          ],
        },
        {
          heading: 'Wenn Ihr PDF ein Scan ist',
          body: [
            'Ein gescanntes PDF enthält keinen Text, sondern ein Bild von Text. Das Werkzeug lehnt es mit dieser Begründung ab, statt Ihnen ein leeres .docx zu geben.',
            'Nutzen Sie dafür zuerst die PDF-Texterkennung, die die Zeichen im Browser erkennt, und wandeln Sie danach hier um.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Bleibt die ursprüngliche Formatierung erhalten?',
          answer:
            'Nein. Erhalten bleiben Wörter, Lesereihenfolge, Absätze und Überschriften. Layout, Spalten und Tabellen nicht: Es ist eine Textextraktion, keine Nachbildung der Seite.',
        },
        {
          question: 'Muss ich mich anmelden oder eine E-Mail-Adresse angeben?',
          answer:
            'Nein. Kein Konto, keine E-Mail, kein Zusenden des Ergebnisses — die Datei verlässt Ihren Browser nie.',
        },
        {
          question: 'Funktioniert das mit einem gescannten PDF?',
          answer:
            'Nicht direkt: Ein Scan hat keine Textebene und wird ausdrücklich abgelehnt. Lassen Sie zuerst die Texterkennung laufen und versuchen Sie es dann erneut.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Bild verkleinern — JPG, PNG und WebP ohne Upload',
      description:
        'JPEG, PNG und WebP im eigenen Browser skalieren, komprimieren und umwandeln. Echte Größen vor und nach dem Vorgang, plus Stapelverarbeitung mit ZIP-Download.',
      heading: 'Über diesen Bildoptimierer',
      directAnswer:
        'Wählen Sie ein Bild oder mehrere, setzen Sie eine maximale Breite und Höhe, wählen Sie Ausgabeformat und Qualität und optimieren Sie. Das Bild wird in der neuen Größe auf ein Canvas gezeichnet und von Ihrem Browser neu kodiert; anschließend werden die gespeicherten Bytes erneut dekodiert, um die Abmessungen zu bestätigen, und das Panel nennt die echten Größen vorher und nachher.',
      lead: 'Drei Dinge in einem Durchgang — skalieren, neu kodieren, umwandeln — für JPEG, PNG und WebP bis je 25 MB. Skaliert wird nur nach unten, nie nach oben: Breite und Höhe sind ein Kasten, in den das Bild eingepasst wird. Ein Foto mit 4000 mal 3000, begrenzt auf 1200 mal 1200, kommt als 1200 mal 900 heraus, und ein Bild mit 640 mal 480 bleibt bei einer Grenze von 1200 unverändert. WebP ist das voreingestellte Ausgabeformat, weil es bei gleicher sichtbarer Qualität meist das kleinste der drei ist. Die Metadaten der Originaldatei werden nicht in das Ergebnis übernommen, sodass GPS-Standort und Kameramodell nicht mit dem Bild mitreisen, das Sie veröffentlichen.',
      steps: [
        {
          name: 'Bilder auswählen',
          text: 'Eines oder mehrere, als JPEG, PNG oder WebP, bis je 25 MB.',
        },
        {
          name: 'Maximalgröße und Qualität setzen',
          text: 'Breite und Höhe wirken als Kasten: Das Bild wird ohne Verzerrung eingepasst und nie vergrößert.',
        },
        {
          name: 'Optimieren und herunterladen',
          text: 'Ein Bild ergibt eine Datei, mehrere ergeben ein einzelnes ZIP. Das Panel zeigt für jedes die echte Größe vorher und nachher.',
        },
      ],
      sections: [
        {
          heading: 'Welches Format wählen',
          body: [
            'WebP als Standard: bei gleicher sichtbarer Qualität meist das kleinste der drei, und jeder aktuelle Browser liest es.',
            'JPEG, wenn das Ziel ein älteres System ist, das WebP nicht annimmt. PNG nur bei Transparenz oder wenn exakte Pixel nötig sind — für Fotos ist es immer größer.',
          ],
        },
        {
          heading: 'Metadaten werden nicht übernommen',
          body: [
            'Das Ergebnis wird aus dem Canvas geschrieben, daher landen die EXIF-Daten des Originals — GPS-Koordinaten, Kameramodell, Datum — nicht in der neuen Datei.',
            'Für ein Foto, das ins Netz soll, ist genau das erwünscht. Wenn Sie diese Daten behalten wollten, sichern Sie vor dem Optimieren auch das Original.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Kann ich mehrere Bilder gleichzeitig verkleinern?',
          answer:
            'Ja. Sie werden im Browser nacheinander verarbeitet und als ein einzelnes ZIP angeboten.',
        },
        {
          question: 'Werden meine Bilder auf einen Server geladen?',
          answer:
            'Nein. Sie werden auf ein Canvas gezeichnet und von Ihrem eigenen Browser neu kodiert; ausgehende Verbindungen sind der Seite untersagt.',
        },
        {
          question:
            'Wird ein kleines Bild vergrößert, wenn ich größere Maße angebe?',
          answer:
            'Nein. Skaliert wird nur nach unten: Ist das Bild bereits kleiner als der angegebene Kasten, bleibt es unverändert.',
        },
      ],
    },
  },
};
