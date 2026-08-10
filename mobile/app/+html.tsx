import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Inter vía CDN: Vercel no sirve bien los .ttf de assets/node_modules del export. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
  font-family: Inter, system-ui, sans-serif;
}
/* Alias a los nombres que usa @expo-google-fonts/inter en RN */
@font-face { font-family: 'Inter_400Regular'; src: local('Inter'), local('Inter Regular'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Inter_500Medium'; src: local('Inter Medium'), local('Inter'); font-weight: 500; font-style: normal; }
@font-face { font-family: 'Inter_600SemiBold'; src: local('Inter SemiBold'), local('Inter'); font-weight: 600; font-style: normal; }
@font-face { font-family: 'Inter_700Bold'; src: local('Inter Bold'), local('Inter'); font-weight: 700; font-style: normal; }
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
