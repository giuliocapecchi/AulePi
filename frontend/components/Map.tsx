"use client";
import React, { memo, useRef, useEffect, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { BuildingData } from "@/types/interfaces";

let mapboxPromise: Promise<typeof import("mapbox-gl")["default"]> | undefined;

const loadMapboxGL = () => {
    if (!mapboxPromise) {
        mapboxPromise = import("mapbox-gl").then((module) => module.default).catch((error) => {
            mapboxPromise = undefined;
            throw error;
        });
    }
    return mapboxPromise;
};

function getColorByStatus(building: BuildingData) {
    if (building.free && !building.isClosed) return "h-3 w-3 rounded-full bg-green-400 shadow-[0px_0px_4px_2px_rgba(34,197,94,0.7)]";
    if (building.buildingAvailableSoon && !building.isClosed) return "h-3 w-3 rounded-full bg-orange-500 shadow-[0px_0px_4px_2px rgba(255,165,0,0.7)]";
    return "h-3 w-3 rounded-full bg-red-400 shadow-[0px_0px_4px_2px rgba(239,68,68,0.9)]";
}

function Map({ data, handleMarkerClick, userPos }: {
    data: { [key: string]: BuildingData };
    handleMarkerClick: (building: string) => void;
    userPos: [number, number] | null;
}) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const initialUserPos = useRef(userPos);
    const [map, setMap] = useState<MapboxMap | null>(null);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    useEffect(() => {
        if (!mapboxToken) { console.error("Mapbox token is not defined"); return; }
        let disposed = false;
        let instance: MapboxMap | undefined;
        void loadMapboxGL().then((mapboxModule) => {
            if (disposed || !mapContainerRef.current) return;
            const position = initialUserPos.current;
            const inPisa = position && position[0] >= 43.7072 && position[0] <= 43.7366 && position[1] >= 10.3643 && position[1] <= 10.4271;
            mapboxModule.accessToken = mapboxToken;
            instance = new mapboxModule.Map({
                style: "mapbox://styles/giuliocape/cm2n7u82b003701piec8z517h",
                container: mapContainerRef.current,
                center: inPisa ? [position[1], position[0]] : window.innerWidth < 768 ? [10.391578, 43.718735] : [10.395310, 43.716592],
                zoom: 16,
                pitch: 69.97,
                maxBounds: [[10.3789, 43.7067], [10.4185, 43.7257]],
            });
            setMap(instance);
        }).catch((error) => { if (!disposed) console.error("Errore durante il caricamento della mappa:", error); });
        return () => { disposed = true; instance?.remove(); };
    }, [mapboxToken]);

    // Markers depend on both resources, regardless of whether the data or the
    // asynchronous map import finishes first. No style.load listeners accumulate.
    useEffect(() => {
        if (!map) return;
        let disposed = false;
        const markers: MapboxMarker[] = [];
        void loadMapboxGL().then((mapboxModule) => {
            if (disposed) return;
            for (const [buildingCode, building] of Object.entries(data)) {
                if (!building.coordinates) continue;
                const element = document.createElement("div");
                element.className = "relative";
                const circle = document.createElement("div");
                circle.className = getColorByStatus(building);
                const label = document.createElement("div");
                label.className = "absolute bottom-full mb-2 text-black text-sm bg-white/50 min-w-[60px] text-center p-1 rounded";
                label.innerText = buildingCode.replace("polo", "Polo ");
                element.append(circle, label);
                element.addEventListener("click", () => { if (!building.isClosed) handleMarkerClick(buildingCode); });
                markers.push(new mapboxModule.Marker(element).setLngLat(building.coordinates).addTo(map));
            }
        }).catch((error) => { if (!disposed) console.error("Failed to add map markers:", error); });
        return () => { disposed = true; markers.forEach((marker) => marker.remove()); };
    }, [map, data, handleMarkerClick]);

    useEffect(() => {
        if (!map || !userPos) return;
        let disposed = false;
        let marker: MapboxMarker | undefined;
        void loadMapboxGL().then((mapboxModule) => {
            if (disposed) return;
            const element = document.createElement("div");
            element.className = "h-3 w-3 border-[1.5px] border-zinc-50 rounded-full bg-blue-400 shadow-[0px_0px_4px_2px rgba(14,165,233,1)]";
            marker = new mapboxModule.Marker(element).setLngLat([userPos[1], userPos[0]]).addTo(map);
        }).catch((error) => { if (!disposed) console.error("Failed to position user:", error); });
        return () => { disposed = true; marker?.remove(); };
    }, [map, userPos]);

    return (
        <div className="h-[60vh] sm:w-full sm:h-full relative bg-red-500/0 rounded-[20px] p-2 sm:p-0">
            <div
                id="map-container"
                ref={mapContainerRef}
                className="w-full h-full"
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

export default memo(Map);
