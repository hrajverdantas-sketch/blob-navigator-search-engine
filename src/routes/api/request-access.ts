import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/request-access")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json();
                    const items = body.items ?? [];

                    // Step 1: Get Access Token from Azure AD
                    const tokenRes = await fetch(
                        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                            },
                            body: new URLSearchParams({
                                client_id: process.env.AZURE_CLIENT_ID!,
                                client_secret: process.env.AZURE_CLIENT_SECRET!,
                                scope: "https://graph.microsoft.com/.default",
                                grant_type: "client_credentials",
                            }),
                        },
                    );

                    if (!tokenRes.ok) {
                        const errBody = await tokenRes.text();
                        throw new Error(
                            `Token fetch failed: ${tokenRes.status} - ${errBody}`,
                        );
                    }

                    const { access_token } = await tokenRes.json();

                    if (!access_token) {
                        throw new Error(
                            "No access token returned from Azure AD",
                        );
                    }

                    // Step 2: Build email body
                    const text = items
                        .map(
                            (x: any) =>
                                `${x.kind.toUpperCase()} : ${x.container}/${x.path}`,
                        )
                        .join("\n");

                    // Step 3: Send email via Microsoft Graph API
                    const mailRes = await fetch(
                        `https://graph.microsoft.com/v1.0/users/${process.env.SMTP_USER}/sendMail`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${access_token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                message: {
                                    subject: "Blob Access Request",
                                    body: {
                                        contentType: "Text",
                                        content: `The following items were requested:\n\n${text}`,
                                    },
                                    toRecipients: [
                                        {
                                            emailAddress: {
                                                address: process.env.ADMIN_EMAIL,
                                            },
                                        },
                                    ],
                                },
                                saveToSentItems: false,
                            }),
                        },
                    );

                    // ✅ Graph sendMail returns 202 with empty body — only read body on error
                    if (!mailRes.ok) {
                        const errBody = await mailRes.text();
                        throw new Error(
                            `Graph API sendMail failed: ${mailRes.status} - ${errBody}`,
                        );
                    }

                    return Response.json({ success: true });
                } catch (e) {
                    console.error("GRAPH MAIL ERROR:", e);

                    const msg =
                        e instanceof Error ? e.message : "Unknown error";

                    return Response.json(
                        { error: msg },
                        { status: 500 },
                    );
                }
            },
        },
    },
});