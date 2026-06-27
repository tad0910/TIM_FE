import React, { createContext, useContext, useEffect, useState, type ReactNode, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import UserService from '../modules/auth/services/keycloakService';

// Define the User interface matching the AuthStore one for compatibility
interface User {
    id: string;
    username: string;
    email: string;
    role?: string;
}

interface UserContextType {
    user: User | null; // Augmented user with DB ID
    dbId: number | null;
    isLoading: boolean;
    error: string | null;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuthStore();
    const [dbId, setDbId] = useState<number | null>(null);
    const [dbRole, setDbRole] = useState<string | null>(null); // New state for Role
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function to fetch user profile using email
    const fetchDbId = async (email: string) => {
        try {
            setIsLoading(true);
            setError(null);

            console.log("🚀 [UserContext] Calling API to resolve identity for:", email);

            // 1. Gọi API
            const response = await api.get(`/users/profile/${email}`);

            console.log("[UserContext] Raw API Response:", response);

            // 2. Xử lý linh hoạt các trường hợp cấu trúc data
            const rawData = (response as any)?.data || response;
            const userData = (rawData as any)?.user || rawData;

            // 3. Tìm ID
            const backendId = userData?.userId || userData?.id;

            // 4. Tìm Role (Fix missing Admin role)
            const backendRole = userData?.role;

            if (backendId) {
                const numericId = Number(backendId);
                if (!isNaN(numericId)) {
                    console.log("[UserContext] Identity Resolved! DB ID =", numericId);
                    setDbId(numericId);
                } else {
                    throw new Error(`User ID from backend is not a number: ${backendId}`);
                }
            } else {
                console.warn("[UserContext] Data structure mismatch. Received:", userData);
                throw new Error("Could not find 'id' or 'userId' in backend response.");
            }

            if (backendRole) {
                console.log("[UserContext] Role Resolved:", backendRole);
                setDbRole(backendRole);
            }

        } catch (err: any) {
            console.error("[UserContext] Identity Resolution Failed:", err);
            setError(err.message || "Failed to resolve user identity.");
            setDbId(null);
            setDbRole(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkAuthAndResolve = async () => {
            const isAuth = UserService.isLoggedIn();

            if (!isAuth) {
                setIsLoading(false);
                setDbId(null);
                setDbRole(null);
                return;
            }

            let emailToSearch = authUser?.email;

            if (!emailToSearch) {
                const tokenParsed = UserService.getKeyCloack()?.tokenParsed;
                emailToSearch = tokenParsed?.email || tokenParsed?.preferred_username;
            }

            if (emailToSearch) {
                await fetchDbId(emailToSearch);
            } else {
                // Determine if we can trust existing info
                if (authUser?.id && !isNaN(Number(authUser.id))) {
                    setDbId(Number(authUser.id));
                    if (authUser.role) setDbRole(authUser.role);
                    setIsLoading(false);
                } else {
                    setIsLoading(false);
                }
            }
        };

        checkAuthAndResolve();
    }, [authUser, UserService.getToken()]);

    const refreshProfile = async () => {
        if (authUser?.email) {
            await fetchDbId(authUser.email);
        }
    };

    // Construct the context value
    const contextValue = useMemo(() => {
        let finalUser = authUser;

        // Merge logic: prefer DB info over AuthStore info
        if (authUser) {
            finalUser = {
                ...authUser,
                id: dbId ? dbId.toString() : authUser.id,
                role: dbRole || authUser.role || 'USER'
            };

            // EMERGENCY FIX: If username is 'admin', force ADMIN role
            // This addresses the "FE hardcode" hint from the user
            if (finalUser.username === 'admin' && finalUser.role !== 'ADMIN' && finalUser.role !== 'ROLE_ADMIN') {
                console.log("Force assigning ADMIN role to user 'admin'");
                finalUser.role = 'ADMIN';
            }
        }

        return {
            user: finalUser,
            dbId,
            isLoading,
            error,
            refreshProfile
        };
    }, [authUser, dbId, dbRole, isLoading, error]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// Alias for newer/stricter usage if preferred
export const useUserContext = useUser;
