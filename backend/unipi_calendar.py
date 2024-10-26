import re
from datetime import datetime, timedelta, timezone
import os
import requests


def get_unipi_calendars():
    # URL base per ottenere gli impegni, da concatenare con l'id ricevuto
    
    base_url = "https://unipi.prod.up.cineca.it:443/api/FiltriICal/impegniICal?id="

    poli_calendar_ids = {
            'poloA': '63247d96e3772a0690e3bcb4',
            'poloB': '63247e36ac73c806bfa2dfc2',
            'poloC': '63247e5ee3772a0690e3bd51',
            'poloPN': '63247c2237746802ea1c1cae',
            'poloF': '63247ea337746802ea1c1d4b'}

    for polo in poli_calendar_ids:
        # Esegui la prima richiesta per ottenere l'ID
        url_filtro = "https://unipi.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json, text/plain, */*",
        }

       
        # Ottieni la data di oggi in formato UTC
        today = datetime.now(timezone.utc).date()

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
                # Salva il file scaricato
                today = datetime.now(timezone.utc).date()
                # Converti today to string
                today = today.strftime("%Y-%m-%d")
                with open("./calendari/calendario_"+polo+"_"+today+".ics", 'wb') as f:
                    for chunk in response_impegni.iter_content(chunk_size=8192):
                        f.write(chunk)
                print("File scaricato correttamente come './calendari/calendario_"+polo+"_"+today+".ics")
            else:
                print(f"Errore nel download del calendario per il polo "+polo+": {response_impegni.status_code}")
        else:
            print(f"Errore nella creazione del filtro: {response.status_code}")
            print(response.text)




def parse_ics(ics_file):
    events = ics_file.split("BEGIN:VEVENT")
    parsed_events = []
    
    # Ottieni la data odierna nel formato 'YYYY-MM-DD'
    today = datetime.now(timezone.utc).date()
    for event in events[1:]:
        # Trova la descrizione, se esiste
        description_match = re.search(r'DESCRIPTION:(.*?)\n', event)
        description = description_match.group(1) if description_match else "No description"
        
        # Trova l'inizio, se esiste
        dtstart_match = re.search(r'DTSTART:(.*?)\n', event)
        dtstart = dtstart_match.group(1) if dtstart_match else "No start time"
        # Rendi dtstart leggibile, per esempio 20241025T123000Z deve diventare 2024-10-25 12:30:00
        dtstart = dtstart[:4] + "-" + dtstart[4:6] + "-" + dtstart[6:8] + " " + dtstart[9:11] + ":" + dtstart[11:13] + ":" + dtstart[13:15]
        # Shifta di 2 ore avanti tutti gli eventi
        dtstart = dtstart[:11] + str(int(dtstart[11:13]) + 2) + dtstart[13:]

        # Confronta la data di inizio con la data odierna
        event_date = dtstart.split(" ")[0]  # Ottieni solo la data
        if event_date != str(today):
            continue  # Salta questo evento se non è oggi
        
        # Trova la fine, se esiste
        dtend_match = re.search(r'DTEND:(.*?)\n', event)
        dtend = dtend_match.group(1) if dtend_match else "No end time"
        # Rendi dtend leggibile
        dtend = dtend[:4] + "-" + dtend[4:6] + "-" + dtend[6:8] + " " + dtend[9:11] + ":" + dtend[11:13] + ":" + dtend[13:15]
        # Shifta di 2 ore avanti tutti gli eventi
        dtend = dtend[:11] + str(int(dtend[11:13]) + 2) + dtend[13:]

        # Trova il titolo, se esiste
        summary_match = re.search(r'SUMMARY:(.*?)\n', event)
        summary = summary_match.group(1) if summary_match else "No summary"
        
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


def load_calendars_and_parse():
    all_lessons = []  # Lista per accumulare tutte le lezioni

    # Itera sui file nella cartella ./calendari
    for filename in os.listdir('./calendari'):
        # Controlla se il file ha l'estensione .ics
        if filename.endswith('.ics'):
            # Estrai il nome del polo dal nome del file
            # Esempio di nome del file: calendario_poloA_2024-10-25.ics
            parts = filename.split('_')
            if len(parts) >= 3:
                polo = parts[1]  # 'poloA', 'poloB', etc.

                with open(f'./calendari/{filename}', 'r') as f:
                    ics_file = f.read()

                # Parsare gli eventi
                lessons = parse_ics(ics_file)

                # Aggiungi ad ogni lesson il polo
                for lesson in lessons:
                    lesson['polo'] = polo

                # Aggiungi le lezioni del file corrente alla lista totale
                all_lessons.extend(lessons)

    return all_lessons  # Restituisci tutte le lezioni accumulate




def get_buildings_status(lessons):
    now = datetime.now()
    buildings_status = {}
    poli_coordinates = {
            'poloA' : [10.389842986424895, 43.72105258709789],
            'poloB' : [10.389289766627002, 43.72208800629937],
            'poloC' : [10.38901079266688, 43.72140114553582],
            'poloF' : [10.388287350482187, 43.72085438583843],
            'poloPN': [10.391229871075552, 43.72584890979181]}

    # Itera su tutte le lezioni
    for lesson in lessons:
        polo = lesson['polo']
        location = lesson['location']
        start_time = datetime.strptime(lesson['start'], '%Y-%m-%d %H:%M:%S')
        end_time = datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S')

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
            # rimuovi tutte le '\' da 'lesson['professor']
            lesson['professor'] = lesson['professor'].replace("\\", "")
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
