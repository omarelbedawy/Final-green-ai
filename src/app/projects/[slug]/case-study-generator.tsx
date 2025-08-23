'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateCaseStudy } from '@/ai/flows/generate-case-study';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';
import { Loader2, Wand2, Copy } from 'lucide-react';

const formSchema = z.object({
  description: z.string().min(50, 'Please provide a more detailed description (at least 50 characters).'),
  existingCaseStudy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CaseStudyGeneratorProps {
  project: Project;
}

export default function CaseStudyGenerator({ project }: CaseStudyGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: project.longDescription,
      existingCaseStudy: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedCaseStudy(null);
    try {
      const result = await generateCaseStudy({
        title: project.title,
        description: values.description,
        existingCaseStudy: values.existingCaseStudy,
      });
      setGeneratedCaseStudy(result.caseStudy);
      toast({
        title: "Case Study Generated!",
        description: "Your new case study is ready below.",
      });
    } catch (error) {
      console.error('Failed to generate case study:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'An error occurred. Please check the console and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopy = () => {
    if (generatedCaseStudy) {
      navigator.clipboard.writeText(generatedCaseStudy);
      toast({ title: 'Copied to clipboard!' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Wand2 className="text-primary" />
          <span>AI Case Study Generator</span>
        </CardTitle>
        <CardDescription>
          Generate a compelling case study for this project. Refine the description below, then let AI do the writing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the project goals, process, and outcomes..."
                      className="min-h-[150px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="existingCaseStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adapt Existing Case Study (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste an existing case study here to adapt its style and tone..."
                      className="min-h-[100px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                'Generate Case Study'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {generatedCaseStudy && (
        <>
          <CardContent>
              <h3 className="font-semibold mb-2 text-lg">Generated Result</h3>
              <div className="relative rounded-md border bg-muted/50 p-4 whitespace-pre-wrap font-sans text-sm h-64 overflow-y-auto">
                  {generatedCaseStudy}
              </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleCopy} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Text
            </Button>
        </CardFooter>
        </>
      )}
    </Card>
  );
}
