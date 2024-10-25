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
    data: { [key: string]: BuildingData }; // Cambiato da DataFormat[] a BuildingData
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
                {Object.entries(data).map(([buildingCode, building]) => (
                    // Stampa su console il buildingCode e il building
                    console.log("son qui fra",buildingCode, building.free),
                    <AccordionItem
                        id={buildingCode}
                        value={buildingCode}
                        key={buildingCode}
                    >
                        <AccordionTrigger>
                            <div className="flex justify-between w-[95%] text-left text-lg group items-center">
                                <div className="group-hover:underline underline-offset-8 pr-2">
                                    Building - {buildingCode.replace("polo", "polo ")} 
                                </div>
                                <div className="">
                                    {typeof building.free === "boolean" ? (
                                        building.free ? (
                                            <div className="bg-green-800/20 text-green-300/90 rounded-lg px-2 py-1 text-sm">
                                                available
                                            </div>
                                        ) : (
                                            <div className="bg-red-700/20 text-red-300/80 rounded-lg px-2 py-1 text-sm">
                                                unavailable
                                            </div>
                                        )
                                    ) : null}
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
                                        className="flex justify-between py-4 text-lg font-[family-name:var(--font-geist-mono)] text-[16px]"
                                    >
                                        <div className="flex gap-4 items-center h-[fit-content]">
                                            <div className="w-18">
                                                {buildingCode} {roomNumber}
                                            </div>
                                            <div className="relative">
                                                {room.lessons && room.lessons.length > 0 ? (
                                                    <div className="h-2 w-2 rounded-full bg-red-400"></div> // Invertito: ora rosso se occupata
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full bg-green-400"></div> // Invertito: ora verde se libera
                                                )}
                                            </div>
                                        </div>
                                        <ul className="text-right">
                                            {room.lessons?.map((lesson, index) => (
                                                <li key={index}>
                                                    {formatTime(lesson.start)} - {formatTime(lesson.end)} | {lesson.professor} - {lesson.summary}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </AccordionContent>
                    </AccordionItem>
                ))}
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
