export interface Lesson {
    end: string;
    professor: string;
    start: string;
}

export interface Room {
    free: boolean;
    lessons?: Lesson[];
    roomAvailableSoon?: boolean;
}

export interface BuildingData {
    building: string;               // Nome dell'edificio
    building_code: string;          // Codice dell'edificio
    building_status: string;        // Stato dell'edificio
    rooms: { [key: string]: Room }; // Stanze dell'edificio
    coordinates: [number, number];  // Coordinate dell'edificio
    distance: number;               // Distanza dall'utente o da un punto di riferimento
    free: boolean;                  // Se è true, nell'edificio almeno una stanza è disponibile
    isClosed?: boolean;             // Stato di chiusura dell'edificio, opzionale
    buildingAvailableSoon?: boolean;      // Se è true, l'edificio sarà disponibile a breve
}