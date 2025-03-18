DROP DATABASE IF EXISTS blink_db;
CREATE DATABASE blink_db;
USE blink_db;
DROP TABLE IF EXISTS BlinkCount;
CREATE TABLE BlinkCount (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    blink_count INT NOT NULL
);
INSERT INTO BlinkCount (timestamp, blink_count) VALUES
('2021-10-26 10:00:00', 15),
('2021-10-26 10:05:00', 27),
('2021-10-26 10:10:00', 32),
('2021-10-26 10:15:00', 19),
('2021-10-26 10:20:00', 45);
