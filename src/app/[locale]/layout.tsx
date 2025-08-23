'use client';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = useMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className='flex-grow'>
              {children}
            </div>
            <Toaster />
            <footer className="bg-background border-t py-4">
                <div className="container mx-auto text-center text-muted-foreground text-sm">
                    <p>&copy; {new Date().getFullYear()} Green-AI. All rights reserved.</p>
                    <p>
                        <a href="https://github.com/omarelbedawy/new" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                            View on GitHub
                        </a>
                    </p>
                </div>
            </footer>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
