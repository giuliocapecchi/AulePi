import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo  # Python 3.9+
import io
import requests
import csv
import vercel_blob
from dotenv import load_dotenv


files = {} # Contiene i calendari (scaricati all'avvio del backend)
aule_csv_content = None # contiene il file 'aule.csv' presente server-side.
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
            'poloPiagge': '631e682b617f10007c563735'}

poli_coordinates = {
            'poloA' : [10.389842986424895, 43.72105258709789],
            'poloB' : [10.389289766627002, 43.72208800629937],
            'poloC' : [10.38901079266688, 43.72140114553582],
            'poloF' : [10.388287350482187, 43.72085438583843],
            'poloPN': [10.391229871075552, 43.72584890979181],
            'poloFibonacci': [10.408037918667361, 43.720879347333835],
            'poloBenedettine': [10.39397528101884,43.71344829248517],
            'poloEconomia': [10.410379473942072, 43.711018978876695],
            'poloPiagge': [10.412023465973618, 43.710610273943814]}

# ----------------------------- VercelFS utility functions ------------------------------------------------- #

def list_all_blobs():
    blobs = vercel_blob.list({
        'limit': '5',
    })
    return blobs


def upload_a_blob(file_name, file_content):
    file_content_bytes = file_content.encode('utf-8')  # Codifica la stringa in bytes
    resp = vercel_blob.put(file_name, file_content_bytes, {
                "addRandomSuffix": "false",
            })
    print("Vercel response : ",resp,"\n")


def download_file_from_vercelFS(filename):
    global aule_csv_content
    blobs = list_all_blobs()
    for blob in blobs['blobs']:
        if blob['pathname'] == filename:
            response = requests.get(blob['url'])
            if response.status_code == 200:
                aule_csv_content = response.content.decode('utf-8')
                print(f"{filename} caricato in memoria con successo.")
                #print(aule_csv_content)
                return
            else:
                print(f"Errore nel download di {filename}: {response.status_code}")
                return
    print(f"{filename} non trovato nei blob.")


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


def get_unipi_calendars():
    global poli_calendar_ids

    # URL base per ottenere gli impegni, da concatenare con l'id ricevuto
    base_url = "https://unipi.prod.up.cineca.it:443/api/FiltriICal/impegniICal?id="

    

    for polo in poli_calendar_ids:
        # Esegui la prima richiesta per ottenere l'ID
        url_filtro = "https://unipi.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json, text/plain, */*",
        }

       
        # Ottieni la data di oggi in formato UTC
        today = datetime.now(pisa_timezone).date()

        # Crea le date esatte come descritto
        dataDa = (today - timedelta(days=1)).strftime("%Y-%m-%d") + "T22:00:00.000Z"
        dataA = (today + timedelta(days=1)).strftime("%Y-%m-%d") + "T22:59:59.999Z"
        dataScadenza = (today + timedelta(days=1)).strftime("%Y-%m-%d") + "T23:00:00.000Z"

        # Payload per la richiesta
        data = {
            "clienteId": "628de8b9b63679f193b87046",
            "dataA": dataA,
            "dataDa": dataDa,
            "dataScadenza": dataScadenza,
            "linkCalendarioId": poli_calendar_ids[polo],
        }

        # Effettua la chiamata POST per ottenere l'ID
        response = requests.post(url_filtro, headers=headers, json=data)

        if response.status_code == 200:
            # Estrai l'ID dalla risposta
            id_impegni = response.json().get("id")
            
            # Crea il link completo concatenando l'ID
            final_url = base_url + id_impegni

            # Effettua la chiamata GET al link finale per scaricare il file
            response_impegni = requests.get(final_url, stream=True)
            
            if response_impegni.status_code == 200:
                # Aggiungi il file alla variabile globale
                today = datetime.now(pisa_timezone).date()
                # Converti today to string
                today_str = today.strftime("%Y-%m-%d")
                file_name = f"calendario_{polo}_{today_str}.ics"
                file_content = response_impegni.text
                # aggiungi il file e il suo contenuto alla variabile globale 
                files[file_name] = file_content
            else:
                print(f"Errore nel download del calendario per il polo "+polo+": {response_impegni.status_code}")
        else:
            print(f"Errore nella creazione del filtro: {response.status_code}")
            print(response.text)



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
        location = location.split("-")[0]  # Ottieni solo l'aula
        location = location.replace(" ", "")
                
        # Aggiunge l'evento parsato alla lista
        parsed_events.append({
            'professor': description,
            'start': dtstart,
            'end': dtend,
            'summary': summary,
            'location': location
        })
    
    return parsed_events



def parse_and_adjust_time(dt):
    # Trasforma il formato della stringa
    dt = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]} {dt[9:11]}:{dt[11:13]}:{dt[13:15]}"
    # Parsing della stringa in datetime con timezone UTC
    dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    # Conversione in ora locale (Europa/Roma)
    dt = dt.astimezone(pisa_timezone)
    return dt.strftime("%Y-%m-%d %H:%M:%S")




def load_calendars_and_parse():
    get_unipi_calendars()
    all_lessons = []  # Lista per accumulare tutte le lezioni    
    # Itera sui nomi dei file .ics dalla variabile globale
    for filename in files:
        # Parsare gli eventi
        lessons = parse_ics(files[filename])
        
        # Aggiungi ad ogni lesson il polo
        polo = filename.split('_')[1]  # Estrai il polo dal nome del file
        for lesson in lessons:
            lesson['polo'] = polo

        # Aggiungi le lezioni del file corrente alla lista totale
        all_lessons.extend(lessons)
    print("Calendari caricati con successo.")
    load_dotenv()
    download_file_from_vercelFS("aule.csv")
    building_to_csv(get_buildings_status(all_lessons)) # Aggiungi i poli aggiornati al csv lato VercelFS    
    return all_lessons  # Restituisci tutte le lezioni accumulate


def get_buildings_status(lessons):
    global aule_csv_content
    global poli_coordinates

    now = datetime.now(pisa_timezone)
    buildings_status = {}
    
    try:
        f = io.StringIO(aule_csv_content) # Per trattare la stringa come se fosse un file
        reader = csv.reader(f)
        next(reader)  # Salta l'intestazione
        for row in reader:
            polo = row[0]
            location = row[1]
            free = row[2] == 'True'
            if polo not in buildings_status:
                buildings_status[polo] = {}
                buildings_status[polo]['coordinates'] = poli_coordinates[polo]
            if location not in buildings_status[polo]:
                buildings_status[polo][location] = {
                    'lessons': [],
                    'free': free
                    }
        f.close()

    except:
        print("File 'aule.csv' non trovato su VercelFS, verrà creato e caricato.")
        f = io.StringIO() # Usiamo io per trattare la stringa come se fosse un file
        writer = csv.writer(f)
        writer.writerow(["polo", "aula", "usually_open"])
        aule_csv_content = f.getvalue()
        upload_a_blob("aule.csv", aule_csv_content)
        f.close()
    
    
    # Itera su tutte le lezioni
    for lesson in lessons:
        polo = lesson['polo']
        location = lesson['location']
        start_time = datetime.strptime(lesson['start'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
        end_time = datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)

        # Crea la struttura per il polo se non esiste già
        if polo not in buildings_status:
            buildings_status[polo] = {}
            # aggiungi le coordinate del polo
            buildings_status[polo]['coordinates'] = poli_coordinates[polo]

        # Crea la struttura per l'aula se non esiste già
        if location not in buildings_status[polo]:
            buildings_status[polo][location] = {
                'lessons': [],  # Lezioni future o in corso
                'free': True    # Presume l'aula libera fino a prova contraria
            }

        # Confronta l'orario per selezionare lezioni future o in corso oggi
        if start_time.date() == now.date() and end_time > now:
            # rimuovi tutte le '\' da 'lesson['professor'] e da 'lesson['summary']'
            lesson['professor'] = lesson['professor'].replace("\\", "")
            lesson['summary'] = lesson['summary'].replace("\\", "")
            # rimuovi '\nNOTE:'
            lesson['professor'] = lesson['professor'].split("\nNOTE:")[0]
            buildings_status[polo][location]['lessons'].append({
                'professor': lesson['professor'],
                'start': start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end': end_time.strftime('%Y-%m-%d %H:%M:%S'),
                'summary': lesson['summary']
            })
            
            # Se c'è una lezione in corso al momento, l'aula non è libera
            if start_time <= now <= end_time:
                buildings_status[polo][location]['free'] = False

    
    # Se il polo ha almeno una aula liberata, il polo è considerato libero
    for polo in buildings_status:
    # Imposta inizialmente il polo come non libero
        buildings_status[polo]['free'] = False

        # Se il polo ha almeno una aula liberata, il polo è considerato libero
        if any(buildings_status[polo][location]['free'] 
           for location in buildings_status[polo] 
           if location not in ['coordinates', 'free']):  # Escludi le chiavi 'coordinates' e 'free'
            buildings_status[polo]['free'] = True

    return buildings_status



def building_to_csv(buildings_status):
    global aule_csv_content
    aule_esistenti = set()
    changes = False

    # Se il file esiste, carica le aule già presenti nel set
    if aule_csv_content:
        f = io.StringIO(aule_csv_content)
        reader = csv.reader(f)
        next(reader)  # Salta l'intestazione
        for row in reader:
            if len(row) >= 2:
                aule_esistenti.add((row[0], row[1]))
        f.close()

    # Creo un nuovo buffer per la scrittura
    f = io.StringIO()
    writer = csv.writer(f)

    # Scrivi l'intestazione se il contenuto è vuoto
    if not aule_csv_content:
        writer.writerow(["polo", "aula", "usually_open"])
    
    # Aggiungi le aule esistenti
    if aule_csv_content:
        existing_data = io.StringIO(aule_csv_content)
        existing_reader = csv.reader(existing_data)
        writer.writerow(next(existing_reader))  # Scrive l'intestazione
        for row in existing_reader:
            writer.writerow(row)  # Scrive le righe esistenti
        existing_data.close()

    # Aggiungi solo le aule che non sono già presenti
    for polo in buildings_status:
        for location in buildings_status[polo]:
            if location not in ['coordinates', 'free']:
                aula = (polo, location)
                # Controlla se l'aula è già presente
                if aula not in aule_esistenti:
                    writer.writerow([polo, location, buildings_status[polo][location]['free']])
                    aule_esistenti.add(aula)  # Aggiungi l'aula al set per evitare duplicati
                    changes = True  # Imposta il flag su True perché c'è una modifica

    # Se ci sono state modifiche, aggiorna `aule_csv_content` e aggiorna il file server-side
    if changes:
        print("Ci sono stati dei cambiamenti, faccio un upload del nuovo 'aule.csv' su VercelFS.")
        aule_csv_content = f.getvalue()
        # La upload_a_blob fa overwrite del file se esiste già su VercelFS -> https://pypi.org/project/vercel_blob/
        # quindi non serve la delete del file
        # TODO : rimuovi commmento
        #upload_a_blob("aule.csv", aule_csv_content)

    f.close()
