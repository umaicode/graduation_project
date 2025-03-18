CREATE DATABASE IF NOT EXISTS drowsiness_db;

USE drowsiness_db;

CREATE TABLE IF NOT EXISTS drowsiness_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL,
    blink_count INT NOT NULL,
    yawn_count INT NOT NULL
);