"use client";
import React, { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Lesson, BuildingData } from "@/types/interfaces";

const errorData: BuildingData = {
    rooms: {},
    coordinates: [0, 0],
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
                                    {Object.entries(building.rooms)
                                        .sort(([, a], [, b]) => {
                                            if (a.free && !b.free) return -1;
                                            if (!a.free && b.free) return 1;
                                            if (a.roomAvailableSoon && !b.roomAvailableSoon) return -1;
                                            if (!a.roomAvailableSoon && b.roomAvailableSoon) return 1;
                                            return 0;
                                        })
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
                onClick={() => setShowCredits(true)}
                className="mt-6 mb-3 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-300 transition-colors duration-200 font-[family-name:var(--font-geist-mono)]"
            >
                about
            </button>
            {showCredits && (
                <AboutModal onClose={() => setShowCredits(false)} />
            )}
        </div>
    );
}

function AboutModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl"
                style={{ animation: "aboutIn 0.2s ease-out both" }}
            >
                <style>{`
                    @keyframes aboutIn {
                        from { opacity: 0; transform: translateY(8px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    .alink { color: #7fa8c9; text-decoration: underline; text-underline-offset: 3px; }
                    .alink:hover { color: #a8c8e0; }
                `}</style>

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <span className="text-xs tracking-widest uppercase text-zinc-400 font-[family-name:var(--font-geist-mono)]">
                        about
                    </span>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-200 transition-colors text-xs tracking-widest uppercase font-[family-name:var(--font-geist-mono)]"
                    >
                        esc
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5 space-y-5 text-sm text-zinc-400 leading-relaxed">
                    <p>
                        <span className="text-zinc-200 font-medium">AulePi</span> shows real-time classroom availability across all University of Pisa buildings. Find a free room in seconds, on the map or in the list.
                    </p>

                    <div className="border-t border-zinc-800 pt-5">
                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-[family-name:var(--font-geist-mono)] mb-2">how it works</p>
                        <p>
                            Data is fetched live from UniPi&apos;s scheduling APIs on each page load. Clicking a building marker on the map jumps to its schedule. Refresh to get the latest updates.
                        </p>
                    </div>

                    <div className="border-t border-zinc-800 pt-5">
                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-[family-name:var(--font-geist-mono)] mb-2">author</p>
                        <p>
                            Built by{" "}
                            <a href="https://www.linkedin.com/in/giulio-capecchi/" target="_blank" rel="noopener noreferrer" className="alink">Giulio Capecchi</a>
                            , Master&apos;s student in AIDE at UniPi. Contributions and feedback welcome on{" "}
                            <a href="https://github.com/giuliocapecchi/AulePi" target="_blank" rel="noopener noreferrer" className="alink">GitHub</a>
                            {" "}or by <a href="mailto:giuliocapecchi2000@gmail.com" className="alink">email</a>.
                        </p>
                    </div>

                    <div className="border-t border-zinc-800 pt-5">
                        <p className="text-[11px] text-zinc-600 leading-relaxed">
                            Schedules may change without notice. Use this as a guide, not a guarantee.
                        </p>
                    </div>
                </div>
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
