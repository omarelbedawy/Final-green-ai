import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-plug-zap", className)}
        >
            <path d="M13 22v-3a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3" />
            <path d="M18 19c0-2.48-2.02-4.5-4.5-4.5h-1C10.22 14.5 9 13.28 9 11.8V7" />
            <path d="M12.5 7H15a2 2 0 0 1 2 2v1.5" />
            <path d="M8 7H6a2 2 0 0 0-2 2v1.5" />
            <path d="M7 2h10" />
            <path d="M10 2v3" />
            <path d="M14 2v3" />
            <path d="M13.5 9.5c.38.8.4 1.7-.1 2.5" />
            <path d="M10.5 9.5c-.38.8-.4 1.7.1 2.5" />
        </svg>
    )
}
