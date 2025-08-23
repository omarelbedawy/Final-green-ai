'use server';

/**
 * @fileOverview AI flow to generate a case study from a project title and description.
 *
 * - generateCaseStudy - Function to generate a case study.
 * - GenerateCaseStudyInput - Input type for the generateCaseStudy function.
 * - GenerateCaseStudyOutput - Output type for the generateCaseStudy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCaseStudyInputSchema = z.object({
  title: z.string().describe('The title of the project.'),
  description: z.string().describe('A detailed description of the project.'),
  existingCaseStudy: z.string().optional().describe('Existing case study to adapt from.'),
});
export type GenerateCaseStudyInput = z.infer<typeof GenerateCaseStudyInputSchema>;

const GenerateCaseStudyOutputSchema = z.object({
  caseStudy: z.string().describe('The generated case study content.'),
});
export type GenerateCaseStudyOutput = z.infer<typeof GenerateCaseStudyOutputSchema>;

export async function generateCaseStudy(input: GenerateCaseStudyInput): Promise<GenerateCaseStudyOutput> {
  return generateCaseStudyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCaseStudyPrompt',
  input: {schema: GenerateCaseStudyInputSchema},
  output: {schema: GenerateCaseStudyOutputSchema},
  prompt: `You are an expert marketing content creator, specializing in writing compelling case studies.

  Based on the project title and description provided, create a new, unique case study. If an existing case study is provided, adapt it to fit the new project, maintaining a consistent voice and tone.

  Project Title: {{{title}}}
  Project Description: {{{description}}}

  {{#if existingCaseStudy}}
  Existing Case Study: {{{existingCaseStudy}}}
  Adapt this case study to reflect the details of the Project Title and Project Description.
  {{else}}
  Create a new case study based on the Project Title and Project Description.
  {{/if}}
  `,
});

const generateCaseStudyFlow = ai.defineFlow(
  {
    name: 'generateCaseStudyFlow',
    inputSchema: GenerateCaseStudyInputSchema,
    outputSchema: GenerateCaseStudyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
