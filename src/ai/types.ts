/**
 * @fileOverview This file contains the shared Zod schemas and TypeScript types for the AI flows.
 * It does not contain any server-side logic and is safe to import in client components.
 */

import { z } from 'zod';

export const DiagnosePlantOutputSchema = z.object({
  isHealthy: z.boolean().describe('Whether or not the plant is healthy.'),
  disease: z.string().describe("The common name of the disease if the plant is not healthy, otherwise 'None'."),
  remedy: z.string().describe('A suggested remedy if the plant is not healthy.')
});
export type DiagnosePlantOutput = z.infer<typeof DiagnosePlantOutputSchema>;


const MessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
});

export const AgriChatInputSchema = z.object({
  language: z.string().describe('The language for the conversation.'),
  history: z.array(MessageSchema).describe('The conversation history.'),
  message: z.string().describe('The latest user message.'),
  diagnosis: DiagnosePlantOutputSchema.nullable().describe('The current plant diagnosis, if available.'),
});
export type AgriChatInput = z.infer<typeof AgriChatInputSchema>;

export const AgriChatOutputSchema = z.object({
  response: z.string().describe('The AI model\'s response.'),
});
export type AgriChatOutput = z.infer<typeof AgriChatOutputSchema>;


export const DiagnosePlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DiagnosePlantInput = z.infer<typeof DiagnosePlantInputSchema>;
