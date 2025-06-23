import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadScript } from "../utils/loadScript";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import pinkText from "../assets/pinkText.svg";
import warningSound from "../assets/ping_missing.mp3";

export default function AppPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const inited = useRef(false);
    const [videoReady, setVideoReady] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const alertAudio = useRef(new Audio(warningSound));

    usePageTitle("운전 중 피로도 측정");

    function showAlert(message) {
        // 이미 같은 메시지가 떠 있으면 무시
        if (alertMessage === message) return;

        setAlertMessage(message);
        alertAudio.current.play();

        setTimeout(() => {
            setAlertMessage("");
        }, 3000);
    }

    function distance(a, b) {
        const dx = (a.x - b.x) * canvasRef.current.width;
        const dy = (a.y - b.y) * canvasRef.current.height;
        return Math.hypot(dx, dy);
    }

    function calcEAR(lm, idx) {
        const [p1, p2, p3, p4, p5, p6] = idx.map((i) => lm[i]);
        return (distance(p2, p6) + distance(p3, p5)) / (2 * distance(p1, p4));
    }

    function calcMAR(lm, idx) {
        const [t, b, lft, rt] = idx.map((i) => lm[i]);
        return distance(t, b) / distance(lft, rt);
    }

    function calcHeadPitch(lm) {
        const n = lm[1],
            c = lm[152];
        return Math.abs(Math.atan2(c.y - n.y, c.x - n.x) * (180 / Math.PI));
    }

    useEffect(() => {
        if (inited.current) return;
        inited.current = true;

        // 비디오 준비 이벤트 핸들러
        const video = videoRef.current;
        video.addEventListener("loadedmetadata", () => {
            setVideoReady(true);
        });

        const dpr = window.devicePixelRatio || 1;
        let camera;
        let closedEyeFrames = 0,
            openMouthFrames = 0,
            neckDownFrames = 0,
            smoothedPitch = 0;
        let blinkEvents = 0,
            yawnEvents = 0,
            neckDownEvents = 0;
        const eyeCount = [],
            yawnCount = [],
            neckDownCount = [];

        const EAR_THRESHOLD = 0.25,
            FATIGUE_FRAME_COUNT = 15,
            MAR_THRESHOLD = 0.7,
            YAWN_CONSEC_FRAMES = 20,
            NECK_CONSEC_FRAMES = 15,
            PITCH_ALPHA = 0.2,
            PITCH_THRESHOLD = 85;

        async function loadMediapipe() {
            await loadScript(
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js"
            );
            await loadScript(
                "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js"
            );
            await loadScript(
                "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js"
            );

            const FACEMESH_TESSELATION = window.FACEMESH_TESSELATION;
            const drawConnectors = window.drawConnectors;
            const drawLandmarks = window.drawLandmarks;

            const faceMesh = new window.FaceMesh({
                locateFile: (f) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`,
            });
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6,
            });
            faceMesh.onResults(
                onResults.bind(null, {
                    drawConnectors,
                    drawLandmarks,
                    FACEMESH_TESSELATION,
                    dpr,
                })
            );

            camera = new window.Camera(videoRef.current, {
                onFrame: async () =>
                    await faceMesh.send({ image: videoRef.current }),
                width: 1280, // 명시적 해상도 설정
                height: 720,
            });
            camera.start();

            const statTimer = setInterval(() => {
                eyeCount.push(blinkEvents);
                yawnCount.push(yawnEvents);
                neckDownCount.push(neckDownEvents);
                blinkEvents = yawnEvents = neckDownEvents = 0;
            }, 10000);

            function finishDriving() {
                camera.stop();
                clearInterval(statTimer);
                sessionStorage.setItem("eyeCount", JSON.stringify(eyeCount));
                sessionStorage.setItem("yawnCount", JSON.stringify(yawnCount));
                sessionStorage.setItem(
                    "neckDownCount",
                    JSON.stringify(neckDownCount)
                );
                setTimeout(() => navigate("/result"), 300);
            }

            window.addEventListener("keydown", (e) => {
                if (e.key.toLowerCase() === "q") finishDriving();
            });
            document.getElementById("stopBtn").onclick = finishDriving;

            return () => {
                camera && camera.stop();
                clearInterval(statTimer);
            };
        }

        function onResults(
            { drawConnectors, drawLandmarks, FACEMESH_TESSELATION, dpr },
            results
        ) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (!results.multiFaceLandmarks?.length) return;

            // 비디오와 캔버스의 크기를 동일하게 설정
            const vidW = video.videoWidth;
            const vidH = video.videoHeight;

            // 캔버스의 실제 픽셀 크기 설정 (dpr 고려)
            canvas.width = vidW;
            canvas.height = vidH;

            // 캔버스 초기화
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 미러링 효과 적용
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            // FaceMesh 그리기
            drawConnectors(
                ctx,
                results.multiFaceLandmarks[0],
                FACEMESH_TESSELATION,
                { color: "#C0C0C070", lineWidth: 1 }
            );
            drawLandmarks(ctx, results.multiFaceLandmarks[0], {
                color: "#30FF30",
                radius: 1,
            });

            ctx.restore();

            // 피로도 측정 계산 로직
            const lm = results.multiFaceLandmarks[0];
            const EAR =
                (calcEAR(lm, [33, 160, 158, 133, 153, 144]) +
                    calcEAR(lm, [362, 385, 387, 263, 373, 380])) /
                2;
            const MAR = calcMAR(lm, [13, 14, 78, 308]);
            let rawPitch = calcHeadPitch(lm);
            smoothedPitch =
                PITCH_ALPHA * rawPitch + (1 - PITCH_ALPHA) * smoothedPitch;
            const pitch = smoothedPitch;

            // 상태 표시 텍스트 그리기
            if (EAR < EAR_THRESHOLD) closedEyeFrames++;
            else {
                if (closedEyeFrames >= FATIGUE_FRAME_COUNT) blinkEvents++;
                closedEyeFrames = 0;
            }

            if (closedEyeFrames >= FATIGUE_FRAME_COUNT) {
                showAlert("눈을 감고 계십니다! 잠시 휴식을 취하세요.");
            }

            if (MAR > MAR_THRESHOLD) openMouthFrames++;
            else {
                if (openMouthFrames >= YAWN_CONSEC_FRAMES) yawnEvents++;
                openMouthFrames = 0;
            }

            if (openMouthFrames > 0) {
                showAlert("하품을 하고 계십니다! 잠시 휴식을 취하세요.");
            }

            if (pitch < PITCH_THRESHOLD) neckDownFrames++;
            else {
                if (neckDownFrames >= NECK_CONSEC_FRAMES) neckDownEvents++;
                showAlert("고개를 숙이고 계십니다! 잠시 휴식을 취하세요.");
                neckDownFrames = 0;
            }
        }

        loadMediapipe();
    }, [navigate]);

    return (
        <div
            style={{
                position: "relative",
                width: "100vw",
                height: "100dvh",
                background: "#000",
                overflow: "hidden",
            }}
        >
            {alertMessage && (
                <div
                    style={{
                        position: "absolute",
                        top: "2rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(255, 0, 0, 0.85)",
                        color: "#fff",
                        padding: "0.6rem 1rem",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        zIndex: 20,
                        maxWidth: "90%",
                        textAlign: "center",
                        whiteSpace: "pre-line",
                    }}
                >
                    {alertMessage}
                </div>
            )}
            <img
                src={pinkText}
                alt="측정 중"
                style={{
                    position: "absolute",
                    top: "10",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "2rem",
                    height: "60px",
                    zIndex: 10,
                }}
            />
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <video
                    ref={videoRef}
                    id="video"
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                    }}
                    playsInline
                    muted
                    autoPlay
                />
                <canvas
                    ref={canvasRef}
                    id="overlay"
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                />
            </div>
            <button
                id="stopBtn"
                className="custom-btn logout"
                style={{
                    position: "absolute",
                    bottom: "8rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10,
                    fontSize: "1rem",
                }}
            >
                <span>운전 종료</span>
            </button>
        </div>
    );
}
