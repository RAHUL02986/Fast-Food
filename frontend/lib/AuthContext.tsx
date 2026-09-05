"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "./api";
import type { SavedAddress, User } from "@/types";

export type { SavedAddress, User };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithOtp: (identifier: string, otp: string) => Promise<User>;
  requestOtp: (identifier: string) => Promise<string>;
<<<<<<< HEAD
  signup: (name: string, email: string, password: string, role: string, invitationCode?: string, extra?: { phone?: string; isDeliveryPartner?: boolean }) => Promise<User>;
=======
  signup: (name: string, email: string, password: string, role: string) => Promise<User>;
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          // getProfile returns the raw user object (no envelope)
          const data = await authAPI.getProfile();
          setUser(data);
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const requestOtp = async (identifier: string): Promise<string> => {
    const data = await authAPI.requestOtp({ identifier });
    return data.otp || ""; // dev/demo only: the API returns the OTP when NODE_ENV !== "production"
  };

  const loginWithOtp = async (identifier: string, otp: string): Promise<User> => {
    const data = await authAPI.verifyOtp({ identifier, otp });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

<<<<<<< HEAD
  const signup = async (name: string, email: string, password: string, role: string, invitationCode?: string, extra?: { phone?: string; isDeliveryPartner?: boolean }): Promise<User> => {
    const signupPayload: any = { name, email, password, role, phone: extra?.phone || undefined, isDeliveryPartner: extra?.isDeliveryPartner || undefined };
    if (invitationCode) {
      signupPayload.invitationCode = invitationCode;
    }
    const data = await authAPI.signup(signupPayload);
=======
  const signup = async (name: string, email: string, password: string, role: string): Promise<User> => {
    const data = await authAPI.signup({ name, email, password, role });
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const response = await authAPI.updateProfile(data);
    setUser(response.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithOtp, requestOtp, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
