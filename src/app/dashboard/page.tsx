
'use client';

import { Suspense, useState, useEffect } from 'react';
import { generatePlantConditions, type GeneratePlantConditionsOutput } from '@/ai/flows/generate-plant-conditions';
import { ConditionsDashboard, ConditionsSkeleton } from '@/components/conditions-dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Wifi, Thermometer, Droplets, Lightbulb, Wind, Leaf, Power, MoonStar } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useSearchParams } from 'next/navigation';
import { DiseaseDiagnosisCard } from '@/components/disease-diagnosis-card';
import { AgriChatbot } from '@/components/agri-chatbot';
import type { DiagnosePlantOutput } from '@/ai/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const DEVICE_ID = "ESP_CAM_SMARTGREENHOUSE_001";

function PlantCareInfoInternal({ plantName }: { plantName: string }) {
    const [conditions, setConditions] = useState<GeneratePlantConditionsOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (plantName) {
            generatePlantConditions({ plantName })
                .then(setConditions)
                .catch(err => {
                    console.error('Failed to generate plant conditions:', err);
                    setError(`We couldn't generate the growing conditions for "${plantName}". This might be due to an issue with the AI service or an unrecognized plant name. Please try again later or with a different plant.`);
                });
        }
    }, [plantName]);

    if (!isClient) {
        return <ConditionsSkeleton />;
    }

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

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
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
                        {isConnected ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </>
                        ) : (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </>
                        )}
                    </span>
                    <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                 <p className="text-xs text-muted-foreground pt-2">
                    {isConnected ? 'Receiving live data.' : 'Awaiting connection from ESP32 device.'}
                 </p>
            </CardContent>
        </Card>
    )
}

type Reading = {
    temperature: number;
    humidity: number;
    soilMoisture: number;
    light: number;
    mq2: number;
    pumpState: string;
    fanState: string;
    growLedState: string;
    deviceId: string;
};

const DUMMY_READING: Reading = {
      deviceId: "DUMMY_DEVICE",
      temperature: 25,
      humidity: 60,
      soilMoisture: 40,
      light: 300,
      mq2: 150,
      pumpState: "OFF",
      fanState: "OFF",
      growLedState: "ON",
};


function RealTimeMonitoring({ onIsConnectedChange }: { onIsConnectedChange: (isConnected: boolean) => void }) {
    const [latestReading, setLatestReading] = useState<Reading>(DUMMY_READING);

    useEffect(() => {
        const fetchLatestReading = async () => {
            try {
                const response = await fetch(`/api/readings?deviceId=${DEVICE_ID}`);
                if (!response.ok) {
                    onIsConnectedChange(false);
                    return;
                }
                const data = await response.json();
                if (data && data.length > 0) {
                    const lastReading = data[data.length - 1];
                    setLatestReading(lastReading);
                    onIsConnectedChange(lastReading.deviceId !== 'DUMMY_DEVICE');
                } else {
                     onIsConnectedChange(false);
                }
            } catch (error) {
                console.error('Failed to fetch readings:', error);
                onIsConnectedChange(false);
            }
        };

        fetchLatestReading(); 
        const interval = setInterval(fetchLatestReading, 5000); 

        return () => clearInterval(interval);
    }, [onIsConnectedChange]);

    const [irrigationOn, setIrrigationOn] = useState(true);
    const [nightLightOn, setNightLightOn] = useState(false);

    const handleControlChange = async (control: 'autoIrrigation' | 'nightLight', value: boolean) => {
        if (control === 'autoIrrigation') {
            setIrrigationOn(value);
        } else {
            setNightLightOn(value);
        }
        
        try {
            const response = await fetch(`/api/controls/${DEVICE_ID}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [control]: value }),
            });
        
            if (!response.ok) {
              throw new Error('Failed to update device controls');
            }
        
            await response.json();
        } catch (error) {
            console.error('Error updating device controls:', error);
            // Optionally, show a toast notification to the user
        }
    };

    const isDummyData = latestReading.deviceId === 'DUMMY_DEVICE';

    return (
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Leaf className="text-primary" />
                    Real-Time Monitoring
                </CardTitle>
                <CardDescription>Live data & controls for your ESP32.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                    <Thermometer className="text-primary"/>
                    <p>Temp: <span className="font-bold">{latestReading.temperature}°C</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <Droplets className="text-primary"/>
                    <p>Moisture: <span className="font-bold">{latestReading.soilMoisture}%</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <Lightbulb className="text-primary"/>
                    <p>Light: <span className="font-bold">{latestReading.light} lux</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <Wind className="text-primary"/>
                    <p>Gas: <span className="font-bold">{latestReading.mq2} ppm</span></p>
                </div>
                 <div className="flex items-center justify-between col-span-2 sm:col-span-1">
                    <Label htmlFor="auto-irrigation" className="flex items-center gap-3 cursor-pointer">
                        <Power className="text-primary"/>
                        <p>Auto Irrigation</p>
                    </Label>
                    <Switch id="auto-irrigation" checked={irrigationOn} onCheckedChange={(value) => handleControlChange('autoIrrigation', value)} />
                </div>
                <div className="flex items-center justify-between col-span-2 sm:col-span-1">
                     <Label htmlFor="night-lighting" className="flex items-center gap-3 cursor-pointer">
                        <MoonStar className="text-primary"/>
                        <p>Night Lighting</p>
                    </Label>
                    <Switch id="night-lighting" checked={nightLightOn} onCheckedChange={(value) => handleControlChange('nightLight', value)} />
                </div>
                {isDummyData && (
                    <p className="text-xs col-span-2 text-center pt-4 text-muted-foreground">[Displaying dummy data. Awaiting real data from ESP32]</p>
                )}
            </CardContent>
        </Card>
    )
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const plantName = searchParams?.get('plantName');
  const [diagnosis, setDiagnosis] = useState<DiagnosePlantOutput | null>(null);
  const [isConnected, setIsConnected] = useState(false);


  return (
    <div className="min-h-screen bg-muted/40 text-foreground font-body flex flex-col">
         <header className="bg-background shadow-md">
            <div className="container mx-auto p-4 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Logo className="w-10 h-10" />
                    <div>
                        <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">Green-AI</h1>
                        <p className="text-sm text-muted-foreground">Your Automated Plant Care Dashboard</p>
                    </div>
                </div>
            </div>
        </header>
      <main className="container mx-auto p-4 py-8 md:p-8 space-y-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <ConnectionStatus isConnected={isConnected} />
                <RealTimeMonitoring onIsConnectedChange={setIsConnected} />
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
