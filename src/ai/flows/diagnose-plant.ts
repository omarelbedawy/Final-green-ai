
'use server';
/**
 * @fileOverview A plant problem diagnosis AI agent.
 *
 * - diagnosePlant - A function that handles the plant diagnosis process.
 */

import {ai} from '@/ai/genkit';
import type { DiagnosePlantInput, DiagnosePlantOutput } from '@/ai/types';
import { DiagnosePlantInputSchema, DiagnosePlantOutputSchema } from '@/ai/types';


export async function diagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnosePlantPrompt',
  input: {schema: DiagnosePlantInputSchema},
  output: {schema: DiagnosePlantOutputSchema},
  prompt: `You are an expert botanist specializing diagnosing plant illnesses from photos.

You will be given a photo of a plant. Your task is to identify if the plant has any diseases.

- If the plant is healthy, set 'isHealthy' to true and 'disease' to 'None'.
- If the plant is diseased, set 'isHealthy' to false, identify the common name of the disease, and suggest a remedy.

Photo: {{media url=photoDataUri}}`,
});

const diagnosePlantFlow = ai.defineFlow(
  {
    name: 'diagnosePlantFlow',
    inputSchema: DiagnosePlantInputSchema,
    outputSchema: DiagnosePlantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
