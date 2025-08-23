
import { PlantForm } from '@/components/plant-form';
import { Suspense } from 'react';

function PlantSearchFallback() {
    return <></>
}

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center">
      <main className="container mx-auto p-4 py-8 md:p-12">
        <div className="w-full max-w-md mx-auto">
            <Suspense fallback={<PlantSearchFallback/>}>
                <PlantForm />
            </Suspense>
        </div>
      </main>
    </div>
  );
}
