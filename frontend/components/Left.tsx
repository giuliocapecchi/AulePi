"use client";
import React, { useState } from "react";
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
    const [showCredits, setShowCredits] = useState(false);

    if (Object.keys(data).length === 0) { // Se data è un oggetto vuoto
        console.log("Empty server answer; is the server reachable?");
        data = { InternalServerError: errorData };
    }

    return (
        <div className="flex flex-col items-center px-8 relative">
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
                        if (a.isClosed && !b.isClosed) return 1; // b precede a se chiuso
                        if (!a.isClosed && b.isClosed) return -1; // a precede b se chiuso
                        // Prima controlliamo se sono free
                        if (a.free && !b.free) return -1; // a precede b
                        if (!a.free && b.free) return 1; // b precede a
                        // Se entrambi sono free o entrambi non sono free, controlliamo buildingAvailableSoon
                        if (a.buildingAvailableSoon && !b.buildingAvailableSoon) return -1; // a precede b
                        if (!a.buildingAvailableSoon && b.buildingAvailableSoon) return 1; // b precede a
                        // Ordina per nome
                        const a_clean = a_code.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
                        const b_clean = b_code.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
                        return a_clean.localeCompare(b_clean, undefined, { sensitivity: 'base' });
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
                                            if (a.free && !b.free) return -1; // a precede b
                                            if (!a.free && b.free) return 1; // b precede a
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
                                                    {roomNumber
                                                        .replace(/\(.*?\)/g, "")
                                                        .replace(/[^\w\s.]/g, "")
                                                        .trim()
                                                    }
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
                                                <ul className="text-right space-y-2">
                                                    {room.lessons?.map((lesson: Lesson, index: number) => (
                                                        <li
                                                            key={index}
                                                            className="flex flex-col items-end text-base"
                                                        >
                                                            <div className="font-semibold">
                                                                {formatTime(lesson.start)} - {formatTime(lesson.end)}
                                                            </div>
                                                            <div className="text-sm text-slate-500 max-w-xs text-right">
                                                                {lesson.professor}
                                                            </div>
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
            <button
                className="bg-arno text-white py-1 px-2 rounded mb-3 mt-4 text-sm"
                onClick={() => setShowCredits(true)}
            >
                About this project
            </button>
            {showCredits && (
                <Modal onClose={() => setShowCredits(false)}>
                    <div className="space-y-6">

                        <div>
                            <h2 className="text-lg md:text-2xl font-semibold">About this Project</h2>
                            <p className="text-sm md:text-base leading-relaxed">Welcome to AulePi, a website where you can find available classes for all the University of Pisa buildings! The platform is designed to provide students with quick information on classroom availability. Whether you are looking for a quiet place to study or a classroom for your next lecture, AulePi has you covered.</p>
                        </div>

                        <div>
                            <h2 className="text-lg md:text-2xl font-semibold">Features</h2>
                            <p className="text-sm md:text-base leading-relaxed">The application tries to be user-friendly and straightforward. One hidden feature is although present: you can click on the building&apos;s markers on the map, and this will redirect you to their current time schedule.</p>
                        </div>

                        <div>
                            <h2 className="text-lg md:text-2xl font-semibold">How does this work?</h2>
                            <p className="text-sm md:text-base leading-relaxed">AulePi aggregates data from the University of Pisa&apos;s scheduling systems, ensuring that you receive accurate and up-to-date information each time you load the page: if you encounter outdated information, simply refresh the page to retrieve the latest updates. For more in-depth details, check out the <a href="https://github.com/giuliocapecchi/AulePi" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">GitHub repository</a> for this project.</p>
                        </div>

                        <div>
                            <h2 className="text-lg md:text-2xl font-semibold">Who Am I</h2>
                            <p className="text-sm md:text-base leading-relaxed">I am <a href="https://www.linkedin.com/in/giulio-capecchi/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Giulio Capecchi</a>, a student currently enrolled in the Master&apos;s program (AIDE) at the University of Pisa. With AulePi, my aim was to create a valuable resource for my fellow students, facilitating the search for available classrooms. I hope you find this website helpful in your studies! If you have any feedback or suggestions, feel free to reach out to me on <a href="https://github.com/giuliocapecchi" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">GitHub</a> or via <a href="mailto:giuliocapecchi2000@gmail.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">email</a>.</p>
                        </div>
                        <div>
                            <h2 className="text-lg md:text-2xl font-semibold">Disclaimer</h2>
                            <p className="text-sm md:text-base leading-relaxed">
                                Please note that while AulePi strives to provide accurate and up-to-date information, the information provided may change without notice. AulePi&apos;s mainteners shall not be held liable for any discrepancies or issues arising from the use of this application.
                            </p>
                        </div>

                    </div>
                </Modal>
            )}
        </div>
    );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode; }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-zinc-900/80 rounded-lg p-6 max-w-lg sm:max-w-xl w-full max-h-screen mx-4  relative overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-red-800 hover:text-red-600 font-bold"
                >
                    X
                </button>
                {children}
            </div>
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
    } else if (building.buildingAvailableSoon && !building.isClosed) { // Se l'edificio è disponibile a breve
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
