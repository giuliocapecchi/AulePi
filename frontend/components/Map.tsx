"use client";
import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { BuildingData } from "@/types/interfaces";

export default function Map({
    data,
    handleMarkerClick,
    userPos,
}: {
    data: { [key: string]: BuildingData };
    handleMarkerClick: (building: string) => void;
    userPos: [number, number] | null;
}) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    
    const isUserInPisa = (position: [number, number]): boolean => {
        const [latitude, longitude] = position;

        // Confini di Pisa
        const pisaBounds = {
            north: 43.7366,
            south: 43.7072,
            east: 10.4271,
            west: 10.3643,
        };

        return (
            latitude >= pisaBounds.south &&
            latitude <= pisaBounds.north &&
            longitude >= pisaBounds.west &&
            longitude <= pisaBounds.east
        );
    };

    // Calcolo iniziale del centro mappa
    const initialCenter: [number, number] = userPos && isUserInPisa(userPos)
        ? [userPos[1], userPos[0]]
        : window.innerWidth < 768
            ? [10.391578, 43.718735] // Centro per dispositivi mobili
            : [10.395310, 43.716592]; // Centro per dispositivi desktop

    const [center, setCenter] = useState<[number, number]>(initialCenter);
    
    // Imposta lo stato di zoom in base alla larghezza della finestra
    const [zoom, setZoom] = useState(window.innerWidth < 768 ? 16.0 : 16);
    const [pitch, setPitch] = useState(69.97);

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Funzione per ottenere il colore in base allo stato
    function getColorByStatus(free: boolean, isClosed: boolean, buildingAvailableSoon: boolean) {
        if (free && !isClosed) {
            return "h-3 w-3 rounded-full bg-green-400 shadow-[0px_0px_4px_2px_rgba(34,197,94,0.7)]";
        } else if (buildingAvailableSoon && !isClosed) {
            return "h-3 w-3 rounded-full bg-orange-500 shadow-[0px_0px_4px_2px rgba(255,165,0,0.7)]";
        } else {
            return "h-3 w-3 rounded-full bg-red-400 shadow-[0px_0px_4px_2px rgba(239,68,68,0.9)]";
        }
    }

    useEffect(() => {
        console.log("Rendering map...");
        if (mapboxToken) {
            mapboxgl.accessToken = mapboxToken;
        } else {
            console.error("Mapbox token is not defined");
        }

        mapRef.current = new mapboxgl.Map({
            style: "mapbox://styles/giuliocape/cm2n7u82b003701piec8z517h",
            container: mapContainerRef.current as HTMLElement,
            center: center,
            zoom: zoom,
            pitch: pitch,
        });

        // Gestisce il movimento della mappa
        mapRef.current.on("move", () => {
            if (mapRef.current) {
                const mapCenter = mapRef.current.getCenter();
                const mapZoom = mapRef.current.getZoom();
                const mapPitch = mapRef.current.getPitch();

                setCenter([mapCenter.lng, mapCenter.lat]);
                setZoom(mapZoom);
                setPitch(mapPitch);
            }
        });

        // Aggiungi i marker sulla mappa
        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([buildingCode, building]) => {
                const el = document.createElement("div");
                el.className = "relative";

                const markerCircle = document.createElement("div");
                markerCircle.className = getColorByStatus(building.free as boolean, building.isClosed as boolean, building.buildingAvailableSoon as boolean);
                el.appendChild(markerCircle);

                const label = document.createElement("div");
                label.className = "absolute bottom-full mb-2 text-black text-sm bg-white/50 min-w-[60px] text-center p-1 rounded";
                label.innerText = buildingCode.replace("polo", "Polo ");
                el.appendChild(label);

                el.addEventListener("click", () => {
                    if (!building.isClosed) {
                        const accordionItem = document.getElementById(buildingCode);
                        setTimeout(() => {
                            if (accordionItem) {
                                accordionItem.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                });
                            }
                        }, 300);
                        handleMarkerClick(buildingCode);
                    }
                });

                if (mapRef.current && building.coordinates) {
                    new mapboxgl.Marker(el)
                        .setLngLat(building.coordinates as [number, number])
                        .addTo(mapRef.current);
                }
            });
        } else {
            console.error("Data is not an object:", data);
        }
        console.log("Markers added to the map");

        // Aggiungi il marker per la posizione dell'utente
        if (userPos) {
            const e2 = document.createElement("div");
            e2.className =
                "h-3 w-3 border-[1.5px] border-zinc-50 rounded-full bg-blue-400 shadow-[0px_0px_4px_2px rgba(14,165,233,1)]";

            new mapboxgl.Marker(e2)
                .setLngLat([userPos[1], userPos[0]])
                .addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
            }
        };
    }, [mapboxToken]);

    return (
        <div className="h-[60vh] sm:w-full sm:h-full relative bg-red-500/0 rounded-[20px] p-2 sm:p-0">
            <div
                id="map-container"
                ref={mapContainerRef}
                className="opacity-100"
            />
            <div className="bg-[#18181b]/90 absolute bottom-10 left-2 sm:bottom-8 sm:left-0 flex flex-col gap-2 m-1 py-2.5 p-2 rounded-[16px]">
                <div className="flex items-center gap-0">
                    <div className="h-2 w-2 rounded-full bg-green-400 flex-none"></div>
                    <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-green-800/30 text-green-300/90">
                        available rooms
                    </div>
                </div>
                <div className="flex items-center gap-0">
                    <div className="h-2 w-2 rounded-full bg-orange-400 flex-none"></div>
                    <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-orange-700/30 text-orange-300/90">
                        available in <span className="italic">&lt; 30 mins</span>
                    </div>
                </div>
                <div className="flex items-center gap-0">
                    <div className="h-2 w-2 rounded-full bg-red-400 flex-none"></div>
                    <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-red-700/30 text-red-300/90">
                        unavailable now
                    </div>
                </div>
            </div>
        </div>
    );
}
