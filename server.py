from flask import Flask, jsonify, render_template
import mysql.connector

app = Flask(__name__)

db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "0010",  # Adjust your password here
    "database": "drowsiness_db",  # Update to your actual DB name
}


def get_db_connection():
    conn = mysql.connector.connect(**db_config)
    return conn


@app.route("/api/blink_data")
def blink_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT CONCAT(date, ' ', time) AS timestamp, blink_count FROM drowsiness_log ORDER BY date, time ASC"
    )

    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    data = [
        {"timestamp": row["timestamp"], "blink_count": row["blink_count"]}
        for row in rows
    ]
    return jsonify(data)


@app.route("/api/yawn_data")
def yawn_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT CONCAT(date, ' ', time) AS timestamp, yawn_count FROM drowsiness_log ORDER BY date, time ASC"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    data = [
        {"timestamp": row["timestamp"], "yawn_count": row["yawn_count"]} for row in rows
    ]
    return jsonify(data)


@app.route("/")
def index():
    return render_template(
        "main.html"
    )  # Ensure you have the correct path to the HTML file


if __name__ == "__main__":
    app.run(debug=True, port=5000)
