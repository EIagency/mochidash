// lib/_bloomInternalConvexAuthMobile.ts
// Bloom internal module - do not modify
//
// Completes Convex Auth OAuth on native after signIn() returns a redirect URL.
// Opens the user deployment sign-in route in ASWebAuthenticationSession so
// state/PKCE cookies are set on CONVEX_SITE before the Bloom OAuth relay hop.

import { Platform } from "react-native";

if (Platform.OS !== "web") {
    try {
        require("expo-constants");
        (globalThis as { __bloom_oauth_version?: string }).__bloom_oauth_version =
            "84";
    } catch {
        // expo-constants optional during typecheck
    }
}

type ConvexAuthSignInParams = {
    code?: string;
    state?: string;
    redirectTo?: string;
};

type ConvexSignIn = (
    provider: string,
    args?: ConvexAuthSignInParams
) => Promise<{ redirect?: URL; signingIn?: boolean }>;

/**
 * Opens the Convex Auth sign-in redirect in a native auth session and completes
 * the flow with the authorization code returned to the app scheme.
 */
export async function completeConvexAuthMobileOAuth(
    signIn: ConvexSignIn,
    provider: string,
    redirect: URL,
    redirectTo: string
): Promise<void> {
    if (Platform.OS === "web") {
        return;
    }

    const WebBrowser: typeof import("expo-web-browser") = require("expo-web-browser");

    if (Platform.OS === "android") {
        try {
            WebBrowser.dismissAuthSession();
        } catch {
            // ignore — no active session
        }
    }

    const result = await WebBrowser.openAuthSessionAsync(redirect.toString(), redirectTo);
    if (result.type !== "success") {
        return;
    }

    const callbackUrl = new URL(result.url);
    const code = callbackUrl.searchParams.get("code");
    if (!code) {
        return;
    }

    const state = callbackUrl.searchParams.get("state");
    await signIn(provider, state ? { code, state } : { code });
}
