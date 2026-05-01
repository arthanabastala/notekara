import React, { useState } from "react";
import { API_BASE_URL } from "../api";

interface LoginProps {
  onLogin: (token: string, username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/login" : "/register";

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred");
      }

      if (isLogin) {
        onLogin(data.token, data.username);
      } else {
        // Success register, auto switch to login
        setIsLogin(true);
        setError("Registration successful! Please log in.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <div className="w-full max-w-md node-card element-shadow bg-yellow-300 p-8 text-black">
        <h2 className="mb-6 text-center bold-title text-4xl uppercase">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        
        {error && (
          <div className={`mb-4 border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest ${error.includes("successful") ? "bg-green-400 text-black" : "bg-red-500 text-white"}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/60">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-white p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-white p-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border-2 border-black bg-blue-600 py-3 px-4 text-xs font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:bg-blue-700 active:translate-y-1 active:translate-x-1 active:shadow-none disabled:bg-blue-400 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : isLogin ? "Log In" : "Register"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold uppercase text-black/60">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="text-black font-black hover:underline"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Register here" : "Log in here"}
          </button>
        </p>
      </div>
    </div>
  );
}
