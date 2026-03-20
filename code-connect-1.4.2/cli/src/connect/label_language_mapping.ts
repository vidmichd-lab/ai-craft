/**
 * Default Code Connect labels for native parsers
 */
export enum CodeConnectLabel {
  React = 'React',
  Storybook = 'Storybook',
  SwiftUI = 'SwiftUI',
  Compose = 'Compose',
  WebComponents = 'Web Components',
  HTML = 'HTML',
  Vue = 'Vue',
  Angular = 'Angular',
  Code = 'Code', // Default/fallback label
}

/**
 * Supported Code Connect languages for syntax highlighting and formatting
 */
export enum SyntaxHighlightLanguage {
  TypeScript = 'typescript',
  CPP = 'cpp',
  Ruby = 'ruby',
  CSS = 'css',
  JavaScript = 'javascript',
  HTML = 'html',
  JSON = 'json',
  GraphQL = 'graphql',
  Python = 'python',
  Go = 'go',
  SQL = 'sql',
  Swift = 'swift',
  Kotlin = 'kotlin',
  Rust = 'rust',
  Bash = 'bash',
  XML = 'xml',
  Plaintext = 'plaintext',
  JSX = 'jsx',
  TSX = 'tsx',
  Dart = 'dart',
}

/**
 * Maps Code Connect labels to their corresponding language for syntax highlighting.
 * This is used for raw template files to infer the correct language.
 */
const LABEL_TO_LANGUAGE_MAP: Record<CodeConnectLabel, SyntaxHighlightLanguage> = {
  [CodeConnectLabel.React]: SyntaxHighlightLanguage.JSX,
  [CodeConnectLabel.Storybook]: SyntaxHighlightLanguage.TypeScript,
  [CodeConnectLabel.SwiftUI]: SyntaxHighlightLanguage.Swift,
  [CodeConnectLabel.Compose]: SyntaxHighlightLanguage.Kotlin,
  [CodeConnectLabel.WebComponents]: SyntaxHighlightLanguage.HTML,
  [CodeConnectLabel.HTML]: SyntaxHighlightLanguage.HTML,
  [CodeConnectLabel.Vue]: SyntaxHighlightLanguage.HTML,
  [CodeConnectLabel.Angular]: SyntaxHighlightLanguage.HTML,
  [CodeConnectLabel.Code]: SyntaxHighlightLanguage.Plaintext,
}

/**
 * Infers the appropriate language for a raw template file based on its label.
 * Falls back to 'plaintext' if the label is not recognized.
 *
 * @param label - The label associated with the Code Connect file
 * @returns The corresponding language identifier for syntax highlighting
 */
export function getInferredLanguageForRaw(
  label: string,
  defaultLanguage: SyntaxHighlightLanguage = SyntaxHighlightLanguage.Plaintext,
): SyntaxHighlightLanguage {
  // Try to match against known labels (enum values)
  const knownLabel = Object.values(CodeConnectLabel).find((enumLabel) => enumLabel === label)

  if (knownLabel) {
    return LABEL_TO_LANGUAGE_MAP[knownLabel as CodeConnectLabel]
  }

  return defaultLanguage
}
