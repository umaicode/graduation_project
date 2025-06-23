import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import blackText from "../assets/blackText.svg";

export default function LoginPage() {
    const [error, setError] = useState("");
    const navigate = useNavigate();

    usePageTitle("로그인");

    React.useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (user) navigate("/home");
        });
        return () => unsub();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        const password = e.target.password.value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/home");
        } catch {
            setError("ID(이메일)와 Password 정보가 일치하지 않습니다.");
        }
    };

    return (
        <div className="login-container">
            <img src={blackText} alt="로고" className="logo" />
            <form id="loginForm" onSubmit={handleSubmit}>
                <input
                    name="email"
                    type="email"
                    placeholder="아이디(이메일)"
                    required
                    autoFocus
                />
                <input
                    name="password"
                    type="password"
                    placeholder="비밀번호"
                    required
                />

                <div className="button-row">
                    <button
                        className="custom-btn signup"
                        onClick={() => navigate("/assign")}
                    >
                        <span>회원가입</span>
                    </button>

                    <button type="submit" className="custom-btn login">
                        <span>로그인</span>
                    </button>
                </div>
            </form>
            <p className="error">{error}</p>
        </div>
    );
}
