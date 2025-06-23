import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AssignPage from "./pages/AssignPage";
import HomePage from "./pages/HomePage";
import AppPage from "./pages/AppPage";
import ResultPage from "./pages/ResultPage";
import RecentPage from "./pages/RecentPage";
import ViewPage from "./pages/ViewPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/assign" element={<AssignPage />} />
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <HomePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <AppPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/result"
                    element={
                        <ProtectedRoute>
                            <ResultPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recent"
                    element={
                        <ProtectedRoute>
                            <RecentPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/view/:docId"
                    element={
                        <ProtectedRoute>
                            <ViewPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}
