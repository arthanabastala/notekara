/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Canvas } from "./components/Canvas";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    
    if (storedToken && storedUsername) {
      // Basic check if token exists, real validation happens on backend APIs
      setToken(storedToken);
      setUsername(storedUsername);
    }
  }, []);

  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
  };

  if (!token || !username) {
    return <Login onLogin={handleLogin} />;
  }

  return <Canvas username={username} onLogout={handleLogout} />;
}
