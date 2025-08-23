
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { diagnosePlant } from '@/actions/search';
import type { DiagnosePlantOutput } from '@/ai/types';
import { Bug, Upload, Leaf, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import Image from 'next/image';

function SubmitButton() {
  return (
    <Button type="submit" className="w-full mt-2 transition-transform hover:scale-105">
      <Bug className="mr-2 h-4 w-4" />
      Diagnose Plant
    </Button>
  );
}

type DiseaseDiagnosisCardProps = {
    diagnosis: DiagnosePlantOutput | null;
    onDiagnose: (diagnosis: DiagnosePlantOutput | null) => void;
};

export function DiseaseDiagnosisCard({ diagnosis, onDiagnose }: DiseaseDiagnosisCardProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onDiagnose(null);
      setError(null);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const photo = formData.get('photo') as File;

    if (!photo || photo.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No Photo Selected',
        description: 'Please select a photo of your plant to diagnose.',
      });
      return;
    }

    setIsDiagnosing(true);
    setError(null);
    onDiagnose(null);

    try {
      const result = await diagnosePlant(formData);
      onDiagnose(result);
    } catch (e: any) {
      setError('An error occurred during diagnosis. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Diagnosis Failed',
        description: e.message || 'An unknown error occurred.',
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const hasAutomatedDiagnosis = false; 

  if (hasAutomatedDiagnosis) {
      return (
           <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Bug className="text-primary"/>
                        Disease Status
                    </CardTitle>
                    <CardDescription>Latest automated health analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                </CardContent>
           </Card>
      )
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Bug className="text-primary" />
          Disease Status
        </CardTitle>
        <CardDescription>Automatic health analysis from ESP32.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="font-medium text-muted-foreground">Awaiting first diagnosis</p>
        <p className="text-xs text-muted-foreground">The ESP32 will automatically send a photo for analysis. You can also manually upload a photo for an instant check-up.</p>
        
        <form onSubmit={handleFormSubmit} className="pt-2">
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button type="button" variant="outline" size="sm" className="w-auto transition-transform hover:scale-105" onClick={triggerFileSelect}>
            <Upload className="mr-2 h-4 w-4" />
            {previewUrl ? 'Change Photo for Manual Check' : 'Manual Diagnosis'}
          </Button>

          {previewUrl && (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-md border">
              <Image src={previewUrl} alt="Plant preview" width={300} height={200} className="h-full w-full object-cover" />
            </div>
          )}
          
          {previewUrl && !isDiagnosing && <SubmitButton />}
        </form>

        {isDiagnosing && (
          <div className="flex items-center justify-center pt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-4 text-muted-foreground">Diagnosing...</p>
          </div>
        )}
        
        {error && <p className="text-destructive text-sm font-medium">{error}</p>}

        {diagnosis && (
          <div className="pt-4 space-y-3 text-left">
             <h4 className="font-semibold flex items-center gap-2">
                {diagnosis.isHealthy ? 
                    <ShieldCheck className="text-green-500"/> : 
                    <ShieldAlert className="text-destructive"/>
                }
                Manual Diagnosis Result
            </h4>
            <div className={`p-3 rounded-md ${diagnosis.isHealthy ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <p><strong>Status:</strong> <span className={diagnosis.isHealthy ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>{diagnosis.isHealthy ? 'Healthy' : 'Diseased'}</span></p>
                {!diagnosis.isHealthy && (
                    <>
                        <p><strong>Disease:</strong> {diagnosis.disease}</p>
                        <p className="mt-2"><strong>Suggested Remedy:</strong> {diagnosis.remedy}</p>
                    </>
                )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
