export interface Lesson {
    professor: string;
    start: string;
    end: string;
}

export interface Room {
    lessons: Lesson[];
    free: boolean;
    roomAvailableSoon: boolean;
}

export interface BuildingData {
    coordinates: [number, number];
    free: boolean;
    buildingAvailableSoon: boolean;
    isClosed: boolean;
    rooms: { [key: string]: Room };
}