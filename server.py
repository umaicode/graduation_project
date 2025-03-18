from flask import Flask, jsonify, render_template
import mysql.connector

app = Flask(__name__)

db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "0010",
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
    data = [
        {"timestamp": row["timestamp"], "blink_count": row["blink_count"]}
        for row in rows
    ]
    return jsonify(data)


@app.route("/")
def index():
    return render_template("main.html")  # templates 폴더에 main.html 위치


if __name__ == "__main__":
    # 포트를 5000 혹은 원하는 다른 포트로 실행
    app.run(debug=True, port=5000)
