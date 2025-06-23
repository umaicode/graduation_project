import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { loadScript } from "../utils/loadScript";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import logo from "../assets/logo.png";

export default function ResultPage() {
    const navigate = useNavigate();
    const [user, setUser] = React.useState(auth.currentUser);

    usePageTitle("측정 결과");

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!sessionStorage.getItem("eyeCount")) {
            alert("측정 데이터가 없습니다. 홈으로 이동합니다.");
            navigate("/home");
            return;
        }
        (async () => {
            await loadScript("https://cdn.jsdelivr.net/npm/chart.js");
            const eyeCount = JSON.parse(
                sessionStorage.getItem("eyeCount") || "[]"
            );
            const yawnCount = JSON.parse(
                sessionStorage.getItem("yawnCount") || "[]"
            );
            const neckDownCount = JSON.parse(
                sessionStorage.getItem("neckDownCount") || "[]"
            );
            const minLen = Math.min(
                eyeCount.length,
                yawnCount.length,
                neckDownCount.length
            );
            const labels = Array.from(
                { length: minLen },
                (_, i) => `${i * 10}-${i * 10 + 10}s`
            );
            const container = document.getElementById("chartContainer");
            if (container) {
                container.innerHTML = "";
                [
                    {
                        arr: eyeCount,
                        label: "눈 깜빡임 횟수",
                        linecolor: "#54bb73",
                    },
                    {
                        arr: yawnCount,
                        label: "하품 횟수",
                        linecolor: "#e0616a",
                    },
                    {
                        arr: neckDownCount,
                        label: "고개 숙임 횟수",
                        linecolor: "#e9d158",
                    },
                ].forEach(({ arr, label, linecolor }) => {
                    const wr = document.createElement("section");
                    wr.className = "chart-wrapper";
                    container.appendChild(wr);
                    const c = document.createElement("canvas");
                    wr.appendChild(c);
                    new window.Chart(c.getContext("2d"), {
                        type: "line",
                        data: {
                            labels,
                            datasets: [
                                {
                                    label,
                                    data: arr.slice(0, minLen),
                                    fill: false,
                                    tension: 0.1,
                                    pointRadius: 4,
                                    borderColor: linecolor,
                                    backgroundColor: linecolor,
                                    pointBorderColor: linecolor,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectratio: 1.5,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        callback: (v) =>
                                            Number.isInteger(v) ? v : "",
                                    },
                                },
                            },
                        },
                    });
                });
            }
            // Firestore 저장
            if (!user) return;
            const now = new Date();
            const docId = `drive_${now.getFullYear()}${String(
                now.getMonth() + 1
            ).padStart(2, "0")}${String(now.getDate()).padStart(
                2,
                "0"
            )}_${String(now.getHours()).padStart(2, "0")}:${String(
                now.getMinutes()
            ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            await setDoc(
                doc(collection(db, "users", user.uid, "charts"), docId),
                {
                    timestamp: serverTimestamp(),
                    eyeCount,
                    yawnCount,
                    neckDownCount,
                }
            );
        })();
    }, [navigate, user]);

    return (
        <div className="home-container">
            <div id="chartContainer">
                <img src={logo} alt="로고" className="logo" />
            </div>
            <div className="button-row">
                <button
                    id="homeBtn"
                    className="custom-btn login"
                    onClick={() => {
                        sessionStorage.clear();
                        navigate("/home");
                    }}
                >
                    <span>홈으로 돌아가기</span>
                </button>
            </div>
        </div>
    );
}
