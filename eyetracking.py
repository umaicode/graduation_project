import cv2
import mediapipe as mp
import math
import time
import datetime
import csv


# 두 점 사이의 유클리드 거리 계산 함수
def euclidean_distance(point1, point2):
    return math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)


# 눈의 개방 정도(EAR)를 계산하는 함수
def eye_aspect_ratio(landmarks, eye_indices):
    p1 = landmarks[eye_indices[0]]
    p2 = landmarks[eye_indices[1]]
    p3 = landmarks[eye_indices[2]]
    p4 = landmarks[eye_indices[3]]
    p5 = landmarks[eye_indices[4]]
    p6 = landmarks[eye_indices[5]]
    ear = (euclidean_distance(p2, p6) + euclidean_distance(p3, p5)) / (
        2.0 * euclidean_distance(p1, p4)
    )
    return ear


# 하품(입 벌림) 비율 계산 함수
def mouth_open_ratio(landmarks):
    # 위 입술 중앙: 13, 아래 입술 중앙: 14, 왼쪽 입꼬리: 78, 오른쪽 입꼬리: 308
    top_lip = landmarks[13]
    bottom_lip = landmarks[14]
    left_mouth = landmarks[78]
    right_mouth = landmarks[308]
    vertical_distance = euclidean_distance(top_lip, bottom_lip)
    horizontal_distance = euclidean_distance(left_mouth, right_mouth)
    ratio = vertical_distance / horizontal_distance
    return ratio


# 얼굴 기울기(고개 기울기) 각도 계산 함수
def head_tilt_angle(landmarks):
    left_eye = landmarks[33]
    right_eye = landmarks[362]
    delta_y = right_eye[1] - left_eye[1]
    delta_x = right_eye[0] - left_eye[0]
    angle = math.degrees(math.atan2(delta_y, delta_x))
    return angle


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

# 임계값 설정 (필요에 따라 조정)
EAR_THRESHOLD = 0.25  # 눈 감김 판단 기준
EAR_CONSEC_FRAMES = 20  # 연속 프레임 수 (눈 감김 지속시간)
MOUTH_RATIO_THRESHOLD = 0.6  # 입 벌림 비율 기준 (하품 감지)
HEAD_TILT_THRESHOLD = 10  # 고개 기울기 임계값 (도, degree)
INTERVAL = 30  # 초기화 간격 (초)

closed_eye_frames = 0
blink_counter = 0
yawn_counter = 0
yawn_in_progress = False  # 하품 이벤트 중복 카운팅 방지를 위한 flag

# 타이머 시작 (시작 시간)
start_interval = time.time()

# 로그 데이터를 저장할 리스트 예시
logs = []

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # BGR 이미지를 RGB로 변환
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            h, w, _ = frame.shape
            landmarks = []
            # 각 landmark의 좌표를 픽셀 단위로 변환
            for lm in face_landmarks.landmark:
                landmarks.append((int(lm.x * w), int(lm.y * h)))

            # 왼쪽, 오른쪽 눈 EAR 계산
            left_eye_indices = [33, 160, 158, 133, 153, 144]
            right_eye_indices = [362, 385, 387, 263, 373, 380]
            left_ear = eye_aspect_ratio(landmarks, left_eye_indices)
            right_ear = eye_aspect_ratio(landmarks, right_eye_indices)
            ear = (left_ear + right_ear) / 2.0

            # 입 벌림 비율 계산
            mouth_ratio = mouth_open_ratio(landmarks)

            # 얼굴 기울기 계산
            tilt_angle = head_tilt_angle(landmarks)

            # 결과 텍스트 표시
            cv2.putText(
                frame,
                f"EAR: {ear:.2f}",
                (30, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )
            cv2.putText(
                frame,
                f"Mouth Ratio: {mouth_ratio:.2f}",
                (30, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )
            cv2.putText(
                frame,
                f"Head Tilt: {tilt_angle:.2f}",
                (30, 90),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

            # 눈 감김 지속시간 및 깜빡임 판단
            if ear < EAR_THRESHOLD:
                closed_eye_frames += 1
            else:
                if closed_eye_frames >= EAR_CONSEC_FRAMES:
                    blink_counter += 1
                closed_eye_frames = 0

            # 하품 감지 (한 번의 하품 이벤트만 기록)
            if mouth_ratio > MOUTH_RATIO_THRESHOLD:
                if not yawn_in_progress:
                    yawn_counter += 1
                    yawn_in_progress = True
                    cv2.putText(
                        frame,
                        "Yawning Detected",
                        (30, 150),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2,
                    )
            else:
                yawn_in_progress = False

            # 고개 기울기(떨어짐) 판단
            if abs(tilt_angle) > HEAD_TILT_THRESHOLD:
                cv2.putText(
                    frame,
                    "Head Drooping",
                    (30, 180),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )

    # 30초마다 blink_counter와 yawn_counter 초기화 및 시간 범위 기록
    elapsed_time = time.time() - start_interval
    if elapsed_time >= INTERVAL:
        end_interval = time.time()

        # 시작, 종료 날짜 및 시간 변수 생성
        start_dt = datetime.datetime.fromtimestamp(start_interval)
        end_dt = datetime.datetime.fromtimestamp(end_interval)
        start_date = start_dt.strftime("%Y:%m:%d")
        start_time_str = start_dt.strftime("%H:%M:%S")
        end_date = end_dt.strftime("%Y:%m:%d")
        end_time_str = end_dt.strftime("%H:%M:%S")

        # 로그 문자열 생성
        log_string = (
            f"{blink_counter} | {yawn_counter} | "
            f"{start_date} | {start_time_str} | "
            f"{end_date} | {end_time_str} |"
        )
        print(log_string)

        # 로그 데이터를 리스트에 저장 (원하는 형식으로 저장 가능)
        logs.append(
            {
                "blink_count": blink_counter,
                "yawn_count": yawn_counter,
                "start_date": start_date,
                "start_time": start_time_str,
                "end_date": end_date,
                "end_time": end_time_str,
            }
        )

        # 카운터 초기화 및 타이머 재설정
        blink_counter = 0
        yawn_counter = 0
        start_interval = time.time()

    # 화면에 blink_count와 yawn_count 표시
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

# 로그 데이터를 파일로 저장하는 예 (CSV 파일 예시)
with open("drowsiness_logs.csv", mode="w", newline="") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "blink_count",
            "yawn_count",
            "start_date",
            "start_time",
            "end_date",
            "end_time",
        ],
    )
    writer.writeheader()
    for log in logs:
        writer.writerow(log)
