import cv2
import mediapipe as mp
import math
import time
import datetime
import pandas as pd
from sqlalchemy import create_engine

# MySQL 연결 설정 (SQLAlchemy)
DB_USER = "root"
DB_PASSWORD = "0010"  # 본인의 MySQL 비밀번호로 변경
DB_HOST = "localhost"
DB_NAME = "drowsiness_db"

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")


# 두 점 사이의 유클리드 거리 계산 함수
def euclidean_distance(point1, point2):
    return math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)


# 눈의 개방 정도(EAR)를 계산하는 함수
def eye_aspect_ratio(landmarks, eye_indices):
    p1, p2, p3, p4, p5, p6 = [landmarks[i] for i in eye_indices]
    return (euclidean_distance(p2, p6) + euclidean_distance(p3, p5)) / (
        2.0 * euclidean_distance(p1, p4)
    )


# 하품(입 벌림) 비율 계산 함수
def mouth_open_ratio(landmarks):
    return euclidean_distance(landmarks[13], landmarks[14]) / euclidean_distance(
        landmarks[78], landmarks[308]
    )


# MediaPipe Face Mesh 초기화
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

cap = cv2.VideoCapture(0)

# 설정값
EAR_THRESHOLD = 0.25
EAR_CONSEC_FRAMES = 20
MOUTH_RATIO_THRESHOLD = 0.6
INTERVAL = 10  # **10초 간격 저장**

closed_eye_frames = 0
blink_counter = 0
yawn_counter = 0
yawn_in_progress = False
start_interval = time.time()

# 데이터 저장을 위한 리스트 (Pandas 변환용)
data_list = []

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            h, w, _ = frame.shape
            landmarks = [
                (int(lm.x * w), int(lm.y * h)) for lm in face_landmarks.landmark
            ]

            left_ear = eye_aspect_ratio(landmarks, [33, 160, 158, 133, 153, 144])
            right_ear = eye_aspect_ratio(landmarks, [362, 385, 387, 263, 373, 380])
            ear = (left_ear + right_ear) / 2.0

            mouth_ratio = mouth_open_ratio(landmarks)

            # 눈 감김 여부 체크
            if ear < EAR_THRESHOLD:
                closed_eye_frames += 1
            else:
                if closed_eye_frames >= EAR_CONSEC_FRAMES:
                    blink_counter += 1
                closed_eye_frames = 0

            # 하품 감지
            if mouth_ratio > MOUTH_RATIO_THRESHOLD and not yawn_in_progress:
                yawn_counter += 1
                yawn_in_progress = True
            elif mouth_ratio <= MOUTH_RATIO_THRESHOLD:
                yawn_in_progress = False

    # **10초마다 데이터 저장**
    elapsed_time = time.time() - start_interval
    if elapsed_time >= INTERVAL:
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")

        # 데이터 추가
        data_list.append([date_str, time_str, blink_counter, yawn_counter])

        # **Pandas DataFrame 변환**
        df = pd.DataFrame(
            data_list, columns=["date", "time", "blink_count", "yawn_count"]
        )

        # **MySQL로 데이터 저장**
        df.to_sql("drowsiness_log", con=engine, if_exists="append", index=False)

        print(f"✅ DB 저장됨: {len(df)}개 기록 추가됨.")

        # 리스트 초기화 (데이터 중복 방지)
        data_list.clear()

        # 카운터 초기화 및 타이머 재설정
        blink_counter = 0
        yawn_counter = 0
        start_interval = time.time()

    cv2.putText(
        frame,
        f"Blink Count: {blink_counter}",
        (30, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )
    cv2.putText(
        frame,
        f"Yawn Count: {yawn_counter}",
        (30, 210),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    cv2.imshow("Drowsiness Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
engine.dispose()
