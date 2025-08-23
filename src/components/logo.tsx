
import Image from 'next/image';
import { cn } from "@/lib/utils"

export function Logo({ className, withBg = false }: { className?: string, withBg?: boolean }) {
    const logoUrl = withBg ? '/logo.png' : '/logo-removebg-preview.png';
    return (
        <div className={cn("relative", className)}>
             <Image
                src={logoUrl}
                alt="Green-AI Logo"
                fill
                className="object-contain"
                priority
            />
        </div>
    )
}
