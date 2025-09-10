'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { diagnosePlant as diagnosePlantAction } from '@/actions/search';
import type { DiagnosePlantOutput } from '@/ai/types';
import { Bug, Upload, ShieldCheck, ShieldAlert, Clock, Loader2, Camera } from 'lucide-react';
import Image from 'next/image';

type DiagnosePlantOutputWithTimestampAndPhoto = DiagnosePlantOutput & { timestamp?: string; photoDataUri?: string };

type DiseaseDiagnosisCardProps = {
    onNewDiagnosis: (diagnosis: DiagnosePlantOutput | null) => void;
    onNewAutomatedTimestamp: (timestamp: string) => void;
};

const DEVICE_ID = "ESP_CAM_SMARTGREENHOUSE_001";

export function DiseaseDiagnosisCard({ onNewDiagnosis, onNewAutomatedTimestamp }: DiseaseDiagnosisCardProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastDiagnosis, setLastDiagnosis] = useState<DiagnosePlantOutputWithTimestampAndPhoto | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchLatestDiagnosis = async () => {
      try {
        const response = await fetch(`/api/diagnose-esp?deviceId=${DEVICE_ID}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.timestamp) {
            setLastDiagnosis(data);
            onNewDiagnosis(data);
            onNewAutomatedTimestamp(data.timestamp);
          }
        }
      } catch (error) {
        console.error("Failed to fetch automated diagnosis:", error);
      } finally {
        if (isFetching) setIsFetching(false);
      }
    };

    fetchLatestDiagnosis();
    const interval = setInterval(fetchLatestDiagnosis, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [onNewDiagnosis, onNewAutomatedTimestamp, isFetching]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

    try {
      const result = await diagnosePlantAction(formData);
      const manualResult: DiagnosePlantOutputWithTimestampAndPhoto = {
        ...result,
        photoDataUri: previewUrl || undefined,
        timestamp: new Date().toISOString(), // Add timestamp for consistency
      }
      setLastDiagnosis(manualResult);
      onNewDiagnosis(result);
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

  const renderDiagnosisResult = (diag: DiagnosePlantOutputWithTimestampAndPhoto) => {
    const isAutomated = !!diag.timestamp && !previewUrl?.startsWith('data:'); // A bit of a hack to differentiate
    const title = isAutomated ? 'Automated Diagnosis' : 'Manual Diagnosis';
    const photoUri = diag.photoDataUri;

    return (
     <div className="pt-4 space-y-3 text-left">
         <h4 className="font-semibold flex items-center gap-2">
            {diag.isHealthy ? 
                <ShieldCheck className="text-green-500"/> : 
                <ShieldAlert className="text-destructive"/>
            }
            {title}
        </h4>
        {photoUri && (
             <div className="mt-2 aspect-video w-full overflow-hidden rounded-md border">
                <Image src={photoUri} alt="Diagnosed plant" width={300} height={200} className="h-full w-full object-cover" />
              </div>
        )}
        <div className={`p-3 rounded-md ${diag.isHealthy ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <p><strong>Status:</strong> <span className={diag.isHealthy ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>{diag.isHealthy ? 'Healthy' : 'Diseased'}</span></p>
            {!diag.isHealthy && (
                <>
                    <p><strong>Disease:</strong> {diag.disease}</p>
                    <p className="mt-2"><strong>Suggested Remedy:</strong> {diag.remedy}</p>
                </>
            )}
        </div>
      </div>
    );
  };


  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Camera className="text-primary" />
          Disease Status
        </CardTitle>
        <CardDescription>Latest health analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {isFetching ? (
           <div className="flex items-center justify-center pt-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Checking for diagnosis...</p>
          </div>
        ) : lastDiagnosis ? (
            renderDiagnosisResult(lastDiagnosis)
        ) : (
            <>
                <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="font-medium text-muted-foreground">Awaiting first diagnosis</p>
                <p className="text-xs text-muted-foreground">The ESP32 will automatically send a photo for analysis.</p>
            </>
        )}
        
        <div className="pt-4 border-t">
          <form onSubmit={handleFormSubmit} className="pt-2 space-y-4">
             <h4 className="text-base font-semibold text-foreground">Manual Check-up</h4>
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
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {previewUrl && (
              <div className="mt-4">
                {isDiagnosing ? (
                  <div className="flex items-center justify-center pt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Diagnosing...</p>
                  </div>
                ) : (
                   <Button type="submit" className="w-full mt-2 transition-transform hover:scale-105">
                     <Bug className="mr-2 h-4 w-4" />
                     Diagnose Plant
                   </Button>
                )}
              </div>
            )}
          </form>
        </div>
        {error && <p className="text-destructive text-sm font-medium">{error}</p>}
      </CardContent>
    </Card>
  );
}
