"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";
import { HashBrownsLoader } from "../loaders/hash-browns-loader";

export function ThreeSixtyImage({image}) {
    const containerRef = useRef(null);
    const animationFrameId = useRef(null);
    const [activeAnnotation, setActiveAnnotation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    const annotations = [
        // { id: "door", position: new THREE.Vector3(0, 0, -200), label: "Door", size: 1 },
        // { id: "stereo", position: new THREE.Vector3(100, 50, -150), label: "Stereo", size: 0.4 },
    ];

    // Function to handle annotation clicks
    const handleAnnotationClick = (id, event) => {
        event.stopPropagation(); // Prevent click from triggering the global listener
        setActiveAnnotation((prev) => (prev === id ? null : id));
    };

    // Function to close all annotations when clicking outside
    const handleOutsideClick = () => {
        setActiveAnnotation(null);
    };

    // Always use the proxy for remote images
    const getImageUrl = (url) => {
        if (url.startsWith('http')) {
            return `/api/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !image) return;

        // Reset states
        setIsLoading(true);
        setError(null);

        // Scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 0.1); // Inside sphere

        // WebGL Renderer (for the 360 image)
        const webGLRenderer = new THREE.WebGLRenderer({ antialias: true });
        webGLRenderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(webGLRenderer.domElement);

        // CSS3D Renderer (for the annotations)
        const cssRenderer = new CSS3DRenderer();
        cssRenderer.setSize(container.clientWidth, container.clientHeight);
        cssRenderer.domElement.style.position = "absolute";
        cssRenderer.domElement.style.top = "0";
        cssRenderer.domElement.style.left = "0";
        cssRenderer.domElement.style.pointerEvents = "none"; // Allow interactions to pass through
        container.appendChild(cssRenderer.domElement);

        // 360 Image Sphere
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);
        const textureLoader = new THREE.TextureLoader();
        
        // Set crossOrigin for remote images
        textureLoader.crossOrigin = "anonymous";
        
        // Get the appropriate image URL
        const imageUrl = getImageUrl(image);
        console.log("🖼️ Loading image from:", imageUrl);
        
        textureLoader.load(
            imageUrl,
            (texture) => {
                console.log("✅ Texture Loaded Successfully!");

                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
                texture.needsUpdate = true;

                // 🌟 Apply Texture to Sphere
                const geometry = new THREE.SphereGeometry(500, 200, 200); // Higher subdivisions for smooth texture
                geometry.scale(-1, 1, 1);

                const material = new THREE.MeshBasicMaterial({ map: texture });
                const sphereMesh = new THREE.Mesh(geometry, material);
                scene.add(sphereMesh);
                
                setIsLoading(false);
            },
            (progress) => {
                console.log("📈 Loading progress:", (progress.loaded / progress.total * 100) + "%");
            },
            (error) => {
                console.error("🚨 Texture Load Error:", error);
                setError("Failed to load image. Please check the URL and try again.");
                setIsLoading(false);
            }
        );

        // Orbit Controls
        const controls = new OrbitControls(camera, webGLRenderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.rotateSpeed = -0.2;

        // Gently auto-rotate until the user grabs the image
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        const handleFirstInteraction = () => {
            controls.autoRotate = false;
            setHasInteracted(true);
        };
        controls.addEventListener("start", handleFirstInteraction);

        // Create and add annotations as CSS3DObjects
        const annotationGroup = new THREE.Group();
        annotations.forEach((point) => {
            const div = document.createElement("div");
            div.className = "annotation";
            div.style.pointerEvents = "auto"; // Allow clicks only on annotations
            div.style.position = "relative"; // Keep icon stable

            // Define sizes based on the `size` property
            const iconSize = 24 * point.size; // Scale icon
            const textSize = 14 * point.size; // Scale text
            const textPadding = `${6 * point.size}px ${12 * point.size}px`; // Scale padding

            // 🔥 Keep a **fixed minimum gap** and scale appropriately
            const labelOffset = iconSize * 1.2; // Always 1.2× the icon's height for clearance

            // Create FontAwesome icon inside a div wrapper
            div.innerHTML = `
<div style="display: flex; flex-direction: column; align-items: center; position: relative;">
<!-- FontAwesome Icon (Click to toggle annotation) -->
<div id="dot-${point.id}" style="cursor: pointer; width: ${iconSize}px; height: ${iconSize}px;">
<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 512 512" fill="#00bfff">
<path d="M256 64c106 0 192 86 192 192s-86 192-192 192S64 362 64 256 150 64 256 64zm0-64C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 224c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32v-64c0-17.7-14.3-32-32-32zm0-64c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z"/>
</svg>
</div>

<!-- Annotation Label (Appears Above) -->
<span id="label-${point.id}" style="display: none; position: absolute; bottom: ${labelOffset}px; background: rgba(0, 0, 0, 0.7); color: white; padding: ${textPadding}; border-radius: 6px; font-size: ${textSize}px; white-space: nowrap;">
${point.label}
</span>
</div>
`;

            // Attach event listener for toggling
            div.querySelector(`#dot-${point.id}`).addEventListener("click", (event) => handleAnnotationClick(point.id, event));

            const annotationObject = new CSS3DObject(div);
            annotationObject.position.copy(point.position);

            // Apply individual scaling based on `size` property
            annotationObject.scale.setScalar(point.size);

            annotationGroup.add(annotationObject);
        });
        scene.add(annotationGroup);

        // Add global event listener for outside clicks
        window.addEventListener("click", handleOutsideClick);

        // Animation loop
        function animate() {
            controls.update();
            webGLRenderer.render(scene, camera);
            cssRenderer.render(scene, camera);
            animationFrameId.current = requestAnimationFrame(animate);
        }
        animate();

        // Cleanup
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            window.removeEventListener("click", handleOutsideClick);
            controls.removeEventListener("start", handleFirstInteraction);
            if (container) {
                if (webGLRenderer.domElement.parentNode === container) {
                    container.removeChild(webGLRenderer.domElement);
                }
                if (cssRenderer.domElement.parentNode === container) {
                    container.removeChild(cssRenderer.domElement);
                }
            }
            webGLRenderer.dispose();
        };
    }, [image]); // Add image to dependency array

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

            {/* Hidden Labels Controlled by State */}
            {annotations.map((annotation) => (
                <style key={annotation.id}>
                    {`
#label-${annotation.id} {
display: ${activeAnnotation === annotation.id ? "block" : "none"} !important;
}
`}
                </style>
            ))}
        </div>
    );
}
