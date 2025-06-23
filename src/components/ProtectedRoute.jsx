import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

export default function ProtectedRoute({ children }) {
    const [user, setUser] = React.useState(auth.currentUser);
    React.useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return () => unsub();
    }, []);
    if (user === undefined) return null;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}
