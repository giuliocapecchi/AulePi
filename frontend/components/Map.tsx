"use client";
import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Lesson {
    start: string; 
    end: string;
    status: string;
}

interface Room {
    roomNumber: string;
    lessons: Lesson[]; 
}

interface BuildingData {
    building: string;
    building_code: string;
    building_status: string;
    rooms: {
        [key: string]: Room;
    };
    coords: [number, number];
    distance: number;
}

export default function Map({
    data,
    handleMarkerClick,
    userPos,
}: {
    data: { [key: string]: BuildingData }; // Cambiato per accettare un oggetto
    handleMarkerClick: (building: string) => void;
    userPos: [number, number] | null; // Specificato il tipo per userPos
}) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const [center, setCenter] = useState<[number, number]>([10.3880886, 43.7207943]); // Coordinate del Polo A
    const [zoom, setZoom] = useState(16.25);
    const [pitch, setPitch] = useState(52);

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    function getColorByStatus(status: string) {
        switch (status) {
            case "available":
                return "h-2 w-2 rounded-full bg-green-400 shadow-[0px_0px_4px_2px_rgba(34,197,94,0.7)]";
            case "unavailable":
                return "h-2 w-2 rounded-full bg-red-400 shadow-[0px_0px_4px_2px_rgba(239,68,68,0.9)]";
            default:
                return "gray";
        }
    }

    useEffect(() => {
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

        // Controlla se data è un oggetto
        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([buildingCode, building]) => {
                const el = document.createElement("div");
                el.className = getColorByStatus(building.building_status);

                el.addEventListener("click", () => {
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
                });

                // Mi assicuro di avere le coordinate
                if (mapRef.current && building.coords) {
                    new mapboxgl.Marker(el)
                        .setLngLat([building.coords[0], building.coords[1]])
                        .addTo(mapRef.current);
                }
            });
        } else {
            console.error("Data is not an object:", data);
        }

        if (userPos) {
            const e2 = document.createElement("div");
            e2.className =
                "h-3 w-3 border-[1.5px] border-zinc-50 rounded-full bg-blue-400 shadow-[0px_0px_4px_2px_rgba(14,165,233,1)]";

            new mapboxgl.Marker(e2)
                .setLngLat([userPos[1], userPos[0]])
                .addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
            }
        };
    }, [data, userPos]);

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
                        free room 
                    </div>
                </div>
                <div className="flex items-center gap-0">
                    <div className="h-2 w-2 rounded-full bg-red-400 flex-none"></div>
                    <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-red-700/30 text-red-300/90">
                        unavailable
                    </div>
                </div>
            </div>
        </div>
    );
}
