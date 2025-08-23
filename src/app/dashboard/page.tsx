
'use client';

import { Suspense, useState, useEffect } from 'react';
import { generatePlantConditions, type GeneratePlantConditionsOutput } from '@/ai/flows/generate-plant-conditions';
import { ConditionsDashboard, ConditionsSkeleton } from '@/components/conditions-dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Wifi, Thermometer, Droplets, Lightbulb, Wind, Leaf } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useSearchParams } from 'next/navigation';
import { DiseaseDiagnosisCard } from '@/components/disease-diagnosis-card';
import { AgriChatbot } from '@/components/agri-chatbot';
import type { DiagnosePlantOutput } from '@/ai/types';

function PlantCareInfoInternal({ plantName }: { plantName: string }) {
    const [conditions, setConditions] = useState<GeneratePlantConditionsOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        generatePlantConditions({ plantName })
            .then(setConditions)
            .catch(err => {
                console.error('Failed to generate plant conditions:', err);
                setError(`We couldn't generate the growing conditions for "${plantName}". This might be due to an issue with the AI service or an unrecognized plant name. Please try again later or with a different plant.`);
            });
    }, [plantName]);

    if (error) {
        return (
            <Card className="w-full mt-8 border-destructive animate-fade-in">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <AlertTriangle className="text-destructive h-8 w-8" />
                        <CardTitle className="text-destructive">Generation Error</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!conditions) {
        return <ConditionsSkeleton />;
    }

    return <ConditionsDashboard conditions={conditions} plantName={plantName} />;
}

function ConnectionStatus() {
    return (
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Wifi className="text-primary"/>
                    Device Status
                </CardTitle>
                <CardDescription>ESP32-CAM connection.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="font-semibold text-red-600">Disconnected</span>
                </div>
                 <p className="text-xs text-muted-foreground pt-2">Awaiting connection from ESP32 device.</p>
            </CardContent>
        </Card>
    )
}

function RealTimeMonitoring() {
    // Dummy data for demonstration
    const idealRanges = {
        temp: { min: 18, max: 25 },
        moisture: { min: 40, max: 60 },
        light: { min: 5000, max: 10000 },
        gas: { min: 0, max: 100 },
    };
    
    // Dummy readings for demonstration
    const readings = {
        temp: 22, // In range
        moisture: 35, // Out of range
        light: 12000, // Out of range
        gas: 50, // In range
    };

    const StatusIndicator = ({ reading, range }: { reading: number, range: { min: number, max: number } }) => {
        const inRange = reading >= range.min && reading <= range.max;
        return (
            <span className={`h-3 w-3 rounded-full ${inRange ? 'bg-green-500' : 'bg-red-500'}`}></span>
        );
    };

    return (
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Leaf className="text-primary" />
                    Real-Time Monitoring
                </CardTitle>
                <CardDescription>Live data from your ESP32-CAM sensors.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                    <StatusIndicator reading={readings.temp} range={idealRanges.temp} />
                    <Thermometer className="text-primary"/>
                    <p>Temp: <span className="font-bold">{readings.temp}°C</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusIndicator reading={readings.moisture} range={idealRanges.moisture} />
                    <Droplets className="text-primary"/>
                    <p>Moisture: <span className="font-bold">{readings.moisture}%</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusIndicator reading={readings.light} range={idealRanges.light} />
                    <Lightbulb className="text-primary"/>
                    <p>Light: <span className="font-bold">{readings.light} lux</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusIndicator reading={readings.gas} range={idealRanges.gas} />
                    <Wind className="text-primary"/>
                    <p>Gas: <span className="font-bold">{readings.gas} ppm</span></p>
                </div>
                 <p className="text-xs col-span-2 text-center pt-4 text-muted-foreground">[Displaying dummy data. Awaiting real data from ESP32]</p>
            </CardContent>
        </Card>
    )
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const plantName = searchParams?.get('plantName');
  const [diagnosis, setDiagnosis] = useState<DiagnosePlantOutput | null>(null);


  return (
    <div className="min-h-screen bg-muted/40 text-foreground font-body">
         <header className="bg-background shadow-md">
            <div className="container mx-auto p-4 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Logo className="w-10 h-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">Green-AI</h1>
                        <p className="text-sm text-muted-foreground">Your Automated Plant Care Dashboard</p>
                    </div>
                </div>
            </div>
        </header>
      <main className="container mx-auto p-4 py-8 md:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <ConnectionStatus />
                <RealTimeMonitoring />
            </div>
            <div className="row-start-1 xl:row-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                 <DiseaseDiagnosisCard 
                    diagnosis={diagnosis} 
                    onDiagnose={setDiagnosis} 
                 />
            </div>
        </div>

        {plantName ? (
            <Suspense fallback={<ConditionsSkeleton />}>
                <PlantCareInfoInternal plantName={plantName} />
            </Suspense>
        ) : (
            <Card className="w-full max-w-4xl mx-auto mt-8 text-center animate-fade-in">
                <CardHeader>
                    <CardTitle>No Plant Selected</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Please go back and search for a plant to see its dashboard.</p>
                </CardContent>
            </Card>
        )}
      </main>
      <AgriChatbot diagnosis={diagnosis} plantName={plantName || undefined} />
    </div>
  );
}

export default function DashboardPage() {
    return (
        <Suspense>
            <DashboardPageContent />
        </Suspense>
    )
}
