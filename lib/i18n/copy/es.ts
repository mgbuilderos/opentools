import type { LocaleCopy } from '../locales';

/*
  Español. Escrito, no traducido: el título de cada página usa las palabras que
  se teclean en Google -- «unir pdf», «comprimir pdf», «jpg a pdf», «pdf a
  word», «comprimir imagen» -- y no la traducción literal del título inglés.
  Los límites declarados aquí son los mismos que aplica el código.
*/
export const ES: LocaleCopy = {
  hub: {
    title: 'Herramientas PDF gratis, sin subir archivos',
    description:
      'Une, comprime y convierte PDF e imágenes en tu propio navegador. Tus archivos no salen de tu dispositivo: sin cuenta, sin marca de agua y sin límite de descargas.',
    heading: 'Herramientas que funcionan dentro de tu navegador',
    intro:
      'Casi todas las webs de PDF suben tu archivo a un servidor ajeno, lo procesan allí y te prometen borrarlo después. Aquí no hay nada que borrar: el archivo se abre en la memoria de esta pestaña, el trabajo lo hace tu propio ordenador y el resultado se descarga directamente. Ni tu contrato, ni tu nómina, ni tu declaración de la renta llegan a viajar por la red.',
    toolsHeading: 'Herramientas disponibles en español',
    privacyHeading: 'Por qué tus archivos no se suben',
    privacyBody: [
      'La página declara una Content-Security-Policy con connect-src none, que es la instrucción del navegador para prohibir cualquier conexión de salida. No es una promesa comercial: es una regla que aplica el navegador, no nosotros.',
      'Puedes comprobarlo tú mismo. Abre las herramientas de desarrollo, ve a la pestaña Red, desconecta el wifi y usa cualquier herramienta de esta lista. Siguen funcionando, porque no había nada que enviar.',
    ],
    stepsHeading: 'Paso a paso',
    faqsHeading: 'Preguntas frecuentes',
    switcherLabel: 'Idioma',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'Unir PDF gratis — sin subir archivos ni registrarse',
      description:
        'Combina hasta 20 PDF en uno solo en tu navegador. Ordénalos, únelos y el número de páginas se verifica antes de la descarga. Sin subida y sin cuenta.',
      heading: 'Sobre esta herramienta para unir PDF',
      directAnswer:
        'Para combinar varios PDF en uno: elige los archivos, ordénalos con las flechas arriba y abajo, y pulsa unir. Todas las páginas de todos los archivos se copian a un documento nuevo en ese orden, y antes de ofrecerte la descarga el resultado se vuelve a abrir para comprobar que su número de páginas coincide con la suma de los originales.',
      lead: 'Esta página une PDF completos en el orden que tú decidas — hasta 20 archivos a la vez y 150 MB entre todos — usando pdf-lib dentro de la propia pestaña. Cada fila de la lista muestra el número de páginas y el tamaño del archivo, para que puedas revisar lo que vas a unir antes de unirlo. Lo que el alcance actual cubre es el contenido y el orden de las páginas: los marcadores, las firmas digitales, los campos de formulario, los adjuntos y los metadatos del documento todavía no está garantizado que sobrevivan, y la página lo advierte encima del botón. Un PDF cifrado se rechaza con un aviso para que le quites la contraseña en tu equipo primero, en lugar de leerlo a medias.',
      steps: [
        {
          name: 'Añade los PDF',
          text: 'Elige los archivos o arrástralos a la página. Cada uno se comprueba por sus cinco primeros bytes antes de analizar nada, así que un archivo que no sea un PDF se rechaza de inmediato.',
        },
        {
          name: 'Ponlos en orden',
          text: 'Los archivos se unen de arriba abajo según la lista. Cada fila tiene una flecha para adelantar ese archivo, otra para retrasarlo y un botón para quitarlo. Dentro de cada archivo las páginas mantienen su orden: nada se reordena por dentro.',
        },
        {
          name: 'Une y descarga',
          text: 'La unión se ejecuta en un Web Worker para que la pestaña siga respondiendo. Después el resultado se vuelve a leer como PDF y se compara su número de páginas con el total que entró; sólo cuando coinciden se ofrece la descarga.',
        },
      ],
      sections: [
        {
          heading: 'Qué se conserva y qué no',
          body: [
            'Se conserva el contenido de cada página y el orden que has fijado. Un PDF es un contenedor de objetos, no una secuencia de páginas, así que unir dos documentos significa copiar objetos de uno a otro y reconstruir el árbol de páginas.',
            'No está garantizado que sobrevivan los marcadores, las firmas digitales, los campos de formulario rellenables, los archivos adjuntos ni los metadatos del documento. Si necesitas conservar una firma digital con validez legal, unir el PDF la invalidará, igual que en cualquier otra herramienta: la firma cubre los bytes del documento original.',
          ],
        },
        {
          heading: 'Los límites, dichos claramente',
          body: [
            'Hasta 20 archivos por operación y 150 MB sumando todos. Los límites existen porque todo ocurre en la memoria de tu pestaña: no hay un servidor al que delegar un trabajo más grande, y un navegador sin memoria cierra la pestaña en lugar de avisar.',
            'Un PDF protegido con contraseña se rechaza. Quítale la contraseña en tu equipo y vuelve a intentarlo.',
          ],
        },
      ],
      faqs: [
        {
          question: '¿Se suben mis archivos a algún servidor?',
          answer:
            'No. La unión la hace pdf-lib dentro de tu navegador y la página declara connect-src none, de modo que el propio navegador bloquea cualquier conexión de salida. Puedes desconectar la red y la herramienta sigue funcionando.',
        },
        {
          question: '¿Hay marca de agua o límite de archivos al día?',
          answer:
            'No hay marca de agua, ni cuenta, ni límite diario. No existe un servidor cuyo coste haya que racionar, así que no hay nada que racionar.',
        },
        {
          question: '¿Puedo unir un PDF con contraseña?',
          answer:
            'No directamente. La herramienta lo rechaza con un aviso en lugar de leerlo a medias. Quita la contraseña en tu equipo y después únelo aquí.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'Comprimir PDF gratis — sin subirlo, con tamaños reales',
      description:
        'Reduce el tamaño de un PDF en tu navegador o ajústalo bajo un límite concreto. Verás el tamaño real antes y después, y recuperas el original si no se puede.',
      heading: 'Sobre este compresor de PDF',
      directAnswer:
        'Para reducir un PDF en el navegador: elige el archivo, decide si quieres recodificar las fotos que contiene y ejecútalo. El documento se reescribe con flujos de objetos, los JPEG aptos se recodifican opcionalmente con la calidad y el borde máximo que elijas, y se informa del tamaño real antes y después.',
      lead: 'Aquí hay dos pasadas y las dos se miden en lugar de estimarse. La primera no tiene pérdida: el archivo se reescribe usando flujos de objetos, y opcionalmente se pueden vaciar el título, el autor, el asunto, las palabras clave, el productor y el creador. No cambia nada de lo que se ve en la página. La segunda es opcional y es donde suele estar el tamaño: los JPEG incrustados se decodifican y se vuelven a codificar con el propio canvas del navegador, con una calidad entre el 40 y el 95 por ciento, y se reducen antes si su borde más largo supera el límite que hayas puesto. Si el resultado sale más grande que el original, se te devuelve el original: una herramienta que te entrega un archivo mayor y lo llama compresión te está mintiendo.',
      steps: [
        {
          name: 'Elige el PDF',
          text: 'Arrástralo a la página o selecciónalo. El archivo se abre en memoria y se muestra su tamaño actual.',
        },
        {
          name: 'Decide cuánto quieres arriesgar',
          text: 'La pasada sin pérdida está siempre disponible y no cambia nada visible. Si además activas la recodificación de imágenes, elige la calidad y el borde máximo: ahí es donde se consigue la reducción grande, y también donde se pierde detalle.',
        },
        {
          name: 'Compara los tamaños reales',
          text: 'El panel informa del tamaño antes y del tamaño después, medidos sobre los bytes guardados y no calculados de antemano. Descarga sólo si el resultado te convence.',
        },
      ],
      sections: [
        {
          heading: 'Por qué a veces un PDF no se puede comprimir',
          body: [
            'Un PDF que ya está optimizado, o que es sólo texto, apenas tiene margen: el peso de un PDF suele estar en las imágenes incrustadas, y si no hay imágenes no hay nada grande que recodificar.',
            'En ese caso la herramienta te devuelve el original en lugar de entregarte un archivo ligeramente mayor con otro nombre. Es la respuesta honesta y es la que muchas webs de compresión no dan.',
          ],
        },
        {
          heading: 'Ajustar por debajo de un límite',
          body: [
            'Cuando un portal de trámites rechaza tu documento por superar un tamaño máximo, lo que necesitas no es «más pequeño», es «por debajo de este número». El modo de ajuste busca entre calidades y tamaños y decide sobre los bytes medidos, no sobre una estimación.',
            'Si ni siquiera la calidad mínima consigue bajar del límite, te lo dice en lugar de entregarte un archivo que el portal volverá a rechazar.',
          ],
        },
      ],
      faqs: [
        {
          question: '¿Pierde calidad el PDF al comprimirlo?',
          answer:
            'La primera pasada no: reescribe la estructura del archivo y no toca lo que se ve. La segunda sí, porque recodifica las imágenes incrustadas; tú eliges la calidad, entre el 40 y el 95 por ciento.',
        },
        {
          question: '¿Se sube mi documento para comprimirlo?',
          answer:
            'No. La compresión ocurre dentro de la pestaña y la página tiene prohibidas las conexiones de salida mediante connect-src none. Puedes comprobarlo desconectando la red.',
        },
        {
          question: '¿Por qué el archivo resultante pesa lo mismo?',
          answer:
            'Porque ya estaba optimizado o porque casi todo su contenido es texto. En ese caso se te devuelve el original en lugar de un archivo inflado.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'JPG a PDF gratis — convierte imágenes a PDF sin subirlas',
      description:
        'Convierte imágenes JPEG y PNG en un solo PDF dentro de tu navegador. Hasta 40 imágenes, páginas A4, Carta o ajustadas a la imagen, y cuatro tamaños de margen.',
      heading: 'Sobre este conversor de imágenes a PDF',
      directAnswer:
        'Para convertir imágenes JPEG o PNG en un único PDF: elige las imágenes, ordénalas con las flechas, escoge un tamaño de página y un margen, y genera. Cada imagen se convierte en una página, centrada y escalada para caber dentro de los márgenes conservando sus proporciones.',
      lead: 'Sólo JPEG y PNG, hasta 40 imágenes y 100 MB en total, una página por imagen en el orden que se muestra en pantalla. Los tamaños fijos son A4 (595,28 × 841,89 puntos) y Carta estadounidense (612 × 792), con la orientación ajustada a cada imagen o forzada a vertical u horizontal. Si eliges «Ajustar a cada imagen», cada página mide exactamente lo que su imagen más el margen, y nunca se amplía la imagen. Los márgenes son ninguno, pequeño, mediano o grande: 0, 12, 24 o 36 puntos. Cada archivo se verifica contra su tipo declarado por su propia firma, así que un archivo renombrado a .jpg se rechaza en lugar de romper el documento a medio generar.',
      steps: [
        {
          name: 'Añade las imágenes',
          text: 'Selecciona o arrastra los JPEG y PNG. Cada archivo se comprueba por su firma binaria, no por su extensión.',
        },
        {
          name: 'Ordena y elige la página',
          text: 'Las flechas cambian el orden. Escoge A4, Carta o ajuste a cada imagen, la orientación y uno de los cuatro márgenes.',
        },
        {
          name: 'Genera y descarga',
          text: 'El PDF se construye en la pestaña y se descarga directamente. Ninguna imagen se envía a ningún sitio.',
        },
      ],
      sections: [
        {
          heading: 'Qué tamaño de página elegir',
          body: [
            'A4 o Carta si el documento se va a imprimir o subir a un trámite que espera un tamaño estándar. La imagen se centra y se escala para caber dentro de los márgenes, conservando sus proporciones.',
            '«Ajustar a cada imagen» si lo que quieres es un PDF que no añada bordes blancos: cada página mide lo que mide su imagen más el margen. Nunca se amplía una imagen pequeña, porque ampliarla sólo añadiría píxeles inventados.',
          ],
        },
        {
          heading: 'Los límites',
          body: [
            'Hasta 40 imágenes y 100 MB en total, porque todo se construye en la memoria de la pestaña. Sólo JPEG y PNG: los formatos que el canvas del navegador puede decodificar de forma fiable en todos los navegadores.',
            'Si necesitas convertir HEIC de un iPhone, pásalo antes por la herramienta de HEIC a JPG y vuelve aquí.',
          ],
        },
      ],
      faqs: [
        {
          question: '¿Puedo convertir varias fotos en un solo PDF?',
          answer:
            'Sí, hasta 40 en una operación. Cada imagen es una página y el orden lo fijas tú con las flechas.',
        },
        {
          question: '¿Se suben mis fotos?',
          answer:
            'No. El PDF se construye dentro de tu navegador; la página tiene bloqueadas las conexiones de salida. Funciona con la red desconectada.',
        },
        {
          question: '¿Se pierde calidad al pasar de JPG a PDF?',
          answer:
            'La imagen se incrusta tal cual y sólo se escala para caber en la página elegida. Si escoges «Ajustar a cada imagen» con margen cero, no se reescala nada.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'PDF a Word gratis — sin subir el archivo ni dar tu correo',
      description:
        'Extrae el texto de un PDF a un .docx editable en tu navegador. Se conservan el orden de lectura, los párrafos y los títulos; el diseño y las tablas no.',
      heading: 'Sobre esta conversión de PDF a Word',
      directAnswer:
        'Elige un PDF de hasta 150 MB y conviértelo. La capa de texto se lee dentro de la página, se reagrupa en líneas y párrafos a partir de las coordenadas de los caracteres, y se escribe en un .docx con el nombre de tu PDF. Esto recupera las palabras, no la página: es una extracción de texto, y la página lo dice encima del botón.',
      lead: 'Un PDF guarda glifos en coordenadas, no párrafos, así que el orden de lectura, la agrupación en líneas y los límites de cada párrafo hay que reconstruirlos a partir de la geometría, y esa reconstrucción es lo que obtienes. Sí pasan al documento el orden de lectura, los párrafos, los saltos de página y los títulos escritos en un cuerpo mayor. No pasan el diseño, las columnas, las tablas como tablas, las imágenes ni las tipografías, y llamar a esto una conversión en lugar de una extracción sería exagerar. Un PDF sin nada de texto — un escaneo, o una foto de un papel — se rechaza con ese nombre en lugar de devolverte un documento vacío.',
      steps: [
        {
          name: 'Elige el PDF',
          text: 'Hasta 150 MB. El archivo se abre en la memoria de la pestaña.',
        },
        {
          name: 'Convierte',
          text: 'Se lee la capa de texto y se reagrupa en líneas y párrafos según las coordenadas de los caracteres.',
        },
        {
          name: 'Descarga el .docx',
          text: 'El documento se guarda con el nombre de tu PDF y se abre en Word, LibreOffice o Google Docs.',
        },
      ],
      sections: [
        {
          heading: 'Qué sobrevive y qué no',
          body: [
            'Sobreviven: el orden de lectura, la separación en párrafos, los saltos de página y los títulos escritos en un tamaño mayor, que se marcan como encabezados.',
            'No sobreviven: el diseño de la página, las columnas, las tablas como tablas, las imágenes y las tipografías originales. Si lo que necesitas es el documento idéntico, ninguna herramienta gratuita te lo va a dar; lo que aquí se recupera son las palabras para poder editarlas.',
          ],
        },
        {
          heading: 'Si tu PDF es un escaneo',
          body: [
            'Un PDF escaneado no contiene texto, contiene una imagen de texto. Esta herramienta lo rechaza diciéndolo, en lugar de entregarte un .docx en blanco.',
            'Para ese caso usa primero el OCR de PDF, que reconoce los caracteres dentro del navegador, y después conviértelo aquí.',
          ],
        },
      ],
      faqs: [
        {
          question: '¿Se conserva el formato original?',
          answer:
            'No. Se conservan las palabras, el orden de lectura, los párrafos y los títulos. El diseño, las columnas y las tablas no: es una extracción de texto, no una reproducción de la página.',
        },
        {
          question: '¿Hay que registrarse o dar un correo?',
          answer:
            'No. No hay cuenta, ni correo, ni envío del resultado por email, porque el archivo nunca sale de tu navegador.',
        },
        {
          question: '¿Funciona con un PDF escaneado?',
          answer:
            'No directamente: un escaneo no tiene capa de texto y se rechaza indicándolo. Pásalo antes por el OCR y vuelve a intentarlo.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Comprimir imagen gratis — JPG, PNG y WebP sin subirlas',
      description:
        'Redimensiona, comprime y convierte JPEG, PNG y WebP en tu propio navegador. Tamaños reales antes y después, y modo por lotes con descarga en ZIP.',
      heading: 'Sobre este optimizador de imágenes',
      directAnswer:
        'Elige una imagen o varias, fija un ancho y un alto máximos, escoge un formato de salida y una calidad, y optimiza. La imagen se dibuja en un canvas al nuevo tamaño y la vuelve a codificar tu navegador; después los bytes guardados se decodifican otra vez para confirmar que las dimensiones salieron como estaba previsto, y el panel informa del tamaño real antes y después.',
      lead: 'Esto hace tres cosas en una sola pasada — redimensionar, recodificar y convertir — sobre JPEG, PNG y WebP de hasta 25 MB cada uno. El redimensionado sólo reduce y nunca amplía: el ancho y el alto que indiques son una caja dentro de la cual se ajusta la imagen, así que una fotografía de 4000 por 3000 limitada a 1200 por 1200 sale a 1200 por 900, y una imagen de 640 por 480 limitada a 1200 se queda en 640 por 480. WebP es el formato de salida por defecto porque suele ser el más pequeño de los tres con la misma calidad visual. La herramienta no copia los metadatos del archivo original al resultado, así que la ubicación GPS y el modelo de cámara no viajan con la imagen que publiques.',
      steps: [
        {
          name: 'Elige las imágenes',
          text: 'Una o varias, JPEG, PNG o WebP, hasta 25 MB cada una.',
        },
        {
          name: 'Fija el tamaño máximo y la calidad',
          text: 'El ancho y el alto funcionan como una caja: la imagen se ajusta dentro sin deformarse y sin ampliarse nunca.',
        },
        {
          name: 'Optimiza y descarga',
          text: 'Con una imagen obtienes el archivo; con varias, un único ZIP. El panel muestra el tamaño real antes y después de cada una.',
        },
      ],
      sections: [
        {
          heading: 'Qué formato elegir',
          body: [
            'WebP por defecto: a igualdad de calidad visual suele ser el más pequeño de los tres, y lo admiten todos los navegadores actuales.',
            'JPEG si el destino es un sistema antiguo que no acepta WebP. PNG sólo si necesitas transparencia o píxeles exactos, porque para fotografías siempre pesará más.',
          ],
        },
        {
          heading: 'Los metadatos no se copian',
          body: [
            'El resultado se escribe desde el canvas, así que los metadatos EXIF del original — coordenadas GPS, modelo de cámara, fecha — no llegan al archivo nuevo.',
            'Para publicar una foto en internet esto es lo que quieres. Si necesitabas conservar esos datos, guarda también el original antes de optimizar.',
          ],
        },
      ],
      faqs: [
        {
          question: '¿Puedo comprimir varias imágenes a la vez?',
          answer:
            'Sí. Se procesan una tras otra dentro del navegador y se te ofrecen en un único ZIP.',
        },
        {
          question: '¿Se suben mis imágenes a un servidor?',
          answer:
            'No. Se dibujan en un canvas y las recodifica tu propio navegador. La página tiene prohibidas las conexiones de salida.',
        },
        {
          question: '¿Se amplía una imagen pequeña si pongo un tamaño mayor?',
          answer:
            'No. El redimensionado sólo reduce: si la imagen ya es más pequeña que la caja que indicas, se queda como está.',
        },
      ],
    },
  },
};
