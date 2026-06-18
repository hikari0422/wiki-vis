// ponytail: wiki-graph.check.tsx acts as a self-check for the useWikiGraph hook correctness.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from './useLanguage';
import { AlertProvider } from './useAlert';
import { useWikiGraph } from './wiki-graph';

const TestComponent: React.FC = () => {
  const graph = useWikiGraph(null);
  
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error('useWikiGraph: nodes or links is not an array');
  }
  if (typeof graph.changeLimit !== 'function') {
    throw new Error('useWikiGraph: changeLimit is not a function');
  }
  if (graph.limit !== 5) {
    throw new Error('useWikiGraph: default limit should be 5');
  }
  
  return <div>OK</div>;
};

export function runWikiGraphSelfCheck() {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    </LanguageProvider>
  );
  if (!markup.includes('OK')) {
    throw new Error('useWikiGraph self-check failed to render');
  }
  console.log('useWikiGraph self-check passed!');
}

runWikiGraphSelfCheck();
