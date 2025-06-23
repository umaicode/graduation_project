import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import greenText from "../assets/greenText.svg";

export default function HomePage() {
    const [user, setUser] = React.useState(auth.currentUser);
    const navigate = useNavigate();

    usePageTitle("Home");

    React.useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return () => unsub();
    }, []);

    return (
        <div className="home-container">
            <img src={greenText} alt="로고" className="logo" />
            <p className="welcome">{user?.email}님 환영합니다.</p>

            <div className="button-column">
                <button
                    className="custom-btn signup"
                    onClick={() => navigate("/app")}
                >
                    <span>운전 시작</span>
                </button>

                <button
                    className="custom-btn signup"
                    onClick={() => navigate("/recent")}
                >
                    <span>최근 데이터 보기</span>
                </button>

                <button
                    className="custom-btn logout"
                    onClick={() => {
                        auth.signOut().then(() => navigate("/login"));
                    }}
                >
                    <span>로그아웃</span>
                </button>
            </div>
        </div>
    );
}
