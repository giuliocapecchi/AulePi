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

    const [center, setCenter] = useState<[number, number]>([10.3880886, 43.7207943]);
    const [zoom, setZoom] = useState(16.25);
    const [pitch, setPitch] = useState(52);

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    function getColorByStatus(status: boolean, isClosed: boolean) {
        if (status && !isClosed) {
                return "h-3 w-3 rounded-full bg-green-400 shadow-[0px_0px_4px_2px_rgba(34,197,94,0.7)]";
        }else if(!status && !isClosed){
                return "h-3 w-3 rounded-full bg-red-400 shadow-[0px_0px_4px_2px_rgba(239,68,68,0.9)]";
        }else{
            return "h-3 w-3 rounded-full bg-orange-400 shadow-[0px_0px_4px_2px_rgba(239,68,68,0.9)]";
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

        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([buildingCode, building]) => {
                const el = document.createElement("div");
                el.className = "relative"; // Use relative positioning for the marker

                // Create the marker circle
                const markerCircle = document.createElement("div");
                markerCircle.className = getColorByStatus(building.free as boolean, building.isClosed as boolean);
                el.appendChild(markerCircle);

                // Create the label
                const label = document.createElement("div");
                label.className = "absolute bottom-full mb-2 text-black text-sm bg-white/50 min-w-[60px] text-center p-1 rounded"; // Adjusted styles
                label.innerText = buildingCode.replace("polo", "Polo "); // Adjust the label text as needed
                el.appendChild(label);

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

                if (mapRef.current && building.coordinates) {
                    new mapboxgl.Marker(el)
                        .setLngLat(building.coordinates as [number, number])
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
                    <div className="h-2 w-2 rounded-full bg-orange-400 flex-none"></div>
                    <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-orange-700/30 text-red-300/90">
                        closed
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
