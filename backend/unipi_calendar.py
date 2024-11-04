import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo  # Python 3.9+
import io
import requests
import csv
import vercel_blob
from dotenv import load_dotenv


files = {} # Contiene i calendari (scaricati all'avvio del backend)
buildings_status =  {} # contiene lo stato degli edifici (aggiornato ogni volta che si chiama la funzione get_open_classrooms)
usually_open_dict = {} # contiene le aule che sono di solito aperte (scaricato all'avvio del backend)
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
    file_content_bytes = file_content.encode('utf-8')  # Codifica la stringa in bytes
    resp = vercel_blob.put(file_name, file_content_bytes, {
                "addRandomSuffix": "false",
            })
    print("Vercel response : ",resp,"\n")


def download_file_from_vercelFS(filename):
    blobs = list_all_blobs()
    for blob in blobs['blobs']:
        if blob['pathname'] == filename:
            response = requests.get(blob['url'])
            if response.status_code == 200:
                content = response.content.decode('utf-8')
                print(f"{filename} caricato in memoria con successo.")
                #print(content)
                if content != None and content != "":
                    return content
            else:
                print(f"Errore nel download di {filename}: {response.status_code}")
                return
    print(f"File {filename} non trovato su VercelFS.")


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

    # url iniziale per ottenere id del calendario
    url_filtro = "https://unipi.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"
    url_filtro_farmacia = "https://unich.prod.up.cineca.it/api/FiltriICal/creaFiltroICal"

    # URL base per ottenere gli impegni, da concatenare con l'id ricevuto
    base_url = "https://unipi.prod.up.cineca.it:443/api/FiltriICal/impegniICal?id="
    base_url_farmacia = "https://unich.prod.up.cineca.it/api/FiltriICal/impegniICal?id="

    

    for polo in poli_calendar_ids:
        # Esegui la prima richiesta per ottenere l'ID
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

        if polo == 'poloFarmacia':
            data = {
            "clienteId": "5a65a9ebd9fe4f6d0ccf9df6",
            "dataA": dataA,
            "dataDa": dataDa,
            "dataScadenza": dataScadenza,
            "linkCalendarioId": poli_calendar_ids[polo],
            }
        else:
            data = {
            "clienteId": "628de8b9b63679f193b87046",
            "dataA": dataA,
            "dataDa": dataDa,
            "dataScadenza": dataScadenza,
            "linkCalendarioId": poli_calendar_ids[polo],
            }
            

        # Effettua la chiamata POST per ottenere l'ID
        url_id = url_filtro_farmacia if polo == 'poloFarmacia' else url_filtro
        response = requests.post(url_id, headers=headers, json=data)
        

        if response.status_code == 200:
            # Estrai l'ID dalla risposta
            id_impegni = response.json().get("id")
            
            # Crea il link completo concatenando l'ID
            if polo == 'poloFarmacia':
                final_url = base_url_farmacia + id_impegni
            else:
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
    global buildings_status
    global poli_coordinates
    global usually_open_dict
    
    f = io.StringIO(content)  # Per trattare la stringa come se fosse un file
    reader = csv.reader(f)
    next(reader)  # Salta l'intestazione
    for row in reader:
        polo = row[0]
        location = row[1]
        usually_open = row[2] == "True"  # Converte la stringa in booleano

        # Aggiungi il polo e l'aula nella struttura 'usually_open_dict'
        if polo not in usually_open_dict:
            usually_open_dict[polo] = {}
        if location not in usually_open_dict[polo]:
            usually_open_dict[polo][location] = {}
        usually_open_dict[polo][location]['usually_open'] = usually_open

        if polo not in buildings_status:
            buildings_status[polo] = {}
            # Aggiungi le coordinate del polo
            buildings_status[polo]['coordinates'] = poli_coordinates[polo]
            # Aggiungi la chiave 'free' e 'availableSoon' per il polo
            buildings_status[polo]['free'] = False
            buildings_status[polo]['buildingAvailableSoon'] = False
        
        # Crea la struttura per l'aula nel polo
        buildings_status[polo][location] = {
            'lessons': [],
            'free': usually_open
        }

    f.close()



def parse_and_adjust_time(dt):
    # Trasforma il formato della stringa
    dt = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]} {dt[9:11]}:{dt[11:13]}:{dt[13:15]}"
    # Parsing della stringa in datetime con timezone UTC
    dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    # Conversione in ora locale (Europa/Roma)
    dt = dt.astimezone(pisa_timezone)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def load_calendars_and_parse():
    global poli_calendar_ids
    global poli_coordinates

    # se poli_calendar_ids non ha lo stesso numero di elementi di poli_coordinates, esce
    if len(poli_calendar_ids) != len(poli_coordinates):
        print("Errore: poli_calendar_ids e poli_coordinates non hanno lo stesso numero di elementi.")
        return

    get_unipi_calendars()
    all_lessons = []  # Lista per accumulare tutte le lezioni    
    # Itera sui nomi dei file .ics dalla variabile globale
    for filename in files:

        # Ottengo il polo attuale dal filename
        polo = filename.split('_')[1]  # Estrai il polo dal nome del file
        # Parsare gli eventi
        lessons = parse_ics(files[filename])
        
        # Aggiungi ad ogni lesson il polo
        for lesson in lessons:
            lesson['polo'] = polo

        # Aggiungi le lezioni del file corrente alla lista totale
        all_lessons.extend(lessons)
    print("Calendari caricati con successo.")
    load_dotenv()
    aule_csv_content = download_file_from_vercelFS("aule.csv")
    if aule_csv_content != None and aule_csv_content != "":
        parse_aule_csv(aule_csv_content)
            
    initialize_buildings_status(all_lessons)
    buildings_to_csv()
    
    return all_lessons  # Restituisci tutte le lezioni accumulate


def initialize_buildings_status(lessons):
    """
    Aggiorna la variabile globale `buildings_status` con lo stato attuale degli edifici.
    """
    global poli_coordinates
    global buildings_status


    now = datetime.now(pisa_timezone)
    
    # Itera su tutte le lezioni
    for lesson in lessons:
        polo = lesson['polo']
        if is_building_closed(polo, now):
            print("Skipped lesson in closed building: ", lesson)
            continue
        location = lesson['location']
        start_time = datetime.strptime(lesson['start'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
        end_time = datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)

        # Crea la struttura per il polo se non esiste già
        if polo not in buildings_status:
            buildings_status[polo] = {}
            # aggiungi le coordinate del polo
            buildings_status[polo]['coordinates'] = poli_coordinates[polo]
            buildings_status[polo]['buildingAvailableSoon'] = False

            
        # Crea la struttura per l'aula se non esiste già
        if location not in buildings_status[polo]:
            buildings_status[polo][location] = {
                'lessons': [],  # Lezioni future o in corso
                'free': True,    # Presume l'aula libera fino a prova contraria
                'roomAvailableSoon': False  # Presume l'aula non disponibile a breve fino a prova contraria
            }
        
        # Confronta l'orario per selezionare lezioni future o in corso oggi
        if start_time.date() == now.date() and end_time > now:
            if lesson['professor'] != "No description" and len(lesson['professor']) > 0:
                # rimuovi '\nNOTE:' e tutto ciò che segue da 'lesson['professor']
                lesson['professor'] = lesson['professor'].split("\\nNOTE")[0]
                # rimuovi tutte le '\' da 'lesson['professor']
                lesson['professor'] = lesson['professor'].replace("\\", "")
                lesson['professor'] = lesson['professor'].replace(" \\(.*?\\)", "")
                # Divide i nomi separati da virgola
                cleaned_professors_list = lesson['professor'].split(",")
            
                # Rimuove caratteri indesiderati e formatta i nomi
                cleaned_professors_list = [
                    prof.strip().split(".")[-1].strip() if "." in prof else " ".join(prof.split()[:-1])
                    for prof in cleaned_professors_list
                ]

                # Unisce i nomi dei professori
                cleaned_professors = ", ".join(cleaned_professors_list)
            
                # Limita a 70 caratteri
                if len(cleaned_professors) <= 70:
                    lesson['professor'] = cleaned_professors
                    # mette tutti i nomi in uppercase
                    lesson['professor'] = lesson['professor'].upper()
                else:
                    lesson['professor'] = 'No description'
            else:
                lesson['professor'] = 'No description'

            buildings_status[polo][location]['lessons'].append({
                'professor': lesson['professor'],
                'start': start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end': end_time.strftime('%Y-%m-%d %H:%M:%S'),
            })
            
            
            # Se c'è una lezione in corso al momento, l'aula non è libera
            if start_time <= now <= end_time:
                buildings_status[polo][location]['free'] = False

            # Se la lezione finisce entro 30 minuti, setto il campo 'availableSoon' a True. Come ne trovo una significa che anche il polo è disponibile a breve
            if end_time - now <= timedelta(minutes=30):
                buildings_status[polo][location]['roomAvailableSoon'] = True
                buildings_status[polo]['buildingAvailableSoon'] = True
    
    for polo in buildings_status:
        if is_building_closed(polo, now):
            buildings_status[polo]['isClosed'] = True
            buildings_status[polo]['free'] = False
            buildings_status[polo]['buildingAvailableSoon'] = False
            continue
        else:
            buildings_status[polo]['isClosed'] = False
            buildings_status[polo]['free'] = False
            buildings_status[polo]['buildingAvailableSoon'] = False

        # Imposta inizialmente il polo come non libero e non disponibile a breve
        is_building_free = False
        for location in buildings_status[polo]:
            if location not in ['coordinates', 'buildingAvailableSoon', 'free', 'isClosed']:
                if buildings_status[polo][location]['free'] == True:
                    is_building_free = True
                    break
        
        buildings_status[polo]['free'] = is_building_free

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
    # scorre buildings_status e rimuove le lezioni che sono terminate. Setta:
    # - il campo free della location a True se non ci sono lezioni in corso in questo momento
    # - il campo free del polo a True se c'è almeno una location libera
    # - il campo roomAvailableSoon della location a True se la location sarà libera entro 30 minuti
    # - il campo buildingAvailableSoon del polo a True se c'è almeno una location che sarà libera entro 30 minuti
    now = datetime.now(pisa_timezone)
    for polo in buildings_status:
        for location in buildings_status[polo]:
            if location not in ['coordinates', 'buildingAvailableSoon', 'free', 'isClosed']:
                # Rimuovi le lezioni terminate
                buildings_status[polo][location]['lessons'] = [lesson for lesson in buildings_status[polo][location]['lessons']
                                                               if datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone) > now]

                if not is_usually_open(polo, location):
                    buildings_status[polo][location]['free'] = False
                    buildings_status[polo][location]['roomAvailableSoon'] = False
                    continue
                
                # Imposta inizialmente l'aula come libera
                buildings_status[polo][location]['free'] = True
                buildings_status[polo][location]['roomAvailableSoon'] = False

                # Se l'aula ha almeno una lezione in corso, non è libera
                for lesson in buildings_status[polo][location]['lessons']:
                    start_time = datetime.strptime(lesson['start'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
                    end_time = datetime.strptime(lesson['end'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone)
                    # Controlla se la lezione è in corso
                    if start_time <= now <= end_time:
                        buildings_status[polo][location]['free'] = False

                        # Verifica se la lezione finisce entro 30 minuti
                        if end_time - now <= timedelta(minutes=30):
                            # Controlla se c'è un'altra lezione che inizia esattamente quando termina la lezione corrente
                            # oppure se inizia 15 minuti dopo la fine della lezione corrente
                            next_lesson_exists = any(
                                datetime.strptime(next_lesson['start'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=pisa_timezone) in {end_time, end_time + timedelta(minutes=15)}
                                for next_lesson in buildings_status[polo][location]['lessons']
                                )

                            # Se non c'è un'altra lezione che inizia quando termina l'attuale, setta 'availableSoon' a True
                            if not next_lesson_exists:
                                buildings_status[polo][location]['roomAvailableSoon'] = True
        

        # Se il polo ha almeno una aula liberata, il polo è considerato libero
        buildings_status[polo]['free'] = False
        for location in buildings_status[polo]:
            if location not in ['coordinates', 'buildingAvailableSoon', 'free','isClosed']:
                if buildings_status[polo][location]['free'] == True:
                    buildings_status[polo]['free'] = True
                    break
    
        # se il polo ha almeno una aula che sarà libera entro 30 minuti, il polo è considerato disponibile a breve
        buildings_status[polo]['buildingAvailableSoon'] = False
        for location in buildings_status[polo]:
            if location not in ['coordinates', 'buildingAvailableSoon', 'free', 'isClosed']:
                if buildings_status[polo][location]['roomAvailableSoon'] == True:
                    buildings_status[polo]['buildingAvailableSoon'] = True
                    break
    
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

    print(now)

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