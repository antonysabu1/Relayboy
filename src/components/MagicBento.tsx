import { useRef, useEffect, useCallback, useState, ReactNode, CSSProperties } from 'react';
import { gsap } from 'gsap';
import { Box, Lock, Search, Settings, Sparkles } from "lucide-react";
import './MagicBento.css';
import { GlowingEffect } from './ui/glowing-effect';
import { cn } from '@/lib/utils';

const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '0, 219, 255'; // Using a cyan color to match the theme instead of purple
const MOBILE_BREAKPOINT = 768;

interface CardData {
    title: string;
    description: string;
    icon: ReactNode;
    area: string;
}

export const cardData: CardData[] = [
    {
        area: "md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]",
        icon: <Box className="h-4 w-4 text-neutral-400" />,
        title: "Quantum Encryption",
        description: "End-to-end secure messaging with post-quantum protocols. Beyond military grade.",
    },
    {
        area: "md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]",
        icon: <Settings className="h-4 w-4 text-neutral-400" />,
        title: "Stealth Stealth",
        description: "Zero metadata footprint. No logs, no trace, no compromises on your privacy.",
    },
    {
        area: "md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]",
        icon: <Lock className="h-4 w-4 text-neutral-400" />,
        title: "Zero Knowledge",
        description: "We never see your keys. Architecture built on top of mathematical certainty.",
    },
    {
        area: "md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]",
        icon: <Sparkles className="h-4 w-4 text-neutral-400" />,
        title: "Adaptive Interface",
        description: "Fluid, immersive experience that responds to your presence and interactions.",
    },
    {
        area: "md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]",
        icon: <Search className="h-4 w-4 text-neutral-400" />,
        title: "Private Sync",
        description: "Your data stays on your devices. Synchronize securely across all platforms.",
    },
];


interface ParticleCardProps {
    children: ReactNode;
    className?: string;
    disableAnimations?: boolean;
    style?: CSSProperties;
    glowColor?: string;
    enableTilt?: boolean;
    clickEffect?: boolean;
    enableMagnetism?: boolean;
}

export const ParticleCard = ({
    children,
    className = '',
    disableAnimations = false,
    style,
    glowColor = DEFAULT_GLOW_COLOR,
    enableTilt = true,
    clickEffect = true,
    enableMagnetism = false
}: ParticleCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

    useEffect(() => {
        if (disableAnimations || !cardRef.current) return;

        const element = cardRef.current;

        const handleMouseEnter = () => {
            gsap.to(element, {
                scale: 1.01,
                duration: 0.3,
                ease: 'power2.out',
                zIndex: 10
            });
        };

        const handleMouseLeave = () => {
            gsap.to(element, {
                scale: 1,
                rotateX: 0,
                rotateY: 0,
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
                zIndex: 1
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!enableTilt && !enableMagnetism) return;

            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            if (enableTilt) {
                const rotateX = ((y - centerY) / centerY) * -10;
                const rotateY = ((x - centerX) / centerX) * 10;

                gsap.to(element, {
                    rotateX,
                    rotateY,
                    duration: 0.1,
                    ease: 'power2.out',
                    transformPerspective: 1000
                });
            }

            if (enableMagnetism) {
                const magnetX = (x - centerX) * 0.05;
                const magnetY = (y - centerY) * 0.05;

                magnetismAnimationRef.current = gsap.to(element, {
                    x: magnetX,
                    y: magnetY,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (!clickEffect) return;

            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(${glowColor}, 0.5);
                box-shadow: 0 0 15px rgba(${glowColor}, 0.5);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                z-index: 1000;
                opacity: 1;
            `;

            element.appendChild(ripple);

            gsap.to(ripple, {
                scale: 100,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                onComplete: () => ripple.remove()
            });
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('click', handleClick);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('click', handleClick);
            magnetismAnimationRef.current?.kill();
        };
    }, [disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

    return (
        <div
            ref={cardRef}
            className={cn("relative", className)}
            style={style}
        >
            <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
            />
            {children}
        </div>
    );
};


const BentoCardGrid = ({ children, gridRef }: { children: ReactNode, gridRef: React.RefObject<HTMLDivElement> }) => (
    <div className="card-grid bento-section" ref={gridRef}>
        {children}
    </div>
);

const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

export interface MagicBentoProps {
    textAutoHide?: boolean;
    enableBorderGlow?: boolean;
    disableAnimations?: boolean;
    spotlightRadius?: number;
    enableTilt?: boolean;
    glowColor?: string;
    clickEffect?: boolean;
    enableMagnetism?: boolean;
    items?: CardData[];
}

const MagicBento = ({
    disableAnimations = false,
    glowColor = DEFAULT_GLOW_COLOR,
    enableTilt = false,
    clickEffect = true,
    enableMagnetism = true,
    items = cardData
}: MagicBentoProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const isMobile = useMobileDetection();
    const shouldDisableAnimations = disableAnimations || isMobile;

    return (
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2 w-full list-none p-0 m-0">
            {items.map((item, index) => (
                <li key={index} className={cn("min-h-[14rem] list-none", item.area)}>
                    <ParticleCard
                        disableAnimations={shouldDisableAnimations}
                        glowColor={glowColor}
                        enableTilt={enableTilt}
                        clickEffect={clickEffect}
                        enableMagnetism={enableMagnetism}
                        className="h-full rounded-2xl border border-white/10 p-2 md:rounded-3xl md:p-3 bg-black/10 backdrop-blur-md"
                    >
                        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-[#0A0F19]/60 border border-white/5 h-full">
                            <div className="relative flex flex-1 flex-col justify-between gap-3 h-full">
                                <div className="w-fit rounded-lg border border-white/10 bg-white/5 p-2 relative z-10 pointer-events-none">
                                    {item.icon}
                                </div>
                                <div className="space-y-3 relative z-10 pointer-events-none">
                                    <h3 className="text-xl font-bold tracking-tight text-white md:text-2xl font-display">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-neutral-400 md:text-base leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ParticleCard>
                </li>
            ))}
        </ul>
    );
};

export default MagicBento;
