
'use client';
import { useLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Mail, MessageCircle } from 'lucide-react';


export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = useLocale();

  // Show a 404 error if the user requests an unknown locale
  if (params.locale !== locale) {
    notFound();
  }
  
  const messages = require(`../../messages/${locale}.json`);

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
            <footer className="bg-background border-t py-6">
                <div className="container mx-auto text-center text-muted-foreground text-sm">
                    <p>&copy; 2025 Green-AI Team. Developer: Omar Elbedawy.</p>
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <a href="https://wa.me/201503449731" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>+201503449731</span>
                        </a>
                        <a href="mailto:omar.1824039@stemksheikh.moe.edu.eg" className="flex items-center gap-2 hover:text-primary transition-colors">
                           <Mail className="w-4 h-4" />
                           <span>STEM Email</span>
                        </a>
                         <a href="mailto:elbedawyomar2009@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                           <Mail className="w-4 h-4" />
                           <span>Personal Email</span>
                        </a>
                    </div>
                </div>
            </footer>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
