import React, { useMemo } from 'react';
import { tokenizeLexiconText } from '../../lib/lexiconClient';
import GlossaryTerm from './GlossaryTerm';

/**
 * Componente que renderiza texto processando automaticamente termos conhecidos e [[Wikilinks]]
 * @param {string} text - Conteúdo em texto puro ou markdown simples
 * @param {string} [excludeEntryId] - ID do verbete atual para evitar auto-referência recursiva
 * @param {string} [className] - Classes CSS opcionais
 */
export default function LexiconText({ text, excludeEntryId = null, className = '', isNested = false }) {
  const tokens = useMemo(() => {
    if (!text || typeof text !== 'string') return [];
    return tokenizeLexiconText(text, excludeEntryId);
  }, [text, excludeEntryId]);

  if (!text) return null;

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {tokens.map((token, index) => {
        if (token.type === 'term' && token.entry) {
          return (
            <GlossaryTerm
              key={`term-${token.entry.entry_id}-${index}`}
              entry={token.entry}
              text={token.text}
              isNested={isNested}
            />
          );
        }

        if (token.type === 'wikilink') {
          if (token.entry) {
            return (
              <GlossaryTerm
                key={`wiki-${token.entry.entry_id}-${index}`}
                entry={token.entry}
                text={token.text}
                isNested={isNested}
              />
            );
          }
          return (
            <span
              key={`wiki-missing-${index}`}
              className="text-sheet-accent/70 italic underline decoration-dotted"
              title={`Verbete não encontrado: ${token.target}`}
            >
              {token.text}
            </span>
          );
        }

        // Token de texto comum - preserva quebras de linha se existirem
        if (token.text.includes('\n')) {
          const lines = token.text.split('\n');
          return (
            <React.Fragment key={`text-${index}`}>
              {lines.map((line, lineIdx) => (
                <React.Fragment key={`line-${lineIdx}`}>
                  {line}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        return <React.Fragment key={`text-${index}`}>{token.text}</React.Fragment>;
      })}
    </span>
  );
}
