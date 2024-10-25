"use client";
import Left from "@/components/Left";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Map from "@/components/Map";
import Loading from "@/components/Loading";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function Home() {
    const [data, setData] = useState<{ [key: string]: BuildingData }>({}); // Cambiato a BuildingData
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
    
                            const fetchedData = await res.json();
    
                            // Imposta i dati direttamente come oggetto di tipo BuildingData
                            setData(fetchedData);
    
                            // TODO : rimuovi 
                            console.log("Data fetched:", fetchedData);
                        } catch (error) {
                            console.error("Failed to fetch data from backend:", error);
                        } finally {
                            setLoading(false);
                        }
                    },
                    async (error) => {
                        console.error("Error fetching location here:", error);
    
                        const res = await fetch("/api/open-classrooms");
                        const defaultData = await res.json();
    
                        // Imposta i dati di default direttamente come oggetto di tipo BuildingData
                        setData(defaultData);
    
                        console.log("Default data (no location):", defaultData);
                        setLoading(false);
                    }
                );
            } else {
                console.error("Geolocation is not supported by this browser.");
                const res = await fetch("/api/open-classrooms", {
                    method: "GET",
                });
                const defaultData = await res.json();
    
                // Imposta i dati di default direttamente come oggetto di tipo BuildingData
                setData(defaultData);
    
                console.log("Default data (no geolocation):", defaultData);
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
                        src={"/logo.svg"}
                        width={200}
                        height={200}
                        alt="Logo"
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
                            src={"/logo.svg"}
                            width={180}
                            height={200}
                            alt="Logo"
                        />
                        <Alert className="h-fit text-pretty w-40">
                            <AlertDescription>
                                Availability may differ during exam period
                            </AlertDescription>
                        </Alert>
                    </div>
                    <Left
                        data={data} // TODO : modifica
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
