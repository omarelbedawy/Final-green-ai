'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, X, Bot, User, Languages, Loader2, Sparkles } from 'lucide-react';
import { chat } from '@/ai/flows/agri-chat';
import type { DiagnosePlantOutput } from '@/ai/types';

type Message = {
    role: 'user' | 'model';
    content: string;
};

const languages = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi'
];

type AgriChatbotProps = {
    diagnosis: DiagnosePlantOutput | null;
    plantName?: string;
}

export function AgriChatbot({ diagnosis, plantName }: AgriChatbotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleLanguageSelect = (lang: string) => {
        setLanguage(lang);
        setMessages([
            { role: 'model', content: `Great! I'll chat with you in ${lang}. How can I help you with your agricultural questions today?` }
        ]);
    };

    const handleSend = async (messageToSend?: string) => {
        const currentMessage = messageToSend || input;
        if (!currentMessage.trim() || !language) return;

        const userMessage: Message = { role: 'user', content: currentMessage };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages;
            const response = await chat({
                language,
                history,
                message: currentMessage,
                diagnosis,
            });
            const modelMessage: Message = { role: 'model', content: response.response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: Message = { role: 'model', content: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="rounded-full h-16 w-16 shadow-lg transition-transform hover:scale-110">
                    {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                </Button>
            </div>
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-full max-w-md animate-fade-in">
                    <Card className="shadow-2xl flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                           <div>
                             <CardTitle className="flex items-center gap-2">
                                 <Bot className="text-primary"/>
                                 Agri-Chat Assistant
                             </CardTitle>
                             <CardDescription>Your AI guide for agriculture.</CardDescription>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => { setLanguage(null); setMessages([])}}>
                               <Languages className="h-5 w-5" />
                               <span className="sr-only">Change Language</span>
                           </Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <div ref={scrollAreaRef} className="h-96 overflow-y-auto p-6 space-y-4">
                                {!language ? (
                                    <div className="text-center p-4">
                                        <h3 className="font-semibold mb-4">Please select your language:</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {languages.map(lang => (
                                                <Button key={lang} variant="outline" onClick={() => handleLanguageSelect(lang)}>
                                                    {lang}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((message, index) => (
                                        <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                            {message.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                                            <div className={`rounded-lg p-3 max-w-xs break-words ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                <p className="text-sm">{message.content}</p>
                                            </div>
                                            {message.role === 'user' && <User className="h-6 w-6 flex-shrink-0" />}
                                        </div>
                                    ))
                                )}
                                {isLoading && (
                                     <div className="flex items-start gap-3">
                                        <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                                        <div className="rounded-lg p-3 bg-muted flex items-center">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        {language && (
                           <>
                            <div className="p-4 border-t bg-background flex items-start gap-2">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Ask about anything..."
                                    className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[40px] max-h-[120px]"
                                />
                                <Button onClick={() => handleSend()} size="icon" disabled={isLoading || !input.trim()} className="self-end">
                                    <Send className="h-5 w-5" />
                                    <span className="sr-only">Send</span>
                                 </Button>
                            </div>
                           </>
                        )}
                    </Card>
                </div>
            )}
        </>
    );
}
