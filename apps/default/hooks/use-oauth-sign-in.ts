import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { makeRedirectUri } from "expo-auth-session";
import { completeConvexAuthMobileOAuth } from "../._bloom/internal/_bloomInternalConvexAuthMobile";

const redirectTo = makeRedirectUri();

/**
 * Hook that handles OAuth sign-in for both web and mobile.
 *
 * On web, Convex Auth opens a popup automatically.
 * On mobile, this hook opens an in-app browser and handles the redirect.
 *
 * Usage:
 *   const { signInWith, isLoading } = useOAuthSignIn();
 *   <Button onPress={() => signInWith("google")} disabled={isLoading} />
 */
export function useOAuthSignIn() {
    const { signIn } = useAuthActions();
    const [isLoading, setIsLoading] = useState(false);

    const signInWith = useCallback(
        async (provider: "google" | "github" | "apple") => {
            setIsLoading(true);
            try {
                const { redirect } = await signIn(provider, { redirectTo });
                if (Platform.OS !== "web" && redirect) {
                    await completeConvexAuthMobileOAuth(signIn, provider, redirect, redirectTo);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [signIn]
    );

    return { signInWith, isLoading };
}
