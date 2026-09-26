import type { LocaleCopy } from '../locales';

/*
  Português do Brasil. Escrito, não traduzido: os títulos usam o que realmente
  se digita — “juntar pdf”, “comprimir pdf”, “jpg para pdf”, “pdf para word”,
  “comprimir imagem” — e não a tradução do título em inglês.
*/
export const PT: LocaleCopy = {
  hub: {
    title: 'Ferramentas de PDF grátis, sem enviar arquivos',
    description:
      'Junte, comprima e converta PDFs e imagens no seu próprio navegador. Seus arquivos não saem do seu aparelho: sem conta, sem marca d’água e sem limite de downloads.',
    heading: 'Ferramentas que rodam dentro do seu navegador',
    intro:
      'Quase todos os sites de PDF enviam o seu arquivo para um servidor de terceiros, processam por lá e prometem apagar depois. Aqui não há nada para apagar: o arquivo é aberto na memória desta aba, o trabalho é feito pelo seu próprio computador e o resultado é baixado direto. Seu contrato, seu holerite ou sua declaração de imposto nunca trafegam pela rede.',
    toolsHeading: 'Ferramentas disponíveis em português',
    privacyHeading: 'Por que seus arquivos não são enviados',
    privacyBody: [
      'A página declara uma Content-Security-Policy com connect-src none, que é a instrução para o navegador proibir qualquer conexão de saída. Não é promessa de marketing: é uma regra aplicada pelo navegador, não por nós.',
      'Você pode conferir sozinho: abra as ferramentas de desenvolvedor, aba Rede, desligue a internet e use qualquer ferramenta desta lista. Tudo continua funcionando, porque não havia nada a enviar.',
    ],
    switcherLabel: 'Idioma',
    englishLinkLabel: 'English',
  },
  tools: {
    '/pdf/merge': {
      title: 'Juntar PDF grátis — sem enviar arquivo e sem cadastro',
      description:
        'Combine até 20 PDFs em um só dentro do navegador. Defina a ordem, junte, e o número de páginas é conferido antes do download. Sem upload, sem conta.',
      heading: 'Sobre esta ferramenta para juntar PDF',
      directAnswer:
        'Para combinar vários PDFs em um só: escolha os arquivos, ordene com as setas para cima e para baixo e junte. Todas as páginas de todos os arquivos são copiadas para um documento novo nessa ordem e, antes de oferecer o download, o resultado é reaberto para conferir se o número de páginas bate com a soma dos originais.',
      lead: 'Esta página junta PDFs inteiros na ordem que você definir — até 20 arquivos por vez e 150 MB no total — usando pdf-lib dentro da própria aba. Cada linha da lista mostra o número de páginas e o tamanho do arquivo, para você conferir o que vai juntar antes de juntar. O que o escopo atual cobre é o conteúdo e a ordem das páginas: marcadores, assinaturas digitais, campos de formulário, anexos e metadados do documento ainda não têm garantia de sobreviver, e a página avisa isso acima do botão. Um PDF criptografado é recusado com um aviso para você tirar a senha no seu computador primeiro, em vez de ser lido pela metade.',
      steps: [
        {
          name: 'Adicione os PDFs',
          text: 'Escolha os arquivos ou arraste até a página. Cada um é conferido pelos cinco primeiros bytes antes de qualquer leitura, então um arquivo que não é PDF é recusado na hora.',
        },
        {
          name: 'Coloque na ordem',
          text: 'Os arquivos são juntados de cima para baixo conforme a lista. Cada linha tem uma seta para adiantar, uma para atrasar e um botão para remover. Dentro de cada arquivo as páginas mantêm a ordem original.',
        },
        {
          name: 'Junte e baixe',
          text: 'A junção roda em um Web Worker para a aba continuar respondendo. Depois o resultado é lido de novo como PDF e o número de páginas é comparado com o total que entrou; o download só aparece quando os dois batem.',
        },
      ],
      sections: [
        {
          heading: 'O que é preservado e o que não é',
          body: [
            'São preservados o conteúdo de cada página e a ordem que você definiu. Um PDF é um contêiner de objetos, não uma sequência de páginas, então juntar dois documentos significa copiar objetos de um para o outro e reconstruir a árvore de páginas.',
            'Não têm garantia: marcadores, assinaturas digitais, campos de formulário preenchíveis, anexos e metadados. Se você precisa manter uma assinatura digital com validade jurídica, juntar o PDF vai invalidá-la — como em qualquer ferramenta, porque a assinatura cobre os bytes do documento original.',
          ],
        },
        {
          heading: 'Os limites, ditos com clareza',
          body: [
            'Até 20 arquivos por operação e 150 MB somando tudo. Os limites existem porque tudo acontece na memória da sua aba: não há servidor para delegar um trabalho maior, e um navegador sem memória fecha a aba em vez de avisar.',
            'Um PDF protegido por senha é recusado. Tire a senha no seu computador e tente de novo.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Meus arquivos são enviados para algum servidor?',
          answer:
            'Não. A junção é feita pelo pdf-lib dentro do seu navegador e a página declara connect-src none, então o próprio navegador bloqueia qualquer conexão de saída. Desligue a internet: a ferramenta continua funcionando.',
        },
        {
          question: 'Tem marca d’água ou limite diário?',
          answer:
            'Não tem marca d’água, nem conta, nem limite por dia. Não existe servidor cujo custo precise ser racionado, então não há o que racionar.',
        },
        {
          question: 'Dá para juntar um PDF com senha?',
          answer:
            'Não diretamente. A ferramenta recusa com um aviso em vez de ler pela metade. Remova a senha no seu computador e junte aqui depois.',
        },
      ],
    },
    '/pdf/compress': {
      title: 'Comprimir PDF grátis — sem enviar, com tamanhos reais',
      description:
        'Reduza o tamanho de um PDF no seu navegador ou deixe-o abaixo de um limite exigido. Tamanhos reais antes e depois, e o original de volta se não der para reduzir.',
      heading: 'Sobre este compressor de PDF',
      directAnswer:
        'Para reduzir um PDF no navegador: escolha o arquivo, decida se quer recodificar as fotos que ele contém e execute. O documento é reescrito com fluxos de objetos, os JPEGs elegíveis são recodificados opcionalmente na qualidade e na borda máxima que você escolher, e os tamanhos reais antes e depois são informados.',
      lead: 'São duas passagens aqui, e as duas são medidas em vez de estimadas. A primeira é sem perda: o arquivo é reescrito com fluxos de objetos, e título, autor, assunto, palavras-chave, produtor e criador podem ser limpos. Nada do que se vê na página muda. A segunda é opcional e é onde costuma estar o peso: os JPEGs embutidos são decodificados e recodificados pelo próprio canvas do navegador, com qualidade entre 40 e 95 por cento, e reduzidos antes se a borda mais longa passar do limite escolhido. Se o resultado ficar maior que o original, o original é devolvido a você: uma ferramenta que entrega um arquivo maior e chama isso de compressão está mentindo.',
      steps: [
        {
          name: 'Escolha o PDF',
          text: 'Arraste até a página ou selecione. O arquivo é aberto na memória e o tamanho atual é exibido.',
        },
        {
          name: 'Decida o que aceita perder',
          text: 'A passagem sem perda não muda nada visível. Se ativar também a recodificação das imagens, escolha a qualidade e a borda máxima: é ali que se consegue a redução grande e também onde se perde detalhe.',
        },
        {
          name: 'Compare os tamanhos reais',
          text: 'O painel informa o tamanho antes e depois, medidos sobre os bytes salvos e não estimados. Baixe só se o resultado convencer.',
        },
      ],
      sections: [
        {
          heading: 'Por que alguns PDFs não comprimem',
          body: [
            'Um PDF já otimizado, ou só de texto, quase não tem margem: o peso de um PDF costuma estar nas imagens embutidas, e sem imagens não há nada grande para recodificar.',
            'Nesse caso a ferramenta devolve o original em vez de entregar um arquivo um pouco maior com outro nome. É a resposta honesta, e é a que muitos sites de compressão não dão.',
          ],
        },
        {
          heading: 'Ficar abaixo de um limite exigido',
          body: [
            'Quando um portal recusa seu documento por passar de um tamanho máximo, o que você precisa não é “menor”, é “abaixo deste número”. O modo de ajuste percorre qualidades e tamanhos e decide pelos bytes medidos, não por estimativa.',
            'Se nem a qualidade mínima conseguir ficar abaixo do limite, a ferramenta avisa, em vez de entregar um arquivo que o portal vai recusar de novo.',
          ],
        },
      ],
      faqs: [
        {
          question: 'A compressão piora a qualidade do PDF?',
          answer:
            'A primeira passagem não: ela reescreve a estrutura do arquivo e não mexe no que aparece. A segunda sim, porque recodifica as imagens embutidas — você escolhe a qualidade, entre 40 e 95 por cento.',
        },
        {
          question: 'Meu documento é enviado para comprimir?',
          answer:
            'Não. A compressão acontece dentro da aba e a página tem conexões de saída proibidas por connect-src none. Confira desligando a internet.',
        },
        {
          question: 'Por que o arquivo ficou do mesmo tamanho?',
          answer:
            'Porque já estava otimizado ou porque é quase todo texto. Nesse caso o original é devolvido sem alteração.',
        },
      ],
    },
    '/pdf/images-to-pdf': {
      title: 'JPG para PDF grátis — converter imagens sem enviar',
      description:
        'Transforme imagens JPEG e PNG em um único PDF no navegador. Até 40 imagens, páginas A4, Carta ou ajustadas à imagem, e quatro tamanhos de margem.',
      heading: 'Sobre este conversor de imagem para PDF',
      directAnswer:
        'Para transformar imagens JPEG ou PNG em um único PDF: escolha as imagens, ordene com as setas, escolha o tamanho da página e a margem e gere. Cada imagem vira uma página, centralizada e redimensionada para caber dentro das margens mantendo as proporções.',
      lead: 'Somente JPEG e PNG, até 40 imagens e 100 MB no total, uma página por imagem na ordem mostrada. Os tamanhos fixos são A4 (595,28 × 841,89 pontos) e Carta dos EUA (612 × 792), com a orientação ajustada a cada imagem ou forçada em retrato ou paisagem. A opção “Ajustar a cada imagem” faz cada página ter exatamente o tamanho da sua imagem mais a margem, e nunca amplia a imagem. As margens são nenhuma, pequena, média ou grande: 0, 12, 24 ou 36 pontos. Cada arquivo é conferido contra o tipo declarado pela própria assinatura binária, então um arquivo só renomeado para .jpg é recusado em vez de quebrar o documento no meio da geração.',
      steps: [
        {
          name: 'Adicione as imagens',
          text: 'Selecione ou arraste os JPEG e PNG. Cada arquivo é conferido pela assinatura binária, não pela extensão.',
        },
        {
          name: 'Ordene e escolha a página',
          text: 'As setas mudam a ordem. Escolha A4, Carta ou o ajuste a cada imagem, a orientação e uma das quatro margens.',
        },
        {
          name: 'Gere e baixe',
          text: 'O PDF é montado na aba e baixado direto. Nenhuma imagem é enviada a lugar nenhum.',
        },
      ],
      sections: [
        {
          heading: 'Qual tamanho de página escolher',
          body: [
            'A4 ou Carta se o documento vai ser impresso ou enviado a um portal que espera um tamanho padrão. A imagem é centralizada e redimensionada para caber dentro das margens, mantendo as proporções.',
            '“Ajustar a cada imagem” se você quer um PDF sem bordas brancas: cada página fica do tamanho da sua imagem mais a margem. Uma imagem pequena nunca é ampliada, porque ampliar só acrescentaria pixels inventados.',
          ],
        },
        {
          heading: 'Os limites',
          body: [
            'Até 40 imagens e 100 MB no total, porque tudo é montado na memória da aba. Só JPEG e PNG: os formatos que o canvas do navegador decodifica de forma confiável em todo lugar.',
            'Para HEIC de iPhone, passe antes pela ferramenta de HEIC para JPG e volte aqui.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Posso juntar várias fotos em um PDF só?',
          answer:
            'Sim, até 40 por operação. Cada imagem vira uma página e a ordem é você quem define com as setas.',
        },
        {
          question: 'Minhas fotos são enviadas?',
          answer:
            'Não. O PDF é montado dentro do seu navegador e as conexões de saída estão bloqueadas para a página. Funciona com a internet desligada.',
        },
        {
          question: 'Perde qualidade ao passar de JPG para PDF?',
          answer:
            'A imagem é embutida como está e só é redimensionada para caber na página escolhida. Com “Ajustar a cada imagem” e margem zero, nada é redimensionado.',
        },
      ],
    },
    '/pdf/to-word': {
      title: 'PDF para Word grátis — sem enviar arquivo e sem e-mail',
      description:
        'Extraia o texto de um PDF para um .docx editável no seu navegador. Ordem de leitura, parágrafos, quebras de página e títulos são mantidos; layout e tabelas não.',
      heading: 'Sobre esta conversão de PDF para Word',
      directAnswer:
        'Escolha um PDF de até 150 MB e converta. A camada de texto é lida dentro da página, reagrupada em linhas e parágrafos a partir das coordenadas dos caracteres, e escrita em um .docx com o nome do seu PDF. Isso recupera as palavras, não a página: é uma extração de texto, e a página diz isso acima do botão.',
      lead: 'Um PDF guarda glifos em coordenadas, não parágrafos, então a ordem de leitura, o agrupamento em linhas e os limites de parágrafo precisam ser reconstruídos a partir da geometria — e essa reconstrução é o que você recebe. Passam: a ordem de leitura, os parágrafos, as quebras de página e os títulos escritos em corpo maior. Não passam: layout, colunas, tabelas como tabelas, imagens e fontes; chamar o resultado de conversão em vez de extração seria exagero. Um PDF sem texto nenhum — um escaneamento, ou a foto de um papel — é recusado com esse nome, em vez de devolver um documento vazio.',
      steps: [
        {
          name: 'Escolha o PDF',
          text: 'Até 150 MB. O arquivo é aberto na memória da aba.',
        },
        {
          name: 'Converta',
          text: 'A camada de texto é lida e reagrupada em linhas e parágrafos conforme as coordenadas dos caracteres.',
        },
        {
          name: 'Baixe o .docx',
          text: 'O documento sai com o nome do seu PDF e abre no Word, no LibreOffice ou no Google Docs.',
        },
      ],
      sections: [
        {
          heading: 'O que sobrevive e o que não sobrevive',
          body: [
            'Sobrevivem: a ordem de leitura, a separação em parágrafos, as quebras de página e os títulos em corpo maior, marcados como estilo de título.',
            'Não sobrevivem: o layout da página, as colunas, as tabelas como tabelas, as imagens e as fontes originais. Se você precisa do documento idêntico, nenhuma ferramenta gratuita vai entregar isso; aqui o que se recupera são as palavras, para poder editar.',
          ],
        },
        {
          heading: 'Se o seu PDF for um escaneamento',
          body: [
            'Um PDF escaneado não contém texto, contém uma imagem de texto. A ferramenta recusa dizendo isso, em vez de entregar um .docx em branco.',
            'Para esse caso use primeiro o OCR de PDF, que reconhece os caracteres dentro do navegador, e depois converta aqui.',
          ],
        },
      ],
      faqs: [
        {
          question: 'A formatação original é mantida?',
          answer:
            'Não. São mantidas as palavras, a ordem de leitura, os parágrafos e os títulos. Layout, colunas e tabelas não: é extração de texto, não reprodução da página.',
        },
        {
          question: 'Precisa criar conta ou informar e-mail?',
          answer:
            'Não. Sem conta, sem e-mail e sem envio do resultado por e-mail, porque o arquivo nunca sai do seu navegador.',
        },
        {
          question: 'Funciona com PDF escaneado?',
          answer:
            'Não diretamente: um escaneamento não tem camada de texto e é recusado com esse aviso. Passe antes pelo OCR e tente de novo.',
        },
      ],
    },
    '/image/optimize': {
      title: 'Comprimir imagem grátis — JPG, PNG e WebP sem enviar',
      description:
        'Redimensione, comprima e converta JPEG, PNG e WebP no seu navegador. Tamanhos reais antes e depois, e modo em lote com download em ZIP.',
      heading: 'Sobre este otimizador de imagens',
      directAnswer:
        'Escolha uma imagem ou várias, defina largura e altura máximas, escolha um formato de saída e uma qualidade, e otimize. A imagem é desenhada em um canvas no novo tamanho e recodificada pelo seu navegador; depois os bytes salvos são decodificados de novo para confirmar as dimensões, e o painel informa os tamanhos reais antes e depois.',
      lead: 'São três coisas em uma passagem só — redimensionar, recodificar e converter — em JPEG, PNG e WebP de até 25 MB cada. O redimensionamento só reduz e nunca amplia: a largura e a altura que você informa são uma caixa onde a imagem é encaixada, então uma foto de 4000 por 3000 limitada a 1200 por 1200 sai em 1200 por 900, e uma imagem de 640 por 480 limitada a 1200 continua 640 por 480. O WebP é o formato de saída padrão porque costuma ser o menor dos três com a mesma qualidade visual. A ferramenta não copia os metadados do arquivo original para o resultado, então a localização de GPS e o modelo da câmera não viajam com a imagem que você publicar.',
      steps: [
        {
          name: 'Escolha as imagens',
          text: 'Uma ou várias, em JPEG, PNG ou WebP, até 25 MB cada.',
        },
        {
          name: 'Defina o tamanho máximo e a qualidade',
          text: 'Largura e altura funcionam como uma caixa: a imagem é encaixada sem distorção e nunca ampliada.',
        },
        {
          name: 'Otimize e baixe',
          text: 'Com uma imagem você recebe o arquivo; com várias, um único ZIP. O painel mostra o tamanho real antes e depois de cada uma.',
        },
      ],
      sections: [
        {
          heading: 'Qual formato escolher',
          body: [
            'WebP por padrão: com a mesma qualidade visual costuma ser o menor dos três, e todos os navegadores atuais leem.',
            'JPEG se o destino for um sistema antigo que não aceita WebP. PNG só se você precisar de transparência ou pixels exatos, porque para fotografia sempre vai pesar mais.',
          ],
        },
        {
          heading: 'Os metadados não são copiados',
          body: [
            'O resultado é escrito a partir do canvas, então os metadados EXIF do original — coordenadas de GPS, modelo da câmera, data — não chegam ao arquivo novo.',
            'Para publicar uma foto na internet é exatamente o que se quer. Se você precisava guardar esses dados, salve também o original antes de otimizar.',
          ],
        },
      ],
      faqs: [
        {
          question: 'Posso comprimir várias imagens de uma vez?',
          answer:
            'Sim. Elas são processadas uma após a outra dentro do navegador e entregues em um único ZIP.',
        },
        {
          question: 'Minhas imagens vão para um servidor?',
          answer:
            'Não. Elas são desenhadas em um canvas e recodificadas pelo seu próprio navegador, e as conexões de saída estão proibidas para a página.',
        },
        {
          question:
            'Uma imagem pequena é ampliada se eu colocar um tamanho maior?',
          answer:
            'Não. O redimensionamento só reduz: se a imagem já é menor que a caixa informada, ela fica como está.',
        },
      ],
    },
  },
};
