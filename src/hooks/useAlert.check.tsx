// ponytail: useAlert.check.tsx acts as a self-check for the hook types and rendering.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from './useLanguage';
import { AlertProvider, useAlert } from './useAlert';

const TestComponent: React.FC = () => {
  const { alert, confirm } = useAlert();
  if (typeof alert !== 'function' || typeof confirm !== 'function') {
    throw new Error('useAlert hook does not expose alert or confirm functions');
  }
  return <div>OK</div>;
};

export function runAlertSelfCheck() {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    </LanguageProvider>
  );
  if (!markup.includes('OK')) {
    throw new Error('AlertProvider failed to render children');
  }
  console.log('useAlert self-check passed!');
}

// Auto-run when the file is executed
runAlertSelfCheck();


