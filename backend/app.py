from flask import Flask, jsonify, request
from datetime import datetime
from zoneinfo import ZoneInfo # Python 3.9
import math
from threading import Lock
import unipi_calendar


app = Flask(__name__)


calendari = {} # chiavi : 'date' , 'lessons'
calendar_lock = Lock()
pisa_timezone = ZoneInfo("Europe/Rome")


def update_calendars():
    today = datetime.now(pisa_timezone).date()
    today = today.strftime("%Y-%m-%d")

    # Share cold initialization between concurrent requests and publish the
    # cache date only after a successful refresh, so failures can be retried.
    with calendar_lock:
        if not calendari or calendari['date'] != today:
            lessons = unipi_calendar.load_calendars_and_parse()
            calendari.update(date=today, lessons=lessons)


@app.get('/')
def hello_world():
    return "Backend flask server for the AulePi project."
    
    

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Test route is working!"})


@app.route('/api/open-classrooms', methods=['GET'])
def get_open_classrooms():
    print("GET method invoked")
    update_calendars()
    buildings_status = unipi_calendar.get_buildings_status()
    return jsonify({polo: building.model_dump() for polo, building in buildings_status.items()})


if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=8080, debug=True)
    update_calendars()
    app.run(port=8080)
    