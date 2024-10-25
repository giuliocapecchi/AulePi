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
                    const { label: divElem, isClosed } = isBuildingAvailable(buildingCode, building.free as boolean);
                    
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
                                    <div className="">
                                        
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
function isBuildingAvailable(buildingCode: string, buildingStatus: boolean) {
    const currentHour = new Date().getHours();
    let isClosed = false;

    // Se l'orario è oltre la chiusura dei poli, automaticamente il building è segnato closed
    if (currentHour >= 16 && (buildingCode === 'poloF' || buildingCode === 'poloPN')) {
        isClosed = true;
        return {
            label: (
                <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-orange-700/30 text-red-300/90">
                    closed
                </div>
            ),isClosed,
        };
    } else if (currentHour >= 24) {
        isClosed = true;
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
