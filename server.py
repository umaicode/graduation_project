from flask import Flask, jsonify
import mysql.connector

app = Flask(__name__)

db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "1234",
    "database": "blink_db",
}


def get_db_connection():
    conn = mysql.connector.connect(**db_config)
    return conn


@app.route("/api/blink_data")
def blink_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT timestamp, blink_count FROM BlinkCount ORDER BY timestamp ASC"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    # JSON 반환을 위한 데이터 구성
    data = [
        {"timestamp": row["timestamp"], "blink_count": row["blink_count"]}
        for row in rows
    ]
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)
