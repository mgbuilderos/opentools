/**
 * Accurate LaTeX word count engine modelled after TeXcount.
 *
 * Separates prose body words, header words, caption words, and math elements.
 * Strips comments, preambles, and citation keys so numbers reflect real text.
 */

export interface LatexSectionCount {
  title: string;
  level: number;
  bodyWords: number;
  headerWords: number;
}

export interface LatexWordCountResult {
  totalWords: number;
  bodyWords: number;
  headerWords: number;
  captionWords: number;
  mathElements: number;
  charCount: number;
  charCountWithSpaces: number;
  sections: LatexSectionCount[];
}

/**
 * Counts words in a plain string by whitespace splitting after trimming punctuation.
 */
function countWordsInText(text: string): number {
  const words = text
    .replace(/[^\w\s-]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter((w) => w.length > 0 && !/^[\d.,;:!?()-]+$/u.test(w));
  return words.length;
}

/**
 * Counts characters excluding and including whitespace.
 */
function countChars(text: string): { chars: number; charsWithSpaces: number } {
  return {
    chars: text.replace(/\s/gu, '').length,
    charsWithSpaces: text.length,
  };
}

/**
 * Runs word count analysis over a LaTeX document string.
 */
export function countLatexWords(input: string): LatexWordCountResult {
  if (!input || !input.trim()) {
    return {
      totalWords: 0,
      bodyWords: 0,
      headerWords: 0,
      captionWords: 0,
      mathElements: 0,
      charCount: 0,
      charCountWithSpaces: 0,
      sections: [],
    };
  }

  // 1. Strip comments (% to end of line, preserving escaped \%)
  let text = input.replace(/(?<!\\)%.*$/gmu, '');

  // 2. Strip preamble if document environment exists
  const beginDocMatch = /\\begin\{document\}/u.exec(text);
  if (beginDocMatch) {
    text = text.slice(beginDocMatch.index + beginDocMatch[0].length);
  }
  const endDocMatch = /\\end\{document\}/u.exec(text);
  if (endDocMatch) {
    text = text.slice(0, endDocMatch.index);
  }

  // 3. Count & extract display math environments
  let mathElements = 0;
  const displayMathRegex =
    /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(?:equation|align|gather|flalign|multline|alignat)\*?\}[\s\S]*?\\end\{(?:equation|align|gather|flalign|multline|alignat)\*?\})/gu;

  text = text.replace(displayMathRegex, () => {
    mathElements++;
    return ' ';
  });

  // 4. Count & extract inline math ($...$ or \(...\))
  const inlineMathRegex = /(\$[^$\n]+\$|\\\(.*?\\\))/gu;
  text = text.replace(inlineMathRegex, () => {
    mathElements++;
    return ' ';
  });

  // 5. Extract and count captions
  let captionWords = 0;
  const captionRegex =
    /\\caption(?:\[[^\]]*\])?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gu;
  text = text.replace(captionRegex, (_, capText: string) => {
    captionWords += countWordsInText(capText);
    return ' ';
  });

  // 6. Extract section headers
  const sections: LatexSectionCount[] = [];
  let headerWords = 0;
  const headerRegex =
    /\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gu;

  text = text.replace(
    headerRegex,
    (_, levelName: string, titleText: string) => {
      const levelMap: Record<string, number> = {
        part: 0,
        chapter: 1,
        section: 2,
        subsection: 3,
        subsubsection: 4,
        paragraph: 5,
      };
      const words = countWordsInText(titleText);
      headerWords += words;
      sections.push({
        title: titleText.trim(),
        level: levelMap[levelName] ?? 2,
        bodyWords: 0,
        headerWords: words,
      });
      return ' ';
    },
  );

  // 7. Strip citations, references, and labels (do not count bib keys or label names as words)
  text = text.replace(
    /\\(?:cite|citep|citet|nocite|ref|eqref|pageref|autoref|nameref|label|url|href)\*?(?:\[[^\]]*\])*\{[^{}]*\}/gu,
    ' ',
  );

  // 8. Strip structural environments & tables code (content inside tabular is parsed or counted, but table markup commands stripped)
  text = text.replace(
    /\\(?:begin|end)\{(?:figure|table|center|flushleft|flushright|minipage|abstract|appendices)\*?(?:\[[^\]]*\])*/gu,
    ' ',
  );

  // 9. Unwrap text styling commands (e.g. \textbf{hello world} -> hello world)
  for (let i = 0; i < 4; i++) {
    text = text.replace(
      /\\(?:textbf|textit|emph|text|underline|textsc|textsl|textsf|texttt|textrm)\{([^{}]*)\}/gu,
      '$1',
    );
  }

  // 10. Strip remaining backslash macros (e.g. \newpage, \item, \noindent, \vspace{...}, \rule{...})
  text = text.replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})?/gu, ' ');

  // 11. Count body words and characters
  const bodyWords = countWordsInText(text);
  const totalWords = bodyWords + headerWords + captionWords;
  const chars = countChars(text);

  return {
    totalWords,
    bodyWords,
    headerWords,
    captionWords,
    mathElements,
    charCount: chars.chars,
    charCountWithSpaces: chars.charsWithSpaces,
    sections,
  };
}
