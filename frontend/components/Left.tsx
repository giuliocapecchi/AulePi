"use client";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface Lesson {
    end: string;
    professor: string;
    start: string;
    summary: string;
}

interface Room {
    free: boolean;
    lessons?: Lesson[];
}

interface BuildingData {
    [key: string]: Room | boolean | [number, number];
}

export default function Left({
    data,
    activeBuilding,
    setActiveBuilding,
}: {
    data: { [key: string]: BuildingData };
    activeBuilding: string | null;
    setActiveBuilding: (building: string) => void;
}) {
    return (
        <div className="px-8">
            <Accordion
                type="single"
                collapsible
                className="w-full"
                value={activeBuilding || ""}
                onValueChange={(val) => setActiveBuilding(val)}
            >
                {Object.entries(data).map(([buildingCode, building]) => {
                    const { label: divElem, isClosed } = getBuildingAvailability(buildingCode, building.free as boolean);
                    
                    return (
                        <AccordionItem
                            id={buildingCode}
                            value={buildingCode}
                            key={buildingCode}
                        >
                            <AccordionTrigger
                            disabled={isClosed}
                            isClosed={isClosed} // Passa la prop isClosed all'AccordionTrigger
                            >
                                <div className="flex justify-between w-[95%] text-left text-lg group items-center">
                                    <div className="group-hover:underline underline-offset-8 pr-2">
                                        Building - {buildingCode.replace("polo", "polo ")} 
                                    </div>
                                    <div className="flex items-center justify-end">
                                        
                                            {divElem}
                                        
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="divide-y divide-dashed divide-zinc-600">
                                {Object.entries(building).map(([roomNumber, room]) => {
                                    if (typeof room === "boolean" || Array.isArray(room)) {
                                        return null; // Ignora le proprietà non stanza
                                    }
                                    return (
                                        <div
                                            key={roomNumber}
                                            className="flex justify-between py-2 text-lg font-[family-name:var(--font-geist-mono)] text-[14px]"
                                        >
                                            <div className="flex gap-4 items-center h-[fit-content]">
                                                <div className="w-18">
                                                    {roomNumber}
                                                </div>
                                                <div className="relative">
                                                    {room.lessons && room.lessons.length > 0 ? (
                                                        <div className="h-2 w-2 rounded-full bg-red-400"></div>
                                                    ) : (
                                                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                                    )}
                                                </div>
                                            </div>
                                            <ul className="text-right">
                                                {room.lessons?.map((lesson, index) => (
                                                    <li key={index}>
                                                        {formatTime(lesson.start)} - {formatTime(lesson.end)} | {lesson.professor} 
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}



function formatTime(timeString: string) {
    const time = new Date(timeString);

    // Controlla se la data è valida
    if (isNaN(time.getTime())) {
        console.error(`Invalid time value: ${timeString}`);
        return "Invalid time"; // Restituisci un valore di default o un messaggio di errore
    }

    const options = {
        hour: "numeric" as "numeric",
        minute: "numeric" as "numeric",
        hour12: true,
    };

    return new Intl.DateTimeFormat("en-US", options).format(time);
}



// Funzione per ottenere la label colorata per un building, a seconda dello stato e dell'ora
function getBuildingAvailability(buildingCode: string, buildingStatus: boolean) {
    
    let isClosed = isBuildingClosed(buildingCode);

    if (isClosed === true) {
        return {
            label: (
                <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-orange-700/30 text-red-300/90">
                    closed
                </div>
            ),isClosed,
        };
    }

    if (buildingStatus) {
        return {
            label: (
                <div className="bg-green-800/20 text-green-300/90 rounded-lg px-2 py-1 text-sm">
                    rooms available
                </div>
            ), isClosed: false,
        };
    } else {
        return {
            label: (
                <div className="bg-red-700/20 text-red-300/80 rounded-lg px-2 py-1 text-sm">
                    unavailable
                </div>
            ),isClosed: false,
        };
    }
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