"use client";
import Left from "@/components/Left";
import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Map from "@/components/Map";
import Loading from "@/components/Loading";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BuildingData } from "@/types/interfaces";

export default function Home() {
    const [data, setData] = useState<{ [key: string]: BuildingData }>({});
    const [activeBuilding, setActiveBuilding] = useState<string | null>(null);
    const [userPos, setUserPos] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);

    const handleMarkerClick = useCallback((building: string) => {
        setActiveBuilding((current) => current === building ? null : building);
        requestAnimationFrame(() => {
            // Desktop and mobile lists share building codes. Only scroll the
            // visible list; hidden desktop elements have no client rectangles.
            const element = Array.from(document.querySelectorAll<HTMLElement>("[data-building-code]"))
                .find((element) => element.dataset.buildingCode === building && element.getClientRects().length > 0);
            element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                if (!controller.signal.aborted) setUserPos([position.coords.latitude, position.coords.longitude]);
            });
        }
        const fetchData = async () => {
            try {
                const res = await fetch("/api/open-classrooms", { signal: controller.signal });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Unknown error occurred");
                }
                const result: { [key: string]: BuildingData } = await res.json();
                if (!controller.signal.aborted) setData(result);
            } catch (error) {
                if (!controller.signal.aborted) console.error("Failed to fetch data from backend:", error);
            } finally {
                // Reveal the existing UI as soon as data arrives, without an
                // additional 500 ms delay after the request completes.
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void fetchData();
        return () => controller.abort();
    }, []);

    return (
        <>
        {loading && <Loading fadeOut={false} />}
        <main className="flex flex-col sm:flex-row sm:gap-4 h-screen">
            <div className="basis-2/5 sm:h-full order-last sm:order-first py-4 sm:px-0 sm:py-2 flex flex-col">
                <div className="w-full h-20 pl-8 pr-4 flex justify-between items-center space-x-2">
                    <Image
                        src={"/logo.png"}
                        width="0"
                        height="0"
                        sizes="100vw"
                        style={{ width: 'auto', height: '93%' }}
                        alt="Logo"
                        priority
                    />
                    <Alert className="h-fit text-pretty w-40">
                        <AlertDescription>
                            Availability may differ during exam period
                        </AlertDescription>
                    </Alert>
                </div>
                {/* Sezione ScrollArea per desktop */}
                <div className="hidden sm:flex flex-col h-full overflow-hidden">
                    <ScrollArea className="flex-grow overflow-auto">
                        <Left
                            data={data}
                            activeBuilding={activeBuilding}
                            setActiveBuilding={setActiveBuilding}
                        />
                    </ScrollArea>
                </div>

                {/* Sezione senza scroll-area per mobile */}
                <div className="sm:hidden flex-grow overflow-auto">
                    <Left
                        data={data}
                        activeBuilding={activeBuilding}
                        setActiveBuilding={setActiveBuilding}
                    />
                </div>
            </div>
            <div className="h-[60vh] basis-3/5 sm:h-screen">
                <Map
                    data={data}
                    handleMarkerClick={handleMarkerClick}
                    userPos={userPos}
                />
            </div>
        </main>
        </>
    );
}