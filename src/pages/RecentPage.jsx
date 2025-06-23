import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/";
import usePageTitle from "../hooks/usePageTitle";
import yellowText from "../assets/yellowText.svg";

export default function RecentPage() {
    const [docs, setDocs] = useState([]);
    const [user, setUser] = React.useState(auth.currentUser);
    const navigate = useNavigate();

    usePageTitle("최근 측정된 데이터");

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const q = query(
                    collection(db, "users", user.uid, "charts"),
                    orderBy("timestamp", "desc"),
                    limit(10)
                );
                const sn = await getDocs(q);
                setDocs(
                    sn.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                );
            } catch (e) {
                setDocs(null);
            }
        })();
    }, [user]);

    return (
        <div className="recent-container">
            <img src={yellowText} alt="로고" className="logo" />
            <ul>
                {docs === null ? (
                    <li>데이터를 불러오지 못했습니다.</li>
                ) : (
                    docs.map((d) => (
                        <li
                            key={d.id}
                            onClick={() => navigate(`/view/${d.id}`)}
                            style={{ cursor: "pointer" }}
                        >
                            {d.timestamp && d.timestamp.toDate
                                ? d.timestamp.toDate().toLocaleString()
                                : "시간정보 없음"}
                        </li>
                    ))
                )}
            </ul>
            <div className="button-row">
                <button
                    className="custom-btn login"
                    id="homeBtn"
                    onClick={() => navigate("/home")}
                >
                    <span>홈으로 돌아가기</span>
                </button>
            </div>
        </div>
    );
}
