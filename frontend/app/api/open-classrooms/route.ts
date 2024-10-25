// /app/api/open-classrooms/route.ts

import { NextResponse } from "next/server";

interface dataFormat {
    building: string;  // Il nome del polo
    building_code: string;  // Ancora nome del polo //TODO : Da rimuovere
    rooms: {
        roomNumber: string;  // Nome o numero dell'aula (location)
        slots: { 
            StartTime: string;  // Orario di inizio della lezione
            EndTime: string;    // Orario di fine della lezione
            status: string;     // Stato della lezione
        }[];
        free: boolean;  // Indica se l'aula è libera
    }[];
    coords: [number, number];  // Coordinate del polo
    distance: number;  // Distanza dalla posizione attuale, se calcolata
}

// GENERAL STRUCTURE OF THE DATA
// {
//     "poloA": {
//         "IngA11": {
//             "free": false,
//             "lessons": [
//                 {
//                     "end": "2024-10-24 18:30:00",
//                     "professor": "CARMIGNANI GIONATA\\, MARRAZZINI LEONARDO",
//                     "start": "2024-10-24 16:30:00",
//                     "summary": "SISTEMI PRODUTTIVI"
//                 }
//             ]
//         },
//         "IngA12": {
//             "free": true,
//             "lessons": []
//         },
//         "IngA13": {
//             "free": false,
//             "lessons": [
//                 {
//                     "end": "2024-10-24 19:30:00",
//                     "professor": "No description",
//                     "start": "2024-10-24 17:30:00",
//                     "summary": "SANTO FEDERICA - Tutor Ing. Civile"
//                 }
//             ]
//         }
//     }
// }


export async function POST(req: Request) {
    try {
        // Extract user location from the request body
        const { lat, lng } = await req.json();

        // Send the user location to the backend
        const response = await fetch(
            "http://127.0.0.1:8080/api/open-classrooms", // TODO : Change this to the backend URL
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ lat, lng }),
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch data" },
                { status: 500 }
            );
        }

        // Get data from backend
        const data: dataFormat[] = await response.json();
        // Print the data to the console
        console.log("Data from backend: ", data); 

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in route:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Fetch the default data without location
        const response = await fetch(
            "http://127.0.0.1:8080/api/open-classrooms",
            {
                method: "GET",
                cache: "no-cache",
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch data" },
                { status: 500 }
            );
        }

        // Get data from backend
        const data: dataFormat[] = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in GET route:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
