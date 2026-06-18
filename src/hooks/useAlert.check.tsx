// ponytail: useAlert.check.tsx acts as a self-check for the hook types and rendering.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from './useLanguage';
import { AlertProvider, useAlert } from './useAlert';

const TestComponent = () => {
  const { alert, confirm } = useAlert();
  if (typeof alert !== 'function' || typeof confirm !== 'function') {
    throw new Error('useAlert hook does not expose alert or confirm functions');
  }
  return <div>OK</div>;
};

export function runAlertSelfCheck() {
  try {
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
  } catch (error) {
    console.error('useAlert self-check failed:', error);
    process.exit(1);
  }
}

// Auto-run when the file is executed
runAlertSelfCheck();

