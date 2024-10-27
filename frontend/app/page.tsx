"use client";
import Left from "@/components/Left";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Map from "@/components/Map";
import Loading from "@/components/Loading";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BuildingData } from "@/types/interfaces";
import { Analytics } from "@vercel/analytics/react"


export default function Home() {
    const [data, setData] = useState<{ [key: string]: BuildingData }>({});
    const [activeBuilding, setActiveBuilding] = useState<string | null>(null);
    const [userPos, setUserPos] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);

    const handleMarkerClick = (building: string) => {
        setActiveBuilding(building);
    };

    useEffect(() => {
        const fetchLocationAndData = async () => {
            setLoading(true);
    
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserPos([latitude, longitude]);
    
                        try {
                            const res = await fetch("/api/open-classrooms", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    lat: latitude,
                                    lng: longitude,
                                }),
                            });

                            // Controlla se la risposta non è 200
                            if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.error || 'Unknown error occurred');
                            }

                        
    
                            const fetchedData: { [key: string]: BuildingData } = await res.json();
                            
                            // Set isClosed for each building
                            const updatedData = Object.fromEntries(
                                Object.entries(fetchedData).map(([buildingCode, buildingData]) => [
                                    buildingCode,
                                    {
                                        ...buildingData,
                                        isClosed: isBuildingClosed(buildingCode),
                                    },
                                ])
                            );
                            
                            setData(updatedData);
                        } catch (error) {
                            console.error("Failed to fetch data from backend:", error);
                        } finally {
                            setLoading(false);
                        }
                    },
                    async () => {
                        const res = await fetch("/api/open-classrooms");
                        const defaultData: { [key: string]: BuildingData } = await res.json();
                        setData(defaultData);
                        setLoading(false);
                    }
                );
            } else {
                const res = await fetch("/api/open-classrooms", {
                    method: "GET",
                });
                const defaultData: { [key: string]: BuildingData } = await res.json();
                setData(defaultData);
                setLoading(false);
            }
        };
    
        fetchLocationAndData();
    }, []);
    
    if (loading) {
        return <Loading />;
    }

    return (
        <main className="flex flex-col sm:flex-row sm:gap-4 h-screen">
            <div className="basis-2/5 sm:h-full order-last sm:order-first py-4 sm:px-0 sm:py-2 overflow-hidden sm:flex sm:flex-col">
                <div className="w-full h-20 pl-8 pr-4 hidden sm:flex sm:justify-between items-center">
                    <Image
                        src={"/logo.png"}
                        width="0"
                        height="0"
                        sizes="100vw"
                        style={{ width: '200px', height: 'auto' }}
                        alt="Logo"
                        priority = {true}
                    />
                    <Alert className="h-fit text-pretty w-40">
                        <AlertDescription>
                            Availability may differ during exam period
                        </AlertDescription>
                    </Alert>
                </div>
                <ScrollArea className="h-full">
                    <div className="w-full h-20 pl-8 pr-4 flex sm:hidden justify-between items-center">
                        <Image
                            src={"/logo.png"}
                            width="0"
                            height="0"
                            sizes="100vw"
                            style={{ width: '200px', height: 'auto' }}
                            alt="Logo"
                            priority = {true}
                        />
                        <Alert className="h-fit text-pretty w-40">
                            <AlertDescription>
                                Availability may differ during exam period
                            </AlertDescription>
                        </Alert>
                    </div>
                    <Left
                        data={data}
                        activeBuilding={activeBuilding}
                        setActiveBuilding={setActiveBuilding}
                    />
                </ScrollArea>
            </div>
            <div className="h-[60vh] basis-3/5 sm:h-screen">
                <Map
                    data={data}
                    handleMarkerClick={handleMarkerClick}
                    userPos={userPos}
                />
            </div>
        </main>
    );
}


function isBuildingClosed(buildingCode: string) {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato

    // domenica chiusi tutti i poli tranne poloF e poloPN che fanno 8.30 - 24
    if (currentDay === 0 && !(buildingCode === 'poloF' || buildingCode === 'poloPN')) {
        return true;
    } else if (currentDay === 0 && (buildingCode === 'poloF' || buildingCode === 'poloPN')) {
        return currentHour < 8 || currentHour >= 24;
    }

    // sabato poloA e poloB hanno come orario 7.30 - 14
    if (currentDay === 6 && (buildingCode === 'poloA' || buildingCode === 'poloB')) {
        return currentHour < 7 || currentHour >= 14;
    }

    // il poloC di sabato ha come orario 8 - 13
    if (currentDay === 6 && buildingCode === 'poloC') {
        return currentHour < 8 || currentHour >= 13;
    }

    // poloA e poloB da lunedì a venerdì hanno come orario 7.30 - 20
    if (currentDay >= 1 && currentDay <= 5 && (buildingCode === 'poloA' || buildingCode === 'poloB')) {
        return currentHour < 7 || currentHour >= 20;
    }


    // polo C da lunedì a venerdì ha come orario 7.30 - 19.39
    if (currentDay >= 1 && currentDay <= 5 && buildingCode === 'poloC') {
        return currentHour < 7 || currentHour >= 19;
    }

    // poloF e poloPN sono aperti sono aperti dalle 8 alle 24 dal lunedì al sabato
    if (currentDay >= 1 && currentDay <= 6 && (buildingCode === 'poloF' || buildingCode === 'poloPN')) {
        return currentHour < 8 || currentHour >= 24;
    }

    return false;
}
