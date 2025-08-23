
'use client';

import { searchPlant } from '@/actions/search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg">
      {pending ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-3"></div>
          Generating...
        </>
      ) : (
        'Find My Plant'
      )}
    </Button>
  );
}

export function PlantForm() {
  const searchParams = useSearchParams();
  const defaultPlantName = searchParams.get('plantName') || '';

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg bg-card border-none">
      <CardHeader className="text-center p-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Logo className="w-10 h-10 text-primary" />
          <h1 className="text-5xl font-headline font-bold text-foreground">Green-AI</h1>
        </div>
        <CardDescription className="text-base text-muted-foreground">
          Discover the ideal growing conditions for any plant, powered by AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <form action={searchPlant} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="plantName" className="text-sm font-medium text-muted-foreground">Plant Name</label>
            <Input
              id="plantName"
              name="plantName"
              placeholder="e.g., Monstera Deliciosa"
              required
              className="text-base h-12"
              defaultValue={defaultPlantName}
              key={defaultPlantName} // Ensures the input updates if the user navigates back/forward
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
