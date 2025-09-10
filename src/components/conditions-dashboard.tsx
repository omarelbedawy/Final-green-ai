
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Droplets, Thermometer, Lightbulb, Wind, Leaf, Pencil, Save, X } from 'lucide-react';
import { useState } from 'react';
import type { GeneratePlantConditionsOutput } from '@/ai/flows/generate-plant-conditions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';


const DEVICE_ID = "ESP_CAM_SMARTGREENHOUSE_001";

export function ConditionsDashboard({ conditions, plantName }: { conditions: GeneratePlantConditionsOutput; plantName: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableConditions, setEditableConditions] = useState(conditions);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableConditions(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`/api/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: DEVICE_ID,
          soilDryThreshold: editableConditions.soilDryThreshold,
          mq2Threshold: editableConditions.mq2Threshold,
          tempThreshold: editableConditions.tempThreshold,
          lightThreshold: editableConditions.lightThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save conditions.');
      }
      
      toast({
        title: 'Success',
        description: 'Your custom conditions have been saved.',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving conditions:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your custom conditions. Please try again.',
      });
    }
  };

  const ThresholdCard = ({ title, icon: Icon, value, name, unit, isEditing }: { title: string; icon: React.ElementType, value: number; name: string; unit: string; isEditing: boolean }) => (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm border-primary/10 animate-fade-in">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className="p-3 bg-primary/20 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="font-headline font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input type="number" name={name} value={value} onChange={handleInputChange} className="w-24" />
            <span className="text-muted-foreground">{unit}</span>
          </div>
        ) : (
          <p className="text-3xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full mx-auto animate-fade-in" style={{ animationDelay: '300ms' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight capitalize">{plantName} Care Guide</h2>
        {isEditing ? (
          <div className="flex gap-2">
            <Button onClick={() => setIsEditing(false)} variant="outline" size="icon" className="rounded-full"><X className="h-4 w-4" /></Button>
            <Button onClick={handleSaveChanges} size="icon" className="rounded-full"><Save className="h-4 w-4" /></Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="icon" className="rounded-full">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-bold mb-4 font-headline">Best Conditions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ThresholdCard title="Soil Moisture" icon={Droplets} value={editableConditions.soilDryThreshold} name="soilDryThreshold" unit="%" isEditing={isEditing} />
            <ThresholdCard title="Gas (MQ2)" icon={Wind} value={editableConditions.mq2Threshold} name="mq2Threshold" unit="ppm" isEditing={isEditing} />
            <ThresholdCard title="Temperature" icon={Thermometer} value={editableConditions.tempThreshold} name="tempThreshold" unit="°C" isEditing={isEditing} />
            <ThresholdCard title="Light Level" icon={Lightbulb} value={editableConditions.lightThreshold} name="lightThreshold" unit="lux" isEditing={isEditing} />
          </div>
        </div>
        <div>
           <h3 className="text-2xl font-bold mb-4 font-headline">Enrichment</h3>
           <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm border-primary/10">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Leaf className="w-6 h-6 text-primary" />
                    <CardTitle className="font-bold font-headline">General Advice</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground leading-relaxed">{conditions.enrichment}</p>
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

export function ConditionsSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Skeleton className="h-10 w-3/4 md:w-1/2 mb-8" />
      <div className="space-y-8">
        <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                <Card key={i} className="shadow-md bg-card">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                    <Skeleton className="h-8 w-20 mt-2" />
                    </CardContent>
                </Card>
                ))}
            </div>
        </div>
        <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
