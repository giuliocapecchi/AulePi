"use client";
import Left from "@/components/Left";
import { useEffect, useState, useRef } from "react"; // Aggiunto useRef
import { ScrollArea } from "@/components/ui/scroll-area";
import Map from "@/components/Map";
import Loading from "@/components/Loading";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BuildingData } from "@/types/interfaces";
import { Analytics } from "@vercel/analytics/react"; // Import the Analytics component for Vercel Analytics

export default function Home() {
    const [data, setData] = useState<{ [key: string]: BuildingData }>({});
    const [activeBuilding, setActiveBuilding] = useState<string | null>(null);
    const [userPos, setUserPos] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const leftRef = useRef<HTMLDivElement>(null); // Riferimento per il componente Left
    const hasFetched = useRef(false);

    const handleMarkerClick = (building: string) => {
        // If the building is already active, we toggle it off
        if (activeBuilding === building) {
            setActiveBuilding(null); // Close the accordion
        } else {
            setActiveBuilding(building); // Open the accordion
            scrollToBuilding(building); // Scroll to the building
        }
    };

    const scrollToBuilding = (building: string) => {
        if (leftRef.current) {
            const element = leftRef.current.querySelector(`[data-building-code="${building}"]`);
            if (element) {
                const elementPosition = element.getBoundingClientRect().top + window.scrollY; // Position of the element
                const headerOffset = 48; // Can be adjusted for future needings
                const offsetPosition = elementPosition - headerOffset; // Scroll position

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                });
            }
        }
    };

    useEffect(() => {
        
        const fetchLocationAndData = async () => {

            if (hasFetched.current) {
                console.log("Already fetched location and data");
                return;
            }
            console.log("Fetching location and data for the first time");
            hasFetched.current = true;

            setLoading(true);

            // if (navigator.geolocation) { // Se il browser supporta la geolocalizzazione
            if (2 % 2 == 1) { // TODO : rimuovi
                console.log("Geolocation is supported by this browser");
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
            } else { // Se il browser non supporta la geolocalizzazione
                console.log("Geolocation is not supported by this browser");
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
            <div className="basis-2/5 sm:h-full order-last sm:order-first py-4 sm:px-0 sm:py-2 flex flex-col">
                <div className="w-full h-20 pl-8 pr-4 flex justify-between items-center space-x-2">
                    <Image
                        src={"/logo.png"}
                        width="0"
                        height="0"
                        sizes="100vw"
                        style={{ width: 'auto', height: '93%' }}
                        alt="Logo"
                        priority={true}
                        fetchPriority="high"
                    />
                    <Alert className="h-fit text-pretty w-40">
                        <AlertDescription>
                            Availability may differ during exam period
                        </AlertDescription>
                    </Alert>
                </div>
                {/* Sezione ScrollArea per desktop */}
                <div className="hidden sm:flex flex-col h-full overflow-hidden" ref={leftRef}>
                    <ScrollArea className="flex-grow overflow-auto">
                        <Left
                            data={data}
                            activeBuilding={activeBuilding}
                            setActiveBuilding={setActiveBuilding}
                        />
                    </ScrollArea>
                </div>

                {/* Sezione senza scroll-area per mobile */}
                <div className="sm:hidden flex-grow overflow-auto" ref={leftRef}>
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

    // poloF e poloPN sono aperti solo dalle 8 alle 24 dal lunedì al sabato
    if (currentDay >= 1 && currentDay <= 6 && (buildingCode === 'poloF' || buildingCode === 'poloPN')) {
        return currentHour < 8 || currentHour >= 24;
    }

    return false;
}
