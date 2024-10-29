"use client";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";


import { Lesson, BuildingData } from "@/types/interfaces";

const errorData: BuildingData = { // Valori fittizi per il building in caso di errore
    building: "Error",
    building_code: "ERROR_CODE",
    building_status: "Internal Server Error",
    rooms: {},
    coordinates: [0, 0], 
    distance: Infinity,
    free: false,
    isClosed: true, 
    buildingAvailableSoon: false,
};

export default function Left({
    data,
    activeBuilding,
    setActiveBuilding,
}: {
    data: { [key: string]: BuildingData };
    activeBuilding: string | null;
    setActiveBuilding: (building: string) => void;
}) {
    if (Object.keys(data).length === 0) { // Se data è un oggetto vuoto
        console.log("Empty server answer; is the server reachable?");
        data = { InternalServerError: errorData };
    }
    return (
        <div className="px-8">
            <Accordion
                type="single"
                collapsible
                className="w-full"
                value={activeBuilding || ""}
                onValueChange={(val) => {
                    setActiveBuilding(val);
                }}
            >
                {Object.entries(data)
                    .sort(([a_code, a], [b_code, b]) => {
                        // Ordinamento per: free (true) -> buildingAvailableSoon (true) -> free (false) -> isClosed (true)
                        // Prima controlliamo se sono free
                        if (a.free && !b.free) return -1; // a precede b
                        if (!a.free && b.free) return 1; // b precede a
                        // Se entrambi sono free o entrambi non sono free, controlliamo buildingAvailableSoon
                        if (a.buildingAvailableSoon && !b.buildingAvailableSoon) return -1; // a precede b
                        if (!a.buildingAvailableSoon && b.buildingAvailableSoon) return 1; // b precede a
                        // Se entrambi non sono free e entrambi non sono buildingAvailableSoon, controlliamo isClosed
                        if (a.isClosed && !b.isClosed) return 1; // b precede a se chiuso
                        if (!a.isClosed && b.isClosed) return -1; // a precede b se chiuso

                        const a_clean = a_code.replace("polo", "").trim();
                        const b_clean = b_code.replace("polo", "").trim();
                        console.log(a_clean, b_clean);
                        return a_clean.localeCompare(b_clean); // Ordina per nome
                    })
                    .map(([buildingCode, building]) => {
                    return (
                        <AccordionItem
                            id={buildingCode}
                            value={buildingCode}
                            key={buildingCode}
                        >
                            <AccordionTrigger
                            disabled={building.isClosed}
                            isClosed={building.isClosed}
                            >
                                <div className="flex justify-between w-[95%] text-left text-lg group items-center" data-building-code={buildingCode} key={buildingCode}>
                                    <div className="group-hover:underline underline-offset-8 pr-2">
                                        Polo: <span className="italic">{buildingCode.replace("polo", "")}</span>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        
                                    {getAvailabilityDiv(building)}

                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="divide-y divide-dashed divide-zinc-600">
                                {Object.entries(building)
                                    .filter(([roomNumber, room]) => typeof room !== "boolean" && !Array.isArray(room)) // Filtra solo le stanze
                                    .sort(([, a], [, b]) => {
                                        // Ordinamento per: free (true) -> roomAvailableSoon (true) -> free (false)
                                        // Prima controlliamo se sono free
                                        if (a.free && !b.free) return -1; // a precede b
                                        if (!a.free && b.free) return 1; // b precede a
                                        // Se entrambi sono free o entrambi non sono free, controlliamo roomAvailableSoon
                                        if (a.roomAvailableSoon && !b.roomAvailableSoon) return -1; // a precede b
                                        if (!a.roomAvailableSoon && b.roomAvailableSoon) return 1; // b precede a
                                        return 0; // Nessun cambiamento
                                    }) // Ordina per mettere le stanze libere in cima
                                    .map(([roomNumber, room]) => (
                                        <div
                                            key={roomNumber}
                                            className="flex justify-between py-2 text-lg font-[family-name:var(--font-geist-mono)] text-[14px]"
                                        >
                                            <div className="flex gap-4 items-center h-[fit-content]">
                                                <div className="w-18">
                                                    {roomNumber}
                                                </div>
                                                <div className="relative">
                                                    {room.free === true ? (
                                                        <div className="h-2 w-2 rounded-full bg-green-400"></div>

                                                    ) : room.roomAvailableSoon === true ? (
                                                        <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                                                    ) : (
                                                        <div className="h-2 w-2 rounded-full bg-red-400"></div>
                                                    )}
                                                </div>
                                            </div>
                                            <ul className="text-right">
                                                {room.lessons?.map((lesson: Lesson, index: number) => (
                                                    <li key={index}>
                                                        {formatTime(lesson.start)} - {formatTime(lesson.end)} | {lesson.professor}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
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
function getAvailabilityDiv(building: BuildingData): JSX.Element {
    if (building.free && !building.isClosed) { // Se l'edificio è disponibile
        return (
            <div className="bg-green-800/20 text-green-300/90 rounded-lg px-2 py-1 text-sm">
                rooms available
            </div>
        );
    }else if (building.buildingAvailableSoon && !building.isClosed) { // Se l'edificio è disponibile a breve
        return (
            <div className="bg-red-700/20 text-orange-300/80 rounded-lg px-2 py-1 text-sm">
                available soon
            </div>
        );
    } else { // L'edificio non è disponibile
        return (
            <div className="ml-2 rounded-lg px-2 py-1 text-sm w-full bg-red-700/30 text-red-300/90">
                unavailable now
            </div>
        );
    }
}
