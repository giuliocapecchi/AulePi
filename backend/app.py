from flask import Flask, jsonify, request
from datetime import datetime
from zoneinfo import ZoneInfo # Python 3.9
import math
import unipi_calendar


app = Flask(__name__)


calendari = {} # chiavi : 'date' , 'lessons'
pisa_timezone = ZoneInfo("Europe/Rome")


def update_calendars():
    today = datetime.now(pisa_timezone).date()
    today = today.strftime("%Y-%m-%d")

    if calendari == {} or calendari['date'] != today:
        print("Calendari non presenti o non aggiornati")
        # scarico i calendari e li aggiungo al dizionario globale
        calendari['date'] = today
        calendari['lessons'] = unipi_calendar.load_calendars_and_parse()
    

@app.get('/')
def hello_world():
    return "Backend flask server for the AulePi project."
    
    

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Test route is working!"})


@app.route('/api/open-classrooms', methods=['GET'])
def get_open_classrooms():
    
    print("GET method invoked")    

    update_calendars() # la funzione controlla se i calendari sono già stati aggiornati per la data odierna. Se non lo sono esegue l'aggiornamento
    buildings_status = unipi_calendar.get_buildings_status()
    response = jsonify(buildings_status)
    
    # payload_size = len(response.get_data()) / (1024) 
    # print("Dim. della risposta:", payload_size)
    
    return response


if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=8080, debug=True)
    update_calendars()
    app.run(port=8080)
    