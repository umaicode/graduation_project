import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { loadScript } from "../utils/loadScript";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import logo from "../assets/logo.png";

export default function ViewPage() {
    const { docId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = React.useState(auth.currentUser);

    usePageTitle("측정 데이터 보기");

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return () => unsub();
    }, []);

    useEffect(() => {
        (async () => {
            await loadScript("https://cdn.jsdelivr.net/npm/chart.js");
            const container = document.getElementById("chartContainer");
            if (!docId) {
                container.textContent = "잘못된 접근입니다.";
                return;
            }
            try {
                if (!user) return;
                const d = await getDoc(
                    doc(db, "users", user.uid, "charts", docId)
                );
                if (!d.exists()) throw new Error("데이터가 없습니다.");
                const { eyeCount, yawnCount, neckDownCount } = d.data();
                const minLen = Math.min(
                    eyeCount.length,
                    yawnCount.length,
                    neckDownCount.length
                );
                const labels = Array.from(
                    { length: minLen },
                    (_, i) => `${i * 10}-${i * 10 + 10}s`
                );
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
            } catch (e) {
                container.textContent = "데이터를 불러오지 못했습니다.";
            }
        })();
    }, [docId, user]);

    return (
        <div className="login-container">
            <div id="chartContainer">
                <img src={logo} alt="로고" className="logo" />
            </div>
            <div className="button-row">
                <button
                    id="homeBtn"
                    className="custom-btn login"
                    onClick={() => navigate("/home")}
                >
                    <span>홈으로 돌아가기</span>
                </button>
            </div>
        </div>
    );
}
