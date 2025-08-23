'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate the best growing conditions for a given plant name.
 *
 * @exports generatePlantConditions - An async function that takes a plant name as input and returns the generated growing conditions.
 * @exports GeneratePlantConditionsInput - The input type for the generatePlantConditions function.
 * @exports GeneratePlantConditionsOutput - The output type for the generatePlantConditions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePlantConditionsInputSchema = z.object({
  plantName: z.string().describe('The name of the plant to generate growing conditions for.'),
});
export type GeneratePlantConditionsInput = z.infer<typeof GeneratePlantConditionsInputSchema>;

const GeneratePlantConditionsOutputSchema = z.object({
  soilDryThreshold: z.number().describe('The soil moisture threshold to trigger watering.'),
  mq2Threshold: z.number().describe('The gas sensor threshold to trigger the fan.'),
  tempThreshold: z.number().describe('The temperature threshold to trigger the fan.'),
  lightThreshold: z.number().describe('The light level threshold to trigger the grow light.'),
  enrichment: z.string().describe('General enrichment information about the plant, including sunlight, watering, soil, temperature, and humidity.'),
});
export type GeneratePlantConditionsOutput = z.infer<typeof GeneratePlantConditionsOutputSchema>;

export async function generatePlantConditions(input: GeneratePlantConditionsInput): Promise<GeneratePlantConditionsOutput> {
  return generatePlantConditionsFlow(input);
}

const generatePlantConditionsPrompt = ai.definePrompt({
  name: 'generatePlantConditionsPrompt',
  input: {schema: GeneratePlantConditionsInputSchema},
  output: {schema: GeneratePlantConditionsOutputSchema},
  prompt: `You are an expert botanist and IoT farming engineer. A user has requested information for the plant: {{{plantName}}}.

Provide the following control thresholds for an automated system:
- SOIL_DRY_THRESHOLD: A numerical value for soil moisture (e.g., percentage) below which a pump should be activated.
- MQ2_THRESHOLD: A numerical value (e.g., in ppm) for a gas sensor that would trigger a fan for ventilation.
- TEMP_THRESHOLD: A numerical value for temperature (in Celsius) above which a fan should be activated.
- LIGHT_THRESHOLD: A numerical value for light level (e.g., in lux) below which a grow light should be activated.

Additionally, provide general enrichment information for the plant, covering ideal conditions for sunlight, watering frequency, soil type, temperature range, and humidity. Keep this information concise.`,
});

const generatePlantConditionsFlow = ai.defineFlow(
  {
    name: 'generatePlantConditionsFlow',
    inputSchema: GeneratePlantConditionsInputSchema,
    outputSchema: GeneratePlantConditionsOutputSchema,
  },
  async input => {
    const {output} = await generatePlantConditionsPrompt(input);
    return output!;
  }
);
