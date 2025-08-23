
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function WelcomePage() {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 2500); // Animation duration

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center p-4 overflow-hidden">
      <main className="container mx-auto flex flex-col items-center justify-center">
        <div
          className={`transition-all duration-1000 ${
            isAnimating
              ? 'scale-100 animate-logo-grow'
              : 'scale-50 -translate-y-16 animate-logo-shrink'
          }`}
        >
          <Logo className="w-48 h-48" />
        </div>

        <div
          className={`w-full max-w-md transition-opacity duration-700 delay-300 ${
            isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {!isAnimating && (
            <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm border-primary/20 animate-fade-in">
              <CardHeader className="text-center p-8">
                 <h1 className="text-5xl font-headline font-extrabold text-foreground tracking-tight">Green-AI</h1>
                <CardDescription className="text-lg text-muted-foreground pt-2">
                  Welcome! Your AI-powered plant care assistant.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex flex-col gap-4">
                <Button asChild className="w-full py-6 text-lg transition-transform hover:scale-105">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild variant="outline" className="w-full py-6 text-lg transition-transform hover:scale-105">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
