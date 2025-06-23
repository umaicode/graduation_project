import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import "../styles";
import usePageTitle from "../hooks/usePageTitle";
import blackText from "../assets/blackText.svg";

export default function AssignPage() {
    const [msg, setMsg] = useState("");
    const navigate = useNavigate();

    usePageTitle("회원가입");

    const handleSignup = async (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        const password = e.target.password.value;
        setMsg("");
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate("/login");
        } catch (err) {
            setMsg(err.message);
        }
    };

    return (
        <div className="login-container">
            <img src={blackText} alt="로고" className="logo" />
            <form onSubmit={handleSignup}>
                <input
                    type="email"
                    name="email"
                    placeholder="아이디(이메일)"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    required
                />
                <div className="button-row">
                    <button type="submit" className="custom-btn login">
                        <span>가입하기</span>
                    </button>
                </div>
            </form>
            <p className="error">{msg}</p>
        </div>
    );
}
