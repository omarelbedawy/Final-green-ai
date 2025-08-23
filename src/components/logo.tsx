
import Image from 'next/image';
import { cn } from "@/lib/utils"

export function Logo({ className, withBg = false }: { className?: string, withBg?: boolean }) {
    const logoUrl = withBg ? '/logo-with-bg.png' : '/logo-no-bg.png';
    return (
        <div className={cn("relative", className)}>
             <Image
                src={logoUrl}
                alt="PlantWise Logo"
                fill
                className="object-contain"
                priority
            />
        </div>
    )
}
