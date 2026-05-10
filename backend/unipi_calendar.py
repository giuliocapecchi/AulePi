import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo  # Python 3.9+
import io
import requests
import csv
import vercel_blob
from dotenv import load_dotenv
from pydantic import BaseModel


class Lesson(BaseModel):
    professor: str
    start: str
    end: str


class Room(BaseModel):
    lessons: list[Lesson] = []
    free: bool = False
    roomAvailableSoon: bool = False


class Building(BaseModel):
    coordinates: list[float]
    free: bool = False
    buildingAvailableSoon: bool = False
    isClosed: bool = False
    rooms: dict[str, Room] = {}


files: dict[str, str] = {}
buildings_status: dict[str, Building] = {}
usually_open_dict: dict[str, dict[str, dict[str, bool]]] = {}
pisa_timezone = ZoneInfo("Europe/Rome")

poli_calendar_ids = {
            'poloA': '63247d96e3772a0690e3bcb4',
            'poloB': '63247e36ac73c806bfa2dfc2',
            'poloC': '63247e5ee3772a0690e3bd51',
            'poloPN': '63247c2237746802ea1c1cae',
            'poloF': '63247ea337746802ea1c1d4b',
            'poloFibonacci': '63223a029f080a0aab032afc',
            'poloBenedettine': '63247fadac73c806bfa2e09a',
            'poloEconomia': '6501c7315640d3007d1012b9',
            'poloPiagge': '631e682b617f10007c563735',
            'poloCarmignani': '63247758e3772a0690e3b9f3',
            'poloGuidotti': '64ff310b0c7dac007d24cdc3',
            'poloNobili': '64ff316f3f77cd0078076002',
            'poloP.Ricci': '64ff2e89dd600900782c3cc3',
            'poloP.Boileau': '6501c860675557007eb417c0',
            'poloS.Rossore': '63247d5f75616d04046a0779',
            'poloSapienza' : '63247af9ac73c806bfa2def2',
            'poloFarmacia' : '5dd7953c1c9f510011e17fbf'
            }

poli_coordinates = {
            'poloA' : [10.389842986424895, 43.72105258709789],
            'poloB' : [10.389289766627002, 43.72208800629937],
            'poloC' : [10.38901079266688, 43.72140114553582],
            'poloF' : [10.388287350482187, 43.72085438583843],
            'poloPN': [10.391229871075552, 43.72584890979181],
            'poloFibonacci': [10.408037918667361, 43.720879347333835],
            'poloBenedettine': [10.39397528101884,43.71344829248517],
            'poloEconomia': [10.410379473942072, 43.711018978876695],
            'poloPiagge': [10.412023465973618, 43.710610273943814],
            'poloCarmignani': [10.40094950738802, 43.72011831490275],
            'poloGuidotti': [10.392386095658338, 43.71741398544361],
            'poloNobili': [10.395924531247118, 43.71849818636451],
            'poloP.Ricci': [10.396921563725783, 43.717686512092854],
            'poloP.Boileau' : [10.397074275993532, 43.71998968935904],
            'poloS.Rossore': [10.392641884389207, 43.717998675187204],
            'poloSapienza' : [10.399496403929106, 43.717311583201365],
            'poloFarmacia' : [10.3889513118217, 43.71661901268172]
            }

# ----------------------------- VercelFS utility functions ------------------------------------------------- #

def list_all_blobs():
    blobs = vercel_blob.list({
        'limit': '5',
    })
    return blobs


def upload_a_blob(file_name, file_content):
    try:
        file_content_bytes = file_content.encode('utf-8')
        resp = vercel_blob.put(file_name, file_content_bytes, {"addRandomSuffix": "false"})
        print("Vercel response : ", resp, "\n")
    except Exception as e:
        print(f"Blob upload skipped ({file_name}): {e}")


def download_file_from_vercelFS(filename):
    try:
        blobs = vercel_blob.list({'prefix': filename, 'limit': '1'})
    except Exception as e:
        print(f"Blob unavailable, skipping {filename}: {e}")
        return None
    for blob in blobs['blobs']:
        if blob['pathname'] == filename:
            response = requests.get(blob['url'])
            if response.status_code == 200:
                content = response.content.decode('utf-8')
                print(f"{filename} caricato in memoria con successo.")
                if content:
                    return content
            else:
                print(f"Errore nel download di {filename}: {response.status_code}")
                return None
    print(f"File {filename} non trovato su VercelFS.")
    return None


def delete_blob_by_filename(filename):
    # Trova l'URL del blob utilizzando il nome del file
    blobs = list_all_blobs()
    for blob in blobs['blobs']:
        if blob['pathname'] == filename:
            # Elimina il blob se trovato
            resp = vercel_blob.delete(blob['url'])
            print(f"Eliminato {filename}: {resp}")
    else:
        print(f"File {filename} non trovato.")


# ----------------------------- functions to interact with the university of Pisa APIs ------------------------------------------------- #


def _fetch_polo_calendar(polo):
    """Fetch and return (filename, ics_content) for a single polo, or None on error."""
    url_filtro = "https://unipi.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"
    url_filtro_farmacia = "https://unich.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"
    base_url = "https://unipi.prod.up.cineca.it:443/api/FiltriICal/impegniICal?id="
    base_url_farmacia = "https://unich.prod.up.cineca.it/api/FiltriICal/impegniICal?id="

    headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
    }

    today = datetime.now(pisa_timezone).date()
    today_str = today.strftime("%Y-%m-%d")
    dataDa = (today - timedelta(days=1)).strftime("%Y-%m-%d") + "T22:00:00.000Z"
    dataA = (today + timedelta(days=1)).strftime("%Y-%m-%d") + "T22:59:59.999Z"
    dataScadenza = (today + timedelta(days=1)).strftime("%Y-%m-%d") + "T23:00:00.000Z"

    if polo == 'poloFarmacia':
        payload = {
            "clienteId": "5a65a9ebd9fe4f6d0ccf9df6",
            "dataA": dataA, "dataDa": dataDa, "dataScadenza": dataScadenza,
            "linkCalendarioId": poli_calendar_ids[polo],
        }
        url_id = url_filtro_farmacia
        base = base_url_farmacia
    else:
        payload = {
            "clienteId": "628de8b9b63679f193b87046",
            "dataA": dataA, "dataDa": dataDa, "dataScadenza": dataScadenza,
            "linkCalendarioId": poli_calendar_ids[polo],
        }
        url_id = url_filtro
        base = base_url

    response = requests.post(url_id, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Errore nella creazione del filtro per {polo}: {response.status_code}\n{response.text}")
        return None

    id_impegni = response.json().get("id")
    response_impegni = requests.get(base + id_impegni, stream=True)
    if response_impegni.status_code != 200:
        print(f"Errore nel download del calendario per il polo {polo}: {response_impegni.status_code}")
        return None

    return f"calendario_{polo}_{today_str}.ics", response_impegni.text


def get_unipi_calendars():
    with ThreadPoolExecutor(max_workers=len(poli_calendar_ids)) as executor:
        futures = {executor.submit(_fetch_polo_calendar, polo): polo for polo in poli_calendar_ids}
        for future in as_completed(futures):
            result = future.result()
            if result:
                file_name, file_content = result
                files[file_name] = file_content



def parse_ics(ics_file):
    # rimuovi dal file tutti i caratteri '\n ' (newline e spazio) ma SOLO SE ADIACENTI
    ics_file = re.sub(r'\n ', '', ics_file)
    # sostituisci \u00c3\u00a0 con à
    ics_file = ics_file.replace("\u00c3\u00a0", "à")

    events = ics_file.split("BEGIN:VEVENT")
    parsed_events = []
    
    # Ottieni la data odierna nel formato 'YYYY-MM-DD'
    today = datetime.now(pisa_timezone).date()
    for event in events[1:]:
        # Trova la descrizione, se esiste
        description_match = re.search(r'DESCRIPTION:(.*?)\n', event)
        description = description_match.group(1) if description_match else "No description"
        # taglia via tutto ciò che segue "nNOTE" dalla descrizione
        description = description.split("\nNOTE")[0]
        # rimuove tutte le '\r' dalla descrizione
        description = description.replace("\r", "")
        
        # Trova l'inizio, se esiste
        dtstart_match = re.search(r'DTSTART:(.*?)\n', event)
        dtstart = dtstart_match.group(1) if dtstart_match else "No start time"
        dtstart = parse_and_adjust_time(dtstart)

        # Confronta la data di inizio con la data odierna
        event_date = dtstart.split(" ")[0]  # Ottieni solo la data
        if event_date != str(today):
            continue  # Salta questo evento se non è oggi
        
        # Trova la fine, se esiste
        dtend_match = re.search(r'DTEND:(.*?)\n', event)
        dtend = dtend_match.group(1) if dtend_match else "No end time"
        dtend = parse_and_adjust_time(dtend)

        # Trova il titolo, se esiste
        summary_match = re.search(r'SUMMARY:(.*?)\n', event)
        summary = summary_match.group(1) if summary_match else "No summary"
        # if 'no description', metto il summary nella description ma solo se il summary è più corto di 30 caratteri
        if description == "No description" and len(summary) < 20:
            description = summary
        
        # Trova la location, se esiste
        location_match = re.search(r'LOCATION:(.*?)\n', event)
        location = location_match.group(1) if location_match else "No location"
        if location == "No location":
            continue
        aula = location.split("-")[0]  # Ottieni solo l'aula
        polo = location.split("-")[1]  # Ottieni solo il polo
        aula = aula.replace(" ", "")
        # Aggiunge l'evento parsato alla lista
        parsed_events.append({
            'professor': description,
            'start': dtstart,
            'end': dtend,
            'location': aula
        })
    
    return parsed_events


def parse_aule_csv(content):
    """
    Costruisce la variabile globale 'buildings_status' e 'usually_open_dict'  a partire dal contenuto del file 'aule.csv' scaricato da VercelFS.
    """
    global buildings_status, poli_coordinates, usually_open_dict

    f = io.StringIO(content)
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        polo = row[0]
        location = row[1]
        usually_open = row[2] == "True"

        if polo not in usually_open_dict:
            usually_open_dict[polo] = {}
        if location not in usually_open_dict[polo]:
            usually_open_dict[polo][location] = {}
        usually_open_dict[polo][location]['usually_open'] = usually_open

        if polo not in buildings_status:
            buildings_status[polo] = Building(coordinates=poli_coordinates[polo])

        buildings_status[polo].rooms[location] = Room(free=usually_open)

    f.close()



def parse_and_adjust_time(dt):
    # Trasforma il formato della stringa
    dt = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]} {dt[9:11]}:{dt[11:13]}:{dt[13:15]}"
    # Parsing della stringa in datetime con timezone UTC
    dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    # Conversione in ora locale (Europa/Roma)
    dt = dt.astimezone(pisa_timezone)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


LESSON_CACHE_FILENAME = "lessons_cache.json"


def load_calendars_and_parse():
    global poli_calendar_ids, poli_coordinates, files, buildings_status, usually_open_dict

    if len(poli_calendar_ids) != len(poli_coordinates):
        print("Errore: poli_calendar_ids e poli_coordinates non hanno lo stesso numero di elementi.")
        return

    # Clear stale in-process state so a new-day refresh on a warm instance starts clean
    files.clear()
    buildings_status.clear()
    usually_open_dict.clear()

    load_dotenv()

    today_str = datetime.now(pisa_timezone).date().strftime("%Y-%m-%d")
    all_lessons = None

    # Try to load today's parsed lessons from Vercel Blob (avoids hitting UniPi on cold starts)
    cached_json = download_file_from_vercelFS(LESSON_CACHE_FILENAME)
    if cached_json:
        try:
            cached = json.loads(cached_json)
            if cached.get("date") == today_str:
                print("Lessons loaded from Vercel Blob cache.")
                all_lessons = cached["lessons"]
        except (json.JSONDecodeError, KeyError):
            pass  # stale or corrupt cache, fall through to fetch

    if all_lessons is None:
        get_unipi_calendars()
        all_lessons = []
        for filename in files:
            polo = filename.split('_')[1]
            lessons = parse_ics(files[filename])
            for lesson in lessons:
                lesson['polo'] = polo
            all_lessons.extend(lessons)
        print("Calendari caricati con successo.")
        upload_a_blob(LESSON_CACHE_FILENAME, json.dumps({"date": today_str, "lessons": all_lessons}))

    aule_csv_content = download_file_from_vercelFS("aule.csv")
    if aule_csv_content:
        parse_aule_csv(aule_csv_content)
    else:
        # aule.csv unavailable (no Blob token): pre-seed all buildings from coordinates
        # so the map always shows every polo regardless of whether it has lessons today.
        for polo in poli_coordinates:
            buildings_status[polo] = Building(coordinates=poli_coordinates[polo])

    initialize_buildings_status(all_lessons)
    buildings_to_csv()

    return all_lessons


def initialize_buildings_status(lessons):
    """
    Aggiorna la variabile globale `buildings_status` con lo stato attuale degli edifici.
    """
    global poli_coordinates, buildings_status

    now = datetime.now(pisa_timezone)

    for lesson in lessons:
        polo = lesson['polo']
        if is_building_closed(polo, now):
            print("Skipped lesson in closed building: ", lesson)
            continue
        location = lesson['location']
        start_time = datetime.strptime(lesson['start'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
        end_time = datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)

        if polo not in buildings_status:
            buildings_status[polo] = Building(coordinates=poli_coordinates[polo])

        if location not in buildings_status[polo].rooms:
            buildings_status[polo].rooms[location] = Room(free=True)
            # If aule.csv wasn't loaded, treat rooms found in lesson data as usually open
            usually_open_dict.setdefault(polo, {}).setdefault(location, {'usually_open': True})

        if start_time.date() == now.date() and end_time > now:
            professor = lesson['professor']
            if professor != "No description" and len(professor) > 0:
                professor = professor.split("\\nNOTE")[0]
                professor = professor.replace("\\", "")
                professor = professor.replace(" \\(.*?\\)", "")
                cleaned_professors_list = professor.split(",")
                cleaned_professors_list = [
                    prof.strip().split(".")[-1].strip() if "." in prof else " ".join(prof.split()[:-1])
                    for prof in cleaned_professors_list
                ]
                cleaned_professors = ", ".join(cleaned_professors_list)
                if len(cleaned_professors) <= 70:
                    professor = cleaned_professors.upper()
                else:
                    professor = 'No description'
            else:
                professor = 'No description'

            buildings_status[polo].rooms[location].lessons.append(Lesson(
                professor=professor,
                start=start_time.strftime('%Y-%m-%d %H:%M:%S'),
                end=end_time.strftime('%Y-%m-%d %H:%M:%S'),
            ))

            if start_time <= now <= end_time:
                buildings_status[polo].rooms[location].free = False

            if end_time - now <= timedelta(minutes=30):
                buildings_status[polo].rooms[location].roomAvailableSoon = True
                buildings_status[polo].buildingAvailableSoon = True

    for polo, building in buildings_status.items():
        if is_building_closed(polo, now):
            building.isClosed = True
            building.free = False
            building.buildingAvailableSoon = False
            continue

        building.isClosed = False
        building.buildingAvailableSoon = False
        building.free = any(room.free for room in building.rooms.values())

    return buildings_status



# Funzione per controllare se una location è "usually_open"
def is_usually_open(polo, location):
    global usually_open_dict
    return usually_open_dict.get(polo, {}).get(location, {}).get('usually_open', False)


def get_buildings_status():
    """
    Aggiorna e restituisce lo stato attuale degli edifici.
    """
    global buildings_status
    now = datetime.now(pisa_timezone)

    for polo, building in buildings_status.items():
        # Recompute isClosed on every call so it reflects the current time,
        # not the time the server started.
        if is_building_closed(polo, now):
            building.isClosed = True
            building.free = False
            building.buildingAvailableSoon = False
            continue

        building.isClosed = False

        for location, room in building.rooms.items():
            room.lessons = [
                lesson for lesson in room.lessons
                if datetime.strptime(lesson.end, '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone) > now
            ]

            if not is_usually_open(polo, location):
                room.free = False
                room.roomAvailableSoon = False
                continue

            room.free = True
            room.roomAvailableSoon = False

            for lesson in room.lessons:
                start_time = datetime.strptime(lesson.start, '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
                end_time = datetime.strptime(lesson.end, '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
                if start_time <= now <= end_time:
                    room.free = False
                    if end_time - now <= timedelta(minutes=30):
                        next_lesson_exists = any(
                            datetime.strptime(nl.start, '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
                            in {end_time, end_time + timedelta(minutes=15)}
                            for nl in room.lessons
                        )
                        if not next_lesson_exists:
                            room.roomAvailableSoon = True

        building.free = any(room.free for room in building.rooms.values())
        building.buildingAvailableSoon = any(room.roomAvailableSoon for room in building.rooms.values())

    return buildings_status


def buildings_to_csv():
    """
    Aggiorna il file 'aule.csv' su VercelFS con le aule libere e occupate.
    Viene chiamata una volta in fase di avvio del backend, dopo aver caricato i calendari.
    """
    global usually_open_dict

     # Crea un oggetto StringIO per gestire il contenuto come una stringa
    f = io.StringIO()
    writer = csv.writer(f)
    writer.writerow(['polo', 'aula', 'usually_open'])
    # Itera su usually_open_dict per scrivere i dati
    for polo, locations in usually_open_dict.items():
        for location, details in locations.items():
            # TODO : rimuovere la riga successiva
            # Salta la riga specifica "PoloC, IngSI7"
            if polo == "poloC" and location == "IngSI7": # La segreteria ha per sbaglio inserito IngSI7 come aula del C
                continue
            if location == 'EcoLabWin(26PC)' or location == 'EcoLabWin(26PC)' or location =='Portatili1(Carrello)' or location == 'EcoLabMac(21PC)':
                usually_open = False
            else : 

                usually_open = details.get('usually_open', False)
            writer.writerow([polo, location, usually_open])
    
    f.seek(0)
    print("Uplaod del nuovo 'aule.csv' su VercelFS.")
    aule_csv_content = f.getvalue()
    # La upload_a_blob fa overwrite del file se esiste già su VercelFS -> https://pypi.org/project/vercel_blob/
    # quindi non serve la delete del file
    upload_a_blob("aule.csv", aule_csv_content)
    f.close()


def is_building_closed(polo: str, now: datetime) -> bool:
    current_hour = now.hour + now.minute / 60  # Convertiamo i minuti in ore decimali
    current_day = now.weekday()  # Lunedì è 0, Domenica è 6

    # Domenica: tutti i poli chiusi tranne poloF e poloPN (8:30 - 24)
    if current_day == 6 and not (polo == 'poloF' or polo == 'poloPN'):
        return True
    elif current_day == 6 and (polo == 'poloF' or polo == 'poloPN'):
        return current_hour < 8.5 or current_hour >= 24

    # Sabato: poloA, poloB  e poloFarmacia aperti dalle 7:30 alle 14
    if current_day == 5 and (polo == 'poloA' or polo == 'poloB' or polo == 'poloFarmacia'):
        return current_hour < 7.5 or current_hour >= 14

    # Sabato: poloC e poloEconomia aperti dalle 8 alle 13
    if current_day == 5 and (polo == 'poloC' or polo == 'poloEconomia'):
        return current_hour < 8 or current_hour >= 13

    # Lunedì - Venerdì: poloA e poloB aperti dalle 7:30 alle 20
    if 0 <= current_day <= 4 and (polo == 'poloA' or polo == 'poloB'):
        return current_hour < 7.5 or current_hour >= 20

    # Lunedì - Venerdì: poloC e poloFarmacia aperti dalle 7:30 alle 19:30
    if 0 <= current_day <= 4 and (polo == 'poloC' or polo == 'poloFarmacia'):
        return current_hour < 7.5 or current_hour >= 19.5

    # Lunedì - Sabato: poloF e poloPN aperti dalle 8 alle 24
    if 0 <= current_day <= 5 and (polo == 'poloF' or polo == 'poloPN'):
        return current_hour < 8 or current_hour >= 24

    # Lunedì - Venerdì: poloFibonacci aperto dalle 8 alle 19
    if 0 <= current_day <= 4 and polo == 'poloFibonacci':
        return current_hour < 8 or current_hour >= 19

    # Lunedì - Venerdì: poloBenedettine e poloEconomia aperti dalle 8 alle 19:30
    if 0 <= current_day <= 4 and (polo == 'poloBenedettine' or polo == 'poloEconomia'):
        return current_hour < 8 or current_hour >= 19.5

    # Sabato: poloBenedettine aperto dalle 8:30 alle 14
    if current_day == 5 and polo == 'poloBenedettine':
        return current_hour < 8.5 or current_hour >= 14

    # Lunedì - Venerdì: poloPiagge aperto dalle 8 alle 24
    if 0 <= current_day <= 4 and polo == 'poloPiagge':
        return current_hour < 8 or current_hour >= 24

    # Lunedì - Venerdì: altri poli aperti dalle 8 alle 19:30
    if 0 <= current_day <= 4 and polo in ['poloCarmignani', 'poloGuidotti', 'poloNobili', 'poloP.Ricci', 
                                           'poloP.Boileau', 'poloS.Rossore', 'poloSapienza']:
        return current_hour < 8 or current_hour >= 19.5

    # Per qualsiasi altra combinazione, consideriamo aperto
    return False