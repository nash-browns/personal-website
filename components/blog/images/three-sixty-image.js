"use client";

import { useEffect, useRef, useState } from "react";
import { createPanoramaViewer } from "./create-panorama-viewer.mjs";
import { HashBrownsLoader } from "../loaders/hash-browns-loader";

export function ThreeSixtyImage({image}) {
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        if (!containerRef.current || !image) return;
        setIsLoading(true);
        setError(null);
        setHasInteracted(false);

        return createPanoramaViewer(containerRef.current, image, {
            onLoad: () => setIsLoading(false),
            onInteract: () => setHasInteracted(true),
            onError: () => {
                setError("Unable to display this 360° image. Please try reloading the page.");
                setIsLoading(false);
            },
        });
    }, [image]);

    return (
        <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
            {/* Loading State */}
            {isLoading && (
                <HashBrownsLoader loadingText={'360° Image'} color={'white'}/>
            )}
            
            {/* Error State */}
            {error && (
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                    background: "rgba(255, 0, 0, 0.8)",
                    color: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    textAlign: "center"
                }}>
                    {error}
                </div>
            )}
            
            {/* 360° drag hint — fades out after the first click-and-drag */}
            {!isLoading && !error && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 5,
                        opacity: hasInteracted ? 0 : 0.55,
                        transition: "opacity 0.6s ease",
                    }}
                >
                    <svg
                        width="140"
                        height="140"
                        viewBox="0 0 120 120"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        style={{ filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.55))" }}
                    >
                        <circle cx="60" cy="60" r="52" />
                        <ellipse cx="60" cy="60" rx="24" ry="52" />
                        <ellipse cx="60" cy="60" rx="44" ry="52" />
                        <ellipse cx="60" cy="60" rx="52" ry="20" />
                        <ellipse cx="60" cy="60" rx="52" ry="38" />
                        <text
                            x="60"
                            y="60"
                            textAnchor="middle"
                            dominantBaseline="central"
                            stroke="none"
                            fill="white"
                            fontSize="26"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                            style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 5 }}
                        >
                            360°
                        </text>
                    </svg>
                </div>
            )}

        </div>
    );
}
