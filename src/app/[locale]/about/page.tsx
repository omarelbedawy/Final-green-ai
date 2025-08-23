
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Cpu, Leaf, Telescope } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AboutPage() {
    const t = useTranslations("About");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 py-8 md:p-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold font-headline tracking-tight">{t("title")}</h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">{t("subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="items-center text-center">
                            <div className="p-4 bg-primary/20 rounded-full mb-2">
                                <Leaf className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="font-headline">{t("feature1Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground">
                            <p>{t("feature1Desc")}</p>
                        </CardContent>
                    </Card>

                     <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="items-center text-center">
                            <div className="p-4 bg-primary/20 rounded-full mb-2">
                                <Telescope className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="font-headline">{t("feature2Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground">
                            <p>{t("feature2Desc")}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="items-center text-center">
                            <div className="p-4 bg-primary/20 rounded-full mb-2">
                                <Cpu className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="font-headline">{t("feature3Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground">
                            <p>{t("feature3Desc")}</p>
                        </CardContent>
                    </Card>

                     <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="items-center text-center">
                            <div className="p-4 bg-primary/20 rounded-full mb-2">
                                <Bot className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="font-headline">{t("feature4Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground">
                           <p>{t("feature4Desc")}</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
