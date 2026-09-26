import type { LocaleCopy } from '../locales';

/*
  Français. Rédigé, pas traduit : les titres reprennent les requêtes réellement
  tapées — « fusionner pdf », « compresser pdf », « jpg en pdf », « pdf en
  word », « compresser image » — et non la traduction du titre anglais.
*/
export const FR: LocaleCopy = {
  hub: {
    title: 'Outils PDF gratuits, sans envoi de fichier',
    description:
      'Fusionnez, compressez et convertissez vos PDF et vos images dans votre navigateur. Vos fichiers ne quittent pas votre appareil : sans compte, sans filigrane.',
    heading: 'Des outils qui tournent dans votre navigateur',
    intro:
      'La plupart des sites de PDF envoient votre fichier sur un serveur, le traitent là-bas et promettent de le supprimer ensuite. Ici il n’y a rien à supprimer : le fichier est ouvert en mémoire dans cet onglet, le calcul est fait par votre propre machine et le résultat est téléchargé directement. Votre contrat, votre bulletin de paie ou votre avis d’imposition ne transitent jamais par le réseau.',
    toolsHeading: 'Outils disponibles en français',
    privacyHeading: 'Pourquoi vos fichiers ne sont pas envoyés',
    privacyBody: [
      'La page déclare une Content-Security-Policy avec connect-src none, c’est-à-dire l’instruction qui interdit au navigateur toute connexion sortante. Ce n’est pas une promesse commerciale : c’est une règle appliquée par le navigateur, pas par nous.',
      'Vous pouvez le vérifier vous-même : ouvrez les outils de développement, onglet Réseau, coupez votre connexion, puis utilisez n’importe quel outil de cette liste. Tout continue de fonctionner, parce qu’il n’y avait rien à envoyer.',
    ],
    switcherLabel: 'Langue',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'Fusionner PDF gratuitement — sans envoi ni inscription',
      description:
        'Combinez jusqu’à 20 PDF en un seul dans votre navigateur. Choisissez l’ordre, fusionnez : le nombre de pages est vérifié avant le téléchargement.',
      heading: 'À propos de cet outil de fusion PDF',
      directAnswer:
        'Pour réunir plusieurs PDF en un seul : choisissez les fichiers, ordonnez-les avec les flèches haut et bas, puis lancez la fusion. Toutes les pages de tous les fichiers sont copiées dans un nouveau document dans cet ordre, et avant de proposer le téléchargement le résultat est rouvert pour vérifier que son nombre de pages correspond bien au total des fichiers d’entrée.',
      lead: 'Cette page assemble des PDF entiers dans l’ordre que vous fixez — jusqu’à 20 fichiers à la fois et 150 Mo au total — à l’aide de pdf-lib, dans l’onglet lui-même. Chaque ligne de la liste affiche le nombre de pages et la taille du fichier, pour que vous puissiez vérifier ce que vous assemblez avant de l’assembler. Ce que couvre le périmètre actuel, c’est le contenu et l’ordre des pages : les signets, les signatures numériques, les champs de formulaire, les pièces jointes et les métadonnées du document ne sont pas encore garantis, et la page le dit au-dessus du bouton. Un PDF chiffré est refusé avec un message vous invitant à retirer son mot de passe sur votre poste, plutôt que d’être lu à moitié.',
      steps: [
        {
          name: 'Ajoutez les PDF',
          text: 'Sélectionnez les fichiers ou déposez-les sur la page. Chacun est vérifié sur ses cinq premiers octets avant toute analyse : un fichier qui n’est pas un PDF est refusé immédiatement.',
        },
        {
          name: 'Mettez-les dans l’ordre',
          text: 'Les fichiers sont assemblés de haut en bas selon la liste. Chaque ligne a une flèche pour avancer le fichier, une pour le reculer et un bouton pour le retirer. À l’intérieur d’un fichier, les pages gardent leur ordre.',
        },
        {
          name: 'Fusionnez, puis téléchargez',
          text: 'La fusion s’exécute dans un Web Worker pour que l’onglet reste réactif. Le résultat est ensuite relu comme PDF et son nombre de pages comparé au total entrant ; le téléchargement n’est proposé que si les deux concordent.',
        },
      ],
      sections: [
        {
          heading: 'Ce qui est conservé, et ce qui ne l’est pas',
          body: [
            'Sont conservés le contenu de chaque page et l’ordre que vous avez fixé. Un PDF est un conteneur d’objets et non une suite de pages : fusionner deux documents, c’est copier des objets de l’un vers l’autre et reconstruire l’arbre des pages.',
            'Ne sont pas garantis : les signets, les signatures numériques, les champs de formulaire, les pièces jointes et les métadonnées. Si vous devez conserver une signature électronique valable juridiquement, la fusion l’invalidera — comme avec n’importe quel outil, puisque la signature porte sur les octets du document d’origine.',
          ],
        },
        {
          heading: 'Les limites, dites clairement',
          body: [
            'Jusqu’à 20 fichiers par opération et 150 Mo au total. Ces limites existent parce que tout se passe dans la mémoire de votre onglet : il n’y a pas de serveur à qui déléguer un travail plus lourd, et un navigateur à court de mémoire ferme l’onglet au lieu de prévenir.',
            'Un PDF protégé par mot de passe est refusé. Retirez le mot de passe sur votre poste, puis recommencez.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Mes fichiers sont-ils envoyés sur un serveur ?',
          answer:
            'Non. La fusion est faite par pdf-lib dans votre navigateur et la page déclare connect-src none, ce qui bloque toute connexion sortante côté navigateur. Coupez le réseau : l’outil fonctionne toujours.',
        },
        {
          question: 'Y a-t-il un filigrane ou une limite quotidienne ?',
          answer:
            'Ni filigrane, ni compte, ni limite par jour. Il n’y a pas de serveur dont il faudrait rationner le coût, donc rien à rationner.',
        },
        {
          question: 'Puis-je fusionner un PDF protégé par mot de passe ?',
          answer:
            'Pas directement : l’outil le refuse explicitement plutôt que de le lire à moitié. Retirez le mot de passe sur votre machine, puis fusionnez ici.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'Compresser PDF gratuitement — sans envoi, tailles réelles',
      description:
        'Réduisez la taille d’un PDF dans votre navigateur, ou passez sous un plafond imposé. Tailles réelles avant et après, et votre original rendu si rien n’y fait.',
      heading: 'À propos de ce compresseur PDF',
      directAnswer:
        'Pour réduire un PDF dans le navigateur : choisissez le fichier, décidez si les photos qu’il contient doivent être ré-encodées, puis lancez. Le document est réécrit avec des flux d’objets, les JPEG éligibles sont éventuellement ré-encodés à la qualité et au bord maximal que vous choisissez, et les tailles réelles avant et après sont affichées.',
      lead: 'Il y a ici deux passes, et les deux sont mesurées plutôt qu’estimées. La première est sans perte : le fichier est réécrit avec des flux d’objets, et le titre, l’auteur, le sujet, les mots-clés, le producteur et le créateur peuvent être effacés. Rien de visible ne change sur la page. La seconde est facultative, et c’est là que se trouve généralement le poids : les JPEG intégrés sont décodés puis ré-encodés par le canvas du navigateur, à une qualité comprise entre 40 et 95 pour cent, et réduits au préalable si leur plus grand côté dépasse la limite choisie. Si le résultat est plus lourd que l’original, c’est l’original qui vous est rendu : un outil qui renvoie un fichier plus gros en l’appelant « compression » vous ment.',
      steps: [
        {
          name: 'Choisissez le PDF',
          text: 'Déposez-le sur la page ou sélectionnez-le. Le fichier est ouvert en mémoire et sa taille actuelle affichée.',
        },
        {
          name: 'Décidez de ce que vous acceptez de perdre',
          text: 'La passe sans perte ne change rien de visible. Si vous activez en plus le ré-encodage des images, réglez la qualité et le bord maximal : c’est là que se gagne la réduction importante, et aussi là que se perd du détail.',
        },
        {
          name: 'Comparez les tailles réelles',
          text: 'Le panneau affiche la taille avant et après, mesurées sur les octets enregistrés et non estimées à l’avance. Téléchargez seulement si le résultat vous convient.',
        },
      ],
      sections: [
        {
          heading: 'Pourquoi certains PDF ne se compressent pas',
          body: [
            'Un PDF déjà optimisé, ou composé uniquement de texte, n’offre presque aucune marge : le poids d’un PDF vient le plus souvent des images intégrées, et sans images il n’y a rien de lourd à ré-encoder.',
            'Dans ce cas l’outil vous rend l’original plutôt qu’un fichier à peine plus gros sous un autre nom. C’est la réponse honnête, et c’est celle que beaucoup de sites de compression ne donnent pas.',
          ],
        },
        {
          heading: 'Passer sous un plafond imposé',
          body: [
            'Quand un téléservice refuse votre document parce qu’il dépasse une taille maximale, ce qu’il vous faut n’est pas « plus petit » mais « sous ce nombre précis ». Le mode d’ajustement parcourt les qualités et les tailles et tranche sur les octets mesurés, pas sur une estimation.',
            'Si même la qualité minimale ne suffit pas à passer sous le plafond, il vous le dit, au lieu de vous remettre un fichier que le téléservice refusera de nouveau.',
          ],
        },
      ],
      faqs: [
        {
          question: 'La compression dégrade-t-elle le PDF ?',
          answer:
            'Pas la première passe : elle réécrit la structure du fichier sans toucher au rendu. La seconde si, puisqu’elle ré-encode les images intégrées — vous choisissez la qualité, entre 40 et 95 pour cent.',
        },
        {
          question: 'Mon document est-il envoyé quelque part ?',
          answer:
            'Non. La compression a lieu dans l’onglet, et les connexions sortantes sont interdites à la page par connect-src none. Vérifiez-le en coupant votre connexion.',
        },
        {
          question: 'Pourquoi le fichier fait-il la même taille qu’avant ?',
          answer:
            'Parce qu’il était déjà optimisé, ou parce qu’il est presque entièrement composé de texte. Dans ce cas l’original vous est rendu tel quel.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'JPG en PDF gratuitement — convertir des images sans envoi',
      description:
        'Transformez des images JPEG et PNG en un seul PDF dans votre navigateur. Jusqu’à 40 images, pages A4, Letter ou ajustées à l’image, et quatre tailles de marge.',
      heading: 'À propos de ce convertisseur image vers PDF',
      directAnswer:
        'Pour transformer des images JPEG ou PNG en un seul PDF : choisissez les images, ordonnez-les avec les flèches, sélectionnez un format de page et une marge, puis générez. Chaque image devient une page, centrée et mise à l’échelle pour tenir dans les marges en conservant ses proportions.',
      lead: 'JPEG et PNG uniquement, jusqu’à 40 images et 100 Mo au total, une page par image dans l’ordre affiché. Les formats fixes sont A4 (595,28 × 841,89 points) et US Letter (612 × 792), avec une orientation adaptée à chaque image ou forcée en portrait ou paysage. L’option « Ajuster à chaque image » donne à chaque page exactement la taille de son image plus la marge, et n’agrandit jamais l’image. Les marges sont nulle, petite, moyenne ou grande : 0, 12, 24 ou 36 points. Chaque fichier est vérifié par sa propre signature binaire, si bien qu’un fichier simplement renommé en .jpg est refusé au lieu de casser le document en cours de génération.',
      steps: [
        {
          name: 'Ajoutez les images',
          text: 'Sélectionnez ou déposez vos JPEG et PNG. Chaque fichier est contrôlé par sa signature binaire, pas par son extension.',
        },
        {
          name: 'Ordonnez et réglez la page',
          text: 'Les flèches changent l’ordre. Choisissez A4, Letter ou l’ajustement à chaque image, l’orientation et l’une des quatre marges.',
        },
        {
          name: 'Générez et téléchargez',
          text: 'Le PDF est construit dans l’onglet et téléchargé directement. Aucune image n’est envoyée nulle part.',
        },
      ],
      sections: [
        {
          heading: 'Quel format de page choisir',
          body: [
            'A4 ou Letter si le document doit être imprimé ou déposé sur un téléservice qui attend un format standard. L’image est centrée et mise à l’échelle pour tenir dans les marges, proportions conservées.',
            '« Ajuster à chaque image » si vous voulez un PDF sans bandes blanches : chaque page fait la taille de son image plus la marge. Une petite image n’est jamais agrandie, car l’agrandir n’ajouterait que des pixels inventés.',
          ],
        },
        {
          heading: 'Les limites',
          body: [
            'Jusqu’à 40 images et 100 Mo au total, parce que tout est construit dans la mémoire de l’onglet. JPEG et PNG seulement : les formats que le canvas du navigateur décode de façon fiable partout.',
            'Pour des HEIC d’iPhone, passez-les d’abord par l’outil HEIC vers JPG, puis revenez ici.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Puis-je réunir plusieurs photos dans un seul PDF ?',
          answer:
            'Oui, jusqu’à 40 par opération. Chaque image devient une page et vous fixez l’ordre avec les flèches.',
        },
        {
          question: 'Mes photos sont-elles envoyées ?',
          answer:
            'Non. Le PDF est construit dans votre navigateur et les connexions sortantes sont bloquées pour la page. Cela fonctionne réseau coupé.',
        },
        {
          question: 'Y a-t-il une perte de qualité entre JPG et PDF ?',
          answer:
            'L’image est intégrée telle quelle et seulement mise à l’échelle pour tenir dans la page choisie. Avec « Ajuster à chaque image » et une marge nulle, rien n’est redimensionné.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'PDF en Word gratuitement — sans envoi ni adresse e-mail',
      description:
        'Extrayez le texte d’un PDF vers un .docx modifiable dans votre navigateur. L’ordre de lecture, les paragraphes et les titres sont conservés ; pas la mise en page.',
      heading: 'À propos de cette conversion PDF vers Word',
      directAnswer:
        'Choisissez un PDF de 150 Mo maximum et convertissez-le. La couche de texte est lue dans la page, regroupée en lignes et en paragraphes à partir des coordonnées des caractères, puis écrite dans un .docx portant le nom de votre PDF. Cela récupère les mots, pas la page : c’est une extraction de texte, et la page le dit au-dessus du bouton.',
      lead: 'Un PDF stocke des glyphes à des coordonnées, pas des paragraphes : l’ordre de lecture, le regroupement en lignes et les limites de paragraphe doivent donc être reconstruits à partir de la géométrie, et c’est cette reconstruction que vous obtenez. Passent bien : l’ordre de lecture, les paragraphes, les sauts de page et les titres composés dans un corps plus grand. Ne passent pas : la mise en page, les colonnes, les tableaux en tant que tableaux, les images et les polices — parler de conversion plutôt que d’extraction serait exagéré. Un PDF sans aucun texte — un scan, ou la photo d’une feuille — est refusé en le disant, plutôt que de vous rendre un document vide.',
      steps: [
        {
          name: 'Choisissez le PDF',
          text: 'Jusqu’à 150 Mo. Le fichier est ouvert dans la mémoire de l’onglet.',
        },
        {
          name: 'Convertissez',
          text: 'La couche de texte est lue et regroupée en lignes et en paragraphes d’après les coordonnées des caractères.',
        },
        {
          name: 'Téléchargez le .docx',
          text: 'Le document reprend le nom de votre PDF et s’ouvre dans Word, LibreOffice ou Google Docs.',
        },
      ],
      sections: [
        {
          heading: 'Ce qui survit et ce qui ne survit pas',
          body: [
            'Survivent : l’ordre de lecture, la séparation en paragraphes, les sauts de page et les titres composés plus grand, marqués comme styles de titre.',
            'Ne survivent pas : la mise en page, les colonnes, les tableaux en tant que tableaux, les images et les polices d’origine. S’il vous faut le document à l’identique, aucun outil gratuit ne vous le donnera ; ce qui est récupéré ici, ce sont les mots, pour pouvoir les modifier.',
          ],
        },
        {
          heading: 'Si votre PDF est un scan',
          body: [
            'Un PDF scanné ne contient pas de texte mais une image de texte. L’outil le refuse en le disant, au lieu de vous remettre un .docx vide.',
            'Dans ce cas, passez d’abord par l’OCR PDF, qui reconnaît les caractères dans le navigateur, puis revenez convertir ici.',
          ],
        },
      ],
      faqs: [
        {
          question: 'La mise en page d’origine est-elle conservée ?',
          answer:
            'Non. Sont conservés les mots, l’ordre de lecture, les paragraphes et les titres. La mise en page, les colonnes et les tableaux non : c’est une extraction de texte, pas une reproduction de la page.',
        },
        {
          question: 'Faut-il créer un compte ou donner une adresse e-mail ?',
          answer:
            'Non. Ni compte, ni e-mail, ni envoi du résultat par courriel : le fichier ne quitte jamais votre navigateur.',
        },
        {
          question: 'Cela fonctionne-t-il avec un PDF scanné ?',
          answer:
            'Pas directement : un scan n’a pas de couche de texte et il est refusé explicitement. Passez-le d’abord par l’OCR, puis réessayez.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Compresser une image — JPG, PNG et WebP sans envoi',
      description:
        'Redimensionnez, compressez et convertissez JPEG, PNG et WebP dans votre navigateur. Tailles réelles avant et après, et mode par lot avec téléchargement en ZIP.',
      heading: 'À propos de cet optimiseur d’images',
      directAnswer:
        'Choisissez une ou plusieurs images, fixez une largeur et une hauteur maximales, sélectionnez un format de sortie et une qualité, puis optimisez. L’image est dessinée sur un canvas à la nouvelle taille et ré-encodée par votre navigateur ; les octets enregistrés sont ensuite redécodés pour confirmer les dimensions obtenues, et le panneau affiche les tailles réelles avant et après.',
      lead: 'Trois opérations en une seule passe — redimensionner, ré-encoder, convertir — sur des JPEG, PNG et WebP de 25 Mo maximum chacun. Le redimensionnement ne fait que réduire et n’agrandit jamais : la largeur et la hauteur indiquées forment une boîte dans laquelle l’image est inscrite, si bien qu’une photo de 4000 par 3000 limitée à 1200 par 1200 ressort en 1200 par 900, et qu’une image de 640 par 480 limitée à 1200 reste en 640 par 480. WebP est le format de sortie par défaut parce qu’il est généralement le plus léger des trois à qualité visuelle égale. L’outil ne recopie pas les métadonnées du fichier d’origine dans le résultat : la position GPS et le modèle d’appareil ne suivent donc pas l’image que vous publiez.',
      steps: [
        {
          name: 'Choisissez les images',
          text: 'Une ou plusieurs, en JPEG, PNG ou WebP, jusqu’à 25 Mo chacune.',
        },
        {
          name: 'Fixez la taille maximale et la qualité',
          text: 'La largeur et la hauteur forment une boîte : l’image s’y inscrit sans déformation et sans jamais être agrandie.',
        },
        {
          name: 'Optimisez et téléchargez',
          text: 'Une image donne un fichier ; plusieurs donnent un seul ZIP. Le panneau affiche la taille réelle avant et après pour chacune.',
        },
      ],
      sections: [
        {
          heading: 'Quel format choisir',
          body: [
            'WebP par défaut : à qualité visuelle égale, c’est en général le plus léger des trois, et tous les navigateurs actuels le lisent.',
            'JPEG si la destination est un système ancien qui n’accepte pas le WebP. PNG seulement si vous avez besoin de transparence ou de pixels exacts, car pour une photo il sera toujours plus lourd.',
          ],
        },
        {
          heading: 'Les métadonnées ne sont pas recopiées',
          body: [
            'Le résultat est écrit depuis le canvas : les métadonnées EXIF de l’original — coordonnées GPS, modèle d’appareil, date — ne se retrouvent pas dans le nouveau fichier.',
            'Pour publier une photo en ligne, c’est exactement ce que vous voulez. Si vous teniez à ces données, conservez aussi l’original avant d’optimiser.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Puis-je compresser plusieurs images à la fois ?',
          answer:
            'Oui. Elles sont traitées l’une après l’autre dans le navigateur et vous sont remises dans un seul ZIP.',
        },
        {
          question: 'Mes images sont-elles envoyées sur un serveur ?',
          answer:
            'Non. Elles sont dessinées sur un canvas et ré-encodées par votre propre navigateur, et les connexions sortantes sont interdites à la page.',
        },
        {
          question:
            'Une petite image est-elle agrandie si je mets une taille supérieure ?',
          answer:
            'Non. Le redimensionnement ne fait que réduire : si l’image est déjà plus petite que la boîte indiquée, elle reste telle quelle.',
        },
      ],
    },
  },
};
