from flask import Flask, jsonify, request
from datetime import datetime, timezone
import math
import unipi_calendar
import os

app = Flask(__name__)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c 

def get_slot_status(current_time, start_time_str, end_time_str):
    start_time = datetime.strptime(start_time_str, "%H:%M:%S").time()
    end_time = datetime.strptime(end_time_str, "%H:%M:%S").time()

    time_until = datetime.combine(datetime.today(), start_time) - datetime.combine(datetime.today(), current_time)
    time_until = time_until.total_seconds() / 60

    if time_until > 0 and time_until < 20:
        return "upcoming"
    elif start_time <= current_time <= end_time:
        return "available"
    elif current_time > end_time:
        return "passed"
    else:
        return "unavailable"
    
    

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Test route is working!"})


@app.route('/api/open-classrooms', methods=['GET', 'POST'])
def get_open_classrooms():
    user_lat = 0
    user_lng = 0

   
    if request.method == 'GET':
        print("get method")

    if request.method == 'POST':
        print("Method post")
        user_location = request.get_json()

        if user_location is None:
            return jsonify({"error": "No data provided"}), 400

        user_lat = user_location.get('lat')
        user_lng = user_location.get('lng')

        if user_lat is None or user_lng is None:
            return jsonify({"error": "Invalid location data. 'lat' and 'lng' are required."}), 400
        

    # se ./calendario_poloF_DATAODIERNA.ics non esiste, scarica i calendari
    today = datetime.now(timezone.utc).date()
    today = today.strftime("%Y-%m-%d")
    try:
        with open("./calendari/calendario_poloF_"+today+".ics", 'r') as f:
            print("Calendari trovati, evito il download")

    except FileNotFoundError:
        print("Calendari non trovati, procedo con il download")
        # svuota la cartella ./calendari
        for file in os.listdir("./calendari"):
            os.remove(f"./calendari/{file}")
        # scarica i calendari
        unipi_calendar.get_unipi_calendars()

    lessons = unipi_calendar.load_calendars_and_parse()
    buildings_status = unipi_calendar.get_buildings_status(lessons)

    return jsonify(buildings_status)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
